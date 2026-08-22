using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A user's personal bookmark/save of a group chat message for quick reference.
    /// </summary>
    public class BcpBookmarkedMessage
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The user who bookmarked the message.
        /// </summary>
        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        /// <summary>
        /// The bookmarked message.
        /// </summary>
        public Guid MessageId { get; set; }
        public BcpGroupPost? Message { get; set; }

        /// <summary>
        /// Group context for filtering saved bookmarks by group.
        /// </summary>
        public Guid GroupId { get; set; }
        public BcpGroup? Group { get; set; }

        [Display(Name = "Bookmarked At")]
        public DateTime BookmarkedAt { get; set; } = DateTime.UtcNow;
    }
}

