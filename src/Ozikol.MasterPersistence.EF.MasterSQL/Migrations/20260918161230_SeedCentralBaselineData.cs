using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <summary>
    /// EF Core Migration: Seeds central baseline data for the master platform:
    /// - 9 Central System Governance Roles
    /// - Root SuperAdmin User Account (superadmin@ozikol.cloud)
    /// - 10 Global & African Currency Rates
    /// - Platform Settings Record (ID = 1)
    /// - Central Legal & Compliance Documents (EN, FR, ES, DE)
    /// - Launch Coupons & Promotional Vouchers
    /// </summary>
    public partial class SeedCentralBaselineData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- =========================================================================
-- 1. Seed 9 Central Governance Roles
-- =========================================================================
IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'SUPERADMIN')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'SuperAdmin', 'SUPERADMIN', 'Full system governance, database fleet migrations, operator access', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'ADMIN')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'Admin', 'ADMIN', 'Tenant workspace governance, subscription status, support', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'TEMPLATEMANAGER')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'TemplateManager', 'TEMPLATEMANAGER', 'Marketplace templates, layout blueprints, review moderations', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'REFERRALMANAGER')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'ReferralManager', 'REFERRALMANAGER', 'Affiliate partner network, commission tiers, payout tracking', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'OPERATOR')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'Operator', 'OPERATOR', 'Platform operational staff and monitoring', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'BILLINGADMIN')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'BillingAdmin', 'BILLINGADMIN', 'Subscription billing, invoices, and payment gateway configuration', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'SUPPORTAGENT')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'SupportAgent', 'SUPPORTAGENT', 'Customer tickets, live chat assistance, and workspace diagnostics', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'AFFILIATEPARTNER')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'AffiliatePartner', 'AFFILIATEPARTNER', 'Affiliate partner portal access for referral tracking and earnings', GETUTCDATE(), NEWID());

IF NOT EXISTS (SELECT 1 FROM CentralRoles WHERE NormalizedName = 'TEMPLATECREATOR')
    INSERT INTO CentralRoles (Id, Name, NormalizedName, Description, CreatedUtc, ConcurrencyStamp)
    VALUES (NEWID(), 'TemplateCreator', 'TEMPLATECREATOR', 'Creator studio portal access for template publishing and revenue tracking', GETUTCDATE(), NEWID());

-- =========================================================================
-- 2. Seed Root SuperAdmin User Account (superadmin@ozikol.cloud)
-- Password: [REDACTED_BOOTSTRAP_PASSWORD] (ASP.NET Identity PBKDF2 with HMAC-SHA256 hash)
-- =========================================================================
DECLARE @SuperAdminUserId NVARCHAR(450) = 'c0000000-0000-0000-0000-000000000001';
IF NOT EXISTS (SELECT 1 FROM CentralUsers WHERE NormalizedEmail = 'SUPERADMIN@OZIKOL.CLOUD')
BEGIN
    INSERT INTO CentralUsers (
        Id, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed,
        PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumberConfirmed,
        TwoFactorEnabled, LockoutEnabled, AccessFailedCount, FirstName, LastName,
        Department, IsActive, CreatedUtc
    )
    VALUES (
        @SuperAdminUserId,
        'superadmin@ozikol.cloud',
        'SUPERADMIN@OZIKOL.CLOUD',
        'superadmin@ozikol.cloud',
        'SUPERADMIN@OZIKOL.CLOUD',
        1,
        'AQAAAAIAAYagAAAAEHgepNQrAMlxRj+7S1xL+KFLBJMkiuyOLvKGIN4khBc1VXdnrqFUgLRhMUugGk28Rw==',
        NEWID(),
        NEWID(),
        0,
        0,
        1,
        0,
        'Ozikol',
        'SuperAdmin',
        'Global DevOps & Architecture',
        1,
        GETUTCDATE()
    );

    DECLARE @SuperAdminRoleId NVARCHAR(450);
    SELECT TOP 1 @SuperAdminRoleId = Id FROM CentralRoles WHERE NormalizedName = 'SUPERADMIN';
    IF (@SuperAdminRoleId IS NOT NULL)
    BEGIN
        INSERT INTO CentralUserRoles (UserId, RoleId)
        VALUES (@SuperAdminUserId, @SuperAdminRoleId);
    END
END

-- =========================================================================
-- 3. Seed 10 Global & African Platform Currencies
-- =========================================================================
IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'USD')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('USD', '$', 'US Dollar', 'en-US', 'USD ($)', 1.0, 1, 1, 1, 'US', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'NGN')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('NGN', N'₦', 'Nigerian Naira', 'en-NG', N'NGN (₦)', 1350.0, 0, 1, 2, 'NG', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'GBP')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('GBP', N'£', 'British Pound', 'en-GB', N'GBP (£)', 0.80, 0, 1, 3, 'GB', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'EUR')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('EUR', N'€', 'Euro', 'de-DE', N'EUR (€)', 0.92, 0, 1, 4, 'DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'GHS')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('GHS', N'GH₵', 'Ghanaian Cedi', 'en-GH', N'GHS (GH₵)', 14.0, 0, 1, 5, 'GH', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'KES')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('KES', 'KSh', 'Kenyan Shilling', 'sw-KE', 'KES (KSh)', 130.0, 0, 1, 6, 'KE', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'ZAR')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('ZAR', 'R', 'South African Rand', 'en-ZA', 'ZAR (R)', 18.0, 0, 1, 7, 'ZA', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'CAD')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('CAD', 'CA$', 'Canadian Dollar', 'en-CA', 'CAD (CA$)', 1.36, 0, 1, 8, 'CA', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'AUD')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('AUD', 'A$', 'Australian Dollar', 'en-AU', 'AUD (A$)', 1.50, 0, 1, 9, 'AU', GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCurrencyRates WHERE CurrencyCode = 'AED')
    INSERT INTO MasterCurrencyRates (CurrencyCode, CurrencySymbol, DisplayName, CultureName, PillLabel, RateFromUsd, IsBaseCurrency, IsActive, SortOrder, AssociatedCountryCodes, CreatedAtUtc)
    VALUES ('AED', 'AED', 'UAE Dirham', 'ar-AE', 'AED', 3.67, 0, 1, 10, 'AE', GETUTCDATE());

-- =========================================================================
-- 4. Seed Platform Settings Record (Id = 1)
-- =========================================================================
IF NOT EXISTS (SELECT 1 FROM MasterPlatformSettings WHERE Id = 1)
BEGIN
    INSERT INTO MasterPlatformSettings (
        Id, PlatformName, EnableAdminNotifications, TicketAutoCloseHours,
        EnableTicketAutoClose, SupportCategories, DefaultCurrencyCode,
        DefaultTrialDays, UpdatedUtc
    )
    VALUES (
        1,
        'Ozikol',
        1,
        24,
        1,
        'Support, Sales, Billing, Partnership, Enterprise, General, Security & Compliance',
        'USD',
        14,
        GETUTCDATE()
    );
END

-- =========================================================================
-- 5. Seed Launch Coupons & Promotional Vouchers
-- =========================================================================
IF NOT EXISTS (SELECT 1 FROM MasterCoupons WHERE Code = 'LAUNCH100')
    INSERT INTO MasterCoupons (Id, Code, Description, IsPercentage, DiscountPercentage, DiscountAmount, DurationDays, MaxRedemptions, TimesRedeemed, StartsAtUtc, ExpiresAtUtc, IsActive, CreatedUtc)
    VALUES (NEWID(), 'LAUNCH100', 'Official 100% Platform Launch Voucher — grants complete free access to base tier and selected modules.', 1, 100.00, 0.00, 730, 1000, 0, DATEADD(day, -30, GETUTCDATE()), DATEADD(year, 2, GETUTCDATE()), 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCoupons WHERE Code = 'BETA100')
    INSERT INTO MasterCoupons (Id, Code, Description, IsPercentage, DiscountPercentage, DiscountAmount, DurationDays, MaxRedemptions, TimesRedeemed, StartsAtUtc, ExpiresAtUtc, IsActive, CreatedUtc)
    VALUES (NEWID(), 'BETA100', 'Beta Tester Early Adopter Voucher — 100% waiver on initial workspace subscription.', 1, 100.00, 0.00, 365, 500, 0, DATEADD(day, -30, GETUTCDATE()), DATEADD(year, 1, GETUTCDATE()), 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCoupons WHERE Code = 'WELCOME50')
    INSERT INTO MasterCoupons (Id, Code, Description, IsPercentage, DiscountPercentage, DiscountAmount, DurationDays, MaxRedemptions, TimesRedeemed, StartsAtUtc, ExpiresAtUtc, IsActive, CreatedUtc)
    VALUES (NEWID(), 'WELCOME50', 'New Business Welcome Incentive — 50% discount across all first-year modular capabilities.', 1, 50.00, 0.00, 730, 2000, 0, DATEADD(day, -30, GETUTCDATE()), DATEADD(year, 2, GETUTCDATE()), 1, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterCoupons WHERE Code = 'PARTNER20')
    INSERT INTO MasterCoupons (Id, Code, Description, IsPercentage, DiscountPercentage, DiscountAmount, DurationDays, MaxRedemptions, TimesRedeemed, StartsAtUtc, ExpiresAtUtc, IsActive, CreatedUtc)
    VALUES (NEWID(), 'PARTNER20', 'Global Affiliate & Partner Incentive — 20% promotional discount voucher.', 1, 20.00, 0.00, 1095, 5000, 0, DATEADD(day, -30, GETUTCDATE()), DATEADD(year, 3, GETUTCDATE()), 1, GETUTCDATE());
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop seed if needed
        }
    }
}
