using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Central diagnostic record capturing every non-success API response or unhandled exception across the platform.
/// Stores both the sanitized client-facing CustomError + ErrorCode ("ERR-XXXX") and the internal RealError + StackTrace
/// strictly for Central administrative inspection.
/// </summary>
[Table("MasterApiErrorLogs")]
public class MasterApiErrorLog
{
    /// <summary>
    /// Gets or sets the unique primary key identifier for the error log record.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the optional foreign key to the tenant organization where the error occurred.
    /// Null when the error occurred on a Central/Platform or unauthenticated endpoint outside a tenant context.
    /// </summary>
    public Guid? MasterTenantCatalogId { get; set; }

    /// <summary>
    /// Gets or sets the navigation reference to the associated <see cref="MasterTenantCatalog"/>.
    /// </summary>
    [ForeignKey(nameof(MasterTenantCatalogId))]
    public virtual MasterTenantCatalog? TenantCatalog { get; set; }

    /// <summary>
    /// Gets or sets the tenant subdomain/workspace key (e.g., "cocacolarnkl"), or null for Central-level errors.
    /// </summary>
    [MaxLength(100)]
    public string? TenantKey { get; set; }

    /// <summary>
    /// Gets or sets the tenant organization display name snapshot at the time of the error.
    /// </summary>
    [MaxLength(200)]
    public string? OrganizationName { get; set; }

    /// <summary>
    /// Gets or sets the origin scope of the error ("Tenant" or "Central").
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string SourceScope { get; set; } = "Tenant";

    /// <summary>
    /// Gets or sets the standardized error code returned to the client (e.g., "ERR-3001").
    /// </summary>
    [Required]
    [MaxLength(32)]
    public string ErrorCode { get; set; } = "ERR-9999";

    /// <summary>
    /// Gets or sets the functional category of the error code (e.g., "Billing & Payments", "Authentication & Identity").
    /// </summary>
    [MaxLength(100)]
    public string Category { get; set; } = "System";

    /// <summary>
    /// Gets or sets the clean, user-friendly Custom Error message returned to the client.
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string CustomError { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the actual underlying Real Error (raw gateway error, exception message, validation detail, or SQL error)
    /// visible strictly in Central Administration.
    /// </summary>
    [Required]
    public string RealError { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional exception stack trace or extended diagnostic payload.
    /// </summary>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Gets or sets the HTTP method of the failing request (e.g., "GET", "POST", "PUT", "DELETE").
    /// </summary>
    [MaxLength(16)]
    public string HttpMethod { get; set; } = "GET";

    /// <summary>
    /// Gets or sets the request path / endpoint that produced the error (e.g., "/api/billing/invoices/paystack/initialize").
    /// </summary>
    [MaxLength(500)]
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the HTTP status code returned for the request (e.g., 400, 401, 403, 404, 500, 502).
    /// </summary>
    public int HttpStatusCode { get; set; } = 400;

    /// <summary>
    /// Gets or sets the authenticated user identifier if available.
    /// </summary>
    [MaxLength(128)]
    public string? UserId { get; set; }

    /// <summary>
    /// Gets or sets the authenticated user email or username if available.
    /// </summary>
    [MaxLength(256)]
    public string? UserEmail { get; set; }

    /// <summary>
    /// Gets or sets the client IP address from which the request originated.
    /// </summary>
    [MaxLength(64)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// Gets or sets the unique correlation / HTTP TraceIdentifier for support lookup.
    /// </summary>
    [MaxLength(128)]
    public string? TraceId { get; set; }

    /// <summary>
    /// Gets or sets the UTC timestamp when the error was recorded.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}

