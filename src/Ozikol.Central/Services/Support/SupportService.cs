using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Support
{
    /// <summary>
    /// Implements database-backed support operations, knowledge base retrieval, YouTube video curation, and ticket routing.
    /// </summary>
    public class SupportService : ISupportService
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ICentralEmailService _emailService;
        private readonly ILogger<SupportService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SupportService"/> class.
        /// </summary>
        /// <param name="context">The Master Catalog database context.</param>
        /// <param name="emailService">The central email service for ticket receipts and notifications.</param>
        /// <param name="logger">System logger for support operations.</param>
        public SupportService(
            MasterCatalogDbContext context,
            ICentralEmailService emailService,
            ILogger<SupportService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<SuiteSupportViewModel>> GetSuitesWithHierarchyAsync(string culture)
        {
            await EnsureSeedDataAsync();

            var normalizedCulture = (culture ?? "en").ToLowerInvariant();
            var allSuites = GetPredefinedSuites(normalizedCulture);

            // Fetch live counts from DB for articles and videos
            var articleCounts = await _context.MasterHelpdeskArticles
                .AsNoTracking()
                .Where(a => a.IsPublished && (a.Culture == normalizedCulture || a.Culture == "*" || a.Culture == "en"))
                .GroupBy(a => new { a.SuiteCode, a.FeatureCode })
                .Select(g => new { g.Key.SuiteCode, g.Key.FeatureCode, Count = g.Count() })
                .ToListAsync();

            var videoCounts = await _context.MasterVideoGuides
                .AsNoTracking()
                .Where(v => v.IsPublished && (v.Culture == normalizedCulture || v.Culture == "*" || v.Culture == "en"))
                .GroupBy(v => new { v.SuiteCode, v.FeatureCode })
                .Select(g => new { g.Key.SuiteCode, g.Key.FeatureCode, Count = g.Count() })
                .ToListAsync();

            foreach (var suite in allSuites)
            {
                suite.ArticleCount = articleCounts.Where(a => a.SuiteCode == suite.SuiteCode).Sum(a => a.Count);
                suite.VideoCount = videoCounts.Where(v => v.SuiteCode == suite.SuiteCode).Sum(v => v.Count);

                foreach (var feat in suite.Features)
                {
                    feat.ArticleCount = articleCounts.Where(a => a.SuiteCode == suite.SuiteCode && a.FeatureCode == feat.FeatureCode).Sum(a => a.Count);
                    feat.VideoCount = videoCounts.Where(v => v.SuiteCode == suite.SuiteCode && v.FeatureCode == feat.FeatureCode).Sum(v => v.Count);
                }
            }

            return allSuites;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<MasterHelpdeskArticle>> GetArticlesAsync(string? suiteCode, string? featureCode, string? search, string culture)
        {
            await EnsureSeedDataAsync();

            var normalizedCulture = (culture ?? "en").ToLowerInvariant();
            var query = _context.MasterHelpdeskArticles
                .AsNoTracking()
                .Where(a => a.IsPublished);

            // Filter culture: exact match or universal, or fallback to en
            query = query.Where(a => a.Culture == normalizedCulture || a.Culture == "*" || a.Culture == "en");

            if (!string.IsNullOrWhiteSpace(suiteCode))
            {
                query = query.Where(a => a.SuiteCode == suiteCode);
            }

            if (!string.IsNullOrWhiteSpace(featureCode))
            {
                query = query.Where(a => a.FeatureCode == featureCode);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(a =>
                    a.Title.ToLower().Contains(term) ||
                    a.Summary.ToLower().Contains(term) ||
                    a.Category.ToLower().Contains(term) ||
                    (a.FeatureCode != null && a.FeatureCode.ToLower().Contains(term)));
            }

            return await query
                .OrderBy(a => a.SortOrder)
                .ThenByDescending(a => a.CreatedUtc)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<MasterHelpdeskArticle?> GetArticleByIdAsync(Guid articleId)
        {
            var article = await _context.MasterHelpdeskArticles.FirstOrDefaultAsync(a => a.Id == articleId);
            if (article != null)
            {
                article.ViewCount++;
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to increment view count for article {ArticleId}", articleId);
                }
            }
            return article;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<MasterVideoGuide>> GetVideosAsync(string? suiteCode, string? featureCode, string culture)
        {
            await EnsureSeedDataAsync();

            var normalizedCulture = (culture ?? "en").ToLowerInvariant();
            var query = _context.MasterVideoGuides
                .AsNoTracking()
                .Where(v => v.IsPublished);

            query = query.Where(v => v.Culture == normalizedCulture || v.Culture == "*" || v.Culture == "en");

            if (!string.IsNullOrWhiteSpace(suiteCode))
            {
                query = query.Where(v => v.SuiteCode == suiteCode);
            }

            if (!string.IsNullOrWhiteSpace(featureCode))
            {
                query = query.Where(v => v.FeatureCode == featureCode);
            }

            return await query
                .OrderBy(v => v.SortOrder)
                .ThenByDescending(v => v.CreatedUtc)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<MasterVideoGuide?> GetVideoByIdAsync(Guid videoId)
        {
            var video = await _context.MasterVideoGuides.FirstOrDefaultAsync(v => v.Id == videoId);
            if (video != null)
            {
                video.ViewCount++;
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to increment view count for video {VideoId}", videoId);
                }
            }
            return video;
        }

        /// <inheritdoc />
        public async Task<string> SubmitInquiryAsync(MasterSupportInquiry inquiry)
        {
            if (inquiry == null) throw new ArgumentNullException(nameof(inquiry));

            inquiry.ReferenceNumber = GenerateTrackingReference();
            inquiry.CreatedUtc = DateTime.UtcNow;
            inquiry.LastActivityUtc = DateTime.UtcNow;
            inquiry.Status = "New";

            _context.MasterSupportInquiries.Add(inquiry);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Support inquiry {ReferenceNumber} submitted by {Email} for {Organization} (InquiryType: {InquiryType})",
                inquiry.ReferenceNumber, inquiry.Email, inquiry.Organization, inquiry.InquiryType);

            // Dispatch dual notification emails (client confirmation receipt + administrator alert pool)
            try
            {
                await _emailService.SendSupportInquiryDualAsync(inquiry);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch dual emails for inquiry {ReferenceNumber}", inquiry.ReferenceNumber);
            }

            return inquiry.ReferenceNumber;
        }

        /// <inheritdoc />
        public async Task<MasterSupportInquiry?> GetInquiryByReferenceAsync(string referenceNumber, System.Threading.CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(referenceNumber))
            {
                return null;
            }

            var cleanRef = referenceNumber.Trim().ToUpperInvariant();
            return await _context.MasterSupportInquiries
                .Include(i => i.Replies.OrderBy(r => r.CreatedUtc))
                .FirstOrDefaultAsync(i => i.ReferenceNumber == cleanRef, cancellationToken);
        }

        /// <inheritdoc />
        public async Task<MasterTicketReply> AddTicketReplyAsync(
            Guid inquiryId,
            string senderName,
            string senderEmail,
            string message,
            bool isStaff,
            System.Threading.CancellationToken cancellationToken = default)
        {
            var inquiry = await _context.MasterSupportInquiries
                .Include(i => i.Replies)
                .FirstOrDefaultAsync(i => i.Id == inquiryId, cancellationToken);

            if (inquiry == null)
            {
                throw new InvalidOperationException($"Ticket with ID '{inquiryId}' not found.");
            }

            var reply = new MasterTicketReply
            {
                Id = Guid.NewGuid(),
                MasterSupportInquiryId = inquiryId,
                SenderName = senderName,
                SenderEmail = senderEmail,
                Message = message,
                IsStaffReply = isStaff,
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterTicketReplies.Add(reply);

            // Update parent ticket activity timestamp and operational status
            inquiry.LastActivityUtc = DateTime.UtcNow;
            if (isStaff)
            {
                inquiry.Status = "AwaitingUser";
            }
            else
            {
                inquiry.Status = inquiry.Status == "Closed" ? "Reopened" : "AwaitingStaff";
                inquiry.ClosedAtUtc = null;
                inquiry.AutoClosedReason = null;
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Added reply {ReplyId} to ticket {ReferenceNumber} by {SenderEmail} (Staff: {IsStaff})",
                reply.Id, inquiry.ReferenceNumber, senderEmail, isStaff);

            // Dispatch reciprocal thread notification email
            try
            {
                await _emailService.SendTicketReplyDualAsync(inquiry, reply, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch ticket reply notification for ticket {ReferenceNumber}", inquiry.ReferenceNumber);
            }

            return reply;
        }

        /// <inheritdoc />
        public async Task<bool> CloseTicketAsync(Guid inquiryId, string reason, System.Threading.CancellationToken cancellationToken = default)
        {
            var inquiry = await _context.MasterSupportInquiries
                .FirstOrDefaultAsync(i => i.Id == inquiryId, cancellationToken);

            if (inquiry == null)
            {
                return false;
            }

            inquiry.Status = "Closed";
            inquiry.ClosedAtUtc = DateTime.UtcNow;
            inquiry.LastActivityUtc = DateTime.UtcNow;
            inquiry.AutoClosedReason = reason;

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Ticket {ReferenceNumber} closed. Reason: {Reason}", inquiry.ReferenceNumber, reason);
            return true;
        }

        /// <inheritdoc />
        public async Task<int> AutoCloseInactiveTicketsAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            try
            {
                var setting = await _context.MasterPlatformSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);

                if (setting == null || !setting.EnableTicketAutoClose)
                {
                    return 0;
                }

                var hours = setting.TicketAutoCloseHours > 0 ? setting.TicketAutoCloseHours : 24;
                var thresholdUtc = DateTime.UtcNow.AddHours(-hours);

                var eligibleTickets = await _context.MasterSupportInquiries
                    .Where(i => (i.Status == "AwaitingUser" || i.Status == "Resolved") && i.LastActivityUtc <= thresholdUtc)
                    .ToListAsync(cancellationToken);

                if (eligibleTickets.Count == 0)
                {
                    return 0;
                }

                var reason = $"Closed automatically after {hours} hours of inactivity.";
                foreach (var ticket in eligibleTickets)
                {
                    ticket.Status = "Closed";
                    ticket.ClosedAtUtc = DateTime.UtcNow;
                    ticket.AutoClosedReason = reason;
                }

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Auto-closed {Count} inactive support tickets past {Hours}h threshold", eligibleTickets.Count, hours);
                return eligibleTickets.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute AutoCloseInactiveTicketsAsync");
                return 0;
            }
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<string>> GetSupportCategoriesAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            try
            {
                var setting = await _context.MasterPlatformSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);

                if (setting != null && setting.SupportCategoryList.Count > 0)
                {
                    return setting.SupportCategoryList;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query support categories from MasterPlatformSettings; falling back to default categories.");
            }

            return new List<string> { "Support", "Sales", "Billing", "Partnership", "Enterprise", "General" };
        }

        /// <inheritdoc />
        public async Task RecordArticleVoteAsync(Guid articleId, bool helpful)
        {
            var article = await _context.MasterHelpdeskArticles.FirstOrDefaultAsync(a => a.Id == articleId);
            if (article != null && helpful)
            {
                article.HelpfulCount++;
                await _context.SaveChangesAsync();
            }
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<MasterSupportFaq>> GetFaqsAsync(string culture, string? category = null, string? suiteCode = null)
        {
            await EnsureSeedDataAsync();

            var normalizedCulture = (culture ?? "en").ToLowerInvariant();
            var query = _context.MasterSupportFaqs
                .AsNoTracking()
                .Where(f => f.IsPublished);

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(f => f.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(suiteCode))
            {
                query = query.Where(f => f.SuiteCode == suiteCode);
            }

            // Retrieve items matching active language first, with fallback to universal (*) or English (en)
            var allMatching = await query
                .Where(f => f.Culture == normalizedCulture || f.Culture == "*" || f.Culture == "en")
                .OrderBy(f => f.SortOrder)
                .ThenBy(f => f.CreatedUtc)
                .ToListAsync();

            // If the user requested a non-English culture and translations exist, prioritize those
            if (normalizedCulture != "en")
            {
                var localized = allMatching.Where(f => f.Culture == normalizedCulture || f.Culture == "*").ToList();
                if (localized.Any())
                {
                    return localized;
                }
            }

            return allMatching.Where(f => f.Culture == "en" || f.Culture == "*").ToList();
        }

        /// <inheritdoc />
        public async Task EnsureSeedDataAsync()
        {
            try
            {
                // 1. Seed FAQs if missing
                if (!await _context.MasterSupportFaqs.AnyAsync())
                {
                    _logger.LogInformation("Seeding initial support FAQs across multiple languages...");
                    var seedFaqs = GetSeedFaqs();
                    await _context.MasterSupportFaqs.AddRangeAsync(seedFaqs);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully seeded {FaqCount} support FAQs.", seedFaqs.Count);
                }

                // 2. Seed articles and videos if missing
                if (!await _context.MasterHelpdeskArticles.AnyAsync())
                {
                    _logger.LogInformation("Seeding initial support articles and video tutorials across all 9 suites...");

                    var seedArticles = GetSeedArticles();
                    var seedVideos = GetSeedVideos();

                    await _context.MasterHelpdeskArticles.AddRangeAsync(seedArticles);
                    await _context.MasterVideoGuides.AddRangeAsync(seedVideos);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully seeded {ArticleCount} helpdesk articles and {VideoCount} video guides.",
                        seedArticles.Count, seedVideos.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while seeding support knowledge base content.");
            }
        }

        private static string GenerateTrackingReference()
        {
            var bytes = new byte[3];
            RandomNumberGenerator.Fill(bytes);
            var hex = Convert.ToHexString(bytes);
            return $"OZK-SUP-{DateTime.UtcNow:yyyyMMdd}-{hex}";
        }

        /// <summary>
        /// Defines the 9 core Ozikol enterprise suites and their primary feature modules.
        /// </summary>
        private static List<SuiteSupportViewModel> GetPredefinedSuites(string culture)
        {
            return new List<SuiteSupportViewModel>
            {
                new()
                {
                    SuiteCode = "suite-people",
                    Title = culture switch {
                        "fr" => "Communauté, Citoyens & Collaboration",
                        "es" => "Gente, Comunidad y Colaboración",
                        "de" => "Menschen, Gemeinschaft & Zusammenarbeit",
                        _ => "People, Community & Collaboration"
                    },
                    Description = culture switch {
                        "fr" => "Messagerie instantanée cryptée, gestion des comités, annuaire des membres et signalement anonyme.",
                        "es" => "Mensajería instantánea cifrada, gestión de comités, directorio de miembros y denuncias anónimas.",
                        "de" => "Verschlüsseltes Messaging, Ausschussverwaltung, Mitgliederverzeichnis und Hinweisgebersystem.",
                        _ => "End-to-end encrypted messaging, committee governance, alumni networks, and whistleblower reporting."
                    },
                    Icon = "icon-people",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "community-messenger", Name = "Community Messenger", Route = "/features/community-messenger" },
                        new() { FeatureCode = "committees", Name = "Committees & Governance", Route = "/features/committees" },
                        new() { FeatureCode = "alumni-directory", Name = "Member & Alumni Directory", Route = "/features/alumni-directory" },
                        new() { FeatureCode = "whistleblowing-feedback", Name = "Whistleblowing & Feedback", Route = "/features/whistleblowing-feedback" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-workforce",
                    Title = culture switch {
                        "fr" => "Effectifs, Rotations & Plannings",
                        "es" => "Fuerza Laboral, Turnos y Horarios",
                        "de" => "Personal, Dienstplan & Zeiteinteilung",
                        _ => "Workforce, Rota & Scheduling"
                    },
                    Description = culture switch {
                        "fr" => "Planification intelligente des gardes, échanges de quarts instantanés, suivi des présences et réservations.",
                        "es" => "Programación inteligente de turnos, cambios rápidos de horario, control de asistencia y citas.",
                        "de" => "Intelligente Schichtplanung, Schichttausch, Anwesenheitserfassung und Terminvereinbarung.",
                        _ => "AI-powered shift scheduling, peer swap approvals, biometric attendance, and appointment booking."
                    },
                    Icon = "icon-workforce",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "staff-rota", Name = "Staff Rota Planning", Route = "/features/staff-rota" },
                        new() { FeatureCode = "shift-swaps-leave", Name = "Shift Swaps & Leave", Route = "/features/shift-swaps-leave" },
                        new() { FeatureCode = "attendance-tracking", Name = "Attendance & Clock-In", Route = "/features/attendance-tracking" },
                        new() { FeatureCode = "appointment-booking", Name = "Appointment Booking", Route = "/features/appointment-booking" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-reports",
                    Title = culture switch {
                        "fr" => "Rapports, Formulaires & Données",
                        "es" => "Informes, Formularios y Analítica",
                        "de" => "Berichte, Formulare & Analysen",
                        _ => "Reports, Forms & Analytics"
                    },
                    Description = culture switch {
                        "fr" => "Générateur de formulaires par glisser-déposer, rapports périodiques et sondages démographiques.",
                        "es" => "Constructor de formularios interactivo, informes periódicos y encuestas demográficas.",
                        "de" => "Interaktiver Formular-Builder, Intervallberichte und demografische Umfragen.",
                        _ => "Visual drag-and-drop form builders, interval reporting metrics, and interactive community surveys."
                    },
                    Icon = "icon-reports",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "interval-reporting", Name = "Interval KPI Reporting", Route = "/features/interval-reporting" },
                        new() { FeatureCode = "form-builder", Name = "Dynamic Form Builder", Route = "/features/form-builder" },
                        new() { FeatureCode = "survey-analytics", Name = "Survey & Feedback Analytics", Route = "/features/survey-analytics" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-events",
                    Title = culture switch {
                        "fr" => "Événements & Gestion des Formations",
                        "es" => "Eventos y Gestión de Formación",
                        "de" => "Veranstaltungen & Schulungsmanagement",
                        _ => "Events & Training Management"
                    },
                    Description = culture switch {
                        "fr" => "Billetterie numérique QR, coordination des intervenants et gestion des inscriptions.",
                        "es" => "Emisión de entradas QR, agenda de ponentes y control de participantes.",
                        "de" => "Digitale QR-Tickets, Referenten-Koordination und Teilnehmerverwaltung.",
                        _ => "Digital QR ticketing, speaker scheduling, accreditation tracking, and attendee registrations."
                    },
                    Icon = "icon-events",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "event-ticketing", Name = "QR Event Ticketing", Route = "/features/event-ticketing" },
                        new() { FeatureCode = "speaker-sessions", Name = "Speaker & Session Agenda", Route = "/features/speaker-sessions" },
                        new() { FeatureCode = "attendee-management", Name = "Attendee Registrations", Route = "/features/attendee-management" },
                        new() { FeatureCode = "certificate-verification", Name = "Certificate Verification", Route = "/features/certificate-verification" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-billing",
                    Title = culture switch {
                        "fr" => "Cotisations & Facturation",
                        "es" => "Cuotas de Miembros y Facturación",
                        "de" => "Mitgliedsbeiträge & Rechnungsstellung",
                        _ => "Member Dues & Revenue Billing"
                    },
                    Description = culture switch {
                        "fr" => "Encaissement automatisé des cotisations, passerelles de paiement multi-devises et subventions.",
                        "es" => "Cobro automatizado de cuotas, pasarelas multidivisa y contabilidad de donaciones.",
                        "de" => "Automatisierte Beitragserhebung, Multi-Währungs-Zahlungstore und Zuschussverwaltung.",
                        _ => "Automated dues invoicing, multi-currency payment collection, and institutional grant accounting."
                    },
                    Icon = "icon-billing",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "invoicing-dues", Name = "Invoicing & Dues Collection", Route = "/features/invoicing-dues" },
                        new() { FeatureCode = "grant-ledger", Name = "Grant & Endowment Ledger", Route = "/features/grant-ledger" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-operations",
                    Title = culture switch {
                        "fr" => "Opérations, Installations & Sécurité",
                        "es" => "Operaciones, Instalaciones y Seguridad",
                        "de" => "Betrieb, Liegenschaften & Sicherheit",
                        _ => "Operations, Facilities & Asset Security"
                    },
                    Description = culture switch {
                        "fr" => "Contrôle des accès aux barrières, suivi de la flotte de véhicules et inventaire du matériel.",
                        "es" => "Control de accesos y visitantes, seguimiento de flotas e inventario corporativo.",
                        "de" => "Besuchermanagement, Flottenüberwachung und Liegenschaftsinventar.",
                        _ => "Automated visitor access gates, GPS fleet logistics, and high-value equipment tracking."
                    },
                    Icon = "icon-operations",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "visitor-gate-management", Name = "Visitor Gate Security", Route = "/features/visitor-gate-management" },
                        new() { FeatureCode = "equipment-fleet", Name = "Equipment & Vehicle Fleet", Route = "/features/equipment-fleet" },
                        new() { FeatureCode = "company-assets", Name = "Fixed Assets & Facilities", Route = "/features/company-assets" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-governance",
                    Title = culture switch {
                        "fr" => "Élections, Gouvernance & Votes",
                        "es" => "Elecciones, Gobernanza y Votaciones",
                        "de" => "Wahlen, Governance & Abstimmungen",
                        _ => "Elections, Governance & Decision Voting"
                    },
                    Description = culture switch {
                        "fr" => "Scrutins électroniques infalsifiables, assemblées générales et audits cryptographiques.",
                        "es" => "Votaciones electrónicas cifradas, asambleas generales y auditorías de gobernanza.",
                        "de" => "Manipulationssichere digitale Wahlen, Versammlungen und kryptografische Prüfung.",
                        _ => "Cryptographically audited e-voting, secure ballot tallying, and executive committee elections."
                    },
                    Icon = "icon-governance",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "elections-evoting", Name = "Cryptographic E-Voting", Route = "/features/elections-evoting" },
                        new() { FeatureCode = "proposal-pipeline", Name = "Resolution & Proposal Pipeline", Route = "/features/proposal-pipeline" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-recruitment",
                    Title = culture switch {
                        "fr" => "Recrutement & Intégration des Talents",
                        "es" => "Contratación e Integración de Talento",
                        "de" => "Personalbeschaffung & Onboarding",
                        _ => "Recruitment & Candidate Onboarding"
                    },
                    Description = culture switch {
                        "fr" => "Portail de carrières multilingue, flux d'entretiens et vérification de conformité.",
                        "es" => "Portal de empleo multilingüe, flujo de entrevistas y verificación de candidatos.",
                        "de" => "Mehrsprachiges Karriereportal, Bewerbungsabwicklung und Compliance-Prüfung.",
                        _ => "Multilingual job board publishing, automated candidate pipelines, and compliance verification."
                    },
                    Icon = "icon-recruitment",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "recruitment-hiring", Name = "Candidate Pipeline & Hiring", Route = "/features/recruitment-hiring" },
                        new() { FeatureCode = "project-task-tracking", Name = "Onboarding Project Tasks", Route = "/features/project-task-tracking" }
                    }
                },
                new()
                {
                    SuiteCode = "suite-store",
                    Title = culture switch {
                        "fr" => "Boutique en Ligne & Produits Dérivés",
                        "es" => "Tienda Electrónica e Inventario",
                        "de" => "Online-Shop, Merchandising & Inventar",
                        _ => "E-Commerce, Merchandise & Inventory"
                    },
                    Description = culture switch {
                        "fr" => "Catalogue de produits de l'organisation, gestion des stocks et paiements instantanés.",
                        "es" => "Catálogo de artículos oficiales, control de existencias y cobro en línea.",
                        "de" => "Offizieller Webshop, Lagerbestandsverwaltung und Online-Zahlungen.",
                        _ => "Digital institutional storefront, branded merchandise checkout, and SKU stock tracking."
                    },
                    Icon = "icon-store",
                    Features = new List<FeatureSupportItemViewModel>
                    {
                        new() { FeatureCode = "store-ecommerce", Name = "Store & Merchandise Checkout", Route = "/features/store-ecommerce" }
                    }
                }
            };
        }

        private static List<MasterHelpdeskArticle> GetSeedArticles()
        {
            return new List<MasterHelpdeskArticle>
            {
                // Suite 1: People & Collaboration
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-people",
                    FeatureCode = "community-messenger",
                    Title = "Configuring End-to-End Encrypted Community Messaging Channels",
                    Slug = "configuring-e2e-encrypted-messaging-channels",
                    Summary = "Learn how to establish secure channels, configure message retention policies, and manage administrator broadcast permissions.",
                    Category = "Configuration",
                    Culture = "en",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Overview</h3>
<p>The Community Messenger suite provides secure, real-time communication across community departments, estates, and organizational committees. All communications leverage modern TLS 1.3 cryptographic transit protocols and zero-knowledge encryption for private one-to-one channels.</p>

<h3>Step 1: Create a Departmental or Estate Channel</h3>
<ol>
    <li>Navigate to the <strong>Community Messenger</strong> module from your central dashboard.</li>
    <li>Click <strong>+ New Channel</strong> in the left-hand navigation panel.</li>
    <li>Select between <em>Public Announcements</em> (moderated broadcast) or <em>Collaborative Discussion</em> (open participation).</li>
    <li>Assign member role access policies based on membership tiers or committee badges.</li>
</ol>

<h3>Step 2: Message Retention & Archival Policies</h3>
<p>Under <strong>Channel Settings &gt; Compliance</strong>, tenant administrators can enforce legal retention rules:
<ul>
    <li><strong>Permanent Audit Record:</strong> Preserves messages for statutory compliance and regulatory reviews.</li>
    <li><strong>Rolling Ephemeral Window:</strong> Automatically clears media attachments and chat history after 30, 90, or 365 days.</li>
</ul>
</p>

<div class='oz-support-alert oz-support-alert--tip'>
    <strong>Enterprise Tip:</strong> For high-profile committee channels, enable <em>Read Receipts & Acknowledgments</em> so officers can verify all participants received official minutes and directives.
</div>"
                },

                // Suite 2: Workforce & Rota
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "staff-rota",
                    Title = "Setting Up Automated Shift Rota Schedules and Fair Allocation",
                    Slug = "setting-up-automated-shift-rota-schedules",
                    Summary = "Step-by-step guide to generating monthly staff rotas, managing minimum staffing rules, and automating shift conflict resolution.",
                    Category = "Getting Started",
                    Culture = "en",
                    EstimatedReadMinutes = 5,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Introduction</h3>
<p>Ozikol's Staff Rota engine streamlines complex multi-shift rosters across medical facilities, security personnel, residential estate staff, and municipal service teams.</p>

<h3>Step 1: Define Shift Templates</h3>
<ol>
    <li>Go to <strong>Workforce &gt; Staff Rota &gt; Shift Patterns</strong>.</li>
    <li>Configure standard shifts: Morning (07:00 - 15:00), Afternoon (15:00 - 23:00), and Night (23:00 - 07:00).</li>
    <li>Set mandatory break durations and overtime multipliers.</li>
</ol>

<h3>Step 2: Auto-Publish Rota Cycles</h3>
<p>Once shift templates are defined, click <strong>Auto-Generate Roster</strong>. The algorithmic optimizer will:
<ul>
    <li>Respect maximum consecutive working days (EU Working Time Directive compliant).</li>
    <li>Balance weekend rotations equally among staff.</li>
    <li>Instantly notify employees via email and mobile push notifications once published.</li>
</ul>
</p>"
                },

                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "shift-swaps-leave",
                    Title = "Processing Peer-to-Peer Shift Swaps and Annual Leave Approvals",
                    Slug = "processing-shift-swaps-and-leave-approvals",
                    Summary = "Understand how employees request shift trades, how the manager authorization workflow operates, and how leave balances sync.",
                    Category = "Best Practices",
                    Culture = "en",
                    EstimatedReadMinutes = 3,
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Shift Swap Workflow</h3>
<p>Employees can independently trade scheduled shifts with qualified colleagues using the mobile app or employee web portal.</p>
<ol>
    <li>Employee A initiates a swap request and selects an eligible peer with equivalent certifications.</li>
    <li>Employee B receives a notification and accepts the proposed trade.</li>
    <li>The roster supervisor receives a one-click authorization prompt. Upon approval, the master calendar updates automatically.</li>
</ol>"
                },

                // Suite 5: Invoicing & Dues
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-billing",
                    FeatureCode = "invoicing-dues",
                    Title = "Automating Recurring Member Dues, Invoicing, and Multi-Currency Gateways",
                    Slug = "automating-recurring-member-dues-and-invoicing",
                    Summary = "Configure Stripe, PayPal, and regional African payment gateways (Paystack/Flutterwave) for recurring membership billing.",
                    Category = "Configuration",
                    Culture = "en",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Billing Setup Guide</h3>
<p>The Member Dues & Revenue suite supports automated recurring debiting, automated PDF tax invoices, and real-time reconciliation across 10 global currencies.</p>

<h3>Step 1: Connect Payment Gateways</h3>
<p>Go to <strong>Settings &gt; Payment Providers</strong> and input your API keys for:
<ul>
    <li><strong>Stripe:</strong> Credit & Debit Cards (USD, GBP, EUR, CAD, AUD).</li>
    <li><strong>Paystack / Flutterwave:</strong> Bank Transfers, Mobile Money (NGN, GHS, KES, ZAR).</li>
</ul>
</p>

<h3>Step 2: Setup Billing Frequencies</h3>
<p>Create subscription tiers with Monthly, Quarterly (10% discount), or Annual (20% discount) cadences. The platform will automatically issue reminders 7 days prior to debiting.</p>"
                },

                // Suite 6: Operations & Gate
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-operations",
                    FeatureCode = "visitor-gate-management",
                    Title = "Deploying QR Access Passes and License Plate Recognition at Estate Gates",
                    Slug = "deploying-qr-access-passes-at-estate-gates",
                    Summary = "How residents issue temporary QR access codes for guests, delivery drivers, and contractors at gated facilities.",
                    Category = "Getting Started",
                    Culture = "en",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Secure Gate Access System</h3>
<p>Residents and facility managers can generate dynamic, time-limited QR access codes for incoming visitors. When scanned by security at gate terminals, the gate unlocks automatically.</p>
<ol>
    <li>Generate a pass in the resident portal by entering visitor name and vehicle license plate.</li>
    <li>Share the generated digital pass via WhatsApp or SMS.</li>
    <li>Security staff scan the QR code via tablet or handheld scanner at the entry gate.</li>
</ol>"
                },

                // French Article
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "staff-rota",
                    Title = "Configuration des plannings de rotation du personnel et conformité",
                    Slug = "configuration-des-plannings-de-rotation-du-personnel",
                    Summary = "Guide complet pour configurer les rotations d'équipe, gérer les temps de repos obligatoires et automatiser les plannings mensuels.",
                    Category = "Getting Started",
                    Culture = "fr",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Vue d'ensemble</h3>
<p>Le module de gestion des plannings Ozikol permet aux gestionnaires d'organisations, de résidences et d'entreprises d'automatiser les horaires de travail tout en respectant scrupuleusement la réglementation sur le temps de travail.</p>
<h3>Étapes clés</h3>
<ol>
    <li>Définissez les modèles de quarts (Matin, Soir, Nuit).</li>
    <li>Attribuez les compétences requises par poste.</li>
    <li>Générez le planning mensuel en un clic et publiez-le instantanément.</li>
</ol>"
                },

                // Spanish Article
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-people",
                    FeatureCode = "community-messenger",
                    Title = "Configuración de canales de mensajería cifrada para comunidades",
                    Slug = "configuracion-canales-mensajeria-cifrada-comunidades",
                    Summary = "Aprenda a establecer canales seguros, moderar publicaciones comunitarias y proteger la privacidad de los residentes.",
                    Category = "Getting Started",
                    Culture = "es",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Mensajería Segura para Organizaciones</h3>
<p>La plataforma ofrece canales de comunicación en tiempo real con cifrado de extremo a extremo, ideales para asambleas, comités de barrio y equipos corporativos.</p>"
                },

                // German Article
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-operations",
                    FeatureCode = "visitor-gate-management",
                    Title = "Einrichtung digitaler QR-Zugangspässe an Schrankenanlagen",
                    Slug = "einrichtung-digitaler-qr-zugangspaesse-schrankenanlagen",
                    Summary = "Schritt-für-Schritt-Anleitung zur Erstellung und Überprüfung von QR-Codes für Besucher und Lieferanten.",
                    Category = "Getting Started",
                    Culture = "de",
                    EstimatedReadMinutes = 4,
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
<h3>Digitales Besuchermanagement</h3>
<p>Erstellen Sie zeitlich begrenzte QR-Codes für Besucher, die an Gate-Terminals sofort validiert werden können.</p>"
                }
            };
        }

        private static List<MasterVideoGuide> GetSeedVideos()
        {
            return new List<MasterVideoGuide>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-people",
                    FeatureCode = "community-messenger",
                    Title = "Community Messenger: Setting Up Channels & Broadcast Groups",
                    Description = "In this 4-minute tutorial, discover how administrators configure public broadcast groups, private committee discussions, and member permission hierarchies.",
                    YouTubeVideoId = "dQw4w9WgXcQ", // Standard YouTube embed format
                    DurationSeconds = 245,
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "staff-rota",
                    Title = "Mastering Staff Rota: Auto-Scheduling & Shift Optimization",
                    Description = "Learn how to leverage our intelligent scheduling optimizer to balance employee shifts, avoid overtime penalties, and satisfy staffing ratios effortlessly.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 312,
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "shift-swaps-leave",
                    Title = "Shift Swaps & Leave: Mobile Approvals Walkthrough",
                    Description = "Watch a live demonstration of an employee requesting a shift swap on iOS/Android and the supervisor approving it in real-time.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 180,
                    Culture = "en",
                    SortOrder = 2,
                    IsPublished = true
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-billing",
                    FeatureCode = "invoicing-dues",
                    Title = "Automated Member Dues Collection & Stripe Reconciliation",
                    Description = "Explore how recurring dues are scheduled, payment reminders are automatically dispatched, and real-time revenue reports are generated.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 285,
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-operations",
                    FeatureCode = "visitor-gate-management",
                    Title = "Visitor Gate Security: QR Scanning at Entry Checkpoints",
                    Description = "A complete walkthrough of the security guard terminal scanning visitor QR passes, capturing vehicle registration, and triggering automated gate barriers.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 210,
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-governance",
                    FeatureCode = "elections-evoting",
                    Title = "Cryptographic E-Voting: Running Transparent Board Elections",
                    Description = "See how cryptographic vote tallying guarantees 100% election integrity, voter confidentiality, and tamper-evident audit logs.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 290,
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true
                },

                // Localized French Video
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-workforce",
                    FeatureCode = "staff-rota",
                    Title = "Tutoriel : Gestion automatisée des plannings et roulements",
                    Description = "Apprenez à planifier les horaires de vos collaborateurs, à équilibrer les rotations d'équipe et à réduire les heures supplémentaires.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 260,
                    Culture = "fr",
                    SortOrder = 1,
                    IsPublished = true
                },

                // Localized Spanish Video
                new()
                {
                    Id = Guid.NewGuid(),
                    SuiteCode = "suite-operations",
                    FeatureCode = "visitor-gate-management",
                    Title = "Tutorial: Control de Acceso y Pases QR para Comunidades",
                    Description = "Demostración en vivo de generación y escaneo de códigos QR para visitantes en puertas y puestos de control.",
                    YouTubeVideoId = "dQw4w9WgXcQ",
                    DurationSeconds = 225,
                    Culture = "es",
                    SortOrder = 1,
                    IsPublished = true
                }
            };
        }

        /// <summary>
        /// Generates the initial seed frequently asked support questions across supported enterprise languages.
        /// </summary>
        /// <returns>A list of master support FAQ items.</returns>
        private static List<MasterSupportFaq> GetSeedFaqs()
        {
            return new List<MasterSupportFaq>
            {
                // ==============================
                // English FAQs
                // ==============================
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "How quickly will an engineer respond to my support ticket?",
                    Answer = "Standard support inquiries are addressed within 2 to 4 business hours. Critical production incidents submitted by enterprise tenants with an active SLA are prioritized with an initial engineer response under 15 minutes.",
                    Category = "Support",
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Where can existing tenants access their live administrative portal?",
                    Answer = "Each enterprise tenant operates on their dedicated vanity or custom domain (e.g. yourorg.ozikol.cloud or custom CNAME). You can log in directly using your corporate credentials and tenant identifier.",
                    Category = "Platform",
                    Culture = "en",
                    SortOrder = 2,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Can we request a customized walkthrough or staff training session?",
                    Answer = "Yes. Our customer success and solutions engineering teams provide scheduled live workshops, administrator onboarding, and departmental staff training sessions upon request.",
                    Category = "General",
                    Culture = "en",
                    SortOrder = 3,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Are all YouTube video tutorials available with multilingual subtitles?",
                    Answer = "Yes. All official Ozikol video tutorials on YouTube include AI-generated, human-verified closed captions in English, French, Spanish, German, and Arabic.",
                    Category = "General",
                    Culture = "en",
                    SortOrder = 4,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },

                // ==============================
                // French FAQs
                // ==============================
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "En combien de temps un ingénieur répondra-t-il à mon ticket de support ?",
                    Answer = "Les demandes standard sont traitées sous 2 à 4 heures ouvrables. Les incidents critiques de production soumis par les locataires disposant d'un SLA actif reçoivent une première réponse en moins de 15 minutes.",
                    Category = "Support",
                    Culture = "fr",
                    SortOrder = 1,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Où les locataires existants peuvent-ils accéder à leur portail administratif en direct ?",
                    Answer = "Chaque locataire d'entreprise dispose de son sous-domaine dédié (ex. votreorganisation.ozikol.cloud ou CNAME personnalisé). Connectez-vous directement à l'aide de vos identifiants d'entreprise.",
                    Category = "Platform",
                    Culture = "fr",
                    SortOrder = 2,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Pouvons-nous demander une démonstration personnalisée ou une session de formation pour notre personnel ?",
                    Answer = "Oui. Nos équipes de réussite client et d'ingénierie des solutions proposent sur demande des ateliers en direct, l'intégration des administrateurs et des formations pour votre personnel.",
                    Category = "General",
                    Culture = "fr",
                    SortOrder = 3,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Tous les didacticiels vidéo YouTube sont-ils disponibles avec des sous-titres multilingues ?",
                    Answer = "Oui. Tous les didacticiels vidéo officiels Ozikol sur YouTube disposent de sous-titres dans les principales langues prises en charge (français, anglais, espagnol et allemand).",
                    Category = "General",
                    Culture = "fr",
                    SortOrder = 4,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },

                // ==============================
                // Spanish FAQs
                // ==============================
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "¿Con qué rapidez responderá un ingeniero a mi ticket de soporte?",
                    Answer = "Las consultas estándar de soporte se atienden en un plazo de 2 a 4 horas laborables. Los incidentes críticos de producción presentados por inquilinos empresariales con un SLA activo tienen una respuesta inicial en menos de 15 minutos.",
                    Category = "Support",
                    Culture = "es",
                    SortOrder = 1,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "¿Dónde pueden acceder los inquilinos existentes a su portal administrativo en vivo?",
                    Answer = "Cada inquilino empresarial opera en su subdominio dedicado (ej. suempresa.ozikol.cloud o CNAME personalizado). Inicie sesión directamente utilizando sus credenciales corporativas.",
                    Category = "Platform",
                    Culture = "es",
                    SortOrder = 2,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "¿Podemos solicitar una demostración personalizada o una sesión de capacitación para el personal?",
                    Answer = "¡Sí! Nuestros equipos de éxito del cliente e ingeniería de soluciones ofrecen talleres interactivos programados, incorporación de administradores y sesiones de formación para equipos.",
                    Category = "General",
                    Culture = "es",
                    SortOrder = 3,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "¿Todos los tutoriales en video de YouTube están disponibles con subtítulos multilingües?",
                    Answer = "Sí. Todos los videos de tutoriales oficiales de Ozikol en YouTube incluyen subtítulos en inglés, francés, español y alemán.",
                    Category = "General",
                    Culture = "es",
                    SortOrder = 4,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },

                // ==============================
                // German FAQs
                // ==============================
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Wie schnell antwortet ein Techniker auf mein Support-Ticket?",
                    Answer = "Standard-Supportanfragen werden innerhalb von 2 bis 4 Geschäftsstunden bearbeitet. Kritische Produktionsvorfälle von Mandanten mit aktivem SLA erhalten eine Erstantwort in unter 15 Minuten.",
                    Category = "Support",
                    Culture = "de",
                    SortOrder = 1,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Wo können bestehende Mandanten auf ihr Live-Verwaltungsportal zugreifen?",
                    Answer = "Jeder Unternehmensmandant arbeitet auf seiner dedizierten Subdomain (z. B. ihrunternehmen.ozikol.cloud oder benutzerdefiniertes CNAME). Melden Sie sich direkt mit Ihren Anmeldedaten an.",
                    Category = "Platform",
                    Culture = "de",
                    SortOrder = 2,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Können wir eine individuelle Demonstration oder Mitarbeiterschulung anfordern?",
                    Answer = "Ja! Unsere Teams für Customer Success und Solutions Engineering bieten auf Anfrage geplante Live-Workshops, Administrator-Onboarding und Schulungen an.",
                    Category = "General",
                    Culture = "de",
                    SortOrder = 3,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Question = "Sind alle YouTube-Video-Tutorials mit mehrsprachigen Untertiteln verfügbar?",
                    Answer = "Ja. Alle offiziellen Ozikol-Tutorial-Videos auf YouTube enthalten mehrsprachige Untertitel auf Englisch, Französisch, Spanisch und Deutsch.",
                    Category = "General",
                    Culture = "de",
                    SortOrder = 4,
                    IsPublished = true,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                }
            };
        }
    }
}
