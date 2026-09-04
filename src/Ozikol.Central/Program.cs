using Microsoft.AspNetCore.Identity;
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

// 2. Add Razor Pages & HTTP Client
builder.Services.AddHttpClient();
builder.Services.AddRazorPages();

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

app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();

Console.WriteLine("================================================================");
Console.WriteLine("🚀 OZIKOL.CENTRAL ENTERPRISE PLATFORM & OPERATIONS HUB LOADED");
Console.WriteLine("   ├── Master Database: " + (masterConnectionString.Contains("Database=") ? masterConnectionString.Split(';').FirstOrDefault(s => s.StartsWith("Database=") || s.StartsWith("Initial Catalog=")) : "Master DB Configured"));
Console.WriteLine("   ├── Marketing Portal:  http://localhost:51030");
Console.WriteLine("   ├── Public Signup:     http://localhost:51030/signup");
Console.WriteLine("   ├── Affiliate Network: http://localhost:51030/affiliate");
Console.WriteLine("   ├── Marketplace:       http://localhost:51030/marketplace");
Console.WriteLine("   └── Operator Console:  http://localhost:51030/Account/Login");
Console.WriteLine("================================================================");

app.Run();
