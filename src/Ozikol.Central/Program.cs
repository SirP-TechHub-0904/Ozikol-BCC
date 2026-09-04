using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Ozikol.Central;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Localization.Routing;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
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

builder.Services.AddRazorPages(options =>
{
    // Enable optional /{culture} route prefix constrained strictly to supported language codes
    options.Conventions.AddFolderRouteModelConvention("/", model =>
    {
        var selectors = model.Selectors.ToList();
        foreach (var selector in selectors)
        {
            var existingTemplate = selector.AttributeRouteModel?.Template ?? "";

            model.Selectors.Add(new SelectorModel
            {
                AttributeRouteModel = new AttributeRouteModel
                {
                    Order = -1,
                    Template = AttributeRouteModel.CombineTemplates("{culture:regex(^(en|fr|es|de)$)?}", existingTemplate)
                }
            });
        }
    });
})
.AddViewLocalization(LanguageViewLocationExpanderFormat.Suffix)
.AddDataAnnotationsLocalization(options =>
{
    options.DataAnnotationLocalizerProvider = (type, factory) =>
        factory.Create(typeof(SharedResource));
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

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Auth/Login";
    options.AccessDeniedPath = "/Auth/Login";
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
});

builder.Services.AddMemoryCache();

// 7. Register Central Services
builder.Services.AddScoped<ICentralMigrationService, CentralMigrationService>();
builder.Services.AddScoped<ITenantOnboardingService, TenantOnboardingService>();
builder.Services.AddScoped<ICentralEmailService, CentralEmailService>();
builder.Services.AddScoped<ICentralTwoFactorService, CentralTwoFactorService>();
builder.Services.AddScoped<ITemplateHydrationService, TemplateHydrationService>();

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

    // Skip static assets, bundles, and APIs
    if (path.StartsWith("/css", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/js", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/images", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/fonts", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/lib", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/favicon", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
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

    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();

app.Run();
