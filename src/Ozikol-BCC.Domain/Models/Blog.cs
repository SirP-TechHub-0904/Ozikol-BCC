using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a single news article or blog post.
    /// </summary>
    public class Blog
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Article headline.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Timestamp of creation or publish date.
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// URL to a video file for this post.
        /// </summary>
        public string? VideoUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the video.
        /// </summary>
        public string? VideoKey { get; set; }

        /// <summary>
        /// Toggle visibility for this post.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Sorting order for manual reordering.
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Featured image URL for the post.
        /// </summary>
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the featured image.
        /// </summary>
        public string? ImageKey { get; set; }

        /// <summary>
        /// Links article to its parent category.
        /// </summary>
        public Guid? BlogCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the parent category.
        /// </summary>
        public BlogCategory? BlogCategory { get; set; }

        /// <summary>
        /// Short excerpt text.
        /// </summary>
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Full HTML body content for the post.
        /// </summary>
        [Display(Name = "Full Description")]
        public string? FullDescription { get; set; }

        /// <summary>
        /// Toggle to show this post's title in the breaking news ribbon.
        /// </summary>
        [Display(Name = "Add To Ribon")]
        public bool AddToRibon { get; set; }

        /// <summary>
        /// Custom title to display in the ribbon instead of the main title.
        /// </summary>
        [Display(Name = "Ribon Custom Display Title (if you want a title that will override the main title in the ribon.)")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Sort order inside the news ribbon ticker.
        /// </summary>
        [Display(Name = "Ribon Sort Order")]
        public int RibonSortOrder { get; set; }

        /// <summary>
        /// Future scheduled publication timestamp.
        /// </summary>
        public DateTime? ScheduledPublishDate { get; set; }

        /// <summary>
        /// Indicates if this article is scheduled for future release.
        /// </summary>
        public bool IsScheduled { get; set; } = false;

        /// <summary>
        /// Optional custom CSS class string applied to this blog card/article container (e.g. "featured-post", "border-glow").
        /// Injected into templates via {{ CustomClass }}.
        /// </summary>
        [NotMapped]
        [MaxLength(200)]
        [Display(Name = "Custom CSS Class")]
        public string? CustomClass { get; set; }
    }
}


