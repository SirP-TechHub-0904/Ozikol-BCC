using System.Linq;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a registered AI provider API key managed in the Central key pool.
    /// Supports automatic round-robin load balancing, daily quota tracking, and rate-limit cooldown failovers.
    /// </summary>
    [Table("MasterAiApiKeys")]
    public class MasterAiApiKey
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the AI provider name (e.g. "Gemini", "DeepSeek", "Groq", "OpenAI", "LocalQwen").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = "Gemini";

        /// <summary>
        /// Gets or sets the human-friendly display label or alias for the key (e.g. "Gemini Free Key #1").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string KeyAlias { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the raw API key secret string.
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a value indicating whether this key is actively participating in the pool.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the maximum number of allowed requests per day (e.g. 1500 for Gemini Free tier).
        /// </summary>
        public int DailyQuotaLimit { get; set; } = 1500;

        /// <summary>
        /// Gets or sets the count of requests made with this key today.
        /// </summary>
        public int TodayRequestsCount { get; set; } = 0;

        /// <summary>
        /// Gets or sets the lifetime total number of requests processed by this key.
        /// </summary>
        public long TotalRequestsCount { get; set; } = 0;

        /// <summary>
        /// Gets or sets the operational status ("Active", "CoolingDown", "QuotaExhausted", "Disabled").
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "Active";

        /// <summary>
        /// Gets or sets the UTC timestamp until which this key is suspended due to an HTTP 429 rate limit.
        /// </summary>
        public DateTime? RateLimitCooldownUntilUtc { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when this key was last used for an inference request.
        /// </summary>
        public DateTime? LastUsedAtUtc { get; set; }

        /// <summary>
        /// Gets or sets the date and time in UTC when the key record was created.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time in UTC when the key record was last updated.
        /// </summary>
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the collection of telemetry usage logs associated with this key.
        /// </summary>
        public virtual ICollection<MasterAiApiKeyUsageLog> UsageLogs { get; set; } = new List<MasterAiApiKeyUsageLog>();

        /// <summary>
        /// Gets the most recent telemetry usage log entry for this key, or null if never invoked.
        /// </summary>
        [NotMapped]
        public MasterAiApiKeyUsageLog? LatestUsageLog => UsageLogs?.OrderByDescending(l => l.RequestTimestampUtc).FirstOrDefault();
    }
}
