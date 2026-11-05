using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Web;

namespace Ozikol_BCC.Domain.Enum
{
    /// <summary>
    /// Shared domain enumerations. These values are persisted in the database,
    /// so changing names or numeric values can affect existing tenant data and migrations.
    /// </summary>
    public class Enum
    {
        public enum EmailLogStatus
        {
            [Description("Pending")]
            Pending = 0,

            [Description("Sent")]
            Sent = 1,

            [Description("Failed")]
            Failed = 2
        }

        /// <summary>
        /// Separates broad Identity roles between legacy dashboard access,
        /// BCP platform access, or roles that are valid in both surfaces.
        /// </summary>
        public enum RoleCategory
        {
            [Description("Legacy Dashboard Only")]
            Legacy = 0,

            [Description("BCP Platform Only")]
            BCP = 1,

            [Description("Both Legacy and BCP")]
            Both = 2
        }

        public enum PhaseStatus
        {
            [Description("Upcoming")]
            Upcoming = 0,
            
            [Description("In Progress")]
            InProgress = 1,
            
            [Description("Done")]
            Done = 2
        }

        public enum VotingStatus
        {
            [Description("None")]
            None = 0,

            [Description("Upcoming")]
            Upcoming = 2,

            [Description("Completed")]
            Completed = 3,

            [Description("Terminated")]
            Terminated = 4,


        }

        public enum ElectionType
        {
            [Description("Closed Election (Requires Accreditation)")]
            Closed = 0,

            [Description("Open Election (No Accreditation)")]
            Open = 1
        }
        public enum SenderIdStatus
        {
            Pending = 1,
            Failed = 2,
            Sent = 3,
            Draft = 4,
            Scheduled = 5
        }
        public enum MessageStatus
        {
            Pending = 1,
            Failed = 2,
            Sent = 3,
            Draft = 4,
            Scheduled = 5
        }
        public enum UserVoteStatus
        {
            [Description("None")]
            None = 0,

            [Description("Verified")]
            Verified = 2,

            [Description("Cancelled")]
            Cancelled = 3, 

        }
        public enum ParticipantStatus
        {
            [Description("None")]
            None = 0,

            [Description("Active")]
            Active = 2,

            [Description("Completed")]
            Completed = 3,

            [Description("Terminated")]
            Terminated = 4,
            [Description("Deleted")]
            Deleted = 5,


        }
        public enum EventType
        {

            [Description("NONE")]
            NONE = 0,
            [Description("Timetable")]
            Timetable = 2,
            [Description("Event")]
            Event = 3,

        }
        public enum ContentStatus
        {

            [Description("NONE")]
            NONE = 0,
            [Description("IsBold")]
            IsBold = 2,
            [Description("IsRed")]
            IsRed = 3,

        }
        public enum ContentEnumType
        {

            [Description("NONE")]
            NONE = 0,
            [Description("IsSingle")]
            IsSingle = 2,

        }

        public enum ResultType
        {
            
            [Description("YesNo")]
            YesNo = 0,

            [Description("Text")]
            Text = 3,
             

        }
        public enum CourseStatus
        {
            [Description("None")]
            None = 0,

            [Description("Active")]
            Active = 2,

            [Description("Concluded")]
            Concluded = 3,

            [Description("Upcoming")]
            Upcoming = 4,


        }
        public enum AccomodationUpdateStatus
        {
            [Description("None")]
            None = 0,

            [Description("Request")]
            Request = 2,

            [Description("Allocated")]
            Allocated = 3,
             
        }
        public enum MailSender
        {
            [Description("None")]
            None = 0,

            [Description("Outlook")]
            Outlook = 2,

            [Description("Google")]
            Google = 3,

            [Description("Webmail")]
            Webmail = 4,
             

        }
        public enum Priority
        {
            [Description("None")]
            None = 0,

            [Description("Emergency")]
            Emergency = 2,

            [Description("High")]
            High = 3,

            [Description("Medium")]
            Medium = 4,

            [Description("Low")]
            Low = 5,


        }
        public enum XProjectTaskStatus
        {
            [Description("None")]
            None = 0,

            [Description("Fail")]
            Fail = 1,

            [Description("Success")]
            Success = 2,

             

        }
        public enum EmailType
        {
            [Description("None")]
            None = 0,

            [Description("ChangeEmail")]
            ChangeEmail = 2,

            [Description("VerifyEmail")]
            VerifyEmail = 3,


        }
        public enum RibonPosition
        {
            [Description("None")]
            None = 0,

            [Description("Top")]
            Top = 2,

            [Description("BeforeMenu")]
            BeforeMenu = 3,
            [Description("AfterMenu")]
            AfterMenu = 4,
            [Description("AfterSlider")]
            AfterSlider = 5,
            [Description("BeforeFooter")]
            BeforeFooter = 6,

            [Description("AfterFooter")]
            AfterFooter = 7,
        }
        public enum DOBStatus
        {
            Public = 1,
            Private = 2,
        }
        public enum GenderStatus
        {
            Male = 0,
            Female = 1,
        }
        public enum ModalTime
        {
            [Description("None")]
            None = 0,

            [Description("Daily")]
            Daily = 2,

            [Description("Weekly")]
            Weekly = 3,

            [Description("Hourly")]
            Hourly = 4,

        }
        public enum ModalOccurance
        {
            [Description("None")]
            None = 0,

            [Description("Once")]
            Once = 2,

            [Description("Repeated")]
            Repeated = 3,

        }
        public enum ProjectStatus
        {
            [Description("Pending")]
            Pending = 0,
            [Description("Active")]
            Active = 1,

            [Description("Completed")]
            Completed = 2,

            [Description("Suspended")]
            Suspended = 3,

        }
        public enum TaskType
        {
            [Description("Idea")]
            Idea = 0,

            [Description("New")]
            New = 2,

            [Description("BackDrop")]
            BackDrop = 3,

        }
        public enum ProjectTaskStatus
        {
            [Description("ToDo")]
            ToDo = 0,

            [Description("Doing")]
            Doing = 2,

            [Description("Done")]
            Done = 3,

        }

        public enum ProjectFeatureStatus
        {
            [Description("Inprogress")]
            Inprogress = 0,

            [Description("Completed")]
            Completed = 2,

            [Description("Upgrading")]
            Upgrading = 3,
            [Description("Suspended")]
            Suspended = 4,
        }
        public enum PropertyStatus
        {
            [Description("None")]
            None = 0,

            [Description("Publish")]
            Publish = 2,

            [Description("Unpublish")]
            Unpublish = 3,

        }
        public enum BlogSectionPosition
        {
            [Description("BeforeRecentPost")]
            BeforeRecentPost = 0,

            [Description("Bottom")]
            Bottom = 2,
            [Description("Middle")]
            Middle = 3,

        }
        public enum MenuSortFrom
        {
            [Description("Left")]
            left = 0,

            [Description("Right")]
            Right = 2,

        }
        /// <summary>
        /// High-level user lifecycle state used by identity, workspace access,
        /// and user-management dashboards.
        /// </summary>
        public enum UserStatus
        {
            [Description("Pending")]
            Pending = 0,

            [Description("Active")]
            Active = 2,
            [Description("Suspended")]
            Suspended = 3,

            [Description("Leave")]
            Leave = 4,
            [Description("Deleted")]
            Deleted = 6,
        }
        public enum PaymentStatus
        {
            Pending = 0,
            Success = 1,
            Failed = 2
        }
        public enum PagePosition
        {
            [Description("None")]
            None = 0,

            [Description("Top")]
            Top = 2,

            [Description("Menu")]
            Menu = 3,
            [Description("Footer")]
            Footer = 4,
        }

        /// <summary>
        /// Defines explicit horizontal zone or tier positioning of a page or category in website navigation menus.
        /// Grouped first by MenuPosition, then sorted by SortOrder within that group.
        /// </summary>
        public enum MenuPosition
        {
            [Description("First / Left Zone")]
            First = 1,

            [Description("Middle / Center Zone")]
            Middle = 2,

            [Description("Last / Right Zone")]
            Last = 3,

            [Description("Top Utility Bar")]
            Top = 4
        }
        public enum AttendanceStatus
        {
            [Description("None")]
            None = 0,

            [Description("Present")]
            Present = 2,

            [Description("Absent")]
            Absent = 3,
            [Description("Late")]
            Late = 4
        }
        public enum PeriodStatus
        {
            [Description("None")]
            None = 0,

            [Description("Early")]
            Early = 2,

            [Description("Ontime")]
            Ontime = 3,

            [Description("Late")]
            Late = 5,

            [Description("VeryLate")]
            VeryLate = 7
        }
        public enum TrainingStatus
        {
            [Description("None")]
            None = 0,

            [Description("Done")]
            Done = 2,

            [Description("Canceled")]
            Canceled = 3,
            [Description("Bcpsed")]
            Bcpsed = 8,

        }
        public enum FundStatus
        {
            [Description("Success")]
            Success = 2,

            [Description("Failed")]
            Failed = 3,
            [Description("Pending")]
            Pending = 4,

        }

        public enum ProposalStatus
        {
            [Description("Draft")]
            Draft = 0,

            [Description("Pending")]
            Pending = 1,

            [Description("Approved")]
            Approved = 2,

            [Description("Failed")]
            Failed = 3,

            [Description("Under Review")]
            UnderReview = 4,

            [Description("Rejected")]
            Rejected = 5,

            [Description("Submitted")]
            Submitted = 6
        }
        public enum FundType
        {
            [Description("Credit")]
            Credit = 2,

            [Description("Debit")]
            Debit = 3,

        }
        public enum FundMeans
        {
            [Description("Transfer")]
            Transfer = 2,

            [Description("Cash")]
            Cash = 3,
            [Description("Check")]
            Check = 4,
        }
        public enum ReportPeriodStatus
        {
            [Description("None")]
            None = 0,

            [Description("Early")]
            Early = 2,

            [Description("Ontime")]
            Ontime = 3,

            [Description("Late")]
            Late = 5,

            [Description("VeryLate")]
            VeryLate = 7
        }
        public enum ReportStatus
        {
            [Description("None")]
            None = 0,

            [Description("Submitted")]
            Submitted = 2,
            [Description("Failed")]
            Failed = 3,
            [Description("NoReport")]
            NoReport = 4,
        }
        public enum VerificationStatus
        {
            [Description("Pending")]
            Pending = 0,

            [Description("Verified")]
            Verified = 2,

        }
        public enum TaskNoteStatus
        {
            [Description("None")]
            None = 0,

            [Description("Active")]
            Active = 2,

        }
        public enum Gender
        {
            [Description("Male")]
            Male = 0,

            [Description("Female")]
            Female = 2,

        }

        /// <summary>
        /// BCP: Defines the action level a user has within a specific feature Area.
        /// GlobalEditor = full CRUD rights across all features they are assigned to.
        /// FeatureEditor = full CRUD rights only within a specific feature.
        /// Readonly = can view data only — all Create/Edit/Delete buttons are hidden.
        /// </summary>
        public enum BcpActionRole
        {
            [Description("Global Editor")]
            GlobalEditor = 1,

            [Description("Feature Editor")]
            FeatureEditor = 2,

            [Description("Read Only")]
            Readonly = 3,
        }

        /// <summary>
        /// Categorizes user authority roles into broad system & organization governance
        /// or modular capability feature authorities.
        /// </summary>
        public enum RoleGroup
        {
            [Description("System & Organization Governance")]
            System = 1,

            [Description("Modular Feature Authority")]
            Feature = 2
        }

        /// <summary>
        /// Billing cadence attached to a BCP feature subscription or purchase.
        /// </summary>
        public enum FeatureBillingDuration
        {
            [Description("Monthly")]
            Monthly = 1,

            [Description("Yearly")]
            Yearly = 2,

            [Description("One-Time")]
            OneTime = 3,
            
            [Description("Free")]
            Free = 4
        }

        /// <summary>
        /// Tenant-facing feature lifecycle. Disabled and suspended features should
        /// be hidden or blocked even if a user has a role assignment.
        /// </summary>
        public enum FeatureBillingStatus
        {
            [Description("Disabled")]
            Disabled = 0,

            [Description("Active")]
            Active = 1,

            [Description("Suspended")]
            Suspended = 2
        }

        public enum PaymentFrequency
        {
            [Description("One-Time")]
            OneTime = 0,

            [Description("Daily")]
            Daily = 1,

            [Description("Weekly")]
            Weekly = 2,

            [Description("Monthly")]
            Monthly = 3,

            [Description("Yearly")]
            Yearly = 4
        }

        public enum JobStatus
        {
            [Description("Draft")]
            Draft = 0,
            
            [Description("Published")]
            Published = 1,
            
            [Description("Closed")]
            Closed = 2
        }

        public enum JobType
        {
            [Description("Full-Time")]
            FullTime = 0,
            
            [Description("Part-Time")]
            PartTime = 1,
            
            [Description("Contract")]
            Contract = 2,
            
            [Description("Internship")]
            Internship = 3
        }

        public enum ApplicationStatus
        {
            [Description("Applied")]
            Applied = 0,
            
            [Description("CV Screening")]
            CVScreening = 1,
            
            [Description("Phone Screening")]
            PhoneScreening = 2,
            
            [Description("Online Interview")]
            OnlineInterview = 3,
            
            [Description("Offline Interview")]
            OfflineInterview = 4,
            
            [Description("Background Check")]
            BackgroundCheck = 5,
            
            [Description("Offered")]
            Offered = 6,
            
            [Description("Rejected")]
            Rejected = 7,

            [Description("Employed")]
            Employed = 8
        }

        public enum InterviewType
        {
            [Description("Online Video")]
            OnlineVideo = 0,
            
            [Description("Offline Physical")]
            OfflinePhysical = 1,
            
            [Description("Phone Call")]
            PhoneCall = 2
        }

        /// <summary>
        /// BCP voting mode. Closed elections require voter accreditation;
        /// public polls can be exposed without a signed-in Profile.
        /// </summary>
        public enum BcpElectionType
        {
            [Description("Closed Election (Requires Accreditation)")]
            Closed = 0,

            [Description("Open Election (No Accreditation)")]
            Open = 1,

            [Description("Public Poll (No Login Required)")]
            Public = 2
        }

        /// <summary>
        /// BCP election lifecycle state used to open, close, or archive voting.
        /// </summary>
        public enum BcpVotingStatus
        {
            [Description("Upcoming")]
            Upcoming = 0,

            [Description("Active")]
            Active = 1,

            [Description("Completed")]
            Completed = 2,

            [Description("Terminated")]
            Terminated = 3
        }

        public enum BcpEquipmentStatus
        {
            [Description("Available")]
            Available = 0,

            [Description("In Use")]
            InUse = 1,

            [Description("Maintenance")]
            Maintenance = 2,

            [Description("Retired")]
            Retired = 3
        }

        // --- BCP PROJECTS AGILE ENUMS ---

        /// <summary>
        /// Project lifecycle state for BCP project dashboards.
        /// </summary>
        public enum BcpProjectStatus
        {
            [Description("Active")]
            Active = 0,
            [Description("Completed")]
            Completed = 1,
            [Description("On Hold")]
            OnHold = 2
        }

        /// <summary>
        /// Sprint lifecycle state for agile project planning.
        /// </summary>
        public enum BcpSprintStatus
        {
            [Description("Planned")]
            Planned = 0,
            [Description("Active")]
            Active = 1,
            [Description("Closed")]
            Closed = 2
        }

        /// <summary>
        /// Type of BCP project work item.
        /// </summary>
        public enum BcpTaskType
        {
            [Description("Task")]
            Task = 0,
            [Description("User Story")]
            Story = 1,
            [Description("Bug")]
            Bug = 2,
            [Description("Epic")]
            Epic = 3
        }

        /// <summary>
        /// Workflow state for BCP project tasks.
        /// </summary>
        public enum BcpTaskStatus
        {
            [Description("To Do")]
            ToDo = 0,
            [Description("In Progress")]
            InProgress = 1,
            [Description("Review")]
            Review = 2,
            [Description("Done")]
            Done = 3
        }

        /// <summary>
        /// Priority level for BCP project tasks.
        /// </summary>
        public enum BcpTaskPriority
        {
            [Description("Low")]
            Low = 0,
            [Description("Medium")]
            Medium = 1,
            [Description("High")]
            High = 2,
            [Description("Critical")]
            Critical = 3
        }

        // --- BCP SMART ASSIST AI ENUMS ---

        public enum BcpAiProvider
        {
            [Description("None (Disabled)")]
            None = 0,
            [Description("Google Gemini")]
            Gemini = 1,
            [Description("OpenAI (ChatGPT)")]
            OpenAI = 2,
            [Description("Anthropic (Claude)")]
            Anthropic = 3
        }

        // --- BCP MASS COMM ENUMS ---

        /// <summary>
        /// Wallet transaction direction/type for communication credits.
        /// </summary>
        public enum BcpWalletTransactionType
        {
            [Description("Credit")]
            Credit = 0,
            [Description("Debit")]
            Debit = 1,
            [Description("Transfer")]
            Transfer = 2
        }

        /// <summary>
        /// SMS campaign lifecycle state used by schedulers and delivery dashboards.
        /// </summary>
        public enum BcpSmsCampaignStatus
        {
            [Description("Draft")]
            Draft = 0,
            [Description("Scheduled")]
            Scheduled = 1,
            [Description("Sending")]
            Sending = 2,
            [Description("Completed")]
            Completed = 3,
            [Description("Failed")]
            Failed = 4,
            [Description("Pending")]
            Pending = 5
        }

        /// <summary>
        /// Per-recipient SMS delivery state.
        /// </summary>
        public enum BcpSmsDeliveryStatus
        {
            [Description("Pending")]
            Pending = 0,
            [Description("Sent")]
            Sent = 1,
            [Description("Failed")]
            Failed = 2
        }

        /// <summary>
        /// Approval state for tenant SMS sender IDs.
        /// </summary>
        public enum BcpSenderIdStatus
        {
            [Description("Pending")]
            Pending = 0,
            [Description("Active")]
            Active = 1,
            [Description("Rejected")]
            Rejected = 2
        }

        // --- BCP NEWSLETTER ENUMS ---
        
        /// <summary>
        /// Newsletter campaign lifecycle state used by schedulers and delivery dashboards.
        /// </summary>
        public enum BcpNewsletterCampaignStatus
        {
            [Description("Draft")]
            Draft = 0,
            [Description("Scheduled")]
            Scheduled = 1,
            [Description("Sending")]
            Sending = 2,
            [Description("Completed")]
            Completed = 3,
            [Description("Failed")]
            Failed = 4,
            [Description("Pending")]
            Pending = 5
        }

        /// <summary>
        /// Per-recipient newsletter delivery state.
        /// </summary>
        public enum BcpNewsletterDeliveryStatus
        {
            [Description("Pending")]
            Pending = 0,
            [Description("Sent")]
            Sent = 1,
            [Description("Failed")]
            Failed = 2
        }

        public enum LeaveRequestType
        {
            [Description("Annual Leave")]
            AnnualLeave = 1,

            [Description("Sick Leave")]
            SickLeave = 2,

            [Description("Maternity / Paternity Leave")]
            MaternityLeave = 3,

            [Description("Casual Leave")]
            CasualLeave = 4,

            [Description("Excuse from Duty")]
            ExcuseDuty = 5,

            [Description("Late to Work")]
            LateToWork = 6,

            [Description("Other")]
            Other = 7
        }

        public enum LeaveRequestStatus
        {
            [Description("Pending")]
            Pending = 0,

            [Description("Approved")]
            Approved = 1,

            [Description("Denied")]
            Denied = 2
        }

        public enum CaptchaType
        {
            [Description("None")]
            None = 0,

            [Description("Arithmetic Captcha")]
            Arithmetic = 1,

            [Description("Google reCAPTCHA")]
            GoogleRecaptcha = 2
        }

        public enum NotificationStatus
        {
            [Description("NotDefind")]
            NotDefind = 0,
            [Description("Sent")]
            Sent = 1,
            [Description("NotSent")]
            NotSent = 2,
        }

        public enum NotificationType
        {
            [Description("NotDefind")]
            NotDefind = 0,
            [Description("SMS")]
            SMS = 1,
            [Description("Email")]
            Email = 2,
            [Description("InApp")]
            InApp = 3
        }

        public enum HomeSortFrom
        {
            [Description("Top")]
            Top = 0,
            [Description("Bottom")]
            Bottom = 2,
            [Description("Middle")]
            Middle = 3,
        }

        /// <summary>
        /// Categorizes queued messages by the feature area that produced them.
        /// </summary>
        public enum BcpMessageCategory
        {
            General = 0,
            Security = 1,
            Account = 2,
            UserManagement = 3,
            Performance = 4,
            System = 5,
            Finance = 6,
            Communication = 7,
            Marketing = 8,
            Commerce = 9
        }


        /// <summary>
        /// Priority level for queued messages.
        /// </summary>
        public enum BcpMessagePriority
        {
            Low = 0,
            Normal = 1,
            High = 2,
            Urgent = 3
        }

        /// <summary>
        /// Processing status for queued email and SMS messages.
        /// </summary>
        public enum BcpQueueStatus
        {
            Queued = 0,
            Processing = 1,
            Sent = 2,
            Failed = 3,
            Cancelled = 4
        }

        /// <summary>
        /// Communication delivery channels supported across the platform.
        /// </summary>
        public enum BcpMessageChannel
        {
            /// <summary>
            /// Transactional email channel.
            /// </summary>
            Email = 0,

            /// <summary>
            /// Carrier SMS text alert channel.
            /// </summary>
            Sms = 1,

            /// <summary>
            /// In-app notification feed and real-time socket channel.
            /// </summary>
            InAppNotification = 2,

            /// <summary>
            /// Native mobile and desktop push notification channel (OneSignal / FCM).
            /// </summary>
            Push = 3,

            /// <summary>
            /// Transactional WhatsApp message channel.
            /// </summary>
            WhatsApp = 4
        }

        /// <summary>
        /// Canonical 6-tier platform notification and alert severity hierarchy across web, mobile, desktop, and transactional channels.
        /// </summary>
        public enum NotificationSeverity
        {
            /// <summary>
            /// Critical system errors, database sync failures, payment crashes.
            /// Standard Color Token: #F06548 (Crimson), Icon: error_outline.
            /// </summary>
            Error = 1,

            /// <summary>
            /// Business operation failed, payment declined, verification expired.
            /// Standard Color Token: #F7B84B (Amber), Icon: warning_amber.
            /// </summary>
            Failed = 2,

            /// <summary>
            /// Warning severity alias for failed/degraded security operations.
            /// </summary>
            Warning = 2,

            /// <summary>
            /// Operation completed successfully, subscription renewed, member verified.
            /// Standard Color Token: #0AB39C (Teal), Icon: check_circle.
            /// </summary>
            Success = 3,

            /// <summary>
            /// New modular capability or add-on released or unlocked for the workspace.
            /// Standard Color Token: #38BDF8 (Sky), Icon: auto_awesome.
            /// </summary>
            NewFeature = 4,

            /// <summary>
            /// Policy revision, system notice, sprint updates, team announcements.
            /// Standard Color Token: #1F6BFF (Royal Blue), Icon: info_outline.
            /// </summary>
            Update = 5,

            /// <summary>
            /// Info severity alias for informational updates and system notices.
            /// </summary>
            Info = 5,

            /// <summary>
            /// Scheduled maintenance window, server upgrade, cold-start advisories.
            /// Standard Color Token: #9333EA (Purple), Icon: build_circle.
            /// </summary>
            Maintenance = 6
        }

        /// <summary>
        /// Bit-flag delivery channels supported by the central notification and messaging dispatcher.
        /// Enables multi-channel combinations (e.g. InApp | Push | Email).
        /// </summary>
        [Flags]
        public enum NotificationChannels
        {
            /// <summary>
            /// No delivery channel selected.
            /// </summary>
            None = 0,

            /// <summary>
            /// In-app real-time notification feed stored in database and streamed via SignalR.
            /// </summary>
            InApp = 1,

            /// <summary>
            /// Native mobile and desktop push notification (e.g., OneSignal or FCM).
            /// </summary>
            Push = 2,

            /// <summary>
            /// Transactional email dispatched through the Postmark email suite.
            /// </summary>
            Email = 4,

            /// <summary>
            /// Direct SMS text alert sent through the carrier SMS gateway.
            /// </summary>
            Sms = 8,

            /// <summary>
            /// Transactional WhatsApp message or webhook notification.
            /// </summary>
            WhatsApp = 16,

            /// <summary>
            /// Broadcast across all supported delivery channels simultaneously.
            /// </summary>
            All = InApp | Push | Email | Sms | WhatsApp
        }

        /// <summary>
        /// All BCP platform events that can trigger notifications, emails, or SMS messages.
        /// </summary>
        public enum BcpEventType
        {
            PasswordChanged = 100,
            NewDeviceSignedIn = 101,
            SessionRevokedByUser = 102,
            SessionRevokedByAdmin = 103,
            TwoFactorEnabled = 104,
            TwoFactorDisabled = 105,
            RecoveryCodesRegenerated = 106,
            AccountLocked = 107,
            AccountUnlocked = 108,
            LoginOtp = 109,
            PasswordReset = 110,

            RoleAssigned = 200,
            RoleRemoved = 201,
            FeatureAccessGranted = 202,
            FeatureAccessRevoked = 203,
            CategoryChanged = 204,
            PerformanceScoreRecorded = 205,
            NoteAdded = 206,
            UserStatusChanged = 207,
            UserInvitationSent = 208,
            ProfileUpdated = 209,

            MaintenanceModeEnabled = 300,
            MaintenanceModeDisabled = 301,
            SystemAnnouncement = 302,
            WelcomeOnboarding = 303
        }

        /// <summary>
        /// Supported Multi-Factor Authentication providers.
        /// </summary>
        public enum BcpTwoFactorProvider
        {
            None = 0,
            GoogleAuthenticator = 1,
            MicrosoftAuthenticator = 2,
            Email = 3,
            SMS = 4
        }

        // --- BCP GROUPS & CHAT SYSTEM ENUMS ---

        /// <summary>
        /// Categorization for BCP groups (committees, departments, teams, etc.).
        /// </summary>
        public enum BcpGroupType
        {
            [Description("General")]
            General = 0,

            [Description("Committee")]
            Committee = 1,

            [Description("Department")]
            Department = 2,

            [Description("Team")]
            Team = 3,

            [Description("Custom")]
            Custom = 4
        }

        /// <summary>
        /// Controls who can discover and join a BCP group.
        /// </summary>
        public enum BcpGroupVisibility
        {
            [Description("Public")]
            Public = 0,

            [Description("Private")]
            Private = 1,

            [Description("Hidden")]
            Hidden = 2
        }

        /// <summary>
        /// Determines who can send messages in a group chat.
        /// Open = everyone; AdminOnly = Admin + Exco; Announcement = Admin only; ReadOnly = nobody.
        /// </summary>
        public enum BcpGroupChatMode
        {
            [Description("Open")]
            Open = 0,

            [Description("Admin Only")]
            AdminOnly = 1,

            [Description("Announcement")]
            Announcement = 2,

            [Description("Read Only")]
            ReadOnly = 3
        }

        /// <summary>
        /// A user's role within a specific BCP group (not the platform-level role).
        /// </summary>
        public enum BcpGroupRole
        {
            [Description("Member")]
            Member = 0,

            [Description("Admin")]
            Admin = 1,

            [Description("Executive")]
            Executive = 2,

            [Description("Observer")]
            Observer = 3,

            [Description("Guest")]
            Guest = 4
        }

        /// <summary>
        /// The type of content a chat message carries.
        /// </summary>
        public enum BcpChatMessageType
        {
            [Description("Text")]
            Text = 0,

            [Description("File")]
            File = 1,

            [Description("Poll")]
            Poll = 2,

            [Description("System")]
            System = 3,

            [Description("Link")]
            Link = 4
        }

        /// <summary>
        /// Delivery status of a chat message (WhatsApp-style ticks).
        /// </summary>
        public enum BcpMessageDeliveryStatus
        {
            [Description("Sent")]
            Sent = 0,

            [Description("Delivered")]
            Delivered = 1,

            [Description("Read")]
            Read = 2
        }

        /// <summary>
        /// Real-time presence state for a user in the chat system.
        /// </summary>
        public enum BcpPresenceStatus
        {
            [Description("Offline")]
            Offline = 0,

            [Description("Online")]
            Online = 1,

            [Description("Away")]
            Away = 2,

            [Description("Do Not Disturb")]
            DoNotDisturb = 3,

            [Description("Active In Chat")]
            ActiveInChat = 4
        }

        /// <summary>
        /// Distinguishes internal platform users from external guest users.
        /// </summary>
        public enum BcpUserType
        {
            [Description("Internal")]
            Internal = 0,

            [Description("Guest")]
            Guest = 1
        }

        public enum ProductType
        {
            [Description("Software / Digital Download")]
            Software = 0,

            [Description("Professional Service / Consultation")]
            Service = 1,

            [Description("Physical Product & Inventory")]
            Physical = 2,

            [Description("Recurring Subscription / Membership")]
            Subscription = 3
        }

        public enum ProductPublishStatus
        {
            [Description("Draft")]
            Draft = 0,

            [Description("Published")]
            Published = 1,

            [Description("Scheduled")]
            Scheduled = 2,

            [Description("Archived")]
            Archived = 3
        }

        public enum SubscriptionBillingInterval
        {
            [Description("Monthly")]
            Monthly = 0,

            [Description("Quarterly")]
            Quarterly = 1,

            [Description("Yearly")]
            Yearly = 2
        }

        public enum ProductOrderStatus
        {
            [Description("Pending")]
            Pending = 0,

            [Description("Processing")]
            Processing = 1,

            [Description("Completed")]
            Completed = 2,

            [Description("Cancelled")]
            Cancelled = 3,

            [Description("Refunded")]
            Refunded = 4
        }
    }
}

