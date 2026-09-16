using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Ozikol.Central;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Localization.Routing;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Legal;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;

// 1. Load project-local .env environment variables
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (!File.Exists(envPath))
{
    envPath = Path.Combine(AppContext.BaseDirectory, ".env");
}
if (File.Exists(envPath))
{
    DotNetEnv.Env.Load(envPath);
}

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// 2. Configure Native ASP.NET Core Multi-Language Localization Engine
builder.Services.AddLocalization();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IRecaptchaService, GoogleRecaptchaService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<Ozikol.Central.Services.Storage.IFileStorageService, Ozikol.Central.Services.Storage.CloudinaryFileStorageService>();
builder.Services.AddScoped<Ozikol.Central.Services.Careers.ICareersService, Ozikol.Central.Services.Careers.CareersService>();
builder.Services.AddScoped<Ozikol.Central.Services.Support.ISupportService, Ozikol.Central.Services.Support.SupportService>();

builder.Services.AddRazorPages(options =>
{
    // Register clean top-level and hyphenated route aliases for Auth pages
    options.Conventions.AddPageRoute("/Auth/GetStarted", "get-started");
    options.Conventions.AddPageRoute("/Auth/GetStarted", "auth/get-started");
    options.Conventions.AddPageRoute("/Auth/WorkspaceSetupDetails", "workspace-setup-details");
    options.Conventions.AddPageRoute("/Auth/WorkspaceSetupDetails", "auth/workspace-setup-details");

    // Clean hyphenated route aliases for Centralwks operator authentication
    options.Conventions.AddAreaPageRoute("Centralwks", "/Login", "centralwks/login");
    options.Conventions.AddAreaPageRoute("Centralwks", "/Logout", "centralwks/logout");
    options.Conventions.AddAreaPageRoute("Centralwks", "/ForgotPassword", "centralwks/forgot-password");
    options.Conventions.AddAreaPageRoute("Centralwks", "/ResetPassword", "centralwks/reset-password");
    options.Conventions.AddAreaPageRoute("Centralwks", "/Login2fa", "centralwks/login-2fa");

    // Enable optional /{culture} route prefix constrained strictly to supported language codes
    options.Conventions.AddFolderRouteModelConvention("/", model =>
    {
        var selectors = model.Selectors.ToList();
        // Track unique route templates case-insensitively to prevent duplicate selectors / AmbiguousMatchException
        var seenTemplates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var selector in selectors)
        {
            var existingTemplate = selector.AttributeRouteModel?.Template ?? "";
            var prefixedTemplate = AttributeRouteModel.CombineTemplates("{culture:regex(^(en|fr|es|de)$)}", existingTemplate);

            if (seenTemplates.Add(prefixedTemplate))
            {
                // Strictly require culture segment on the prefixed selector so it never collides with the un-prefixed original
                model.Selectors.Add(new SelectorModel
                {
                    AttributeRouteModel = new AttributeRouteModel
                    {
                        Order = -1,
                        Template = prefixedTemplate
                    }
                });
            }
        }
    });

    // 2b. Enforce Role-Based Access Control on Administrative Console Areas
    options.Conventions.AuthorizeAreaFolder("Centralwks", "/", "CentralAdminPolicy");
    options.Conventions.AllowAnonymousToAreaPage("Centralwks", "/Login");
    options.Conventions.AllowAnonymousToAreaPage("Centralwks", "/Logout");
    options.Conventions.AllowAnonymousToAreaPage("Centralwks", "/ForgotPassword");
    options.Conventions.AllowAnonymousToAreaPage("Centralwks", "/ResetPassword");
    options.Conventions.AllowAnonymousToAreaPage("Centralwks", "/Login2fa");

    options.Conventions.AuthorizeAreaFolder("Affiliate", "/", "AffiliatePartnerPolicy");
    options.Conventions.AllowAnonymousToAreaPage("Affiliate", "/Login");
    options.Conventions.AllowAnonymousToAreaPage("Affiliate", "/Logout");

    options.Conventions.AuthorizeAreaFolder("Creator", "/", "TemplateCreatorPolicy");
    options.Conventions.AllowAnonymousToAreaPage("Creator", "/Login");
    options.Conventions.AllowAnonymousToAreaPage("Creator", "/Logout");
})
.AddViewLocalization(LanguageViewLocationExpanderFormat.Suffix)
.AddDataAnnotationsLocalization(options =>
{
    options.DataAnnotationLocalizerProvider = (type, factory) =>
        factory.Create(typeof(SharedResource));
});

// 2c. Register Central Platform Authorization Policies
builder.Services.AddAuthorization(options =>
{
    // Central administrative operators (SuperAdmin, Admin, Operator, Billing, Support, Templates, Referrals)
    options.AddPolicy("CentralAdminPolicy", policy =>
        policy.RequireRole("SuperAdmin", "Admin", "Operator", "BillingAdmin", "SupportAgent", "TemplateManager", "ReferralManager"));

    // Sovereign Affiliate Partner Network
    options.AddPolicy("AffiliatePartnerPolicy", policy =>
        policy.RequireRole("AffiliatePartner", "SuperAdmin"));

    // Sovereign Template Creator Studio
    options.AddPolicy("TemplateCreatorPolicy", policy =>
        policy.RequireRole("TemplateCreator", "SuperAdmin"));
});

// 3. Multi-Tenant Infrastructure Support
builder.Services.AddTenantSupport(builder.Configuration);

// 4. Resolve Master Database Connection strictly from .env / Configuration / Environment Variables
var masterConnectionString = builder.Configuration["TenantConfiguration:ConnectionString"]
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "CRITICAL CONFIGURATION ERROR: Master database connection string is not configured. " +
        "Please specify 'TenantConfiguration:ConnectionString' or 'ConnectionStrings:DefaultConnection' in your .env file, appsettings.json, or environment variables.");

// 5. Register MasterCatalogDbContext
builder.Services.AddDbContext<MasterCatalogDbContext>(options =>
    options.UseSqlServer(masterConnectionString)
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// 6. Central Platform Identity Configuration
builder.Services.AddIdentity<CentralUser, CentralRole>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddEntityFrameworkStores<MasterCatalogDbContext>()
.AddDefaultTokenProviders();

// 6b. Configure Multi-Portal Dynamic Application Cookie Authentication
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Centralwks/Login";
    options.AccessDeniedPath = "/Centralwks/Login";
    options.ExpireTimeSpan = TimeSpan.FromDays(7);

    // Dynamically route unauthenticated challenges to the appropriate portal login
    options.Events.OnRedirectToLogin = context =>
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/Centralwks", StringComparison.OrdinalIgnoreCase))
        {
            var returnUrl = Uri.EscapeDataString(context.Request.Path + context.Request.QueryString);
            context.Response.Redirect($"/Centralwks/Login?ReturnUrl={returnUrl}");
        }
        else if (path.StartsWith("/Affiliate", StringComparison.OrdinalIgnoreCase))
        {
            var returnUrl = Uri.EscapeDataString(context.Request.Path + context.Request.QueryString);
            context.Response.Redirect($"/Affiliate/Login?ReturnUrl={returnUrl}");
        }
        else if (path.StartsWith("/Creator", StringComparison.OrdinalIgnoreCase))
        {
            var returnUrl = Uri.EscapeDataString(context.Request.Path + context.Request.QueryString);
            context.Response.Redirect($"/Creator/Login?ReturnUrl={returnUrl}");
        }
        else
        {
            context.Response.Redirect(context.RedirectUri);
        }
        return Task.CompletedTask;
    };

    // Dynamically route access-denied challenges to the appropriate portal
    options.Events.OnRedirectToAccessDenied = context =>
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/Centralwks", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Redirect("/Centralwks/Login?accessDenied=true");
        }
        else if (path.StartsWith("/Affiliate", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Redirect("/Affiliate/Login?accessDenied=true");
        }
        else if (path.StartsWith("/Creator", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Redirect("/Creator/Login?accessDenied=true");
        }
        else
        {
            context.Response.Redirect(context.RedirectUri);
        }
        return Task.CompletedTask;
    };
});

builder.Services.AddMemoryCache();
builder.Services.Configure<PricingSettings>(builder.Configuration.GetSection("PricingSettings"));

// 7. Register Central Services
builder.Services.AddScoped<ICentralMigrationService, CentralMigrationService>();
builder.Services.AddScoped<ITenantOnboardingService, TenantOnboardingService>();
builder.Services.AddScoped<ICentralEmailService, CentralEmailService>();
builder.Services.AddScoped<ICentralTwoFactorService, CentralTwoFactorService>();
builder.Services.AddScoped<ITemplateHydrationService, TemplateHydrationService>();
builder.Services.AddScoped<ILegalService, LegalService>();
builder.Services.AddSingleton<IGeoLocationService, GeoLocationService>();
builder.Services.AddSingleton<ICurrencyService, CurrencyService>();

var app = builder.Build();

// 8. Seed Central Operator Roles & Default SuperAdmin
try
{
    await CentralIdentityDataSeeder.SeedCentralRolesAndSuperAdminAsync(app.Services);
}
catch (Exception ex)
{
    Console.WriteLine($"[Central Startup Notice]: Seeder deferred (DB may be initializing): {ex.Message}");
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

// 9. Configure Request Localization Pipeline (Route -> Cookie -> Accept-Language -> Default en)
var supportedCultures = new[]
{
    new CultureInfo("en"),
    new CultureInfo("fr"),
    new CultureInfo("es"),
    new CultureInfo("de")
};

var localizationOptions = new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture("en"),
    SupportedCultures = supportedCultures,
    SupportedUICultures = supportedCultures
};

// RouteData provider takes precedence so /fr/, /es/, /de/ directly control the culture
localizationOptions.RequestCultureProviders.Insert(0, new RouteDataRequestCultureProvider
{
    RouteDataStringKey = "culture",
    UIRouteDataStringKey = "culture"
});

app.UseRequestLocalization(localizationOptions);

// 10. Enforce culture segment in portal URLs and sync culture cookie
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";

    // Skip static assets, bundles, APIs, and administrative console areas
    if (path.StartsWith("/css", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/js", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/images", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/fonts", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/lib", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/favicon", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/centralwks", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/affiliate", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/creator", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    // Check if the path starts with a supported culture prefix (/en, /fr, /es, /de)
    var isCulturePrefixed = path.StartsWith("/en", StringComparison.OrdinalIgnoreCase) ||
                            path.StartsWith("/fr", StringComparison.OrdinalIgnoreCase) ||
                            path.StartsWith("/es", StringComparison.OrdinalIgnoreCase) ||
                            path.StartsWith("/de", StringComparison.OrdinalIgnoreCase);

    if (isCulturePrefixed)
    {
        // Keep culture cookie synchronized with the active URL prefix
        var cultureSegment = path.Substring(1, 2).ToLowerInvariant();
        context.Response.Cookies.Append(
            CookieRequestCultureProvider.DefaultCookieName,
            CookieRequestCultureProvider.MakeCookieValue(new RequestCulture(cultureSegment)),
            new CookieOptions { Expires = DateTimeOffset.UtcNow.AddYears(1), IsEssential = true, SameSite = SameSiteMode.Lax });
    }
    else
    {
        // Redirect to /{detectedCulture}{path}
        var cultureFeature = context.Features.Get<IRequestCultureFeature>();
        var culture = cultureFeature?.RequestCulture.Culture.TwoLetterISOLanguageName ?? "en";
        if (string.IsNullOrWhiteSpace(culture) || (culture != "en" && culture != "fr" && culture != "es" && culture != "de"))
        {
            culture = "en";
        }

        var target = path == "/" || string.IsNullOrEmpty(path) ? $"/{culture}" : $"/{culture}{path}";
        if (context.Request.QueryString.HasValue)
        {
            target += context.Request.QueryString.Value;
        }

        context.Response.Redirect(target, permanent: false);
        return;
    }

    // 11. Canonical 301 Redirects for Legacy / Superseded Routes
    var subPath = isCulturePrefixed && path.Length > 3 ? path.Substring(3) : path;
    subPath = subPath.TrimEnd('/');
    if (subPath.Equals("/platform/ios-app", StringComparison.OrdinalIgnoreCase) ||
        subPath.Equals("/platform/android-app", StringComparison.OrdinalIgnoreCase))
    {
        var culturePrefix = isCulturePrefixed ? path.Substring(0, 3) : "";
        context.Response.Redirect($"{culturePrefix}/platform/mobile-app", permanent: true);
        return;
    }
    if (subPath.Equals("/legal-hub", StringComparison.OrdinalIgnoreCase))
    {
        var culturePrefix = isCulturePrefixed ? path.Substring(0, 3) : "";
        context.Response.Redirect($"{culturePrefix}/policies-and-reports", permanent: true);
        return;
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();

app.Run();
