using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Stores workspace-wide configuration and dynamic terminology aliases for the independent
    /// Committees &amp; Sub-Groups capability (<c>bcp-committees</c>).
    /// Allows tenants to rename "Committees" to "Ministries", "Actors", "Chapters", "Clubs", etc.
    /// Table: [dbo].[BcpCommitteeSettings]
    /// </summary>
    public class BcpCommitteeSettings
    {
        /// <summary>
        /// Unique primary key identifier for the tenant's committee settings record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Singular display alias replacing "Committee" across admin, member, and public portals (e.g. "Ministry", "Actor Group", "Chapter").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string AliasSingular { get; set; } = "Committee";

        /// <summary>
        /// Plural display alias replacing "Committees" across menus, headers, and badges (e.g. "Ministries", "Actor Groups", "Chapters").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string AliasPlural { get; set; } = "Committees";

        /// <summary>
        /// Singular display alias for nested sub-units under a parent group (e.g. "Sub-Group", "Unit", "Cast").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string SubGroupAliasSingular { get; set; } = "Sub-Group";

        /// <summary>
        /// Plural display alias for nested sub-units under a parent group (e.g. "Sub-Groups", "Units", "Casts").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string SubGroupAliasPlural { get; set; } = "Sub-Groups";

        /// <summary>
        /// Custom title for the primary leader of a group (e.g. "Chairperson", "Director", "HOD", "Coordinator").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string LeaderTitleAlias { get; set; } = "Chairperson";

        /// <summary>
        /// Custom title for the group secretary / scribe responsible for minutes and reports (e.g. "Secretary", "Scribe", "Stage Manager").
        /// </summary>
        [Required]
        [StringLength(80)]
        public string SecretaryTitleAlias { get; set; } = "Secretary";

        /// <summary>
        /// Determines whether external public registration links are enabled across the workspace.
        /// </summary>
        public bool AllowExternalRegistration { get; set; } = true;

        /// <summary>
        /// Determines whether external registrants require administrator or group leader approval before becoming active members.
        /// </summary>
        public bool RequireApprovalForExternal { get; set; } = true;

        /// <summary>
        /// When true, approving an external applicant who does not yet have a workspace account automatically provisions a member profile.
        /// </summary>
        public bool AutoProvisionMemberOnApprove { get; set; } = true;

        /// <summary>
        /// Optional default Extra-Info Form ID applied when a group does not specify its own custom supplemental form.
        /// </summary>
        public Guid? DefaultExtraInfoFormId { get; set; }

        /// <summary>
        /// Controls whether members and leaders can connect Google Docs, Google Sheets, Notebooks, and cloud document URLs.
        /// </summary>
        public bool AllowGoogleCloudLinking { get; set; } = true;

        /// <summary>
        /// When false, only appointed group Leaders/Secretaries and Workspace Admins can submit official meeting reports.
        /// When true, any active member of the group can submit a report.
        /// </summary>
        public bool AllowAnyMemberReportSubmission { get; set; } = false;

        /// <summary>
        /// Maximum file upload size in megabytes for report documents and extra-info attachments.
        /// </summary>
        public int MaxUploadSizeMb { get; set; } = 25;

        /// <summary>
        /// Cadence for automated report submission reminders ("None", "Weekly", "BiWeekly", "Monthly").
        /// </summary>
        [Required]
        [StringLength(32)]
        public string ReportReminderCadence { get; set; } = "Monthly";

        /// <summary>
        /// JSON array defining optional structured numeric metrics captured on meeting reports (e.g. [{"key":"visitors","label":"Visitors","unit":"People"}]).
        /// </summary>
        public string? CustomReportMetricsJson { get; set; }

        /// <summary>
        /// UTC timestamp when the settings record was first created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the settings record was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents a standalone Committee, Group, Ministry, Chapter, or nested Sub-Group within <c>bcp-committees</c>.
    /// Completely decoupled from chat channels so the capability operates with 100% module independence.
    /// Table: [dbo].[BcpCommittees]
    /// </summary>
    public class BcpCommittee
    {
        /// <summary>
        /// Unique primary key identifier for the committee or sub-group.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Optional parent committee ID when this record represents a nested Sub-Group / Unit.
        /// </summary>
        public Guid? ParentCommitteeId { get; set; }

        /// <summary>
        /// Navigation reference to the parent committee when nested.
        /// </summary>
        [ForeignKey(nameof(ParentCommitteeId))]
        public BcpCommittee? ParentCommittee { get; set; }

        /// <summary>
        /// Child sub-groups belonging to this parent committee.
        /// </summary>
        public ICollection<BcpCommittee> SubGroups { get; set; } = new List<BcpCommittee>();

        /// <summary>
        /// Display name of the committee or sub-group.
        /// </summary>
        [Required]
        [StringLength(160)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// URL-safe unique slug used for clean external registration links (e.g. "finance-committee" or "lead-actors").
        /// </summary>
        [Required]
        [StringLength(180)]
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// Optional short reference code (e.g. "COM-01" or "ACT-MAIN").
        /// </summary>
        [StringLength(40)]
        public string? Code { get; set; }

        /// <summary>
        /// Classification tag or division label (e.g. "Governance", "Operations", "Creative", "Technical").
        /// </summary>
        [StringLength(100)]
        public string? CategoryTag { get; set; }

        /// <summary>
        /// Detailed overview explaining the purpose, mandate, and expectations of the group.
        /// </summary>
        [StringLength(2000)]
        public string? Description { get; set; }

        /// <summary>
        /// Concise mission statement displayed on the member hub and external registration landing banner.
        /// </summary>
        [StringLength(500)]
        public string? MissionStatement { get; set; }

        /// <summary>
        /// Human-readable meeting cadence (e.g. "Every Thursday at 4:00 PM").
        /// </summary>
        [StringLength(200)]
        public string? MeetingSchedule { get; set; }

        /// <summary>
        /// Physical room or virtual meeting URL (Google Meet, Zoom, Teams, or Hall name).
        /// </summary>
        [StringLength(500)]
        public string? MeetingLocationOrLink { get; set; }

        /// <summary>
        /// Optional header cover image URL.
        /// </summary>
        [StringLength(600)]
        public string? CoverBannerUrl { get; set; }

        /// <summary>
        /// Google Material Symbols icon identifier (defaults to "diversity_3").
        /// </summary>
        [Required]
        [StringLength(60)]
        public string IconName { get; set; } = "diversity_3";

        /// <summary>
        /// Discovery &amp; access tier: "Public" (open join), "ApprovalRequired" (moderated), or "Private" (invite-only).
        /// </summary>
        [Required]
        [StringLength(32)]
        public string Visibility { get; set; } = "Public";

        /// <summary>
        /// Operational lifecycle status: "Active", "Suspended", or "Archived".
        /// </summary>
        [Required]
        [StringLength(32)]
        public string Status { get; set; } = "Active";

        /// <summary>
        /// Optional maximum member roster limit (null = unlimited).
        /// </summary>
        public int? MaxCapacity { get; set; }

        /// <summary>
        /// Enables or disables external public registration via the group's shareable link.
        /// </summary>
        public bool AllowExternalRegistration { get; set; } = true;

        /// <summary>
        /// Requires admin or delegated group leader approval before an applicant joins the active roster.
        /// </summary>
        public bool RequireApproval { get; set; } = false;

        /// <summary>
        /// Shareable security token appended to private invite links when needed.
        /// </summary>
        [StringLength(80)]
        public string? ExternalInviteToken { get; set; }

        /// <summary>
        /// Optional foreign key pointing to the supplemental Extra-Info Form attached to this group.
        /// </summary>
        public Guid? ExtraInfoFormId { get; set; }

        /// <summary>
        /// Navigation reference to the group's supplemental Extra-Info Form.
        /// </summary>
        [ForeignKey(nameof(ExtraInfoFormId))]
        public BcpCommitteeForm? ExtraInfoForm { get; set; }

        /// <summary>
        /// User ID of the administrator who created this group.
        /// </summary>
        [StringLength(100)]
        public string? CreatedByUserId { get; set; }

        /// <summary>
        /// UTC timestamp when the group was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the group was last modified.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Enrolled members belonging to this committee or sub-group.
        /// </summary>
        public ICollection<BcpCommitteeMember> Members { get; set; } = new List<BcpCommitteeMember>();

        /// <summary>
        /// Meeting reports and minutes submitted for this committee or sub-group.
        /// </summary>
        public ICollection<BcpCommitteeReport> Reports { get; set; } = new List<BcpCommitteeReport>();

        /// <summary>
        /// Internal and external join registrations submitted for this committee or sub-group.
        /// </summary>
        public ICollection<BcpCommitteeRegistration> Registrations { get; set; } = new List<BcpCommitteeRegistration>();

        /// <summary>
        /// Shared cloud notebooks, Google Docs, and Google Sheets pinned to this committee's shelf.
        /// </summary>
        public ICollection<BcpCommitteeCloudDocument> CloudDocuments { get; set; } = new List<BcpCommitteeCloudDocument>();
    }

    /// <summary>
    /// Represents a workspace user's membership and delegated micro-role inside a <see cref="BcpCommittee"/>.
    /// Table: [dbo].[BcpCommitteeMembers]
    /// </summary>
    public class BcpCommitteeMember
    {
        /// <summary>
        /// Unique primary key identifier for the roster membership record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Foreign key referencing the parent <see cref="BcpCommittee"/>.
        /// </summary>
        [Required]
        public Guid CommitteeId { get; set; }

        /// <summary>
        /// Navigation reference to the parent committee.
        /// </summary>
        [ForeignKey(nameof(CommitteeId))]
        public BcpCommittee? Committee { get; set; }

        /// <summary>
        /// Foreign key referencing <see cref="Profile.Id"/> in the tenant identity table.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserProfileId { get; set; } = string.Empty;

        /// <summary>
        /// Navigation reference to the workspace user profile.
        /// </summary>
        [ForeignKey(nameof(UserProfileId))]
        public Profile? UserProfile { get; set; }

        /// <summary>
        /// Delegated micro-role within the group: "Chairperson", "CoChair", "Secretary", "Coordinator", or "Member".
        /// Leaders ("Chairperson", "CoChair", "Secretary", "Coordinator") can manage attendance, submit reports, and review group applicants.
        /// </summary>
        [Required]
        [StringLength(40)]
        public string Role { get; set; } = "Member";

        /// <summary>
        /// Optional custom badge or portfolio title within the group (e.g. "Lead Vocalist", "Audit Lead", "Stage Lighting").
        /// </summary>
        [StringLength(120)]
        public string? CustomRoleTitle { get; set; }

        /// <summary>
        /// Serialized JSON dictionary of the supplemental Extra-Info answers provided upon joining.
        /// </summary>
        public string? ExtraInfoResponsesJson { get; set; }

        /// <summary>
        /// Membership status: "Active", "Suspended", or "Inactive".
        /// </summary>
        [Required]
        [StringLength(32)]
        public string Status { get; set; } = "Active";

        /// <summary>
        /// User ID of the admin or leader who added/approved the member.
        /// </summary>
        [StringLength(100)]
        public string? AddedByUserId { get; set; }

        /// <summary>
        /// UTC timestamp when the user joined the committee.
        /// </summary>
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Self-contained dynamic supplemental form schema for <c>bcp-committees</c>.
    /// Captures ONLY extra committee-specific fields beyond core user identity (FirstName, LastName, Email, Phone).
    /// Table: [dbo].[BcpCommitteeForms]
    /// </summary>
    public class BcpCommitteeForm
    {
        /// <summary>
        /// Unique primary key identifier for the supplemental form.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Display title of the supplemental form (e.g. "Audition &amp; Skillset Questionnaire").
        /// </summary>
        [Required]
        [StringLength(180)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Helpful instructions shown above the form fields during internal join or external registration.
        /// </summary>
        [StringLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// Indicates whether this form serves as the workspace-wide default when a group has no specific form assigned.
        /// </summary>
        public bool IsGlobalDefault { get; set; } = false;

        /// <summary>
        /// Indicates whether the form is currently active for intake.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// JSON array of field definitions:
        /// <c>[{ "id": "...", "key": "skills", "label": "Primary Skills", "type": "select|multiselect|text|textarea|number|date|url|file|checkbox", "placeholder": "...", "required": true, "options": ["..."], "helpText": "..." }]</c>.
        /// </summary>
        [Required]
        public string FieldsSchemaJson { get; set; } = "[]";

        /// <summary>
        /// User ID of the administrator who created the form.
        /// </summary>
        [StringLength(100)]
        public string? CreatedByUserId { get; set; }

        /// <summary>
        /// UTC timestamp when the form was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the form was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Stores internal member join requests and external public link applications for a <see cref="BcpCommittee"/>.
    /// Table: [dbo].[BcpCommitteeRegistrations]
    /// </summary>
    public class BcpCommitteeRegistration
    {
        /// <summary>
        /// Unique primary key identifier for the registration application.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Target committee ID the applicant is registering to join.
        /// </summary>
        [Required]
        public Guid CommitteeId { get; set; }

        /// <summary>
        /// Navigation reference to the target committee.
        /// </summary>
        [ForeignKey(nameof(CommitteeId))]
        public BcpCommittee? Committee { get; set; }

        /// <summary>
        /// Populated if the applicant is already an existing workspace user (signed in or matched by email).
        /// </summary>
        [StringLength(100)]
        public string? ApplicantUserProfileId { get; set; }

        /// <summary>
        /// True when submitted via the standalone public/external registration link; false when submitted from inside Member Workspace.
        /// </summary>
        public bool IsExternalApplicant { get; set; } = false;

        /// <summary>
        /// Applicant's first name (resolved from Profile for signed-in users or entered on external link).
        /// </summary>
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Applicant's last name (resolved from Profile for signed-in users or entered on external link).
        /// </summary>
        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Applicant's email address used for smart profile matching and status notifications.
        /// </summary>
        [Required]
        [StringLength(200)]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Applicant's phone number.
        /// </summary>
        [StringLength(50)]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Serialized JSON object mapping Extra-Info field keys/labels to the applicant's submitted answers.
        /// </summary>
        public string? ExtraInfoResponsesJson { get; set; }

        /// <summary>
        /// Serialized JSON array of uploaded file attachments submitted with the registration.
        /// </summary>
        public string? AttachmentUrlsJson { get; set; }

        /// <summary>
        /// Workflow review status: "Pending", "Approved", "Declined", or "Reassigned".
        /// </summary>
        [Required]
        [StringLength(32)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Optional reviewer notes explaining approval, reassignment, or decline reason.
        /// </summary>
        [StringLength(1000)]
        public string? ReviewNotes { get; set; }

        /// <summary>
        /// User ID of the administrator or group leader who reviewed the application.
        /// </summary>
        [StringLength(100)]
        public string? ReviewedByUserId { get; set; }

        /// <summary>
        /// UTC timestamp when the application was reviewed.
        /// </summary>
        public DateTime? ReviewedAt { get; set; }

        /// <summary>
        /// UTC timestamp when the application was submitted.
        /// </summary>
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents a multi-modal Meeting Report / Minutes entry for a <see cref="BcpCommittee"/>,
    /// supporting rich typed minutes, attendance roll-call, action items, file uploads, and linked Google Docs / Sheets / Notebooks.
    /// Table: [dbo].[BcpCommitteeReports]
    /// </summary>
    public class BcpCommitteeReport
    {
        /// <summary>
        /// Unique primary key identifier for the meeting report.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Foreign key referencing the <see cref="BcpCommittee"/> this report belongs to.
        /// </summary>
        [Required]
        public Guid CommitteeId { get; set; }

        /// <summary>
        /// Navigation reference to the parent committee.
        /// </summary>
        [ForeignKey(nameof(CommitteeId))]
        public BcpCommittee? Committee { get; set; }

        /// <summary>
        /// User Profile ID of the author who submitted the report.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string SubmittedByUserId { get; set; } = string.Empty;

        /// <summary>
        /// Snapshot display name of the report author.
        /// </summary>
        [Required]
        [StringLength(200)]
        public string SubmittedByName { get; set; } = string.Empty;

        /// <summary>
        /// Headline title of the meeting or activity report (e.g. "Q4 Budget Planning &amp; Rehearsal Minutes").
        /// </summary>
        [Required]
        [StringLength(240)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Date and time when the meeting or activity took place.
        /// </summary>
        public DateTime MeetingDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Brief executive summary of the meeting outcome.
        /// </summary>
        [StringLength(1500)]
        public string? Summary { get; set; }

        /// <summary>
        /// Full rich-text / formatted meeting minutes typed directly inside the app.
        /// </summary>
        public string? RichMinutesContent { get; set; }

        /// <summary>
        /// Key resolutions or decisions agreed upon during the session.
        /// </summary>
        public string? DecisionsText { get; set; }

        /// <summary>
        /// JSON array of assigned follow-up action items:
        /// <c>[{ "id": "...", "task": "...", "assigneeUserId": "...", "assigneeName": "...", "dueDate": "...", "status": "Pending|Done" }]</c>.
        /// </summary>
        public string? ActionItemsJson { get; set; }

        /// <summary>
        /// JSON array recording member roll-call attendance:
        /// <c>[{ "userId": "...", "fullName": "...", "status": "Present|Excused|Absent" }]</c>.
        /// </summary>
        public string? AttendanceRollCallJson { get; set; }

        /// <summary>
        /// Total members marked Present in this session.
        /// </summary>
        public int PresentCount { get; set; }

        /// <summary>
        /// Total members marked Excused in this session.
        /// </summary>
        public int ExcusedCount { get; set; }

        /// <summary>
        /// Total members marked Absent in this session.
        /// </summary>
        public int AbsentCount { get; set; }

        /// <summary>
        /// JSON dictionary storing optional custom numeric KPI metric values configured in <see cref="BcpCommitteeSettings.CustomReportMetricsJson"/>.
        /// </summary>
        public string? CustomMetricsValuesJson { get; set; }

        /// <summary>
        /// JSON array of uploaded static files (PDF, DOCX, XLSX, Images, Audio):
        /// <c>[{ "fileName": "...", "fileUrl": "...", "fileType": "...", "sizeBytes": 1024 }]</c>.
        /// </summary>
        public string? UploadedFilesJson { get; set; }

        /// <summary>
        /// JSON array of connected live cloud documents (Google Docs, Google Sheets, Google Notebooks, Excel Online, Notion):
        /// <c>[{ "id": "...", "provider": "GoogleDocs|GoogleSheets|GoogleNotebook|ExcelOnline|...", "title": "...", "url": "...", "embedUrl": "...", "ownerEmail": "..." }]</c>.
        /// </summary>
        public string? CloudLinksJson { get; set; }

        /// <summary>
        /// Ozi AI generated executive digest summarizing key takeaways, blockers, and action items.
        /// </summary>
        public string? AiExecutiveDigest { get; set; }

        /// <summary>
        /// Administrative review status: "Submitted", "Reviewed", or "ActionNeeded".
        /// </summary>
        [Required]
        [StringLength(32)]
        public string ReviewStatus { get; set; } = "Submitted";

        /// <summary>
        /// Official remarks or feedback recorded by an administrator upon reviewing the report.
        /// </summary>
        [StringLength(1500)]
        public string? AdminRemarks { get; set; }

        /// <summary>
        /// User ID of the administrator who reviewed the report.
        /// </summary>
        [StringLength(100)]
        public string? ReviewedByUserId { get; set; }

        /// <summary>
        /// UTC timestamp when the report was reviewed by administration.
        /// </summary>
        public DateTime? ReviewedAt { get; set; }

        /// <summary>
        /// Controls whether ordinary members of the group can read this report inside the Member Workspace.
        /// </summary>
        public bool IsSharedWithMembers { get; set; } = true;

        /// <summary>
        /// UTC timestamp when the report was submitted.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the report was last updated.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Stores live cloud documents (Google Docs, Google Sheets, Google Notebooks, Excel Online, OneNote, Notion)
    /// linked by a member or leader via Google OAuth Picker or direct cloud URL, optionally pinned to a committee's shelf.
    /// Table: [dbo].[BcpCommitteeCloudDocuments]
    /// </summary>
    public class BcpCommitteeCloudDocument
    {
        /// <summary>
        /// Unique primary key identifier for the linked cloud document.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Optional committee ID when pinned directly to a committee's shared document shelf.
        /// </summary>
        public Guid? CommitteeId { get; set; }

        /// <summary>
        /// Navigation reference to the committee when pinned to a group shelf.
        /// </summary>
        [ForeignKey(nameof(CommitteeId))]
        public BcpCommittee? Committee { get; set; }

        /// <summary>
        /// Optional report ID if this cloud link was attached during a specific meeting report submission.
        /// </summary>
        public Guid? ReportId { get; set; }

        /// <summary>
        /// Workspace User Profile ID of the member/leader who connected and linked the document.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string OwnerUserProfileId { get; set; } = string.Empty;

        /// <summary>
        /// Snapshot display name of the member who linked the document.
        /// </summary>
        [StringLength(200)]
        public string? OwnerDisplayName { get; set; }

        /// <summary>
        /// Cloud platform provider: "GoogleDocs", "GoogleSheets", "GoogleSlides", "GoogleNotebook", "GoogleDrive", "ExcelOnline", "OneNote", "Notion", or "CloudLink".
        /// </summary>
        [Required]
        [StringLength(40)]
        public string Provider { get; set; } = "GoogleDocs";

        /// <summary>
        /// Document title fetched from Google Picker or entered by the user.
        /// </summary>
        [Required]
        [StringLength(260)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Canonical open/edit URL of the cloud document.
        /// </summary>
        [Required]
        [StringLength(1000)]
        public string DocumentUrl { get; set; } = string.Empty;

        /// <summary>
        /// Sanitized iframe-compatible preview URL for inline viewing inside Ozikol BCC.
        /// </summary>
        [StringLength(1000)]
        public string? EmbedUrl { get; set; }

        /// <summary>
        /// Optional external Google Drive file ID returned by Google Picker.
        /// </summary>
        [StringLength(160)]
        public string? ExternalFileId { get; set; }

        /// <summary>
        /// Connected Google or Microsoft account email used when linking via OAuth Picker.
        /// </summary>
        [StringLength(200)]
        public string? ConnectedAccountEmail { get; set; }

        /// <summary>
        /// Indicates whether this cloud document is pinned to the committee's permanent shared notebook/docs shelf.
        /// </summary>
        public bool IsPinnedToShelf { get; set; } = true;

        /// <summary>
        /// UTC timestamp when the cloud document metadata was last synced or verified.
        /// </summary>
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the cloud document was linked.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

