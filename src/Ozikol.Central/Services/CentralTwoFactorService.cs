using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace Ozikol.Central.Services;

public interface ICentralTwoFactorService
{
    string GenerateEmailOtp(string userEmail);
    bool VerifyEmailOtp(string userEmail, string code);
    string GenerateTotpSecretKey();
    string GenerateTotpQrCodeUri(string userEmail, string secretKey);
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
        _logger.LogInformation("Generated 2FA Email OTP for {Email}", cleanEmail);
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
                return true;
            }
        }

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
