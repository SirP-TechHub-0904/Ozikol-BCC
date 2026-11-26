using System;
using System.Collections.Generic;
using System.Text;

namespace Ozikol_BCC.Domain.Constants
{
    /// <summary>
    /// Single source of truth for canonical system and operational role names across Ozikol BCC.
    /// Eliminates duplicated spaced/unspaced role strings in controllers and authorization checks.
    /// </summary>
    public static class SystemRoles
    {
        public const string SuperAdmin = "SuperAdmin";
        public const string Admin = "Admin";
        public const string CentralCommandManager = "Central Command Manager";
        public const string CmsStudioManager = "CMS Studio Manager";
        public const string UserManager = "User Manager";
        public const string IdentityManager = "Identity Manager";
        public const string BroadcastManager = "Broadcast Manager";
        public const string BillingManager = "Billing Manager";
        public const string SettingsManager = "Settings & Audit Manager";
        public const string Member = "Member";
        public const string GlobalEditor = "Global Editor";
        public const string FeatureEditor = "Feature Editor";
        public const string ReadOnly = "Read Only";

        // =========================================================================
        // Canonical String Constants for Controller Authorization Attributes
        // =========================================================================
        public const string GlobalAdminRoles = "SuperAdmin,Admin";
        public const string GlobalEditorRoles = "SuperAdmin,Admin,Global Editor";

        // System Platform Modules - Read & Mutate Constants
        public const string CentralCommandReadRoles = "SuperAdmin,Admin,Central Command Manager,Global Editor,Feature Editor,Read Only";
        public const string CentralCommandMutateRoles = "SuperAdmin,Admin,Central Command Manager,Global Editor,Feature Editor";

        public const string CmsStudioReadRoles = "SuperAdmin,Admin,CMS Studio Manager,Global Editor,Feature Editor,Read Only";
        public const string CmsStudioMutateRoles = "SuperAdmin,Admin,CMS Studio Manager,Global Editor,Feature Editor";

        public const string UserDirectoryReadRoles = "SuperAdmin,Admin,User Manager,Identity Manager,Global Editor,Feature Editor,Read Only";
        public const string UserDirectoryMutateRoles = "SuperAdmin,Admin,User Manager,Identity Manager,Global Editor,Feature Editor";

        public const string IdentityAdminReadRoles = "SuperAdmin,Admin,Identity Manager,Global Editor,Feature Editor,Read Only";
        public const string IdentityAdminMutateRoles = "SuperAdmin,Admin,Identity Manager,Global Editor,Feature Editor";

        public const string BroadcastReadRoles = "SuperAdmin,Admin,Broadcast Manager,Global Editor,Feature Editor,Read Only";
        public const string BroadcastMutateRoles = "SuperAdmin,Admin,Broadcast Manager,Global Editor,Feature Editor";

        public const string BillingReadRoles = "SuperAdmin,Admin,Billing Manager,Global Editor,Feature Editor,Read Only";
        public const string BillingMutateRoles = "SuperAdmin,Admin,Billing Manager,Global Editor,Feature Editor";

        public const string SettingsReadRoles = "SuperAdmin,Admin,Settings & Audit Manager,Global Editor,Feature Editor,Read Only";
        public const string SettingsMutateRoles = "SuperAdmin,Admin,Settings & Audit Manager,Global Editor,Feature Editor";

        // Paid Feature Specific Roles & Constants
        public const string WorkforceRotaManager = "Staff Rota & Shifts Manager";
        public const string WorkforceRotaReadRoles = "SuperAdmin,Admin,Staff Rota & Shifts Manager,Global Editor,Feature Editor,Read Only";
        public const string WorkforceRotaMutateRoles = "SuperAdmin,Admin,Staff Rota & Shifts Manager,Global Editor,Feature Editor";

        /// <summary>
        /// Builds an authorization role comma-delimited string allowing SuperAdmin, Admin, assigned feature role,
        /// Feature Editor, Global Editor, and Read Only users.
        /// </summary>
        public static string ForFeatureRead(string featureRole) => $"{SuperAdmin},{Admin},{featureRole},{GlobalEditor},{FeatureEditor},{ReadOnly}";

        /// <summary>
        /// Builds an authorization role comma-delimited string strictly allowing SuperAdmin, Admin, assigned feature role,
        /// Feature Editor, and Global Editor (blocking Read Only users from mutating data).
        /// </summary>
        public static string ForFeatureMutate(string featureRole) => $"{SuperAdmin},{Admin},{featureRole},{GlobalEditor},{FeatureEditor}";

        /// <summary>
        /// Normalizes any role string (spaced, PascalCase, snake_case, kebab-case) into a compact lowercase key
        /// so legacy aliases (e.g. "GlobalEditor" and "Global Editor") resolve identically.
        /// </summary>
        /// <param name="roleName">Raw role name or claim value.</param>
        /// <returns>Normalized lowercase alphanumeric key.</returns>
        public static string Normalize(string? roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName))
                return string.Empty;

            var sb = new StringBuilder(roleName.Length);
            foreach (var ch in roleName)
            {
                if (char.IsLetterOrDigit(ch))
                    sb.Append(char.ToLowerInvariant(ch));
            }
            return sb.ToString();
        }

        /// <summary>
        /// Canonical normalized keys that grant unrestricted workspace console administration.
        /// </summary>
        public static readonly HashSet<string> GlobalAdminKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin"
        };

        /// <summary>
        /// Canonical normalized keys that grant Website &amp; CMS Studio access.
        /// </summary>
        public static readonly HashSet<string> CmsAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "cmsstudiomanager",
            "cmsmanager",
            "contentmanager",
            "globaleditor",
            "featureeditor",
            "readonly"
        };

        /// <summary>
        /// Canonical normalized keys that grant Identity &amp; Security Audit access.
        /// </summary>
        public static readonly HashSet<string> IdentityAdminKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "identitymanager"
        };

        /// <summary>
        /// Canonical normalized keys that grant User Directory &amp; Account management access.
        /// </summary>
        public static readonly HashSet<string> UserManagementKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "identitymanager",
            "usermanager"
        };

        /// <summary>
        /// Canonical normalized keys that grant Console Dashboard access.
        /// </summary>
        public static readonly HashSet<string> ConsoleDashboardKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "identitymanager",
            "usermanager",
            "cmsstudiomanager",
            "cmsmanager",
            "contentmanager",
            "globaleditor",
            "featureeditor",
            "readonly"
        };

        /// <summary>
        /// Canonical normalized keys that grant Commerce Studio management access.
        /// </summary>
        public static readonly HashSet<string> CommerceAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "commercemanager",
            "cmsstudiomanager",
            "cmsmanager",
            "globaleditor",
            "featureeditor",
            "readonly"
        };

        /// <summary>
        /// Canonical normalized keys that grant Outbound Communication &amp; Template management access.
        /// </summary>
        public static readonly HashSet<string> CommunicationAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "identitymanager",
            "systemadministrator",
            "communicationmanager"
        };

        /// <summary>
        /// Canonical normalized keys that grant Custom Form Builder management access.
        /// </summary>
        public static readonly HashSet<string> FormBuilderAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "cmsstudiomanager",
            "cmsmanager",
            "globaleditor",
            "featureeditor",
            "formmanager"
        };

        /// <summary>
        /// Canonical normalized keys that grant Billing, Subscriptions &amp; Invoice governance access.
        /// </summary>
        public static readonly HashSet<string> BillingAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "billingmanager",
            "billing",
            "financebanking"
        };

        /// <summary>
        /// Canonical normalized keys that grant Global System Settings &amp; Security Audit access.
        /// </summary>
        public static readonly HashSet<string> SettingsAccessKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "superadmin",
            "admin",
            "settingsmanager",
            "settingsauditmanager",
            "identitymanager"
        };
    }

    /// <summary>
    /// Single source of truth for ASP.NET Core authorization policy names used on API controllers.
    /// </summary>
    public static class AuthPolicies
    {
        public const string ConsoleDashboard = "Policy.ConsoleDashboard";
        public const string CmsStudio = "Policy.CmsStudio";
        public const string IdentityAdmin = "Policy.IdentityAdmin";
        public const string UserManagement = "Policy.UserManagement";
        public const string CommerceStudio = "Policy.CommerceStudio";
        public const string CommunicationStudio = "Policy.CommunicationStudio";
        public const string FormStudio = "Policy.FormStudio";
        public const string BillingGovernance = "Policy.BillingGovernance";
        public const string SettingsGovernance = "Policy.SettingsGovernance";
    }
}

