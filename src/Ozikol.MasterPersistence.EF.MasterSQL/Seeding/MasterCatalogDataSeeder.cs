using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;

namespace Ozikol.MasterPersistence.EF.MasterSQL.Seeding
{
    public static class MasterCatalogDataSeeder
    {
        public static async Task SeedAllAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager = null,
            UserManager<CentralUser>? userManager = null,
            CancellationToken cancellationToken = default)
        {
            await SeedRolesAndSuperAdminAsync(dbContext, roleManager, userManager, cancellationToken);
            await SeedMarketplaceCategoriesAsync(dbContext, cancellationToken);
            await SeedMarketplaceTemplatesAsync(dbContext, cancellationToken);
            await SeedFeatureCatalogAsync(dbContext, cancellationToken);
            await SeedMediaAssetsAsync(dbContext, cancellationToken);
        }

        public static async Task SeedRolesAndSuperAdminAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager,
            UserManager<CentralUser>? userManager,
            CancellationToken ct = default)
        {
            var centralRoles = new[]
            {
                new CentralRole("SuperAdmin", "Full system governance, database fleet migrations, operator access"),
                new CentralRole("Admin", "Tenant workspace governance, subscription status, support"),
                new CentralRole("TemplateManager", "Marketplace templates, layout blueprints, review moderations"),
                new CentralRole("ReferralManager", "Affiliate partner network, commission tiers, payout tracking"),
                new CentralRole("Operator", "Platform operational staff and monitoring"),
                new CentralRole("BillingAdmin", "Subscription billing, invoices, and payment gateway configuration"),
                new CentralRole("SupportAgent", "Customer tickets, live chat assistance, and workspace diagnostics")
            };

            foreach (var role in centralRoles)
            {
                if (roleManager != null)
                {
                    if (!await roleManager.RoleExistsAsync(role.Name!))
                    {
                        await roleManager.CreateAsync(role);
                    }
                }
                else
                {
                    if (!await dbContext.Roles.AnyAsync(r => r.NormalizedName == role.Name!.ToUpperInvariant(), ct))
                    {
                        role.NormalizedName = role.Name!.ToUpperInvariant();
                        dbContext.Roles.Add(role);
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }

            // Seed SuperAdmin User
            const string superAdminEmail = "superadmin@ozikol.cloud";
            if (userManager != null)
            {
                var existingUser = await userManager.FindByEmailAsync(superAdminEmail);
                if (existingUser == null)
                {
                    var superAdmin = new CentralUser
                    {
                        UserName = superAdminEmail,
                        Email = superAdminEmail,
                        EmailConfirmed = true,
                        FirstName = "Ozikol",
                        LastName = "SuperAdmin",
                        Department = "Global DevOps & Architecture",
                        IsActive = true,
                        CreatedUtc = DateTime.UtcNow
                    };

                    var createResult = await userManager.CreateAsync(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");
                    if (createResult.Succeeded)
                    {
                        await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
                    }
                }
            }
            else
            {
                if (!await dbContext.Users.AnyAsync(u => u.NormalizedEmail == superAdminEmail.ToUpperInvariant(), ct))
                {
                    var hasher = new PasswordHasher<CentralUser>();
                    var superAdmin = new CentralUser
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserName = superAdminEmail,
                        NormalizedUserName = superAdminEmail.ToUpperInvariant(),
                        Email = superAdminEmail,
                        NormalizedEmail = superAdminEmail.ToUpperInvariant(),
                        EmailConfirmed = true,
                        FirstName = "Ozikol",
                        LastName = "SuperAdmin",
                        Department = "Global DevOps & Architecture",
                        IsActive = true,
                        SecurityStamp = Guid.NewGuid().ToString(),
                        ConcurrencyStamp = Guid.NewGuid().ToString(),
                        CreatedUtc = DateTime.UtcNow
                    };
                    superAdmin.PasswordHash = hasher.HashPassword(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");

                    dbContext.Users.Add(superAdmin);
                    await dbContext.SaveChangesAsync(ct);

                    var superAdminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.NormalizedName == "SUPERADMIN", ct);
                    if (superAdminRole != null)
                    {
                        dbContext.UserRoles.Add(new IdentityUserRole<string>
                        {
                            UserId = superAdmin.Id,
                            RoleId = superAdminRole.Id
                        });
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }
        }

        private static async Task SeedMarketplaceCategoriesAsync(MasterCatalogDbContext dbContext, CancellationToken ct)
        {
            var categories = new[]
            {
                new MasterMarketplaceCategory { CategoryKey = "menu", Name = "Menu / Navigation", Description = "Header navbars, topbars, sticky navigation, mega menus, and mobile drawer navigations.", Icon = "mdi-page-layout-header", SortOrder = 1, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "hero", Name = "Hero / Slider", Description = "Full-width hero headers, video backdrops, split product showcases, and animated slide carousels.", Icon = "mdi-view-carousel", SortOrder = 2, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "bodysections", Name = "Body Sections", Description = "Layout library (Services, Pricing, Testimonials, FAQ, About, Team, CTA, Timeline, Gallery, Tabs, Stats).", Icon = "mdi-view-dashboard-outline", SortOrder = 3, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "blogs", Name = "Blogs & News", Description = "Editorial post grids, news carousels, author profiles, and magazine layouts.", Icon = "mdi-newspaper-variant-outline", SortOrder = 4, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "marquee", Name = "Marquee & Tickers", Description = "Smooth infinite scrolling partner logo tickers, announcement ribbons, and stock counters.", Icon = "mdi-animation-outline", SortOrder = 5, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "contactus", Name = "Contact Us & Lead Capture", Description = "Dedicated contact forms, inquiry lead capture cards, demo booking, and interactive office maps.", Icon = "mdi-card-account-mail-outline", SortOrder = 6, IsActive = true },
                new MasterMarketplaceCategory { CategoryKey = "footer", Name = "Footers", Description = "Multi-column sitemaps, newsletter subscription boxes, social handles, and copyright bars.", Icon = "mdi-page-layout-footer", SortOrder = 7, IsActive = true }
            };

            foreach (var cat in categories)
            {
                var existing = await dbContext.MasterMarketplaceCategories
                    .FirstOrDefaultAsync(c => c.CategoryKey == cat.CategoryKey, ct);

                if (existing == null)
                {
                    dbContext.MasterMarketplaceCategories.Add(cat);
                }
                else
                {
                    existing.Name = cat.Name;
                    existing.Description = cat.Description;
                    existing.Icon = cat.Icon;
                    existing.SortOrder = cat.SortOrder;
                    existing.IsActive = true;
                }
            }

            await dbContext.SaveChangesAsync(ct);
        }

        private static async Task SeedMarketplaceTemplatesAsync(MasterCatalogDbContext dbContext, CancellationToken ct)
        {
            var templates = Build21Templates();

            foreach (var t in templates)
            {
                var existing = await dbContext.MasterMarketplaceTemplates
                    .Include(x => x.Sections)
                        .ThenInclude(s => s.SectionLists)
                    .FirstOrDefaultAsync(x => x.VariantCode == t.VariantCode, ct);

                if (existing == null)
                {
                    dbContext.MasterMarketplaceTemplates.Add(t);
                }
                else
                {
                    existing.Name = t.Name;
                    existing.CategoryKey = t.CategoryKey;
                    existing.Tag = t.Tag;
                    existing.Badge = t.Badge;
                    existing.Description = t.Description;
                    existing.PreviewTitle = t.PreviewTitle;
                    existing.PreviewSubtitle = t.PreviewSubtitle;
                    existing.PreviewImageUrl = t.PreviewImageUrl;
                    existing.HtmlTemplate = t.HtmlTemplate;
                    existing.CssStyles = t.CssStyles;
                    existing.JsScript = t.JsScript;
                    existing.SortOrder = t.SortOrder;
                    existing.IsActive = true;
                }
            }

            await dbContext.SaveChangesAsync(ct);
        }

        private static List<MasterMarketplaceTemplate> Build21Templates()
        {
            var list = new List<MasterMarketplaceTemplate>();

            // =========================================================================
            // 1. Category: MENU (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex Glassmorphism Sticky Navbar",
                variantCode: "menu-sticky-glass",
                categoryKey: "menu",
                tag: "Navigation",
                badge: "Popular",
                description: "Translucent frosted glass sticky navigation with company branding, 5 primary links, user profile badge, and call-to-action button.",
                previewTitle: "Apex Glassmorphism Navbar",
                previewSubtitle: "Fixed responsive topbar with backdrop filter blur",
                thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
                html: "<header class='apex-glass-nav'><div class='container nav-flex'><a href='/' class='nav-brand'>{{ CompanyName }}</a><nav class='nav-links'>{{#each PageSectionLists}}<a href='{{ ButtonLink }}'>{{ Title }}</a>{{/each}}</nav><a href='/Signup' class='btn-nav-cta'>Launch Trial</a></div></header>",
                css: ".apex-glass-nav { position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(12px); background: rgba(15, 23, 42, 0.75); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px 0; } .nav-flex { display: flex; align-items: center; justify-content: space-between; } .nav-links a { color: #cbd5e1; margin: 0 14px; text-decoration: none; font-weight: 500; transition: color .2s; } .nav-links a:hover { color: #38bdf8; } .btn-nav-cta { background: #0284c7; color: #fff; padding: 8px 18px; border-radius: 8px; font-weight: 600; text-decoration: none; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Products & Features", "Explore core modules", "#features", "mdi-view-grid-outline"),
                    ("Marketplace", "Browse cloud templates", "/marketplace", "mdi-storefront-outline"),
                    ("Pricing & Plans", "Transparent modular billing", "#pricing", "mdi-cash-multiple"),
                    ("Affiliate Network", "Partner commissions", "/affiliate", "mdi-handshake-outline"),
                    ("Documentation", "API and guides", "#docs", "mdi-book-open-page-variant-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Enterprise Mega-Menu",
                variantCode: "menu-mega-corporate",
                categoryKey: "menu",
                tag: "Navigation",
                badge: "Enterprise",
                description: "Multi-column corporate navigation system with featured product highlight cards, category groupings, and direct support status badge.",
                previewTitle: "Nexus Mega-Navigation",
                previewSubtitle: "Multi-column dropdown navigation with feature cards",
                thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
                html: "<header class='nexus-mega-nav'><div class='container'><div class='mega-top'><span class='live-badge'>● Platform Online</span><div class='mega-contact'><span>Support: 24/7 Global</span></div></div><div class='mega-bar'><div class='brand'>{{ CompanyName }}</div><div class='mega-links'>{{#each PageSectionLists}}<a href='{{ ButtonLink }}' class='mega-item'><i class='mdi {{ IconClass }}'></i><span>{{ Title }}</span></a>{{/each}}</div></div></div></header>",
                css: ".nexus-mega-nav { background: #0a0f1d; color: #fff; border-bottom: 2px solid #1e293b; } .mega-top { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; } .mega-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; } .mega-links { display: flex; gap: 20px; } .mega-item { color: #f8fafc; text-decoration: none; display: flex; align-items: center; gap: 8px; font-weight: 500; }",
                sortOrder: 2,
                items: new[]
                {
                    ("Enterprise Modules", "25 business applications", "#modules", "mdi-cube-outline"),
                    ("Isolated Databases", "Dedicated SQL storage", "#security", "mdi-database-lock-outline"),
                    ("Global SLA Support", "Guaranteed 99.99% uptime", "#sla", "mdi-clock-check-outline"),
                    ("Compliance & Audit", "Immutable audit trails", "#compliance", "mdi-shield-account-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Minimalist Drawer Header",
                variantCode: "menu-minimal-drawer",
                categoryKey: "menu",
                tag: "Navigation",
                badge: "Minimal",
                description: "Clean, ultra-light minimalist header with slide-out off-canvas drawer navigation for modern SaaS and mobile experiences.",
                previewTitle: "Lumina Off-Canvas Drawer",
                previewSubtitle: "Minimal header with animated drawer navigation",
                thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
                html: "<header class='lumina-nav'><div class='container nav-row'><div class='logo'>{{ CompanyName }}</div><div class='quick-links'>{{#each PageSectionLists}}<a href='{{ ButtonLink }}'>{{ Title }}</a>{{/each}}</div><button class='drawer-toggle' aria-label='Open Navigation'><i class='mdi mdi-menu'></i></button></div></header>",
                css: ".lumina-nav { padding: 20px 0; background: #ffffff; border-bottom: 1px solid #e2e8f0; } .nav-row { display: flex; justify-content: space-between; align-items: center; } .quick-links a { margin: 0 16px; color: #475569; text-decoration: none; font-weight: 500; } .drawer-toggle { background: transparent; border: none; font-size: 24px; cursor: pointer; color: #0f172a; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Solutions", "Overview of capabilities", "#solutions", "mdi-compass-outline"),
                    ("Community Hub", "Member portal", "#community", "mdi-account-group-outline"),
                    ("Pricing", "Flexible tiers", "#pricing", "mdi-tag-outline"),
                    ("Login", "Access workspace", "/Account/Login", "mdi-login")
                }
            ));

            // =========================================================================
            // 2. Category: HERO (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex Split Product Showcase Hero",
                variantCode: "hero-split-showcase",
                categoryKey: "hero",
                tag: "Hero Banner",
                badge: "High Converting",
                description: "High-impact split screen hero layout with headline, badge, value proposition bullets, dual CTA buttons, and interactive application showcase.",
                previewTitle: "Apex Split Hero Showcase",
                previewSubtitle: "Headline and dual buttons on left, rich graphic on right",
                thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
                html: "<section class='hero-split'><div class='container grid-2col'><div class='hero-text'><div class='badge-pill'>⚡ {{ MiniTitle }}</div><h1>{{ Title }}</h1><p>{{ Description }}</p><div class='hero-btns'><a href='{{ ButtonUrl }}' class='btn-primary'>{{ ButtonText }}</a><a href='{{ SecondaryButtonUrl }}' class='btn-secondary'>{{ SecondaryButtonText }}</a></div></div><div class='hero-media'><img src='{{ PrimaryImageUrl }}' alt='{{ Title }}' class='hero-img' /></div></div></section>",
                css: ".hero-split { padding: 90px 0; background: radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.15), transparent 40%), #0b0f19; color: #fff; } .grid-2col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; } .badge-pill { display: inline-block; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; } .hero-text h1 { font-size: 46px; font-weight: 800; line-height: 1.15; margin-bottom: 18px; } .hero-text p { font-size: 18px; color: #94a3b8; line-height: 1.6; margin-bottom: 32px; } .hero-btns { display: flex; gap: 16px; } .btn-primary { background: #0284c7; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; } .btn-secondary { background: rgba(255,255,255,0.08); color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); padding: 14px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; } .hero-img { width: 100%; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }",
                sortOrder: 1,
                items: new[]
                {
                    ("Dedicated Database Node", "100% data isolation per organization", "#", "mdi-database-lock"),
                    ("Instant 2-Minute Provisioning", "Automated SQL login and schema creation", "#", "mdi-flash"),
                    ("25 Pluggable Modules", "Pay only for what you activate", "#", "mdi-puzzle-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Executive Video Mesh Backdrop",
                variantCode: "hero-video-backdrop",
                categoryKey: "hero",
                tag: "Hero Banner",
                badge: "Executive",
                description: "Deep dark mesh gradient and video backdrop layout with centered headline, glowing action buttons, and 3 live stat metrics.",
                previewTitle: "Nexus Mesh Backdrop Hero",
                previewSubtitle: "Centered headline with integrated metrics bar",
                thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
                html: "<section class='hero-centered'><div class='container text-center'><div class='mini-title'>{{ MiniTitle }}</div><h1>{{ Title }}</h1><p>{{ Description }}</p><div class='cta-group'><a href='{{ ButtonUrl }}' class='btn-glow'>{{ ButtonText }}</a></div><div class='stats-strip'>{{#each PageSectionLists}}<div class='stat-card'><h3>{{ Title }}</h3><p>{{ SubTitle }}</p></div>{{/each}}</div></div></section>",
                css: ".hero-centered { padding: 120px 0 80px; background: linear-gradient(180deg, #0f172a 0%, #020617 100%); color: #fff; text-align: center; } .mini-title { color: #38bdf8; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-size: 14px; margin-bottom: 16px; } .hero-centered h1 { font-size: 52px; font-weight: 800; max-width: 860px; margin: 0 auto 20px; line-height: 1.15; } .hero-centered p { font-size: 19px; color: #94a3b8; max-width: 680px; margin: 0 auto 36px; } .btn-glow { background: #0284c7; box-shadow: 0 0 24px rgba(2,132,199,0.5); color: #fff; padding: 16px 36px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; } .stats-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 800px; margin: 64px auto 0; padding-top: 36px; border-top: 1px solid rgba(255,255,255,0.1); } .stat-card h3 { font-size: 32px; font-weight: 800; color: #38bdf8; margin-bottom: 4px; } .stat-card p { font-size: 14px; color: #94a3b8; margin: 0; }",
                sortOrder: 2,
                items: new[]
                {
                    ("99.99%", "Enterprise Uptime SLA", "#", "mdi-check-decagram"),
                    ("< 50ms", "API Response Latency", "#", "mdi-speedometer"),
                    ("100%", "Isolated Tenant Databases", "#", "mdi-shield-check")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Multi-Slide Animated Carousel",
                variantCode: "hero-animated-slider",
                categoryKey: "hero",
                tag: "Hero Banner",
                badge: "Interactive",
                description: "Full-width 3-slide animated carousel showcasing different platform highlights with background imagery and slide control buttons.",
                previewTitle: "Lumina Hero Slider Carousel",
                previewSubtitle: "Full-width dynamic slider with 3 rich feature slides",
                thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
                html: "<section class='lumina-slider'><div class='slider-container'>{{#each PageSectionLists}}<div class='slide-box'><div class='slide-content'><span class='slide-badge'>{{ BadgeText }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p><a href='{{ ButtonLink }}' class='btn-slide'>{{ ButtonText }}</a></div></div>{{/each}}</div></section>",
                css: ".lumina-slider { position: relative; width: 100%; min-height: 580px; background: #020617; color: #fff; overflow: hidden; } .slide-box { padding: 90px 0; display: flex; align-items: center; } .slide-badge { background: #0284c7; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; } .slide-content h2 { font-size: 44px; font-weight: 800; margin: 16px 0; } .slide-content p { font-size: 18px; color: #cbd5e1; max-width: 600px; margin-bottom: 28px; } .btn-slide { background: #38bdf8; color: #0f172a; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Automated SQL Node Provisioning", "Zero-friction onboarding", "/Signup", "mdi-rocket"),
                    ("25 Business Modules on Demand", "Scale features as you grow", "/Marketplace", "mdi-cube-scan"),
                    ("Affiliate Partner Commissions", "Earn up to 25% recurring monthly revenue", "/Affiliate", "mdi-currency-usd")
                }
            ));

            // =========================================================================
            // 3. Category: BODYSECTIONS (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex 6-Card Feature Matrix",
                variantCode: "body-features-grid",
                categoryKey: "bodysections",
                tag: "Features",
                badge: "Essential",
                description: "Clean 6-card feature & service matrix with vibrant icons, title headings, descriptive copy, and subtle hover animations.",
                previewTitle: "Apex 6-Card Features Grid",
                previewSubtitle: "Responsive 3x2 grid of modern feature cards",
                thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
                html: "<section class='features-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='features-grid'>{{#each PageSectionLists}}<div class='feature-card'><div class='icon-wrap'><i class='mdi {{ IconClass }}'></i></div><h3>{{ Title }}</h3><p>{{ Description }}</p></div>{{/each}}</div></div></section>",
                css: ".features-section { padding: 90px 0; background: #0f172a; color: #fff; } .section-header span { color: #38bdf8; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 1.5px; } .section-header h2 { font-size: 38px; font-weight: 800; margin: 12px 0; } .section-header p { font-size: 17px; color: #94a3b8; max-width: 650px; margin: 0 auto 56px; } .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; } .feature-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.06); padding: 32px 24px; border-radius: 14px; transition: transform .25s, border-color .25s; } .feature-card:hover { transform: translateY(-6px); border-color: #38bdf8; } .icon-wrap { width: 52px; height: 52px; border-radius: 10px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px; } .feature-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 10px; } .feature-card p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Dedicated Database Isolation", "Each tenant gets a dedicated SQL Server database with separate credentials.", "#", "mdi-database-lock-outline"),
                    ("SignalR Real-Time Group Chat", "Instant communication channels, user mentions, and direct message boards.", "#", "mdi-chat-processing-outline"),
                    ("Bulk SMS & Sender IDs", "Dispatches multi-channel promotional and transactional SMS broadcasts.", "#", "mdi-cellphone-message"),
                    ("HTML Newsletter Studio", "Rich WYSIWYG newsletter builder with audience segments and open rates.", "#", "mdi-email-newsletter"),
                    ("Digital Member Wallet", "In-app credit management, wallet transfers, and automated top-up gateways.", "#", "mdi-wallet-outline"),
                    ("Cryptographic Election Voting", "Tamper-proof online voting, candidate ballots, and real-time tallying.", "#", "mdi-vote-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Tiered SaaS Pricing Matrix",
                variantCode: "body-pricing-tiers",
                categoryKey: "bodysections",
                tag: "Pricing",
                badge: "Popular",
                description: "3-tier subscription comparison cards (Starter $29, Pro $79, Enterprise $199) with featured card highlight and action buttons.",
                previewTitle: "Nexus Tiered Pricing Matrix",
                previewSubtitle: "3 comparison cards with featured Pro tier highlight",
                thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
                html: "<section class='pricing-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='pricing-grid'>{{#each PageSectionLists}}<div class='price-card'><div class='card-badge'>{{ BadgeText }}</div><h3>{{ Title }}</h3><div class='price-tag'>{{ PriceAmount }}<span>{{ PricePeriod }}</span></div><p class='desc'>{{ Description }}</p><a href='{{ ButtonLink }}' class='btn-price'>{{ ButtonText }}</a></div>{{/each}}</div></div></section>",
                css: ".pricing-section { padding: 90px 0; background: #0b0f19; color: #fff; } .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; align-items: stretch; } .price-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 36px 28px; position: relative; display: flex; flex-direction: column; } .price-card.featured { border-color: #38bdf8; box-shadow: 0 0 30px rgba(56, 189, 248, 0.15); } .card-badge { position: absolute; top: 16px; right: 16px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; } .price-tag { font-size: 40px; font-weight: 800; color: #fff; margin: 16px 0 8px; } .price-tag span { font-size: 15px; color: #94a3b8; font-weight: 400; } .btn-price { margin-top: auto; background: #0284c7; color: #fff; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600; text-decoration: none; }",
                sortOrder: 2,
                items: new[]
                {
                    ("Starter Workspace", "$29/mo", "/Signup?tier=starter", "mdi-rocket-launch-outline"),
                    ("Professional Suite", "$79/mo", "/Signup?tier=pro", "mdi-star-circle-outline"),
                    ("Enterprise Global", "$199/mo", "/Signup?tier=enterprise", "mdi-crown-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Testimonials & Accordion FAQ",
                variantCode: "body-testimonials-faq",
                categoryKey: "bodysections",
                tag: "Social Proof",
                badge: "High Trust",
                description: "Combined customer review feedback cards with 4 collapsible FAQ accordion items answering common enterprise questions.",
                previewTitle: "Lumina Reviews & FAQ Accordion",
                previewSubtitle: "Social proof cards alongside collapsible FAQ items",
                thumbnail: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80",
                html: "<section class='faq-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='faq-grid'>{{#each PageSectionLists}}<div class='faq-item'><h4><i class='mdi {{ IconClass }}'></i> {{ Title }}</h4><p>{{ Description }}</p></div>{{/each}}</div></div></section>",
                css: ".faq-section { padding: 90px 0; background: #0f172a; color: #fff; } .faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; } .faq-item { background: #1e293b; border: 1px solid rgba(255,255,255,0.06); padding: 24px; border-radius: 12px; } .faq-item h4 { font-size: 18px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; } .faq-item p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0; }",
                sortOrder: 3,
                items: new[]
                {
                    ("How does database isolation work?", "Every workspace gets a dedicated SQL Server database created on demand during signup with isolated logins.", "#", "mdi-help-circle-outline"),
                    ("Can I add my own custom domain?", "Yes, you can configure your custom domain in Settings with automated SSL certificate mapping.", "#", "mdi-help-circle-outline"),
                    ("How are monthly fees calculated?", "You only pay the baseline plan plus any active feature add-ons enabled during that billing cycle.", "#", "mdi-help-circle-outline"),
                    ("Is there an automated backup system?", "Yes, nightly automated backups and point-in-time recovery snapshot capabilities are included.", "#", "mdi-help-circle-outline")
                }
            ));

            // =========================================================================
            // 4. Category: BLOGS (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex 3-Column Editorial Grid",
                variantCode: "blog-magazine-grid",
                categoryKey: "blogs",
                tag: "Editorial",
                badge: "Modern",
                description: "3-column magazine article grid featuring cover photos, category tags, author avatars, and estimated read time.",
                previewTitle: "Apex 3-Column Blog Grid",
                previewSubtitle: "3-column magazine post cards with author avatars",
                thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
                html: "<section class='blog-grid-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='blog-grid'>{{#each PageSectionLists}}<div class='blog-card'><img src='{{ ImageUrl }}' alt='{{ Title }}' class='card-cover' /><div class='card-body'><span class='tag'>{{ SubTitle }}</span><h3>{{ Title }}</h3><p>{{ Description }}</p><a href='{{ ButtonLink }}' class='read-more'>Read Article →</a></div></div>{{/each}}</div></div></section>",
                css: ".blog-grid-section { padding: 90px 0; background: #0b0f19; color: #fff; } .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; } .blog-card { background: #1e293b; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); } .card-cover { width: 100%; height: 200px; object-fit: cover; } .card-body { padding: 24px; } .card-body .tag { color: #38bdf8; font-size: 12px; font-weight: 700; text-transform: uppercase; } .card-body h3 { font-size: 20px; font-weight: 700; margin: 8px 0 12px; } .card-body p { font-size: 14px; color: #94a3b8; line-height: 1.6; } .read-more { color: #38bdf8; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 14px; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Scaling Multi-Tenant Architecture with SQL Isolation", "Enterprise DevOps", "#blog1", "mdi-newspaper", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80"),
                    ("Building Modular Pay-As-You-Go Billing for SaaS", "Product Strategy", "#blog2", "mdi-newspaper", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"),
                    ("Implementing Compulsory 2FA and Audit Logs", "Security & Governance", "#blog3", "mdi-newspaper", "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Lead Story with Trending Feed",
                variantCode: "blog-featured-split",
                categoryKey: "blogs",
                tag: "News",
                badge: "Featured",
                description: "1 prominent featured article card on the left paired with a 3-item vertical trending news feed on the right.",
                previewTitle: "Nexus Featured Article Split",
                previewSubtitle: "Hero post on left with trending list on right",
                thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
                html: "<section class='blog-split-section'><div class='container'><div class='split-layout'><div class='lead-article'><img src='{{ PrimaryImageUrl }}' alt='{{ Title }}' class='lead-img' /><span class='badge'>Featured Story</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='trending-list'><h3>Trending Updates</h3>{{#each PageSectionLists}}<div class='trend-item'><h4>{{ Title }}</h4><p>{{ Description }}</p></div>{{/each}}</div></div></div></section>",
                css: ".blog-split-section { padding: 90px 0; background: #0f172a; color: #fff; } .split-layout { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; } .lead-img { width: 100%; height: 320px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; } .lead-article h2 { font-size: 28px; font-weight: 800; margin: 12px 0; } .trend-item { background: #1e293b; padding: 18px; border-radius: 10px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.06); } .trend-item h4 { font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }",
                sortOrder: 2,
                items: new[]
                {
                    ("Ozikol Version 2.0 Architectural Roadmap Released", "DevOps & Core Engine", "#trend1", "mdi-rocket"),
                    ("How Affiliate Partners Are Monetizing Workspace Referrals", "Growth & Partnerships", "#trend2", "mdi-cash"),
                    ("Automated Point-in-Time Database Disaster Recovery", "Platform Engineering", "#trend3", "mdi-database-check")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Dark Mode Engineering Digest",
                variantCode: "blog-minimal-cards",
                categoryKey: "blogs",
                tag: "Technical",
                badge: "Developer",
                description: "Minimalist dark card list for developer releases, technical engineering updates, and system change logs.",
                previewTitle: "Lumina Engineering Digest",
                previewSubtitle: "Dark-mode list feed for release notes and technical logs",
                thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
                html: "<section class='digest-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='digest-list'>{{#each PageSectionLists}}<div class='digest-item'><div class='digest-header'><h4>{{ Title }}</h4><span class='date'>{{ SubTitle }}</span></div><p>{{ Description }}</p></div>{{/each}}</div></div></section>",
                css: ".digest-section { padding: 90px 0; background: #020617; color: #fff; } .digest-list { max-width: 800px; margin: 0 auto; } .digest-item { background: #0f172a; border: 1px solid #1e293b; padding: 24px; border-radius: 12px; margin-bottom: 20px; } .digest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; } .digest-header h4 { font-size: 18px; font-weight: 700; color: #38bdf8; margin: 0; } .digest-header .date { font-size: 12px; color: #64748b; } .digest-item p { font-size: 15px; color: #94a3b8; margin: 0; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Release v2.4.0: Dynamic SignalR Group Chat Enhancements", "August 2026", "#rel1", "mdi-tag"),
                    ("Performance Patch: Sub-50ms DMV Query Optimization", "July 2026", "#rel2", "mdi-tag"),
                    ("Security Advisory: Stricter TOTP Session Validation", "June 2026", "#rel3", "mdi-tag")
                }
            ));

            // =========================================================================
            // 5. Category: MARQUEE (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex Infinite Partner Logo Ticker",
                variantCode: "marquee-logo-ticker",
                categoryKey: "marquee",
                tag: "Social Proof",
                badge: "Smooth",
                description: "Infinite smooth horizontal scrolling partner and client brand marquee with grayscale hover-to-color transition.",
                previewTitle: "Apex Partner Brand Ticker",
                previewSubtitle: "Continuous smooth scrolling company logo strip",
                thumbnail: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
                html: "<section class='marquee-ticker'><div class='container'><div class='ticker-title text-center'>{{ Title }}</div><div class='ticker-track'>{{#each PageSectionLists}}<div class='ticker-item'><i class='mdi {{ IconClass }}'></i> <span>{{ Title }}</span></div>{{/each}}</div></div></section>",
                css: ".marquee-ticker { padding: 40px 0; background: #0a0f1d; border-top: 1px solid #1e293b; border-bottom: 1px solid #1e293b; overflow: hidden; } .ticker-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; } .ticker-track { display: flex; justify-content: space-around; gap: 40px; align-items: center; } .ticker-item { font-size: 20px; font-weight: 800; color: #94a3b8; display: flex; align-items: center; gap: 10px; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Enterprise Global Corp", "Corporate Partner", "#", "mdi-domain"),
                    ("FinTech Cloud Systems", "Banking Partner", "#", "mdi-bank-outline"),
                    ("Nordic Health Union", "Non-Profit", "#", "mdi-hospital-building"),
                    ("Silicon Media Tech", "Media Partner", "#", "mdi-television-classic")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Live Platform Metric Counter Bar",
                variantCode: "marquee-stats-counter",
                categoryKey: "marquee",
                tag: "Metrics",
                badge: "Live Data",
                description: "Floating platform telemetry counter bar highlighting active tenant workspaces, uptime SLA, and millions of processed records.",
                previewTitle: "Nexus Platform Metrics Bar",
                previewSubtitle: "Horizontal counter strip displaying platform vitals",
                thumbnail: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=600&q=80",
                html: "<section class='stats-marquee'><div class='container'><div class='stats-row'>{{#each PageSectionLists}}<div class='stat-block'><h2>{{ Title }}</h2><p>{{ SubTitle }}</p></div>{{/each}}</div></div></section>",
                css: ".stats-marquee { padding: 50px 0; background: #0f172a; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff; } .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; } .stat-block h2 { font-size: 42px; font-weight: 800; color: #38bdf8; margin: 0 0 6px; } .stat-block p { font-size: 14px; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 1px; }",
                sortOrder: 2,
                items: new[]
                {
                    ("500+", "Active Workspaces", "#", "mdi-office-building"),
                    ("99.99%", "Uptime SLA Guarantee", "#", "mdi-shield-check"),
                    ("1.2M+", "Database Records", "#", "mdi-database"),
                    ("24/7", "Dedicated DevOps SLA", "#", "mdi-clock-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Announcement Banner Ribbon",
                variantCode: "marquee-announcement-ribbon",
                categoryKey: "marquee",
                tag: "Announcement",
                badge: "Alert",
                description: "High-visibility top announcement ticker highlighting platform updates, discounts, or new feature launches.",
                previewTitle: "Lumina Announcement Ribbon",
                previewSubtitle: "Top-level notification bar with instant action link",
                thumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
                html: "<div class='announce-ribbon'><div class='container announce-flex'><div class='announce-badge'>📢 NEW RELEASE</div><p>{{ Description }}</p><a href='{{ ButtonUrl }}' class='btn-ribbon'>{{ ButtonText }} →</a></div></div>",
                css: ".announce-ribbon { background: linear-gradient(90deg, #0369a1, #0284c7); color: #fff; padding: 12px 0; font-size: 14px; font-weight: 500; } .announce-flex { display: flex; align-items: center; justify-content: center; gap: 16px; } .announce-badge { background: #fff; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; } .btn-ribbon { color: #fff; text-decoration: underline; font-weight: 700; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Ozikol 2.0 Cloud Architecture Live", "Upgrade workspace today", "/Marketplace", "mdi-bullhorn")
                }
            ));

            // =========================================================================
            // 6. Category: CONTACTUS (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex Split Inquiry & Channels Suite",
                variantCode: "contact-split-card",
                categoryKey: "contactus",
                tag: "Contact Us",
                badge: "High Conversion",
                description: "2-column split layout featuring interactive lead inquiry form on the left paired with direct telephone, email, and HQ office cards.",
                previewTitle: "Apex Split Contact Suite",
                previewSubtitle: "2-column lead inquiry form with channel cards",
                thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
                html: "<section class='contact-suite'><div class='container'><div class='contact-grid'><div class='form-col'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='channels-col'>{{#each PageSectionLists}}<div class='channel-card'><i class='mdi {{ IconClass }}'></i><div><h4>{{ Title }}</h4><p>{{ SubTitle }}</p><span>{{ Description }}</span></div></div>{{/each}}</div></div></div></section>",
                css: ".contact-suite { padding: 90px 0; background: #0f172a; color: #fff; } .contact-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; } .form-col span { color: #38bdf8; font-weight: 700; text-transform: uppercase; font-size: 13px; } .form-col h2 { font-size: 36px; font-weight: 800; margin: 12px 0; } .form-col p { color: #94a3b8; font-size: 16px; line-height: 1.6; } .channel-card { background: #1e293b; padding: 22px; border-radius: 12px; display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.06); } .channel-card i { font-size: 28px; color: #38bdf8; } .channel-card h4 { margin: 0 0 4px; font-size: 17px; } .channel-card p { margin: 0; color: #f8fafc; font-weight: 600; } .channel-card span { font-size: 13px; color: #94a3b8; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Direct Telephone Hotline", "+1 (800) 555-0199", "Monday to Friday, 8am-6pm EST", "mdi-phone-in-talk-outline"),
                    ("Corporate Sales & Licensing", "enterprise@ozikol.cloud", "Responses guaranteed within 2 hours", "mdi-email-check-outline"),
                    ("Global Technology HQ", "750 Innovation Way, Suite 400", "Silicon Valley, CA 94025, USA", "mdi-map-marker-radius-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Demo Consultation Scheduler",
                variantCode: "contact-lead-booking",
                categoryKey: "contactus",
                tag: "Lead Booking",
                badge: "SaaS",
                description: "Executive consultation request card with date picker slot selection and team size qualification inputs.",
                previewTitle: "Nexus Demo Request Card",
                previewSubtitle: "Interactive consultation booking layout",
                thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80",
                html: "<section class='booking-section'><div class='container text-center'><div class='booking-box'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p><div class='perks-row'>{{#each PageSectionLists}}<div class='perk'><i class='mdi {{ IconClass }}'></i> {{ Title }}</div>{{/each}}</div><a href='{{ ButtonUrl }}' class='btn-book'>{{ ButtonText }}</a></div></div></section>",
                css: ".booking-section { padding: 90px 0; background: #0b0f19; color: #fff; } .booking-box { max-width: 760px; margin: 0 auto; background: #1e293b; padding: 48px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); } .booking-box span { color: #38bdf8; font-weight: 700; font-size: 13px; text-transform: uppercase; } .booking-box h2 { font-size: 36px; font-weight: 800; margin: 12px 0 16px; } .booking-box p { font-size: 17px; color: #94a3b8; margin-bottom: 32px; } .perks-row { display: flex; justify-content: center; gap: 24px; margin-bottom: 36px; } .perk { display: flex; align-items: center; gap: 8px; font-size: 15px; color: #f8fafc; } .btn-book { background: #0284c7; color: #fff; padding: 14px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; }",
                sortOrder: 2,
                items: new[]
                {
                    ("30-Min 1-on-1 Walkthrough", "Expert Demo", "#", "mdi-account-tie-voice-outline"),
                    ("Custom Feature Scoping", "Tailored Modules", "#", "mdi-puzzle-check-outline"),
                    ("Dedicated SLA Quote", "Volume Discounts", "#", "mdi-file-document-check-outline")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Global Multi-Office Hub",
                variantCode: "contact-multi-office",
                categoryKey: "contactus",
                tag: "Global Offices",
                badge: "Worldwide",
                description: "3 international office location cards (North America, Europe, Asia-Pacific) with local telephone and address details.",
                previewTitle: "Lumina Multi-Office Hub",
                previewSubtitle: "3 international location cards with local numbers",
                thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
                html: "<section class='offices-section'><div class='container'><div class='section-header text-center'><span>{{ MiniTitle }}</span><h2>{{ Title }}</h2><p>{{ Description }}</p></div><div class='offices-grid'>{{#each PageSectionLists}}<div class='office-card'><div class='flag'><i class='mdi {{ IconClass }}'></i></div><h3>{{ Title }}</h3><p class='city'>{{ SubTitle }}</p><p class='desc'>{{ Description }}</p></div>{{/each}}</div></div></section>",
                css: ".offices-section { padding: 90px 0; background: #020617; color: #fff; } .offices-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; } .office-card { background: #0f172a; padding: 32px 24px; border-radius: 14px; border: 1px solid #1e293b; text-align: center; } .flag { font-size: 36px; color: #38bdf8; margin-bottom: 16px; } .office-card h3 { font-size: 20px; font-weight: 700; margin: 0 0 6px; } .city { color: #38bdf8; font-weight: 600; font-size: 14px; margin-bottom: 12px; } .office-card .desc { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Americas Headquarters", "San Francisco, USA", "750 Innovation Way, Silicon Valley. Tel: +1 (800) 555-0199", "mdi-earth"),
                    ("European Operations", "London, UK", "10 Finsbury Square, London EC2A 1AF. Tel: +44 (20) 7946 0912", "mdi-earth"),
                    ("Asia-Pacific Hub", "Singapore", "1 Marina Boulevard, #28-00. Tel: +65 6789 0123", "mdi-earth")
                }
            ));

            // =========================================================================
            // 7. Category: FOOTER (3 Templates)
            // =========================================================================
            list.Add(CreateTemplate(
                name: "Apex 4-Column Enterprise Sitemap Footer",
                variantCode: "footer-multi-column",
                categoryKey: "footer",
                tag: "Footer",
                badge: "Comprehensive",
                description: "4-column sitemap footer (Product, Governance, Resources, Legal) with newsletter subscription box and copyright bar.",
                previewTitle: "Apex 4-Column Sitemap Footer",
                previewSubtitle: "Multi-column links with newsletter subscription box",
                thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
                html: "<footer class='apex-footer'><div class='container'><div class='footer-top'><div class='footer-brand'><h3>{{ CompanyName }}</h3><p>{{ Description }}</p></div><div class='footer-links-grid'>{{#each PageSectionLists}}<div class='link-col'><h4>{{ Title }}</h4><p>{{ SubTitle }}</p></div>{{/each}}</div></div><div class='footer-bottom'><p>© 2026 {{ CompanyName }}. All rights reserved.</p></div></div></footer>",
                css: ".apex-footer { background: #020617; color: #94a3b8; padding: 70px 0 30px; border-top: 1px solid #1e293b; font-size: 14px; } .footer-top { display: grid; grid-template-columns: 1.2fr 2.8fr; gap: 48px; margin-bottom: 48px; } .footer-brand h3 { color: #fff; font-size: 22px; font-weight: 800; margin-bottom: 12px; } .footer-links-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; } .link-col h4 { color: #fff; font-size: 15px; font-weight: 700; margin-bottom: 14px; } .footer-bottom { border-top: 1px solid #1e293b; padding-top: 24px; text-align: center; }",
                sortOrder: 1,
                items: new[]
                {
                    ("Products", "Dashboard, Chat, SMS, Wallet", "#", "mdi-cube"),
                    ("Governance", "Roles, 2FA, Audit, Security", "#", "mdi-shield"),
                    ("Resources", "Marketplace, Templates, API", "#", "mdi-book"),
                    ("Legal", "Privacy, Terms, Compliance", "#", "mdi-scale-balance")
                }
            ));

            list.Add(CreateTemplate(
                name: "Nexus Minimalist Footer Bar",
                variantCode: "footer-minimal-clean",
                categoryKey: "footer",
                tag: "Footer",
                badge: "Clean",
                description: "Single-line minimalist dark footer with brand badge, system status indicator, terms/privacy links, and social icons.",
                previewTitle: "Nexus Minimal Footer Bar",
                previewSubtitle: "Single-row compact footer with status badge",
                thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
                html: "<footer class='nexus-mini-footer'><div class='container mini-flex'><div class='brand-status'><strong>{{ CompanyName }}</strong> <span class='status-pill'>● Systems Normal</span></div><div class='mini-links'>{{#each PageSectionLists}}<a href='{{ ButtonLink }}'>{{ Title }}</a>{{/each}}</div><p class='copy'>© 2026 {{ CompanyName }}</p></div></footer>",
                css: ".nexus-mini-footer { background: #0a0f1d; padding: 24px 0; border-top: 1px solid #1e293b; color: #64748b; font-size: 13px; } .mini-flex { display: flex; justify-content: space-between; align-items: center; } .brand-status { color: #f8fafc; display: flex; align-items: center; gap: 12px; } .status-pill { background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; } .mini-links a { color: #94a3b8; margin: 0 12px; text-decoration: none; }",
                sortOrder: 2,
                items: new[]
                {
                    ("Privacy Policy", "Data protection", "/Privacy", "mdi-shield-lock-outline"),
                    ("Terms of Service", "Enterprise terms", "/Terms", "mdi-file-document-outline"),
                    ("Status Page", "Real-time metrics", "#status", "mdi-server-network")
                }
            ));

            list.Add(CreateTemplate(
                name: "Lumina Pre-Footer CTA Banner & Sitemap",
                variantCode: "footer-gradient-cta",
                categoryKey: "footer",
                tag: "Footer",
                badge: "High Impact",
                description: "Deep gradient footer featuring a pre-footer call-to-action banner prompting signups paired with full footer navigation.",
                previewTitle: "Lumina Pre-Footer CTA & Links",
                previewSubtitle: "Glowing CTA banner followed by clean sitemap",
                thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
                html: "<div class='pre-footer-cta'><div class='container text-center'><h2>Ready to Launch Your Isolated Multi-Tenant Workspace?</h2><p>Provision your dedicated database in less than 2 minutes.</p><a href='/Signup' class='btn-cta-launch'>Start Free 14-Day Trial →</a></div></div><footer class='lumina-footer-base'><div class='container text-center'><p>© 2026 {{ CompanyName }}. All rights reserved.</p></div></footer>",
                css: ".pre-footer-cta { background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); color: #fff; padding: 64px 0; } .pre-footer-cta h2 { font-size: 32px; font-weight: 800; margin-bottom: 10px; } .pre-footer-cta p { font-size: 17px; margin-bottom: 24px; opacity: 0.9; } .btn-cta-launch { background: #fff; color: #0284c7; padding: 14px 30px; border-radius: 10px; font-weight: 800; text-decoration: none; display: inline-block; } .lumina-footer-base { background: #020617; color: #64748b; padding: 24px 0; font-size: 13px; }",
                sortOrder: 3,
                items: new[]
                {
                    ("Sign Up", "Create account", "/Signup", "mdi-rocket"),
                    ("Features", "Explore features", "#features", "mdi-grid"),
                    ("Affiliate", "Join network", "/Affiliate", "mdi-cash")
                }
            ));

            return list;
        }

        private static MasterMarketplaceTemplate CreateTemplate(
            string name,
            string variantCode,
            string categoryKey,
            string tag,
            string badge,
            string description,
            string previewTitle,
            string previewSubtitle,
            string thumbnail,
            string html,
            string css,
            int sortOrder,
            (string Title, string SubTitle, string Link, string Icon)[] items)
        {
            var template = new MasterMarketplaceTemplate
            {
                Id = Guid.NewGuid(),
                Name = name,
                VariantCode = variantCode,
                CategoryKey = categoryKey,
                Tag = tag,
                Badge = badge,
                Description = description,
                PreviewTitle = previewTitle,
                PreviewSubtitle = previewSubtitle,
                PreviewImageUrl = thumbnail,
                HtmlTemplate = html,
                CssStyles = css,
                JsScript = "",
                SortOrder = sortOrder,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            var section = new MasterTemplateSection
            {
                Id = Guid.NewGuid(),
                MasterMarketplaceTemplateId = template.Id,
                CategoryKey = categoryKey,
                SectionSubType = categoryKey,
                SectionKey = $"{variantCode}-main",
                Title = previewTitle,
                SubTitle = previewSubtitle,
                MiniTitle = tag.ToUpperInvariant(),
                PrimaryImageUrl = thumbnail,
                ButtonText = "Get Started",
                ButtonUrl = "/Signup",
                SecondaryButtonText = "Explore",
                SecondaryButtonUrl = "#",
                SortOrder = 1,
                IsActive = true
            };

            int itemOrder = 1;
            foreach (var (title, subtitle, link, icon) in items)
            {
                section.SectionLists.Add(new MasterTemplateSectionList
                {
                    Id = Guid.NewGuid(),
                    MasterTemplateSectionId = section.Id,
                    ItemType = "SectionItem",
                    Title = title,
                    SubTitle = subtitle,
                    Description = subtitle,
                    ButtonLink = link,
                    IconClass = icon,
                    SortOrder = itemOrder++,
                    BadgeText = badge
                });
            }

            template.Sections.Add(section);
            return template;
        }

        private static MasterMarketplaceTemplate CreateTemplate(
            string name,
            string variantCode,
            string categoryKey,
            string tag,
            string badge,
            string description,
            string previewTitle,
            string previewSubtitle,
            string thumbnail,
            string html,
            string css,
            int sortOrder,
            (string Title, string SubTitle, string Link, string Icon, string ImageUrl)[] items)
        {
            var template = new MasterMarketplaceTemplate
            {
                Id = Guid.NewGuid(),
                Name = name,
                VariantCode = variantCode,
                CategoryKey = categoryKey,
                Tag = tag,
                Badge = badge,
                Description = description,
                PreviewTitle = previewTitle,
                PreviewSubtitle = previewSubtitle,
                PreviewImageUrl = thumbnail,
                HtmlTemplate = html,
                CssStyles = css,
                JsScript = "",
                SortOrder = sortOrder,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            var section = new MasterTemplateSection
            {
                Id = Guid.NewGuid(),
                MasterMarketplaceTemplateId = template.Id,
                CategoryKey = categoryKey,
                SectionSubType = categoryKey,
                SectionKey = $"{variantCode}-main",
                Title = previewTitle,
                SubTitle = previewSubtitle,
                MiniTitle = tag.ToUpperInvariant(),
                PrimaryImageUrl = thumbnail,
                ButtonText = "Read More",
                ButtonUrl = "#",
                SortOrder = 1,
                IsActive = true
            };

            int itemOrder = 1;
            foreach (var (title, subtitle, link, icon, imageUrl) in items)
            {
                section.SectionLists.Add(new MasterTemplateSectionList
                {
                    Id = Guid.NewGuid(),
                    MasterTemplateSectionId = section.Id,
                    ItemType = "ArticleCard",
                    Title = title,
                    SubTitle = subtitle,
                    Description = subtitle,
                    ButtonLink = link,
                    IconClass = icon,
                    ImageUrl = imageUrl,
                    SortOrder = itemOrder++,
                    BadgeText = badge
                });
            }

            template.Sections.Add(section);
            return template;
        }

        private static async Task SeedFeatureCatalogAsync(MasterCatalogDbContext dbContext, CancellationToken ct)
        {
            var features = new[]
            {
                new MasterFeatureCatalog { FeatureCode = "core-dashboard", Name = "Core Multi-Tenant Workspace", Category = "Core", Description = "Unified dashboard layout, tenant branding, and responsive navigation.", MonthlyPrice = 0.00m, IsCompulsory = true, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 1 },
                new MasterFeatureCatalog { FeatureCode = "user-roles", Name = "RBAC Role Governance", Category = "Security", Description = "Granular role hierarchy, permissions, and operator access controls.", MonthlyPrice = 0.00m, IsCompulsory = true, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 2 },
                new MasterFeatureCatalog { FeatureCode = "custom-domain", Name = "Custom Domain & Automated SSL", Category = "Branding", Description = "Map custom domains (e.g. portal.acme.com) with automated certificate routing.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 3 },
                new MasterFeatureCatalog { FeatureCode = "group-chat", Name = "SignalR Real-Time Group Chat", Category = "Communication", Description = "Live corporate chat channels, direct messaging, and mention notifications.", MonthlyPrice = 20.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 4 },
                new MasterFeatureCatalog { FeatureCode = "sms-broadcast", Name = "Bulk SMS & Sender IDs", Category = "Communication", Description = "Multi-channel SMS campaigns, contact lists, and delivery tracking.", MonthlyPrice = 0.00m, IsCompulsory = false, BillingType = FeatureBillingType.PayAsYouGo, IsMetered = true, MeterUnitName = "SMS Unit", MeterUnitPrice = 0.0250m, MeterBlockSize = 1, IncludedFreeUnits = 100, IsActive = true, SortOrder = 5 },
                new MasterFeatureCatalog { FeatureCode = "newsletter-engine", Name = "HTML Newsletter Studio", Category = "Marketing", Description = "WYSIWYG email campaign designer, mailing lists, and open rate analytics.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.Hybrid, IsMetered = true, MeterUnitName = "1k Emails", MeterUnitPrice = 1.5000m, MeterBlockSize = 1000, IncludedFreeUnits = 2500, IsActive = true, SortOrder = 6 },
                new MasterFeatureCatalog { FeatureCode = "payment-gateway", Name = "Paystack & Stripe Checkout", Category = "Finance", Description = "Multi-currency credit card payments, digital receipts, and billing logs.", MonthlyPrice = 25.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 7 },
                new MasterFeatureCatalog { FeatureCode = "member-wallet", Name = "Digital Member Wallet", Category = "Finance", Description = "Prepaid wallet balances, internal transfers, and member credit accounts.", MonthlyPrice = 20.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 8 },
                new MasterFeatureCatalog { FeatureCode = "elections-voting", Name = "Cryptographic Election Engine", Category = "Governance", Description = "Online ballot voting, candidate management, and real-time tally audit.", MonthlyPrice = 30.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 9 },
                new MasterFeatureCatalog { FeatureCode = "event-ticketing", Name = "Event Ticketing & QR Passes", Category = "Operations", Description = "Event scheduling, ticket sales, registration, and QR check-in scanner.", MonthlyPrice = 20.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 10 },
                new MasterFeatureCatalog { FeatureCode = "content-cms", Name = "Dynamic Web Page CMS", Category = "Content", Description = "Visual drag-and-drop page section builder, hero sliders, and FAQ modules.", MonthlyPrice = 10.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 11 },
                new MasterFeatureCatalog { FeatureCode = "marketplace-templates", Name = "Cloud Template Marketplace", Category = "Content", Description = "1-click template installation from the central Master Blueprint catalog.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 12 },
                new MasterFeatureCatalog { FeatureCode = "ai-smart-assist", Name = "Metered AI Copilot Assistant", Category = "AI", Description = "AI-powered writing assistant, automated member inquiry replies, and summaries.", MonthlyPrice = 0.00m, IsCompulsory = false, BillingType = FeatureBillingType.PayAsYouGo, IsMetered = true, MeterUnitName = "1k Tokens", MeterUnitPrice = 0.0200m, MeterBlockSize = 1000, IncludedFreeUnits = 5000, IsActive = true, SortOrder = 13 },
                new MasterFeatureCatalog { FeatureCode = "document-vault", Name = "Secure Cloud Media Vault", Category = "Storage", Description = "AWS S3 / Cloudinary secure document storage and file attachment management.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.Hybrid, IsMetered = true, MeterUnitName = "GB Storage", MeterUnitPrice = 0.2000m, MeterBlockSize = 1, IncludedFreeUnits = 5, IsActive = true, SortOrder = 14 },
                new MasterFeatureCatalog { FeatureCode = "leave-management", Name = "Staff Leave & Approval Workflow", Category = "HR", Description = "Leave request tracking, manager sign-offs, and company calendar sync.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 15 },
                new MasterFeatureCatalog { FeatureCode = "phone-book", Name = "Unified Corporate Phonebook", Category = "HR", Description = "Directory of staff, departments, phone extensions, and emergency contacts.", MonthlyPrice = 5.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 16 },
                new MasterFeatureCatalog { FeatureCode = "analytics-kpi", Name = "Executive KPI & Finance Ledger", Category = "Analytics", Description = "Real-time revenue metrics, active user engagement, and exportable ledger.", MonthlyPrice = 25.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 17 },
                new MasterFeatureCatalog { FeatureCode = "audit-logging", Name = "Immutable Security Audit Trails", Category = "Security", Description = "Device sessions, IP geo-tracking, and administrative action history.", MonthlyPrice = 15.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 18 },
                new MasterFeatureCatalog { FeatureCode = "two-factor-auth", Name = "Compulsory 2FA (TOTP + Email)", Category = "Security", Description = "RFC 6238 Authenticator app and 6-digit email OTP enforcement.", MonthlyPrice = 10.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 19 },
                new MasterFeatureCatalog { FeatureCode = "affiliate-network", Name = "Affiliate Referral Network", Category = "Marketing", Description = "Custom partner referral tracking, commission tier calculation, and payouts.", MonthlyPrice = 25.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 20 },
                new MasterFeatureCatalog { FeatureCode = "automated-provisioning", Name = "Isolated Database Provisioning", Category = "Infrastructure", Description = "Dedicated SQL Server instances per tenant with isolated SQL logins.", MonthlyPrice = 40.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 21 },
                new MasterFeatureCatalog { FeatureCode = "backup-recovery", Name = "Automated Backup & Disaster Recovery", Category = "Infrastructure", Description = "Nightly database backups and point-in-time recovery snapshot capabilities.", MonthlyPrice = 20.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 22 },
                new MasterFeatureCatalog { FeatureCode = "bot-protection", Name = "Google reCAPTCHA & Bot Shield", Category = "Security", Description = "Adaptive spam prevention, rate limiting, and brute-force protection.", MonthlyPrice = 10.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 23 },
                new MasterFeatureCatalog { FeatureCode = "email-transactional", Name = "Postmark Transactional Gateway", Category = "Communication", Description = "High-deliverability email routing with DKIM/SPF verification.", MonthlyPrice = 10.00m, IsCompulsory = false, BillingType = FeatureBillingType.FlatSubscription, IsActive = true, SortOrder = 24 },
                new MasterFeatureCatalog { FeatureCode = "white-labeling", Name = "Enterprise White-Labeling", Category = "Branding", Description = "Complete removal of Ozikol branding, custom favicon, and CSS overrides.", MonthlyPrice = 0.00m, IsCompulsory = false, BillingType = FeatureBillingType.CustomEnterprise, IsActive = true, SortOrder = 25 }
            };

            foreach (var f in features)
            {
                var existing = await dbContext.MasterFeatureCatalogs
                    .FirstOrDefaultAsync(x => x.FeatureCode == f.FeatureCode, ct);

                if (existing == null)
                {
                    dbContext.MasterFeatureCatalogs.Add(f);
                }
                else
                {
                    existing.Name = f.Name;
                    existing.Category = f.Category;
                    existing.Description = f.Description;
                    existing.MonthlyPrice = f.MonthlyPrice;
                    existing.IsCompulsory = f.IsCompulsory;
                    existing.BillingType = f.BillingType;
                    existing.IsMetered = f.IsMetered;
                    existing.MeterUnitName = f.MeterUnitName;
                    existing.MeterUnitPrice = f.MeterUnitPrice;
                    existing.MeterBlockSize = f.MeterBlockSize;
                    existing.IncludedFreeUnits = f.IncludedFreeUnits;
                    existing.SortOrder = f.SortOrder;
                    existing.IsActive = true;
                }
            }

            await dbContext.SaveChangesAsync(ct);
        }

        private static async Task SeedMediaAssetsAsync(MasterCatalogDbContext dbContext, CancellationToken ct)
        {
            if (await dbContext.MasterMediaAssets.AnyAsync(ct)) return;

            var assets = new[]
            {
                new MasterMediaAsset { Title = "Modern Tech Executive Workspace", CategoryKey = "hero", ImageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80", ThumbnailUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80", AspectRatio = "16:9", Tags = "office, enterprise, modern", WidthPx = 1920, HeightPx = 1080, IsActive = true },
                new MasterMediaAsset { Title = "Collaborative Strategy Meeting", CategoryKey = "hero", ImageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80", ThumbnailUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80", AspectRatio = "16:9", Tags = "team, collaboration, planning", WidthPx = 1920, HeightPx = 1080, IsActive = true },
                new MasterMediaAsset { Title = "Executive Leader Portrait", CategoryKey = "bodysections", ImageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", ThumbnailUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", AspectRatio = "1:1", Tags = "portrait, leader, executive", WidthPx = 800, HeightPx = 800, IsActive = true },
                new MasterMediaAsset { Title = "Digital Commerce Store Showcase", CategoryKey = "bodysections", ImageUrl = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80", ThumbnailUrl = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80", AspectRatio = "16:9", Tags = "store, digital, products", WidthPx = 1920, HeightPx = 1080, IsActive = true }
            };

            dbContext.MasterMediaAssets.AddRange(assets);
            await dbContext.SaveChangesAsync(ct);
        }
    }
}
