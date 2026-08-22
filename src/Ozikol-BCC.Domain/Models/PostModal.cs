using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a dynamic popup modal shown to users (e.g., promotional announcements).
    /// </summary>
    public class PostModal
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Image displayed inside the popup.
        /// </summary>
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the popup image.
        /// </summary>
        public string? ImageKey { get; set; }

        /// <summary>
        /// Modal popup heading.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Modal popup text content.
        /// </summary>
        public string? Description { get; set; }

        /// <summary>
        /// Rules for when the popup appears (e.g., Immediately, After 5 seconds).
        /// </summary>
        public ModalTime ModalTime { get; set; }

        /// <summary>
        /// Rules for how often the popup appears (e.g., Every Session, Once per User).
        /// </summary>
        public ModalOccurance ModalOccurance { get; set; }

        /// <summary>
        /// Date/time the popup campaign begins.
        /// </summary>
        public DateTime? StartTime { get; set; }

        /// <summary>
        /// Date/time the popup campaign ends.
        /// </summary>
        public DateTime? StopTime { get; set; }

        /// <summary>
        /// Toggle to strictly show only the image without text.
        /// </summary>
        public bool ShowOnlyImage { get; set; }

        /// <summary>
        /// Toggle visibility of the title.
        /// </summary>
        public bool ShowTitle { get; set; }

        /// <summary>
        /// Toggle visibility of the description text.
        /// </summary>
        public bool ShowDescription { get; set; }

        /// <summary>
        /// Toggle visibility of the image.
        /// </summary>
        public bool ShowImage { get; set; }

        /// <summary>
        /// Master visibility toggle for this modal.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Action button URL for the popup.
        /// </summary>
        [Display(Name = "Button Link")]
        public string? ButtonLink { get; set; }
    }
}


