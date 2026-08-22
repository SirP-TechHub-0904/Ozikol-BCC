using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Assigns a Profile to a BCP project. This is project membership only;
    /// global access is still controlled by Identity roles and BcpUserFeatureRole.
    /// </summary>
    public class BcpProjectUser
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProjectId { get; set; }
        public BcpProject? BcpProject { get; set; }

        public string? UserId { get; set; }
        public Profile? User { get; set; }

        public DateTime DateAdded { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Project-facing role label, such as Owner, Manager, Developer, or Reviewer.
        /// </summary>
        [StringLength(50)]
        public string? Role { get; set; }
    }
}


