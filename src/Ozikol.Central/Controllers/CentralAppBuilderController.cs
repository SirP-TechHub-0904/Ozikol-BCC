using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Controllers
{
    /// <summary>
    /// API controller receiving asynchronous completion and progress webhooks from GitHub Actions cloud runners
    /// for Windows Workstation (.exe) and Android Mobile (.apk, .aab) compilation jobs.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CentralAppBuilderController : ControllerBase
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CentralAppBuilderController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CentralAppBuilderController"/> class.
        /// </summary>
        public CentralAppBuilderController(
            MasterCatalogDbContext dbContext,
            IConfiguration configuration,
            ILogger<CentralAppBuilderController> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Webhook callback endpoint invoked by the GitHub Actions build runner upon finishing an artifact compilation.
        /// </summary>
        /// <param name="payload">The build completion payload including checksum, file size, and status.</param>
        /// <returns>HTTP response indicating update status.</returns>
        [HttpPost("callback")]
        public async Task<IActionResult> Callback([FromBody] AppBuilderCallbackPayload payload)
        {
            // Verify optional shared secret if configured
            var expectedSecret = _configuration["AppBuilder:CallbackSecret"] ?? "OziBcc_AppBuilder_Secret_2026";
            if (Request.Headers.TryGetValue("X-AppBuilder-Secret", out var headerSecret) && headerSecret != expectedSecret)
            {
                _logger.LogWarning("Unauthorized App Builder callback attempt with invalid secret header.");
                return Unauthorized("Invalid App Builder secret.");
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.BuildId))
            {
                return BadRequest("BuildId is required.");
            }

            if (!Guid.TryParse(payload.BuildId, out var buildGuid))
            {
                return BadRequest("Invalid BuildId format.");
            }

            var record = await _dbContext.MasterTenantAppBuilds.FirstOrDefaultAsync(b => b.Id == buildGuid);
            if (record == null)
            {
                return NotFound($"Build record {buildGuid} not found.");
            }

            record.Status = payload.Status ?? "Succeeded";
            if (payload.FileSizeBytes > 0) record.FileSizeBytes = payload.FileSizeBytes;
            if (!string.IsNullOrWhiteSpace(payload.Sha256Checksum)) record.Sha256Checksum = payload.Sha256Checksum;
            if (payload.GitHubRunId.HasValue && payload.GitHubRunId.Value > 0) record.GitHubRunId = payload.GitHubRunId;
            if (!string.IsNullOrWhiteSpace(payload.GitHubRunUrl)) record.GitHubRunUrl = payload.GitHubRunUrl;
            if (!string.IsNullOrWhiteSpace(payload.ErrorMessage)) record.ErrorMessage = payload.ErrorMessage;

            // Resolve download URL
            if (!string.IsNullOrWhiteSpace(payload.DownloadUrl))
            {
                record.DownloadUrl = payload.DownloadUrl;
            }
            else if (!string.IsNullOrWhiteSpace(payload.FileName))
            {
                var settings = await _dbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);
                var baseUrl = settings?.AppBuilderDownloadBaseUrl ?? "/downloads/builds";
                record.DownloadUrl = $"{baseUrl.TrimEnd('/')}/{record.TenantKey}/{payload.FileName}";
            }

            record.CompletedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Successfully updated App Builder job {BuildId} to status {Status}", record.Id, record.Status);

            return Ok(new { success = true, buildId = record.Id, status = record.Status });
        }
    }

    /// <summary>
    /// Webhook payload model delivered by the GitHub Actions cloud build runner.
    /// </summary>
    public class AppBuilderCallbackPayload
    {
        /// <summary>Unique build job GUID identifier.</summary>
        public string BuildId { get; set; } = string.Empty;

        /// <summary>Compiled target platform (WindowsExe, AndroidApk, AndroidAab).</summary>
        public string? Platform { get; set; }

        /// <summary>Build outcome status (Succeeded, Failed).</summary>
        public string? Status { get; set; }

        /// <summary>Physical artifact filename (e.g. CocaCola-Workstation-Setup.zip).</summary>
        public string? FileName { get; set; }

        /// <summary>Total artifact size in bytes.</summary>
        public long FileSizeBytes { get; set; }

        /// <summary>Cryptographic SHA-256 checksum.</summary>
        public string? Sha256Checksum { get; set; }

        /// <summary>Direct public download URL.</summary>
        public string? DownloadUrl { get; set; }

        /// <summary>GitHub Actions workflow run ID.</summary>
        public long? GitHubRunId { get; set; }

        /// <summary>GitHub Actions web execution URL.</summary>
        public string? GitHubRunUrl { get; set; }

        /// <summary>Error details if compilation failed.</summary>
        public string? ErrorMessage { get; set; }
    }
}

