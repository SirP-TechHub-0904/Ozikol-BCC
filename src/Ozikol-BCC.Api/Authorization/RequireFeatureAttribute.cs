using System;
using Microsoft.AspNetCore.Mvc;

namespace Ozikol_BCC.Api.Authorization
{
    /// <summary>
    /// Enforces dual-level capability protection:
    /// 1. Tenant Organization Level: Verifies active modular subscription in Master Catalog via <c>ITenantFeatureGateService</c>.
    /// 2. User Staff Level: Verifies caller has SuperAdmin, Admin, Global Editor, or assigned <c>BcpUserFeatureRole</c> authority.
    /// Blocks unauthorized access, records a Suspicious audit log, and notifies the SuperAdmin.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public sealed class RequireFeatureAttribute : TypeFilterAttribute
    {
        /// <summary>
        /// Initializes a new instance of <see cref="RequireFeatureAttribute"/> for a modular capability.
        /// </summary>
        /// <param name="featureCode">The canonical feature code (e.g. "bcp-workspace", "bcp-committees", "bcp-staff-rota").</param>
        /// <param name="allowReadOnly">Whether read-only auditors may view this feature.</param>
        public RequireFeatureAttribute(string featureCode, bool allowReadOnly = true)
            : base(typeof(RequireFeatureFilter))
        {
            Arguments = new object[] { featureCode, allowReadOnly };
        }
    }
}

