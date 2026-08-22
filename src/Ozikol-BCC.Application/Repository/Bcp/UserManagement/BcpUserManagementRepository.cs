using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Repository.BCP.UserManagement
{
    /// <summary>
    /// Application repository for BCP user management, KPI scoring, private notes,
    /// and feature-level access checks. This repository is the intended bridge between
    /// Identity profiles and BCP Console/Workspace permission behavior.
    /// </summary>
    public class BcpUserManagementRepository : IBcpUserManagementRepository
    {
        private readonly DashboardDbContext _context;

        public BcpUserManagementRepository(DashboardDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // USER CATEGORIES
        // =========================================================

        public async Task<List<BcpUserCategory>> GetAllUserCategoriesAsync()
            => await _context.BcpUserCategories.OrderBy(x => x.SortOrder).ToListAsync();

        public async Task CreateUserCategoryAsync(BcpUserCategoryDto dto)
        {
            var entity = new BcpUserCategory
            {
                Name = dto.Name,
                Description = dto.Description,
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
                Date = DateTime.UtcNow
            };
            _context.BcpUserCategories.Add(entity);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateUserCategoryAsync(BcpUserCategoryDto dto)
        {
            var entity = await _context.BcpUserCategories.FindAsync(dto.Id);
            if (entity == null) return;
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUserCategoryAsync(Guid id)
        {
            var entity = await _context.BcpUserCategories.FindAsync(id);
            if (entity != null)
            {
                _context.BcpUserCategories.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }

        // =========================================================
        // KPI INDICATORS
        // =========================================================

        public async Task<List<BcpKpiIndicator>> GetAllKpiIndicatorsAsync()
            => await _context.BcpKpiIndicators
                .Where(x => x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ToListAsync();

        public async Task<BcpKpiIndicator?> GetKpiIndicatorByIdAsync(Guid id)
            => await _context.BcpKpiIndicators.FindAsync(id);

        public async Task CreateKpiIndicatorAsync(BcpKpiIndicatorDto dto)
        {
            var entity = new BcpKpiIndicator
            {
                Title = dto.Title,
                Description = dto.Description,
                MaxScore = dto.MaxScore,
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
                Date = DateTime.UtcNow
            };
            _context.BcpKpiIndicators.Add(entity);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateKpiIndicatorAsync(BcpKpiIndicatorDto dto)
        {
            var entity = await _context.BcpKpiIndicators.FindAsync(dto.Id);
            if (entity == null) return;
            entity.Title = dto.Title;
            entity.Description = dto.Description;
            entity.MaxScore = dto.MaxScore;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteKpiIndicatorAsync(Guid id)
        {
            var entity = await _context.BcpKpiIndicators.FindAsync(id);
            if (entity != null)
            {
                _context.BcpKpiIndicators.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }

        // =========================================================
        // KPI SCORING
        // =========================================================

        public async Task<List<BcpKpiScoreDto>> GetUserScoreSheetAsync(string profileId, string period)
        {
            var indicators = await GetAllKpiIndicatorsAsync();
            var existingScores = await _context.BcpKpiUserScores
                .Where(x => x.ProfileId == profileId && x.Period == period)
                .ToListAsync();

            // Build a pre-filled score sheet: one row per active indicator, even before a score exists.
            return indicators.Select(indicator =>
            {
                var existing = existingScores.FirstOrDefault(s => s.BcpKpiIndicatorId == indicator.Id);
                return new BcpKpiScoreDto
                {
                    Id = existing?.Id,
                    ProfileId = profileId,
                    BcpKpiIndicatorId = indicator.Id,
                    IndicatorTitle = indicator.Title,
                    MaxScore = indicator.MaxScore,
                    Score = existing?.Score ?? 0,
                    Period = period,
                    Remarks = existing?.Remarks
                };
            }).ToList();
        }

        public async Task SaveKpiScoresAsync(List<BcpKpiScoreDto> scores, string evaluatedBy)
        {
            foreach (var dto in scores)
            {
                if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
                {
                    // Update existing score
                    var existing = await _context.BcpKpiUserScores.FindAsync(dto.Id.Value);
                    if (existing != null)
                    {
                        existing.Score = dto.Score;
                        existing.Remarks = dto.Remarks;
                        existing.EvaluatedBy = evaluatedBy;
                        existing.Date = DateTime.UtcNow;
                    }
                }
                else
                {
                    // Create new score
                    _context.BcpKpiUserScores.Add(new BcpKpiUserScore
                    {
                        ProfileId = dto.ProfileId,
                        BcpKpiIndicatorId = dto.BcpKpiIndicatorId,
                        Score = dto.Score,
                        Period = dto.Period,
                        Remarks = dto.Remarks,
                        EvaluatedBy = evaluatedBy,
                        Date = DateTime.UtcNow
                    });
                }
            }
            await _context.SaveChangesAsync();
        }

        public async Task<List<BcpKpiUserScore>> GetUserScoreHistoryAsync(string profileId)
            => await _context.BcpKpiUserScores
                .Include(x => x.BcpKpiIndicator)
                .Where(x => x.ProfileId == profileId)
                .OrderByDescending(x => x.Date)
                .ToListAsync();

        public async Task<List<string>> GetAllPeriodsAsync()
            => await _context.BcpKpiUserScores
                .Select(x => x.Period)
                .Distinct()
                .OrderByDescending(x => x)
                .ToListAsync();

        public async Task<List<BcpKpiLeaderboardDto>> GetKpiLeaderboardAsync(string period)
        {
            var scores = await _context.BcpKpiUserScores
                .Include(x => x.Profile)
                .Include(x => x.BcpKpiIndicator)
                .Where(x => x.Period == period)
                .ToListAsync();

            var indicators = await GetAllKpiIndicatorsAsync();
            decimal maxPossible = indicators.Sum(i => i.MaxScore);

            var grouped = scores
                .GroupBy(x => x.ProfileId)
                .Select(g =>
                {
                    var profile = g.First().Profile;
                    var totalScore = g.Sum(s => s.Score);
                    return new BcpKpiLeaderboardDto
                    {
                        ProfileId = g.Key,
                        FullName = profile?.FullName ?? "Unknown",
                        // PassportUrl = profile?.PassportFilePathUrl,
                        TotalScore = totalScore,
                        MaxPossibleScore = maxPossible,
                        Percentage = maxPossible > 0 ? Math.Round((totalScore / maxPossible) * 100, 2) : 0
                    };
                })
                .OrderByDescending(x => x.TotalScore)
                .ToList();

            // Assign rank
            for (int i = 0; i < grouped.Count; i++)
                grouped[i].Rank = i + 1;

            return grouped;
        }

        // =========================================================
        // FEATURE ROLE MANAGEMENT
        // =========================================================

        public async Task<List<BcpUserFeatureRole>> GetUserFeatureRolesAsync(string profileId)
            => await _context.BcpUserFeatureRoles
                .Where(x => x.ProfileId == profileId && x.IsActive)
                .OrderBy(x => x.FeatureAreaKey)
                .ToListAsync();

        public async Task AssignFeatureRoleAsync(BcpUserFeatureRoleDto dto)
        {
            // One profile should have one current role per feature; update in place to preserve a clear access trail.
            var existing = await _context.BcpUserFeatureRoles
                .FirstOrDefaultAsync(x => x.ProfileId == dto.ProfileId && x.FeatureAreaKey == dto.FeatureAreaKey);

            if (existing != null)
            {
                // Update instead of creating a duplicate
                existing.ActionRole = (BcpActionRole)dto.ActionRole;
                existing.IsActive = dto.IsActive;
                existing.AssignedBy = dto.AssignedBy;
                existing.Date = DateTime.UtcNow;
            }
            else
            {
                _context.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
                {
                    ProfileId = dto.ProfileId,
                    FeatureAreaKey = dto.FeatureAreaKey,
                    ActionRole = (BcpActionRole)dto.ActionRole,
                    IsActive = dto.IsActive,
                    AssignedBy = dto.AssignedBy,
                    Date = DateTime.UtcNow
                });
            }
            await _context.SaveChangesAsync();
        }

        public async Task UpdateFeatureRoleAsync(BcpUserFeatureRoleDto dto)
        {
            var entity = await _context.BcpUserFeatureRoles.FindAsync(dto.Id);
            if (entity == null) return;
            entity.ActionRole = (BcpActionRole)dto.ActionRole;
            entity.IsActive = dto.IsActive;
            entity.AssignedBy = dto.AssignedBy;
            entity.Date = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task RevokeFeatureRoleAsync(Guid roleId)
        {
            var entity = await _context.BcpUserFeatureRoles.FindAsync(roleId);
            if (entity != null)
            {
                // Revoke by deactivation, not deletion, so audit and reporting can still explain past access.
                entity.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> UserHasFeatureAccessAsync(string profileId, string featureAreaKey)
            // Core feature gate: use this before rendering feature dashboards, widgets, or sidebar entries.
            => await _context.BcpUserFeatureRoles
                .AnyAsync(x => x.ProfileId == profileId
                            && x.FeatureAreaKey == featureAreaKey
                            && x.IsActive);

        public async Task<BcpActionRole?> GetUserActionRoleAsync(string profileId, string featureAreaKey)
        {
            // Action role decides what the user can do inside an enabled feature after access is granted.
            var role = await _context.BcpUserFeatureRoles
                .FirstOrDefaultAsync(x => x.ProfileId == profileId
                                       && x.FeatureAreaKey == featureAreaKey
                                       && x.IsActive);
            return role?.ActionRole;
        }

        // =========================================================
        // USER NOTES
        // =========================================================

        public async Task<List<BcpUserNote>> GetUserNotesAsync(string profileId, bool includePrivate)
        {
            var query = _context.BcpUserNotes.Where(x => x.ProfileId == profileId);
            if (!includePrivate)
                query = query.Where(x => x.IsPrivate == false);
            return await query.OrderByDescending(x => x.Date).ToListAsync();
        }

        public async Task AddUserNoteAsync(BcpUserNoteDto dto)
        {
            _context.BcpUserNotes.Add(new BcpUserNote
            {
                ProfileId = dto.ProfileId,
                Note = dto.Note,
                IsPrivate = dto.IsPrivate,
                CreatedBy = dto.CreatedBy,
                Date = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUserNoteAsync(Guid id)
        {
            var entity = await _context.BcpUserNotes.FindAsync(id);
            if (entity != null)
            {
                _context.BcpUserNotes.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }

        // =========================================================
        // DASHBOARD STATS
        // =========================================================

        public async Task<int> GetTotalUsersCountAsync()
            => await _context.Users.CountAsync();

        public async Task<int> GetActiveUsersCountAsync()
            => await _context.Users
                .OfType<Profile>()
                .CountAsync(x => x.UserStatus == UserStatus.Active);

        public async Task<int> GetSuspendedUsersCountAsync()
            => await _context.Users
                .OfType<Profile>()
                .CountAsync(x => x.UserStatus == UserStatus.Suspended);

        public async Task<int> GetPendingUsersCountAsync()
            => await _context.Users
                .OfType<Profile>()
                .CountAsync(x => x.UserStatus == UserStatus.Pending);
    }
}

