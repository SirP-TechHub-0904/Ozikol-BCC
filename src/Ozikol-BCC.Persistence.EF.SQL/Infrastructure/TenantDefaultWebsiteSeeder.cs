using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Persistence.EF.SQL.Infrastructure;

/// <summary>
/// Turnkey default website seeder for tenant sovereign databases.
/// Provisions the foundational website suite upon initial workspace registration or on-demand re-seed:
/// 1. 3 Standard CMS Forms (Contact Us, Newsletter, Service Request) with dynamic fields.
/// 2. 3 Rich Editorial Blog Articles with excerpts and formatted rich-text HTML bodies.
/// 3. Standard Navigation Categories and WebPages (Home, Services, Company, About, Team, Blog, Contact, Legal).
/// 4. 10 Dedicated Body Sections distributed across pages with PageSectionLists.
/// 5. Global SEO, OpenGraph, Twitter Cards, Favicon &amp; Mobile PWA meta tags in &lt;head&gt;.
/// 6. Automatic initialization timestamping via MisWebsiteSettings.
/// </summary>
public static class TenantDefaultWebsiteSeeder
{
    /// <summary>
    /// Provisions the complete turnkey default website structure and content into the provided tenant database context.
    /// </summary>
    /// <param name="context">The target tenant's <see cref="DashboardDbContext"/> instance.</param>
    /// <param name="organizationName">Optional organization name for brand personalization.</param>
    /// <param name="cancellationToken">Cancellation token for asynchronous execution.</param>
    public static async Task SeedDefaultWebsiteSuiteAsync(
        DashboardDbContext context,
        string? organizationName = null,
        CancellationToken cancellationToken = default)
    {
        var setting = await context.MisWebsiteSettings.FirstOrDefaultAsync(cancellationToken);
        string orgName = !string.IsNullOrWhiteSpace(organizationName)
            ? organizationName.Trim()
            : (setting?.BrandName ?? "Our Firm");
        string abbrev = setting?.CompanyNameAbbreviation ?? "OZI";

        // =========================================================================
        // 1. Seed Dynamic Forms (Contact Us, Newsletter, Service Request)
        // =========================================================================
        var contactForm = await context.PageForms.FirstOrDefaultAsync(
            f => f.FormKey == "Contact_Us" || f.FormKey == "contact-us", cancellationToken);

        if (contactForm == null)
        {
            contactForm = new PageForm
            {
                Id = Guid.NewGuid(),
                Title = "Contact Us",
                FormKey = "Contact_Us",
                Description = "Send our team a direct message and we will respond promptly.",
                SubmitButtonText = "Send Message",
                SuccessMessage = "Thank you! Your message has been received. Our team will get back to you shortly.",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                Fields = new List<PageFormField>
                {
                    new() { Id = Guid.NewGuid(), FieldKey = "full_name", Label = "Full Name", Placeholder = "e.g. First Last", FieldType = "text", IsRequired = true, SortOrder = 1, GridWidth = "col-md-6" },
                    new() { Id = Guid.NewGuid(), FieldKey = "email", Label = "Email Address", Placeholder = "name@company.com", FieldType = "email", IsRequired = true, SortOrder = 2, GridWidth = "col-md-6" },
                    new() { Id = Guid.NewGuid(), FieldKey = "phone", Label = "Phone Number", Placeholder = "e.g. +1 (555) 000-0000", FieldType = "phone", IsRequired = false, SortOrder = 3, GridWidth = "col-md-6" },
                    new() { Id = Guid.NewGuid(), FieldKey = "subject", Label = "Subject", Placeholder = "e.g. Partnership Inquiry", FieldType = "text", IsRequired = false, SortOrder = 4, GridWidth = "col-md-6" },
                    new() { Id = Guid.NewGuid(), FieldKey = "message", Label = "Your Message", Placeholder = "Please describe your inquiry or requirements in detail...", FieldType = "textarea", IsRequired = true, SortOrder = 5, GridWidth = "col-md-12" }
                }
            };
            context.PageForms.Add(contactForm);
        }

        var newsletterForm = await context.PageForms.FirstOrDefaultAsync(
            f => f.FormKey == "Newsletter" || f.FormKey == "newsletter", cancellationToken);

        if (newsletterForm == null)
        {
            newsletterForm = new PageForm
            {
                Id = Guid.NewGuid(),
                Title = "Newsletter Subscription",
                FormKey = "Newsletter",
                Description = "Subscribe to our periodic industry insights, corporate bulletins, and platform updates.",
                SubmitButtonText = "Subscribe",
                SuccessMessage = "Thank you for subscribing! You have been added to our priority announcement list.",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                Fields = new List<PageFormField>
                {
                    new() { Id = Guid.NewGuid(), FieldKey = "email", Label = "Official Business Email", Placeholder = "name@company.com", FieldType = "email", IsRequired = true, SortOrder = 1, GridWidth = "col-md-12" }
                }
            };
            context.PageForms.Add(newsletterForm);
        }

        var serviceRequestForm = await context.PageForms.FirstOrDefaultAsync(
            f => f.FormKey == "Service_Request" || f.FormKey == "service-request", cancellationToken);

        if (serviceRequestForm == null)
        {
            serviceRequestForm = new PageForm
            {
                Id = Guid.NewGuid(),
                Title = "Service Request & Project Intake",
                FormKey = "Service_Request",
                Description = "Please answer the questions below so we can pair you with the right specialist.",
                SubmitButtonText = "Submit Service Request",
                SuccessMessage = "Thank you! Your service request has been received. A dedicated specialist will contact you within 1 business day.",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                Fields = new List<PageFormField>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "service_required",
                        Label = "1. What service or solution do you require?",
                        FieldType = "pill_select",
                        OptionsJson = "[\"Strategic Consulting & Advisory\", \"Digital Systems Modernization\", \"Directory & Portal Governance\", \"Custom Enterprise Integration\"]",
                        IsRequired = true,
                        SortOrder = 1,
                        GridWidth = "col-md-12"
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "timeline",
                        Label = "2. Estimated Timeline",
                        FieldType = "dropdown",
                        OptionsJson = "[\"Immediate (Within 30 Days)\", \"1–3 Months\", \"Next Fiscal Quarter\", \"Exploratory / Feasibility Only\"]",
                        IsRequired = true,
                        SortOrder = 2,
                        GridWidth = "col-md-6"
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "organization_scale",
                        Label = "3. Organization Scale",
                        FieldType = "dropdown",
                        OptionsJson = "[\"1–50 Members / Staff\", \"50–500 Enterprise Members\", \"500+ Large Institutional Body\"]",
                        IsRequired = true,
                        SortOrder = 3,
                        GridWidth = "col-md-6"
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "full_name",
                        Label = "Full Name",
                        Placeholder = "e.g. First Last",
                        FieldType = "text",
                        IsRequired = true,
                        SortOrder = 4,
                        GridWidth = "col-md-6"
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "email",
                        Label = "Official Business Email",
                        Placeholder = "name@company.com",
                        FieldType = "email",
                        IsRequired = true,
                        SortOrder = 5,
                        GridWidth = "col-md-6"
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "project_brief",
                        Label = "4. Project Brief & Key Requirements",
                        Placeholder = "Briefly describe your objectives, existing platform architecture, or challenges...",
                        FieldType = "textarea",
                        IsRequired = false,
                        SortOrder = 6,
                        GridWidth = "col-md-12"
                    }
                }
            };
            context.PageForms.Add(serviceRequestForm);
        }

        await context.SaveChangesAsync(cancellationToken);

        // =========================================================================
        // 2. Seed Editorial Blog Category & 3 Full Rich Articles
        // =========================================================================
        var defaultBlogCategory = await context.BlogCategories.FirstOrDefaultAsync(
            c => c.Title == "Enterprise Insights & Strategy", cancellationToken);

        if (defaultBlogCategory == null)
        {
            defaultBlogCategory = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Title = "Enterprise Insights & Strategy",
                Publish = true
            };
            context.BlogCategories.Add(defaultBlogCategory);
            await context.SaveChangesAsync(cancellationToken);
        }

        if (!await context.Blogs.AnyAsync(cancellationToken))
        {
            var blog1 = new Blog
            {
                Id = Guid.NewGuid(),
                Title = "Architecting Resilient Cloud Ecosystems for the Modern Enterprise",
                Date = DateTime.UtcNow.AddDays(-2),
                Publish = true,
                SortOrder = 1,
                AddToRibon = true,
                BlogCategoryId = defaultBlogCategory.Id,
                ImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
                Description = "A strategic blueprint for achieving high availability, fault tolerance, and multi-region data sovereignty across enterprise workloads.",
                FullDescription = @"<p class=""lead fs-5 text-secondary"">As organizations accelerate digital transformation, engineering resilient architectures capable of withstanding distributed outages is no longer optional—it is a core operational mandate.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Decentralized Fault Domains and Redundancy</h3>
<p>Modern architectures require decoupled service boundaries where state and execution logic operate independently. By isolating workloads into discrete tenant partitions, systemic blast radiuses are mitigated, preventing localized failures from cascading across the entire ecosystem.</p>
<blockquote class=""border-start border-primary border-4 ps-3 py-2 my-4 bg-light rounded"">
<p class=""fst-italic text-dark mb-0"">""True resilience is designed from inception through immutable infrastructure, automated health verification, and continuous failover testing.""</p>
</blockquote>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Continuous Observability and Automated Recovery</h3>
<p>Proactive monitoring paired with synthetic transaction testing guarantees that performance degradations are identified and resolved before affecting mission-critical business transactions.</p>"
            };

            var blog2 = new Blog
            {
                Id = Guid.NewGuid(),
                Title = "The Paradigm Shift to Zero-Downtime Migration Pipelines",
                Date = DateTime.UtcNow.AddDays(-6),
                Publish = true,
                SortOrder = 2,
                AddToRibon = true,
                BlogCategoryId = defaultBlogCategory.Id,
                ImageUrl = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80",
                Description = "How progressive engineering organizations execute mission-critical database cutovers and schema upgrades without interrupting active user sessions.",
                FullDescription = @"<p class=""lead fs-5 text-secondary"">Performing live database migrations under heavy operational throughput requires disciplined schema versioning, dual-write pipelines, and backward-compatible data contracts.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Phased Schema Evolution and Non-Breaking Contracts</h3>
<p>The expand-and-contract methodology decouples code deployment from data migration. By introducing new columns and tables in advance of application logic updates, existing operational workloads maintain complete continuity.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Automated Validation and Verification Gates</h3>
<p>Real-time data reconciliation scripts ensure that transactional synchronization remains at 100% fidelity before traffic cutover, virtually eliminating rollback risks.</p>"
            };

            var blog3 = new Blog
            {
                Id = Guid.NewGuid(),
                Title = "Next-Gen Identity Governance & Role-Based Access Control",
                Date = DateTime.UtcNow.AddDays(-10),
                Publish = true,
                SortOrder = 3,
                AddToRibon = true,
                BlogCategoryId = defaultBlogCategory.Id,
                ImageUrl = "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
                Description = "Balancing administrative agility with rigorous zero-trust security postures across sovereign multi-tenant workspaces.",
                FullDescription = @"<p class=""lead fs-5 text-secondary"">Safeguarding enterprise assets demands granular authorization matrices, cryptographic session binding, and comprehensive audit trail logging across all administrative endpoints.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Least Privilege Access Models</h3>
<p>Dynamic permission assignment ensures staff members and collaborators receive strictly the access required to fulfill their duties, minimizing organizational attack surfaces.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Immutable Audit Trails</h3>
<p>Every administrative event, configuration change, and permission elevation is permanently logged in tamper-evident audit records to facilitate regulatory compliance and forensic oversight.</p>"
            };

            context.Blogs.AddRange(blog1, blog2, blog3);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 3. Seed Page Categories (Services & Company)
        // =========================================================================
        var servicesCategory = await context.PageCategories.FirstOrDefaultAsync(
            c => c.Title == "Services", cancellationToken);

        if (servicesCategory == null)
        {
            servicesCategory = new PageCategory
            {
                Id = Guid.NewGuid(),
                Title = "Services",
                FooterDisplayTitle = "Solutions",
                MenuSortOrder = 3,
                ShowInFooter = true,
                Publish = true
            };
            context.PageCategories.Add(servicesCategory);
        }

        var companyCategory = await context.PageCategories.FirstOrDefaultAsync(
            c => c.Title == "Company", cancellationToken);

        if (companyCategory == null)
        {
            companyCategory = new PageCategory
            {
                Id = Guid.NewGuid(),
                Title = "Company",
                FooterDisplayTitle = "Company",
                MenuSortOrder = 4,
                ShowInFooter = true,
                Publish = true
            };
            context.PageCategories.Add(companyCategory);
        }

        await context.SaveChangesAsync(cancellationToken);

        // =========================================================================
        // 4. Seed WebPages
        // =========================================================================
        var homePage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "home", cancellationToken);
        if (homePage == null)
        {
            homePage = new WebPage { Id = Guid.NewGuid(), Title = "Home", DirectUrl = "home", IsHomePage = true, ShowInMainMenu = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 1 };
            context.WebPages.Add(homePage);
        }

        var servicesPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "services", cancellationToken);
        if (servicesPage == null)
        {
            servicesPage = new WebPage { Id = Guid.NewGuid(), Title = "Services", DirectUrl = "services", PageCategoryId = servicesCategory.Id, ShowInMainMenu = false, ShowInMenuDropDown = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 10 };
            context.WebPages.Add(servicesPage);
        }

        var aboutPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "about", cancellationToken);
        if (aboutPage == null)
        {
            aboutPage = new WebPage { Id = Guid.NewGuid(), Title = "About Us", DirectUrl = "about", PageCategoryId = companyCategory.Id, ShowInMainMenu = false, ShowInMenuDropDown = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 20 };
            context.WebPages.Add(aboutPage);
        }

        var teamPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "team", cancellationToken);
        if (teamPage == null)
        {
            teamPage = new WebPage { Id = Guid.NewGuid(), Title = "Leadership Team", DirectUrl = "team", PageCategoryId = companyCategory.Id, ShowInMainMenu = false, ShowInMenuDropDown = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 22 };
            context.WebPages.Add(teamPage);
        }

        var blogPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "blog", cancellationToken);
        if (blogPage == null)
        {
            blogPage = new WebPage { Id = Guid.NewGuid(), Title = "Blog", DirectUrl = "blog", ShowInMainMenu = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 2 };
            context.WebPages.Add(blogPage);
        }

        var contactPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "contact", cancellationToken);
        if (contactPage == null)
        {
            contactPage = new WebPage { Id = Guid.NewGuid(), Title = "Contact", DirectUrl = "contact", ShowInMainMenu = true, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 3 };
            context.WebPages.Add(contactPage);
        }

        var requestServicePage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "request-service", cancellationToken);
        if (requestServicePage == null)
        {
            requestServicePage = new WebPage { Id = Guid.NewGuid(), Title = "Request a Service", DirectUrl = "request-service", ShowInMainMenu = false, ShowInMenuDropDown = false, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 30, IsMenuCTA = true };
            context.WebPages.Add(requestServicePage);
        }

        var privacyPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "privacy-policy", cancellationToken);
        if (privacyPage == null)
        {
            privacyPage = new WebPage { Id = Guid.NewGuid(), Title = "Privacy Policy", DirectUrl = "privacy-policy", IsLegal = true, ShowInMainMenu = false, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 40 };
            context.WebPages.Add(privacyPage);
        }

        var termsPage = await context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "terms-and-conditions", cancellationToken);
        if (termsPage == null)
        {
            termsPage = new WebPage { Id = Guid.NewGuid(), Title = "Terms & Conditions", DirectUrl = "terms-and-conditions", IsLegal = true, ShowInMainMenu = false, ShowInFooter = true, EnableDirectUrl = true, Publish = true, SortOrder = 41 };
            context.WebPages.Add(termsPage);
        }

        await context.SaveChangesAsync(cancellationToken);

        // =========================================================================
        // 5. Seed 10 Body Sections Distributed Across Pages
        // =========================================================================
        if (!await context.PageSections.AnyAsync(cancellationToken))
        {
            var sections = new List<PageSection>();

            // HOME PAGE SECTIONS
            var homeHero = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = homePage.Id,
                TemplateKey = "Hero_CorporateSplit",
                Title = "Empowering Modern Enterprises to Scale with Confidence.",
                MiniTitle = $"{abbrev} SOLUTIONS",
                Description = "Delivering innovative solutions, strategic consulting, and operational excellence to help your business achieve sustainable success.",
                ButtonText = "Explore Services",
                ButtonLink = "/services",
                SecondButtonText = "Schedule Consultation",
                SecondButtonLink = "/contact",
                ImageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
                DirectUrl = "home-hero",
                PageSortOrder = 1
            };
            sections.Add(homeHero);

            var homeFeatures = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = homePage.Id,
                TemplateKey = "features-3col",
                Title = "Engineered for Maximum Impact",
                MiniTitle = "CORE CAPABILITIES",
                Description = "Essential infrastructure designed for seamless organizational execution and rapid growth.",
                DirectUrl = "features",
                PageSortOrder = 2,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Data Security & Privacy", Description = "Enterprise-grade encryption, role-based access management, and proactive compliance protection.", IconText = "fa-solid fa-shield-halved", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Collaboration Hub", Description = "Unified communication channels, real-time dispatches, and organizational announcements.", IconText = "fa-solid fa-comments", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Operational Efficiency", Description = "Modern automated workflows engineered to eliminate administrative bottlenecks and elevate team productivity.", IconText = "fa-solid fa-bolt", SortOrder = 3 }
                }
            };
            sections.Add(homeFeatures);

            var homeStats = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = homePage.Id,
                TemplateKey = "stats-counter",
                Title = "Measurable Performance at Scale",
                MiniTitle = "BY THE NUMBERS",
                Description = "Our proven track record demonstrates enterprise reliability and measurable impact.",
                DirectUrl = "metrics",
                PageSortOrder = 3,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "12,500+", Description = "Verified Members", IconText = "fa-solid fa-users text-primary", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "99.98%", Description = "System Reliability", IconText = "fa-solid fa-server text-success", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "45+", Description = "Global Chapters", IconText = "fa-solid fa-earth-americas text-info", SortOrder = 3 },
                    new() { Id = Guid.NewGuid(), Title = "24/7", Description = "Priority Support", IconText = "fa-solid fa-headset text-warning", SortOrder = 4 }
                }
            };
            sections.Add(homeStats);

            var homeShowcase = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = homePage.Id,
                TemplateKey = "split-media-showcase",
                Title = "Engineered for Agility, Reliability, and Measurable Growth",
                MiniTitle = "WHY CHOOSE US",
                Description = "We combine deep technical expertise, industry best practices, and a client-centered methodology to deliver measurable organizational outcomes.",
                ImageUrl = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80",
                DirectUrl = "why-choose-us",
                PageSortOrder = 4,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Zero Operational Downtime", Description = "High-availability cloud infrastructure engineered to keep your critical business systems online 24/7/365.", IconText = "fa-solid fa-bolt text-warning", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Transparent Strategic Roadmaps", Description = "Every initiative is supported by clear timelines, verifiable KPIs, and proactive milestone reporting.", IconText = "fa-solid fa-chart-line text-primary", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Comprehensive Client Confidentiality", Description = "End-to-end data security and compliance safeguards protecting your corporate and proprietary information.", IconText = "fa-solid fa-lock text-success", SortOrder = 3 }
                }
            };
            sections.Add(homeShowcase);

            var homeTestimonials = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = homePage.Id,
                TemplateKey = "testimonials-grid",
                Title = "Trusted by Clients & Industry Leaders",
                MiniTitle = "CLIENT TESTIMONIALS",
                Description = "Hear directly from businesses and partners who rely on our services for sustainable growth.",
                DirectUrl = "testimonials",
                PageSortOrder = 5,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Sarah Adams", MiniTitle = "SA", Description = "Working with our partners transformed our operational efficiency. Their team provided clear strategic direction and delivered outstanding results from day one.", MoreDescription = "Chief Operating Officer", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Marcus Kim", MiniTitle = "MK", Description = "Their professionalism, deep industry expertise, and responsive support have made them an indispensable partner in scaling our business.", MoreDescription = "Managing Director", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Elena Rostova", MiniTitle = "EL", Description = "The quality of execution and attention to detail exceeded our expectations. They consistently deliver on time and above benchmark.", MoreDescription = "VP of Business Development", SortOrder = 3 }
                }
            };
            sections.Add(homeTestimonials);

            // ABOUT US PAGE SECTIONS
            var aboutProcess = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = aboutPage.Id,
                TemplateKey = "process-steps",
                Title = "Our Proven 4-Step Strategic Methodology",
                MiniTitle = "HOW WE DELIVER",
                Description = "A structured approach engineered to transition your organizational vision into measurable reality.",
                DirectUrl = "process-methodology",
                PageSortOrder = 1,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Discovery & Audit", MiniTitle = "Step 01", Description = "Thorough analysis of existing organizational processes, bottlenecks, and security postures.", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Architecture & Roadmap", MiniTitle = "Step 02", Description = "Collaborative blueprint design with verifiable KPIs and phased delivery milestones.", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Implementation & Testing", MiniTitle = "Step 03", Description = "Iterative rollout with rigorous testing and zero operational downtime.", SortOrder = 3 },
                    new() { Id = Guid.NewGuid(), Title = "Continuous Optimization", MiniTitle = "Step 04", Description = "Proactive SLA management, ongoing improvements, and executive governance.", SortOrder = 4 }
                }
            };
            sections.Add(aboutProcess);

            var teamSection = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = teamPage.Id,
                TemplateKey = "team-grid",
                Title = "Principal Directors & Advisory Counsel",
                MiniTitle = "EXECUTIVE DIRECTORS",
                Description = "Meet the experienced specialists steering our organizational standards and client delivery.",
                DirectUrl = "executives",
                PageSortOrder = 1,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "David Vance, MBA", MiniTitle = "Managing Partner", Description = "18+ years directing corporate transformations and enterprise governance across diverse industries.", IconText = "fa-solid fa-user-tie", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Alicia Sterling, Ph.D.", MiniTitle = "Head of Strategy", Description = "Specializing in institutional compliance, security frameworks, and risk management.", IconText = "fa-solid fa-scale-balanced", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Jonathan Brooks, PE", MiniTitle = "Director of Systems", Description = "Leading infrastructure reliability, distributed engineering pipelines, and cloud scale.", IconText = "fa-solid fa-laptop-code", SortOrder = 3 }
                }
            };
            sections.Add(teamSection);

            // SERVICES PAGE SECTIONS
            var servicesCards = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = servicesPage.Id,
                TemplateKey = "feature-cards-grid",
                Title = "Specialized Practice Areas & Deliverables",
                MiniTitle = "SOLUTIONS CATALOG",
                Description = "Explore the full spectrum of our advisory, technical, and governance offerings.",
                DirectUrl = "practice-areas",
                PageSortOrder = 1,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Strategic Consulting & Advisory", Description = "Diagnostic assessments, board-level roadmap formulation, and target operating model redesign.", IconText = "fa-solid fa-compass", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Digital Systems Modernization", Description = "Legacy software decoupling, cloud migration pipelines, and modern database refactoring.", IconText = "fa-solid fa-arrows-spin", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Governance & Data Protection", Description = "Zero-trust access architectures, regulatory auditing matrices, and operational recovery planning.", IconText = "fa-solid fa-file-shield", SortOrder = 3 }
                }
            };
            sections.Add(servicesCards);

            var pricingSection = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = servicesPage.Id,
                TemplateKey = "pricing-table",
                Title = "Transparent Plans for Teams of Every Scale",
                MiniTitle = "ENGAGEMENT MODELS",
                Description = "Choose the engagement model that best aligns with your organizational timeline and operational requirements.",
                DirectUrl = "engagement-models",
                PageSortOrder = 2,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Standard Advisory", MiniTitle = "$2,500/mo", Description = "Essential strategic counsel for growing teams requiring quarterly architecture reviews.", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Dedicated Partner", MiniTitle = "$5,000/mo", Description = "Complete operational oversight, continuous sprint integration, and priority SLA responses.", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Enterprise Sovereign", MiniTitle = "Custom", Description = "Full multi-tenant cluster deployment, white-glove migration, and dedicated technical director.", SortOrder = 3 }
                }
            };
            sections.Add(pricingSection);

            // CONTACT US PAGE SECTIONS
            var contactFaq = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = contactPage.Id,
                TemplateKey = "faq-accordion",
                Title = "Frequently Asked Questions",
                MiniTitle = "GOT QUESTIONS?",
                Description = "Clear answers to the most common questions regarding our platform, onboarding process, and enterprise capabilities.",
                DirectUrl = "contact-faq",
                PageSortOrder = 1,
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "What industries do you specialize in serving?", Description = "We work across professional services, logistics, technology, non-profit institutions, and enterprise commerce, delivering scalable digital solutions tailored to each sector's operational workflow." },
                    new() { Id = Guid.NewGuid(), Title = "How long does a typical implementation take?", Description = "Standard onboarding is completed within 1 to 3 business weeks. Custom integrations and complex enterprise deployments follow structured milestone schedules defined during our initial consultation." },
                    new() { Id = Guid.NewGuid(), Title = "What level of ongoing technical support is provided?", Description = "All active accounts receive dedicated operational support, proactive system updates, and automated security monitoring with guaranteed SLA response times." }
                }
            };
            sections.Add(contactFaq);

            var contactDetailsFormSection = new PageSection
            {
                Id = Guid.NewGuid(),
                WebPageId = contactPage.Id,
                TemplateKey = "contact-details-form",
                Title = "Send Us a Direct Message",
                MiniTitle = "OFFICIAL INQUIRIES",
                Description = "Have questions regarding our services, partnerships, or operational support? Send us a message and our team will get back to you promptly.",
                DirectUrl = "contact-form",
                PageSortOrder = 2,
                PageFormId = contactForm.Id,
                FormKey = "Contact_Us",
                PageSectionLists = new List<PageSectionList>
                {
                    new() { Id = Guid.NewGuid(), Title = "Corporate Office", Description = "Administrative Headquarters, 742 Evergreen Terrace, Suite 500", IconText = "fa-solid fa-location-dot", SortOrder = 1 },
                    new() { Id = Guid.NewGuid(), Title = "Official Inquiry Desk", Description = "Direct corporate correspondence and information desk", IconText = "fa-solid fa-envelope", SortOrder = 2 },
                    new() { Id = Guid.NewGuid(), Title = "Business Hours", Description = "Monday – Friday: 8:30 AM – 5:30 PM (LST)", IconText = "fa-solid fa-clock", SortOrder = 3 }
                }
            };
            sections.Add(contactDetailsFormSection);

            context.PageSections.AddRange(sections);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 6. Seed Comprehensive SEO & Header Tag Suite
        // =========================================================================
        if (!await context.SiteCodeInjectionTags.AnyAsync(cancellationToken))
        {
            var seoTag = new SiteCodeInjectionTag
            {
                Id = Guid.NewGuid(),
                Name = "Comprehensive SEO, Social & Icons Suite (All-In-One)",
                Zone = "head",
                TagType = "meta_tag",
                SortOrder = 10,
                IsActive = true,
                SuiteCode = "suite_corporate",
                Content = @"<!-- Primary SEO Meta Tags -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name=""title"" content=""{{ Title }} | {{ BrandName }}"" />
<meta name=""description"" content=""{{ Description }}"" />
<meta name=""keywords"" content=""{{ Keywords }}"" />
<meta name=""author"" content=""{{ Author }}"" />
<meta name=""robots"" content=""index, follow"" />
<link rel=""canonical"" href=""{{ CanonicalUrl }}"" />

<!-- Open Graph Protocol (Facebook, LinkedIn, Discord) -->
<meta property=""og:type"" content=""website"" />
<meta property=""og:url"" content=""{{ CanonicalUrl }}"" />
<meta property=""og:title"" content=""{{ Title }} | {{ BrandName }}"" />
<meta property=""og:description"" content=""{{ Description }}"" />
<meta property=""og:image"" content=""{{ ImageUrl }}"" />
<meta property=""og:site_name"" content=""{{ BrandName }}"" />

<!-- Twitter / X Cards -->
<meta name=""twitter:card"" content=""summary_large_image"" />
<meta name=""twitter:url"" content=""{{ CanonicalUrl }}"" />
<meta name=""twitter:title"" content=""{{ Title }} | {{ BrandName }}"" />
<meta name=""twitter:description"" content=""{{ Description }}"" />
<meta name=""twitter:image"" content=""{{ ImageUrl }}"" />
<meta name=""twitter:site"" content=""@{{ BrandName }}"" />

<!-- Favicon & Web App Icons -->
<link rel=""shortcut icon"" href=""{{ FaviconUrl }}"" type=""image/x-icon"" />
<link rel=""icon"" type=""image/x-icon"" href=""{{ FaviconUrl }}"" />
<link rel=""apple-touch-icon"" sizes=""180x180"" href=""{{ AppleTouchIconUrl }}"" />
<meta name=""theme-color"" content=""{{ ThemeColor }}"" />"
            };

            var bsCssTag = new SiteCodeInjectionTag
            {
                Id = Guid.NewGuid(),
                Name = "Bootstrap 5.3 CSS Framework",
                Zone = "head",
                TagType = "link_stylesheet",
                SortOrder = 20,
                IsActive = true,
                SuiteCode = "suite_corporate",
                Content = @"<link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"" crossorigin=""anonymous"">"
            };

            var faIconsTag = new SiteCodeInjectionTag
            {
                Id = Guid.NewGuid(),
                Name = "FontAwesome 6.5 Icons Suite",
                Zone = "head",
                TagType = "link_stylesheet",
                SortOrder = 30,
                IsActive = true,
                SuiteCode = "suite_corporate",
                Content = @"<link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"" crossorigin=""anonymous"" />"
            };

            var bsJsTag = new SiteCodeInjectionTag
            {
                Id = Guid.NewGuid(),
                Name = "Bootstrap 5.3 Bundle JS",
                Zone = "footer",
                TagType = "script_url",
                SortOrder = 10,
                IsActive = true,
                SuiteCode = "suite_corporate",
                Content = @"<script src=""https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"" crossorigin=""anonymous""></script>"
            };

            context.SiteCodeInjectionTags.AddRange(seoTag, bsCssTag, faIconsTag, bsJsTag);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 7. Seed Canonical Corporate Suite Templates into TenantInstalledTemplates
        // =========================================================================
        if (!await context.TenantInstalledTemplates.AnyAsync(cancellationToken))
        {
            await SeedCorporateSuiteTemplatesAsync(context, cancellationToken);
        }

        // =========================================================================
        // 8. Stamp Workspace Initialized
        // =========================================================================
        if (setting == null)
        {
            setting = new MisWebsiteSetting { BrandName = orgName, WebsiteTitle = $"{orgName} Official Website" };
            context.MisWebsiteSettings.Add(setting);
        }

        setting.IsWorkspaceInitialized = true;
        setting.WorkspaceInitializedUtc = DateTime.UtcNow;
        setting.WorkspaceInitializationMode = "default_suite";
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Resets the website to a clean blank canvas by removing sample/demo pages, blog posts, and sections.
    /// Preserves user-created forms or resets settings mode to 'blank_canvas'.
    /// </summary>
    /// <param name="context">The target tenant's <see cref="DashboardDbContext"/> instance.</param>
    /// <param name="cancellationToken">Cancellation token for asynchronous execution.</param>
    public static async Task ResetToBlankCanvasAsync(
        DashboardDbContext context,
        CancellationToken cancellationToken = default)
    {
        // 1. Remove PageSections and their SectionLists
        var allSections = await context.PageSections.Include(s => s.PageSectionLists).ToListAsync(cancellationToken);
        if (allSections.Count > 0)
        {
            context.PageSections.RemoveRange(allSections);
        }

        // 2. Remove WebPages
        var allPages = await context.WebPages.ToListAsync(cancellationToken);
        if (allPages.Count > 0)
        {
            context.WebPages.RemoveRange(allPages);
        }

        // 3. Remove Blog posts
        var allBlogs = await context.Blogs.ToListAsync(cancellationToken);
        if (allBlogs.Count > 0)
        {
            context.Blogs.RemoveRange(allBlogs);
        }

        // 4. Update Website Settings to Blank Canvas
        var setting = await context.MisWebsiteSettings.FirstOrDefaultAsync(cancellationToken);
        if (setting != null)
        {
            setting.IsWorkspaceInitialized = true;
            setting.WorkspaceInitializedUtc = DateTime.UtcNow;
            setting.WorkspaceInitializationMode = "blank_canvas";
            setting.UpdatedAtUtc = DateTime.UtcNow;
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Seeds the factory-default Corporate Theme Suite templates into the <see cref="TenantInstalledTemplate"/> table,
    /// providing the complete layout architecture (Navbar, Hero, Breadcrumbs, Body Sections, Blog, and Footer).
    /// </summary>
    /// <param name="context">The target tenant's <see cref="DashboardDbContext"/> instance.</param>
    /// <param name="cancellationToken">Cancellation token for asynchronous execution.</param>
    public static async Task SeedCorporateSuiteTemplatesAsync(
        DashboardDbContext context,
        CancellationToken cancellationToken = default)
    {
        var templates = new List<TenantInstalledTemplate>
        {
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Menu_Classic",
                CategoryKey = "menu",
                Name = "Classic Light Corporate Navbar",
                VariantCode = "Menu_Classic",
                HtmlTemplate = @"<header class=""oz-nav-section {{ CustomClass }}"">
  {{#if HasTopBar}}
  <div class=""oz-top-bar"">
    <div class=""oz-nav-container oz-top-bar-inner"">
      <div class=""oz-top-contact"">
        {{#if Email}}<a href=""mailto:{{ Email }}"" class=""oz-top-item""><i class=""fa-solid fa-envelope me-1""></i><span>{{ Email }}</span></a>{{/if}}
        {{#if Phone}}<a href=""tel:{{ Phone }}"" class=""oz-top-item""><i class=""fa-solid fa-phone me-1""></i><span>{{ Phone }}</span></a>{{/if}}
      </div>
      <div class=""oz-top-utility"">
        <div class=""oz-top-links"">
          {{#each TopBarPages}}
          <a href=""{{ Url }}"" class=""oz-top-link"">{{ Title }}</a>
          {{/each}}
        </div>
        <div class=""oz-top-socials"">
          <a href=""#"" class=""oz-social-link"" title=""Twitter""><i class=""fa-brands fa-x-twitter""></i></a>
          <a href=""#"" class=""oz-social-link"" title=""LinkedIn""><i class=""fa-brands fa-linkedin-in""></i></a>
          <a href=""#"" class=""oz-social-link"" title=""Facebook""><i class=""fa-brands fa-facebook""></i></a>
        </div>
      </div>
    </div>
  </div>
  {{/if}}
  <nav class=""oz-main-navbar"">
    <div class=""oz-nav-container oz-navbar-inner"">
      <a class=""oz-navbar-brand"" href=""{{ HomeUrl }}"">
        {{#if BrandLogo}}
        <img src=""{{ BrandLogo }}"" alt=""{{ BrandName }}"" class=""oz-brand-logo"" />
        {{else}}
        <span class=""oz-brand-text"">{{ BrandName }}</span>
        {{/if}}
      </a>
      <button class=""oz-nav-toggler"" type=""button"" aria-label=""Toggle navigation"" onclick=""document.getElementById('ozNavDrawer')?.classList.toggle('open')"">
        <span class=""oz-toggler-bar""></span>
        <span class=""oz-toggler-bar""></span>
        <span class=""oz-toggler-bar""></span>
      </button>
      <div class=""oz-nav-drawer"" id=""ozNavDrawer"">
        <ul class=""oz-nav-menu"">
          {{#each NavItems=""first""}}
          <li class=""oz-nav-item""><a class=""oz-nav-link"" href=""{{ Url }}"">{{ Title }}</a></li>
          {{/each}}
          {{#each MenuDropdowns}}
          <li class=""oz-nav-item oz-dropdown"">
            <a class=""oz-nav-link oz-dropdown-toggle"" href=""#"">{{ Title }} <i class=""fa-solid fa-chevron-down ms-1"" style=""font-size:10px;""></i></a>
            <ul class=""oz-dropdown-menu"">
              {{#each Pages}}
              <li><a class=""oz-dropdown-item"" href=""{{ Url }}"">{{ Title }}</a></li>
              {{/each}}
            </ul>
          </li>
          {{/each}}
          {{#each NavItems=""middle""}}
          <li class=""oz-nav-item""><a class=""oz-nav-link"" href=""{{ Url }}"">{{ Title }}</a></li>
          {{/each}}
          {{#each NavItems=""last""}}
          <li class=""oz-nav-item""><a class=""oz-nav-link"" href=""{{ Url }}"">{{ Title }}</a></li>
          {{/each}}
        </ul>
        <div class=""oz-nav-actions"">
          {{#if ActivateLoginInMenu}}
          <a href=""{{ LoginUrl }}"" class=""oz-btn-login"">{{ LoginButtonText }}</a>
          {{/if}}
          {{#each MenuCtaButtons}}
          <a href=""{{ Url }}"" class=""oz-btn-cta {{ CustomClass }}"">{{ Title }}</a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>",
                CssStyles = @".oz-nav-section { width: 100%; position: sticky; top: 0; z-index: 1000; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); font-family: 'Inter', system-ui, sans-serif; }
.oz-top-bar { background: #0f172a; color: #94a3b8; font-size: 12.5px; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 7px 0; }
.oz-nav-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-top-bar-inner { display: flex; justify-content: space-between; align-items: center; }
.oz-top-contact { display: flex; gap: 20px; align-items: center; }
.oz-top-item { color: #94a3b8; text-decoration: none; display: inline-flex; align-items: center; transition: color 0.15s; }
.oz-top-item:hover { color: #ffffff; }
.oz-top-utility { display: flex; gap: 20px; align-items: center; }
.oz-top-links { display: flex; gap: 16px; }
.oz-top-link { color: #94a3b8; text-decoration: none; transition: color 0.15s; }
.oz-top-link:hover { color: #ffffff; }
.oz-top-socials { display: flex; gap: 12px; }
.oz-social-link { color: #94a3b8; text-decoration: none; font-size: 12px; transition: color 0.15s; }
.oz-social-link:hover { color: #38bdf8; }
.oz-main-navbar { background: #ffffff; padding: 14px 0; }
.oz-navbar-inner { display: flex; justify-content: space-between; align-items: center; position: relative; }
.oz-navbar-brand { text-decoration: none; display: inline-flex; align-items: center; }
.oz-brand-logo { max-height: 40px; width: auto; object-fit: contain; }
.oz-brand-text { font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.oz-nav-toggler { display: none; background: transparent; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 5px; }
.oz-toggler-bar { width: 24px; height: 2.5px; background: #0f172a; border-radius: 2px; }
.oz-nav-drawer { display: flex; align-items: center; gap: 32px; }
.oz-nav-menu { display: flex; align-items: center; gap: 24px; list-style: none; margin: 0; padding: 0; }
.oz-nav-item { position: relative; }
.oz-nav-link { color: #475569; font-weight: 600; font-size: 14.5px; text-decoration: none; padding: 8px 4px; transition: color 0.15s; display: inline-flex; align-items: center; }
.oz-nav-link:hover { color: #0050e5; }
.oz-dropdown-menu { display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); padding: 8px 0; list-style: none; margin-top: 4px; z-index: 100; }
.oz-dropdown:hover .oz-dropdown-menu { display: block; }
.oz-dropdown-item { display: block; padding: 8px 18px; color: #475569; font-size: 13.5px; text-decoration: none; font-weight: 500; transition: background 0.15s; }
.oz-dropdown-item:hover { background: #f8fafc; color: #0050e5; }
.oz-nav-actions { display: flex; align-items: center; gap: 12px; }
.oz-btn-login { color: #0f172a; font-weight: 600; font-size: 13.5px; text-decoration: none; padding: 9px 18px; border-radius: 8px; border: 1px solid #cbd5e1; transition: all 0.15s; }
.oz-btn-login:hover { background: #f8fafc; border-color: #94a3b8; }
.oz-btn-cta { background: #0050e5; color: #ffffff; font-weight: 700; font-size: 13.5px; text-decoration: none; padding: 9px 20px; border-radius: 8px; transition: all 0.15s; box-shadow: 0 4px 12px rgba(0,80,229,0.25); }
.oz-btn-cta:hover { background: #0043c2; color: #ffffff; transform: translateY(-1px); }
@media (max-width: 991px) {
  .oz-nav-toggler { display: flex; }
  .oz-nav-drawer { display: none; position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border-bottom: 1px solid #e2e8f0; box-shadow: 0 15px 30px rgba(0,0,0,0.08); padding: 20px 24px; flex-direction: column; align-items: flex-start; gap: 16px; }
  .oz-nav-drawer.open { display: flex; }
  .oz-nav-menu { flex-direction: column; align-items: flex-start; width: 100%; gap: 12px; }
  .oz-dropdown-menu { position: static; box-shadow: none; border: none; padding-left: 14px; }
  .oz-nav-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .oz-btn-cta, .oz-btn-login { text-align: center; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Hero_CorporateSplit",
                CategoryKey = "hero",
                Name = "Corporate Split Hero",
                VariantCode = "Hero_CorporateSplit",
                HtmlTemplate = @"<section class=""oz-hero-split {{ CustomClass }}"">
  <div class=""oz-hero-container"">
    <div class=""oz-hero-grid"">
      <div class=""oz-hero-text"">
        {{#if MiniTitle}}<span class=""oz-hero-pill""><i class=""fa-solid fa-bolt text-warning me-1""></i> {{ MiniTitle }}</span>{{/if}}
        <h1 class=""oz-hero-headline"">{{ Title }}</h1>
        <p class=""oz-hero-subheadline"">{{ Description }}</p>
        <div class=""oz-hero-actions"">
          {{#if ButtonText}}
          <a href=""{{ ButtonLink }}"" class=""oz-btn-hero-primary"">{{ ButtonText }}</a>
          {{/if}}
          {{#if SecondButtonText}}
          <a href=""{{ SecondButtonLink }}"" class=""oz-btn-hero-outline"">{{ SecondButtonText }}</a>
          {{/if}}
        </div>
        <div class=""oz-hero-trust-bar"">
          <div class=""oz-trust-item""><i class=""fa-solid fa-shield-halved text-primary me-2""></i><span>Enterprise Ready</span></div>
          <div class=""oz-trust-item""><i class=""fa-solid fa-circle-check text-success me-2""></i><span>99.98% SLA</span></div>
          <div class=""oz-trust-item""><i class=""fa-solid fa-headset text-info me-2""></i><span>24/7 Support</span></div>
        </div>
      </div>
      <div class=""oz-hero-media"">
        <div class=""oz-hero-image-wrap"">
          <img src=""{{ ImageUrl }}"" alt=""{{ Title }}"" class=""oz-hero-img"" onerror=""this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'"" />
          <div class=""oz-hero-badge-card"">
            <div class=""oz-badge-icon""><i class=""fa-solid fa-chart-line""></i></div>
            <div class=""oz-badge-text"">
              <span class=""oz-badge-val"">4.9 / 5.0</span>
              <span class=""oz-badge-sub"">Client Satisfaction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-hero-split { padding: 80px 0 90px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
.oz-hero-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 50px; align-items: center; }
.oz-hero-pill { display: inline-flex; align-items: center; background: #eff6ff; color: #0050e5; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 20px; border: 1px solid #bfdbfe; }
.oz-hero-headline { font-size: 46px; font-weight: 800; color: #0f172a; line-height: 1.15; letter-spacing: -0.03em; margin: 0 0 20px; }
.oz-hero-subheadline { font-size: 17px; color: #475569; line-height: 1.65; margin: 0 0 32px; max-width: 580px; }
.oz-hero-actions { display: flex; gap: 14px; align-items: center; margin-bottom: 40px; flex-wrap: wrap; }
.oz-btn-hero-primary { background: #0050e5; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; transition: all 0.15s; box-shadow: 0 8px 20px rgba(0,80,229,0.3); }
.oz-btn-hero-primary:hover { background: #0043c2; color: #ffffff; transform: translateY(-2px); }
.oz-btn-hero-outline { background: #ffffff; color: #0f172a; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; border: 1.5px solid #cbd5e1; transition: all 0.15s; }
.oz-btn-hero-outline:hover { background: #f8fafc; border-color: #94a3b8; }
.oz-hero-trust-bar { display: flex; gap: 24px; flex-wrap: wrap; border-top: 1px solid #e2e8f0; padding-top: 24px; }
.oz-trust-item { display: inline-flex; align-items: center; font-size: 13.5px; font-weight: 600; color: #64748b; }
.oz-hero-image-wrap { position: relative; border-radius: 20px; overflow: visible; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15); }
.oz-hero-img { width: 100%; height: 420px; object-fit: cover; border-radius: 20px; display: block; border: 1px solid #e2e8f0; }
.oz-hero-badge-card { position: absolute; bottom: -20px; left: -20px; background: #ffffff; border-radius: 14px; padding: 14px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; }
.oz-badge-icon { width: 44px; height: 44px; border-radius: 10px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.oz-badge-val { display: block; font-weight: 800; font-size: 17px; color: #0f172a; line-height: 1.2; }
.oz-badge-sub { display: block; font-size: 12px; color: #64748b; font-weight: 500; }
@media (max-width: 991px) {
  .oz-hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .oz-hero-headline { font-size: 34px; }
  .oz-hero-badge-card { position: static; margin-top: 16px; display: inline-flex; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Breadcrumb_PageHeader",
                CategoryKey = "breadcrumb",
                Name = "Breadcrumb Page Header",
                VariantCode = "Breadcrumb_PageHeader",
                HtmlTemplate = @"<header class=""oz-breadcrumb-banner {{ CustomClass }}"" style=""background-image: url('{{ BackgroundImageUrl }}');"">
  <div class=""oz-breadcrumb-overlay""></div>
  <div class=""oz-breadcrumb-container"">
    {{#if MiniTitle}}<span class=""oz-breadcrumb-pill"">{{ MiniTitle }}</span>{{/if}}
    <h1 class=""oz-breadcrumb-title"">{{ Title }}</h1>
    {{#if Description}}<p class=""oz-breadcrumb-desc"">{{ Description }}</p>{{/if}}
    <nav class=""oz-breadcrumb-nav"" aria-label=""breadcrumb"">
      <ol class=""oz-breadcrumb-list"">
        {{#each BreadcrumbTrail}}
        <li class=""oz-breadcrumb-item {{#if IsActive}}active{{/if}}"">
          {{#if IsActive}}
          <span>{{ Label }}</span>
          {{else}}
          <a href=""{{ Url }}"">{{ Label }}</a>
          <i class=""fa-solid fa-chevron-right oz-breadcrumb-sep""></i>
          {{/if}}
        </li>
        {{/each}}
      </ol>
    </nav>
  </div>
</header>",
                CssStyles = @".oz-breadcrumb-banner { position: relative; background-color: #0f172a; background-size: cover; background-position: center; padding: 70px 0 65px; color: #ffffff; font-family: 'Inter', system-ui, sans-serif; text-align: center; }
.oz-breadcrumb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.92) 100%); }
.oz-breadcrumb-container { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 0 24px; }
.oz-breadcrumb-pill { display: inline-block; background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-breadcrumb-title { font-size: 38px; font-weight: 800; color: #ffffff; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-breadcrumb-desc { font-size: 16px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px; max-width: 680px; margin-left: auto; margin-right: auto; }
.oz-breadcrumb-list { display: inline-flex; align-items: center; gap: 8px; list-style: none; padding: 6px 18px; margin: 0; background: rgba(255,255,255,0.08); border-radius: 30px; font-size: 13px; backdrop-filter: blur(8px); }
.oz-breadcrumb-item a { color: #94a3b8; text-decoration: none; font-weight: 500; transition: color 0.15s; }
.oz-breadcrumb-item a:hover { color: #ffffff; }
.oz-breadcrumb-item.active span { color: #ffffff; font-weight: 700; }
.oz-breadcrumb-sep { font-size: 9px; color: #64748b; margin-left: 8px; }",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_FeatureGrid3",
                CategoryKey = "body",
                Name = "Feature Grid (3 Columns)",
                VariantCode = "Body_FeatureGrid3",
                HtmlTemplate = @"<section class=""oz-features-section {{ CustomClass }}"">
  <div class=""oz-features-container"">
    <div class=""oz-features-header"">
      {{#if MiniTitle}}<span class=""oz-features-badge"">{{ MiniTitle }}</span>{{/if}}
      <h2 class=""oz-features-title"">{{ Title }}</h2>
      <p class=""oz-features-desc"">{{ Description }}</p>
    </div>
    <div class=""oz-features-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-feature-card"">
        <div class=""oz-feature-icon-box"">
          <i class=""{{ IconText }}""></i>
        </div>
        <h3 class=""oz-feature-card-title"">{{ Title }}</h3>
        <p class=""oz-feature-card-desc"">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @".oz-features-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-features-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-features-header { text-align: center; max-width: 720px; margin: 0 auto 56px; }
.oz-features-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-features-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-features-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.oz-feature-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 36px 28px; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.oz-feature-card:hover { border-color: #93c5fd; transform: translateY(-4px); box-shadow: 0 14px 28px rgba(0,80,229,0.08); }
.oz-feature-icon-box { width: 54px; height: 54px; border-radius: 14px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 22px; }
.oz-feature-card-title { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
.oz-feature-card-desc { font-size: 14.5px; color: #64748b; line-height: 1.6; margin: 0; }
@media (max-width: 991px) {
  .oz-features-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_StatsCounters",
                CategoryKey = "body",
                Name = "Milestone Stats Counters",
                VariantCode = "Body_StatsCounters",
                HtmlTemplate = @"<section class=""oz-stats-section {{ CustomClass }}"">
  <div class=""oz-stats-container"">
    <div class=""oz-stats-header"">
      {{#if MiniTitle}}<span class=""oz-stats-badge"">{{ MiniTitle }}</span>{{/if}}
      <h2 class=""oz-stats-title"">{{ Title }}</h2>
      <p class=""oz-stats-desc"">{{ Description }}</p>
    </div>
    <div class=""oz-stats-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-stat-card"">
        <div class=""oz-stat-icon-wrap""><i class=""{{ IconText }}""></i></div>
        <div class=""oz-stat-val"">{{ Title }}</div>
        <div class=""oz-stat-label"">{{ Description }}</div>
      </div>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @".oz-stats-section { padding: 80px 0; background: #0f172a; color: #ffffff; font-family: 'Inter', system-ui, sans-serif; text-align: center; }
.oz-stats-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-stats-header { max-width: 680px; margin: 0 auto 50px; }
.oz-stats-badge { display: inline-block; background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-stats-title { font-size: 32px; font-weight: 800; color: #ffffff; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-stats-desc { font-size: 15.5px; color: #94a3b8; line-height: 1.6; margin: 0; }
.oz-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.oz-stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 32px 20px; transition: transform 0.2s; }
.oz-stat-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.07); }
.oz-stat-icon-wrap { font-size: 28px; margin-bottom: 14px; color: #38bdf8; }
.oz-stat-val { font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; line-height: 1; margin-bottom: 8px; }
.oz-stat-label { font-size: 14px; color: #94a3b8; font-weight: 500; }
@media (max-width: 991px) {
  .oz-stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 575px) {
  .oz-stats-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_MissionSplit",
                CategoryKey = "body",
                Name = "Split Media Showcase",
                VariantCode = "Body_MissionSplit",
                HtmlTemplate = @"<section class=""oz-mission-section {{ CustomClass }}"">
  <div class=""oz-mission-container"">
    <div class=""oz-mission-grid"">
      <div class=""oz-mission-media"">
        <img src=""{{ ImageUrl }}"" alt=""{{ Title }}"" class=""oz-mission-img"" onerror=""this.src='https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80'"" />
      </div>
      <div class=""oz-mission-content"">
        {{#if MiniTitle}}<span class=""oz-mission-badge"">{{ MiniTitle }}</span>{{/if}}
        <h2 class=""oz-mission-title"">{{ Title }}</h2>
        <p class=""oz-mission-desc"">{{ Description }}</p>
        <div class=""oz-mission-points"">
          {{#each PageSectionLists}}
          <div class=""oz-mission-point"">
            <div class=""oz-point-icon""><i class=""{{ IconText }}""></i></div>
            <div class=""oz-point-text"">
              <h4 class=""oz-point-title"">{{ Title }}</h4>
              <p class=""oz-point-desc"">{{ Description }}</p>
            </div>
          </div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-mission-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-mission-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-mission-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 50px; align-items: center; }
.oz-mission-img { width: 100%; height: 440px; object-fit: cover; border-radius: 18px; box-shadow: 0 16px 36px rgba(0,0,0,0.08); }
.oz-mission-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 14px; }
.oz-mission-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.02em; }
.oz-mission-desc { font-size: 16px; color: #64748b; line-height: 1.65; margin: 0 0 28px; }
.oz-mission-points { display: flex; flex-direction: column; gap: 20px; }
.oz-mission-point { display: flex; gap: 16px; align-items: flex-start; }
.oz-point-icon { width: 42px; height: 42px; border-radius: 10px; background: #ffffff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.oz-point-title { font-size: 16.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.oz-point-desc { font-size: 14px; color: #64748b; line-height: 1.5; margin: 0; }
@media (max-width: 991px) {
  .oz-mission-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_ProcessSteps",
                CategoryKey = "body",
                Name = "Strategic Process Steps",
                VariantCode = "Body_ProcessSteps",
                HtmlTemplate = @"<section class=""oz-process-section {{ CustomClass }}"">
  <div class=""oz-process-container"">
    <div class=""oz-process-header"">
      {{#if MiniTitle}}<span class=""oz-process-badge"">{{ MiniTitle }}</span>{{/if}}
      <h2 class=""oz-process-title"">{{ Title }}</h2>
      <p class=""oz-process-desc"">{{ Description }}</p>
    </div>
    <div class=""oz-process-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-process-card"">
        <div class=""oz-process-step-num"">{{ MiniTitle }}</div>
        <h3 class=""oz-process-card-title"">{{ Title }}</h3>
        <p class=""oz-process-card-desc"">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @".oz-process-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-process-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-process-header { text-align: center; max-width: 680px; margin: 0 auto 56px; }
.oz-process-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-process-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-process-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-process-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.oz-process-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 22px; position: relative; }
.oz-process-step-num { font-size: 12px; font-weight: 800; color: #0050e5; background: #eff6ff; display: inline-block; padding: 4px 10px; border-radius: 8px; margin-bottom: 16px; }
.oz-process-card-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
.oz-process-card-desc { font-size: 14px; color: #64748b; line-height: 1.55; margin: 0; }
@media (max-width: 991px) {
  .oz-process-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 575px) {
  .oz-process-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_Testimonials",
                CategoryKey = "body",
                Name = "Executive Testimonials Grid",
                VariantCode = "Body_Testimonials",
                HtmlTemplate = @"<section class=""oz-testimonials-section {{ CustomClass }}"">
  <div class=""oz-testimonials-container"">
    <div class=""oz-testimonials-header"">
      {{#if MiniTitle}}<span class=""oz-testimonials-badge"">{{ MiniTitle }}</span>{{/if}}
      <h2 class=""oz-testimonials-title"">{{ Title }}</h2>
      <p class=""oz-testimonials-desc"">{{ Description }}</p>
    </div>
    <div class=""oz-testimonials-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-testimonial-card"">
        <div class=""oz-testimonial-stars"">
          <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
        </div>
        <p class=""oz-testimonial-quote"">""{{ Description }}""</p>
        <div class=""oz-testimonial-author"">
          <div class=""oz-author-avatar"">{{ MiniTitle }}</div>
          <div class=""oz-author-info"">
            <h4 class=""oz-author-name"">{{ Title }}</h4>
            <span class=""oz-author-role"">{{ MoreDescription }}</span>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @".oz-testimonials-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-testimonials-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-testimonials-header { text-align: center; max-width: 680px; margin: 0 auto 54px; }
.oz-testimonials-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-testimonials-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-testimonials-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.oz-testimonial-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 32px 26px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.oz-testimonial-stars { color: #f59e0b; font-size: 14px; margin-bottom: 16px; display: flex; gap: 4px; }
.oz-testimonial-quote { font-size: 15px; color: #334155; line-height: 1.65; font-style: italic; margin: 0 0 24px; }
.oz-testimonial-author { display: flex; align-items: center; gap: 14px; }
.oz-author-avatar { width: 44px; height: 44px; border-radius: 50%; background: #0050e5; color: #ffffff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.oz-author-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
.oz-author-role { font-size: 12.5px; color: #64748b; }
@media (max-width: 991px) {
  .oz-testimonials-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_CtaSplit",
                CategoryKey = "body",
                Name = "Call to Action Split Banner",
                VariantCode = "Body_CtaSplit",
                HtmlTemplate = @"<section class=""oz-cta-section {{ CustomClass }}"">
  <div class=""oz-cta-container"">
    <div class=""oz-cta-card"">
      <div class=""oz-cta-content"">
        <span class=""oz-cta-badge"">GET STARTED TODAY</span>
        <h2 class=""oz-cta-title"">Ready to Accelerate Your Enterprise Operations?</h2>
        <p class=""oz-cta-desc"">Connect with our specialists to explore bespoke solutions and schedule your consultation.</p>
      </div>
      <div class=""oz-cta-actions"">
        <a href=""/contact"" class=""oz-btn-cta-white"">Schedule Consultation</a>
        <a href=""/services"" class=""oz-btn-cta-ghost"">Explore Offerings</a>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-cta-section { padding: 60px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-cta-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-cta-card { background: linear-gradient(135deg, #0050e5 0%, #003699 100%); border-radius: 20px; padding: 50px 48px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; gap: 36px; box-shadow: 0 20px 40px rgba(0,80,229,0.25); }
.oz-cta-badge { display: inline-block; background: rgba(255,255,255,0.18); font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 14px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-cta-title { font-size: 30px; font-weight: 800; color: #ffffff; margin: 0 0 10px; letter-spacing: -0.02em; }
.oz-cta-desc { font-size: 15.5px; color: #dbeafe; line-height: 1.55; margin: 0; max-width: 580px; }
.oz-cta-actions { display: flex; gap: 14px; flex-shrink: 0; }
.oz-btn-cta-white { background: #ffffff; color: #0050e5; font-weight: 700; font-size: 14.5px; padding: 13px 26px; border-radius: 10px; text-decoration: none; transition: transform 0.15s; }
.oz-btn-cta-white:hover { transform: translateY(-2px); color: #0043c2; }
.oz-btn-cta-ghost { background: transparent; color: #ffffff; border: 1.5px solid rgba(255,255,255,0.4); font-weight: 700; font-size: 14.5px; padding: 13px 26px; border-radius: 10px; text-decoration: none; transition: all 0.15s; }
.oz-btn-cta-ghost:hover { background: rgba(255,255,255,0.1); border-color: #ffffff; }
@media (max-width: 991px) {
  .oz-cta-card { flex-direction: column; align-items: flex-start; padding: 36px 28px; }
  .oz-cta-actions { width: 100%; flex-direction: column; }
  .oz-btn-cta-white, .oz-btn-cta-ghost { text-align: center; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_FaqAccordion",
                CategoryKey = "body",
                Name = "Corporate FAQ Accordion",
                VariantCode = "Body_FaqAccordion",
                HtmlTemplate = @"<section class=""oz-faq-section {{ CustomClass }}"">
  <div class=""oz-faq-container"">
    <div class=""oz-faq-header"">
      <span class=""oz-faq-badge"">FREQUENTLY ASKED QUESTIONS</span>
      <h2 class=""oz-faq-title"">Answers to Common Questions</h2>
      <p class=""oz-faq-desc"">Everything you need to know about our services, onboarding, and platform capabilities.</p>
    </div>
    <div class=""oz-faq-list"">
      <div class=""oz-faq-item"">
        <details>
          <summary class=""oz-faq-question"">How quickly can our organization get onboarded? <i class=""fa-solid fa-chevron-down oz-faq-icon""></i></summary>
          <div class=""oz-faq-answer""><p>Standard onboarding typically completes within 1 to 3 business days, including workspace initialization, member access, and domain mapping.</p></div>
        </details>
      </div>
      <div class=""oz-faq-item"">
        <details>
          <summary class=""oz-faq-question"">What data security and compliance measures are in place? <i class=""fa-solid fa-chevron-down oz-faq-icon""></i></summary>
          <div class=""oz-faq-answer""><p>We adhere to strict sovereign data segregation with AES-256 encryption at rest, TLS 1.3 in transit, and role-based permissions.</p></div>
        </details>
      </div>
      <div class=""oz-faq-item"">
        <details>
          <summary class=""oz-faq-question"">Can we customize templates and form workflows? <i class=""fa-solid fa-chevron-down oz-faq-icon""></i></summary>
          <div class=""oz-faq-answer""><p>Yes, all templates, navigation menus, dynamic forms, and code injections can be tailored directly in your administrative console.</p></div>
        </details>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-faq-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-faq-container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.oz-faq-header { text-align: center; margin-bottom: 48px; }
.oz-faq-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-faq-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-faq-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-faq-list { display: flex; flex-direction: column; gap: 14px; }
.oz-faq-item details { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; transition: border-color 0.15s; }
.oz-faq-item details[open] { border-color: #93c5fd; background: #ffffff; }
.oz-faq-question { font-size: 16.5px; font-weight: 700; color: #0f172a; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
.oz-faq-question::-webkit-details-marker { display: none; }
.oz-faq-icon { font-size: 13px; color: #64748b; transition: transform 0.2s; }
details[open] .oz-faq-icon { transform: rotate(180deg); }
.oz-faq-answer { margin-top: 14px; font-size: 15px; color: #475569; line-height: 1.6; }
.oz-faq-answer p { margin: 0; }",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "News_MinimalBar",
                CategoryKey = "body",
                Name = "Newsletter Minimal Bar",
                VariantCode = "News_MinimalBar",
                HtmlTemplate = @"<section class=""oz-newsletter-bar {{ CustomClass }}"">
  <div class=""oz-news-container"">
    <div class=""oz-news-row"">
      <div class=""oz-news-text"">
        <span class=""oz-news-badge""><i class=""fa-solid fa-envelope-open-text me-1""></i> NEWSLETTER</span>
        <h3 class=""oz-news-title"">{{ Title }}</h3>
        <p class=""oz-news-desc"">{{ Description }}</p>
      </div>
      <div class=""oz-news-form-wrap"">
        <form class=""oz-news-form"" onsubmit=""event.preventDefault(); alert('Thank you for subscribing! Check your inbox for confirmation.');"">
          <input type=""email"" placeholder=""name@company.com"" required class=""oz-news-input"" />
          <button type=""submit"" class=""oz-news-submit"">Subscribe</button>
        </form>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-newsletter-bar { padding: 48px 0; background: #f1f5f9; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
.oz-news-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-news-row { display: flex; justify-content: space-between; align-items: center; gap: 32px; }
.oz-news-badge { display: inline-block; font-size: 11px; font-weight: 800; color: #0050e5; margin-bottom: 6px; letter-spacing: 0.5px; }
.oz-news-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.02em; }
.oz-news-desc { font-size: 14.5px; color: #64748b; margin: 0; }
.oz-news-form { display: flex; gap: 10px; max-width: 440px; }
.oz-news-input { flex: 1; padding: 12px 18px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 14px; outline: none; background: #ffffff; }
.oz-news-input:focus { border-color: #0050e5; }
.oz-news-submit { background: #0050e5; color: #ffffff; border: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 9px; cursor: pointer; transition: background 0.15s; }
.oz-news-submit:hover { background: #0043c2; }
@media (max-width: 768px) {
  .oz-news-row { flex-direction: column; align-items: flex-start; }
  .oz-news-form { width: 100%; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Contact_SplitDetails",
                CategoryKey = "body",
                Name = "Contact Split Details",
                VariantCode = "Contact_SplitDetails",
                HtmlTemplate = @"<section class=""oz-contact-section {{ CustomClass }}"">
  <div class=""oz-contact-container"">
    <div class=""oz-contact-grid"">
      <div class=""oz-contact-info-col"">
        <span class=""oz-contact-badge"">GET IN TOUCH</span>
        <h2 class=""oz-contact-title"">We'd Love to Hear From You</h2>
        <p class=""oz-contact-desc"">Reach out directly to our team with your inquiry, service request, or consultation request.</p>
        <div class=""oz-contact-card-list"">
          <div class=""oz-contact-card"">
            <i class=""fa-solid fa-location-dot oz-contact-card-icon""></i>
            <div>
              <h4 class=""oz-card-h4"">Headquarters</h4>
              <p class=""oz-card-val"">{{ Address }}</p>
            </div>
          </div>
          <div class=""oz-contact-card"">
            <i class=""fa-solid fa-envelope oz-contact-card-icon""></i>
            <div>
              <h4 class=""oz-card-h4"">Official Email</h4>
              <p class=""oz-card-val""><a href=""mailto:{{ Email }}"">{{ Email }}</a></p>
            </div>
          </div>
          <div class=""oz-contact-card"">
            <i class=""fa-solid fa-phone oz-contact-card-icon""></i>
            <div>
              <h4 class=""oz-card-h4"">Direct Phone</h4>
              <p class=""oz-card-val""><a href=""tel:{{ Phone }}"">{{ Phone }}</a></p>
            </div>
          </div>
          <div class=""oz-contact-card"">
            <i class=""fa-solid fa-clock oz-contact-card-icon""></i>
            <div>
              <h4 class=""oz-card-h4"">Business Hours</h4>
              <p class=""oz-card-val"">{{ WorkingHours }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class=""oz-contact-form-col"">
        <div class=""oz-contact-form-card"">
          <h3 class=""oz-form-title"">Send a Message</h3>
          <p class=""oz-form-sub"">Our advisory specialists respond within one business day.</p>
          <form onsubmit=""event.preventDefault(); alert('Message sent successfully! Our team will contact you shortly.');"">
            <div class=""row g-3"">
              <div class=""col-md-6"">
                <label class=""form-label fw-semibold"">Full Name *</label>
                <input type=""text"" class=""form-control"" placeholder=""e.g. First Last"" required />
              </div>
              <div class=""col-md-6"">
                <label class=""form-label fw-semibold"">Email Address *</label>
                <input type=""email"" class=""form-control"" placeholder=""name@company.com"" required />
              </div>
              <div class=""col-12"">
                <label class=""form-label fw-semibold"">Subject</label>
                <input type=""text"" class=""form-control"" placeholder=""e.g. Partnership Inquiry"" />
              </div>
              <div class=""col-12"">
                <label class=""form-label fw-semibold"">Message *</label>
                <textarea class=""form-control"" rows=""4"" placeholder=""Please describe your requirements in detail..."" required></textarea>
              </div>
              <div class=""col-12"">
                <button type=""submit"" class=""btn btn-primary w-100 py-2 fw-semibold"">Submit Message</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".oz-contact-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-contact-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-contact-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 50px; align-items: flex-start; }
.oz-contact-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-contact-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-contact-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0 0 32px; }
.oz-contact-card-list { display: flex; flex-direction: column; gap: 16px; }
.oz-contact-card { display: flex; gap: 16px; align-items: flex-start; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; }
.oz-contact-card-icon { width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.oz-card-h4 { font-size: 14.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.oz-card-val { font-size: 14px; color: #64748b; margin: 0; line-height: 1.4; }
.oz-card-val a { color: #0050e5; text-decoration: none; }
.oz-contact-form-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
.oz-form-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
.oz-form-sub { font-size: 14px; color: #64748b; margin: 0 0 24px; }
@media (max-width: 991px) {
  .oz-contact-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_RequestService",
                CategoryKey = "body",
                Name = "Service Request & Intake Form",
                VariantCode = "Body_RequestService",
                HtmlTemplate = @"<section class=""oz-service-intake-section {{ CustomClass }}"">
  <div class=""oz-intake-container"">
    <div class=""oz-intake-header"">
      <span class=""oz-intake-badge"">PROJECT INTAKE</span>
      <h2 class=""oz-intake-title"">Request a Service Consultation</h2>
      <p class=""oz-intake-desc"">Provide your organization specifications below and an advisory director will prepare a tailored proposal.</p>
    </div>
    <div class=""oz-intake-card"">
      <form onsubmit=""event.preventDefault(); alert('Service request received! Our technical advisory team will contact you within 1 business day.');"">
        <div class=""row g-4"">
          <div class=""col-md-6"">
            <label class=""form-label fw-semibold"">Full Name *</label>
            <input type=""text"" class=""form-control"" placeholder=""e.g. First Last"" required />
          </div>
          <div class=""col-md-6"">
            <label class=""form-label fw-semibold"">Business Email *</label>
            <input type=""email"" class=""form-control"" placeholder=""name@company.com"" required />
          </div>
          <div class=""col-md-6"">
            <label class=""form-label fw-semibold"">Phone Number</label>
            <input type=""tel"" class=""form-control"" placeholder=""e.g. +1 (555) 000-0000"" />
          </div>
          <div class=""col-md-6"">
            <label class=""form-label fw-semibold"">Target Practice Area *</label>
            <select class=""form-select"" required>
              <option value="""" selected disabled>Select a Practice Area</option>
              <option value=""strategic-advisory"">Strategic Consulting</option>
              <option value=""systems-modernization"">Systems Modernization</option>
              <option value=""cloud-architecture"">Cloud Architecture & Reliability</option>
              <option value=""compliance-governance"">Governance, Risk & Compliance</option>
            </select>
          </div>
          <div class=""col-12"">
            <label class=""form-label fw-semibold"">Project Scope & Objectives *</label>
            <textarea class=""form-control"" rows=""4"" placeholder=""Describe your organizational objectives, timeline, and key requirements..."" required></textarea>
          </div>
          <div class=""col-12"">
            <button type=""submit"" class=""btn btn-primary px-4 py-2 fw-semibold"">Submit Service Request</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>",
                CssStyles = @".oz-service-intake-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-intake-container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.oz-intake-header { text-align: center; margin-bottom: 48px; }
.oz-intake-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-intake-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-intake-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-intake-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); }",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Blog_ArticleGrid",
                CategoryKey = "blog",
                Name = "Corporate Blog Article Grid",
                VariantCode = "Blog_ArticleGrid",
                HtmlTemplate = @"<section class=""oz-blog-section {{ CustomClass }}"">
  <div class=""oz-blog-container"">
    <div class=""oz-blog-header"">
      {{#if MiniTitle}}<span class=""oz-blog-badge"">{{ MiniTitle }}</span>{{/if}}
      <h2 class=""oz-blog-title"">{{ Title }}</h2>
      {{#if Description}}<p class=""oz-blog-desc"">{{ Description }}</p>{{/if}}
    </div>
    <div class=""oz-articles-grid"">
      {{#each Articles}}
      <article class=""oz-article-card"">
        {{#if ImageUrl}}
        <div class=""oz-card-media"">
          <img src=""{{ ImageUrl }}"" alt=""{{ Title }}"" class=""oz-card-img"" />
          {{#if Category}}<span class=""oz-card-category"">{{ Category }}</span>{{/if}}
        </div>
        {{/if}}
        <div class=""oz-card-content"">
          <div class=""oz-card-meta"">
            <span class=""oz-meta-date""><i class=""fa-regular fa-calendar me-1""></i>{{ Date }}</span>
            <span class=""oz-meta-author""><i class=""fa-regular fa-user me-1 ms-2""></i>{{ Author }}</span>
          </div>
          <h3 class=""oz-card-title""><a href=""{{ DirectUrl }}"" class=""oz-card-title-link"">{{ Title }}</a></h3>
          {{#if Excerpt}}<p class=""oz-card-summary"">{{ Excerpt }}</p>{{/if}}
          <div class=""oz-card-footer"">
            <a href=""{{ DirectUrl }}"" class=""oz-card-read-more"">Read Article <i class=""fa-solid fa-arrow-right ms-1""></i></a>
          </div>
        </div>
      </article>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @".oz-blog-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-blog-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-blog-header { text-align: center; max-width: 680px; margin: 0 auto 50px; }
.oz-blog-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-blog-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-blog-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.oz-article-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
.oz-article-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.08); border-color: #93c5fd; }
.oz-card-media { position: relative; height: 210px; overflow: hidden; }
.oz-card-img { width: 100%; height: 100%; object-fit: cover; }
.oz-card-category { position: absolute; top: 12px; left: 12px; background: rgba(15,23,42,0.85); color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; backdrop-filter: blur(4px); }
.oz-card-content { padding: 24px; display: flex; flex-direction: column; flex: 1; }
.oz-card-meta { font-size: 12.5px; color: #94a3b8; margin-bottom: 10px; }
.oz-card-title { font-size: 18px; font-weight: 700; margin: 0 0 10px; line-height: 1.35; }
.oz-card-title-link { color: #0f172a; text-decoration: none; transition: color 0.15s; }
.oz-card-title-link:hover { color: #0050e5; }
.oz-card-summary { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 16px; flex: 1; }
.oz-card-footer { border-top: 1px solid #f1f5f9; padding-top: 14px; }
.oz-card-read-more { color: #0050e5; font-weight: 700; font-size: 13.5px; text-decoration: none; display: inline-flex; align-items: center; }
@media (max-width: 991px) {
  .oz-articles-grid { grid-template-columns: 1fr; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Footer_CorporateMultiColumn",
                CategoryKey = "footer",
                Name = "Corporate Multi-Column Footer",
                VariantCode = "Footer_CorporateMultiColumn",
                HtmlTemplate = @"<footer class=""oz-footer-section {{ CustomClass }}"">
  <div class=""oz-footer-container"">
    <div class=""oz-footer-grid"">
      <div class=""oz-footer-brand-col"">
        <a class=""oz-footer-brand-link"" href=""{{ HomeUrl }}"">
          {{#if BrandLogo}}
          <img src=""{{ BrandLogo }}"" alt=""{{ BrandName }}"" class=""oz-footer-brand-logo"" />
          {{else}}
          <span class=""oz-footer-brand-title"">{{ BrandName }}</span>
          {{/if}}
        </a>
        <p class=""oz-footer-desc"">{{ Description }}</p>
        <div class=""oz-footer-contacts"">
          {{#if Email}}<div class=""oz-footer-contact-item""><i class=""fa-solid fa-envelope""></i><span><a href=""mailto:{{ Email }}"">{{ Email }}</a></span></div>{{/if}}
          {{#if Phone}}<div class=""oz-footer-contact-item""><i class=""fa-solid fa-phone""></i><span><a href=""tel:{{ Phone }}"">{{ Phone }}</a></span></div>{{/if}}
          {{#if Address}}<div class=""oz-footer-contact-item""><i class=""fa-solid fa-location-dot""></i><span>{{ Address }}</span></div>{{/if}}
        </div>
        <div class=""oz-footer-socials"">
          <a href=""#"" class=""oz-footer-social-icon"" title=""Twitter""><i class=""fa-brands fa-x-twitter""></i></a>
          <a href=""#"" class=""oz-footer-social-icon"" title=""LinkedIn""><i class=""fa-brands fa-linkedin-in""></i></a>
          <a href=""#"" class=""oz-footer-social-icon"" title=""Facebook""><i class=""fa-brands fa-facebook""></i></a>
        </div>
      </div>
      <div class=""oz-footer-nav-group"">
        <div class=""oz-footer-col"">
          <h4 class=""oz-footer-col-title"">Solutions</h4>
          <ul class=""oz-footer-links"">
            <li><a href=""/services"" class=""oz-footer-link"">Strategic Consulting</a></li>
            <li><a href=""/services"" class=""oz-footer-link"">Systems Modernization</a></li>
            <li><a href=""/services"" class=""oz-footer-link"">Performance & Scale</a></li>
            <li><a href=""/services"" class=""oz-footer-link"">Enterprise Governance</a></li>
          </ul>
        </div>
        <div class=""oz-footer-col"">
          <h4 class=""oz-footer-col-title"">Company</h4>
          <ul class=""oz-footer-links"">
            <li><a href=""/about"" class=""oz-footer-link"">About Us</a></li>
            <li><a href=""/request-service"" class=""oz-footer-link"">Request a Service</a></li>
            <li><a href=""/contact"" class=""oz-footer-link"">Contact Us</a></li>
            <li><a href=""/blog"" class=""oz-footer-link"">News & Insights</a></li>
          </ul>
        </div>
        <div class=""oz-footer-col"">
          <h4 class=""oz-footer-col-title"">Legal & Security</h4>
          <ul class=""oz-footer-links"">
            {{#each LegalPages}}
            <li><a href=""{{ Url }}"" class=""oz-footer-link"">{{ Title }}</a></li>
            {{/each}}
            <li><a href=""/privacy-policy"" class=""oz-footer-link"">Privacy Policy</a></li>
            <li><a href=""/terms-and-conditions"" class=""oz-footer-link"">Terms of Service</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class=""oz-footer-bottom"">
      <p class=""oz-footer-copyright"">&copy; {{ Year }} {{ BrandName }}. All rights reserved.</p>
      <div class=""oz-footer-bottom-links"">
        <a href=""/privacy-policy"">Privacy</a>
        <span>&bull;</span>
        <a href=""/terms-and-conditions"">Terms</a>
        <span>&bull;</span>
        <a href=""/auth/login"">Portal Sign In</a>
      </div>
    </div>
  </div>
</footer>",
                CssStyles = @".oz-footer-section { background: #0f172a; color: #cbd5e1; padding: 70px 0 30px; font-family: 'Inter', system-ui, sans-serif; }
.oz-footer-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-footer-grid { display: grid; grid-template-columns: 1.3fr 2fr; gap: 60px; margin-bottom: 50px; }
.oz-footer-brand-title { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
.oz-footer-brand-logo { max-height: 40px; width: auto; object-fit: contain; }
.oz-footer-desc { font-size: 14.5px; color: #94a3b8; line-height: 1.6; margin: 16px 0 24px; max-width: 360px; }
.oz-footer-contacts { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.oz-footer-contact-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #94a3b8; }
.oz-footer-contact-item i { width: 16px; color: #38bdf8; }
.oz-footer-contact-item a { color: #94a3b8; text-decoration: none; }
.oz-footer-contact-item a:hover { color: #ffffff; }
.oz-footer-socials { display: flex; gap: 12px; }
.oz-footer-social-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 14px; text-decoration: none; transition: all 0.15s; }
.oz-footer-social-icon:hover { background: #0050e5; color: #ffffff; }
.oz-footer-nav-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.oz-footer-col-title { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 18px; letter-spacing: -0.01em; }
.oz-footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.oz-footer-link { color: #94a3b8; text-decoration: none; font-size: 14px; transition: color 0.15s; }
.oz-footer-link:hover { color: #ffffff; }
.oz-footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 26px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; flex-wrap: wrap; gap: 14px; }
.oz-footer-copyright { margin: 0; }
.oz-footer-bottom-links { display: flex; gap: 12px; align-items: center; }
.oz-footer-bottom-links a { color: #64748b; text-decoration: none; transition: color 0.15s; }
.oz-footer-bottom-links a:hover { color: #cbd5e1; }
@media (max-width: 991px) {
  .oz-footer-grid { grid-template-columns: 1fr; gap: 40px; }
  .oz-footer-nav-group { grid-template-columns: repeat(2, 1fr); gap: 24px; }
}
@media (max-width: 575px) {
  .oz-footer-nav-group { grid-template-columns: 1fr; }
  .oz-footer-bottom { flex-direction: column; align-items: flex-start; }
}",
                IsDefault = true,
                IsActive = true,
                InstalledVersion = "1.0.0",
                InstalledUtc = DateTime.UtcNow
            }
        };

        context.TenantInstalledTemplates.AddRange(templates);
        await context.SaveChangesAsync(cancellationToken);
    }
}
