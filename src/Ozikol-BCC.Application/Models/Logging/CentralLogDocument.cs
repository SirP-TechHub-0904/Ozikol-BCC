using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Ozikol_BCC.Application.Models.Logging
{
    /// <summary>
    /// Represents a central diagnostic log document stored in MongoDB.
    /// Dedicated strictly to platform-wide telemetry, API crash interception,
    /// client crash ingestion, and infrastructure security alerts.
    /// </summary>
    public class CentralLogDocument
    {
        /// <summary>
        /// Gets or sets the primary document identifier in MongoDB.
        /// </summary>
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when the event occurred.
        /// A MongoDB TTL index is placed on this field to automatically expire logs after a retention period.
        /// </summary>
        [BsonElement("timestampUtc")]
        public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the log severity level ("Information", "Warning", "Error", "Critical").
        /// </summary>
        [BsonElement("level")]
        public string Level { get; set; } = "Information";

        /// <summary>
        /// Gets or sets the category of the log ("SystemCrash", "ClientCrash", "SecurityAlert", "ApiTrace").
        /// </summary>
        [BsonElement("category")]
        public string Category { get; set; } = "SystemCrash";

        /// <summary>
        /// Gets or sets the originating application or platform (e.g. "Ozikol-BCC.Api", "FlutterWindows", "FlutterAndroid").
        /// </summary>
        [BsonElement("application")]
        public string Application { get; set; } = "Ozikol-BCC.Api";

        /// <summary>
        /// Gets or sets the active tenant key if the event occurred within a workspace context.
        /// </summary>
        [BsonElement("tenantKey")]
        public string? TenantKey { get; set; }

        /// <summary>
        /// Gets or sets the distributed trace ID or HTTP correlation identifier.
        /// </summary>
        [BsonElement("traceId")]
        public string? TraceId { get; set; }

        /// <summary>
        /// Gets or sets the HTTP route or endpoint path.
        /// </summary>
        [BsonElement("route")]
        public string? Route { get; set; }

        /// <summary>
        /// Gets or sets the HTTP method ("GET", "POST", etc.) if applicable.
        /// </summary>
        [BsonElement("httpMethod")]
        public string? HttpMethod { get; set; }

        /// <summary>
        /// Gets or sets the primary diagnostic log message.
        /// </summary>
        [BsonElement("message")]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the scrubbed stack trace.
        /// </summary>
        [BsonElement("stackTrace")]
        public string? StackTrace { get; set; }

        /// <summary>
        /// Gets or sets preceding application breadcrumbs or execution history.
        /// </summary>
        [BsonElement("breadcrumbs")]
        public string? Breadcrumbs { get; set; }

        /// <summary>
        /// Gets or sets the originating client IP address.
        /// </summary>
        [BsonElement("ipAddress")]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Gets or sets the persistent unique client system or device identifier.
        /// </summary>
        [BsonElement("systemId")]
        public string? SystemId { get; set; }

        /// <summary>
        /// Gets or sets the unique identifier of the user who triggered or experienced the event.
        /// </summary>
        [BsonElement("userId")]
        public string? UserId { get; set; }

        /// <summary>
        /// Gets or sets the email address of the user who triggered or experienced the event.
        /// </summary>
        [BsonElement("userEmail")]
        public string? UserEmail { get; set; }

        /// <summary>
        /// Gets or sets the client runtime platform (e.g., "windows", "android", "web", "ios").
        /// </summary>
        [BsonElement("platform")]
        public string? Platform { get; set; }

        /// <summary>
        /// Gets or sets the client User-Agent header string.
        /// </summary>
        [BsonElement("userAgent")]
        public string? UserAgent { get; set; }

        /// <summary>
        /// Gets or sets additional arbitrary diagnostic metadata.
        /// </summary>
        [BsonElement("metadata")]
        public Dictionary<string, object?>? Metadata { get; set; }
    }
}
