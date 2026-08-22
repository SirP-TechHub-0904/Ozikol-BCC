using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Repository.BCP.UserManagement
{
    /// <summary>
    /// Feature-specific interface for the User Management BCP Area.
    /// Each method group corresponds to a specific page or partial view in the Area.
    /// Used via @inject in Partial Views and via constructor injection in PageModels.
    /// Keep feature access checks here so BCP pages do not duplicate permission logic.
    /// </summary>
    public interface IBcpUserManagementRepository
    {
        // =========================================================
        // USER CATEGORIES (Settings)
        // =========================================================
        Task<List<BcpUserCategory>> GetAllUserCategoriesAsync();
        Task CreateUserCategoryAsync(BcpUserCategoryDto dto);
        Task UpdateUserCategoryAsync(BcpUserCategoryDto dto);
        Task DeleteUserCategoryAsync(Guid id);

        // =========================================================
        // KPI INDICATORS (Settings — Admin defines what to measure)
        // =========================================================
        Task<List<BcpKpiIndicator>> GetAllKpiIndicatorsAsync();
        Task<BcpKpiIndicator?> GetKpiIndicatorByIdAsync(Guid id);
        Task CreateKpiIndicatorAsync(BcpKpiIndicatorDto dto);
        Task UpdateKpiIndicatorAsync(BcpKpiIndicatorDto dto);
        Task DeleteKpiIndicatorAsync(Guid id);

        // =========================================================
        // KPI SCORING (Admin scores a specific user)
        // =========================================================

        /// <summary>
        /// Returns a pre-filled list of score DTOs for a user in a given period,
        /// ready to be rendered as input fields on the KpiAssign page.
        /// If no score exists yet for an indicator, returns a blank DTO for it.
        /// </summary>
        Task<List<BcpKpiScoreDto>> GetUserScoreSheetAsync(string profileId, string period);

        Task SaveKpiScoresAsync(List<BcpKpiScoreDto> scores, string evaluatedBy);
        Task<List<BcpKpiUserScore>> GetUserScoreHistoryAsync(string profileId);
        Task<List<string>> GetAllPeriodsAsync();  // Returns distinct periods e.g. ["Q1 2025", "Q2 2025"]

        /// <summary>
        /// Returns all users ranked by total KPI score for a given period.
        /// Used to populate the leaderboard table and charts.
        /// </summary>
        Task<List<BcpKpiLeaderboardDto>> GetKpiLeaderboardAsync(string period);

        // =========================================================
        // FEATURE ROLE MANAGEMENT (Permission Matrix)
        // =========================================================
        // Feature roles connect a profile to one BCP area and one action role.
        // Console/sidebar visibility and edit/delete buttons should resolve through these methods.
        Task<List<BcpUserFeatureRole>> GetUserFeatureRolesAsync(string profileId);
        Task AssignFeatureRoleAsync(BcpUserFeatureRoleDto dto);
        Task UpdateFeatureRoleAsync(BcpUserFeatureRoleDto dto);
        Task RevokeFeatureRoleAsync(Guid roleId);

        /// <summary>
        /// Core security check — called in every Area's PageModel and Partial View.
        /// Returns true if the user has access to the given feature Area.
        /// </summary>
        Task<bool> UserHasFeatureAccessAsync(string profileId, string featureAreaKey);

        /// <summary>
        /// Returns the action role (GlobalEditor, FeatureEditor, Readonly) for a user in a feature.
        /// Returns null if the user has no access at all.
        /// Used to hide/show Edit and Delete buttons in views.
        /// </summary>
        Task<BcpActionRole?> GetUserActionRoleAsync(string profileId, string featureAreaKey);

        // =========================================================
        // USER NOTES (Private HR notes on a user's profile)
        // =========================================================
        Task<List<BcpUserNote>> GetUserNotesAsync(string profileId, bool includePrivate);
        Task AddUserNoteAsync(BcpUserNoteDto dto);
        Task DeleteUserNoteAsync(Guid id);

        // =========================================================
        // DASHBOARD STATS (For AdminBCP Index page widgets)
        // =========================================================
        Task<int> GetTotalUsersCountAsync();
        Task<int> GetActiveUsersCountAsync();
        Task<int> GetSuspendedUsersCountAsync();
        Task<int> GetPendingUsersCountAsync();
    }
}

