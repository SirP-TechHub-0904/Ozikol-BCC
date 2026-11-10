using System;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Shared architectural contract tying together all models within the
    /// Staff Rota, Shift Scheduling, and Attendance feature suite (<c>bcp-staff-rota</c>).
    /// Enforces strict tenant workspace isolation and lifecycle timestamp audit tracking.
    /// </summary>
    public interface IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the workforce entity.
        /// </summary>
        Guid Id { get; set; }

        /// <summary>
        /// Tenant identifier isolating this workforce entity to the specific organization workspace.
        /// </summary>
        string TenantKey { get; set; }

        /// <summary>
        /// Timestamp when the record was created in UTC.
        /// </summary>
        DateTime CreatedUtc { get; set; }

        /// <summary>
        /// Timestamp when the record was last modified in UTC.
        /// </summary>
        DateTime? UpdatedUtc { get; set; }
    }
}

