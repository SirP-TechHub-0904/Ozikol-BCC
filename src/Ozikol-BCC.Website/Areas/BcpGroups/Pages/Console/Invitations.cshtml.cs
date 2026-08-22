using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class InvitationsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public InvitationsModel(DashboardDbContext db)
        {
            _db = db;
        }

        [BindProperty(SupportsGet = true)]
        public string? Filter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        [TempData]
        public string? StatusMessage { get; set; }

        public List<BcpGroupInvitation> Invitations { get; set; } = new();
        public int TotalPending { get; set; }
        public int TotalAccepted { get; set; }
        public int TotalDeclined { get; set; }

        public async Task OnGetAsync()
        {
            var query = _db.BcpGroupInvitations
                .Include(i => i.Group)
                .Include(i => i.InvitedUser)
                .Include(i => i.InvitedByUser)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Filter))
            {
                query = query.Where(i => i.Status == Filter);
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var q = Search.Trim().ToLower();
                query = query.Where(i =>
                    i.Group!.Title.ToLower().Contains(q) ||
                    i.InvitedUser!.FirstName.ToLower().Contains(q) ||
                    i.InvitedUser.LastName.ToLower().Contains(q) ||
                    i.InvitedUser.Email!.ToLower().Contains(q));
            }

            TotalPending = await _db.BcpGroupInvitations.CountAsync(i => i.Status == "Pending");
            TotalAccepted = await _db.BcpGroupInvitations.CountAsync(i => i.Status == "Accepted");
            TotalDeclined = await _db.BcpGroupInvitations.CountAsync(i => i.Status == "Declined");

            Invitations = await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(100)
                .ToListAsync();
        }

        public async Task<IActionResult> OnPostRevokeAsync(Guid id)
        {
            var inv = await _db.BcpGroupInvitations.FindAsync(id);
            if (inv != null)
            {
                _db.BcpGroupInvitations.Remove(inv);
                await _db.SaveChangesAsync();
                StatusMessage = "Invitation revoked successfully.";
            }
            return RedirectToPage();
        }
    }
}
