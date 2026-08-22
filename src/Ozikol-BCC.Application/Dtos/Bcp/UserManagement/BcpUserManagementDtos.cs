using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Application.Dtos.BCP.UserManagement
{
    // Application DTOs for the BCP User Management feature. These objects are page/service
    // contracts and should stay independent from Razor UI details and EF tracking behavior.
    /// <summary>
    /// DTO for creating or editing a KPI Indicator (the admin-defined performance criteria).
    /// </summary>
    public class BcpKpiIndicatorDto
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [Display(Name = "Indicator Title")]
        public string Title { get; set; } = string.Empty;

        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Required]
        [Display(Name = "Maximum Score")]
        public decimal MaxScore { get; set; } = 100;

        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// DTO for submitting a single KPI score for one user on one indicator.
    /// A list of these is submitted at once from the KpiAssign page.
    /// </summary>
    public class BcpKpiScoreDto
    {
        public Guid? Id { get; set; }

        [Required]
        public string ProfileId { get; set; } = string.Empty;

        [Required]
        public Guid BcpKpiIndicatorId { get; set; }

        public string? IndicatorTitle { get; set; }   // display only
        public decimal MaxScore { get; set; }          // display only

        [Required]
        [Display(Name = "Score")]
        public decimal Score { get; set; }

        [Required]
        [Display(Name = "Evaluation Period")]
        public string Period { get; set; } = string.Empty; // e.g., "Q1 2025"

        [Display(Name = "Remarks")]
        public string? Remarks { get; set; }

        public string? EvaluatedBy { get; set; }       // set server-side
    }

    /// <summary>
    /// DTO for a single row in the KPI Leaderboard / rankings table.
    /// </summary>
    public class BcpKpiLeaderboardDto
    {
        public string ProfileId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PassportUrl { get; set; }
        public decimal TotalScore { get; set; }
        public decimal MaxPossibleScore { get; set; }
        public decimal Percentage { get; set; }
        public int Rank { get; set; }
        public string? BcpUserCategoryName { get; set; }
    }

    /// <summary>
    /// DTO for assigning or editing a BCP feature role for a specific user.
    /// This is the Application-layer contract behind Console permission matrix behavior.
    /// </summary>
    public class BcpUserFeatureRoleDto
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string ProfileId { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Feature Area")]
        public string FeatureAreaKey { get; set; } = string.Empty; // e.g., "Elections", "Ticketing"

        [Required]
        [Display(Name = "Action Role")]
        public int ActionRole { get; set; }             // maps to BcpActionRole enum

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        public string? AssignedBy { get; set; }         // set server-side
    }

    /// <summary>
    /// DTO for adding a private admin note to a user's profile.
    /// </summary>
    public class BcpUserNoteDto
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string ProfileId { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Note")]
        public string Note { get; set; } = string.Empty;

        [Display(Name = "Private (Admin Eyes Only)")]
        public bool IsPrivate { get; set; } = true;

        public string? CreatedBy { get; set; }          // set server-side
    }

    /// <summary>
    /// DTO for creating or editing a User Category (Staff, Volunteer, Alumni, etc.)
    /// </summary>
    public class BcpUserCategoryDto
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [Display(Name = "Category Name")]
        public string Name { get; set; } = string.Empty;

        [Display(Name = "Description")]
        public string? Description { get; set; }

        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;
    }
}
