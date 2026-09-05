using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// View model representing an organization workspace found during email or key lookup.
    /// </summary>
    public class WorkspaceCardDto
    {
        /// <summary>
        /// Display name of the organization.
        /// </summary>
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>
        /// Unique sovereign workspace key or subdomain slug.
        /// </summary>
        public string WorkspaceKey { get; set; } = string.Empty;

        /// <summary>
        /// Dedicated platform domain for the workspace.
        /// </summary>
        public string PrimaryDomain { get; set; } = string.Empty;

        /// <summary>
        /// Direct portal launch and login URL.
        /// </summary>
        public string DirectUrl { get; set; } = string.Empty;

        /// <summary>
        /// Masked administrator contact email for confirmation.
        /// </summary>
        public string? AdminEmail { get; set; }
    }

    /// <summary>
    /// PageModel managing organization workspace discovery, smart email resolution, and platform operator authentication.
    /// </summary>
    public class LoginModel : PageModel
    {
        private readonly ITenantOnboardingService _onboardingService;
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<LoginModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LoginModel"/> class.
        /// </summary>
        /// <param name="onboardingService">Workspace onboarding and lookup service.</param>
        /// <param name="signInManager">Central operator sign-in manager.</param>
        /// <param name="userManager">Central operator user manager.</param>
        /// <param name="logger">Logging facility.</param>
        public LoginModel(
            ITenantOnboardingService onboardingService,
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            ILogger<LoginModel> logger)
        {
            _onboardingService = onboardingService;
            _signInManager = signInManager;
            _userManager = userManager;
            _logger = logger;
        }

        /// <summary>
        /// Organization workspace address or work email entered by the user.
        /// </summary>
        [BindProperty]
        public string? WorkspaceQuery { get; set; }

        /// <summary>
        /// Email address for Central platform operator sign-in.
        /// </summary>
        [BindProperty]
        [EmailAddress(ErrorMessage = "Please enter a valid operator email address.")]
        public string? OperatorEmail { get; set; }

        /// <summary>
        /// Password for Central platform operator sign-in.
        /// </summary>
        [BindProperty]
        [DataType(DataType.Password)]
        public string? OperatorPassword { get; set; }

        /// <summary>
        /// Indicates whether operator credentials should persist across browser sessions.
        /// </summary>
        [BindProperty]
        public bool RememberMe { get; set; }

        /// <summary>
        /// Active UI tab: "workspace" for organization discovery, "operator" for platform operators.
        /// </summary>
        [BindProperty]
        public string ActiveTab { get; set; } = "workspace";

        /// <summary>
        /// User-facing alert message if lookup or authentication encounters an issue.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Confirmation message upon successful operation.
        /// </summary>
        public string? SuccessMessage { get; set; }

        /// <summary>
        /// List of matching sovereign workspaces found when searching by email address.
        /// </summary>
        public List<WorkspaceCardDto> FoundWorkspaces { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to render the sign-in and workspace discovery portal.
        /// </summary>
        /// <param name="tab">Optional active tab selection ("workspace" or "operator").</param>
        /// <param name="query">Optional pre-filled workspace search term or email.</param>
        /// <param name="error">Optional error notification query.</param>
        public async Task OnGetAsync(string? tab = null, string? query = null, string? error = null)
        {
            if (!string.IsNullOrWhiteSpace(tab) && tab.Equals("operator", StringComparison.OrdinalIgnoreCase))
            {
                ActiveTab = "operator";
            }

            if (!string.IsNullOrWhiteSpace(error))
            {
                ErrorMessage = error;
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                WorkspaceQuery = query.Trim();
                await ExecuteWorkspaceLookupAsync(WorkspaceQuery);
            }
        }

        /// <summary>
        /// Handles workspace discovery requests by sovereign key, subdomain, or administrator email.
        /// </summary>
        /// <returns>Redirection to dedicated workspace login, or page displaying matching workspaces.</returns>
        public async Task<IActionResult> OnPostFindWorkspaceAsync()
        {
            ActiveTab = "workspace";

            if (string.IsNullOrWhiteSpace(WorkspaceQuery))
            {
                ErrorMessage = "Please enter your workspace address or work email.";
                return Page();
            }

            return await ExecuteWorkspaceLookupAsync(WorkspaceQuery.Trim());
        }

        /// <summary>
        /// Handles authentication for authorized Central platform operators and system administrators.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL after successful authentication.</param>
        /// <returns>Redirection to central platform operations or redisplayed form on failure.</returns>
        public async Task<IActionResult> OnPostOperatorLoginAsync(string? returnUrl = null)
        {
            ActiveTab = "operator";

            if (string.IsNullOrWhiteSpace(OperatorEmail) || string.IsNullOrWhiteSpace(OperatorPassword))
            {
                ErrorMessage = "Please enter both your operator email and password.";
                return Page();
            }

            var cleanEmail = OperatorEmail.Trim().ToLowerInvariant();
            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Operator login rejected: Account '{Email}' not found or inactive.", cleanEmail);
                ErrorMessage = "Invalid operator credentials or inactive account.";
                return Page();
            }

            var result = await _signInManager.PasswordSignInAsync(user, OperatorPassword, RememberMe, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                _logger.LogInformation("Central platform operator '{Email}' signed in successfully.", cleanEmail);
                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }
                return RedirectToPage("/Index");
            }

            if (result.IsLockedOut)
            {
                ErrorMessage = "This operator account is temporarily locked out. Please try again later or contact platform security.";
                return Page();
            }

            ErrorMessage = "Invalid password for this operator account.";
            return Page();
        }

        /// <summary>
        /// AJAX handler to check and resolve workspaces in real time.
        /// </summary>
        /// <param name="query">The workspace slug or email to check.</param>
        /// <returns>JSON object with lookup results and target launch URL.</returns>
        public async Task<IActionResult> OnGetLookupAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new JsonResult(new { found = false, message = "Please enter an address or email." });
            }

            var cleanQuery = query.Trim();

            if (cleanQuery.Contains("@"))
            {
                var emailMatches = await _onboardingService.FindWorkspacesByEmailAsync(cleanQuery);
                if (emailMatches.Count > 0)
                {
                    var first = emailMatches[0];
                    string url = $"http://{first.PrimaryDomain}/auth/login";
                    return new JsonResult(new
                    {
                        found = true,
                        count = emailMatches.Count,
                        primaryUrl = url,
                        workspaces = emailMatches.Select(w => new
                        {
                            orgName = w.OrganizationName,
                            key = w.TenantKey,
                            url = $"http://{w.PrimaryDomain}/auth/login"
                        })
                    });
                }

                return new JsonResult(new { found = false, message = $"No active workspace found for {cleanQuery}." });
            }

            var match = await _onboardingService.FindWorkspaceByKeyAsync(cleanQuery);
            if (match != null)
            {
                string url = $"http://{match.PrimaryDomain}/auth/login";
                return new JsonResult(new
                {
                    found = true,
                    count = 1,
                    primaryUrl = url,
                    orgName = match.OrganizationName,
                    key = match.TenantKey
                });
            }

            return new JsonResult(new { found = false, message = $"No workspace named '{cleanQuery}' was found." });
        }

        private async Task<IActionResult> ExecuteWorkspaceLookupAsync(string query)
        {
            if (query.Contains("@"))
            {
                // Lookup by corporate work email
                var matches = await _onboardingService.FindWorkspacesByEmailAsync(query);

                if (matches.Count == 0)
                {
                    ErrorMessage = $"We couldn't find an active workspace associated with '{query}'. Would you like to create one?";
                    return Page();
                }

                if (matches.Count == 1)
                {
                    var single = matches[0];
                    string targetUrl = $"http://{single.PrimaryDomain}/auth/login";
                    _logger.LogInformation("Directing user to workspace [{WorkspaceKey}] at {TargetUrl}", single.TenantKey, targetUrl);
                    return Redirect(targetUrl);
                }

                // Multiple workspaces found: render interactive selection list
                FoundWorkspaces = matches.Select(m => new WorkspaceCardDto
                {
                    OrganizationName = m.OrganizationName,
                    WorkspaceKey = m.TenantKey,
                    PrimaryDomain = m.PrimaryDomain,
                    DirectUrl = $"http://{m.PrimaryDomain}/auth/login",
                    AdminEmail = MaskEmail(m.AdminEmail)
                }).ToList();

                SuccessMessage = $"Found {FoundWorkspaces.Count} sovereign workspaces for your email:";
                return Page();
            }
            else
            {
                // Lookup by workspace slug / domain
                var match = await _onboardingService.FindWorkspaceByKeyAsync(query);

                if (match != null)
                {
                    string targetUrl = $"http://{match.PrimaryDomain}/auth/login";
                    _logger.LogInformation("Directing user to sovereign workspace [{WorkspaceKey}] at {TargetUrl}", match.TenantKey, targetUrl);
                    return Redirect(targetUrl);
                }

                ErrorMessage = $"We couldn't find a workspace for '{query}'. Please verify the workspace name or enter your corporate email.";
                return Page();
            }
        }

        private static string? MaskEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email) || !email.Contains("@")) return email;
            var parts = email.Split('@');
            var name = parts[0];
            var domain = parts[1];

            if (name.Length <= 2) return $"{name[0]}*@{domain}";
            return $"{name.Substring(0, 2)}***@{domain}";
        }
    }
}
