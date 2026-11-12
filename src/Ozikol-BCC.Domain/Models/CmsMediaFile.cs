using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an uploaded file asset managed inside the CMS Studio File Manager
    /// for usage across web pages, layout sections, blog articles, and downloadable resources.
    /// </summary>
    [Table("CmsMediaFiles")]
    public class CmsMediaFile
    {
        /// <summary>
        /// Unique primary key identifier for the uploaded CMS media file.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Original human-readable filename (e.g. "company-brochure.pdf", "hero-banner.webp").
        /// </summary>
        [Required]
        [MaxLength(300)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>
        /// Publicly accessible CDN or absolute URL where the asset is hosted.
        /// </summary>
        [Required]
        [MaxLength(2000)]
        public string FileUrl { get; set; } = string.Empty;

        /// <summary>
        /// Underlying object storage key or Cloudinary public identifier for deletion and lifecycle management.
        /// </summary>
        [MaxLength(500)]
        public string? StorageKey { get; set; }

        /// <summary>
        /// Normalized short file type / extension label (e.g. "PDF", "PNG", "SVG", "MP4", "DOCX").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FileType { get; set; } = "FILE";

        /// <summary>
        /// Full MIME content type header (e.g. "application/pdf", "image/png").
        /// </summary>
        [MaxLength(150)]
        public string? ContentType { get; set; }

        /// <summary>
        /// Total byte size of the uploaded file.
        /// </summary>
        public long FileSizeBytes { get; set; }

        /// <summary>
        /// Storage provider used to host this file (e.g. "CloudflareR2", "Cloudinary", "LocalDisk").
        /// </summary>
        [MaxLength(50)]
        public string? StorageProvider { get; set; }

        /// <summary>
        /// Email or username of the administrator who uploaded the file.
        /// </summary>
        [MaxLength(200)]
        public string? UploadedBy { get; set; }

        /// <summary>
        /// UTC timestamp when the file was uploaded.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

