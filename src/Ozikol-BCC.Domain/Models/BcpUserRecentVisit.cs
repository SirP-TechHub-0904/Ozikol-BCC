using System;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tracks a user's most recent BCP feature visit so dashboards can show
    /// shortcuts, recents, and continuation links per tenant user.
    /// </summary>
    public class BcpUserRecentVisit
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public string? UserId { get; set; }
        public Profile? User { get; set; }

        /// <summary>
        /// BCP module folder/key visited by the user. This should match the feature catalog key.
        /// </summary>
        public string? ModuleFolder { get; set; }
        public DateTime LastVisitedAt { get; set; }
    }
}


