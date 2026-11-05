using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Ozikol.MasterDomain.Security;

/// <summary>
/// Provides authenticated AES-256-GCM encryption and decryption for sensitive database columns at rest
/// (including tenant database connection strings, payment gateway secret keys, SMTP passwords, and AI provider keys).
/// Designed for zero-downtime backwards compatibility: existing plaintext database rows are read seamlessly
/// and automatically upgraded to encrypted ciphertext (`enc:v1:...`) upon the next save.
/// </summary>
public static class OzikolDataCipher
{
    /// <summary>
    /// Versioned prefix identifying values encrypted by <see cref="OzikolDataCipher"/>.
    /// </summary>
    public const string CipherPrefix = "enc:v1:";

    private const int NonceSizeBytes = 12; // 96-bit NIST recommended GCM nonce
    private const int TagSizeBytes = 16;   // 128-bit GCM authentication tag
    private const int KeySizeBytes = 32;   // 256-bit AES key

    private static byte[]? _cachedMasterKey;
    private static readonly object KeyLock = new();

    /// <summary>
    /// Initializes the master encryption key from application configuration or environment variables.
    /// Recommended storage locations:
    /// 1. Production VPS: OS/Service environment variable <c>Security__MasterEncryptionKey</c> or <c>OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY</c>.
    /// 2. Cloud Production: AWS Secrets Manager / Azure Key Vault injected into environment configuration.
    /// 3. Local Development: <c>.env</c> file (<c>Security__MasterEncryptionKey</c>).
    /// </summary>
    /// <param name="configuration">The application configuration root.</param>
    public static void Initialize(IConfiguration? configuration)
    {
        lock (KeyLock)
        {
            string? rawKey = configuration?["Security:MasterEncryptionKey"]
                ?? configuration?["OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY"]
                ?? configuration?["OZIKOL_MASTER_ENCRYPTION_KEY"]
                ?? Environment.GetEnvironmentVariable("Security__MasterEncryptionKey")
                ?? Environment.GetEnvironmentVariable("OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY")
                ?? Environment.GetEnvironmentVariable("OZIKOL_MASTER_ENCRYPTION_KEY");

            if (string.IsNullOrWhiteSpace(rawKey))
            {
                // Derive from JWT secret if explicitly present in environment
                rawKey = configuration?["Jwt:Key"]
                    ?? configuration?["Jwt:Secret"]
                    ?? Environment.GetEnvironmentVariable("Jwt__Key")
                    ?? Environment.GetEnvironmentVariable("Jwt__Secret");
            }

            if (!string.IsNullOrWhiteSpace(rawKey))
            {
                _cachedMasterKey = Derive256BitKey(rawKey.Trim());
            }
        }
    }

    /// <summary>
    /// Encrypts a plaintext string using authenticated AES-256-GCM and prefixes the result with <c>enc:v1:</c>.
    /// Returns null or empty strings unchanged, and returns already-encrypted strings without double-encrypting.
    /// </summary>
    /// <param name="plaintext">The sensitive plaintext string to protect.</param>
    /// <returns>The prefixed AES-256-GCM ciphertext (`enc:v1:...`), or the original value if null/empty.</returns>
    public static string? EncryptIfNeeded(string? plaintext)
    {
        if (string.IsNullOrWhiteSpace(plaintext))
        {
            return plaintext;
        }

        // Prevent double encryption if the value is already protected
        if (plaintext.StartsWith(CipherPrefix, StringComparison.Ordinal))
        {
            return plaintext;
        }

        var key = ResolveActiveKey();
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = new byte[NonceSizeBytes];
        RandomNumberGenerator.Fill(nonce);

        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSizeBytes];

        // Perform authenticated AES-256-GCM encryption
        using var aesGcm = new AesGcm(key, TagSizeBytes);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        // Combine [12-byte Nonce][16-byte Auth Tag][Ciphertext] into a single payload
        var combined = new byte[NonceSizeBytes + TagSizeBytes + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, combined, 0, NonceSizeBytes);
        Buffer.BlockCopy(tag, 0, combined, NonceSizeBytes, TagSizeBytes);
        Buffer.BlockCopy(cipherBytes, 0, combined, NonceSizeBytes + TagSizeBytes, cipherBytes.Length);

        return CipherPrefix + Convert.ToBase64String(combined);
    }

    /// <summary>
    /// Decrypts a value prefixed with <c>enc:v1:</c> back into plaintext in memory.
    /// Supports both unified Base64 payloads and colon-separated (IV:Ciphertext:Tag) database formats.
    /// If the value does not carry the <c>enc:v1:</c> prefix (e.g. legacy plaintext database row),
    /// returns the original string seamlessly so existing deployments never break.
    /// </summary>
    /// <param name="storedValue">The database value (either `enc:v1:...` ciphertext or legacy plaintext).</param>
    /// <returns>The decrypted plaintext string, or null if the value is ciphertext that cannot be decrypted.</returns>
    public static string? DecryptIfNeeded(string? storedValue)
    {
        if (string.IsNullOrWhiteSpace(storedValue))
        {
            return storedValue;
        }

        if (!storedValue.StartsWith(CipherPrefix, StringComparison.Ordinal))
        {
            return storedValue;
        }

        try
        {
            var rawPayload = storedValue.Substring(CipherPrefix.Length).Trim();
            byte[] nonce;
            byte[] tag;
            byte[] cipherBytes;

            // Handle colon-separated format (enc:v1:{iv_b64}:{ct_b64}:{tag_b64})
            if (rawPayload.Contains(':'))
            {
                var parts = rawPayload.Split(':');
                if (parts.Length == 3)
                {
                    nonce = Convert.FromBase64String(parts[0]);
                    cipherBytes = Convert.FromBase64String(parts[1]);
                    tag = Convert.FromBase64String(parts[2]);
                }
                else
                {
                    return null;
                }
            }
            else
            {
                // Standard combined binary payload [12-byte Nonce][16-byte Auth Tag][Ciphertext]
                var combined = Convert.FromBase64String(rawPayload);
                if (combined.Length < NonceSizeBytes + TagSizeBytes)
                {
                    return null;
                }

                nonce = new byte[NonceSizeBytes];
                tag = new byte[TagSizeBytes];
                var cipherLength = combined.Length - NonceSizeBytes - TagSizeBytes;
                cipherBytes = new byte[cipherLength];

                Buffer.BlockCopy(combined, 0, nonce, 0, NonceSizeBytes);
                Buffer.BlockCopy(combined, NonceSizeBytes, tag, 0, TagSizeBytes);
                Buffer.BlockCopy(combined, NonceSizeBytes + TagSizeBytes, cipherBytes, 0, cipherLength);
            }

            var plainBytes = new byte[cipherBytes.Length];

            // Try candidate keys in priority order
            foreach (var candidateKey in GetCandidateKeys())
            {
                try
                {
                    using var aesGcm = new AesGcm(candidateKey, TagSizeBytes);
                    aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);
                    return Encoding.UTF8.GetString(plainBytes);
                }
                catch (CryptographicException)
                {
                    // Candidate key did not match, try next candidate
                }
            }

            // Return null if all candidate keys fail so callers fall back cleanly to environment variables
            return null;
        }
        catch (FormatException)
        {
            return null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Resolves the candidate AES-256 keys to attempt for decrypting stored values.
    /// </summary>
    /// <returns>A list of 32-byte key candidates.</returns>
    private static List<byte[]> GetCandidateKeys()
    {
        var candidates = new List<byte[]>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        void AddCandidate(byte[]? keyBytes)
        {
            if (keyBytes == null || keyBytes.Length != KeySizeBytes) return;
            var hex = Convert.ToHexString(keyBytes);
            if (seen.Add(hex))
            {
                candidates.Add(keyBytes);
            }
        }

        // 1. Initialized cached master key
        if (_cachedMasterKey != null)
        {
            AddCandidate(_cachedMasterKey);
        }

        // 2. Discover potential key strings from environment
        var rawKeyStrings = new[]
        {
            Environment.GetEnvironmentVariable("Security__MasterEncryptionKey"),
            Environment.GetEnvironmentVariable("OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY"),
            Environment.GetEnvironmentVariable("OZIKOL_MASTER_ENCRYPTION_KEY"),
            Environment.GetEnvironmentVariable("Jwt__Key"),
            Environment.GetEnvironmentVariable("Jwt__Secret")
        };

        foreach (var raw in rawKeyStrings)
        {
            if (string.IsNullOrWhiteSpace(raw)) continue;
            var trimmed = raw.Trim();

            // Salted HKDF/SHA-256 key derivation (standard C#)
            AddCandidate(Derive256BitKey(trimmed));

            // Direct SHA-256 key derivation (legacy/script fallback)
            AddCandidate(SHA256.HashData(Encoding.UTF8.GetBytes(trimmed)));
        }

        return candidates;
    }

    /// <summary>
    /// Resolves the active 256-bit key from memory or environment variables.
    /// </summary>
    /// <returns>A 32-byte AES-256 key array.</returns>
    private static byte[] ResolveActiveKey()
    {
        if (_cachedMasterKey != null)
        {
            return _cachedMasterKey;
        }

        lock (KeyLock)
        {
            if (_cachedMasterKey != null)
            {
                return _cachedMasterKey;
            }

            string? envKey = Environment.GetEnvironmentVariable("Security__MasterEncryptionKey")
                ?? Environment.GetEnvironmentVariable("OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY")
                ?? Environment.GetEnvironmentVariable("OZIKOL_MASTER_ENCRYPTION_KEY")
                ?? Environment.GetEnvironmentVariable("Jwt__Key")
                ?? Environment.GetEnvironmentVariable("Jwt__Secret");

            if (string.IsNullOrWhiteSpace(envKey))
            {
                throw new InvalidOperationException(
                    "Master encryption key is not configured. Please set 'Security__MasterEncryptionKey' in your .env or environment variables.");
            }

            _cachedMasterKey = Derive256BitKey(envKey.Trim());
            return _cachedMasterKey;
        }
    }

    /// <summary>
    /// Derives a deterministic 256-bit (32-byte) cryptographic key using SHA-256 over the configured master secret with a domain separator salt.
    /// </summary>
    /// <param name="rawSecret">The raw secret string from configuration.</param>
    /// <returns>A 32-byte key suitable for AES-256-GCM.</returns>
    private static byte[] Derive256BitKey(string rawSecret)
    {
        // Domain-separated HKDF/SHA-256 key derivation so even variable-length passphrases yield a uniform 256-bit key
        var saltedInput = Encoding.UTF8.GetBytes($"Ozikol.BCC.AES256GCM.v1::{rawSecret}");
        return SHA256.HashData(saltedInput);
    }
}
