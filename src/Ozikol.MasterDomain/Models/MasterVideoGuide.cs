using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an embedded YouTube video tutorial or visual walkthrough for an enterprise suite or feature.
    /// </summary>
    [Table("MasterVideoGuides")]
    public class MasterVideoGuide
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the parent enterprise suite code (e.g. suite-people, suite-workforce).
        /// </summary>
        [Required]
        [MaxLength(80)]
        public string SuiteCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional specific feature permalink code (e.g. staff-rota).
        /// </summary>
        [MaxLength(80)]
        public string? FeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the video guide headline title.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the detailed description, chapter notes, and learning objectives.
        /// </summary>
        [Required]
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique 11-character YouTube video ID (e.g. "dQw4w9WgXcQ").
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string YouTubeVideoId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional custom poster thumbnail image URL.
        /// When null, defaults to YouTube HQ thumbnail (https://img.youtube.com/vi/{id}/hqdefault.jpg).
        /// </summary>
        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        /// <summary>
        /// Gets or sets the total video duration in seconds (e.g. 195 seconds = 3:15).
        /// </summary>
        public int DurationSeconds { get; set; } = 180;

        /// <summary>
        /// Gets or sets the 2-letter ISO culture code of audio/captions (e.g. en, fr, es, de, or * for universal).
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Culture { get; set; } = "en";

        /// <summary>
        /// Gets or sets the total view count across portal sessions.
        /// </summary>
        public int ViewCount { get; set; } = 0;

        /// <summary>
        /// Gets or sets the display order among videos in the same suite/feature.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Gets or sets a value indicating whether this video is published and visible on the portal.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the video was added in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}
