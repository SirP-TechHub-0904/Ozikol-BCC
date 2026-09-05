using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.Support;

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// PageModel presenting the Ozikol Professional Certification Program, credential tracks, practice assessments, and certificate verification.
    /// </summary>
    [IgnoreAntiforgeryToken(Order = 1001)]
    public class CertificationsModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly Services.ICentralEmailService _emailService;
        private readonly IStringLocalizer<SharedResource> _localizer;
        private readonly ILogger<CertificationsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CertificationsModel"/> class.
        /// </summary>
        /// <param name="supportService">Support service instance.</param>
        /// <param name="emailService">Central email service for dual exam notifications.</param>
        /// <param name="localizer">Shared localizer instance.</param>
        /// <param name="logger">Logger instance.</param>
        public CertificationsModel(
            ISupportService supportService,
            Services.ICentralEmailService emailService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<CertificationsModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the active 2-letter ISO culture code.
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the list of available professional certification tracks.
        /// </summary>
        public IReadOnlyList<CertificationTrackViewModel> Tracks { get; private set; } = new List<CertificationTrackViewModel>();

        /// <summary>
        /// Gets the list of sample readiness assessment questions.
        /// </summary>
        public IReadOnlyList<QuizQuestionViewModel> PracticeQuestions { get; private set; } = new List<QuizQuestionViewModel>();

        /// <summary>
        /// Handles GET requests to initialize the certification portal.
        /// </summary>
        public void OnGet()
        {
            ResolveCulture();
            Tracks = GetCertificationTracks(CurrentCulture);
            PracticeQuestions = GetPracticeQuestions(CurrentCulture);
        }

        /// <summary>
        /// AJAX handler to verify an official Ozikol certificate credential number.
        /// </summary>
        /// <param name="certificateNumber">The certificate identification string (e.g. OZK-CERT-2026-8941).</param>
        /// <returns>JSON result detailing holder name, issue date, credential title, and validity status.</returns>
        public IActionResult OnGetVerifyCredential(string? certificateNumber)
        {
            if (string.IsNullOrWhiteSpace(certificateNumber))
            {
                return BadRequest(new { success = false, message = "Please provide a valid certificate tracking number." });
            }

            var cleanCert = certificateNumber.Trim().ToUpperInvariant();
            var verifiedCredentials = GetSimulatedRegistry();

            if (verifiedCredentials.TryGetValue(cleanCert, out var record))
            {
                return new JsonResult(new
                {
                    success = true,
                    isVerified = true,
                    certificateNumber = cleanCert,
                    holderName = record.HolderName,
                    credentialTitle = record.CredentialTitle,
                    badgeCode = record.BadgeCode,
                    issuedDate = record.IssuedDate.ToString("MMMM dd, yyyy"),
                    validThrough = record.ValidThrough.ToString("MMMM dd, yyyy"),
                    status = "Active & Verified",
                    issuer = "Ozikol Cloud Academy & Certification Board"
                });
            }

            return new JsonResult(new
            {
                success = true,
                isVerified = false,
                certificateNumber = cleanCert,
                message = "No active credential record was found matching this certificate number. Please verify formatting."
            });
        }

        /// <summary>
        /// AJAX handler to evaluate practice readiness assessment answers.
        /// </summary>
        /// <param name="answers">Array of chosen option indices keyed by question ID.</param>
        /// <returns>JSON score, passing state, and feedback explanations.</returns>
        public IActionResult OnPostSubmitQuiz([FromBody] QuizSubmissionRequest request)
        {
            ResolveCulture();
            var questions = GetPracticeQuestions(CurrentCulture);
            int correctCount = 0;
            var evaluations = new List<object>();

            foreach (var q in questions)
            {
                request.Answers.TryGetValue(q.Id, out int selectedOption);
                bool isCorrect = selectedOption == q.CorrectOptionIndex;
                if (isCorrect)
                {
                    correctCount++;
                }

                evaluations.Add(new
                {
                    questionId = q.Id,
                    selectedOption = selectedOption,
                    correctOption = q.CorrectOptionIndex,
                    isCorrect = isCorrect,
                    explanation = q.Explanation
                });
            }

            double percentage = (double)correctCount / questions.Count * 100;
            bool passed = percentage >= 70.0;

            return new JsonResult(new
            {
                success = true,
                totalQuestions = questions.Count,
                correctCount = correctCount,
                percentage = Math.Round(percentage, 1),
                passed = passed,
                badgeAwarded = passed ? "Ready for Official Exam" : "Recommended Study Required",
                evaluations = evaluations
            });
        }

        /// <summary>
        /// AJAX handler to submit a certification exam booking and dispatch dual confirmation notifications.
        /// </summary>
        /// <param name="request">Candidate registration payload.</param>
        /// <returns>JSON result with assigned booking reference code.</returns>
        public async Task<IActionResult> OnPostBookExamAsync([FromBody] ExamBookingAjaxRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.CandidateName) ||
                string.IsNullOrWhiteSpace(request.CandidateEmail))
            {
                return BadRequest(new { success = false, message = "Candidate name and corporate email are required." });
            }

            var bookingRef = $"EXAM-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
            var examTitle = !string.IsNullOrWhiteSpace(request.ExamTitle) ? request.ExamTitle.Trim() : "Ozikol Cloud Professional Exam";

            try
            {
                await _emailService.SendExamBookingDualAsync(
                    request.CandidateName.Trim(),
                    request.CandidateEmail.Trim(),
                    examTitle,
                    bookingRef);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch dual emails for exam booking {Ref}", bookingRef);
            }

            return new JsonResult(new
            {
                success = true,
                bookingReference = bookingRef,
                message = "Exam seat reservation confirmed."
            });
        }

        private void ResolveCulture()
        {
            var routeCulture = RouteData.Values["culture"]?.ToString()?.ToLowerInvariant();
            if (routeCulture is "en" or "fr" or "es" or "de")
            {
                CurrentCulture = routeCulture;
                return;
            }

            var current = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            CurrentCulture = current is "en" or "fr" or "es" or "de" ? current : "en";
        }

        private static List<CertificationTrackViewModel> GetCertificationTracks(string culture)
        {
            return new List<CertificationTrackViewModel>
            {
                // Tier 1: Foundation
                new()
                {
                    Code = "OCA-101",
                    Title = "Ozikol Certified Associate (OCA)",
                    Level = "Foundation",
                    TargetAudience = "Community Administrators, Office Managers, Coordinators",
                    DurationMinutes = 60,
                    QuestionCount = 50,
                    PassingScore = 70,
                    ValidityYears = 2,
                    BadgeColor = "emerald",
                    Icon = "award",
                    Summary = "Validates core organization workspace setup, user directories, community boards, and permission hierarchies.",
                    CoveredSuites = new List<string> { "suite-people", "Core Enterprise Administration" },
                    SkillsMeasured = new List<string>
                    {
                        "Organization workspace onboarding & custom domain mapping",
                        "Member directory & user privacy roles",
                        "Broadcast announcements & messaging channels",
                        "Two-factor authentication & password recovery"
                    }
                },

                // Tier 2 - Track A: Workforce & Operations
                new()
                {
                    Code = "OCP-201",
                    Title = "OCP: Workforce & Facility Operations Specialist",
                    Level = "Professional",
                    TargetAudience = "Operations Directors, HR Rostering Managers, Security Chiefs",
                    DurationMinutes = 75,
                    QuestionCount = 60,
                    PassingScore = 75,
                    ValidityYears = 2,
                    BadgeColor = "blue",
                    Icon = "users",
                    Summary = "Demonstrates master competence in shift allocation, peer trades, gate access passes, and asset registries.",
                    CoveredSuites = new List<string> { "suite-workforce", "suite-operations" },
                    SkillsMeasured = new List<string>
                    {
                        "Automated rota scheduling & overtime compliance",
                        "Peer-to-peer shift trade approvals",
                        "QR gate passes & automatic license plate recognition (ALPR)",
                        "Asset tracking & facility amenity bookings"
                    }
                },

                // Tier 2 - Track B: Financial Cloud & Invoicing
                new()
                {
                    Code = "OCP-202",
                    Title = "OCP: Financial Cloud & Billing Specialist",
                    Level = "Professional",
                    TargetAudience = "Controllers, Financial Officers, Account Managers",
                    DurationMinutes = 75,
                    QuestionCount = 60,
                    PassingScore = 75,
                    ValidityYears = 2,
                    BadgeColor = "purple",
                    Icon = "credit-card",
                    Summary = "Master recurring subscription collections, multi-currency payment routing, and automated audit ledgers.",
                    CoveredSuites = new List<string> { "suite-finance", "suite-analytics" },
                    SkillsMeasured = new List<string>
                    {
                        "Automated member dues invoicing & dunning cycles",
                        "Stripe, PayPal & regional gateway integrations",
                        "Multi-currency conversion & exchange rate buffers",
                        "Financial ledger exports & compliance reconciliation"
                    }
                },

                // Tier 2 - Track C: Digital Governance & Compliance
                new()
                {
                    Code = "OCP-203",
                    Title = "OCP: Governance & Board Compliance Specialist",
                    Level = "Professional",
                    TargetAudience = "Corporate Secretaries, Legal Counsels, Compliance Auditors",
                    DurationMinutes = 75,
                    QuestionCount = 60,
                    PassingScore = 75,
                    ValidityYears = 2,
                    BadgeColor = "amber",
                    Icon = "shield-check",
                    Summary = "Specialized in running legally binding cryptographic elections, AGMs, and immutable resolution archives.",
                    CoveredSuites = new List<string> { "suite-governance", "suite-events" },
                    SkillsMeasured = new List<string>
                    {
                        "Cryptographic zero-knowledge e-voting ballots",
                        "Annual General Meeting (AGM) quorum enforcement",
                        "Tamper-evident audit logs & resolution certification",
                        "CPD training course tracking & accreditation"
                    }
                },

                // Tier 3: Solutions Architect
                new()
                {
                    Code = "OCSA-301",
                    Title = "Ozikol Certified Solutions Architect (OCSA)",
                    Level = "Enterprise Architect",
                    TargetAudience = "Enterprise IT Directors, Systems Integrators, Agency Partners",
                    DurationMinutes = 90,
                    QuestionCount = 75,
                    PassingScore = 80,
                    ValidityYears = 3,
                    BadgeColor = "rose",
                    Icon = "cpu",
                    Summary = "The pinnacle credential for enterprise system architecture, custom API extensions, and sovereign security controls.",
                    CoveredSuites = new List<string> { "suite-security", "suite-marketplace", "All 9 Enterprise Suites" },
                    SkillsMeasured = new List<string>
                    {
                        "Cryptographic data isolation & private workspace partitioning",
                        "REST APIs, webhooks & custom marketplace templates",
                        "Sovereign data residency (GDPR & ISO 27001 enforcement)",
                        "High availability, automated backups & disaster recovery"
                    }
                },

                // Tier 4: Authorized Trainer
                new()
                {
                    Code = "OCT-401",
                    Title = "Ozikol Certified Trainer (OCT)",
                    Level = "Instructor",
                    TargetAudience = "Corporate Instructors, University Faculty, Technical Educators",
                    DurationMinutes = 60,
                    QuestionCount = 45,
                    PassingScore = 85,
                    ValidityYears = 1,
                    BadgeColor = "cyan",
                    Icon = "award",
                    Summary = "Certified pedagogical qualification to deliver official Ozikol training courses and administer proctored exams.",
                    CoveredSuites = new List<string> { "Complete Ozikol Cloud Curriculum" },
                    SkillsMeasured = new List<string>
                    {
                        "Curriculum pedagogy & workshop delivery techniques",
                        "Simulated enterprise crisis scenario moderation",
                        "Official proctoring ethics & score auditing"
                    }
                }
            };
        }

        private static List<QuizQuestionViewModel> GetPracticeQuestions(string culture)
        {
            return new List<QuizQuestionViewModel>
            {
                new()
                {
                    Id = 1,
                    Question = "When configuring automated member dues and recurring billing in 'suite-finance', which workflow guarantees ledger accuracy and payment reconciliation integrity?",
                    Options = new List<string>
                    {
                        "Manual paper invoice logs without digital verification",
                        "Automated recurring billing schedules with cryptographic audit trails and real-time gateway reconciliation",
                        "Unverified client-side session cookies",
                        "Public unencrypted email notifications"
                    },
                    CorrectOptionIndex = 1,
                    Explanation = "Ozikol ensures that each organization's billing schedules, dues collections, and ledger records are processed through dedicated cryptographic workflows with automated audit reconciliation."
                },
                new()
                {
                    Id = 2,
                    Question = "Under 'suite-workforce', what occurs when a staff member initiates a peer-to-peer shift swap?",
                    Options = new List<string>
                    {
                        "The swap immediately updates payroll without notification",
                        "The target colleague receives an invitation, and upon acceptance, routes to the duty manager for final authorization",
                        "The shift is deleted and must be re-entered manually",
                        "Only human resources can initiate shift changes"
                    },
                    CorrectOptionIndex = 1,
                    Explanation = "The peer-to-peer shift swap follows a two-stage verification workflow: the receiving employee accepts the trade, and the manager is prompted for operational sign-off."
                },
                new()
                {
                    Id = 3,
                    Question = "How does 'suite-governance' guarantee voter confidentiality during cryptographic board elections?",
                    Options = new List<string>
                    {
                        "Plaintext votes are emailed to the corporate secretary",
                        "Votes are anonymized using zero-knowledge cryptographic hashes with immutable audit verification",
                        "Voting is restricted to paper ballots scanned via mobile camera",
                        "All votes are publicly displayed on the community board"
                    },
                    CorrectOptionIndex = 1,
                    Explanation = "Ozikol's e-voting engine applies cryptographic hashing to decouple the voter identity from the ballot choice while guaranteeing audit integrity."
                },
                new()
                {
                    Id = 4,
                    Question = "In 'suite-operations', what is the primary benefit of issuing temporary QR access passes at estate gates?",
                    Options = new List<string>
                    {
                        "They require physical guard badge printing",
                        "They automatically expire after scheduled visits and log entry timestamps with optional plate recognition",
                        "They allow unrestricted permanent access to all facilities",
                        "They can only be used during standard business hours"
                    },
                    CorrectOptionIndex = 1,
                    Explanation = "Temporary QR codes have strict validity time windows, preventing unauthorized reentry and providing a timestamped audit trail at security checkpoints."
                },
                new()
                {
                    Id = 5,
                    Question = "Which security standard does the Ozikol Central infrastructure adhere to for cross-border enterprise data hosting?",
                    Options = new List<string>
                    {
                        "No formal compliance certification",
                        "ISO 27001 certified security management with GDPR sovereign data residency guarantees",
                        "Unencrypted public cloud hosting",
                        "Local workstation storage only"
                    },
                    CorrectOptionIndex = 1,
                    Explanation = "All Ozikol enterprise data centers operate under ISO 27001 certified controls and adhere strictly to GDPR sovereign data storage guidelines."
                }
            };
        }

        private static Dictionary<string, CredentialVerificationRecord> GetSimulatedRegistry()
        {
            return new Dictionary<string, CredentialVerificationRecord>(StringComparer.OrdinalIgnoreCase)
            {
                ["OZK-CERT-2026-8941"] = new()
                {
                    HolderName = "Alexandra Chen",
                    CredentialTitle = "Ozikol Certified Solutions Architect (OCSA)",
                    BadgeCode = "OCSA-301",
                    IssuedDate = new DateTime(2026, 1, 15),
                    ValidThrough = new DateTime(2029, 1, 15)
                },
                ["OZK-CERT-2026-5210"] = new()
                {
                    HolderName = "Marcus Aurelius Adeyemi",
                    CredentialTitle = "OCP: Workforce & Facility Operations Specialist",
                    BadgeCode = "OCP-201",
                    IssuedDate = new DateTime(2026, 2, 20),
                    ValidThrough = new DateTime(2028, 2, 20)
                },
                ["OZK-CERT-2026-3304"] = new()
                {
                    HolderName = "Dr. Elena Rostova",
                    CredentialTitle = "Ozikol Certified Associate (OCA)",
                    BadgeCode = "OCA-101",
                    IssuedDate = new DateTime(2026, 3, 5),
                    ValidThrough = new DateTime(2028, 3, 5)
                }
            };
        }
    }

    /// <summary>
    /// View model representing a certification track.
    /// </summary>
    public class CertificationTrackViewModel
    {
        /// <summary>Exam identification code (e.g. OCA-101).</summary>
        public string Code { get; set; } = string.Empty;
        /// <summary>Credential full display name.</summary>
        public string Title { get; set; } = string.Empty;
        /// <summary>Career seniority tier level.</summary>
        public string Level { get; set; } = string.Empty;
        /// <summary>Target candidate demographic.</summary>
        public string TargetAudience { get; set; } = string.Empty;
        /// <summary>Allocated examination minutes.</summary>
        public int DurationMinutes { get; set; }
        /// <summary>Total assessment question count.</summary>
        public int QuestionCount { get; set; }
        /// <summary>Minimum passing percentage.</summary>
        public int PassingScore { get; set; }
        /// <summary>Credential active validity term in years.</summary>
        public int ValidityYears { get; set; }
        /// <summary>Accent visual badge theme color.</summary>
        public string BadgeColor { get; set; } = "blue";
        /// <summary>Hero icon identifier.</summary>
        public string Icon { get; set; } = "award";
        /// <summary>Concise executive summary.</summary>
        public string Summary { get; set; } = string.Empty;
        /// <summary>Associated Ozikol enterprise suites.</summary>
        public List<string> CoveredSuites { get; set; } = new();
        /// <summary>Assessed candidate competencies.</summary>
        public List<string> SkillsMeasured { get; set; } = new();
    }

    /// <summary>
    /// View model representing a single readiness assessment question.
    /// </summary>
    public class QuizQuestionViewModel
    {
        /// <summary>Unique question identifier.</summary>
        public int Id { get; set; }
        /// <summary>Question stem text.</summary>
        public string Question { get; set; } = string.Empty;
        /// <summary>Available multiple-choice option texts.</summary>
        public List<string> Options { get; set; } = new();
        /// <summary>Zero-based index of the correct answer.</summary>
        public int CorrectOptionIndex { get; set; }
        /// <summary>Explanatory feedback shown upon answer submission.</summary>
        public string Explanation { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request payload for scoring readiness quiz submissions.
    /// </summary>
    public class QuizSubmissionRequest
    {
        /// <summary>Dictionary mapping question IDs to selected option indices.</summary>
        public Dictionary<int, int> Answers { get; set; } = new();
    }

    /// <summary>
    /// Record storing simulated certified professional registry details.
    /// </summary>
    public class CredentialVerificationRecord
    {
        /// <summary>Credential holder full name.</summary>
        public string HolderName { get; set; } = string.Empty;
        /// <summary>Awarded credential title.</summary>
        public string CredentialTitle { get; set; } = string.Empty;
        /// <summary>Official badge code.</summary>
        public string BadgeCode { get; set; } = string.Empty;
        /// <summary>Original date of credential conferral.</summary>
        public DateTime IssuedDate { get; set; }
        /// <summary>Credential renewal deadline date.</summary>
        public DateTime ValidThrough { get; set; }
    }

    /// <summary>
    /// Payload model for exam booking AJAX requests.
    /// </summary>
    public class ExamBookingAjaxRequest
    {
        /// <summary>Candidate full legal name.</summary>
        public string CandidateName { get; set; } = string.Empty;
        /// <summary>Candidate corporate email address.</summary>
        public string CandidateEmail { get; set; } = string.Empty;
        /// <summary>Candidate organization name.</summary>
        public string CandidateOrg { get; set; } = string.Empty;
        /// <summary>Target examination credential title.</summary>
        public string ExamTitle { get; set; } = string.Empty;
        /// <summary>Preferred language code.</summary>
        public string ExamLanguage { get; set; } = "en";
        /// <summary>Booking registration category.</summary>
        public string BookingType { get; set; } = "Individual";
    }
}
