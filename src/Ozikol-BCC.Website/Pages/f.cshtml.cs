using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages
{
    public class fModel : PageModel
    {
        private readonly DashboardDbContext _context;
        private readonly UserManager<Profile> _userManager;

        public fModel(DashboardDbContext context, UserManager<Profile> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public BcpForm Form { get; set; }

        public async Task<IActionResult> OnGetAsync(string code)
        {
            if (string.IsNullOrEmpty(code)) return NotFound();

            Form = await _context.BcpForms.FirstOrDefaultAsync(f => f.ShortCode == code);

            if (Form == null) return NotFound();
            if (!Form.IsPublished) return NotFound("This form is no longer available.");

            if (Form.RequireLogin && !User.Identity.IsAuthenticated)
            {
                return RedirectToPage("/Account/Login", new { area = "Identity", returnUrl = $"/f/{code}" });
            }

            if (User.Identity.IsAuthenticated && !Form.AllowMultipleSubmissions)
            {
                var userId = _userManager.GetUserId(User);
                bool hasSubmitted = await _context.BcpFormResponses.AnyAsync(r => r.BcpFormId == Form.Id && r.UserProfileId == userId);
                if (hasSubmitted)
                {
                    TempData["ErrorMessage"] = "You have already submitted a response for this form. Multiple submissions are not allowed.";
                    return RedirectToPage("/Index");
                }
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync(string code)
        {
            if (string.IsNullOrEmpty(code)) return NotFound();
            var form = await _context.BcpForms.FirstOrDefaultAsync(f => f.ShortCode == code);
            
            if (form == null || !form.IsPublished) return NotFound();

            if (form.RequireLogin && !User.Identity.IsAuthenticated)
            {
                return RedirectToPage("/Account/Login", new { area = "Identity", returnUrl = $"/f/{code}" });
            }

            if (User.Identity.IsAuthenticated && !form.AllowMultipleSubmissions)
            {
                var currentUserId = _userManager.GetUserId(User);
                bool hasSubmitted = await _context.BcpFormResponses.AnyAsync(r => r.BcpFormId == form.Id && r.UserProfileId == currentUserId);
                if (hasSubmitted)
                {
                    return BadRequest("You have already submitted this form.");
                }
            }

            // Capture raw JSON payload
            using var reader = new StreamReader(Request.Body);
            var responsesJson = await reader.ReadToEndAsync();

            // Validate Captcha from JSON
            var misSetting = await _context.BcpSettings.FirstOrDefaultAsync();
            if (misSetting != null && misSetting.ActiveCaptcha != Domain.Enum.Enum.CaptchaType.None)
            {
                int? firstNumber = null;
                int? secondNumber = null;
                int? captcha = null;
                string recaptchaResponse = null;

                try
                {
                    using (var doc = System.Text.Json.JsonDocument.Parse(responsesJson))
                    {
                        var root = doc.RootElement;
                        if (root.TryGetProperty("FirstNumber", out var fn)) firstNumber = int.Parse(fn.GetString() ?? "0");
                        if (root.TryGetProperty("SecondNumber", out var sn)) secondNumber = int.Parse(sn.GetString() ?? "0");
                        if (root.TryGetProperty("Captcha", out var c)) captcha = int.Parse(c.GetString() ?? "0");
                        if (root.TryGetProperty("g-recaptcha-response", out var rr)) recaptchaResponse = rr.GetString();
                    }
                }
                catch { }

                bool isCaptchaValid = await Ozikol_BCC.Website.Helpers.CaptchaValidator.ValidateCaptchaAsync(misSetting, firstNumber, secondNumber, captcha, recaptchaResponse);
                if (!isCaptchaValid)
                {
                    return BadRequest("Security Check Failed. Please try again.");
                }
            }

            string userId = null;
            if (User.Identity.IsAuthenticated)
            {
                userId = _userManager.GetUserId(User);
            }

            var response = new BcpFormResponse
            {
                BcpFormId = form.Id,
                UserProfileId = userId,
                ResponsesJson = responsesJson,
                SubmittedAt = DateTime.UtcNow
            };

            _context.BcpFormResponses.Add(response);
            await _context.SaveChangesAsync();

            return new JsonResult(new { success = true, redirectUrl = "/fSuccess" });
        }
    }
}

