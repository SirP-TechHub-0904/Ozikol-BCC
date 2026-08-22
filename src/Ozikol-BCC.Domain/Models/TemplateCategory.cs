using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a master theme or template design (e.g., 'Bizup', 'Archo') that dictates the global UI layout.
    /// </summary>
    public class TemplateCategory
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Path to the main layout file (e.g., '~/Pages/Shared/_Bizup.cshtml').
        /// </summary>
        [Display(Name = "Layout")]
        [Required]
        public string? Layout { get; set; }

        /// <summary>
        /// Path to the login screen layout file.
        /// </summary>
        [Display(Name = "Login Layout")]
        [Required]
        public string? LoginLayout { get; set; }

        /// <summary>
        /// The name of the Master Theme.
        /// </summary>
        [Display(Name = "Template Name")]
        [Required]
        public string? TemplateName { get; set; }

        /// <summary>
        /// Path to the specific CSS color variables for this theme.
        /// </summary>
        [Display(Name = "Template Color Path")]
        [Required]
        public string? TemplateColorPath { get; set; }

        /// <summary>
        /// System identifier for the theme.
        /// </summary>
        public string? UniqueKey { get; set; }

        /// <summary>
        /// Navigation property for all the layout variations (blocks) inside this theme.
        /// </summary>
        public ICollection<TemplateType>? TemplateTypes { get; set; }
    }
}


