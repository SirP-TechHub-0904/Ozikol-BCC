using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Persistence.EF.SQL;

/// <summary>
/// Dedicated EF Core DbContext for the central Master Catalog Database.
/// Stores Central Identity (CentralUser, CentralRole), tenant registrations (MasterTenantCatalog),
/// marketplace blueprints (MasterMarketplaceTemplate), affiliate network records, and transactional email logs.
/// </summary>
public class MasterCatalogDbContext : IdentityDbContext<CentralUser, CentralRole, string>
{
    public DbSet<MasterTenantCatalog> MasterTenantCatalogs { get; set; } = null!;
    public DbSet<MasterMarketplaceCategory> MasterMarketplaceCategories { get; set; } = null!;
    public DbSet<MasterMarketplaceTemplate> MasterMarketplaceTemplates { get; set; } = null!;
    public DbSet<MasterEmailLog> MasterEmailLogs { get; set; } = null!;
    public DbSet<MasterAffiliatePartner> MasterAffiliatePartners { get; set; } = null!;
    public DbSet<MasterAffiliateReferral> MasterAffiliateReferrals { get; set; } = null!;

    public MasterCatalogDbContext(DbContextOptions<MasterCatalogDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Customize Identity Table Names for Master DB Clarity
        modelBuilder.Entity<CentralUser>(b => b.ToTable("CentralUsers"));
        modelBuilder.Entity<CentralRole>(b => b.ToTable("CentralRoles"));
        modelBuilder.Entity<IdentityUserRole<string>>(b => b.ToTable("CentralUserRoles"));
        modelBuilder.Entity<IdentityUserClaim<string>>(b => b.ToTable("CentralUserClaims"));
        modelBuilder.Entity<IdentityUserLogin<string>>(b => b.ToTable("CentralUserLogins"));
        modelBuilder.Entity<IdentityRoleClaim<string>>(b => b.ToTable("CentralRoleClaims"));
        modelBuilder.Entity<IdentityUserToken<string>>(b => b.ToTable("CentralUserTokens"));

        modelBuilder.Entity<MasterTenantCatalog>(entity =>
        {
            entity.HasIndex(e => e.TenantKey).IsUnique();
            entity.HasIndex(e => e.PrimaryDomain).IsUnique();
            entity.HasIndex(e => e.CustomDomain);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterMarketplaceCategory>(entity =>
        {
            entity.HasIndex(e => e.CategoryKey).IsUnique();
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterMarketplaceTemplate>(entity =>
        {
            entity.HasIndex(e => e.VariantCode).IsUnique();
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.Tag);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterEmailLog>(entity =>
        {
            entity.HasIndex(e => e.RecipientEmail);
            entity.HasIndex(e => e.SentAtUtc);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<MasterAffiliatePartner>(entity =>
        {
            entity.HasIndex(e => e.PartnerCode).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.CommissionRatePercentage).HasPrecision(5, 2);
            entity.Property(e => e.TotalEarned).HasPrecision(18, 2);
            entity.Property(e => e.PendingBalance).HasPrecision(18, 2);
            entity.Property(e => e.PaidBalance).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MasterAffiliateReferral>(entity =>
        {
            entity.HasIndex(e => e.AffiliatePartnerId);
            entity.HasIndex(e => e.ReferredTenantKey);
            entity.HasIndex(e => e.CommissionStatus);
            entity.Property(e => e.SubscriptionAmount).HasPrecision(18, 2);
            entity.Property(e => e.CommissionEarned).HasPrecision(18, 2);
        });

        // =========================================================================
        // Seed Central Operator Roles & Default SuperAdmin Account
        // =========================================================================
        const string superAdminRoleId = "role-superadmin-000000000001";
        const string adminRoleId = "role-admin-000000000002";
        const string templateManagerRoleId = "role-templatemanager-000003";
        const string referralManagerRoleId = "role-referralmanager-000004";
        const string superAdminUserId = "user-superadmin-000000000001";

        modelBuilder.Entity<CentralRole>().HasData(
            new CentralRole
            {
                Id = superAdminRoleId,
                Name = "SuperAdmin",
                NormalizedName = "SUPERADMIN",
                Description = "Full system governance, database fleet migrations, operator management",
                ConcurrencyStamp = "stamp-role-superadmin",
                CreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new CentralRole
            {
                Id = adminRoleId,
                Name = "Admin",
                NormalizedName = "ADMIN",
                Description = "Tenant workspace governance, subscription status, support",
                ConcurrencyStamp = "stamp-role-admin",
                CreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new CentralRole
            {
                Id = templateManagerRoleId,
                Name = "TemplateManager",
                NormalizedName = "TEMPLATEMANAGER",
                Description = "Marketplace templates, layout blueprints, review moderations",
                ConcurrencyStamp = "stamp-role-templatemanager",
                CreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new CentralRole
            {
                Id = referralManagerRoleId,
                Name = "ReferralManager",
                NormalizedName = "REFERRALMANAGER",
                Description = "Affiliate partner network, commission tiers, payout tracking",
                ConcurrencyStamp = "stamp-role-referralmanager",
                CreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        var hasher = new PasswordHasher<CentralUser>();
        var defaultSuperAdmin = new CentralUser
        {
            Id = superAdminUserId,
            UserName = "superadmin@ozikol.cloud",
            NormalizedUserName = "SUPERADMIN@OZIKOL.CLOUD",
            Email = "superadmin@ozikol.cloud",
            NormalizedEmail = "SUPERADMIN@OZIKOL.CLOUD",
            EmailConfirmed = true,
            FirstName = "Ozikol",
            LastName = "SuperAdmin",
            Department = "Global Architecture & DevOps",
            IsActive = true,
            CreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            SecurityStamp = "sec-stamp-superadmin-0001",
            ConcurrencyStamp = "concurrency-superadmin-0001"
        };
        defaultSuperAdmin.PasswordHash = hasher.HashPassword(defaultSuperAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");

        modelBuilder.Entity<CentralUser>().HasData(defaultSuperAdmin);

        modelBuilder.Entity<IdentityUserRole<string>>().HasData(
            new IdentityUserRole<string>
            {
                UserId = superAdminUserId,
                RoleId = superAdminRoleId
            }
        );
    }
}
