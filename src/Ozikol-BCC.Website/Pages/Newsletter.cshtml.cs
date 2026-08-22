using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using System;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages
{
    public class NewsletterModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;

        public NewsletterModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context)
        {
            _context = context;
        }

        [BindProperty]
        public int? FirstNumber { get; set; }

        [BindProperty]
        public int? SecondNumber { get; set; }

        [BindProperty]
        public int? Captcha { get; set; }

        public async Task<IActionResult> OnPostAsync(string email)
        {
            var misSetting = await _context.BcpSettings.FirstOrDefaultAsync();
            string recaptchaResponse = Request.Form["g-recaptcha-response"];
            bool isCaptchaValid = await Ozikol_BCC.Website.Helpers.CaptchaValidator.ValidateCaptchaAsync(misSetting, FirstNumber, SecondNumber, Captcha, recaptchaResponse);
            
            var referer = Request.Headers["Referer"].ToString();
            
            if (!isCaptchaValid)
            {
                TempData["error"] = "Security Check Failed. Please try again.";
                return string.IsNullOrEmpty(referer) ? RedirectToPage("/Index") : Redirect(referer);
            }

            if (!string.IsNullOrEmpty(email))
            {
                var existing = await _context.NewsLetter.FirstOrDefaultAsync(n => n.Email == email);
                if (existing == null)
                {
                    _context.NewsLetter.Add(new NewsLetter
                    {
                        Email = email,
                        Date = DateTime.UtcNow,
                        Active = true
                    });
                    await _context.SaveChangesAsync();
                    TempData["success"] = "You have successfully subscribed!";
                }
                else
                {
                    TempData["success"] = "You are already subscribed!";
                }
            }


            if (string.IsNullOrEmpty(referer))
            {
                return RedirectToPage("/Index");
            }
            return Redirect(referer);
        }
    }
}


