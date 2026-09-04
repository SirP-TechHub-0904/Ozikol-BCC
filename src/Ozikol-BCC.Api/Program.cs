using System.Text;
using System.Security.Claims;
using Scalar.AspNetCore;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Api.Hubs;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;

namespace Ozikol_BCC.Api
{
    public class Program
    {
        // Entry point for Ozikol-BCC multi-tenant API host
        public static async Task Main(string[] args)
        {
            DotNetEnv.Env.TraversePath().Load();
            var builder = WebApplication.CreateBuilder(args);

            // 1. Core Services & Infrastructure
            builder.Services.AddAWSService<IAmazonS3>();
            builder.Services.Configure<Ozikol_BCC.Application.Configuration.CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
            builder.Services.AddScoped<Ozikol_BCC.Application.Services.Cloudinary.ICloudinaryService, Ozikol_BCC.CloudinaryServices.Services.CloudinaryService>();

            builder.Services
                .AddApplicationExtensions(builder.Configuration)
                .AddTenantSupport(builder.Configuration)
                .AddEntityFrameworkSqlServer<DashboardDbContext>();

            var masterConnectionString = builder.Configuration["TenantConfiguration:ConnectionString"] 
                ?? builder.Configuration.GetConnectionString("DefaultConnection") 
                ?? throw new InvalidOperationException(
                    "CRITICAL CONFIGURATION ERROR: Master database connection string is not configured. " +
                    "Please specify 'TenantConfiguration:ConnectionString' or 'ConnectionStrings:DefaultConnection' in your .env file, appsettings.json, or environment variables.");

            builder.Services.AddDbContext<MasterCatalogDbContext>(options =>
                options.UseSqlServer(masterConnectionString));
            builder.Services.AddScoped<ITenantProvisioningService, TenantProvisioningService>();
            builder.Services.AddMemoryCache();

            builder.Services.AddHttpClient();
            builder.Services.AddScoped<Ozikol_BCC.Application.Interfaces.Services.IAiSmartAssistService, Ozikol_BCC.AiServices.Services.AiSmartAssistService>();
            builder.Services.AddScoped<Ozikol_BCC.Application.Interfaces.Services.IPaymentGatewayService, Ozikol_BCC.PaymentServices.Services.PaystackPaymentGatewayService>();
            builder.Services.AddScoped<Ozikol_BCC.Application.Services.IMemberIdGeneratorService, Ozikol_BCC.Application.Services.MemberIdGeneratorService>();

            builder.Services.AddDistributedMemoryCache();

            // 2. Identity Configuration
            builder.Services.AddIdentity<Profile, AppRole>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 6;
                options.Password.RequireDigit = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.MaxFailedAccessAttempts = 10;
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddEntityFrameworkStores<DashboardDbContext>()
            .AddDefaultTokenProviders();

            // 3. JWT Bearer Authentication
            var jwtKey = builder.Configuration["Jwt:Key"] ?? "OzikolBCC_SuperSecretJwtEncryptionKey_2026_MustBe32BytesOrMore!";
            var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "Ozikol-BCC.Api";
            var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "Ozikol-BCC.Client";

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    RoleClaimType = ClaimTypes.Role,
                    NameClaimType = ClaimTypes.Name,
                    ClockSkew = TimeSpan.Zero
                };

                // Events for JWT handling and debugging
                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"[JWT Auth Failed] Reason: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // 4. CORS Policy for Angular Spa Client
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAngularApp", policy =>
                {
                    policy.SetIsOriginAllowed(origin => new Uri(origin).Host.EndsWith("localhost") || origin.Contains("localhost"))
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // 5. SignalR & Form Options
            builder.Services.AddSignalR(options =>
            {
                options.MaximumReceiveMessageSize = 100 * 1024 * 1024; // 100MB
            });

            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 100 * 1024 * 1024;
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // Prevent 500 errors caused by circular EF navigation properties
                    // e.g. WebPage → PageCategory → WebPages[] → PageCategory → ...
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddOpenApi();

            // 6. Swagger / OpenAPI Configuration
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo 
                { 
                    Title = "Ozikol BCP REST API", 
                    Version = "v1",
                    Description = "Comprehensive REST API platform for Ozikol-BCC workspace governance, member directory, group chat, and AI services."
                });

                var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                if (File.Exists(xmlPath))
                {
                    c.IncludeXmlComments(xmlPath);
                }

                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "Enter your JWT Bearer token",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            app.UseCors("AllowAngularApp");

            // Only redirect to HTTPS in Production.
            // In Development, Angular calls http://localhost:51026 directly.
            // UseHttpsRedirection in Dev causes a 302 redirect on CORS preflights,
            // which violates the CORS spec and results in ERR_FAILED (status 0).
            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            // 7. Swagger & OpenApi Documentation Pipeline
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Ozikol BCP API v1");
                c.RoutePrefix = "swagger";
            });

            app.UseAuthentication();
            app.UseTenantScopeMiddleware();
            app.UseAuthorization();

            app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

            app.MapControllers();
            app.MapOpenApi();
            app.MapScalarApiReference(options =>
            {
                options.Title = "Ozikol BCP Interactive API Console";
                options.Theme = ScalarTheme.Purple;
                options.DefaultHttpClient = new(ScalarTarget.JavaScript, ScalarClient.HttpClient);
                options.WithModels(false);
            });
            app.MapHub<GroupChatHub>("/hubs/group-chat");

            await app.RunAsync();
        }
    }
}
