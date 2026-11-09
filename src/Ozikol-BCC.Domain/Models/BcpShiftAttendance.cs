using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// The canonical Single Source of Truth for actual workforce attendance execution.
    /// Pinned 1-to-1 to a scheduled <see cref="BcpShift"/> to record real-world clock-in/out timestamps,
    /// GPS geofence validation, lone worker safety checks, and supervisor timesheet sign-offs.
    /// Table: [dbo].[BcpShiftAttendances]
    /// </summary>
    public class BcpShiftAttendance : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the attendance record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this attendance record to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key referencing the master planned <see cref="BcpShift"/>.
        /// </summary>
        [Required]
        public Guid ShiftId { get; set; }

        /// <summary>
        /// Navigation property back to the scheduled shift.
        /// </summary>
        [ForeignKey(nameof(ShiftId))]
        public BcpShift? Shift { get; set; }

        /// <summary>
        /// User identifier of the guard or staff member who performed the attendance clock-in.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Actual clock-in timestamp in UTC.
        /// </summary>
        public DateTime? ClockInUtc { get; set; }

        /// <summary>
        /// Geographic latitude captured by the device at clock-in.
        /// </summary>
        public double? ClockInLatitude { get; set; }

        /// <summary>
        /// Geographic longitude captured by the device at clock-in.
        /// </summary>
        public double? ClockInLongitude { get; set; }

        /// <summary>
        /// Device GPS horizontal accuracy in meters reported at clock-in.
        /// </summary>
        public double? ClockInAccuracyMeters { get; set; }

        /// <summary>
        /// Calculated distance in meters between the guard's device and the site center coordinates.
        /// </summary>
        public double? ClockInDistanceFromSiteMeters { get; set; }

        /// <summary>
        /// Indicates whether the clock-in location was verified within the client site's geofence radius.
        /// </summary>
        public bool IsClockInGeofenceVerified { get; set; }

        /// <summary>
        /// Verification method used for clock-in: "MobileGps", "QrKiosk", "DesktopApp", "ManualSupervisorOverride".
        /// </summary>
        [StringLength(50)]
        public string? ClockInMethod { get; set; } = "MobileGps";

        /// <summary>
        /// Indicates whether hardware device biometrics (WebAuthn / Touch ID / Face ID / Windows Hello) was successfully verified at clock-in.
        /// </summary>
        public bool ClockInBiometricVerified { get; set; }

        /// <summary>
        /// Descriptive type of biometric authenticator used at clock-in (e.g., "TouchID", "FaceID", "WindowsHello", "WebAuthnPasskey").
        /// </summary>
        [StringLength(50)]
        public string? ClockInBiometricType { get; set; }

        /// <summary>
        /// Cloud storage URL of the live WebRTC facecam snapshot captured at clock-in, watermarked with GPS and timestamp.
        /// </summary>
        [StringLength(500)]
        public string? ClockInPhotoUrl { get; set; }

        /// <summary>
        /// Actual clock-out timestamp in UTC.
        /// </summary>
        public DateTime? ClockOutUtc { get; set; }

        /// <summary>
        /// Geographic latitude captured by the device at clock-out.
        /// </summary>
        public double? ClockOutLatitude { get; set; }

        /// <summary>
        /// Geographic longitude captured by the device at clock-out.
        /// </summary>
        public double? ClockOutLongitude { get; set; }

        /// <summary>
        /// Device GPS horizontal accuracy in meters reported at clock-out.
        /// </summary>
        public double? ClockOutAccuracyMeters { get; set; }

        /// <summary>
        /// Calculated distance in meters from site center coordinates at clock-out.
        /// </summary>
        public double? ClockOutDistanceFromSiteMeters { get; set; }

        /// <summary>
        /// Indicates whether the clock-out location was verified within the client site's geofence radius.
        /// </summary>
        public bool IsClockOutGeofenceVerified { get; set; }

        /// <summary>
        /// Verification method used for clock-out.
        /// </summary>
        [StringLength(50)]
        public string? ClockOutMethod { get; set; } = "MobileGps";

        /// <summary>
        /// Cloud storage URL of the live WebRTC facecam snapshot captured at clock-out.
        /// </summary>
        [StringLength(500)]
        public string? ClockOutPhotoUrl { get; set; }

        /// <summary>
        /// Total actual duration on site in decimal hours calculated from ClockInUtc to ClockOutUtc.
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal? ActualDurationHours { get; set; }

        /// <summary>
        /// Total billable hours approved by supervisor for payroll and client invoicing.
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal? BillableHours { get; set; }

        /// <summary>
        /// Overtime hours accrued beyond scheduled shift duration.
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal? OvertimeHours { get; set; }

        /// <summary>
        /// Minutes elapsed between scheduled start time and actual clock-in. Positive values indicate late arrivals.
        /// </summary>
        public int LateArrivalMinutes { get; set; } = 0;

        /// <summary>
        /// Indicates whether this attendance record has been flagged for supervisor review (e.g. out of geofence, late >15 mins, or early departure).
        /// </summary>
        public bool IsFlagged { get; set; }

        /// <summary>
        /// Specific reason this attendance record was flagged.
        /// </summary>
        [StringLength(250)]
        public string? FlagReason { get; set; }

        /// <summary>
        /// Timestamp in UTC of the most recent lone worker safety check-call acknowledged on site.
        /// </summary>
        public DateTime? LastWelfareCheckAtUtc { get; set; }

        /// <summary>
        /// Cumulative number of hourly welfare check-calls successfully confirmed during this shift.
        /// </summary>
        public int WelfareChecksCompletedCount { get; set; } = 0;

        /// <summary>
        /// Indicates whether a supervisor has reviewed and approved this attendance timesheet.
        /// </summary>
        public bool SupervisorApproved { get; set; }

        /// <summary>
        /// User identifier of the supervisor who approved the timesheet.
        /// </summary>
        [StringLength(100)]
        public string? SupervisorApprovedBy { get; set; }

        /// <summary>
        /// Timestamp in UTC when the supervisor approved the timesheet.
        /// </summary>
        public DateTime? SupervisorApprovedAtUtc { get; set; }

        /// <summary>
        /// Supervisor audit notes or pay adjustment explanations.
        /// </summary>
        public string? SupervisorNotes { get; set; }

        /// <summary>
        /// Timestamp when the attendance record was initiated in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the attendance record was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

