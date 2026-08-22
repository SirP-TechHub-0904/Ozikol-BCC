using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class EditModel : PageModel
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;
        private readonly ICloudinaryService _cloudinary;

        public EditModel(DashboardDbContext db, UserManager<Profile> userManager, ICloudinaryService cloudinary)
        {
            _db = db;
            _userManager = userManager;
            _cloudinary = cloudinary;
        }

        [BindProperty]
        public BcpGroup Group { get; set; } = new();

        [BindProperty]
        public IFormFile? AvatarFile { get; set; }

        [BindProperty]
        public IFormFile? CoverFile { get; set; }

        [BindProperty]
        public List<string> SelectedUserIds { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public string? SearchQuery { get; set; }

        [BindProperty(SupportsGet = true)]
        public int PageIndex { get; set; } = 1;

        public int TotalPages { get; set; }
        public int TotalCandidateUsers { get; set; }

        public List<BcpGroupMember> Members { get; set; } = new();
        public List<CandidateUserViewModel> CandidateUsers { get; set; } = new();

        [TempData]
        public string? StatusMessage { get; set; }

        public class CandidateUserViewModel
        {
            public string UserId { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public bool IsAlreadyMember { get; set; }
        }

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var g = await _db.BcpGroups
                .Include(g => g.Members)
                    .ThenInclude(m => m.UserProfile)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (g == null) return NotFound();

            Group = g;
            Members = g.Members.Where(m => m.MembershipStatus == "Active").ToList();

            var existingMemberUserIds = g.Members.Select(m => m.UserProfileId).ToHashSet();

            // Exclude SuperAdmins and PlatformOwners
            var superAdminUserIds = new HashSet<string>();
            var allUsers = await _db.Users.ToListAsync();
            foreach (var u in allUsers)
            {
                var roles = await _userManager.GetRolesAsync(u);
                if (roles.Contains("SuperAdmin") || roles.Contains("PlatformOwner") || roles.Contains("Administrator"))
                {
                    superAdminUserIds.Add(u.Id);
                }
            }

            // Filter candidate users
            var query = _db.Users
                .Where(u => !superAdminUserIds.Contains(u.Id));

            if (!string.IsNullOrWhiteSpace(SearchQuery))
            {
                var q = SearchQuery.Trim().ToLower();
                query = query.Where(u => u.FirstName.ToLower().Contains(q) 
                                      || u.LastName.ToLower().Contains(q) 
                                      || u.Email!.ToLower().Contains(q));
            }

            TotalCandidateUsers = await query.CountAsync();
            int pageSize = 10;
            TotalPages = (int)Math.Ceiling(TotalCandidateUsers / (double)pageSize);
            if (PageIndex < 1) PageIndex = 1;
            if (PageIndex > TotalPages && TotalPages > 0) PageIndex = TotalPages;

            var pagedUsers = await query
                .OrderBy(u => u.FirstName)
                .Skip((PageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            CandidateUsers = pagedUsers.Select(u => new CandidateUserViewModel
            {
                UserId = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? string.Empty,
                IsAlreadyMember = existingMemberUserIds.Contains(u.Id)
            }).ToList();

            return Page();
        }

        public async Task<IActionResult> OnPostUpdateGroupAsync()
        {
            var dbGroup = await _db.BcpGroups.FindAsync(Group.Id);
            if (dbGroup == null) return NotFound();

            // Resolve Cloudinary folder for uploads
            var uploadFolder = dbGroup.CloudinaryFolder;
            if (string.IsNullOrWhiteSpace(uploadFolder))
            {
                var mgmt = await _db.ManagementSettings.FirstOrDefaultAsync();
                var tenantFolder = string.IsNullOrWhiteSpace(mgmt?.FileFolderName) ? "bcp" : mgmt.FileFolderName;
                var groupSlug = dbGroup.Title.ToLower().Replace(" ", "-").Replace("/", "-");
                uploadFolder = $"{tenantFolder}/groups/{groupSlug}";
            }

            // Upload avatar if a file was provided
            if (AvatarFile != null && AvatarFile.Length > 0)
            {
                var avatarUrl = await _cloudinary.UploadImageAsync(AvatarFile, uploadFolder);
                if (!string.IsNullOrWhiteSpace(avatarUrl))
                    dbGroup.AvatarUrl = avatarUrl;
            }

            // Upload cover if a file was provided
            if (CoverFile != null && CoverFile.Length > 0)
            {
                var coverUrl = await _cloudinary.UploadImageAsync(CoverFile, uploadFolder);
                if (!string.IsNullOrWhiteSpace(coverUrl))
                    dbGroup.CoverImageUrl = coverUrl;
            }

            dbGroup.Title = Group.Title;
            dbGroup.Description = Group.Description;
            dbGroup.GroupType = Group.GroupType;
            dbGroup.Visibility = Group.Visibility;
            dbGroup.ChatMode = Group.ChatMode;
            dbGroup.AllowGuestAccess = Group.AllowGuestAccess;
            dbGroup.MaxMembers = Group.MaxMembers;

            dbGroup.IsAlwaysOpen = Group.IsAlwaysOpen;
            dbGroup.OperationalDays = Group.OperationalDays;
            dbGroup.OpenTime = Group.OpenTime;
            dbGroup.CloseTime = Group.CloseTime;
            dbGroup.ClosedMessage = Group.ClosedMessage;

            dbGroup.EditWindowMinutes = Group.EditWindowMinutes;
            dbGroup.DeleteWindowMinutes = Group.DeleteWindowMinutes;
            dbGroup.AutoConvertThreshold = Group.AutoConvertThreshold;
            dbGroup.RateLimitPerMinute = Group.RateLimitPerMinute;

            dbGroup.ReadReceiptsEnabled = Group.ReadReceiptsEnabled;
            dbGroup.TypingIndicatorsEnabled = Group.TypingIndicatorsEnabled;
            dbGroup.LastSeenEnabled = Group.LastSeenEnabled;

            await _db.SaveChangesAsync();
            StatusMessage = "Group settings updated successfully.";
            return RedirectToPage(new { id = Group.Id });
        }

        public async Task<IActionResult> OnPostAddSelectedMembersAsync()
        {
            var dbGroup = await _db.BcpGroups.FindAsync(Group.Id);
            if (dbGroup == null) return NotFound();

            if (SelectedUserIds == null || !SelectedUserIds.Any())
            {
                StatusMessage = "Warning: No users were selected to add.";
                return RedirectToPage(new { id = Group.Id });
            }

            var existingMemberUserIds = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == Group.Id)
                .Select(m => m.UserProfileId)
                .ToListAsync();

            int addedCount = 0;
            foreach (var uid in SelectedUserIds)
            {
                if (!existingMemberUserIds.Contains(uid))
                {
                    _db.BcpGroupMembers.Add(new BcpGroupMember
                    {
                        BcpGroupId = Group.Id,
                        UserProfileId = uid,
                        GroupRole = BcpGroupRole.Member,
                        MembershipStatus = "Active",
                        DateJoined = DateTime.UtcNow
                    });
                    addedCount++;
                }
            }

            if (addedCount > 0)
            {
                await _db.SaveChangesAsync();
                StatusMessage = $"Successfully added {addedCount} member(s) to '{dbGroup.Title}'.";
            }
            else
            {
                StatusMessage = "Selected users are already members of this group.";
            }

            return RedirectToPage(new { id = Group.Id });
        }
    }
}
