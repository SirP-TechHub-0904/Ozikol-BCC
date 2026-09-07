using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Immutable audit log entry tracking administrative actions across the central Master Catalog platform.
/// Every CRUD operation, login event, suspension, approval, and configuration change performed by
/// a CentralUser is captured here for compliance, diagnostics, and accountability.
/// </summary>
[Table("MasterAuditLogs")]
public class MasterAuditLog
{
    /// <summary>
    /// Unique identifier for this audit log entry.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The ASP.NET Identity ID of the CentralUser who performed the action.
    /// Nullable for system-initiated events (e.g., scheduled auto-close of support tickets).
    /// </summary>
    [MaxLength(450)]
    public string? UserId { get; set; }

    /// <summary>
    /// Display name of the user at the time the action was logged (denormalized for audit immutability).
    /// </summary>
    [MaxLength(200)]
    public string? UserName { get; set; }

    /// <summary>
    /// The action verb describing what was performed.
    /// Standard values: Create, Update, Delete, Login, Logout, Suspend, Activate, Approve, Reject, Close, Reopen, Resend, Export.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = null!;

    /// <summary>
    /// The type of entity affected by this action.
    /// Standard values: Tenant, Feature, Subscription, User, Affiliate, Creator, Template, Support, Setting, Email, News, Career, Legal, Helpdesk, Currency, Billing.
    /// </summary>
    [Required]
    [MaxLength(80)]
    public string EntityType { get; set; } = null!;

    /// <summary>
    /// The primary key (GUID or string) of the affected entity. Used for tracing back to the specific record.
    /// </summary>
    [MaxLength(450)]
    public string? EntityId { get; set; }

    /// <summary>
    /// Human-readable summary of the action performed (e.g., "Suspended tenant Acme Corp for non-payment").
    /// </summary>
    [MaxLength(500)]
    public string? Summary { get; set; }

    /// <summary>
    /// JSON snapshot of the entity's state before the change. Null for Create and Login actions.
    /// Enables side-by-side diff comparison in the admin audit log details page.
    /// </summary>
    public string? OldValues { get; set; }

    /// <summary>
    /// JSON snapshot of the entity's state after the change. Null for Delete and Logout actions.
    /// </summary>
    public string? NewValues { get; set; }

    /// <summary>
    /// Client IP address from which the action was performed, captured from HttpContext.
    /// </summary>
    [MaxLength(50)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// Client User-Agent string for device/browser identification in security audits.
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// UTC timestamp when this audit log entry was created. Immutable after insertion.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
