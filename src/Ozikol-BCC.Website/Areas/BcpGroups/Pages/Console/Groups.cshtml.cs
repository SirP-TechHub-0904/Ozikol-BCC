using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class GroupsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public GroupsModel(DashboardDbContext db)
        {
            _db = db;
        }

        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Filter { get; set; } // all, active, archived, public, private

        public List<GroupListItemDto> Groups { get; set; } = new();

        public async Task OnGetAsync()
        {
            var query = _db.BcpGroups.AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                query = query.Where(g => g.Title.Contains(Search) || (g.Description != null && g.Description.Contains(Search)));
            }

            if (!string.IsNullOrWhiteSpace(Filter))
            {
                switch (Filter.ToLower())
                {
                    case "active":
                        query = query.Where(g => g.IsActive && !g.IsArchived);
                        break;
                    case "archived":
                        query = query.Where(g => g.IsArchived);
                        break;
                    case "public":
                        query = query.Where(g => g.Visibility == Domain.Enum.Enum.BcpGroupVisibility.Public);
                        break;
                    case "private":
                        query = query.Where(g => g.Visibility == Domain.Enum.Enum.BcpGroupVisibility.Private);
                        break;
                }
            }

            Groups = await query
                .OrderByDescending(g => g.CreatedAt)
                .Select(g => new GroupListItemDto
                {
                    Id = g.Id,
                    Title = g.Title,
                    Description = g.Description,
                    GroupType = g.GroupType.ToString(),
                    Visibility = g.Visibility.ToString(),
                    ChatMode = g.ChatMode.ToString(),
                    AvatarUrl = g.AvatarUrl,
                    IsActive = g.IsActive,
                    IsArchived = g.IsArchived,
                    AllowGuestAccess = g.AllowGuestAccess,
                    CreatedAt = g.CreatedAt,
                    MemberCount = g.Members.Count(m => m.MembershipStatus == "Active"),
                    MessageCount = g.Posts.Count(p => !p.IsDeleted)
                })
                .ToListAsync();
        }

        public async Task<IActionResult> OnPostArchiveAsync(Guid id)
        {
            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();

            group.IsArchived = !group.IsArchived;
            await _db.SaveChangesAsync();

            return RedirectToPage();
        }

        public class GroupListItemDto
        {
            public Guid Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string GroupType { get; set; } = string.Empty;
            public string Visibility { get; set; } = string.Empty;
            public string ChatMode { get; set; } = string.Empty;
            public string? AvatarUrl { get; set; }
            public bool IsActive { get; set; }
            public bool IsArchived { get; set; }
            public bool AllowGuestAccess { get; set; }
            public System.DateTime CreatedAt { get; set; }
            public int MemberCount { get; set; }
            public int MessageCount { get; set; }
        }
    }
}
