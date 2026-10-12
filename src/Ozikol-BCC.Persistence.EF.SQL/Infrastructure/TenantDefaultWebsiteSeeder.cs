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
        // 7. Stamp Workspace Initialized
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
}
