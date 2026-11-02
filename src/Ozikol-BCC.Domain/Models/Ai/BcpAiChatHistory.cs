using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models.Ai
{
    /// <summary>
    /// Represents a persistent conversational message or code generation interaction
    /// within the Ozi AI studio co-pilot for a specific tenant, user, and page route.
    /// Stores the active prompt, AI response, generated code blueprint, pre-change snapshot for undo/rollback,
    /// and implementation state tracking.
    /// </summary>
    [Table("BcpAiChatHistories")]
    public class BcpAiChatHistory
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier for the chat record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the identifier of the authenticated user who initiated the conversation.
        /// </summary>
        [MaxLength(128)]
        public string? UserId { get; set; }

        /// <summary>
        /// Gets or sets the email address of the authenticated user for auditing and display.
        /// </summary>
        [MaxLength(256)]
        public string? UserEmail { get; set; }

        /// <summary>
        /// Gets or sets the console or studio page route where this conversation was held (e.g. '/content/console/templates/create').
        /// </summary>
        [MaxLength(512)]
        public string PageRoute { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the friendly title of the page at the time of interaction.
        /// </summary>
        [MaxLength(256)]
        public string? PageTitle { get; set; }

        /// <summary>
        /// Gets or sets the AI provider or model used for this generation (e.g. 'ozi-flash', 'ozi-coder', 'ozi-deep').
        /// </summary>
        [MaxLength(64)]
        public string ProviderUsed { get; set; } = "ozi-flash";

        /// <summary>
        /// Gets or sets the user's prompt text or instructions.
        /// </summary>
        public string PromptText { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the AI assistant's text explanation and response.
        /// </summary>
        public string ResponseText { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets an optional URL or base64 reference to an attached/pasted image inspected by vision.
        /// </summary>
        public string? AttachedImageUrl { get; set; }

        /// <summary>
        /// Gets or sets the serialized JSON payload of the generated structured code (HTML, CSS, JS, tokens, mock content).
        /// </summary>
        public string? GeneratedCodeJson { get; set; }

        /// <summary>
        /// Gets or sets the snapshot of the editor's previous state prior to implementing this AI response.
        /// Enables instant one-click rollback/restore.
        /// </summary>
        public string? PreviousSnapshotJson { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this AI proposal has been applied/implemented by the user into the active page.
        /// </summary>
        public bool IsImplemented { get; set; } = false;

        /// <summary>
        /// Gets or sets the timestamp when the change was implemented.
        /// </summary>
        public DateTime? ImplementedAt { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the interaction occurred.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
