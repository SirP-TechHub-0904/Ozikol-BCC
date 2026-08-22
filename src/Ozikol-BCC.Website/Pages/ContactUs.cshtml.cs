using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace Ozikol_BCC.Website.Pages
{
    public class ContactUsModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public ContactUsModel(DashboardDbContext context)
        {
            _context = context;
        }

        [BindProperty]
        public ContactUs ContactUs { get; set; }

        public ManagementSetting ManagementSetting { get; set; }

        [TempData]
        public string StatusMessage { get; set; }

        public async Task<IActionResult> OnGetAsync()
        {
            ManagementSetting = await _context.ManagementSettings.FirstOrDefaultAsync();
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            ManagementSetting = await _context.ManagementSettings.FirstOrDefaultAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            ContactUs.Date = DateTime.UtcNow.AddHours(1);
            
            _context.ContactUs.Add(ContactUs);
            await _context.SaveChangesAsync();

            StatusMessage = "Thank you! Your message has been sent successfully.";

            return RedirectToPage("/ContactUs");
        }
    }
}
