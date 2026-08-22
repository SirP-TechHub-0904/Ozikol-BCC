using System;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a subscriber who opted into the mailing list.
    /// </summary>
    public class NewsLetter
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// The subscriber's email address.
        /// </summary>
        public string? Email { get; set; }

        /// <summary>
        /// Timestamp of subscription.
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// Toggle if they are actively subscribed or have unsubscribed.
        /// </summary>
        public bool Active { get; set; }
    }
}


