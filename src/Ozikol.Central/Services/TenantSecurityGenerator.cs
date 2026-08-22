using System.Security.Cryptography;

namespace Ozikol.Central.Services;

/// <summary>
/// Cryptographically secure generator for randomized tenant database names, SQL users, and high-entropy passwords.
/// </summary>
public static class TenantSecurityGenerator
{
    private const string AlphaNumPool = "abcdefghjkmnpqrstuvwxyz23456789";
    private const string ComplexPasswordPool = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";

    /// <summary>
    /// Generates randomized tenant database name: oz_db_{tenantKey}_{8_random_alphanumeric}
    /// </summary>
    public static string GenerateDatabaseName(string tenantKey)
    {
        var randomSuffix = GenerateRandomString(8, AlphaNumPool);
        var cleanKey = CleanIdentifier(tenantKey);
        return $"oz_db_{cleanKey}_{randomSuffix}";
    }

    /// <summary>
    /// Generates dedicated SQL Login/Username: usr_{tenantKey}_{6_random_alphanumeric}
    /// </summary>
    public static string GenerateSqlUsername(string tenantKey)
    {
        var randomSuffix = GenerateRandomString(6, AlphaNumPool);
        var cleanKey = CleanIdentifier(tenantKey);
        return $"usr_{cleanKey}_{randomSuffix}";
    }

    /// <summary>
    /// Generates 32-character cryptographically secure high-entropy password.
    /// </summary>
    public static string GenerateStrongPassword(int length = 32)
    {
        return GenerateRandomString(length, ComplexPasswordPool);
    }

    private static string CleanIdentifier(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "tenant";
        var clean = input.Trim().ToLowerInvariant()
            .Replace("-", "_")
            .Replace(" ", "_")
            .Replace(".", "_");

        var chars = clean.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray();
        var result = new string(chars);
        return string.IsNullOrWhiteSpace(result) ? "tenant" : result;
    }

    private static string GenerateRandomString(int length, string charPool)
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[length];
        rng.GetBytes(bytes);

        var chars = new char[length];
        for (int i = 0; i < length; i++)
        {
            chars[i] = charPool[bytes[i] % charPool.Length];
        }
        return new string(chars);
    }
}
