using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models.Careers;
using Ozikol.Central.Services.Storage;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Careers;

/// <summary>
/// Database-backed service providing career openings, dynamic department filters,
/// automated initial role seeding, and file-attached candidate application submissions.
/// </summary>
public class CareersService : ICareersService
{
    private readonly MasterCatalogDbContext _dbContext;
    private readonly IFileStorageService _fileStorageService;
    private readonly ICentralEmailService _emailService;
    private readonly ILogger<CareersService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CareersService"/> class.
    /// </summary>
    /// <param name="dbContext">Master Catalog database context.</param>
    /// <param name="fileStorageService">File and document storage provider.</param>
    /// <param name="emailService">Central email service for dual candidate notifications.</param>
    /// <param name="logger">System logger instance.</param>
    public CareersService(
        MasterCatalogDbContext dbContext,
        IFileStorageService fileStorageService,
        ICentralEmailService emailService,
        ILogger<CareersService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _fileStorageService = fileStorageService ?? throw new ArgumentNullException(nameof(fileStorageService));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<JobOpeningModel>> GetOpeningsAsync(string? department = null, string? language = null, string? search = null)
    {
        await EnsureSeedOpeningsAsync();

        var query = _dbContext.MasterJobOpenings
            .AsNoTracking()
            .Where(j => j.IsActive);

        if (!string.IsNullOrWhiteSpace(department))
        {
            var dept = department.Trim();
            query = query.Where(j => j.Department == dept);
        }

        if (!string.IsNullOrWhiteSpace(language))
        {
            var lang = language.Trim();
            query = query.Where(j => j.LanguageRequirements.Contains(lang));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(j =>
                j.Title.Contains(term) ||
                j.Summary.Contains(term) ||
                j.Department.Contains(term) ||
                j.Location.Contains(term));
        }

        var entities = await query
            .OrderBy(j => j.SortOrder)
            .ThenByDescending(j => j.CreatedUtc)
            .ToListAsync();

        return entities.Select(MapToModel).ToList().AsReadOnly();
    }

    /// <inheritdoc />
    public async Task<JobOpeningModel?> GetOpeningBySlugAsync(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        await EnsureSeedOpeningsAsync();

        var normalizedSlug = slug.Trim();
        var entity = await _dbContext.MasterJobOpenings
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Slug == normalizedSlug && j.IsActive);

        return entity != null ? MapToModel(entity) : null;
    }

    /// <inheritdoc />
    public async Task<string> SubmitApplicationAsync(JobApplicationInput input, string? clientIp)
    {
        if (input == null) throw new ArgumentNullException(nameof(input));
        if (input.CvFile == null || input.CvFile.Length == 0) throw new ArgumentException("CV document is required.", nameof(input.CvFile));
        if (input.PassportFile == null || input.PassportFile.Length == 0) throw new ArgumentException("Passport photo identification is required.", nameof(input.PassportFile));

        // 1. Upload CV document
        var cvResult = await _fileStorageService.UploadDocumentAsync(input.CvFile, "careers/cv");

        // 2. Upload Passport / Identification file
        var passportResult = await _fileStorageService.UploadIdentificationAsync(input.PassportFile, "careers/passports");

        // 3. Generate unique application reference code
        var referenceCode = $"APP-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        while (await _dbContext.MasterJobApplications.AnyAsync(a => a.ApplicationReference == referenceCode))
        {
            referenceCode = $"APP-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        }

        // 4. Create database entity
        var application = new MasterJobApplication
        {
            Id = Guid.NewGuid(),
            MasterJobOpeningId = input.JobOpeningId,
            ApplicationReference = referenceCode,
            FullName = input.FullName.Trim(),
            Email = input.Email.Trim().ToLowerInvariant(),
            PhoneNumber = input.PhoneNumber.Trim(),
            City = input.City.Trim(),
            Country = input.Country.Trim(),
            LinkedInOrPortfolioUrl = input.LinkedInOrPortfolioUrl?.Trim(),
            CoverLetter = input.CoverLetter.Trim(),
            CvFileName = cvResult.OriginalFileName,
            CvUrl = cvResult.SecureUrl,
            CvFileSizeBytes = cvResult.FileSizeBytes,
            PassportFileName = passportResult.OriginalFileName,
            PassportUrl = passportResult.SecureUrl,
            PassportFileSizeBytes = passportResult.FileSizeBytes,
            Status = "Submitted",
            TermsAgreed = true,
            ClientIp = clientIp,
            SubmittedUtc = DateTime.UtcNow
        };

        _dbContext.MasterJobApplications.Add(application);
        await _dbContext.SaveChangesAsync();

        // Dispatch dual notification emails (candidate confirmation receipt + talent acquisition admin pool)
        try
        {
            var opening = await _dbContext.MasterJobOpenings
                .AsNoTracking()
                .FirstOrDefaultAsync(j => j.Id == input.JobOpeningId);
            var openingTitle = opening?.Title ?? "Open Role";
            await _emailService.SendJobApplicationDualAsync(application, openingTitle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch dual emails for candidate application {Ref}", referenceCode);
        }

        return referenceCode;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> GetDepartmentsAsync()
    {
        await EnsureSeedOpeningsAsync();

        var departments = await _dbContext.MasterJobOpenings
            .AsNoTracking()
            .Where(j => j.IsActive)
            .Select(j => j.Department)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();

        return departments.AsReadOnly();
    }

    /// <summary>
    /// Maps a database job opening entity to the presentation model.
    /// </summary>
    private static JobOpeningModel MapToModel(MasterJobOpening entity)
    {
        List<string> responsibilities;
        List<string> qualifications;
        List<string> benefits;

        try
        {
            responsibilities = JsonSerializer.Deserialize<List<string>>(entity.ResponsibilitiesJson) ?? new List<string>();
        }
        catch
        {
            responsibilities = new List<string>();
        }

        try
        {
            qualifications = JsonSerializer.Deserialize<List<string>>(entity.QualificationsJson) ?? new List<string>();
        }
        catch
        {
            qualifications = new List<string>();
        }

        try
        {
            benefits = JsonSerializer.Deserialize<List<string>>(entity.BenefitsJson) ?? new List<string>();
        }
        catch
        {
            benefits = new List<string>();
        }

        return new JobOpeningModel
        {
            Id = entity.Id,
            Slug = entity.Slug,
            Title = entity.Title,
            Department = entity.Department,
            Location = entity.Location,
            EmploymentType = entity.EmploymentType,
            ExperienceLevel = entity.ExperienceLevel,
            LanguageRequirements = entity.LanguageRequirements,
            Summary = entity.Summary,
            DescriptionHtml = entity.DescriptionHtml,
            Responsibilities = responsibilities,
            Qualifications = qualifications,
            Benefits = benefits,
            CreatedUtc = entity.CreatedUtc
        };
    }

    /// <summary>
    /// Ensures that seed job roles exist in the Master Catalog database on startup.
    /// </summary>
    private async Task EnsureSeedOpeningsAsync()
    {
        if (await _dbContext.MasterJobOpenings.AnyAsync())
        {
            return;
        }

        var roles = new List<MasterJobOpening>
        {
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "regional-administrator-europe",
                Title = "Regional Administrator (UK & Europe)",
                Department = "Regional Operations",
                Location = "London, UK (Hybrid / Remote)",
                EmploymentType = "Full-time",
                ExperienceLevel = "Senior",
                LanguageRequirements = "English (Fluent)",
                SortOrder = 1,
                Summary = "Lead regional organization onboarding, localized regulatory compliance, enterprise trust frameworks, and client operations across Europe and the United Kingdom.",
                DescriptionHtml = @"
                    <p>As a Regional Administrator for the UK & Europe at Ozikol, you will oversee enterprise cloud operational integrity, regulatory compliance, and client onboarding across our European client portfolio. You will act as the key liaison between corporate leadership and regional organizations, ensuring seamless governance, fast incident resolution, and localized platform adoption.</p>
                    <h3>The Opportunity</h3>
                    <p>This role offers significant autonomy to build out operational standards for healthcare charities, civic trusts, and international enterprises utilizing our modular business cloud operating platform.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Oversee enterprise workspace administrative provisioning and domain configuration for UK and European enterprise clients.",
                    "Ensure localized compliance with UK GDPR, EU GDPR, and regional statutory data protection frameworks.",
                    "Partner with regional account managers to resolve complex operational escalations and service delivery inquiries.",
                    "Lead regular operational reviews and provide structured feedback to central engineering on localized feature needs.",
                    "Coordinate with regional incident response coordinators during critical platform maintenance windows."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "5+ years of experience in regional operations management, IT administration, or SaaS platform governance.",
                    "Deep understanding of UK and EU data protection regulations, access controls, and administrative workflows.",
                    "Proven leadership in coordinating cross-functional remote teams and resolving client escalations.",
                    "Excellent verbal and written communication in English; additional European language skills are a plus.",
                    "Strong analytical mindset with familiarity in database management and MIS reporting systems."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Comprehensive private medical, dental, and optical insurance coverage.",
                    "Generous annual learning and executive development stipend (£2,500).",
                    "Company equity options and performance incentive program.",
                    "30 days paid annual leave plus public holidays.",
                    "Home office ergonomic setup allowance and latest hardware equipment.",
                    "Flexible hybrid working model with central London hub access."
                }),
                IsActive = true
            },
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "affiliate-partner-administrator",
                Title = "Affiliate & Strategic Partner Administrator",
                Department = "Partner Ecosystem",
                Location = "Remote / Global",
                EmploymentType = "Full-time",
                ExperienceLevel = "Mid-Level",
                LanguageRequirements = "English",
                SortOrder = 2,
                Summary = "Manage global systems integrator partnerships, UI creator royalty distributions, deal registrations, and co-selling networks.",
                DescriptionHtml = @"
                    <p>The Ozikol Partner Network encompasses enterprise systems integrators, independent UI blueprint creators, and strategic advocates. We are seeking an energetic Affiliate & Strategic Partner Administrator to manage day-to-day partner approvals, commission telemetry, co-selling registrations, and creator marketplace submissions.</p>
                    <h3>The Opportunity</h3>
                    <p>You will play a central role in cultivating our global ecosystem, ensuring our partners receive transparent reporting, timely payouts, and top-tier technical enablement.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Review, verify, and approve incoming partner and UI creator program applications.",
                    "Monitor referral link traffic, conversion telemetry, and deal registration validation.",
                    "Administer monthly partner commission reconciliations and automated royalty distribution pipelines.",
                    "Provide operational support to systems integrators and enterprise consultancies on sandbox environments.",
                    "Maintain partner onboarding documentation, guideline updates, and promotional collateral."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "3+ years in partner operations, affiliate program management, or developer relations.",
                    "Familiarity with SaaS partner platforms, referral tracking systems, and automated billing workflows.",
                    "Outstanding organizational skills and attention to financial detail during commission reconciliation.",
                    "Strong interpersonal skills for building trusted relationships with external agencies and creators.",
                    "Professional fluency in English."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Competitive base compensation plus partner ecosystem growth bonuses.",
                    "Full private healthcare package and wellness support.",
                    "100% remote working flexibility from anywhere in your region.",
                    "Annual team retreats and global partner conference attendance.",
                    "Generous paid time off and learning stipends."
                }),
                IsActive = true
            },
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "customer-care-specialist-english",
                Title = "Customer Care & Success Specialist (English & Global)",
                Department = "Customer Care & Success",
                Location = "Remote / Global",
                EmploymentType = "Full-time",
                ExperienceLevel = "Mid-Level",
                LanguageRequirements = "English (Native / Fluent)",
                SortOrder = 3,
                Summary = "Deliver 24/7 proactive technical onboarding, shift management support, and incident assistance to organizational administrators worldwide.",
                DescriptionHtml = @"
                    <p>Customer success is the cornerstone of the Ozikol platform. As a Customer Care & Success Specialist for our English and global accounts, you will empower administrators, managers, and staff to maximize the value of their dedicated organization suites.</p>
                    <h3>The Opportunity</h3>
                    <p>You will handle diverse technical queries covering workforce shift rotas, invoicing, mass messaging, and MIS API configurations, transforming customer challenges into smooth, delightful experiences.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Provide rapid, empathetic, and accurate technical support via live chat, email, and scheduled video sessions.",
                    "Assist organization administrators with initial suite provisioning, staff imports, and role assignments.",
                    "Diagnose and reproduce technical issues, creating concise bug tickets for the core engineering group.",
                    "Author customer help articles, FAQs, and step-by-step video guides in the Customer Support Hub.",
                    "Gather customer sentiment and advocate for product improvements during weekly roadmap reviews."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "2+ years of customer care, technical support, or client onboarding experience in a B2B SaaS environment.",
                    "Flawless written and verbal English communication skills.",
                    "Ability to explain complex software concepts clearly to non-technical users.",
                    "Familiarity with helpdesk tooling (e.g. Zendesk, Intercom, Jira Service Desk).",
                    "Positive attitude and passion for helping organizations succeed."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Comprehensive global healthcare and mental wellbeing benefits.",
                    "Work-from-anywhere flexibility with internet and gear subsidies.",
                    "Quarterly performance awards and continuous internal promotion tracks.",
                    "28 days annual leave and generous family leave policies."
                }),
                IsActive = true
            },
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "customer-care-specialist-french",
                Title = "Customer Care & Success Specialist (Bilingual French / Français)",
                Department = "Customer Care & Success",
                Location = "Paris, France / Remote",
                EmploymentType = "Full-time",
                ExperienceLevel = "Mid-Level",
                LanguageRequirements = "French & English",
                SortOrder = 4,
                Summary = "Provide dedicated native French-language customer onboarding, technical assistance, and relationship care to institutional clients in France, Belgium, and West Africa.",
                DescriptionHtml = @"
                    <p>Notre plateforme unifiée se développe rapidement dans les pays francophones. En tant que Spécialiste Service Client et Succès Client bilingue Français/Anglais, vous accompagnerez les entreprises, associations caritatives et institutions publiques francophones dans leur utilisation quotidienne d'Ozikol.</p>
                    <h3>La Mission</h3>
                    <p>Vous serez le référent technique et opérationnel pour nos clients en France, en Belgique, en Suisse et en Afrique de l'Ouest, garantissant une adoption fluide de nos 37 capacités modulaires.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Assurer un support client de premier ordre en français et en anglais par messagerie directe, e-mail et visio.",
                    "Accompagner les directeurs opérationnels et administrateurs lors du paramétrage initial de leurs plannings et facturations.",
                    "Traduire et adapter les guides d'aide, tutoriels et notes de version en français soigné et naturel.",
                    "Faire le lien entre les besoins spécifiques du marché francophone et nos équipes produit centrales.",
                    "Contribuer à l'amélioration continue des processus d'onboarding régionaux."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "Niveau de français langue maternelle ou C2 bilingue irréprochable (écrit et oral).",
                    "Très bon niveau d'anglais professionnel (B2/C1 minimum) pour échanger avec les équipes centrales.",
                    "Au moins 2 ans d'expérience en relation client, support technique ou Customer Success dans le secteur logiciel/SaaS.",
                    "Pédagogie, empathie et rigueur dans le suivi des dossiers clients.",
                    "Aisance avec les environnements logiciels cloud et la gestion de tickets."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Mutuelle santé d'entreprise complète et prévoyance.",
                    "Télétravail flexible avec forfait équipement et connexion internet.",
                    "Budget annuel dédié aux formations professionnelles et certifications.",
                    "Congés payés statutaires avantageux et RTT selon statut.",
                    "Culture d'entreprise internationale valorisant l'inclusion et l'autonomie."
                }),
                IsActive = true
            },
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "customer-care-specialist-italian",
                Title = "Customer Care & Success Specialist (Bilingual Italian / Italiano)",
                Department = "Customer Care & Success",
                Location = "Milan, Italy / Remote",
                EmploymentType = "Full-time",
                ExperienceLevel = "Mid-Level",
                LanguageRequirements = "Italian & English",
                SortOrder = 5,
                Summary = "Provide dedicated native Italian-language client care, workflow troubleshooting, and account success support to Italian organizations, civic bodies, and regional teams.",
                DescriptionHtml = @"
                    <p>La nostra presenza in Italia si sta espandendo costantemente. Siamo alla ricerca di uno Specialista Customer Care e Success bilingue Italiano/Inglese che guidi le organizzazioni, gli enti del terzo settore e le aziende italiane nell'utilizzo ottimale della piattaforma cloud Ozikol.</p>
                    <h3>L'Opportunità</h3>
                    <p>In questo ruolo gestirai l'onboarding e il supporto operativo per clienti strategici in Italia, aiutandoli a digitalizzare turni di lavoro, comunicazioni massive e gestione presenze con la massima affidabilità.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Fornire supporto tecnico proattivo e tempestivo in lingua italiana e inglese a gestori e dipendenti.",
                    "Guidare sessioni di formazione e configurazione iniziale del portale per i nuovi clienti italiani.",
                    "Curare e localizzare la documentazione d'aiuto, articoli di supporto e guide passo-passo in italiano.",
                    "Collaborare con il team di sviluppo per segnalare e verificare tempestivamente anomalie software.",
                    "Monitorare la soddisfazione e la fidelizzazione del cliente nel mercato italiano."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "Madrelingua o livello C2 fluente in italiano (eccellente padronanza scritta e orale).",
                    "Ottima conoscenza della lingua inglese professionale (B2/C1) per la cooperazione aziendale globale.",
                    "Esperienza minima di 2 anni in ruoli di assistenza clienti, customer service o supporto tecnico SaaS.",
                    "Eccellenti doti relazionali, precisione e capacità di ascolto attivo.",
                    "Familiarità con strumenti di ticketing e piattaforme cloud moderne."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Copertura sanitaria integrativa completa e assistenza benessere.",
                    "Modello di lavoro 100% flessibile (remoto o ibrido con supporto sede a Milano).",
                    "Bonus annuale sui risultati di soddisfazione cliente e crescita aziendale.",
                    "Budget formativo annuale per corsi di aggiornamento e certificazioni.",
                    "Dotazione tecnologica di ultima generazione per l'ufficio a casa."
                }),
                IsActive = true
            },
            new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Slug = "cloud-systems-security-engineer",
                Title = "Cloud Infrastructure & BYOK Security Engineer",
                Department = "Engineering & Security",
                Location = "Remote / Global",
                EmploymentType = "Full-time",
                ExperienceLevel = "Senior",
                LanguageRequirements = "English",
                SortOrder = 6,
                Summary = "Architect and maintain isolated cryptographic partitions, automated zero-downtime deployments, and Bring-Your-Own-Key (BYOK) privacy pipelines.",
                DescriptionHtml = @"
                    <p>Ozikol operates on a strict dedicated fleet isolation architecture with Bring-Your-Own-Key (BYOK) cryptographic boundaries and localized data partitioning. We are seeking a senior Cloud Infrastructure & BYOK Security Engineer to maintain our zero-trust infrastructure, automated CI/CD pipelines, and high-availability database replication.</p>
                    <h3>The Opportunity</h3>
                    <p>You will have complete ownership over cloud reliability, disaster recovery orchestration, and automated vulnerability mitigations across our international data centers.</p>",
                ResponsibilitiesJson = JsonSerializer.Serialize(new[]
                {
                    "Design, deploy, and monitor scalable cloud infrastructure across multi-region Kubernetes clusters.",
                    "Implement and audit Bring-Your-Own-Key (BYOK) cryptographic envelopes and hardware security module (HSM) integrations.",
                    "Maintain automated zero-downtime CI/CD deployment pipelines and infrastructure as code (Terraform / Bicep).",
                    "Conduct regular penetration testing, vulnerability assessments, and automated compliance auditing.",
                    "Participate in the 24/7 on-call infrastructure rotation for critical high-availability incidents."
                }),
                QualificationsJson = JsonSerializer.Serialize(new[]
                {
                    "4+ years of professional cloud engineering and infrastructure security experience in high-availability SaaS.",
                    "Strong expertise with container orchestration (Kubernetes, Docker), networking, and cloud security frameworks.",
                    "Hands-on experience with cryptographic key management, TLS termination, and isolated database partitioning.",
                    "Proficiency in infrastructure as code tooling (Terraform, Ansible, or CloudFormation).",
                    "Professional working fluency in English."
                }),
                BenefitsJson = JsonSerializer.Serialize(new[]
                {
                    "Top-tier compensation package with meaningful equity participation.",
                    "Full international private healthcare and wellness coverage.",
                    "Generous hardware and home lab setup budget ($3,000 upfront + annual refresh).",
                    "Unlimited paid time off policy with mandatory minimum rest days.",
                    "Annual international technical conference travel sponsorship."
                }),
                IsActive = true
            }
        };

        _dbContext.MasterJobOpenings.AddRange(roles);
        await _dbContext.SaveChangesAsync();
    }
}
