using System;
using Microsoft.Data.SqlClient;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Enterprise connection string harmonizer for multi-tenant database operations.
    /// Dynamically aligns the database server host (<c>DataSource</c>) of individual tenant connection strings
    /// with the active Master Catalog environment connection string, while preserving each tenant's isolated
    /// database name, SQL credentials, and security configurations.
    /// </summary>
    public static class TenantConnectionHarmonizer
    {
        /// <summary>
        /// Harmonizes a tenant database connection string with the active master database host.
        /// Preserves individual tenant database credentials while dynamically adopting the active master server host/DataSource.
        /// </summary>
        /// <param name="masterConnStr">Active master database connection string (from .env/configuration).</param>
        /// <param name="rawTenantConnStr">Raw tenant connection string (from <c>MasterTenantCatalogs</c>).</param>
        /// <param name="targetDbName">Optional target tenant database name fallback.</param>
        /// <returns>The harmonized connection string ready for secure multi-environment execution.</returns>
        public static string Harmonize(string masterConnStr, string? rawTenantConnStr, string? targetDbName = null)
        {
            if (string.IsNullOrWhiteSpace(masterConnStr))
            {
                return rawTenantConnStr ?? string.Empty;
            }

            // Fallback: If no tenant connection string was provided, build directly from master connection string
            if (string.IsNullOrWhiteSpace(rawTenantConnStr))
            {
                var fallbackBuilder = new SqlConnectionStringBuilder(masterConnStr);
                if (!string.IsNullOrWhiteSpace(targetDbName))
                {
                    fallbackBuilder.InitialCatalog = targetDbName;
                }
                return fallbackBuilder.ConnectionString;
            }

            try
            {
                var masterBuilder = new SqlConnectionStringBuilder(masterConnStr);
                var tenantBuilder = new SqlConnectionStringBuilder(rawTenantConnStr);

                if (!string.IsNullOrWhiteSpace(targetDbName))
                {
                    tenantBuilder.InitialCatalog = targetDbName;
                }

                // Dynamically borrow the active environment's DataSource/Server host
                if (!string.IsNullOrWhiteSpace(masterBuilder.DataSource))
                {
                    tenantBuilder.DataSource = masterBuilder.DataSource;
                }

                // Ensure modern certificate trust is preserved
                tenantBuilder.TrustServerCertificate = true;

                // If master uses Windows Integrated Security and tenant has no credentials, inherit integrated security
                if (masterBuilder.IntegratedSecurity && string.IsNullOrWhiteSpace(tenantBuilder.UserID))
                {
                    tenantBuilder.IntegratedSecurity = true;
                }

                return tenantBuilder.ConnectionString;
            }
            catch
            {
                // Resilient fallback in case of malformed raw connection strings
                var safeBuilder = new SqlConnectionStringBuilder(masterConnStr);
                if (!string.IsNullOrWhiteSpace(targetDbName))
                {
                    safeBuilder.InitialCatalog = targetDbName;
                }
                return safeBuilder.ConnectionString;
            }
        }
    }
}
