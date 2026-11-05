using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultCurrenciesAndExchangeRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "DefaultCurrencyCode",
                table: "MasterPlatformSettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "USD",
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10);

            migrationBuilder.AddColumn<string>(
                name: "DefaultExchangeRateCurrencyCode",
                table: "MasterPlatformSettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.Sql(@"
-- Ensure USD ($) is always the Default Exchange Rate Base (IsBaseCurrency = 1, RateFromUsd = 1.0000)
UPDATE MasterCurrencyRates SET IsBaseCurrency = 0 WHERE CurrencyCode <> 'USD';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'USD')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('USD', '$', 'US Dollar', 'en-US', 'USD ($)', 1.0000, 1, 1, 1, 'US', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET CurrencySymbol = '$', DisplayName = 'US Dollar', PillLabel = 'USD ($)', RateFromUsd = 1.0000, IsBaseCurrency = 1, IsActive = 1, SortOrder = 1, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'USD';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'NGN')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('NGN', N'₦', 'Nigerian Naira', 'en-NG', N'NGN (₦)', 1600.0000, 0, 1, 2, 'NG', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd <= 1.0000 THEN 1600.0000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 2, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'NGN';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'GBP')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('GBP', N'£', 'British Pound', 'en-GB', N'GBP (£)', 0.8000, 0, 1, 3, 'GB', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 0.8000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 3, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'GBP';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'EUR')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('EUR', N'€', 'Euro', 'de-DE', N'EUR (€)', 0.9200, 0, 1, 4, 'DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 0.9200 ELSE RateFromUsd END, IsActive = 1, SortOrder = 4, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'EUR';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'GHS')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('GHS', N'GH₵', 'Ghanaian Cedi', 'en-GH', N'GHS (GH₵)', 14.0000, 0, 1, 5, 'GH', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 14.0000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 5, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'GHS';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'KES')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('KES', 'KSh', 'Kenyan Shilling', 'sw-KE', 'KES (KSh)', 130.0000, 0, 1, 6, 'KE', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 130.0000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 6, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'KES';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'ZAR')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('ZAR', 'R', 'South African Rand', 'en-ZA', 'ZAR (R)', 18.0000, 0, 1, 7, 'ZA', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 18.0000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 7, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'ZAR';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'CAD')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('CAD', 'CA$', 'Canadian Dollar', 'en-CA', 'CAD (CA$)', 1.3600, 0, 1, 8, 'CA', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 1.3600 ELSE RateFromUsd END, IsActive = 1, SortOrder = 8, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'CAD';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'AED')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('AED', 'AED', 'UAE Dirham', 'ar-AE', 'AED', 3.6700, 0, 1, 9, 'AE', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 3.6700 ELSE RateFromUsd END, IsActive = 1, SortOrder = 9, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'AED';

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'INR')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc, UpdatedAtUtc)
    VALUES ('INR', N'₹', 'Indian Rupee', 'en-IN', N'INR (₹)', 84.0000, 0, 1, 10, 'IN', GETUTCDATE(), GETUTCDATE());
ELSE
    UPDATE MasterCurrencyRates SET IsBaseCurrency = 0, RateFromUsd = CASE WHEN RateFromUsd = 1.0000 THEN 84.0000 ELSE RateFromUsd END, IsActive = 1, SortOrder = 10, UpdatedAtUtc = GETUTCDATE() WHERE CurrencyCode = 'INR';

IF EXISTS (SELECT 1 FROM MasterPlatformSettings WHERE Id = 1)
    UPDATE MasterPlatformSettings SET DefaultExchangeRateCurrencyCode = 'USD' WHERE Id = 1;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultExchangeRateCurrencyCode",
                table: "MasterPlatformSettings");

            migrationBuilder.AlterColumn<string>(
                name: "DefaultCurrencyCode",
                table: "MasterPlatformSettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10,
                oldDefaultValue: "USD");
        }
    }
}
