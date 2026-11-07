using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.AiKeys
{
    /// <summary>
    /// PageModel for managing AI Provider API Keys, pool telemetry, and live connection testing.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly IAiKeyPoolManagerService _keyPoolService;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        public IndexModel(
            MasterCatalogDbContext dbContext,
            IAiKeyPoolManagerService keyPoolService,
            ILogger<IndexModel> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _keyPoolService = keyPoolService ?? throw new ArgumentNullException(nameof(keyPoolService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the aggregated key pool summary.
        /// </summary>
        public AiKeyPoolSummaryDto Summary { get; set; } = new();

        /// <summary>
        /// Gets or sets the binding model for adding a new API key.
        /// </summary>
        [BindProperty]
        public AddKeyInputModel Input { get; set; } = new();

        /// <summary>
        /// Gets or sets the list of recent usage logs for telemetry review.
        /// </summary>
        public List<MasterAiApiKeyUsageLog> RecentLogs { get; set; } = new();

        /// <summary>
        /// Feedback status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Feedback status message type (success, danger, warning).
        /// </summary>
        [TempData]
        public string? StatusMessageType { get; set; }

        /// <summary>
        /// Handles GET requests to display the AI Key Hub dashboard.
        /// </summary>
        public async Task OnGetAsync()
        {
            await LoadDataAsync();
        }

        /// <summary>
        /// Handles POST requests to add a new API key to the active rotation pool.
        /// </summary>
        public async Task<IActionResult> OnPostAddKeyAsync()
        {
            if (!ModelState.IsValid)
            {
                await LoadDataAsync();
                StatusMessage = "Please correct the errors in the form.";
                StatusMessageType = "danger";
                return Page();
            }

            var cleanKey = Input.ApiKey.Trim().Trim('"', '\'', '`').Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();

            // Check duplicate key
            // In-memory decrypted duplicate key verification (AES-256-GCM ciphertexts have randomized nonces)
            var allExistingKeys = await _dbContext.MasterAiApiKeys.AsNoTracking().ToListAsync();
            var existingKey = allExistingKeys.FirstOrDefault(k => string.Equals(k.ApiKey?.Trim(), cleanKey, StringComparison.Ordinal));
            if (existingKey != null)
            {
                StatusMessage = $"Duplicate Key Blocked: This API key is already active in the pool as '{existingKey.KeyAlias}'.";
                StatusMessageType = "danger";
                await LoadDataAsync();
                return Page();
            }

            var cleanAlias = string.IsNullOrWhiteSpace(Input.KeyAlias) 
                ? $"{Input.Provider} Key #{Summary.TotalKeys + 1}" 
                : Input.KeyAlias.Trim();

            var aliasExists = await _dbContext.MasterAiApiKeys.AnyAsync(k => k.KeyAlias == cleanAlias);
            if (aliasExists)
            {
                cleanAlias = $"{cleanAlias} ({Guid.NewGuid().ToString().Substring(0, 4)})";
            }

            var newKey = new MasterAiApiKey
            {
                Provider = Input.Provider,
                KeyAlias = cleanAlias,
                ApiKey = cleanKey,
                DailyQuotaLimit = Input.DailyQuotaLimit > 0 ? Input.DailyQuotaLimit : 1500,
                IsActive = true,
                Status = "Active",
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterAiApiKeys.Add(newKey);
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"API Key '{newKey.KeyAlias}' ({newKey.Provider}) successfully registered and added to the pool.";
            StatusMessageType = "success";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles POST requests to toggle the active status of a key.
        /// </summary>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var key = await _dbContext.MasterAiApiKeys.FindAsync(id);
            if (key != null)
            {
                key.IsActive = !key.IsActive;
                key.Status = key.IsActive ? "Active" : "Disabled";
                key.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Key '{key.KeyAlias}' status updated to {(key.IsActive ? "Active" : "Disabled")}.";
                StatusMessageType = "success";
            }
            return RedirectToPage();
        }

        /// <summary>
        /// Handles POST requests to delete a key from the pool.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteKeyAsync(Guid id)
        {
            var key = await _dbContext.MasterAiApiKeys.FindAsync(id);
            if (key != null)
            {
                _dbContext.MasterAiApiKeys.Remove(key);
                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Key '{key.KeyAlias}' was deleted from the pool.";
                StatusMessageType = "info";
            }
            return RedirectToPage();
        }

        /// <summary>
        /// AJAX handler to test key connection before saving with duplicate detection.
        /// </summary>
        public async Task<IActionResult> OnPostTestConnectionAsync([FromBody] TestConnectionRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.ApiKey))
            {
                return new JsonResult(new { success = false, message = "API Key cannot be empty." });
            }

            var cleanKey = req.ApiKey.Trim().Trim('"', '\'', '`').Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();

            // Immediate proactive duplicate key check
            // Immediate in-memory decrypted duplicate key check
            var allExistingKeys = await _dbContext.MasterAiApiKeys.AsNoTracking().ToListAsync();
            var existingKey = allExistingKeys.FirstOrDefault(k => string.Equals(k.ApiKey?.Trim(), cleanKey, StringComparison.Ordinal));

            if (existingKey != null)
            {
                return new JsonResult(new
                {
                    success = false,
                    isDuplicate = true,
                    message = $"Duplicate Key: This API key is already registered in the pool as '{existingKey.KeyAlias}' ({existingKey.Provider})."
                });
            }

            var result = await _keyPoolService.TestKeyConnectionAsync(req.Provider ?? "Gemini", cleanKey);
            return new JsonResult(new
            {
                success = result.Success,
                latencyMs = result.LatencyMs,
                message = result.Success ? $"Authentication verified successfully in {result.LatencyMs}ms!" : result.ErrorMessage
            });
        }

        private async Task LoadDataAsync()
        {
            Summary = await _keyPoolService.GetPoolSummaryAsync();
            RecentLogs = await _dbContext.MasterAiApiKeyUsageLogs
                .Include(l => l.MasterAiApiKey)
                .OrderByDescending(l => l.RequestTimestampUtc)
                .Take(50)
                .ToListAsync();
        }

        /// <summary>
        /// Input model for adding an AI API key.
        /// </summary>
        public class AddKeyInputModel
        {
            [Required]
            [MaxLength(50)]
            public string Provider { get; set; } = "Gemini";

            [MaxLength(100)]
            public string? KeyAlias { get; set; }

            [Required]
            [MaxLength(500)]
            public string ApiKey { get; set; } = string.Empty;

            [Range(1, 100000)]
            public int DailyQuotaLimit { get; set; } = 1500;
        }

        /// <summary>
        /// Request model for testing an API key.
        /// </summary>
        public class TestConnectionRequest
        {
            public string? Provider { get; set; }
            public string? ApiKey { get; set; }
        }
    }
}
