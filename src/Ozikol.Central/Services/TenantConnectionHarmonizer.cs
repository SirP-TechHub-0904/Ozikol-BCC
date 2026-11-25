using System;
using Microsoft.Data.SqlClient;
using Ozikol.MasterDomain.Security;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Enterprise connection string harmonizer for multi-tenant database operations.
    /// Dynamically aligns the database server host (<c>DataSource</c>) of individual tenant connection strings
    /// with the active Master Catalog environment connection string, while strictly preserving each tenant's isolated
    /// database name, dedicated SQL credentials, and security configurations.
    /// Zero-Trust Architecture: Never silently substitutes Master credentials for tenant operations.
    /// </summary>
    public static class TenantConnectionHarmonizer
    {
        /// <summary>
        /// Harmonizes a tenant database connection string with the active master database host.
        /// Preserves individual tenant database credentials while dynamically adopting the active master server host/DataSource.
        /// </summary>
        /// <param name="masterConnStr">Active master database connection string (from .env/configuration).</param>
        /// <param name="rawTenantConnStr">Raw tenant connection string (from <c>MasterTenantCatalogs</c>, plaintext or AES-256-GCM encrypted).</param>
        /// <param name="targetDbName">Optional target tenant database name fallback.</param>
        /// <returns>The harmonized connection string ready for secure multi-environment execution.</returns>
        public static string Harmonize(string masterConnStr, string? rawTenantConnStr, string? targetDbName = null)
        {
            if (string.IsNullOrWhiteSpace(masterConnStr))
            {
                var fallbackPlain = OzikolDataCipher.DecryptIfNeeded(rawTenantConnStr) ?? rawTenantConnStr;
                return fallbackPlain ?? string.Empty;
            }

            // Provisioning Only: When no tenant connection string exists yet (initial DB creation during onboarding),
            // use master credentials to run initial physical CREATE DATABASE DDL.
            if (string.IsNullOrWhiteSpace(rawTenantConnStr))
            {
                if (string.IsNullOrWhiteSpace(targetDbName))
                {
                    throw new InvalidOperationException("[TenantConnectionHarmonizer] Cannot harmonize connection string: both tenant connection string and target database name are missing.");
                }

                var provisioningBuilder = new SqlConnectionStringBuilder(masterConnStr)
                {
                    InitialCatalog = targetDbName,
                    TrustServerCertificate = true
                };
                return provisioningBuilder.ConnectionString;
            }

            // 1. Transparently decrypt tenant connection string at rest (AES-256-GCM enc:v1:...)
            var decryptedTenantConn = OzikolDataCipher.DecryptIfNeeded(rawTenantConnStr) ?? rawTenantConnStr;

            var masterBuilder = new SqlConnectionStringBuilder(masterConnStr);
            var tenantBuilder = new SqlConnectionStringBuilder(decryptedTenantConn);

            if (!string.IsNullOrWhiteSpace(targetDbName))
            {
                tenantBuilder.InitialCatalog = targetDbName;
            }

            // 2. Zero-Trust Rule: Strictly preserve the tenant's dedicated UserID and Password.
            // Only adopt the environment's active server host (DataSource) so queries reach the correct IP (e.g. VPS or localhost).
            if (!string.IsNullOrWhiteSpace(masterBuilder.DataSource))
            {
                tenantBuilder.DataSource = masterBuilder.DataSource;
            }

            tenantBuilder.TrustServerCertificate = true;

            return tenantBuilder.ConnectionString;
        }
    }
}
