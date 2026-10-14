using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.UserCommands;
using Ozikol_BCC.Application.Queries.UserQueries;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Application.Services;
using System.Security.Claims;
using System.Text.Json;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
    [Tags("5. Admin User Management & Directory")]
    public class UsersApiController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly DashboardDbContext _dbContext;
        private readonly UserManager<Profile> _userManager;
        private readonly RoleManager<AppRole> _roleManager;
        private readonly IMemberIdGeneratorService _memberIdGenerator;
        private readonly IOtpVerificationService _otpService;

        public UsersApiController(
            IMediator mediator,
            DashboardDbContext dbContext,
            UserManager<Profile> userManager,
            RoleManager<AppRole> roleManager,
            IMemberIdGeneratorService memberIdGenerator,
            IOtpVerificationService otpService)
        {
            _mediator = mediator;
            _dbContext = dbContext;
            _userManager = userManager;
            _roleManager = roleManager;
            _memberIdGenerator = memberIdGenerator;
            _otpService = otpService;
        }

        // =========================================================================
        // =========================================================================
        // 1. DASHBOARD & EXECUTIVE ANALYTICS
        // =========================================================================

        /// <summary>
        /// Retrieves real-time executive dashboard statistics for tenant user management.
        /// </summary>
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var superAdminRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "SuperAdmin");
            var superAdminUserIds = superAdminRole != null 
                ? await _dbContext.UserRoles.Where(ur => ur.RoleId == superAdminRole.Id).Select(ur => ur.UserId).ToListAsync() 
                : new List<string>();

            // Organizational members query (hiding root SuperAdmin)
            var memberQuery = _dbContext.Users.Where(u => !superAdminUserIds.Contains(u.Id));

            var totalMembers = await memberQuery.CountAsync();
            var activeMembers = await memberQuery.CountAsync(u => u.UserStatus == UserStatus.Active);
            var suspendedMembers = await memberQuery.CountAsync(u => u.UserStatus == UserStatus.Suspended);
            var maleMembers = await memberQuery.CountAsync(u => u.Gender == GenderStatus.Male);
            var femaleMembers = await memberQuery.CountAsync(u => u.Gender == GenderStatus.Female);
            var suspiciousAccounts = await memberQuery.CountAsync(u => (u.LockoutEnd != null && u.LockoutEnd > DateTimeOffset.UtcNow) || u.AccessFailedCount > 0);
            var totalCategories = await _dbContext.BcpUserCategories.CountAsync();

            var categories = await _dbContext.BcpUserCategories
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.ColorCode,
                    c.Icon,
                    MemberCount = _dbContext.Users.Count(u => u.BcpUserCategoryId == c.Id && !superAdminUserIds.Contains(u.Id))
                })
                .ToListAsync();

            var unassignedCount = await memberQuery.CountAsync(u => u.BcpUserCategoryId == null);

            var recentRegistrations = await memberQuery
                .Include(u => u.BcpUserCategory)
                .OrderByDescending(u => u.JoinDate ?? DateTime.MinValue)
                .Take(5)
                .Select(u => new
                {
                    u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    MemberId = u.MemberId,
                    CategoryName = u.BcpUserCategory != null ? u.BcpUserCategory.Name : "Unassigned",
                    CategoryColor = u.BcpUserCategory != null ? u.BcpUserCategory.ColorCode : "#94a3b8",
                    UserStatus = u.UserStatus.ToString(),
                    JoinDate = u.JoinDate
                })
                .ToListAsync();

            var recentLogs = await _dbContext.BcpActivityLogs
                .OrderByDescending(l => l.Date)
                .Take(6)
                .Select(l => new
                {
                    l.Id,
                    l.ActionType,
                    l.Description,
                    l.PerformedByFullName,
                    l.TargetFullName,
                    l.Date
                })
                .ToListAsync();

            // 6-Month Registration Growth Trend
            var now = DateTime.UtcNow;
            var sixMonthsAgo = new DateTime(now.Year, now.Month, 1).AddMonths(-5);
            var growthLabels = new List<string>();
            var growthCounts = new List<int>();

            for (int i = 0; i < 6; i++)
            {
                var mStart = sixMonthsAgo.AddMonths(i);
                var mEnd = mStart.AddMonths(1);
                var count = await memberQuery.CountAsync(u => u.JoinDate >= mStart && u.JoinDate < mEnd);
                growthLabels.Add(mStart.ToString("MMM yyyy"));
                growthCounts.Add(count);
            }

            // Tenant Subscription Plan & Seat Capacity from MisConfigurationSettings
            var mgmtSetting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            var maximumUsers = mgmtSetting?.MaximumUsers ?? 0;
            var isUnlimited = maximumUsers <= 0;
            var planType = isUnlimited ? "Enterprise" : (maximumUsers <= 50 ? "Starter" : (maximumUsers <= 250 ? "Professional" : "Corporate"));
            var remainingSeats = isUnlimited ? -1 : Math.Max(0, maximumUsers - totalMembers);
            var seatUsagePercent = isUnlimited ? 0 : (maximumUsers > 0 ? (int)Math.Min(100, Math.Round(((double)totalMembers / maximumUsers) * 100)) : 0);

            // KPI Performance Intelligence
            var kpiIndicatorsCount = await _dbContext.BcpKpiIndicators.CountAsync();
            var totalScores = await _dbContext.BcpKpiUserScores.CountAsync();
            var avgOrgScore = totalScores > 0 ? Math.Round((double)await _dbContext.BcpKpiUserScores.AverageAsync(s => (double)s.Score), 1) : 0.0;
            var evaluatedMembersCount = await _dbContext.BcpKpiUserScores.Select(s => s.ProfileId).Distinct().CountAsync();

            var topPerformersRaw = await _dbContext.BcpKpiUserScores
                .Where(s => !superAdminUserIds.Contains(s.ProfileId))
                .GroupBy(s => s.ProfileId)
                .Select(g => new
                {
                    ProfileId = g.Key,
                    AvgScore = g.Average(x => (double)x.Score),
                    EvaluationsCount = g.Count(),
                    LatestPeriod = g.OrderByDescending(x => x.Date).Select(x => x.Period).FirstOrDefault()
                })
                .OrderByDescending(x => x.AvgScore)
                .Take(3)
                .ToListAsync();

            var topPerformerIds = topPerformersRaw.Select(t => t.ProfileId).ToList();
            var topProfiles = await _dbContext.Users
                .Include(u => u.BcpUserCategory)
                .Where(u => topPerformerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var leaderboard = topPerformersRaw.Select((t, index) => new
            {
                rank = index + 1,
                profileId = t.ProfileId,
                fullName = topProfiles.TryGetValue(t.ProfileId, out var p) ? p.FullName : "Member",
                email = topProfiles.TryGetValue(t.ProfileId, out var p2) ? p2.Email : "",
                categoryName = topProfiles.TryGetValue(t.ProfileId, out var p3) && p3.BcpUserCategory != null ? p3.BcpUserCategory.Name : "General",
                avgScore = Math.Round(t.AvgScore, 1),
                latestPeriod = t.LatestPeriod
            }).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                totalMembers,
                activeMembers,
                suspendedMembers,
                maleMembers,
                femaleMembers,
                suspiciousAccounts,
                totalCategories,
                unassignedCount,
                categories,
                recentRegistrations,
                recentLogs,
                planQuota = new
                {
                    planType,
                    maximumUsers,
                    usedSeats = totalMembers,
                    remainingSeats,
                    seatUsagePercent,
                    isUnlimited
                },
                kpiStats = new
                {
                    indicatorsCount = kpiIndicatorsCount,
                    avgOrgScore,
                    evaluatedMembersCount,
                    totalEvaluations = totalScores,
                    leaderboard,
                    barChart = new
                    {
                        labels = leaderboard.Select(l => l.fullName).ToList(),
                        scores = leaderboard.Select(l => l.avgScore).ToList()
                    }
                },
                growthTrend = new
                {
                    labels = growthLabels,
                    counts = growthCounts
                }
            }, "Dashboard statistics retrieved."));
        }

        // =========================================================================
        // 2. MEMBER DIRECTORY & USER PROFILES
        // =========================================================================

        /// <summary>
        /// Retrieves tenant user directory with rich category, role, and department data.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<UserDto>>), 200)]
        public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] Guid? categoryId, [FromQuery] string? role, [FromQuery] string? status)
        {
            var users = await _mediator.Send(new GetUserListQuery());
            var query = users.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLowerInvariant();
                query = query.Where(u =>
                    (u.FullName?.ToLowerInvariant().Contains(s) ?? false) ||
                    (u.Email?.ToLowerInvariant().Contains(s) ?? false) ||
                    (u.MemberId?.ToLowerInvariant().Contains(s) ?? false) ||
                    (u.Designation?.ToLowerInvariant().Contains(s) ?? false) ||
                    (u.CategoryName?.ToLowerInvariant().Contains(s) ?? false) ||
                    (u.PhoneNumber?.Contains(s) ?? false));
            }

            if (categoryId.HasValue && categoryId.Value != Guid.Empty)
            {
                query = query.Where(u => u.BcpUserCategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(role) && role != "All")
            {
                query = query.Where(u => u.Roles.Contains(role));
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                query = query.Where(u => string.Equals(u.UserStatus, status, StringComparison.OrdinalIgnoreCase));
            }

            return Ok(ApiResponse<IEnumerable<UserDto>>.SuccessResponse(query.ToList(), "User directory retrieved successfully."));
        }

        /// <summary>
        /// Retrieves specific user profile by ID.
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetUserById(string id)
        {
            var user = await _mediator.Send(new GetUserByIdQuery(id));
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));
            return Ok(ApiResponse<UserDto>.SuccessResponse(user, "User profile retrieved."));
        }

        /// <summary>
        /// Retrieves complete 360-degree member dossier including category, roles, KPI history, notes, and activity.
        /// </summary>
        [HttpGet("{id}/dossier")]
        public async Task<IActionResult> GetUserDossier(string id)
        {
            var user = await _dbContext.Users
                .Include(u => u.BcpUserCategory)
                .FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("Member not found."));

            var roles = await _userManager.GetRolesAsync(user);

            // KPI Performance Scores
            var kpiScores = await _dbContext.BcpKpiUserScores
                .Include(k => k.BcpKpiIndicator)
                .Where(k => k.ProfileId == id)
                .OrderByDescending(k => k.Date)
                .Select(k => new
                {
                    k.Id,
                    IndicatorTitle = k.BcpKpiIndicator != null ? k.BcpKpiIndicator.Title : "Custom Metric",
                    k.Period,
                    k.Score,
                    MaxScore = k.BcpKpiIndicator != null ? k.BcpKpiIndicator.MaxScore : 100,
                    k.Remarks,
                    RecordedDate = k.Date
                })
                .ToListAsync();

            // Notes with Author Full Name
            var rawNotes = await _dbContext.BcpUserNotes
                .Where(n => n.ProfileId == id)
                .OrderByDescending(n => n.Date)
                .ToListAsync();

            var authorIds = rawNotes.Select(n => n.CreatedBy).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();
            var authorProfiles = await _dbContext.Users
                .Where(u => authorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName);

            var notes = rawNotes.Select(n => new
            {
                n.Id,
                n.Note,
                n.Date,
                AuthorFullName = !string.IsNullOrEmpty(n.CreatedBy) && authorProfiles.TryGetValue(n.CreatedBy, out var name) && !string.IsNullOrWhiteSpace(name) ? name : "Administrator"
            }).ToList();

            // Activity logs
            var logs = await _dbContext.BcpActivityLogs
                .Where(l => l.TargetProfileId == id || l.PerformedByProfileId == id)
                .OrderByDescending(l => l.Date)
                .Take(25)
                .Select(l => new
                {
                    l.Id,
                    l.ActionType,
                    l.Description,
                    l.Date,
                    l.PerformedByFullName,
                    l.IpAddress
                })
                .ToListAsync();

            // Custom Dynamic Onboarding Attributes
            var customAttributes = new List<object>();
            if (!string.IsNullOrWhiteSpace(user.CustomAttributesJson))
            {
                try
                {
                    var rawDict = JsonSerializer.Deserialize<Dictionary<string, object>>(user.CustomAttributesJson);
                    if (rawDict != null && rawDict.Count > 0)
                    {
                        var fieldDefs = await _dbContext.BcpRegistrationFormFields.AsNoTracking().ToListAsync();
                        foreach (var kvp in rawDict)
                        {
                            var def = fieldDefs.FirstOrDefault(f => f.FieldKey.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase));
                            customAttributes.Add(new
                            {
                                fieldKey = kvp.Key,
                                label = def?.Label ?? kvp.Key,
                                fieldType = def?.FieldType ?? "text",
                                value = kvp.Value?.ToString() ?? string.Empty
                            });
                        }
                    }
                }
                catch
                {
                    // Graceful fallback if JSON fails
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                id = user.Id,
                email = user.Email,
                emailConfirmed = user.EmailConfirmed,
                phoneNumber = user.PhoneNumber,
                phoneNumberConfirmed = user.PhoneNumberConfirmed,
                fullName = user.FullName,
                firstName = user.FirstName,
                lastName = user.LastName,
                title = user.Title,
                memberId = user.MemberId,
                gender = user.Gender.ToString(),
                designation = user.Designation ?? "Member",
                avatarUrl = user.AvatarUrl,
                userStatus = user.UserStatus.ToString(),
                mustChangePassword = user.MustChangePassword,
                registrationSource = user.RegistrationSource,
                joinDate = user.JoinDate,
                lastLogin = user.LastLogin,
                bcpUserCategoryId = user.BcpUserCategoryId,
                categoryName = user.BcpUserCategory?.Name,
                categoryColor = user.BcpUserCategory?.ColorCode,
                categoryIcon = user.BcpUserCategory?.Icon,
                roles,
                kpiScores,
                notes,
                logs,
                customAttributes
            }, "Member 360° dossier retrieved."));
        }

        /// <summary>
        /// Generates a 6-digit OTP code for password reset or activation and queues email/SMS.
        /// </summary>
        [HttpPost("{id}/generate-otp")]
        public async Task<IActionResult> GenerateUserOtp(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var otp = Random.Shared.Next(100000, 999999).ToString();
            var expiryTicks = DateTime.UtcNow.AddMinutes(15).Ticks;

            await _userManager.SetAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp", $"{otp}:{expiryTicks}");
            await _userManager.SetAuthenticationTokenAsync(user, "OzikolResetOtp", "ResetOtp", $"{otp}:{expiryTicks}");

            // Queue in BcpEmailQueue
            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                _dbContext.BcpEmailQueue.Add(new BcpEmailQueue
                {
                    RelatedUserId = user.Id,
                    RecipientEmail = user.Email,
                    RecipientName = user.FullName,
                    Subject = "Your Account Activation & Password Reset OTP",
                    HtmlBody = $"<div style='font-family:sans-serif; padding:20px;'><h2>Account Activation Code</h2><p>Hello <strong>{user.FullName}</strong>,</p><p>Your 6-digit one-time passcode (OTP) for password setup is:</p><div style='font-size:32px; font-weight:800; letter-spacing:6px; color:#0050e5; padding:16px 0;'>{otp}</div><p>This code is valid for 15 minutes. Enter this code at the reset password screen to activate your account.</p></div>",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Urgent,
                    EventType = BcpEventType.PasswordReset,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Queue in BcpSmsQueue
            if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
            {
                _dbContext.BcpSmsQueue.Add(new BcpSmsQueue
                {
                    RelatedUserId = user.Id,
                    RecipientPhone = user.PhoneNumber,
                    Message = $"Your Ozikol activation OTP code is {otp}. Valid for 15 minutes.",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Urgent,
                    EventType = BcpEventType.PasswordReset,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // In-app notification
            _dbContext.BcpNotifications.Add(new BcpNotification
            {
                UserId = user.Id,
                Title = "Password Reset OTP Generated",
                Message = $"A 6-digit password reset OTP was generated for your account.",
                Category = BcpMessageCategory.Security,
                Priority = BcpMessagePriority.High,
                EventType = BcpEventType.PasswordReset,
                Icon = "pin",
                CreatedAt = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Generate OTP", $"Generated 6-digit reset OTP for '{user.FullName}'", user.Id, user.FullName);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                otp,
                expiresInMinutes = 15,
                email = user.Email,
                phone = user.PhoneNumber
            }, "6-Digit OTP generated and queued for delivery."));
        }

        /// <summary>
        /// Permanently deletes a user account with safety checks.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var settings = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (settings != null && !settings.EnableUserDeletion)
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("User account deletion is currently disabled in System Security Settings. Enable user deletion in Settings to proceed."));
            }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (user.Id == currentUserId)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("You cannot delete your own active administrator account."));
            }

            var userName = user.FullName;

            // Clean up dependencies
            var notes = _dbContext.BcpUserNotes.Where(n => n.ProfileId == id);
            _dbContext.BcpUserNotes.RemoveRange(notes);

            var kpis = _dbContext.BcpKpiUserScores.Where(k => k.ProfileId == id);
            _dbContext.BcpKpiUserScores.RemoveRange(kpis);

            var roles = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, roles);

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", result.Errors.Select(e => e.Description))));
            }

            await LogActivityAsync("Delete User", $"Permanently deleted member account for '{userName}' ({user.Email})", id, userName);
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Member account for '{userName}' has been deleted."));
        }

        /// <summary>
        /// Creates a new user profile with role assignment.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(ApiResponse<object>.FailureResponse("Email is required."));

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing != null)
                return BadRequest(ApiResponse<object>.FailureResponse("A user with this email address already exists."));

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                var trimmedPhone = request.PhoneNumber.Trim();
                var phoneExists = await _dbContext.Users.AnyAsync(u => u.PhoneNumber == trimmedPhone);
                if (phoneExists)
                    return BadRequest(ApiResponse<object>.FailureResponse($"A member with phone number '{trimmedPhone}' is already registered."));
            }

            string? catName = null;
            if (request.BcpUserCategoryId.HasValue)
            {
                var cat = await _dbContext.BcpUserCategories.FirstOrDefaultAsync(c => c.Id == request.BcpUserCategoryId.Value);
                catName = cat?.Name;
            }

            var generatedMemberId = await _memberIdGenerator.GenerateMemberIdAsync(request.FirstName, request.LastName, catName);

            var mustChangePassword = request.MustChangePassword ?? true;
            var newUser = new Profile
            {
                Id = Guid.NewGuid().ToString(),
                UserName = request.Email.Trim(),
                Email = request.Email.Trim(),
                FirstName = request.FirstName?.Trim(),
                LastName = request.LastName?.Trim(),
                Title = request.Title?.Trim(),
                Gender = request.Gender ?? GenderStatus.Male,
                PhoneNumber = request.PhoneNumber?.Trim(),
                MemberId = generatedMemberId,
                Designation = request.Designation?.Trim() ?? "Member",
                BcpUserCategoryId = request.BcpUserCategoryId,
                UserStatus = UserStatus.Active,
                JoinDate = request.JoinDate ?? DateTime.UtcNow,
                EmailConfirmed = false, // Email confirmation required according to policy
                PhoneNumberConfirmed = false,
                MustChangePassword = mustChangePassword,
                RegistrationSource = "Admin"
            };

            var password = string.IsNullOrWhiteSpace(request.Password) ? "Member@2026" : request.Password;
            var result = await _userManager.CreateAsync(newUser, password);
            if (!result.Succeeded)
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", result.Errors.Select(e => e.Description))));

            // Assign role
            var roleToAssign = !string.IsNullOrWhiteSpace(request.Role) ? request.Role : "Member";
            if (await _roleManager.RoleExistsAsync(roleToAssign))
            {
                await _userManager.AddToRoleAsync(newUser, roleToAssign);
            }

            // Queue Welcome & Credentials Email
            try
            {
                var origin = Request.Headers["Origin"].FirstOrDefault() ?? $"{Request.Scheme}://{Request.Host}";
                var loginUrl = $"{origin}/login";

                _dbContext.BcpEmailQueue.Add(new BcpEmailQueue
                {
                    Id = Guid.NewGuid(),
                    RelatedUserId = newUser.Id,
                    RecipientEmail = newUser.Email,
                    RecipientName = newUser.FullName,
                    Subject = "Welcome to Your Portal - Account Credentials",
                    HtmlBody = $@"
                        <div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
                            <h2 style='color:#0f172a; margin:0 0 12px; font-size:20px; font-weight:800;'>Welcome, {newUser.FullName}!</h2>
                            <p style='color:#334155; font-size:14px; line-height:1.5;'>Your member account has been registered on the portal. Below are your login details:</p>
                            
                            <div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin:18px 0;'>
                                <div style='margin-bottom:8px;'><span style='font-size:12px; color:#64748b;'>Member ID:</span> <strong style='color:#0f172a;'>{newUser.MemberId}</strong></div>
                                <div style='margin-bottom:8px;'><span style='font-size:12px; color:#64748b;'>Email:</span> <strong style='color:#0f172a;'>{newUser.Email}</strong></div>
                                <div><span style='font-size:12px; color:#64748b;'>Temporary Password:</span> <strong style='color:#0050e5; font-family:monospace; font-size:16px;'>{password}</strong></div>
                            </div>

                            {(mustChangePassword ? @"<div style='background:#eff6ff; border-left:4px solid #0050e5; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px;'>
                                <strong style='font-size:13px; color:#0050e5; display:block; margin-bottom:2px;'>Temporary Password Notice:</strong>
                                <span style='font-size:12.5px; color:#1e40af;'>Upon your first sign-in, you will be prompted to set your personal permanent password.</span>
                            </div>" : "")}

                            <div style='text-align:center; margin:24px 0 16px;'>
                                <a href='{loginUrl}' style='display:inline-block; background:#0050e5; color:#ffffff; font-size:14px; font-weight:700; padding:12px 28px; text-decoration:none; border-radius:8px;'>Sign In to Your Account</a>
                            </div>
                        </div>",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Urgent,
                    EventType = BcpEventType.PasswordReset,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();
            }
            catch
            {
                // Non-fatal email queueing
            }

            // Log activity
            await LogActivityAsync("Create User", $"Created member account for '{newUser.FullName}' ({newUser.Email}) with Member ID '{newUser.MemberId}' and role '{roleToAssign}'", newUser.Id, newUser.FullName);

            return Ok(ApiResponse<object>.SuccessResponse(new { newUser.Id, newUser.MemberId, newUser.MustChangePassword }, "User account created successfully. Welcome email with credentials dispatched."));
        }

        /// <summary>
        /// Resets a user's password directly from the Admin console with temporary password and email instructions.
        /// </summary>
        [HttpPut("{id}/reset-password")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> AdminResetPassword(string id, [FromBody] AdminResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(ApiResponse<object>.FailureResponse("New temporary password is required."));

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            // Use standard Identity ResetPasswordAsync
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, request.NewPassword);

            if (!resetResult.Succeeded)
            {
                // Fallback to Remove & Add
                await _userManager.RemovePasswordAsync(user);
                var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
                if (!addResult.Succeeded)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", addResult.Errors.Select(e => e.Description))));
                }
            }

            user.MustChangePassword = request.MustChangePassword ?? true;
            user.LockoutEnd = null;
            user.AccessFailedCount = 0;
            await _userManager.UpdateAsync(user);
            await _dbContext.SaveChangesAsync();

            // Queue Instruction Email with Temporary Password
            if ((request.SendEmailNotification ?? true) && !string.IsNullOrWhiteSpace(user.Email))
            {
                try
                {
                    var origin = Request.Headers["Origin"].FirstOrDefault() ?? $"{Request.Scheme}://{Request.Host}";
                    var loginUrl = $"{origin}/login";

                    _dbContext.BcpEmailQueue.Add(new BcpEmailQueue
                    {
                        Id = Guid.NewGuid(),
                        RelatedUserId = user.Id,
                        RecipientEmail = user.Email.Trim(),
                        RecipientName = user.FullName,
                        Subject = "Your Temporary Login Credentials & Password Setup",
                        HtmlBody = $@"
                            <div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
                                <h2 style='color:#0f172a; margin:0 0 12px; font-size:20px; font-weight:800;'>Temporary Login Password Set</h2>
                                <p style='color:#334155; font-size:14px; line-height:1.5;'>Hello <strong>{user.FullName}</strong>,</p>
                                <p style='color:#334155; font-size:14px; line-height:1.5;'>An administrator has assigned a new temporary password for your account:</p>
                                
                                <div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin:18px 0; text-align:center;'>
                                    <span style='font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;'>Temporary Password</span>
                                    <span style='font-family:monospace; font-size:22px; font-weight:800; color:#0050e5; letter-spacing:2px;'>{request.NewPassword}</span>
                                </div>

                                <div style='background:#eff6ff; border-left:4px solid #0050e5; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px;'>
                                    <strong style='font-size:13px; color:#0050e5; display:block; margin-bottom:2px;'>Important Note:</strong>
                                    <span style='font-size:12.5px; color:#1e40af;'>This is a temporary password. When you sign in, you will be prompted to set your new permanent password immediately.</span>
                                </div>

                                <div style='text-align:center; margin:24px 0 16px;'>
                                    <a href='{loginUrl}' style='display:inline-block; background:#0050e5; color:#ffffff; font-size:14px; font-weight:700; padding:12px 28px; text-decoration:none; border-radius:8px;'>Sign In to Your Account</a>
                                </div>

                                <p style='color:#94a3b8; font-size:12px; margin:0; text-align:center;'>Portal Link: <a href='{loginUrl}' style='color:#0050e5;'>{loginUrl}</a></p>
                            </div>",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        EventType = BcpEventType.PasswordReset,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                catch
                {
                    // Non-fatal email queueing
                }
            }

            // Also queue In-App Notification
            try
            {
                _dbContext.BcpNotifications.Add(new BcpNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Title = "Temporary Password Assigned",
                    Message = "An administrator assigned a temporary password to your account. You will be prompted to update it upon sign in.",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Urgent,
                    EventType = BcpEventType.PasswordReset,
                    Icon = "lock_reset",
                    Module = "Security",
                    IsRead = false
                });
                await _dbContext.SaveChangesAsync();
            }
            catch
            {
                // Non-fatal notification creation
            }

            await LogActivityAsync("Reset Password", $"Admin reset password for '{user.FullName}' (MustChangePassword={user.MustChangePassword}, EmailNotified={request.SendEmailNotification ?? true})", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Temporary password applied. Email notification dispatched to member."));
        }

        /// <summary>
        /// Generates a secure ASP.NET Identity tokenized password setup/activation link.
        /// </summary>
        [HttpPost("{id}/generate-reset-link")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> GeneratePasswordResetLink(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = Uri.EscapeDataString(token);
            var encodedEmail = Uri.EscapeDataString(user.Email ?? "");

            var origin = Request.Headers["Origin"].FirstOrDefault() ?? $"{Request.Scheme}://{Request.Host}";
            var resetUrl = $"{origin}/reset-password?token={encodedToken}&email={encodedEmail}";

            await LogActivityAsync("Generate Reset Link", $"Generated password reset token link for '{user.FullName}'", user.Id, user.FullName);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                userId = user.Id,
                email = user.Email,
                token,
                resetUrl,
                expiresInHours = 24
            }, "Password setup link generated successfully."));
        }

        /// <summary>
        /// Updates profile information for a user (MemberId is immutable).
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(string id, [FromBody] UpdateUserProfileRequest request)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            user.FirstName = request.FirstName?.Trim();
            user.LastName = request.LastName?.Trim();
            user.Title = request.Title?.Trim();
            if (request.Gender.HasValue) user.Gender = request.Gender.Value;

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                var trimmedPhone = request.PhoneNumber.Trim();
                var phoneExists = await _dbContext.Users.AnyAsync(u => u.PhoneNumber == trimmedPhone && u.Id != id);
                if (phoneExists)
                    return BadRequest(ApiResponse<object>.FailureResponse($"A member with phone number '{trimmedPhone}' is already registered."));

                // If phone number changed, reset phone verification status
                if (user.PhoneNumber != trimmedPhone)
                {
                    user.PhoneNumber = trimmedPhone;
                    user.PhoneNumberConfirmed = false;
                }
            }
            else
            {
                user.PhoneNumber = null;
                user.PhoneNumberConfirmed = false;
            }

            user.Designation = request.Designation?.Trim();
            user.AvatarUrl = request.AvatarUrl;
            if (request.BcpUserCategoryId.HasValue) user.BcpUserCategoryId = request.BcpUserCategoryId;
            // NOTE: MemberId is permanently immutable and cannot be updated once created.

            await _dbContext.SaveChangesAsync();

            // Update role if provided
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                if (await _roleManager.RoleExistsAsync(request.Role))
                {
                    await _userManager.AddToRoleAsync(user, request.Role);
                }
            }

            await LogActivityAsync("Update Profile", $"Updated profile for '{user.FullName}'", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(null, "User profile updated successfully."));
        }

        /// <summary>
        /// Toggles user account status (Active vs Suspended).
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> ToggleUserStatus(string id, [FromBody] UpdateUserStatusRequest request)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var oldStatus = user.UserStatus.ToString();
            user.UserStatus = request.IsActive ? UserStatus.Active : UserStatus.Suspended;
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Status Change", $"Changed account status of '{user.FullName}' from {oldStatus} to {user.UserStatus}", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Account status updated to {user.UserStatus}."));
        }

        /// <summary>
        /// Assigns category tier to a user.
        /// </summary>
        [HttpPut("{id}/category")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> AssignUserCategory(string id, [FromBody] AssignCategoryRequest request)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var category = await _dbContext.BcpUserCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId);
            user.BcpUserCategoryId = request.CategoryId;
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Category Change", $"Assigned '{user.FullName}' to category '{category?.Name ?? "None"}'", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Category assigned successfully."));
        }

        /// <summary>
        /// Retrieves currently authenticated user's own profile.
        /// </summary>
        [HttpGet("profile")]
        [ProducesResponseType(typeof(ApiResponse<UserDto>), 200)]
        public async Task<IActionResult> GetCurrentProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
            var user = await _mediator.Send(new GetUserByIdQuery(userId));
            return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Current profile retrieved."));
        }

        // =========================================================================
        // 2. USER CATEGORIES & TIERS
        // =========================================================================

        /// <summary>
        /// Retrieves all user categories with associated active member counts.
        /// </summary>
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _dbContext.BcpUserCategories
                .AsNoTracking()
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.ColorCode,
                    c.Icon,
                    c.SortOrder,
                    c.IsActive,
                    c.Date,
                    MemberCount = _dbContext.Users.Count(u => u.BcpUserCategoryId == c.Id)
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "User categories retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a specific user category tier by identifier.
        /// </summary>
        [HttpGet("categories/{id:guid}")]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            var category = await _dbContext.BcpUserCategories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
            if (category == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));
            return Ok(ApiResponse<object>.SuccessResponse(category, "Category retrieved successfully."));
        }

        /// <summary>
        /// Creates a new user category tier.
        /// </summary>
        [HttpPost("categories")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateUserCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(ApiResponse<object>.FailureResponse("Category Name is required."));

            var category = new BcpUserCategory
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                ColorCode = !string.IsNullOrWhiteSpace(request.ColorCode) ? request.ColorCode : "#0050e5",
                Icon = !string.IsNullOrWhiteSpace(request.Icon) ? request.Icon : "category",
                SortOrder = request.SortOrder,
                IsActive = request.IsActive ?? true,
                Date = DateTime.UtcNow
            };

            _dbContext.BcpUserCategories.Add(category);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Create Category", $"Created new user category tier '{category.Name}'", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(category, "Category tier created successfully."));
        }

        /// <summary>
        /// Updates an existing category tier.
        /// </summary>
        [HttpPut("categories/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CreateUserCategoryRequest request)
        {
            var existing = await _dbContext.BcpUserCategories.FirstOrDefaultAsync(c => c.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            existing.Name = request.Name?.Trim() ?? existing.Name;
            existing.Description = request.Description?.Trim();
            existing.ColorCode = !string.IsNullOrWhiteSpace(request.ColorCode) ? request.ColorCode : existing.ColorCode;
            existing.Icon = !string.IsNullOrWhiteSpace(request.Icon) ? request.Icon : existing.Icon;
            existing.SortOrder = request.SortOrder;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Category updated successfully."));
        }

        /// <summary>
        /// Deletes a category tier if no active members are assigned.
        /// </summary>
        [HttpDelete("categories/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var existing = await _dbContext.BcpUserCategories.FirstOrDefaultAsync(c => c.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            var memberCount = await _dbContext.Users.CountAsync(u => u.BcpUserCategoryId == id);
            if (memberCount > 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"Cannot delete category '{existing.Name}' because it currently has {memberCount} member(s) assigned. Please reassign them first."));
            }

            _dbContext.BcpUserCategories.Remove(existing);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Delete Category", $"Deleted category tier '{existing.Name}'", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Category deleted successfully."));
        }

        // =========================================================================
        // 3. KPI INDICATORS & PERFORMANCE SCORING
        // =========================================================================

        /// <summary>
        /// Retrieves all KPI Indicator definitions.
        /// </summary>
        [HttpGet("kpi-indicators")]
        public async Task<IActionResult> GetKpiIndicators()
        {
            var indicators = await _dbContext.BcpKpiIndicators
                .AsNoTracking()
                .OrderBy(k => k.SortOrder)
                .ThenBy(k => k.Title)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(indicators, "KPI indicators retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single KPI Indicator definition by identifier.
        /// </summary>
        [HttpGet("kpi-indicators/{id:guid}")]
        public async Task<IActionResult> GetKpiIndicatorById(Guid id)
        {
            var indicator = await _dbContext.BcpKpiIndicators
                .AsNoTracking()
                .FirstOrDefaultAsync(k => k.Id == id);
            if (indicator == null) return NotFound(ApiResponse<object>.FailureResponse("KPI indicator not found."));

            return Ok(ApiResponse<object>.SuccessResponse(indicator, "KPI indicator retrieved."));
        }

        /// <summary>
        /// Defines a new KPI Indicator metric.
        /// </summary>
        [HttpPost("kpi-indicators")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> CreateKpiIndicator([FromBody] CreateKpiIndicatorRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Indicator Title is required."));

            var indicator = new BcpKpiIndicator
            {
                Id = Guid.NewGuid(),
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                MaxScore = request.MaxScore > 0 ? request.MaxScore : 100,
                Weight = request.Weight > 0 ? request.Weight : 1.0m,
                Category = !string.IsNullOrWhiteSpace(request.Category) ? request.Category : "General",
                SortOrder = request.SortOrder,
                IsActive = request.IsActive ?? true,
                Date = DateTime.UtcNow
            };

            _dbContext.BcpKpiIndicators.Add(indicator);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Create KPI Metric", $"Defined new KPI indicator '{indicator.Title}' (Max: {indicator.MaxScore})", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(indicator, "KPI Indicator created successfully."));
        }

        /// <summary>
        /// Updates a KPI Indicator metric.
        /// </summary>
        [HttpPut("kpi-indicators/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> UpdateKpiIndicator(Guid id, [FromBody] CreateKpiIndicatorRequest request)
        {
            var existing = await _dbContext.BcpKpiIndicators.FirstOrDefaultAsync(k => k.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("KPI indicator not found."));

            existing.Title = request.Title?.Trim() ?? existing.Title;
            existing.Description = request.Description?.Trim();
            if (request.MaxScore > 0) existing.MaxScore = request.MaxScore;
            if (request.Weight > 0) existing.Weight = request.Weight;
            if (!string.IsNullOrWhiteSpace(request.Category)) existing.Category = request.Category;
            existing.SortOrder = request.SortOrder;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "KPI Indicator updated successfully."));
        }

        /// <summary>
        /// Deletes a KPI Indicator metric.
        /// </summary>
        [HttpDelete("kpi-indicators/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> DeleteKpiIndicator(Guid id)
        {
            var existing = await _dbContext.BcpKpiIndicators.FirstOrDefaultAsync(k => k.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("KPI indicator not found."));

            // Cascade clean up any attached member performance evaluation score records
            var relatedScores = await _dbContext.BcpKpiUserScores.Where(s => s.BcpKpiIndicatorId == id).ToListAsync();
            if (relatedScores.Count > 0)
            {
                _dbContext.BcpKpiUserScores.RemoveRange(relatedScores);
            }

            _dbContext.BcpKpiIndicators.Remove(existing);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Delete KPI Metric", $"Deleted KPI indicator '{existing.Title}' and detached {relatedScores.Count} score entries", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(null, "KPI Indicator and associated scores deleted successfully."));
        }

        /// <summary>
        /// Retrieves evaluation periods (e.g. 2026 Q3, August 2026).
        /// </summary>
        [HttpGet("kpi-periods")]
        public async Task<IActionResult> GetKpiPeriods()
        {
            var savedPeriods = await _dbContext.BcpKpiPeriods
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var scorePeriods = await _dbContext.BcpKpiUserScores
                .AsNoTracking()
                .Select(s => s.Period)
                .Distinct()
                .ToListAsync();

            var existingTitles = savedPeriods.Select(p => p.Title).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var allPeriods = new List<object>();
            foreach (var p in savedPeriods)
            {
                allPeriods.Add(new { p.Id, p.Title, p.Description, p.IsActive, p.CreatedAt });
            }

            foreach (var sp in scorePeriods)
            {
                if (!string.IsNullOrWhiteSpace(sp) && !existingTitles.Contains(sp))
                {
                    allPeriods.Add(new { Id = Guid.NewGuid(), Title = sp, Description = "Evaluation Cycle", IsActive = true, CreatedAt = DateTime.UtcNow });
                    existingTitles.Add(sp);
                }
            }

            if (allPeriods.Count == 0)
            {
                var currentQ = $"{DateTime.UtcNow.Year} Q{(DateTime.UtcNow.Month - 1) / 3 + 1}";
                allPeriods.Add(new { Id = Guid.NewGuid(), Title = currentQ, Description = "Current Evaluation Cycle", IsActive = true, CreatedAt = DateTime.UtcNow });
            }

            return Ok(ApiResponse<object>.SuccessResponse(allPeriods, "KPI periods retrieved."));
        }

        /// <summary>
        /// Creates an evaluation period.
        /// </summary>
        [HttpPost("kpi-periods")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> CreateKpiPeriod([FromBody] CreateKpiPeriodRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Period Title is required."));

            var trimmedTitle = request.Title.Trim();
            var existing = await _dbContext.BcpKpiPeriods.FirstOrDefaultAsync(p => p.Title.ToLower() == trimmedTitle.ToLower());
            if (existing != null)
            {
                return Ok(ApiResponse<object>.SuccessResponse(existing, "Evaluation period already exists."));
            }

            var period = new BcpKpiPeriod
            {
                Id = Guid.NewGuid(),
                Title = trimmedTitle,
                Description = request.Description?.Trim(),
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.BcpKpiPeriods.Add(period);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Create KPI Period", $"Created evaluation period '{period.Title}'", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(period, "Evaluation period created successfully."));
        }

        /// <summary>
        /// Deletes an evaluation period.
        /// </summary>
        [HttpDelete("kpi-periods/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> DeleteKpiPeriod(Guid id)
        {
            var period = await _dbContext.BcpKpiPeriods.FirstOrDefaultAsync(p => p.Id == id);
            if (period == null) return NotFound(ApiResponse<object>.FailureResponse("Evaluation period not found."));

            // Clean up any scores tied to this period title
            var relatedScores = await _dbContext.BcpKpiUserScores.Where(s => s.Period == period.Title).ToListAsync();
            if (relatedScores.Count > 0)
            {
                _dbContext.BcpKpiUserScores.RemoveRange(relatedScores);
            }

            _dbContext.BcpKpiPeriods.Remove(period);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Delete KPI Period", $"Deleted evaluation period '{period.Title}' and detached {relatedScores.Count} score entries", null, null);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Evaluation period deleted successfully."));
        }

        /// <summary>
        /// Submits batch evaluation scores for multiple indicators on a user.
        /// </summary>
        [HttpPost("kpi-scores/batch")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> SubmitBatchKpiScores([FromBody] BatchScoreSubmissionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ProfileId) || string.IsNullOrWhiteSpace(request.Period))
                return BadRequest(ApiResponse<object>.FailureResponse("ProfileId and Period are required."));

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == request.ProfileId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Admin";

            foreach (var item in request.Scores)
            {
                var existingScore = await _dbContext.BcpKpiUserScores
                    .FirstOrDefaultAsync(s => s.ProfileId == request.ProfileId && s.BcpKpiIndicatorId == item.IndicatorId && s.Period == request.Period);

                if (existingScore != null)
                {
                    existingScore.Score = item.Score;
                    existingScore.Remarks = item.Remarks;
                    existingScore.EvaluatedBy = currentUserId;
                    existingScore.Date = DateTime.UtcNow;
                }
                else
                {
                    _dbContext.BcpKpiUserScores.Add(new BcpKpiUserScore
                    {
                        Id = Guid.NewGuid(),
                        ProfileId = request.ProfileId,
                        BcpKpiIndicatorId = item.IndicatorId,
                        Score = item.Score,
                        Period = request.Period,
                        Remarks = item.Remarks,
                        EvaluatedBy = currentUserId,
                        Date = DateTime.UtcNow
                    });
                }
            }

            await _dbContext.SaveChangesAsync();
            await LogActivityAsync("Submit KPI Score", $"Evaluated KPI performance for '{user.FullName}' in period '{request.Period}'", user.Id, user.FullName);

            return Ok(ApiResponse<object>.SuccessResponse(null, "KPI evaluation scores saved successfully."));
        }

        /// <summary>
        /// Retrieves evaluation score history for a specific user.
        /// </summary>
        [HttpGet("kpi-scores/user/{profileId}")]
        public async Task<IActionResult> GetUserKpiScores(string profileId)
        {
            var scores = await _dbContext.BcpKpiUserScores
                .Include(s => s.BcpKpiIndicator)
                .Where(s => s.ProfileId == profileId)
                .OrderByDescending(s => s.Date)
                .Select(s => new
                {
                    s.Id,
                    s.BcpKpiIndicatorId,
                    IndicatorTitle = s.BcpKpiIndicator != null ? s.BcpKpiIndicator.Title : "Custom KPI",
                    MaxScore = s.BcpKpiIndicator != null ? s.BcpKpiIndicator.MaxScore : 100,
                    Weight = s.BcpKpiIndicator != null ? s.BcpKpiIndicator.Weight : 1.0m,
                    s.Score,
                    s.Period,
                    s.Remarks,
                    s.EvaluatedBy,
                    s.Date
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(scores, "User KPI score history retrieved."));
        }

        /// <summary>
        /// Performance Leaderboard ranking for a period.
        /// </summary>
        [HttpGet("kpi-leaderboard")]
        public async Task<IActionResult> GetKpiLeaderboard([FromQuery] string? period)
        {
            var query = _dbContext.BcpKpiUserScores
                .Include(s => s.Profile)
                .Include(s => s.BcpKpiIndicator)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(period))
            {
                query = query.Where(s => s.Period == period);
            }

            var scores = await query.ToListAsync();

            var leaderboard = scores
                .GroupBy(s => new { s.ProfileId, Name = s.Profile != null ? s.Profile.FullName : "Unknown", Avatar = s.Profile?.AvatarUrl, Cat = s.Profile?.BcpUserCategory?.Name })
                .Select(g => new
                {
                    ProfileId = g.Key.ProfileId,
                    FullName = g.Key.Name,
                    AvatarUrl = g.Key.Avatar,
                    CategoryName = g.Key.Cat ?? "Unassigned",
                    TotalIndicators = g.Count(),
                    AverageScore = Math.Round(g.Average(x => (x.Score / (x.BcpKpiIndicator?.MaxScore > 0 ? x.BcpKpiIndicator.MaxScore : 100)) * 100), 1),
                    Scores = g.Select(x => new { Indicator = x.BcpKpiIndicator?.Title, Score = x.Score, Max = x.BcpKpiIndicator?.MaxScore ?? 100 })
                })
                .OrderByDescending(x => x.AverageScore)
                .ToList();

            return Ok(ApiResponse<object>.SuccessResponse(leaderboard, "Performance leaderboard retrieved."));
        }

        // =========================================================================
        // 4. PRIVATE ADMIN NOTES
        // =========================================================================

        [HttpGet("{id}/notes")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> GetUserNotes(string id)
        {
            var rawNotes = await _dbContext.BcpUserNotes
                .Where(n => n.ProfileId == id)
                .OrderByDescending(n => n.Date)
                .ToListAsync();

            var authorIds = rawNotes.Select(n => n.CreatedBy).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();
            var authorProfiles = await _dbContext.Users
                .Where(u => authorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName);

            var notes = rawNotes.Select(n => new
            {
                n.Id,
                n.ProfileId,
                n.CreatedBy,
                AuthorFullName = !string.IsNullOrEmpty(n.CreatedBy) && authorProfiles.TryGetValue(n.CreatedBy, out var name) && !string.IsNullOrWhiteSpace(name) ? name : "Administrator",
                n.Note,
                n.IsPrivate,
                n.Date
            }).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(notes, "User admin notes retrieved."));
        }

        [HttpPost("{id}/notes")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> AddUserNote(string id, [FromBody] AddNoteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Note))
                return BadRequest(ApiResponse<object>.FailureResponse("Note content cannot be empty."));

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var authorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var author = authorId != null ? await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == authorId) : null;
            var authorName = !string.IsNullOrWhiteSpace(author?.FullName) ? author.FullName : (User.Identity?.Name ?? "Administrator");

            var newNote = new BcpUserNote
            {
                Id = Guid.NewGuid(),
                ProfileId = id,
                CreatedBy = authorId,
                Note = request.Note.Trim(),
                IsPrivate = true,
                Date = DateTime.UtcNow
            };

            _dbContext.BcpUserNotes.Add(newNote);
            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Add Admin Note", $"Added confidential note on member '{user.FullName}'", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                newNote.Id,
                newNote.ProfileId,
                newNote.CreatedBy,
                AuthorFullName = authorName,
                newNote.Note,
                newNote.IsPrivate,
                newNote.Date
            }, "Note added successfully."));
        }

        // =========================================================================
        // 5. AUDIT & ACTIVITY LOGS
        // =========================================================================

        [HttpGet("activity-logs")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> GetActivityLogs([FromQuery] string? search, [FromQuery] string? module, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var query = _dbContext.BcpActivityLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLowerInvariant();
                query = query.Where(a =>
                    (a.Description != null && a.Description.ToLower().Contains(s)) ||
                    (a.ActionType != null && a.ActionType.ToLower().Contains(s)) ||
                    (a.PerformedByFullName != null && a.PerformedByFullName.ToLower().Contains(s)) ||
                    (a.TargetFullName != null && a.TargetFullName.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(module) && module != "All")
            {
                query = query.Where(a => a.Module == module);
            }

            var totalCount = await query.CountAsync();
            var logs = await query
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { totalCount, page, pageSize, logs }, "Activity logs retrieved."));
        }

        // =========================================================================
        // 6. MEMBER ID & CODING CONFIGURATION
        // =========================================================================

        /// <summary>
        /// Retrieves the active Member ID configuration rules and live previews for all 10 formats.
        /// </summary>
        [HttpGet("member-id-config")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> GetMemberIdConfig()
        {
            var setting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new MisConfigurationSetting
                {
                    Id = Guid.NewGuid(),
                    MemberIdFormat = "PrefixYearMonthRandom",
                    MemberIdPrefix = "CC",
                    MemberIdNextNumber = 1,
                    MemberIdPadding = 4,
                    MemberIdDelimiter = "-"
                };
                _dbContext.MisConfigurationSettings.Add(setting);
                await _dbContext.SaveChangesAsync();
            }

            var previews = await _memberIdGenerator.GetFormatPreviewsAsync(setting.MemberIdPrefix, setting.MemberIdNextNumber, setting.MemberIdPadding, setting.MemberIdDelimiter);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                activeFormat = setting.MemberIdFormat ?? "PrefixYearMonthRandom",
                prefix = setting.MemberIdPrefix ?? "CC",
                nextNumber = setting.MemberIdNextNumber > 0 ? setting.MemberIdNextNumber : 1,
                padding = setting.MemberIdPadding > 0 ? setting.MemberIdPadding : 4,
                delimiter = setting.MemberIdDelimiter ?? "-",
                requireConfirmedEmailToLogin = setting.RequireConfirmedEmailToLogin,
                enableUserDeletion = setting.EnableUserDeletion,
                previews
            }, "Member ID configuration retrieved."));
        }

        /// <summary>
        /// Updates the tenant's Member ID generation format rules and login policies.
        /// </summary>
        [HttpPut("member-id-config")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> UpdateMemberIdConfig([FromBody] UpdateMemberIdConfigRequest request)
        {
            var setting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _dbContext.MisConfigurationSettings.Add(setting);
            }

            if (!string.IsNullOrWhiteSpace(request.ActiveFormat))
                setting.MemberIdFormat = request.ActiveFormat.Trim();

            if (!string.IsNullOrWhiteSpace(request.Prefix))
                setting.MemberIdPrefix = request.Prefix.Trim().ToUpperInvariant();

            if (request.NextNumber.HasValue && request.NextNumber.Value > 0)
                setting.MemberIdNextNumber = request.NextNumber.Value;

            if (request.Padding.HasValue && request.Padding.Value > 0)
                setting.MemberIdPadding = request.Padding.Value;

            if (!string.IsNullOrWhiteSpace(request.Delimiter))
                setting.MemberIdDelimiter = request.Delimiter.Trim();

            if (request.RequireConfirmedEmailToLogin.HasValue)
                setting.RequireConfirmedEmailToLogin = request.RequireConfirmedEmailToLogin.Value;

            if (request.EnableUserDeletion.HasValue)
                setting.EnableUserDeletion = request.EnableUserDeletion.Value;

            await _dbContext.SaveChangesAsync();

            await LogActivityAsync("Configure Member ID & Auth Rules", $"Updated Member ID format to '{setting.MemberIdFormat}' (RequireEmailToLogin={setting.RequireConfirmedEmailToLogin}, EnableUserDeletion={setting.EnableUserDeletion})", null, null);

            var previews = await _memberIdGenerator.GetFormatPreviewsAsync(setting.MemberIdPrefix, setting.MemberIdNextNumber, setting.MemberIdPadding, setting.MemberIdDelimiter);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                activeFormat = setting.MemberIdFormat,
                prefix = setting.MemberIdPrefix,
                nextNumber = setting.MemberIdNextNumber,
                padding = setting.MemberIdPadding,
                delimiter = setting.MemberIdDelimiter,
                requireConfirmedEmailToLogin = setting.RequireConfirmedEmailToLogin,
                enableUserDeletion = setting.EnableUserDeletion,
                previews
            }, "Member ID format and verification policies saved successfully."));
        }

        /// <summary>
        /// Generates real-time format previews based on custom transient parameters.
        /// </summary>
        [HttpGet("member-id-config/preview")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> PreviewMemberIdFormats([FromQuery] string? prefix, [FromQuery] int? startNumber, [FromQuery] int? padding, [FromQuery] string? delimiter)
        {
            var previews = await _memberIdGenerator.GetFormatPreviewsAsync(prefix, startNumber, padding, delimiter);
            return Ok(ApiResponse<object>.SuccessResponse(previews, "Member ID format previews generated."));
        }

        // =========================================================================
        // 7. OTP VERIFICATION ENDPOINTS (EMAIL & PHONE)
        // =========================================================================

        /// <summary>
        /// Sends a 6-digit email confirmation OTP to the member.
        /// </summary>
        [HttpPost("{id}/send-email-otp")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Member")]
        public async Task<IActionResult> SendEmailOtp(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("Member account not found."));
            if (string.IsNullOrWhiteSpace(user.Email)) return BadRequest(ApiResponse<object>.FailureResponse("Member does not have a registered email address."));

            var result = await _otpService.SendEmailOtpAsync(user.Id, user.Email);
            if (!result.Success)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(result.Message));
            }

            await LogActivityAsync("Send Email OTP", $"Dispatched email verification OTP to '{user.FullName}' ({user.Email})", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(new { retryAfterSeconds = result.RetryAfterSeconds }, result.Message));
        }

        /// <summary>
        /// Verifies a 6-digit email confirmation OTP.
        /// </summary>
        [HttpPost("{id}/verify-email-otp")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Member")]
        public async Task<IActionResult> VerifyEmailOtp(string id, [FromBody] VerifyOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OtpCode))
                return BadRequest(ApiResponse<object>.FailureResponse("6-digit OTP code is required."));

            var result = await _otpService.VerifyEmailOtpAsync(id, request.OtpCode);
            if (!result.Success)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(result.Message));
            }

            var user = await _userManager.FindByIdAsync(id);
            await LogActivityAsync("Verify Email OTP", $"Verified email address for '{user?.FullName}'", id, user?.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(new { emailConfirmed = true }, result.Message));
        }

        /// <summary>
        /// Sends a 6-digit SMS phone confirmation OTP to the member.
        /// </summary>
        [HttpPost("{id}/send-phone-otp")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Member")]
        public async Task<IActionResult> SendPhoneOtp(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("Member account not found."));
            if (string.IsNullOrWhiteSpace(user.PhoneNumber)) return BadRequest(ApiResponse<object>.FailureResponse("Member does not have a registered phone number."));

            var result = await _otpService.SendPhoneOtpAsync(user.Id, user.PhoneNumber);
            if (!result.Success)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(result.Message));
            }

            await LogActivityAsync("Send Phone OTP", $"Dispatched phone verification OTP via SMS to '{user.FullName}' ({user.PhoneNumber})", user.Id, user.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(new { retryAfterSeconds = result.RetryAfterSeconds }, result.Message));
        }

        /// <summary>
        /// Verifies a 6-digit phone confirmation OTP.
        /// </summary>
        [HttpPost("{id}/verify-phone-otp")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Member")]
        public async Task<IActionResult> VerifyPhoneOtp(string id, [FromBody] VerifyOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OtpCode))
                return BadRequest(ApiResponse<object>.FailureResponse("6-digit OTP code is required."));

            var result = await _otpService.VerifyPhoneOtpAsync(id, request.OtpCode);
            if (!result.Success)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(result.Message));
            }

            var user = await _userManager.FindByIdAsync(id);
            await LogActivityAsync("Verify Phone OTP", $"Verified phone number for '{user?.FullName}'", id, user?.FullName);
            return Ok(ApiResponse<object>.SuccessResponse(new { phoneNumberConfirmed = true }, result.Message));
        }

        /// <summary>
        /// Allows administrator to toggle verification status directly.
        /// </summary>
        [HttpPost("{id}/toggle-verification")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        public async Task<IActionResult> ToggleVerification(string id, [FromBody] ToggleVerificationRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("Member not found."));

            if (request.Target?.ToLowerInvariant() == "phone")
            {
                user.PhoneNumberConfirmed = request.IsVerified;
                await _userManager.UpdateAsync(user);
                await LogActivityAsync("Toggle Verification", $"Admin set phone verified to {request.IsVerified} for '{user.FullName}'", user.Id, user.FullName);
            }
            else
            {
                user.EmailConfirmed = request.IsVerified;
                await _userManager.UpdateAsync(user);
                await LogActivityAsync("Toggle Verification", $"Admin set email verified to {request.IsVerified} for '{user.FullName}'", user.Id, user.FullName);
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { user.EmailConfirmed, user.PhoneNumberConfirmed }, "Verification status updated."));
        }

        private async Task LogActivityAsync(string actionType, string description, string? targetProfileId, string? targetFullName)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserName = User.Identity?.Name ?? "Administrator";
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                _dbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.NewGuid(),
                    ActionType = actionType,
                    Description = description,
                    PerformedByProfileId = currentUserId,
                    PerformedByFullName = currentUserName,
                    TargetProfileId = targetProfileId,
                    TargetFullName = targetFullName,
                    Module = "User Management",
                    IpAddress = ip,
                    Date = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();
            }
            catch
            {
                // Silent fail for non-critical telemetry
            }
        }
    }

    // =========================================================================
    // DTO REQUEST MODELS
    // =========================================================================

    public class UpdateMemberIdConfigRequest
    {
        public string? ActiveFormat { get; set; }
        public string? Prefix { get; set; }
        public int? NextNumber { get; set; }
        public int? Padding { get; set; }
        public string? Delimiter { get; set; }
        public bool? RequireConfirmedEmailToLogin { get; set; }
        public bool? EnableUserDeletion { get; set; }
    }

    public class VerifyOtpRequest
    {
        public string OtpCode { get; set; } = string.Empty;
    }

    public class ToggleVerificationRequest
    {
        public string Target { get; set; } = "email"; // "email" or "phone"
        public bool IsVerified { get; set; }
    }

    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Title { get; set; }
        public GenderStatus? Gender { get; set; }
        public string? PhoneNumber { get; set; }
        public string? MemberId { get; set; }
        public string? Designation { get; set; }
        public string? Role { get; set; } = "Member";
        public Guid? BcpUserCategoryId { get; set; }
        public DateTime? JoinDate { get; set; }
        public bool? MustChangePassword { get; set; } = true;
    }

    public class AdminResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
        public bool? MustChangePassword { get; set; } = true;
        public bool? SendEmailNotification { get; set; } = true;
    }

    public class UpdateUserProfileRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Title { get; set; }
        public GenderStatus? Gender { get; set; }
        public string? PhoneNumber { get; set; }
        public string? MemberId { get; set; }
        public string? Designation { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Role { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
    }

    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    public class AssignCategoryRequest
    {
        public Guid CategoryId { get; set; }
    }

    public class AddNoteRequest
    {
        public string Note { get; set; } = string.Empty;
    }

    public class BatchScoreSubmissionRequest
    {
        public string ProfileId { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public List<KpiScoreItem> Scores { get; set; } = new();
    }

    public class KpiScoreItem
    {
        public Guid IndicatorId { get; set; }
        public decimal Score { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateKpiPeriodRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreateUserCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ColorCode { get; set; }
        public string? Icon { get; set; }
        public int SortOrder { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreateKpiIndicatorRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MaxScore { get; set; } = 100;
        public decimal Weight { get; set; } = 1.0m;
        public string? Category { get; set; } = "General";
        public int SortOrder { get; set; }
        public bool? IsActive { get; set; }
    }
}
