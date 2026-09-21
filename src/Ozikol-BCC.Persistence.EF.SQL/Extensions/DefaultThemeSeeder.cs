using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Persistence.EF.SQL.Extensions
{
    /// <summary>
    /// Static utility seeder providing administrative operations to reset, wipe,
    /// or reinstall standard turnkey Corporate Suite theme templates and default 3-zone code injections.
    /// </summary>
    public static class DefaultThemeSeeder
    {
        /// <summary>
        /// Clears all installed templates and site code injection tags for the current tenant.
        /// If wipeContent is true, also removes all page sections and unpublishes all pages.
        /// Yields a completely clean, pristine slate for custom theme imports.
        /// </summary>
        /// <param name="dbContext">The tenant's active DashboardDbContext instance.</param>
        /// <param name="wipeContent">If true, permanently wipes all PageSections and unpublishes WebPages.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A Task representing the asynchronous wipe operation.</returns>
        public static async Task ClearAllTemplatesAndInjectionsAsync(DashboardDbContext dbContext, bool wipeContent = false, CancellationToken cancellationToken = default)
        {
            var templates = await dbContext.TenantInstalledTemplates.ToListAsync(cancellationToken);
            if (templates.Count > 0)
            {
                dbContext.TenantInstalledTemplates.RemoveRange(templates);
            }

            var tags = await dbContext.SiteCodeInjectionTags.ToListAsync(cancellationToken);
            if (tags.Count > 0)
            {
                dbContext.SiteCodeInjectionTags.RemoveRange(tags);
            }

            if (wipeContent)
            {
                var sectionLists = await dbContext.PageSectionLists.ToListAsync(cancellationToken);
                if (sectionLists.Count > 0)
                {
                    dbContext.PageSectionLists.RemoveRange(sectionLists);
                }

                var sections = await dbContext.PageSections.ToListAsync(cancellationToken);
                if (sections.Count > 0)
                {
                    dbContext.PageSections.RemoveRange(sections);
                }

                var pages = await dbContext.WebPages.ToListAsync(cancellationToken);
                if (pages.Count > 0)
                {
                    dbContext.WebPages.RemoveRange(pages);
                }

                var sliders = await dbContext.Sliders.ToListAsync(cancellationToken);
                if (sliders.Count > 0)
                {
                    dbContext.Sliders.RemoveRange(sliders);
                }

                var categories = await dbContext.PageCategories.ToListAsync(cancellationToken);
                if (categories.Count > 0)
                {
                    dbContext.PageCategories.RemoveRange(categories);
                }

                var faqs = await dbContext.FAQs.ToListAsync(cancellationToken);
                if (faqs.Count > 0)
                {
                    dbContext.FAQs.RemoveRange(faqs);
                }

                var faqCategories = await dbContext.FAQCategories.ToListAsync(cancellationToken);
                if (faqCategories.Count > 0)
                {
                    dbContext.FAQCategories.RemoveRange(faqCategories);
                }

                var blogs = await dbContext.Blogs.ToListAsync(cancellationToken);
                if (blogs.Count > 0)
                {
                    dbContext.Blogs.RemoveRange(blogs);
                }

                var blogCategories = await dbContext.BlogCategories.ToListAsync(cancellationToken);
                if (blogCategories.Count > 0)
                {
                    dbContext.BlogCategories.RemoveRange(blogCategories);
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Reinstalls the complete turnkey Corporate Theme Suite (16 core structural & content blueprints)
        /// and default 3-zone code injections (<head>, <body>, </body>) into the tenant database.
        /// Selectively purges only factory default assets (IsDefault == true or canonical keys),
        /// preserving any custom user-created or imported website templates.
        /// </summary>
        /// <param name="dbContext">The tenant's active DashboardDbContext instance.</param>
        /// <param name="brandName">Optional brand name for template branding placeholders.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A Task representing the asynchronous seeding operation.</returns>
        public static async Task ReinstallDefaultsAsync(DashboardDbContext dbContext, string brandName = "Organization", CancellationToken cancellationToken = default)
        {
            var corporateKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Menu_Classic", "Hero_CorporateSplit", "Body_MissionSplit", "Body_FeatureGrid3",
                "Body_StatsCounter4", "Body_Testimonials", "Body_FaqAccordion", "Body_CtaBanner",
                "Footer_CorporateColumns", "Bread_LightClean", "Blog_Grid3Col", "Contact_SplitDetails",
                "Commerce_ProductGrid4", "News_MinimalBar", "Body_ProcessSteps", "Body_SplitShowcase"
            };

            // 1. Wipe existing factory default templates
            var existingDefaultTemplates = await dbContext.TenantInstalledTemplates
                .Where(t => t.IsDefault || corporateKeys.Contains(t.TemplateKey) || corporateKeys.Contains(t.VariantCode))
                .ToListAsync(cancellationToken);
            if (existingDefaultTemplates.Count > 0)
            {
                dbContext.TenantInstalledTemplates.RemoveRange(existingDefaultTemplates);
            }

            // 2. Wipe existing factory default injection tags
            var existingDefaultTags = await dbContext.SiteCodeInjectionTags
                .Where(t => t.IsDefault || t.Name.Contains("Bootstrap") || t.Name.Contains("Inter") || t.Name.Contains("FontAwesome") || t.Name.Contains("Favicon") || t.Name.Contains("OpenGraph") || t.Name.Contains("Twitter") || t.Name.Contains("Schema.org"))
                .ToListAsync(cancellationToken);
            if (existingDefaultTags.Count > 0)
            {
                dbContext.SiteCodeInjectionTags.RemoveRange(existingDefaultTags);
            }

            // 3. Seed Default Code Injections with IsDefault = true
            var defaultTags = GetDefaultCodeInjections();
            foreach (var tag in defaultTags) { tag.IsDefault = true; }
            dbContext.SiteCodeInjectionTags.AddRange(defaultTags);

            // 4. Seed Default Corporate Suite Templates with IsDefault = true
            var defaultTemplates = GetDefaultTemplates(brandName);
            foreach (var t in defaultTemplates) { t.IsDefault = true; }
            dbContext.TenantInstalledTemplates.AddRange(defaultTemplates);

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Generates the standard 3-zone code injection tags (Bootstrap 5.3 CDN, FontAwesome 6, Google Fonts Inter, SEO, OpenGraph, JSON-LD, and JS bundles).
        /// </summary>
        /// <returns>A list of standard SiteCodeInjectionTag definitions.</returns>
        public static List<SiteCodeInjectionTag> GetDefaultCodeInjections()
        {
            return new List<SiteCodeInjectionTag>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Bootstrap 5.3 CSS",
                    Zone = "head",
                    TagType = "link_stylesheet",
                    Content = "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css\" integrity=\"sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH\" crossorigin=\"anonymous\">",
                    SortOrder = 10,
                    IsActive = true,
                    SuiteCode = "suite_corporate"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Font Awesome 6 Free",
                    Zone = "head",
                    TagType = "link_stylesheet",
                    Content = "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\" integrity=\"sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\" />",
                    SortOrder = 20,
                    IsActive = true,
                    SuiteCode = "suite_corporate"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Google Fonts (Inter)",
                    Zone = "head",
                    TagType = "google_fonts",
                    Content = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap\" rel=\"stylesheet\">",
                    SortOrder = 30,
                    IsActive = true,
                    SuiteCode = "suite_corporate"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Primary SEO & Crawler Directives",
                    Zone = "head",
                    TagType = "meta_tag",
                    Content = "<meta name=\"description\" content=\"{{ MetaDescription }}\" />\n<meta name=\"keywords\" content=\"{{ Keywords }}\" />\n<meta name=\"robots\" content=\"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1\" />\n<link rel=\"canonical\" href=\"{{ CanonicalUrl }}\" />",
                    SortOrder = 40,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "OpenGraph Social Protocol",
                    Zone = "head",
                    TagType = "meta_tag",
                    Content = "<meta property=\"og:type\" content=\"website\" />\n<meta property=\"og:site_name\" content=\"{{ BrandName }}\" />\n<meta property=\"og:title\" content=\"{{ Title }} | {{ BrandName }}\" />\n<meta property=\"og:description\" content=\"{{ MetaDescription }}\" />\n<meta property=\"og:url\" content=\"{{ CanonicalUrl }}\" />\n<meta property=\"og:image\" content=\"{{ LogoUrl }}\" />",
                    SortOrder = 50,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Twitter & X Card Directives",
                    Zone = "head",
                    TagType = "meta_tag",
                    Content = "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n<meta name=\"twitter:title\" content=\"{{ Title }} | {{ BrandName }}\" />\n<meta name=\"twitter:description\" content=\"{{ MetaDescription }}\" />\n<meta name=\"twitter:image\" content=\"{{ LogoUrl }}\" />\n<meta name=\"twitter:site\" content=\"@{{ BrandName }}\" />",
                    SortOrder = 60,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Mobile Web App & Theme Color",
                    Zone = "head",
                    TagType = "meta_tag",
                    Content = "<meta name=\"theme-color\" content=\"#0050e5\" />\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\" />\n<meta name=\"apple-mobile-web-app-title\" content=\"{{ BrandName }}\" />",
                    SortOrder = 70,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Schema.org JSON-LD Structured Data",
                    Zone = "head",
                    TagType = "raw_html",
                    Content = "<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Organization\",\n  \"name\": \"{{ BrandName }}\",\n  \"url\": \"{{ CanonicalUrl }}\",\n  \"logo\": \"{{ LogoUrl }}\",\n  \"description\": \"{{ MetaDescription }}\"\n}\n</script>",
                    SortOrder = 80,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Favicon & Web App Icons",
                    Zone = "head",
                    TagType = "raw_html",
                    Content = "<link rel=\"shortcut icon\" href=\"{{ FaviconUrl }}\" type=\"image/x-icon\" />\n<link rel=\"icon\" type=\"image/x-icon\" href=\"{{ FaviconUrl }}\" />\n<link rel=\"apple-touch-icon\" href=\"{{ LogoUrl }}\" />",
                    SortOrder = 90,
                    IsActive = true,
                    SuiteCode = "global"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = "Bootstrap 5.3 Bundle JS",
                    Zone = "footer",
                    TagType = "script_url",
                    Content = "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js\" integrity=\"sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz\" crossorigin=\"anonymous\"></script>",
                    SortOrder = 10,
                    IsActive = true,
                    SuiteCode = "suite_corporate"
                }
            };
        }

        /// <summary>
        /// Generates the standard 16 turnkey Corporate Suite templates with complete HTML blueprints and sample JSON bindings.
        /// </summary>
        /// <param name="brandName">The organization display name.</param>
        /// <returns>A list of turnkey TenantInstalledTemplate definitions.</returns>
        public static List<TenantInstalledTemplate> GetDefaultTemplates(string brandName = "Organization")
        {
            return new List<TenantInstalledTemplate>
            {
                // 1. Navigation / Menu
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Menu_Classic",
                    CategoryKey = "menu",
                    Name = "Classic Light Corporate Navbar",
                    VariantCode = "Menu_Classic",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    HtmlTemplate = @"
<header class=""oz-nav-header sticky-top bg-white border-bottom shadow-sm"">
  <nav class=""navbar navbar-expand-lg navbar-light py-3"">
    <div class=""container"">
      <a class=""navbar-brand d-flex align-items-center gap-2"" href=""/"">
        {{ BrandIdentity }}
      </a>
      <button class=""navbar-toggler border-0 shadow-none"" type=""button"" onclick=""this.closest('nav').querySelector('.collapse').classList.toggle('show')"">
        <span class=""navbar-toggler-icon""></span>
      </button>
      <div class=""collapse navbar-collapse"" id=""ozNavMain"">
        <ul class=""navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3"">
          {{#each MainMenuItems}}
            <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""{{ Url }}"">{{ Title }}</a></li>
          {{/each}}
          {{#each MenuDropdowns}}
            <li class=""nav-item dropdown"">
              <a class=""nav-link dropdown-toggle fw-semibold text-secondary"" href=""#"" role=""button"" data-bs-toggle=""dropdown"">{{ Title }}</a>
              <ul class=""dropdown-menu border-0 shadow-sm rounded-3 py-2"">
                {{#each Pages}}
                  <li><a class=""dropdown-item small py-2 px-3 fw-medium"" href=""{{ Url }}"">{{ Title }}</a></li>
                {{/each}}
              </ul>
            </li>
          {{/each}}
        </ul>
        <div class=""d-flex align-items-center gap-3"">
          <a href=""{{ LoginUrl }}"" class=""btn btn-link text-decoration-none fw-semibold text-secondary px-2 oz-login-btn"">
            {{ LoginText }}
          </a>
          {{#each MenuCtaButtons}}
            <a href=""{{ Url }}"" class=""btn btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm"">
              {{ Title }}
            </a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>",
                    CssStyles = @"
.oz-nav-header { background-color: #ffffff !important; }
.oz-nav-header .navbar-brand { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.03em; }
.oz-nav-header .nav-link { font-size: 14.5px; font-weight: 600; color: #475569 !important; padding: 8px 4px !important; transition: color 0.15s ease; }
.oz-nav-header .nav-link:hover, .oz-nav-header .nav-link.active { color: #0050e5 !important; }
.oz-nav-header .oz-login-btn { font-size: 14px; color: #475569 !important; text-decoration: none !important; transition: color 0.15s ease; }
.oz-nav-header .oz-login-btn:hover { color: #0050e5 !important; }
.oz-nav-header .btn-primary { background-color: #0050e5; border-color: #0050e5; font-size: 13.5px; transition: all 0.2s ease; }
.oz-nav-header .btn-primary:hover { background-color: #003bb5; border-color: #003bb5; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35) !important; }"
                },

                // 2. Hero Unit
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Hero_CorporateSplit",
                    CategoryKey = "hero",
                    Name = "Modern Corporate Split Hero",
                    VariantCode = "Hero_CorporateSplit",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        miniTitle = "Enterprise Solutions",
                        title = "Empowering Modern Enterprises to Scale with Confidence.",
                        description = "Delivering innovative solutions, strategic consulting, and operational excellence to help your business achieve sustainable success.",
                        buttonText = "Explore Services",
                        buttonLink = "#services",
                        secondaryButtonText = "Schedule Consultation",
                        secondaryButtonLink = "#contact",
                        imageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-lg-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary-subtle text-primary border border-primary-subtle mb-3"">
          <span class=""small fw-bold text-uppercase"">{{ MiniTitle }}</span>
        </div>
        <h1 class=""display-5 fw-bolder text-dark mb-3 lh-sm"">{{ Title }}</h1>
        <p class=""lead text-muted mb-4 fs-6"">{{ Description }}</p>
        <div class=""d-flex flex-wrap gap-3"">
          <a href=""{{ ButtonLink }}"" class=""btn btn-primary btn-lg rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"">
            <span>{{ ButtonText }}</span>
            <span style=""font-size: 16px;"">→</span>
          </a>
          {{#if SecondaryButtonText}}
          <a href=""{{ SecondaryButtonLink }}"" class=""btn btn-outline-secondary btn-lg rounded-pill px-4 py-2 fw-semibold bg-white"">
            {{ SecondaryButtonText }}
          </a>
          {{/if}}
        </div>
      </div>
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow-lg border border-light-subtle"">
          <img src=""{{ ImageUrl }}"" 
               alt=""{{ Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 420px;"" />
        </div>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 3. Body Section 1 - 3-Column Core Capabilities Grid
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_FeatureGrid3",
                    CategoryKey = "body",
                    Name = "3-Column Modern Feature Grid",
                    VariantCode = "Body_FeatureGrid3",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Engineered for Maximum Impact",
                        miniTitle = "Core Capabilities",
                        description = "Essential infrastructure designed for seamless organizational execution and rapid growth.",
                        items = new[]
                        {
                            new { title = "Data Security & Privacy", description = "Enterprise-grade encryption, role-based access management, and proactive compliance protection.", iconText = "fa-solid fa-shield-halved" },
                            new { title = "Collaboration Hub", description = "Unified communication channels, real-time dispatches, and organizational announcements.", iconText = "fa-solid fa-comments" },
                            new { title = "Operational Efficiency", description = "Modern automated workflows engineered to eliminate administrative bottlenecks and elevate team productivity.", iconText = "fa-solid fa-bolt" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""features"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""row g-4"">
      {{#each PageSectionLists}}
        <div class=""col-md-4"">
          <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm"">
            {{#if IconText}}
              <div class=""rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3"" style=""width: 50px; height: 50px;"">
                <i class=""{{ IconText }} fs-4""></i>
              </div>
            {{/if}}
            <h5 class=""fw-bold text-dark"">{{ Title }}</h5>
            <p class=""text-muted small mb-0"">{{ Description }}</p>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 4. Body Section 2 - Corporate Mission & Standards
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_MissionSplit",
                    CategoryKey = "body",
                    Name = "Corporate Mission & Standards Split",
                    VariantCode = "Body_MissionSplit",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Built for Organizational Excellence & Long-Term Trust",
                        miniTitle = "Our Mission & Standards",
                        description = "We partner with forward-thinking enterprises, growing organizations, and industry leaders to streamline operations, enhance client service, and drive sustainable growth.",
                        imageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80",
                        buttonText = "Learn More About Our Firm →",
                        buttonLink = "#contact",
                        items = new[]
                        {
                            new { title = "Strategic Planning & Execution", description = "Data-backed strategies, transparent execution, and dedicated accountability for every business milestone.", iconText = "fa-solid fa-check" },
                            new { title = "Enterprise Data Protection", description = "Industry-standard encryption, secure cloud infrastructure, and strict client confidentiality standards.", iconText = "fa-solid fa-check" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""about"">
  <div class=""container py-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow border border-light-subtle"">
          <img src=""{{ ImageUrl }}"" 
               alt=""{{ Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 380px;"" />
        </div>
      </div>
      <div class=""col-lg-6"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-3"">{{ MiniTitle }}</span>
        <h2 class=""fw-bolder text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4"">{{ Description }}</p>
        <div class=""d-flex flex-column gap-3 mb-4"">
          {{#each PageSectionLists}}
            <div class=""d-flex align-items-start gap-3"">
              <span class=""badge rounded-circle bg-primary-subtle text-primary p-2 mt-1""><i class=""{{ IconText }}""></i></span>
              <div>
                <h6 class=""fw-bold text-dark mb-1"">{{ Title }}</h6>
                <p class=""text-muted small mb-0"">{{ Description }}</p>
              </div>
            </div>
          {{/each}}
        </div>
        <a href=""{{ ButtonLink }}"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold"">
          {{ ButtonText }}
        </a>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 5. Body Section 3 - Metrics & Stat Counters
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_MetricsCounter",
                    CategoryKey = "body",
                    Name = "4-Column Metric Counter Bar",
                    VariantCode = "Body_MetricsCounter",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Enterprise Reliability & Impact",
                        miniTitle = "Key Metrics",
                        description = "Demonstrable results and verified performance statistics across our platform ecosystem.",
                        items = new[]
                        {
                            new { title = "12,500+", description = "Verified Members", iconText = "fa-solid fa-users text-primary" },
                            new { title = "99.98%", description = "System Reliability", iconText = "fa-solid fa-server text-success" },
                            new { title = "45+", description = "Global Chapters", iconText = "fa-solid fa-earth-americas text-info" },
                            new { title = "24/7", description = "Priority Support", iconText = "fa-solid fa-headset text-warning" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-3"">
    <div class=""row g-4 text-center"">
      {{#each PageSectionLists}}
        <div class=""col-6 col-md-3"">
          <div class=""p-3"">
            <i class=""{{ IconText }} fs-2 mb-2""></i>
            <div class=""display-6 fw-bold text-dark"">{{ Title }}</div>
            <div class=""small text-muted fw-semibold text-uppercase"">{{ Description }}</div>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 6. Body Section 4 - Testimonials & Reviews
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_Testimonials",
                    CategoryKey = "body",
                    Name = "3-Card Social Proof & Testimonials",
                    VariantCode = "Body_Testimonials",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Trusted by Clients & Industry Leaders",
                        miniTitle = "Client Testimonials",
                        description = "Hear directly from businesses and partners who rely on our services for sustainable growth.",
                        items = new[]
                        {
                            new { title = "Sarah Adams", miniTitle = "SA", description = "Working with our partners transformed our operational efficiency. Their team provided clear strategic direction and delivered outstanding results from day one.", moreDescription = "Chief Operating Officer", imageUrl = "" },
                            new { title = "Marcus Kim", miniTitle = "MK", description = "Their professionalism, deep industry expertise, and responsive support have made them an indispensable partner in scaling our business.", moreDescription = "Managing Director", imageUrl = "" },
                            new { title = "Elena Rostova", miniTitle = "EL", description = "The quality of execution and attention to detail exceeded our expectations. They consistently deliver on time and above benchmark.", moreDescription = "VP of Business Development", imageUrl = "" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""row g-4"">
      {{#each PageSectionLists}}
        <div class=""col-md-4"">
          <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
            <div class=""text-warning mb-3"">
              <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
            </div>
            <p class=""text-secondary mb-4 fst-italic"">""{{ Description }}""</p>
            <div class=""d-flex align-items-center gap-3 mt-auto"">
              {{#if ImageUrl}}
                <img src=""{{ ImageUrl }}"" alt=""{{ Title }}"" class=""rounded-circle object-fit-cover"" style=""width:42px; height:42px;"" />
              {{else}}
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">{{ MiniTitle }}</div>
              {{/if}}
              <div>
                <div class=""fw-bold text-dark small"">{{ Title }}</div>
                <div class=""text-muted small"">{{ MoreDescription }}</div>
              </div>
            </div>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 7. Body Section 5 - Interactive FAQ Accordion
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_FaqAccordion",
                    CategoryKey = "body",
                    Name = "Collapsible FAQ Accordion",
                    VariantCode = "Body_FaqAccordion",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Frequently Asked Questions",
                        miniTitle = "Questions & Answers",
                        description = "Helpful answers regarding our services, client engagements, and delivery process.",
                        items = new[]
                        {
                            new { title = "How does our organization tailor its services to your business needs?", description = "We begin with an in-depth discovery consultation to assess your unique goals, timelines, and operational requirements, then design a customized solution that aligns precisely with your business priorities." },
                            new { title = "What kind of ongoing support and collaboration can you expect?", description = "Every client is paired with a dedicated account lead and receives regular milestone reviews, transparent progress reporting, and responsive technical and strategic support throughout our partnership." },
                            new { title = "What are your standard compliance and data security standards?", description = "We enforce enterprise-grade AES-256 encryption, strict role-based authorization protocols, and SOC2-compliant handling across all platform transactions and customer records." }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""max-w-800 mx-auto"">
      <div class=""accordion"" id=""ozFaqAccordion"">
        {{#each PageSectionLists}}
          <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
            <h2 class=""accordion-header"">
              <button class=""accordion-button {{#unless @first}}collapsed{{/unless}} fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
                <i class=""fa-solid fa-circle-question text-primary me-2""></i> {{ Title }}
              </button>
            </h2>
            <div class=""accordion-collapse collapse {{#if @first}}show{{/if}}"">
              <div class=""accordion-body text-secondary small"">
                {{ Description }}
              </div>
            </div>
          </div>
        {{/each}}
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 8. Body Section 6 - High-Conversion CTA Banner
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_CtaBanner",
                    CategoryKey = "body",
                    Name = "Gradient Action CTA Ribbon",
                    VariantCode = "Body_CtaBanner",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Ready to Elevate Your Business?",
                        description = "Partner with our team to accelerate your operations, modernize systems, and achieve sustainable long-term growth.",
                        buttonText = "Request a Consultation",
                        buttonLink = "#request-service",
                        secondaryButtonText = "Contact Our Team",
                        secondaryButtonLink = "#contact"
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-3"">
    <div class=""card border-0 rounded-4 p-5 text-center text-white shadow"" style=""background: linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%);"">
      <h2 class=""display-6 fw-bold mb-3"">{{ Title }}</h2>
      <p class=""lead opacity-90 max-w-600 mx-auto mb-4 fs-6"">{{ Description }}</p>
      <div class=""d-flex justify-content-center gap-3 flex-wrap"">
        <a href=""{{ ButtonLink }}"" class=""btn btn-light btn-lg rounded-pill px-4 py-2 fw-bold text-primary shadow"">
          <i class=""fa-solid fa-arrow-right me-1""></i> {{ ButtonText }}
        </a>
        <a href=""{{ SecondaryButtonLink }}"" class=""btn btn-outline-light btn-lg rounded-pill px-4 py-2 fw-semibold"">
          <i class=""fa-solid fa-envelope me-1""></i> {{ SecondaryButtonText }}
        </a>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 9. E-Commerce Storefront Grid
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Ecom_ProductGrid",
                    CategoryKey = "ecommerce",
                    Name = "Clean Light Storefront Product Grid",
                    VariantCode = "Ecom_ProductGrid",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""shop"">
  <div class=""container py-4"">
    <div class=""d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3"">
      <div>
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Official Store</span>
        <h2 class=""fw-bold text-dark mt-2 mb-0"">Featured Merchandise</h2>
      </div>
      <div class=""d-flex gap-2"">
        <button class=""btn btn-sm btn-primary rounded-pill px-3"">All</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Apparel</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Hardware</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Badges</button>
      </div>
    </div>
    <div class=""row g-4"">
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-shirt text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-success-subtle text-success w-auto align-self-start mb-2"">In Stock</span>
            <h6 class=""fw-bold text-dark mb-1"">Signature Member Hoodie</h6>
            <p class=""text-muted small mb-3"">Heavyweight organic fleece with embroidered crest.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$55.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-id-card text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-primary-subtle text-primary w-auto align-self-start mb-2"">Official</span>
            <h6 class=""fw-bold text-dark mb-1"">Smart NFC Badge Holder</h6>
            <p class=""text-muted small mb-3"">Contactless titanium credential clip with lanyard.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$24.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-briefcase text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-warning-subtle text-warning w-auto align-self-start mb-2"">Hot</span>
            <h6 class=""fw-bold text-dark mb-1"">Executive Leather Folio</h6>
            <p class=""text-muted small mb-3"">Document portfolio with pen loop and brass zippers.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$75.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-mug-hot text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-secondary-subtle text-secondary w-auto align-self-start mb-2"">Accessory</span>
            <h6 class=""fw-bold text-dark mb-1"">Ceramic Travel Tumbler</h6>
            <p class=""text-muted small mb-3"">Double-wall insulated 16oz thermal beverage cup.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$18.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 10. Newsletter Section
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "News_MinimalBar",
                    CategoryKey = "body",
                    Name = "Clean Light Newsletter Dispatch",
                    VariantCode = "News_MinimalBar",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Subscribe to Executive Insights",
                        description = "Receive weekly briefings, technology advisories, and organization updates directly in your inbox."
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-3"">
    <div class=""card border border-light-subtle rounded-4 p-4 p-lg-5 bg-white text-center shadow-sm max-w-800 mx-auto"">
      <div class=""rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mx-auto mb-3"" style=""width:60px; height:60px;"">
        <i class=""fa-solid fa-envelope-open-text fs-3""></i>
      </div>
      <h3 class=""fw-bold text-dark mb-2"">{{ Title }}</h3>
      <p class=""text-muted small mb-4 max-w-500 mx-auto"">{{ Description }}</p>
      <div class=""max-w-500 mx-auto w-100"">
        {{ Form ""Newsletter_Subscribe"" }}
      </div>
      <small class=""text-muted mt-3 d-block""><i class=""fa-solid fa-lock me-1""></i> Zero spam. Unsubscribe at any time.</small>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 11. Clean Contact Us & Office Inquiry Form
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Contact_SplitDetails",
                    CategoryKey = "body",
                    Name = "Clean Contact Us & Office Inquiries Form",
                    VariantCode = "Contact_SplitDetails",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Send Us a Direct Message",
                        miniTitle = "Official Inquiries",
                        description = "Have questions regarding our services, partnerships, or operational support? Send us a message and our team will get back to you promptly.",
                        items = new[]
                        {
                            new { title = "Corporate Office", description = "Administrative Headquarters, 742 Evergreen Terrace, Suite 500", iconText = "fa-solid fa-location-dot" },
                            new { title = "Official Inquiry Desk", description = "Direct corporate correspondence and information", iconText = "fa-solid fa-envelope" },
                            new { title = "Business Hours", description = "Monday – Friday: 8:30 AM – 5:30 PM (LST)", iconText = "fa-solid fa-clock" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""contact"">
  <div class=""container py-4"">
    <div class=""row g-5"">
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4 fs-6"">{{ Description }}</p>

        <div class=""d-flex flex-column gap-3 mb-4"">
          {{#each PageSectionLists}}
            <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
              {{#if IconText}}
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
                  <i class=""{{ IconText }}""></i>
                </div>
              {{/if}}
              <div>
                <strong class=""text-dark small d-block"">{{ Title }}</strong>
                <span class=""text-muted small"">{{ Description }}</span>
              </div>
            </div>
          {{/each}}
        </div>
      </div>

      <div class=""col-lg-7"">
        <div class=""card border-0 rounded-4 p-4 p-lg-5 shadow-sm bg-white"" id=""ozContactFormCard"">
          <h4 class=""fw-bold text-dark mb-1"">Send Us a Direct Message</h4>
          <p class=""text-muted small mb-4"">Please complete the form below. We typically respond promptly.</p>
          {{ Form ""Contact_Us"" }}
        </div>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 11b. Dedicated Service Request & Project Intake Section
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Body_RequestService",
                    CategoryKey = "body",
                    Name = "Dedicated Service Request & Project Intake",
                    VariantCode = "Body_RequestService",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Request a Tailored Enterprise Service",
                        miniTitle = "Service Consultation",
                        description = "Tell us about your organization's goals, operational challenges, or project timeline. Our advisory team will review your specifications and schedule a dedicated strategic consultation.",
                        items = new[]
                        {
                            new { title = "Dedicated Solutions Lead", description = "Direct engagement with an enterprise systems architect.", iconText = "fa-solid fa-check" },
                            new { title = "Feasibility & Scope Assessment", description = "Actionable roadmap, architectural fit, and resource modeling.", iconText = "fa-solid fa-check" },
                            new { title = "Client Confidentiality & NDA", description = "Strict confidentiality agreements and secure communication channels guaranteed.", iconText = "fa-solid fa-check" }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""request-service"">
  <div class=""container py-4"">
    <div class=""row g-5"">
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4 fs-6"">{{ Description }}</p>

        <div class=""card border-0 shadow-sm rounded-4 p-4 bg-white mb-4"">
          <h6 class=""fw-bold text-dark text-uppercase small mb-3 tracking-wider text-primary"">Engagement Standards</h6>
          <div class=""d-flex flex-column gap-3"">
            {{#each PageSectionLists}}
              <div class=""d-flex align-items-start gap-3"">
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:32px; height:32px;"">
                  <i class=""{{ IconText }}""></i>
                </div>
                <div>
                  <strong class=""text-dark small d-block"">{{ Title }}</strong>
                  <span class=""text-muted small"">{{ Description }}</span>
                </div>
              </div>
            {{/each}}
          </div>
        </div>
      </div>

      <div class=""col-lg-7"">
        <div class=""card border-0 rounded-4 p-4 p-lg-5 shadow-sm bg-white"" id=""ozServiceFormCard"">
          <h4 class=""fw-bold text-dark mb-1"">Service Request &amp; Project Intake</h4>
          <p class=""text-muted small mb-4"">Please complete the form below so we can pair you with the right specialist.</p>
          {{ Form ""Service_Request"" }}
        </div>
      </div>
    </div>
  </div>
</section>",
                    CssStyles = @"
.oz-pill-btn {
  font-size: 13px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}
.oz-pill-btn.active, .oz-pill-btn:hover {
  background-color: #0050e5 !important;
  border-color: #0050e5 !important;
  color: #ffffff !important;
}"
                },

                // 12. Blog & News Articles Grid
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Blog_CardGrid3",
                    CategoryKey = "blog",
                    Name = "3-Column News & Articles Showcase",
                    VariantCode = "Blog_CardGrid3",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""blog"">
  <div class=""container py-4"">
    <div class=""d-flex justify-content-between align-items-end mb-5 flex-wrap gap-3"">
      <div>
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-0"">{{ Title }}</h2>
      </div>
      <div>
        <a href=""{{ ButtonLink }}"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold small"">
          <span>{{ ButtonText }}</span>
          <span class=""ms-1"">→</span>
        </a>
      </div>
    </div>
    <div class=""row g-4"">
      {{#each Articles}}
        <div class=""col-md-4"">
          <div class=""card border-0 rounded-4 overflow-hidden shadow-sm bg-white h-100 d-flex flex-column"">
            <div class=""position-relative"">
              <img src=""{{ CoverImageUrl }}"" alt=""{{ Title }}"" class=""card-img-top object-fit-cover"" style=""height: 220px;"" />
              <span class=""badge bg-white text-dark shadow-sm position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill small fw-bold"">{{ Category }}</span>
            </div>
            <div class=""card-body p-4 d-flex flex-column flex-grow-1"">
              <span class=""text-muted small mb-2 d-block""><i class=""fa-regular fa-calendar me-1""></i>{{ PublishedDate }}</span>
              <h5 class=""fw-bold text-dark mb-2 line-clamp-2"">{{ Title }}</h5>
              <p class=""text-muted small mb-4 line-clamp-3"">{{ Excerpt }}</p>
              <div class=""mt-auto"">
                <a href=""{{ Url }}"" class=""text-primary fw-bold small text-decoration-none d-inline-flex align-items-center gap-1"">
                  <span>Read Article</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
</section>",
                    CssStyles = @""
                },

                // 12b. Single Article Blog Detail with Sticky Sidebar
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Blog_ArticleDetail",
                    CategoryKey = "blog",
                    Name = "Single Article with Sticky Sidebar & Widgets",
                    VariantCode = "Blog_ArticleDetail",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    HtmlTemplate = @"
<article class=""py-5 bg-white"" id=""blog-detail"">
  <div class=""container py-3"">
    <nav class=""mb-4"" aria-label=""breadcrumb"">
      <ol class=""breadcrumb small"">
        <li class=""breadcrumb-item""><a href=""/"" class=""text-decoration-none"">Home</a></li>
        <li class=""breadcrumb-item""><a href=""/blog"" class=""text-decoration-none"">News &amp; Insights</a></li>
        <li class=""breadcrumb-item active text-truncate"" style=""max-width: 320px;"">{{ Article.Title }}</li>
      </ol>
    </nav>

    <div class=""row g-5"">
      <div class=""col-lg-8"">
        <div class=""mb-3"">
          <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill fw-bold text-uppercase"">{{ Article.Category }}</span>
          <span class=""text-muted small ms-2""><i class=""fa-regular fa-calendar me-1""></i>{{ Article.PublishedDate }}</span>
          <span class=""text-muted small ms-3""><i class=""fa-regular fa-clock me-1""></i>{{ Article.ReadTime }}</span>
        </div>

        <h1 class=""fw-bold text-dark display-5 mb-4"">{{ Article.Title }}</h1>

        <div class=""rounded-4 overflow-hidden shadow-sm mb-4"">
          <img src=""{{ Article.CoverImageUrl }}"" alt=""{{ Article.Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 460px;"" />
        </div>

        <div class=""article-body-content fs-5 text-secondary lh-lg mb-5"">
          {{ Article.Body }}
        </div>

        <div class=""border-top border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-3 mb-5"">
          <div class=""d-flex align-items-center gap-2"">
            <span class=""fw-bold text-dark small"">Tagged:</span>
            {{#each Article.Tags}}
              <span class=""badge bg-light text-dark border"">{{ this }}</span>
            {{/each}}
          </div>
          {{ PostShareStrip }}
        </div>

        <div class=""card border-0 bg-light rounded-4 p-4 d-flex flex-row gap-3 align-items-center"">
          <img src=""{{ Article.AuthorAvatarUrl }}"" alt=""{{ Article.AuthorName }}"" class=""rounded-circle object-fit-cover"" style=""width: 64px; height: 64px;"" />
          <div>
            <h6 class=""fw-bold text-dark mb-1"">Written by {{ Article.AuthorName }}</h6>
            <p class=""text-muted small mb-0"">{{ Article.AuthorBio }}</p>
          </div>
        </div>
      </div>

      <div class=""col-lg-4"">
        <div class=""d-flex flex-column gap-4 sticky-top"" style=""top: 100px;"">
          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Search Insights</h6>
            <form action=""/blog"" method=""get"">
              <div class=""input-group"">
                <input type=""text"" name=""q"" class=""form-control bg-light border-0"" placeholder=""Search keywords..."" required />
                <button type=""submit"" class=""btn btn-primary"" title=""Search""><i class=""fa-solid fa-magnifying-glass""></i></button>
              </div>
            </form>
          </div>

          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Recent Dispatches</h6>
            <div class=""d-flex flex-column gap-3"">
              {{#each RecentArticles}}
                <div class=""d-flex gap-3 align-items-center"">
                  <img src=""{{ CoverImageUrl }}"" alt=""{{ Title }}"" class=""rounded-3 object-fit-cover flex-shrink-0"" style=""width: 60px; height: 60px;"" />
                  <div>
                    <small class=""text-muted d-block"" style=""font-size: 11px;"">{{ PublishedDate }}</small>
                    <a href=""{{ Url }}"" class=""fw-bold text-dark small text-decoration-none line-clamp-2"">{{ Title }}</a>
                  </div>
                </div>
              {{/each}}
            </div>
          </div>

          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Topics &amp; Categories</h6>
            <ul class=""list-unstyled mb-0 d-flex flex-column gap-2 small"">
              {{#each BlogCategories}}
                <li class=""d-flex justify-content-between align-items-center"">
                  <a href=""{{ Url }}"" class=""text-decoration-none text-secondary"">{{ Name }}</a>
                  <span class=""badge bg-light text-muted border"">{{ PostCount }}</span>
                </li>
              {{/each}}
            </ul>
          </div>

          <div class=""card border-0 rounded-4 p-4 text-center text-white shadow-sm"" style=""background: linear-gradient(135deg, #0050e5, #002b80);"">
            <i class=""fa-solid fa-envelope-open-text fs-2 mb-2""></i>
            <h6 class=""fw-bold mb-1"">Stay In The Loop</h6>
            <p class=""small text-white-50 mb-3"">Receive weekly editorial briefs and executive announcements.</p>
            {{ Form ""Newsletter_Subscribe"" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</article>",
                    CssStyles = @""
                },

                // 13. Centered Background Image Breadcrumbs & Page Headers
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Breadcrumb_PageHeader",
                    CategoryKey = "breadcrumb",
                    Name = "Centered Background Image Breadcrumb Banner",
                    VariantCode = "Breadcrumb_PageHeader",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        title = "Enterprise Solutions & Insights",
                        description = "Discover how leading organizations accelerate growth through reliable, secure cloud architectures.",
                        backgroundImageUrl = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
                        trailItems = new[]
                        {
                            new { label = "Home", url = "/", isActive = false },
                            new { label = "Capabilities", url = "/capabilities", isActive = false },
                            new { label = "Enterprise Solutions", url = "/capabilities/enterprise", isActive = true }
                        }
                    }),
                    HtmlTemplate = @"
<section class=""oz-breadcrumb-hero py-5 text-center position-relative overflow-hidden"" style=""background-image: url('{{ BackgroundImageUrl }}');"">
  <div class=""oz-breadcrumb-overlay position-absolute top-0 start-0 w-100 h-100""></div>
  <div class=""container position-relative py-lg-4"" style=""z-index: 2;"">
    <nav aria-label=""breadcrumb"" class=""d-flex justify-content-center mb-2"">
      {{ BreadcrumbTrail }}
    </nav>
    <h1 class=""display-5 fw-bold text-white mb-2"">{{ Title }}</h1>
    <p class=""text-white text-opacity-75 lead fs-6 mx-auto mb-0"" style=""max-width: 650px;"">{{ Description }}</p>
  </div>
</section>",
                    CssStyles = @"
.oz-breadcrumb-hero {
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  position: relative;
}
.oz-breadcrumb-overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(15, 23, 42, 0.88) 100%);
}
.oz-breadcrumb-hero .breadcrumb-item + .breadcrumb-item::before {
  display: none !important;
}
.oz-breadcrumb-hero .breadcrumb-item a:hover {
  color: #ffffff !important;
  text-decoration: underline !important;
}"
                },

                // 14. Corporate Footer
                new()
                {
                    Id = Guid.NewGuid(),
                    TemplateKey = "Footer_4ColCorporate",
                    CategoryKey = "footer",
                    Name = "Clean Light Corporate Footer",
                    VariantCode = "Footer_4ColCorporate",
                    InstalledVersion = "1.0.0",
                    IsActive = true,
                    InstalledUtc = DateTime.UtcNow,
                    HtmlTemplate = @"
<footer class=""bg-light border-top py-5 text-secondary"">
  <div class=""container"">
    <div class=""row g-4 mb-5"">
      <div class=""col-lg-4"">
        <div class=""d-flex align-items-center gap-2 mb-3"">
          <span class=""fw-bold text-dark fs-5"">{{ BrandName }}</span>
        </div>
        <p class=""small text-muted max-w-300"">{{ Description }}</p>
        <div class=""small text-muted mb-3 d-flex flex-column gap-1"">
          <div><i class=""fa-solid fa-envelope me-2 text-primary""></i>{{ Email }}</div>
          <div><i class=""fa-solid fa-phone me-2 text-primary""></i>{{ Phone }}</div>
        </div>
        <div class=""d-flex gap-2 text-secondary"">
          <a href=""https://facebook.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Facebook""><i class=""fa-brands fa-facebook-f""></i></a>
          <a href=""https://x.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Twitter / X""><i class=""fa-brands fa-x-twitter""></i></a>
          <a href=""https://linkedin.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""LinkedIn""><i class=""fa-brands fa-linkedin-in""></i></a>
          <a href=""https://instagram.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Instagram""><i class=""fa-brands fa-instagram""></i></a>
          <a href=""https://youtube.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""YouTube""><i class=""fa-brands fa-youtube""></i></a>
        </div>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Solutions</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          {{#each CategoryPages ""Services""}}
            <li><a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a></li>
          {{/each}}
        </ul>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Company</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          {{#each CategoryPages ""Company""}}
            <li><a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a></li>
          {{/each}}
        </ul>
      </div>
      <div class=""col-lg-4"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Stay Connected</h6>
        <p class=""small text-muted"">Subscribe to our newsletter for executive insights, market updates, and announcements.</p>
        {{ Form ""Newsletter_Subscribe"" }}
      </div>
    </div>
    <div class=""border-top pt-4 d-flex justify-content-between align-items-center flex-wrap gap-3 small text-muted"">
      <div>{{ Copyright }}</div>
      <div class=""d-flex gap-3"">
        {{#each LegalPages}}
          <a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a>
        {{/each}}
      </div>
      <div>{{ PoweredBy }}</div>
    </div>
  </div>
</footer>",
                    CssStyles = @"",
                    DefaultContentJson = @"{""title"":""Clean Light Corporate Footer"",""description"":""Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations."",""email"":""contact@organization.com"",""phone"":""+1 (555) 019-2834"",""categories"":[{""name"":""Services"",""displayTitle"":""Solutions"",""pages"":[{""title"":""Strategic Consulting"",""url"":""/strategic-advisory""},{""title"":""Systems Modernization"",""url"":""/systems-modernization""},{""title"":""Performance & Scale"",""url"":""/performance-scale""},{""title"":""Enterprise Advisory"",""url"":""/enterprise-governance""}]},{""name"":""Company"",""displayTitle"":""Company"",""pages"":[{""title"":""About Us"",""url"":""/about""},{""title"":""Our History"",""url"":""/history""},{""title"":""Leadership Team"",""url"":""/team""}]}],""legalPages"":[{""title"":""Privacy Policy"",""url"":""/privacy-policy""},{""title"":""Terms & Conditions"",""url"":""/terms-and-conditions""},{""title"":""Cookie Policy"",""url"":""/cookie-policy""}]}"
                }
            };
        }
    }
}
