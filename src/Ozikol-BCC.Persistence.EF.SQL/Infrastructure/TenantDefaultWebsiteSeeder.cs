using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol.MasterDomain.Blueprints;

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
        if (!await context.PageForms.AnyAsync(cancellationToken))
        {
            var contactForm = new PageForm
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

            var newsletterForm = new PageForm
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

            var serviceRequestForm = new PageForm
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

            context.PageForms.AddRange(contactForm, newsletterForm, serviceRequestForm);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 2. Seed Editorial Blog Category & 3 Full Rich Articles
        // =========================================================================
        if (!await context.BlogCategories.AnyAsync(cancellationToken))
        {
            var defaultBlogCategory = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Title = "Enterprise Insights & Strategy",
                Publish = true
            };
            context.BlogCategories.Add(defaultBlogCategory);

            var defaultBlogs = CentralContentLoader.GetDefaultBlogs();
            foreach (var b in defaultBlogs)
            {
                context.Blogs.Add(new Blog
                {
                    Id = Guid.NewGuid(),
                    Title = b.Title,
                    Date = DateTime.UtcNow.AddDays(-b.SortOrder * 2),
                    Publish = true,
                    SortOrder = b.SortOrder,
                    AddToRibon = true,
                    BlogCategoryId = defaultBlogCategory.Id,
                    ImageUrl = b.CoverImageUrl,
                    Description = b.Summary,
                    FullDescription = b.BodyHtml
                });
            }
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 2b. Seed Default Contact Channels & Social Media Profiles
        // =========================================================================
        if (!await context.MisWebsiteContactChannels.AnyAsync(cancellationToken))
        {
            string safeHandle = new string(orgName.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
            if (string.IsNullOrWhiteSpace(safeHandle)) safeHandle = "firm";

            var defaultChannels = new List<MisWebsiteContactChannel>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.Email,
                    Platform = "Support",
                    Title = "Official Support Email",
                    Description = "Under 2h average response time",
                    Value = $"support@{safeHandle}.com",
                    IconClass = "fa-solid fa-envelope",
                    IsDefault = true,
                    IsPublished = true,
                    SortOrder = 1
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.Phone,
                    Platform = "Office",
                    Title = "Customer Support Hotline",
                    Description = "Mon - Fri: 8:00 AM - 6:00 PM",
                    Value = "+1 (800) 555-0199",
                    IconClass = "fa-solid fa-phone",
                    IsDefault = true,
                    IsPublished = true,
                    SortOrder = 2
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.Address,
                    Platform = "Headquarters",
                    Title = "Global Technology Headquarters",
                    Description = "Primary Corporate Campus",
                    Value = $"Headquarters: 100 Innovation Boulevard, Suite 500",
                    IconClass = "fa-solid fa-location-dot",
                    IsDefault = true,
                    IsPublished = true,
                    SortOrder = 3
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = "Hours",
                    Platform = "Operations",
                    Title = "Business Hours",
                    Description = "Standard operational schedule",
                    Value = "Mon - Fri: 8:00 AM - 6:00 PM",
                    IconClass = "fa-regular fa-clock",
                    IsDefault = true,
                    IsPublished = true,
                    SortOrder = 4
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.SocialMedia,
                    Platform = "Twitter",
                    Title = "Twitter / X",
                    Description = "Official announcements",
                    Value = $"https://x.com/{safeHandle}",
                    IconClass = "fa-brands fa-x-twitter",
                    IsDefault = false,
                    IsPublished = true,
                    SortOrder = 5
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.SocialMedia,
                    Platform = "LinkedIn",
                    Title = "LinkedIn",
                    Description = "Corporate network",
                    Value = $"https://linkedin.com/company/{safeHandle}",
                    IconClass = "fa-brands fa-linkedin",
                    IsDefault = false,
                    IsPublished = true,
                    SortOrder = 6
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.SocialMedia,
                    Platform = "Facebook",
                    Title = "Facebook",
                    Description = "Community page",
                    Value = $"https://facebook.com/{safeHandle}",
                    IconClass = "fa-brands fa-facebook",
                    IsDefault = false,
                    IsPublished = true,
                    SortOrder = 7
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    ChannelType = ContactChannelTypes.SocialMedia,
                    Platform = "Instagram",
                    Title = "Instagram",
                    Description = "Behind the scenes",
                    Value = $"https://instagram.com/{safeHandle}",
                    IconClass = "fa-brands fa-instagram",
                    IsDefault = false,
                    IsPublished = true,
                    SortOrder = 8
                }
            };

            context.MisWebsiteContactChannels.AddRange(defaultChannels);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 3. Seed Page Categories (Service and Product)
        // =========================================================================
        var servicesCategory = await context.PageCategories
            .FirstOrDefaultAsync(c => c.Title == "Service" || c.Title == "Services", cancellationToken);

        if (servicesCategory == null)
        {
            servicesCategory = new PageCategory
            {
                Id = Guid.NewGuid(),
                Title = "Service",
                FooterDisplayTitle = "Our Services",
                MenuSortOrder = 2,
                MenuPosition = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First,
                ShowInMenu = true,
                ShowInFooter = true,
                FooterSortOrder = 1,
                Publish = true
            };
            context.PageCategories.Add(servicesCategory);
        }

        var productCategory = await context.PageCategories
            .FirstOrDefaultAsync(c => c.Title == "Product" || c.Title == "Products", cancellationToken);

        if (productCategory == null)
        {
            productCategory = new PageCategory
            {
                Id = Guid.NewGuid(),
                Title = "Product",
                FooterDisplayTitle = "Products",
                MenuSortOrder = 4,
                MenuPosition = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle,
                ShowInMenu = true,
                ShowInFooter = false,
                FooterSortOrder = 2,
                Publish = true
            };
            context.PageCategories.Add(productCategory);
        }
        await context.SaveChangesAsync(cancellationToken);

        // =========================================================================
        // 4. Seed WebPages & Ordered PageSections from Central Content Blueprints
        // =========================================================================
        if (!await context.WebPages.AnyAsync(cancellationToken))
        {
            var pageBlueprints = CentralContentLoader.GetDefaultPages();

            foreach (var p in pageBlueprints)
            {
                var directUrl = string.IsNullOrWhiteSpace(p.Slug) ? "home" : p.Slug.Trim();
                var isHome = string.IsNullOrWhiteSpace(p.Slug) || directUrl.Equals("home", StringComparison.OrdinalIgnoreCase);

                Guid? categoryId = null;
                if (!string.IsNullOrWhiteSpace(p.Category))
                {
                    if (p.Category.Equals("Services", StringComparison.OrdinalIgnoreCase) || p.Category.Equals("Service", StringComparison.OrdinalIgnoreCase))
                    {
                        categoryId = servicesCategory.Id;
                    }
                    else if (p.Category.Equals("Product", StringComparison.OrdinalIgnoreCase) || p.Category.Equals("Products", StringComparison.OrdinalIgnoreCase))
                    {
                        categoryId = productCategory.Id;
                    }
                }

                var zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First;
                if (p.Zone.Equals("middle", StringComparison.OrdinalIgnoreCase))
                {
                    zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle;
                }
                else if (p.Zone.Equals("last", StringComparison.OrdinalIgnoreCase))
                {
                    zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Last;
                }

                bool isCta = p.IsMenuCTA;
                bool isLegalDoc = p.IsLegal;
                bool isHomeDoc = isHome;

                // Independent positions determination based on page slug / role
                var slugLower = directUrl.ToLowerInvariant();
                bool showInTopBar = slugLower is "faq" or "support" or "documentation" || p.MenuPosition.Equals("topbar", StringComparison.OrdinalIgnoreCase);
                int topBarOrder = slugLower == "faq" ? 1 : (slugLower == "support" ? 2 : (slugLower == "documentation" ? 3 : p.SortOrder));

                bool showInMain = !isHome && !isCta && !isLegalDoc && categoryId == null && !showInTopBar && p.MenuPosition.Equals("header", StringComparison.OrdinalIgnoreCase);
                int mainOrder = slugLower == "about" ? 1 : (slugLower == "career" ? 3 : (slugLower == "blog" ? 5 : (slugLower is "contact" or "contact-us" ? 6 : p.SortOrder)));

                bool showInDropdown = !isCta && !isLegalDoc && categoryId != null;
                int dropdownOrder = slugLower is "it" or "ai-agent" ? 1 : (slugLower is "hospital" or "machinery" or "machineries" ? 2 : (slugLower == "infrastructure" ? 3 : p.SortOrder));

                bool showInFooterBottom = isLegalDoc || slugLower == "console";
                int footerBottomOrder = slugLower == "terms" ? 1 : (slugLower == "privacy" ? 2 : (slugLower == "cookies" ? 3 : (slugLower == "console" ? 4 : 5)));

                // Tags for footer Quick Links column: AI Agent, Machinery, Career, FAQ, Contact Us
                string? pageTags = null;
                if (slugLower is "ai-agent" or "machinery" or "machineries" or "career" or "faq" or "contact" or "contact-us")
                {
                    pageTags = "quicklinks";
                }

                // ShowInFooter: true if in category, or tagged as quicklinks, or general footer column page
                bool showInFooter = !isCta && !showInFooterBottom && (categoryId != null || !string.IsNullOrWhiteSpace(pageTags));
                int footerOrder = slugLower is "it" or "ai-agent" ? 1 : (slugLower is "hospital" or "machinery" or "machineries" ? 2 : (slugLower is "infrastructure" or "career" ? 3 : (slugLower == "faq" ? 4 : (slugLower is "contact" or "contact-us" ? 5 : p.SortOrder))));

                var webPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = p.Title,
                    DirectUrl = directUrl,
                    IsHomePage = isHome,
                    ShowInTopBar = showInTopBar,
                    TopBarSortOrder = topBarOrder,
                    ShowInMainMenu = showInMain,
                    MainMenuSortOrder = mainOrder,
                    ShowInMenuDropDown = showInDropdown,
                    DropdownSortOrder = dropdownOrder,
                    ShowInFooter = showInFooter,
                    FooterSortOrder = footerOrder,
                    ShowInFooterBottom = showInFooterBottom,
                    FooterBottomSortOrder = footerBottomOrder,
                    IsLegal = isLegalDoc,
                    Tags = pageTags,
                    EnableDirectUrl = true,
                    Publish = p.IsPublished,
                    SortOrder = p.SortOrder,
                    PageCategoryId = categoryId,
                    MenuPosition = zonePos,
                    IsMenuCTA = isCta,
                    MenuCtaText = isCta ? p.Title : null,
                    MenuCtaUrl = isCta ? ("/" + directUrl) : null,
                    MenuCtaStyle = "primary"
                };

                context.WebPages.Add(webPage);
                await context.SaveChangesAsync(cancellationToken);

                // Add sections for this page
                if (p.Sections != null && p.Sections.Count > 0)
                {
                    var sections = new List<PageSection>();
                    foreach (var s in p.Sections)
                    {
                        var pageSection = new PageSection
                        {
                            Id = Guid.NewGuid(),
                            WebPageId = webPage.Id,
                            TemplateKey = s.TemplateKey,
                            Title = s.Title,
                            MiniTitle = s.MiniTitle,
                            Description = s.Description,
                            FullDescription = s.FullDescription,
                            ImageUrl = s.ImageUrl ?? (s.Lists != null && s.Lists.Count > 0 ? s.Lists[0].ImageUrl : null),
                            ButtonText = s.ButtonText,
                            ButtonLink = s.ButtonLink,
                            SecondButtonText = s.SecondaryButtonText,
                            SecondButtonLink = s.SecondaryButtonLink,
                            DirectUrl = (isHome && s.SortOrder == 1) ? "home-hero" : $"{directUrl}-sec-{s.SortOrder}",
                            PageSortOrder = s.SortOrder,
                            PageSectionLists = (s.Lists ?? new()).Select(l => new PageSectionList
                            {
                                Id = Guid.NewGuid(),
                                Title = l.Title,
                                MiniTitle = l.MiniTitle,
                                Description = l.Description,
                                MoreDescription = l.MoreDescription,
                                IconText = l.Icon,
                                ImageUrl = l.ImageUrl,
                                ButtonText = l.ButtonText,
                                ButtonLink = l.ButtonLink,
                                CustomClass = l.CustomClass,
                                SortOrder = l.SortOrder
                            }).ToList()
                        };
                        sections.Add(pageSection);
                    }
                    context.PageSections.AddRange(sections);
                    await context.SaveChangesAsync(cancellationToken);
                }
            }
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

            context.SiteCodeInjectionTags.Add(seoTag);
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

        if (string.IsNullOrWhiteSpace(setting.CompanyDescription))
            setting.CompanyDescription = $"{orgName} delivers industry-leading solutions and professional services tailored to meet modern enterprise standards.";

        if (string.IsNullOrWhiteSpace(setting.FooterDescription))
        {
            setting.FooterDescription = $"{orgName} is committed to delivering world-class solutions, scalable sovereign infrastructure, and bespoke client experiences. Our mission drives continuous innovation, robust operational security, and measurable success for every partnership.";
            setting.FooterNote = setting.FooterDescription;
        }

        if (string.IsNullOrWhiteSpace(setting.Tagline))
            setting.Tagline = "Innovative Solutions & Professional Excellence";

        if (string.IsNullOrWhiteSpace(setting.CopyrightNotice))
            setting.CopyrightNotice = $"© {DateTime.UtcNow.Year} {orgName}. All rights reserved.";

        await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Resets the website to a clean blank canvas by removing sample/demo pages, blog posts, categories, and sections.
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

        // 3. Remove PageCategories
        var allCategories = await context.PageCategories.ToListAsync(cancellationToken);
        if (allCategories.Count > 0)
        {
            context.PageCategories.RemoveRange(allCategories);
        }

        // 4. Remove Blog posts
        var allBlogs = await context.Blogs.ToListAsync(cancellationToken);
        if (allBlogs.Count > 0)
        {
            context.Blogs.RemoveRange(allBlogs);
        }

        // 5. Remove MisWebsiteContactChannels
        var allChannels = await context.MisWebsiteContactChannels.ToListAsync(cancellationToken);
        if (allChannels.Count > 0)
        {
            context.MisWebsiteContactChannels.RemoveRange(allChannels);
        }

        // 6. Update Website Settings to Blank Canvas
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
        // Resolve all canonical suite blueprints directly from Central MasterDomain embedded resources
        // to guarantee 100% exact character fidelity with the Angular Studio components.
        var blueprints = CentralBlueprintLoader.GetAllSuiteBlueprints();

        var templates = blueprints.Select(b => new TenantInstalledTemplate
        {
            Id = Guid.NewGuid(),
            TemplateKey = b.VariantCode,
            CategoryKey = b.CategoryKey,
            Name = b.Name,
            VariantCode = b.VariantCode,
            HtmlTemplate = b.HtmlTemplate,
            CssStyles = b.CssStyles,
            JsScript = b.JsScript,
            DefaultContentJson = b.SampleContentJson,
            IsDefault = true,
            IsActive = true,
            InstalledVersion = "1.0.0",
            InstalledUtc = DateTime.UtcNow
        }).ToList();

        context.TenantInstalledTemplates.AddRange(templates);
        await context.SaveChangesAsync(cancellationToken);
    }
}
