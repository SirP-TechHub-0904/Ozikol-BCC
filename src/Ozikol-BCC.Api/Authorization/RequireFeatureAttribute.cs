using System;
using Microsoft.AspNetCore.Mvc;

namespace Ozikol_BCC.Api.Authorization
{
    /// <summary>
    /// Explicitly permits authenticated regular workspace members / staff to access an action
    /// even if the parent controller has a strict administrative <see cref="RequireFeatureAttribute"/>.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public sealed class AllowMemberAccessAttribute : Attribute
    {
    }

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
        /// Gets the feature code.
        /// </summary>
        public string FeatureCode { get; }

        /// <summary>
        /// Gets whether read-only access is permitted.
        /// </summary>
        public bool AllowReadOnly { get; }

        /// <summary>
        /// Gets whether regular authenticated workspace members are permitted access.
        /// </summary>
        public bool AllowMemberAccess { get; }

        /// <summary>
        /// Initializes a new instance of <see cref="RequireFeatureAttribute"/> for a modular capability.
        /// </summary>
        /// <param name="featureCode">The canonical feature code (e.g. "bcp-workspace", "bcp-committees", "bcp-staff-rota").</param>
        /// <param name="allowReadOnly">Whether read-only auditors may view this feature.</param>
        /// <param name="allowMemberAccess">Whether authenticated regular members of the subscribed tenant workspace may access this personal workspace endpoint.</param>
        public RequireFeatureAttribute(string featureCode, bool allowReadOnly = true, bool allowMemberAccess = false)
            : base(typeof(RequireFeatureFilter))
        {
            FeatureCode = featureCode;
            AllowReadOnly = allowReadOnly;
            AllowMemberAccess = allowMemberAccess;
            Arguments = new object[] { featureCode, allowReadOnly, allowMemberAccess };
        }
    }
}

