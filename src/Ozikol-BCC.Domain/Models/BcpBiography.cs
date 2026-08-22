using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents the user's professional biography/CV profile.
    /// Stores career, education, skills, and languages history.
    /// </summary>
    public class BcpBiography
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public Profile? User { get; set; }

        [StringLength(255)]
        public string? Headline { get; set; }

        public string? ProfessionalSummary { get; set; }

        /// <summary>
        /// Serialized JSON array of work experience items.
        /// Format: [{ Company, JobTitle, StartDate, EndDate, Description }]
        /// </summary>
        public string? WorkExperienceJson { get; set; }

        /// <summary>
        /// Serialized JSON array of education history items.
        /// Format: [{ Institution, Degree, FieldOfStudy, GraduationYear, Description }]
        /// </summary>
        public string? EducationJson { get; set; }

        /// <summary>
        /// Serialized JSON array of skills/expertises.
        /// Format: ["Skill1", "Skill2"]
        /// </summary>
        public string? SkillsJson { get; set; }

        /// <summary>
        /// Serialized JSON array of certifications/projects.
        /// Format: [{ Title, IssuerOrLink, Year, Description }]
        /// </summary>
        public string? CertificationsJson { get; set; }

        /// <summary>
        /// Serialized JSON array of languages spoken.
        /// Format: [{ Language, Proficiency }]
        /// </summary>
        public string? LanguagesJson { get; set; }

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}
