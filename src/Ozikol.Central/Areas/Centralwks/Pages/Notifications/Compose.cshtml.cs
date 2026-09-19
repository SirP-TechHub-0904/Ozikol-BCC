using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Notifications;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Notifications
{
    /// <summary>
    /// Notification Compose & Broadcast Studio model enabling central administrators to draft,
    /// validate deliverability, and dispatch targeted alerts across In-App, OneSignal Push, and Postmark Email.
    /// </summary>
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public class ComposeModel : PageModel
    {
        private readonly ICentralNotificationService _notificationService;
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<ComposeModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ComposeModel"/> class.
        /// </summary>
        /// <param name="notificationService">Central notification engine.</param>
        /// <param name="userManager">Identity user manager.</param>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public ComposeModel(
            ICentralNotificationService notificationService,
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext dbContext,
            ILogger<ComposeModel> logger)
        {
            _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Target audience classification (All, Role, Individual, Creators, Affiliates, TenantAdmins).</summary>
        [BindProperty]
        [Required(ErrorMessage = "Target audience selection is required.")]
        public string TargetAudience { get; set; } = "All";

        /// <summary>Target security role if Role-targeted.</summary>
        [BindProperty]
        public string? TargetRole { get; set; }

        /// <summary>Target operator ID if individual-targeted.</summary>
        [BindProperty]
        public string? RecipientUserId { get; set; }

        /// <summary>Functional category classification.</summary>
        [BindProperty]
        [Required(ErrorMessage = "Please select a category.")]
        public string Category { get; set; } = "System";

        /// <summary>Severity tier (Info, Success, Warning, Danger).</summary>
        [BindProperty]
        [Required(ErrorMessage = "Please select a severity tier.")]
        public string Severity { get; set; } = "Info";

        /// <summary>Material symbol icon name.</summary>
        [BindProperty]
        [Required(ErrorMessage = "Please specify an icon.")]
        public string Icon { get; set; } = "campaign";

        /// <summary>Headline title.</summary>
        [BindProperty]
        [Required(ErrorMessage = "Notification title is required.")]
        [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
        public string Title { get; set; } = string.Empty;

        /// <summary>Detailed message content.</summary>
        [BindProperty]
        [Required(ErrorMessage = "Message content is required.")]
        [MaxLength(2000, ErrorMessage = "Message cannot exceed 2000 characters.")]
        public string Message { get; set; } = string.Empty;

        /// <summary>Deep-link navigation route.</summary>
        [BindProperty]
        [MaxLength(500, ErrorMessage = "Action URL cannot exceed 500 characters.")]
        public string? ActionUrl { get; set; }

        /// <summary>Whether to dispatch via In-App feed.</summary>
        [BindProperty]
        public bool SendInApp { get; set; } = true;

        /// <summary>Whether to dispatch via OneSignal Web & Device Push.</summary>
        [BindProperty]
        public bool SendPush { get; set; } = true;

        /// <summary>Whether to dispatch via Postmark Email.</summary>
        [BindProperty]
        public bool SendEmail { get; set; } = false;

        /// <summary>Available operators for user picker dropdown.</summary>
        public List<SelectListItem> OperatorList { get; set; } = new List<SelectListItem>();

        /// <summary>Deliverability warnings generated during validation.</summary>
        public List<string> SpamWarnings { get; set; } = new List<string>();

        /// <summary>Status message.</summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles GET request initializing the compose studio.
        /// </summary>
        public async Task OnGetAsync()
        {
            await PopulateOperatorsAsync();
        }

        /// <summary>
        /// Handles POST request to validate and dispatch notification broadcast.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            await PopulateOperatorsAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            // Anti-Spam Blacklist & Deliverability Analysis (Mandatory per Rule 6)
            ValidateAntiSpam();

            if (SpamWarnings.Any(w => w.Contains("Critical", StringComparison.OrdinalIgnoreCase)))
            {
                ModelState.AddModelError(string.Empty, "Spam trigger keywords detected. Please revise your message content before broadcasting.");
                return Page();
            }

            var currentUserId = _userManager.GetUserId(User);
            var currentUserName = User.Identity?.Name ?? "Administrator";

            try
            {
                // Resolve recipient target variables based on selected audience mode
                string? resolvedRecipientUserId = null;
                string? resolvedTargetRole = null;

                if (TargetAudience == "Individual")
                {
                    resolvedRecipientUserId = RecipientUserId;
                    if (string.IsNullOrWhiteSpace(resolvedRecipientUserId))
                    {
                        ModelState.AddModelError(nameof(RecipientUserId), "Please select an individual recipient operator.");
                        return Page();
                    }
                }
                else if (TargetAudience == "Role")
                {
                    resolvedTargetRole = TargetRole;
                    if (string.IsNullOrWhiteSpace(resolvedTargetRole))
                    {
                        ModelState.AddModelError(nameof(TargetRole), "Please select a target security role.");
                        return Page();
                    }
                }

                // Dispatch notification through central engine
                var notification = await _notificationService.PublishNotificationAsync(
                    category: Category,
                    title: Title,
                    message: Message,
                    severity: Severity,
                    icon: Icon,
                    actionUrl: ActionUrl,
                    entityId: null,
                    recipientUserId: resolvedRecipientUserId,
                    targetRole: resolvedTargetRole,
                    targetAudience: TargetAudience,
                    sendPush: SendPush,
                    sendEmail: SendEmail,
                    createdByUserId: currentUserId);

                // Record audit log entry
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = currentUserId,
                    UserName = currentUserName,
                    Action = "BroadcastNotification",
                    EntityType = "Notification",
                    EntityId = notification.Id.ToString(),
                    Summary = $"Published '{Title}' [{Category}] to {TargetAudience} via {notification.DispatchedChannels}",
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("📢 [ComposeNotification] Operator '{User}' successfully broadcasted notification '{Title}' ({Audience})",
                    currentUserName, Title, TargetAudience);

                TempData["Success"] = $"Notification broadcast '{Title}' successfully published across selected channels.";
                return RedirectToPage("/Notifications/Index");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [ComposeNotification] Failed to publish notification '{Title}'", Title);
                ModelState.AddModelError(string.Empty, $"Failed to broadcast notification: {ex.Message}");
                return Page();
            }
        }

        private async Task PopulateOperatorsAsync()
        {
            var users = await _userManager.Users
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ThenBy(u => u.UserName)
                .AsNoTracking()
                .ToListAsync();

            OperatorList = users.Select(u => new SelectListItem
            {
                Value = u.Id,
                Text = $"{(string.IsNullOrWhiteSpace(u.FullName) ? u.UserName : u.FullName)} ({u.Email})"
            }).ToList();
        }

        /// <summary>
        /// Validates content against email spam triggers and deliverability filters.
        /// </summary>
        private void ValidateAntiSpam()
        {
            SpamWarnings.Clear();

            // 1. ALL CAPS Title Check
            if (!string.IsNullOrWhiteSpace(Title) && Title.Length > 5 && Title == Title.ToUpperInvariant())
            {
                SpamWarnings.Add("Warning: The notification title is written in ALL CAPS, which triggers aggressive email and push spam filters.");
            }

            // 2. High-Risk Spam Triggers
            var spamKeywords = new[]
            {
                "100% free", "earn money fast", "no risk", "act now", "guaranteed return",
                "click here now", "winner", "risk free", "double your cash", "million dollars",
                "instant cash", "make money now", "free gift"
            };

            var fullText = $"{Title} {Message}".ToLowerInvariant();
            foreach (var kw in spamKeywords)
            {
                if (fullText.Contains(kw))
                {
                    SpamWarnings.Add($"Critical: Found high-risk spam trigger phrase '{kw}'. This will severely damage sender deliverability reputation.");
                }
            }

            // 3. URL Shortener Detection
            var shortenerRegex = new Regex(@"(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly)", RegexOptions.IgnoreCase);
            if (shortenerRegex.IsMatch(fullText) || (!string.IsNullOrWhiteSpace(ActionUrl) && shortenerRegex.IsMatch(ActionUrl)))
            {
                SpamWarnings.Add("Warning: Shortened URL detected. Mailbox providers flag URL shorteners as high-risk phishing indicators.");
            }
        }
    }
}
