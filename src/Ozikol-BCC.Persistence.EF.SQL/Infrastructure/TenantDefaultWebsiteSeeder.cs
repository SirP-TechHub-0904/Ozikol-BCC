using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol.MasterDomain.Blueprints;

namespace Ozikol_BCC.Persistence.EF.SQL.Infrastructure;

/// <summary>
/// Turnkey default website seeder for tenant sovereign databases.
/// Provisions the foundational website suite upon initial workspace registration or on-demand re-seed:
/// 1. Dynamic CMS Forms loaded from central blueprints with dynamic fields.
/// 2. Rich Editorial Blog Articles loaded from central HTML blueprints.
/// 3. Contact Channels and Social Media profiles loaded from central blueprints.
/// 4. Navigation Categories and WebPages driven purely by central blueprints.
/// 5. Dedicated Body Sections distributed across pages with PageSectionLists.
/// 6. Global SEO, OpenGraph, Twitter Cards, Favicon &amp; Mobile PWA meta tags in &lt;head&gt;.
/// 7. Canonical corporate suite templates installed into TenantInstalledTemplates.
/// 8. Automatic initialization timestamping via MisWebsiteSettings.
/// </summary>
public static class TenantDefaultWebsiteSeeder
{
    /// <summary>
    /// Provisions the complete turnkey default website structure and content into the provided tenant database context.
    /// Fully data-driven from central master domain blueprints with zero hardcoded content in C# logic.
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
        // 1. Seed Dynamic Forms from Central Blueprints
        // =========================================================================
        if (!await context.PageForms.AnyAsync(cancellationToken))
        {
            var formBlueprints = CentralContentLoader.GetDefaultForms();
            var forms = formBlueprints.Select(fb => new PageForm
            {
                Id = Guid.NewGuid(),
                Title = fb.Title,
                FormKey = fb.FormKey,
                Description = fb.Description,
                SubmitButtonText = fb.SubmitButtonText,
                SuccessMessage = fb.SuccessMessage,
                IsActive = fb.IsActive,
                CreatedAtUtc = DateTime.UtcNow,
                Fields = fb.Fields.Select(f => new PageFormField
                {
                    Id = Guid.NewGuid(),
                    FieldKey = f.FieldKey,
                    Label = f.Label,
                    Placeholder = f.Placeholder,
                    FieldType = f.FieldType,
                    OptionsJson = f.OptionsJson,
                    IsRequired = f.IsRequired,
                    SortOrder = f.SortOrder,
                    GridWidth = f.GridWidth
                }).ToList()
            }).ToList();

            context.PageForms.AddRange(forms);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 2. Seed Editorial Blog Categories & Rich Articles from Central Blueprints
        // =========================================================================
        if (!await context.Blogs.AnyAsync(cancellationToken))
        {
            var defaultBlogs = CentralContentLoader.GetDefaultBlogs();
            foreach (var b in defaultBlogs)
            {
                var categoryTitle = !string.IsNullOrWhiteSpace(b.Category) ? b.Category.Trim() : "General";
                var category = await context.BlogCategories
                    .FirstOrDefaultAsync(c => c.Title.ToLower() == categoryTitle.ToLower(), cancellationToken);

                if (category == null)
                {
                    category = new BlogCategory
                    {
                        Id = Guid.NewGuid(),
                        Title = categoryTitle,
                        Publish = true
                    };
                    context.BlogCategories.Add(category);
                    await context.SaveChangesAsync(cancellationToken);
                }

                context.Blogs.Add(new Blog
                {
                    Id = Guid.NewGuid(),
                    Title = b.Title,
                    Date = DateTime.UtcNow.AddDays(-b.SortOrder * 2),
                    Publish = true,
                    SortOrder = b.SortOrder,
                    AddToRibon = true,
                    BlogCategoryId = category.Id,
                    ImageUrl = b.CoverImageUrl,
                    Description = b.Summary,
                    FullDescription = b.BodyHtml
                });
            }
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 3. Seed Default Contact Channels & Social Media Profiles from Central Blueprints
        // =========================================================================
        if (!await context.MisWebsiteContactChannels.AnyAsync(cancellationToken))
        {
            string safeHandle = new string(orgName.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
            if (string.IsNullOrWhiteSpace(safeHandle)) safeHandle = "firm";

            var channelBlueprints = CentralContentLoader.GetDefaultContactChannels();
            var channels = channelBlueprints.Select(cb => new MisWebsiteContactChannel
            {
                Id = Guid.NewGuid(),
                ChannelType = cb.ChannelType,
                Platform = cb.Platform,
                Title = cb.Title,
                Description = cb.Description,
                Value = cb.Value.Replace("{safeHandle}", safeHandle).Replace("{orgName}", orgName),
                IconClass = cb.IconClass,
                IsDefault = cb.IsDefault,
                IsPublished = cb.IsPublished,
                SortOrder = cb.SortOrder
            }).ToList();

            context.MisWebsiteContactChannels.AddRange(channels);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 4. Seed Page Categories from Central Blueprints
        // =========================================================================
        var categoryBlueprints = CentralContentLoader.GetDefaultCategories();
        foreach (var cb in categoryBlueprints)
        {
            var existing = await context.PageCategories
                .FirstOrDefaultAsync(c => c.Title.ToLower() == cb.Title.Trim().ToLower(), cancellationToken);

            if (existing == null)
            {
                var menuPos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle;
                if (cb.MenuPosition.Equals("first", StringComparison.OrdinalIgnoreCase))
                {
                    menuPos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First;
                }
                else if (cb.MenuPosition.Equals("last", StringComparison.OrdinalIgnoreCase))
                {
                    menuPos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Last;
                }

                context.PageCategories.Add(new PageCategory
                {
                    Id = Guid.NewGuid(),
                    Title = cb.Title,
                    FooterDisplayTitle = cb.FooterDisplayTitle,
                    MenuSortOrder = cb.MenuSortOrder,
                    MenuPosition = menuPos,
                    ShowInMenu = cb.ShowInMenu,
                    ShowInFooter = cb.ShowInFooter,
                    FooterSortOrder = cb.FooterSortOrder,
                    Publish = cb.Publish
                });
            }
        }
        await context.SaveChangesAsync(cancellationToken);

        // =========================================================================
        // 5. Seed WebPages & Ordered PageSections from Central Blueprints
        // =========================================================================
        if (!await context.WebPages.AnyAsync(cancellationToken))
        {
            var pageBlueprints = CentralContentLoader.GetDefaultPages();

            foreach (var p in pageBlueprints)
            {
                var directUrl = string.IsNullOrWhiteSpace(p.Slug) ? "home" : p.Slug.Trim();
                var isHome = string.IsNullOrWhiteSpace(p.Slug) || directUrl.Equals("home", StringComparison.OrdinalIgnoreCase);

                // 1. Dynamic category resolution by title from database
                Guid? categoryId = null;
                if (!string.IsNullOrWhiteSpace(p.Category))
                {
                    var matchedCat = await context.PageCategories
                        .FirstOrDefaultAsync(c => c.Title.ToLower() == p.Category.Trim().ToLower(), cancellationToken);
                    categoryId = matchedCat?.Id;
                }

                // 2. Direct zone mapping from seed blueprint
                var zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First;
                if (!string.IsNullOrWhiteSpace(p.Zone))
                {
                    if (p.Zone.Equals("middle", StringComparison.OrdinalIgnoreCase))
                    {
                        zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle;
                    }
                    else if (p.Zone.Equals("last", StringComparison.OrdinalIgnoreCase))
                    {
                        zonePos = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Last;
                    }
                }

                // 3. Navigation and layout positions driven purely by blueprint properties
                bool isCta = p.IsMenuCTA;
                bool isLegalDoc = p.IsLegal;
                bool isTopBar = string.Equals(p.MenuPosition, "topbar", StringComparison.OrdinalIgnoreCase);
                bool isHeader = string.Equals(p.MenuPosition, "header", StringComparison.OrdinalIgnoreCase);
                bool isFooter = string.Equals(p.MenuPosition, "footer", StringComparison.OrdinalIgnoreCase);

                bool showInTopBar = isTopBar;
                int topBarOrder = isTopBar ? p.SortOrder : 0;

                bool showInMain = !isHome && !isCta && !isLegalDoc && categoryId == null && isHeader;
                int mainOrder = showInMain ? p.SortOrder : 0;

                bool showInDropdown = !isCta && !isLegalDoc && categoryId != null;
                int dropdownOrder = showInDropdown ? p.SortOrder : 0;

                bool showInFooterBottom = isLegalDoc || isFooter;
                int footerBottomOrder = showInFooterBottom ? p.SortOrder : 0;

                string? pageTags = p.Tags;
                bool showInFooter = p.ShowInFooter ?? (!isCta && !showInFooterBottom && (categoryId != null || isHeader || !string.IsNullOrWhiteSpace(pageTags)));
                int footerOrder = showInFooter ? p.SortOrder : 0;

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
                    MenuCtaStyle = p.MenuCtaStyle ?? "primary"
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
        // 6. Seed Comprehensive SEO & Header Tag Suite from Central Blueprints
        // =========================================================================
        if (!await context.SiteCodeInjectionTags.AnyAsync(cancellationToken))
        {
            var tagBlueprints = CentralContentLoader.GetDefaultCodeInjectionTags();
            var tags = tagBlueprints.Select(tb => new SiteCodeInjectionTag
            {
                Id = Guid.NewGuid(),
                Name = tb.Name,
                Zone = tb.Zone,
                TagType = tb.TagType,
                SortOrder = tb.SortOrder,
                IsActive = tb.IsActive,
                SuiteCode = tb.SuiteCode,
                Content = tb.Content
            }).ToList();

            context.SiteCodeInjectionTags.AddRange(tags);
            await context.SaveChangesAsync(cancellationToken);
        }

        // =========================================================================
        // 7. Seed Canonical Corporate Suite Templates into TenantInstalledTemplates
        // =========================================================================
        // Ensure canonical corporate suite templates are installed and refreshed to latest blueprints
        await SeedCorporateSuiteTemplatesAsync(context, cancellationToken);

        // =========================================================================
        // 8. Stamp Workspace Initialized with Central Settings Blueprint
        // =========================================================================
        var settingsBlueprint = CentralContentLoader.GetDefaultWebsiteSettings();

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
        {
            setting.CompanyDescription = settingsBlueprint.CompanyDescription.Replace("{orgName}", orgName);
        }

        if (string.IsNullOrWhiteSpace(setting.FooterDescription))
        {
            setting.FooterDescription = settingsBlueprint.FooterDescription.Replace("{orgName}", orgName);
            setting.FooterNote = setting.FooterDescription;
        }

        if (string.IsNullOrWhiteSpace(setting.Tagline))
        {
            setting.Tagline = settingsBlueprint.Tagline;
        }

        if (string.IsNullOrWhiteSpace(setting.CopyrightNotice))
        {
            setting.CopyrightNotice = settingsBlueprint.CopyrightNotice
                .Replace("{year}", DateTime.UtcNow.Year.ToString())
                .Replace("{orgName}", orgName);
        }

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

        // 4. Remove Blog posts & BlogCategories
        var allBlogs = await context.Blogs.ToListAsync(cancellationToken);
        if (allBlogs.Count > 0)
        {
            context.Blogs.RemoveRange(allBlogs);
        }

        var allBlogCategories = await context.BlogCategories.ToListAsync(cancellationToken);
        if (allBlogCategories.Count > 0)
        {
            context.BlogCategories.RemoveRange(allBlogCategories);
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

        var existingTemplates = await context.TenantInstalledTemplates.ToListAsync(cancellationToken);
        var existingLookup = existingTemplates
            .Where(t => !string.IsNullOrWhiteSpace(t.VariantCode))
            .ToDictionary(t => t.VariantCode.Trim().ToLowerInvariant(), t => t);

        foreach (var b in blueprints)
        {
            var key = (b.VariantCode ?? string.Empty).Trim().ToLowerInvariant();
            if (existingLookup.TryGetValue(key, out var existing))
            {
                // Refresh existing template markup, styling, and script runtime to match latest blueprints
                existing.HtmlTemplate = b.HtmlTemplate;
                existing.CssStyles = b.CssStyles;
                existing.JsScript = b.JsScript;
                existing.DefaultContentJson = b.SampleContentJson;
                existing.Name = b.Name;
                existing.CategoryKey = b.CategoryKey;
            }
            else
            {
                context.TenantInstalledTemplates.Add(new TenantInstalledTemplate
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
                });
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }
}
