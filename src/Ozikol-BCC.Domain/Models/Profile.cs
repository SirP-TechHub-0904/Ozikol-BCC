using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Application user profile for the tenant database. This extends ASP.NET Identity with
    /// BCP-specific identity metadata such as category, status, and display name.
    /// </summary>
    public class Profile : IdentityUser
    {
       
        [Display(Name = "Title")]
        public string? Title { get; set; }

        [Display(Name = "First Name")]
        public string? FirstName { get; set; }

        [Display(Name = "Middle Name")]
        public string? MiddleName { get; set; }

        [Display(Name = "Last Name")]
        public string? LastName { get; set; }

        [Display(Name = "Date of Birth")]
        public DateTime? DateOfBirth { get; set; }

        /// <summary>
        /// Last successful sign-in timestamp used by account security and audit surfaces.
        /// </summary>
        [Display(Name = "Last Login")]
        public DateTime? LastLogin { get; set; }

        /// <summary>
        /// Optional BCP categorization such as staff, member, contractor, volunteer, or alumni.
        /// </summary>
        [Display(Name = "User Category")]
        public Guid? BcpUserCategoryId { get; set; }
        public BcpUserCategory? BcpUserCategory { get; set; }

        [Display(Name = "Gender")]
        public GenderStatus Gender { get; set; }

        /// <summary>
        /// Business account state used by Console user management in addition to Identity lockout.
        /// </summary>
        [Display(Name = "User Status")]
        public UserStatus UserStatus { get; set; } = UserStatus.Active;

        /// <summary>
        /// Unique member/employee identification code (e.g. CC-2026-0042).
        /// </summary>
        [Display(Name = "Member ID")]
        [StringLength(50)]
        public string? MemberId { get; set; }

        /// <summary>
        /// Professional designation or job title.
        /// </summary>
        [Display(Name = "Designation")]
        [StringLength(100)]
        public string? Designation { get; set; }

        /// <summary>
        /// Cloudinary URL for profile avatar image.
        /// </summary>
        [Display(Name = "Avatar URL")]
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// Official membership or employment join date.
        /// </summary>
        [Display(Name = "Join Date")]
        public DateTime? JoinDate { get; set; }

        /// <summary>
        /// Extracted honorary or professional post-nominal suffix (e.g. "mni", "PhD", "Esq") stored within CustomAttributesJson.
        /// </summary>
        [Display(Name = "Suffix")]
        public string? Suffix
        {
            get
            {
                if (string.IsNullOrWhiteSpace(CustomAttributesJson)) return null;
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(CustomAttributesJson);
                    if (doc.RootElement.TryGetProperty("suffix", out var sProp))
                    {
                        var s = sProp.GetString();
                        return string.IsNullOrWhiteSpace(s) ? null : s.Trim();
                    }
                }
                catch
                {
                    // Fallback if JSON is malformed
                }
                return null;
            }
        }

        /// <summary>
        /// Formatted full name incorporating title, first, middle, last name, and post-nominal suffix (e.g. "Dr. First Last, mni").
        /// </summary>
        [Display(Name = "Full Name")]
        public string FullName
        {
            get
            {
                var baseName = $"{Title} {FirstName} {MiddleName} {LastName}".Trim();
                var s = Suffix;
                if (!string.IsNullOrWhiteSpace(s) && !baseName.EndsWith(s, StringComparison.OrdinalIgnoreCase))
                {
                    return $"{baseName}, {s}".Trim();
                }
                return baseName;
            }
        }

        /// <summary>
        /// Distinguishes internal platform users from external guest users.
        /// </summary>
        [Display(Name = "User Type")]
        public BcpUserType UserType { get; set; } = BcpUserType.Internal;

        /// <summary>
        /// Company name for guest users (e.g. "Acme Corp").
        /// </summary>
        [StringLength(255)]
        [Display(Name = "Guest Company Name")]
        public string? GuestCompanyName { get; set; }

        /// <summary>
        /// Auto-expire date for guest access. Null = no expiry.
        /// </summary>
        [Display(Name = "Guest Access Expiry")]
        public DateTime? GuestAccessExpiry { get; set; }

        /// <summary>
        /// The user's active/preferred two-factor authentication provider.
        /// </summary>
        [Display(Name = "Preferred Two-Factor Provider")]
        public BcpTwoFactorProvider PreferredTwoFactorProvider { get; set; } = BcpTwoFactorProvider.None;

        /// <summary>
        /// When true, the user is required to update their temporary password upon next login.
        /// </summary>
        [Display(Name = "Must Change Password")]
        public bool MustChangePassword { get; set; } = false;

        /// <summary>
        /// Identifies whether the account was provisioned by an Admin or Self-Registered publicly.
        /// </summary>
        [Display(Name = "Registration Source")]
        [StringLength(50)]
        public string RegistrationSource { get; set; } = "Admin";

        /// <summary>
        /// Dynamic business-specific registration and onboarding attribute responses stored as serialized JSON key-value pairs.
        /// Corresponds to the field definitions configured in BcpRegistrationFormFields.
        /// </summary>
        [Display(Name = "Custom Attributes (JSON)")]
        public string? CustomAttributesJson { get; set; }
    }
}

