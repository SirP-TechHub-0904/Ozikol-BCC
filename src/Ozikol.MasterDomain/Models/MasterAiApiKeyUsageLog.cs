using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Detailed telemetry and audit log entry for every AI request processed through the key pool.
    /// Tracks latency, status codes, token consumption, and errors.
    /// </summary>
    [Table("MasterAiApiKeyUsageLogs")]
    public class MasterAiApiKeyUsageLog
    {
        /// <summary>
        /// Gets or sets the primary key auto-incrementing identifier.
        /// </summary>
        [Key]
        public long Id { get; set; }

        /// <summary>
        /// Gets or sets the foreign key identifier referencing the parent <see cref="MasterAiApiKey"/>.
        /// </summary>
        [Required]
        public Guid MasterAiApiKeyId { get; set; }

        /// <summary>
        /// Gets or sets the parent key entity navigation property.
        /// </summary>
        [ForeignKey(nameof(MasterAiApiKeyId))]
        public virtual MasterAiApiKey? MasterAiApiKey { get; set; }

        /// <summary>
        /// Gets or sets the action or capability invoked (e.g. "CleanScopedCss", "SliceSection", "ImageToSection", "ChatCompletion").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string ActionName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the UTC timestamp when the request was executed.
        /// </summary>
        public DateTime RequestTimestampUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the execution response latency in milliseconds.
        /// </summary>
        public int ResponseTimeMs { get; set; }

        /// <summary>
        /// Gets or sets the HTTP status code returned (e.g. 200, 429, 500).
        /// </summary>
        public int StatusCode { get; set; } = 200;

        /// <summary>
        /// Gets or sets the count of prompt tokens consumed, if reported by the provider.
        /// </summary>
        public int? PromptTokens { get; set; }

        /// <summary>
        /// Gets or sets the count of completion tokens generated, if reported by the provider.
        /// </summary>
        public int? CompletionTokens { get; set; }

        /// <summary>
        /// Gets or sets error details or exception message if the request failed.
        /// </summary>
        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }
    }
}
