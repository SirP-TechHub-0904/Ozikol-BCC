using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a monitored native desktop office computer or station registered to the workspace.
    /// Table: [dbo].[BcpWorkstations]
    /// </summary>
    public class BcpWorkstation
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Unique station code identifier (e.g. "WS-STATION-01" or hardware GUID hash).
        /// </summary>
        [Required]
        [StringLength(100)]
        public string StationKey { get; set; } = string.Empty;

        /// <summary>
        /// Hostname / computer name as reported by the OS (e.g. "DESKTOP-FINANCE-04").
        /// </summary>
        [Required]
        [StringLength(150)]
        public string MachineName { get; set; } = string.Empty;

        /// <summary>
        /// Hardware fingerprint / GUID unique to this computer motherboard/storage.
        /// </summary>
        [StringLength(150)]
        public string? HardwareGuid { get; set; }

        /// <summary>
        /// Profile ID of the currently logged-in or assigned office staff member.
        /// </summary>
        [StringLength(100)]
        public string? AssignedUserId { get; set; }

        /// <summary>
        /// Full name of the staff member operating this computer.
        /// </summary>
        [StringLength(255)]
        public string? AssignedUserName { get; set; }

        /// <summary>
        /// Email address of the staff member operating this computer.
        /// </summary>
        [StringLength(255)]
        public string? AssignedUserEmail { get; set; }

        /// <summary>
        /// Department or office area (e.g. "Accounts", "Customer Support", "Front Desk").
        /// </summary>
        [StringLength(100)]
        public string? Department { get; set; }

        /// <summary>
        /// Local area network IP address or external IP.
        /// </summary>
        [StringLength(64)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Operating System details (e.g. "Windows 11 Pro 24H2").
        /// </summary>
        [StringLength(150)]
        public string? OsVersion { get; set; }

        /// <summary>
        /// App version of the native desktop client running on this PC.
        /// </summary>
        [StringLength(50)]
        public string? ClientVersion { get; set; }

        /// <summary>
        /// Indicates whether this computer has sent a telemetry heartbeat within the last 45 seconds.
        /// </summary>
        public bool IsOnline { get; set; }

        /// <summary>
        /// UTC timestamp of the most recent heartbeat.
        /// </summary>
        public DateTime? LastHeartbeat { get; set; }

        /// <summary>
        /// Name of the active process currently in the foreground (e.g. "EXCEL.EXE").
        /// </summary>
        [StringLength(100)]
        public string? CurrentProcessName { get; set; }

        /// <summary>
        /// Title bar text of the foreground window (e.g. "2026_Q4_Financial_Ledger.xlsx - Excel").
        /// </summary>
        [StringLength(500)]
        public string? CurrentWindowTitle { get; set; }

        /// <summary>
        /// Path of the file or document currently active.
        /// </summary>
        [StringLength(500)]
        public string? CurrentDocumentPath { get; set; }

        /// <summary>
        /// Whether the station is locked by management or policy.
        /// </summary>
        public bool IsLocked { get; set; }

        /// <summary>
        /// Reason for lock (e.g. "Administrative Remote Lock", "Repeated Policy Violation").
        /// </summary>
        [StringLength(255)]
        public string? LockReason { get; set; }

        /// <summary>
        /// Whether full kiosk enforcement mode is enabled on this station.
        /// </summary>
        public bool KioskEnforced { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Whitelist policy specifying which applications may be launched and executed on workstations.
    /// Table: [dbo].[BcpWorkstationAppPolicies]
    /// </summary>
    public class BcpWorkstationAppPolicy
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Friendly name (e.g. "Microsoft Excel", "Adobe Acrobat Reader").
        /// </summary>
        [Required]
        [StringLength(150)]
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>
        /// Process name match (e.g. "excel.exe", "winword.exe", "calc.exe").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string ProcessName { get; set; } = string.Empty;

        /// <summary>
        /// Category grouping (e.g. "Productivity", "Accounting", "Browsers", "Utilities").
        /// </summary>
        [StringLength(100)]
        public string Category { get; set; } = "General";

        /// <summary>
        /// True if permitted; False if explicitly blacklisted.
        /// </summary>
        public bool IsAllowed { get; set; } = true;

        /// <summary>
        /// Optional role restriction (e.g. "Accountant", "Admin", or null for All Staff).
        /// </summary>
        [StringLength(100)]
        public string? ApplicableRole { get; set; }

        /// <summary>
        /// Icon code or asset name for rendering in the desktop app launcher.
        /// </summary>
        [StringLength(100)]
        public string? IconName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// File storage and document folder policies (approved directory sandboxes and USB storage restrictions).
    /// Table: [dbo].[BcpWorkstationFilePolicies]
    /// </summary>
    public class BcpWorkstationFilePolicy
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Approved work root path on disk (e.g. "C:\Ozikol-Workspace" or network path).
        /// </summary>
        [StringLength(500)]
        public string ApprovedDirectoryPath { get; set; } = @"C:\Ozikol-Workspace";

        /// <summary>
        /// USB storage rule: "Allowed", "ReadOnly", "Blocked".
        /// </summary>
        [StringLength(50)]
        public string UsbStoragePolicy { get; set; } = "Blocked";

        /// <summary>
        /// Whether USB flash drives are strictly blocked from mounting or reading documents.
        /// </summary>
        public bool BlockUsbStorage { get; set; } = true;

        /// <summary>
        /// Whether files edited outside the approved directory trigger an audit alert.
        /// </summary>
        public bool EnforceDirectorySandbox { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Audit log of intercepted unauthorized applications, non-work document access, or policy violations.
    /// Table: [dbo].[BcpWorkstationViolationLogs]
    /// </summary>
    public class BcpWorkstationViolationLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid? WorkstationId { get; set; }

        [Required]
        [StringLength(150)]
        public string MachineName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? UserId { get; set; }

        [StringLength(255)]
        public string? UserName { get; set; }

        /// <summary>
        /// Name of process attempted (e.g. "telegram.exe", "utorrent.exe").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string ProcessName { get; set; } = string.Empty;

        /// <summary>
        /// Window title captured when intercept occurred.
        /// </summary>
        [StringLength(500)]
        public string? WindowTitle { get; set; }

        /// <summary>
        /// File path if violation was an unapproved document or external storage access.
        /// </summary>
        [StringLength(500)]
        public string? FilePath { get; set; }

        /// <summary>
        /// Action performed: "TERMINATED", "BLOCKED", "FLAGGED".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string ActionTaken { get; set; } = "TERMINATED";

        /// <summary>
        /// Violation category: "UNAPPROVED_APP", "OUTSIDE_SANDBOX_DOCUMENT", "UNAUTHORIZED_USB".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string ViolationType { get; set; } = "UNAPPROVED_APP";

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Access request submitted by an employee from their workstation asking for permission to run an app.
    /// Table: [dbo].[BcpWorkstationAccessRequests]
    /// </summary>
    public class BcpWorkstationAccessRequest
    {
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid? WorkstationId { get; set; }

        [Required]
        [StringLength(150)]
        public string MachineName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string UserName { get; set; } = string.Empty;

        /// <summary>
        /// Executable name requested (e.g. "photoshop.exe").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string RequestedProcessName { get; set; } = string.Empty;

        /// <summary>
        /// Staff's official reason/justification for needing the tool.
        /// </summary>
        [Required]
        [StringLength(1000)]
        public string Reason { get; set; } = string.Empty;

        /// <summary>
        /// Request state: "Pending", "Approved", "Denied", "Expired".
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// If approved, until when this application is allowed to run.
        /// </summary>
        public DateTime? ApprovedUntil { get; set; }

        /// <summary>
        /// Administrator who approved or denied this request.
        /// </summary>
        [StringLength(100)]
        public string? ReviewedByUserId { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

