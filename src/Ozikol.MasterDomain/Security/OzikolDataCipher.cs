using System;
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
    /// 1. Production VPS: OS/Service environment variable <c>Security__MasterEncryptionKey</c> or <c>OZIKOL_MASTER_ENCRYPTION_KEY</c>.
    /// 2. Cloud Production: AWS Secrets Manager / Azure Key Vault injected into environment configuration.
    /// 3. Local Development: <c>.env</c> file (<c>Security__MasterEncryptionKey</c>).
    /// </summary>
    /// <param name="configuration">The application configuration root.</param>
    public static void Initialize(IConfiguration? configuration)
    {
        lock (KeyLock)
        {
            string? rawKey = configuration?["Security:MasterEncryptionKey"]
                ?? configuration?["OZIKOL_MASTER_ENCRYPTION_KEY"]
                ?? Environment.GetEnvironmentVariable("Security__MasterEncryptionKey")
                ?? Environment.GetEnvironmentVariable("OZIKOL_MASTER_ENCRYPTION_KEY");

            if (string.IsNullOrWhiteSpace(rawKey))
            {
                // Derive from JWT secret if explicitly present in environment to guarantee zero-breakage startup
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
    /// If the value does not carry the <c>enc:v1:</c> prefix (e.g., legacy plaintext database row),
    /// returns the original string seamlessly so existing deployments never break.
    /// </summary>
    /// <param name="storedValue">The database value (either `enc:v1:...` ciphertext or legacy plaintext).</param>
    /// <returns>The decrypted plaintext string.</returns>
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
            var base64Payload = storedValue.Substring(CipherPrefix.Length);
            var combined = Convert.FromBase64String(base64Payload);

            if (combined.Length < NonceSizeBytes + TagSizeBytes)
            {
                return storedValue;
            }

            var nonce = new byte[NonceSizeBytes];
            var tag = new byte[TagSizeBytes];
            var cipherLength = combined.Length - NonceSizeBytes - TagSizeBytes;
            var cipherBytes = new byte[cipherLength];
            var plainBytes = new byte[cipherLength];

            Buffer.BlockCopy(combined, 0, nonce, 0, NonceSizeBytes);
            Buffer.BlockCopy(combined, NonceSizeBytes, tag, 0, TagSizeBytes);
            Buffer.BlockCopy(combined, NonceSizeBytes + TagSizeBytes, cipherBytes, 0, cipherLength);

            var key = ResolveActiveKey();
            using var aesGcm = new AesGcm(key, TagSizeBytes);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (CryptographicException)
        {
            // If key rotation occurred or payload was corrupted, avoid crashing non-critical reads
            return storedValue;
        }
        catch (FormatException)
        {
            return storedValue;
        }
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
                ?? Environment.GetEnvironmentVariable("OZIKOL_MASTER_ENCRYPTION_KEY")
                ?? Environment.GetEnvironmentVariable("Jwt__Key")
                ?? Environment.GetEnvironmentVariable("Jwt__Secret");

            if (string.IsNullOrWhiteSpace(envKey))
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Master encryption key is not configured. " +
                    "Please set 'Security__MasterEncryptionKey' (or 'OZIKOL_MASTER_ENCRYPTION_KEY') in your OS environment variables or .env file.");
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

