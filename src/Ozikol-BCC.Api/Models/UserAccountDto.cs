using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Api.Models
{
    /// <summary>
    /// DTO representing a full user account profile as returned by the User Account Manager.
    /// Includes basic personal details and a collection of associated documents.
    /// </summary>
    public class UserAccountDto
    {
        /// <summary>
        /// Unique identifier of the user (matches Identity user Id).
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the user (e.g. "John Doe").
        /// </summary>
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Email address of the user.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Phone number in international format.
        /// </summary>
        public string PhoneNumber { get; set; } = string.Empty;

        /// <summary>
        /// Collection of documents attached to the user profile (e.g., certifications, contracts).
        /// </summary>
        public List<DocumentDto> Documents { get; set; } = new();
    }

    /// <summary>
    /// Simple DTO for a document reference associated with a user account.
    /// </summary>
    public class DocumentDto
    {
        /// <summary>
        /// Document identifier (guid or reference string).
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Human readable name of the document.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// URL where the document can be accessed or downloaded.
        /// </summary>
        public string Url { get; set; } = string.Empty;

        /// <summary>
        /// Mime type of the document (e.g., "application/pdf").
        /// </summary>
        public string MimeType { get; set; } = string.Empty;
    }
}

