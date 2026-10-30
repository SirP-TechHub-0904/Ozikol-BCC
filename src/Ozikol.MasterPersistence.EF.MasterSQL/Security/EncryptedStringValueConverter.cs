using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Ozikol.MasterDomain.Security;

namespace Ozikol.MasterPersistence.EF.MasterSQL.Security;

/// <summary>
/// Entity Framework Core value converter that transparently encrypts sensitive string properties
/// using <see cref="OzikolDataCipher"/> (AES-256-GCM) when writing to SQL Server and decrypts
/// them when reading into memory. Legacy plaintext database values are read seamlessly without errors.
/// </summary>
public sealed class EncryptedStringValueConverter : ValueConverter<string, string>
{
    /// <summary>
    /// Singleton instance for non-nullable encrypted string columns.
    /// </summary>
    public static readonly EncryptedStringValueConverter Instance = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="EncryptedStringValueConverter"/> class.
    /// </summary>
    public EncryptedStringValueConverter()
        : base(
            plainValue => OzikolDataCipher.EncryptIfNeeded(plainValue) ?? string.Empty,
            storedValue => OzikolDataCipher.DecryptIfNeeded(storedValue) ?? string.Empty)
    {
    }
}

/// <summary>
/// Entity Framework Core value converter that transparently encrypts nullable sensitive string properties
/// using <see cref="OzikolDataCipher"/> (AES-256-GCM) when writing to SQL Server and decrypts
/// them when reading into memory.
/// </summary>
public sealed class NullableEncryptedStringValueConverter : ValueConverter<string?, string?>
{
    /// <summary>
    /// Singleton instance for nullable encrypted string columns.
    /// </summary>
    public static readonly NullableEncryptedStringValueConverter Instance = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="NullableEncryptedStringValueConverter"/> class.
    /// </summary>
    public NullableEncryptedStringValueConverter()
        : base(
            plainValue => OzikolDataCipher.EncryptIfNeeded(plainValue),
            storedValue => OzikolDataCipher.DecryptIfNeeded(storedValue))
    {
    }
}

