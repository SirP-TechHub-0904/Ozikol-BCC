using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A file shared within a BCP group. Stored in Cloudinary under the group's folder.
    /// </summary>
    public class BcpGroupFile
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpGroupId { get; set; }
        public BcpGroup? BcpGroup { get; set; }

        public string UploadedByUserId { get; set; } = string.Empty;
        public Profile? UploadedByUser { get; set; }

        [Required]
        [StringLength(255)]
        [Display(Name = "File Name")]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "File URL")]
        public string FileUrl { get; set; } = string.Empty;

        /// <summary>
        /// File size in bytes.
        /// </summary>
        [Display(Name = "File Size")]
        public long FileSize { get; set; }

        /// <summary>
        /// MIME type, e.g. "image/png", "application/pdf", "text/plain".
        /// </summary>
        [StringLength(100)]
        [Display(Name = "Content Type")]
        public string? ContentType { get; set; }

        /// <summary>
        /// Pinned files stay at the top of the Files browser.
        /// </summary>
        [Display(Name = "Is Pinned")]
        public bool IsPinned { get; set; }

        /// <summary>
        /// Cloudinary transform URL for image thumbnails.
        /// </summary>
        [Display(Name = "Thumbnail URL")]
        public string? ThumbnailUrl { get; set; }

        /// <summary>
        /// Cloudinary public ID for management and deletion.
        /// </summary>
        [StringLength(500)]
        [Display(Name = "Cloudinary Public ID")]
        public string? CloudinaryPublicId { get; set; }

        [Display(Name = "Date Uploaded")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}

