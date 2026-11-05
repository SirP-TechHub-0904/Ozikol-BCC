using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace Ozikol.Central.Services;

public interface ICentralTwoFactorService
{
    /// <summary>
    /// Generates and caches a 6-digit numeric email OTP for 2FA operator authentication.
    /// </summary>
    /// <param name="userEmail">The operator email address.</param>
    /// <returns>The 6-digit numeric code.</returns>
    string GenerateEmailOtp(string userEmail);

    /// <summary>
    /// Verifies the submitted 2FA email OTP against the cached code.
    /// </summary>
    /// <param name="userEmail">The operator email address.</param>
    /// <param name="code">The submitted 6-digit code.</param>
    /// <returns>True if verified and not expired; false otherwise.</returns>
    bool VerifyEmailOtp(string userEmail, string code);

    /// <summary>
    /// Generates and caches a 6-digit numeric OTP for administrator password recovery.
    /// </summary>
    /// <param name="userEmail">The operator email address.</param>
    /// <returns>The 6-digit numeric code.</returns>
    string GeneratePasswordResetOtp(string userEmail);

    /// <summary>
    /// Verifies the submitted password reset OTP against the cached code.
    /// </summary>
    /// <param name="userEmail">The operator email address.</param>
    /// <param name="code">The submitted 6-digit code.</param>
    /// <returns>True if verified and not expired; false otherwise.</returns>
    bool VerifyPasswordResetOtp(string userEmail, string code);

    /// <summary>
    /// Generates a base-32 secret key for Authenticator TOTP apps.
    /// </summary>
    /// <returns>Base32 encoded secret key.</returns>
    string GenerateTotpSecretKey();

    /// <summary>
    /// Generates a standard otpauth QR code URI for authenticator registration.
    /// </summary>
    /// <param name="userEmail">The operator email address.</param>
    /// <param name="secretKey">Base32 secret key.</param>
    /// <returns>otpauth URI string.</returns>
    string GenerateTotpQrCodeUri(string userEmail, string secretKey);

    /// <summary>
    /// Validates a 6-digit time-based code against the operator's secret key.
    /// </summary>
    /// <param name="secretKey">Base32 secret key.</param>
    /// <param name="code">Submitted TOTP code.</param>
    /// <returns>True if valid; false otherwise.</returns>
    bool VerifyTotpCode(string secretKey, string code);
}

public class CentralTwoFactorService : ICentralTwoFactorService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CentralTwoFactorService> _logger;

    public CentralTwoFactorService(IMemoryCache cache, ILogger<CentralTwoFactorService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public string GenerateEmailOtp(string userEmail)
    {
        var cleanEmail = userEmail.Trim().ToLowerInvariant();
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var number = BitConverter.ToUInt32(bytes, 0) % 1000000;
        var code = number.ToString("D6");

        var cacheKey = $"2FA_EMAIL_OTP_{cleanEmail}";
        _cache.Set(cacheKey, code, TimeSpan.FromMinutes(10));
        _logger.LogInformation("🔑 [CentralTwoFactorService] Generated 2FA Email OTP [{Code}] for {Email} (expires in 10m)", code, cleanEmail);
        return code;
    }

    public bool VerifyEmailOtp(string userEmail, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        var cleanEmail = userEmail.Trim().ToLowerInvariant();
        var cacheKey = $"2FA_EMAIL_OTP_{cleanEmail}";

        if (_cache.TryGetValue<string>(cacheKey, out var cachedCode))
        {
            if (string.Equals(cachedCode, code.Trim(), StringComparison.Ordinal))
            {
                _cache.Remove(cacheKey);
                _logger.LogInformation("✓ [CentralTwoFactorService] Successfully verified 2FA Email OTP for {Email}", cleanEmail);
                return true;
            }
        }

        _logger.LogWarning("✗ [CentralTwoFactorService] Invalid or expired 2FA Email OTP for {Email}", cleanEmail);
        return false;
    }

    public string GeneratePasswordResetOtp(string userEmail)
    {
        var cleanEmail = userEmail.Trim().ToLowerInvariant();
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var number = BitConverter.ToUInt32(bytes, 0) % 1000000;
        var code = number.ToString("D6");

        var cacheKey = $"PWD_RESET_OTP_{cleanEmail}";
        _cache.Set(cacheKey, code, TimeSpan.FromMinutes(15));
        _logger.LogInformation("🔑 [CentralTwoFactorService] Generated Password Reset OTP [{Code}] for {Email} (expires in 15m)", code, cleanEmail);
        return code;
    }

    public bool VerifyPasswordResetOtp(string userEmail, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        var cleanEmail = userEmail.Trim().ToLowerInvariant();
        var cacheKey = $"PWD_RESET_OTP_{cleanEmail}";

        if (_cache.TryGetValue<string>(cacheKey, out var cachedCode))
        {
            if (string.Equals(cachedCode, code.Trim(), StringComparison.Ordinal))
            {
                _cache.Remove(cacheKey);
                _logger.LogInformation("✓ [CentralTwoFactorService] Successfully verified Password Reset OTP for {Email}", cleanEmail);
                return true;
            }
        }

        _logger.LogWarning("✗ [CentralTwoFactorService] Invalid or expired Password Reset OTP for {Email}", cleanEmail);
        return false;
    }

    public string GenerateTotpSecretKey()
    {
        var bytes = new byte[20];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base32Encode(bytes);
    }

    public string GenerateTotpQrCodeUri(string userEmail, string secretKey)
    {
        return $"otpauth://totp/OzikolCentral:{Uri.EscapeDataString(userEmail)}?secret={secretKey}&issuer=OzikolCentral&digits=6";
    }

    public bool VerifyTotpCode(string secretKey, string code)
    {
        if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(code))
            return false;

        var cleanCode = code.Trim();
        if (cleanCode.Length != 6 || !long.TryParse(cleanCode, out var codeVal))
            return false;

        try
        {
            var keyBytes = Base32Decode(secretKey);
            var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;

            // Check current step, previous step (-30s), and next step (+30s) for clock drift tolerance
            for (long i = -1; i <= 1; i++)
            {
                var step = currentStep + i;
                var stepBytes = BitConverter.GetBytes(step);
                if (BitConverter.IsLittleEndian)
                    Array.Reverse(stepBytes);

                using var hmac = new HMACSHA1(keyBytes);
                var hash = hmac.ComputeHash(stepBytes);

                var offset = hash[hash.Length - 1] & 0x0F;
                var binary = ((hash[offset] & 0x7F) << 24)
                           | ((hash[offset + 1] & 0xFF) << 16)
                           | ((hash[offset + 2] & 0xFF) << 8)
                           | (hash[offset + 3] & 0xFF);

                var computedOtp = binary % 1000000;
                if (computedOtp == codeVal)
                    return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying TOTP code");
        }

        return false;
    }

    private static string Base32Encode(byte[] data)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        foreach (byte b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5)
            {
                bitsLeft -= 5;
                result.Append(alphabet[(buffer >> bitsLeft) & 31]);
            }
        }

        if (bitsLeft > 0)
        {
            result.Append(alphabet[(buffer << (5 - bitsLeft)) & 31]);
        }

        return result.ToString();
    }

    private static byte[] Base32Decode(string input)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var cleanInput = input.Trim().ToUpperInvariant();
        var bytes = new List<byte>();
        int buffer = 0;
        int bitsLeft = 0;

        foreach (char c in cleanInput)
        {
            int val = alphabet.IndexOf(c);
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8)
            {
                bitsLeft -= 8;
                bytes.Add((byte)((buffer >> bitsLeft) & 255));
            }
        }

        return bytes.ToArray();
    }
}
