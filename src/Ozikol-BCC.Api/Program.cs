using System.Text;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Application;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Api.Hubs;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Telemetry.Sentry.Extensions;
using Ozikol_BCC.Api.Middleware;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Ozikol.MasterDomain.Security;
using Ozikol_BCC.Infrastructure.Caching;
using StackExchange.Redis;
using Ozikol_BCC.EmailServices.Postmark;

namespace Ozikol_BCC.Api // CI trigger comment – no functional change
// trigger CI dummy comment
{
    /// <summary>
    /// Entry point and host configuration for the Ozikol Business Command Center multi-tenant API.
    /// </summary>
    public class Program
    {
        /// <summary>
        /// Configures and runs the Ozikol Business Command Center multi-tenant API host.
        /// </summary>
        /// <param name="args">Command-line arguments passed at startup.</param>
        public static async Task Main(string[] args)
        {
            DotNetEnv.Env.TraversePath().Load();
            var builder = WebApplication.CreateBuilder(args);
            builder.Configuration.AddEnvironmentVariables();
            OzikolDataCipher.Initialize(builder.Configuration);
            builder.WebHost.UseOzikolSentry("Ozikol-BCC.Api");

            // 1. Core Services & Infrastructure
            builder.Services.AddAWSService<IAmazonS3>();
            builder.Services.Configure<Ozikol_BCC.Application.Configuration.CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
            builder.Services.AddScoped<Ozikol_BCC.Application.Services.Cloudinary.ICloudinaryService, Ozikol_BCC.CloudinaryServices.Services.CloudinaryService>();

            builder.Services
                .AddApplicationExtensions(builder.Configuration)
                .AddTenantSupport(builder.Configuration)
                .AddRecaptchaSupport()
                .AddMailcowSupport()
                .AddCustomDomainSupport()
                .AddEntityFrameworkSqlServer<DashboardDbContext>();

            builder.Services.AddSingleton<Ozikol_BCC.Infrastructure.Services.Recaptcha.IRecaptchaCredentialProvider, Ozikol_BCC.Api.Services.MasterPlatformRecaptchaCredentialProvider>();
            builder.Services.AddSingleton<Ozikol_BCC.Infrastructure.Services.Email.IMailInfrastructureCredentialProvider, Ozikol_BCC.Api.Services.MasterPlatformEmailInfrastructureCredentialProvider>();

            builder.Services.AddPostmarkEmailServices(builder.Configuration);
            builder.Services.AddSingleton<Microsoft.Extensions.Options.IPostConfigureOptions<Ozikol_BCC.EmailServices.Postmark.Configuration.PostmarkOptions>, Ozikol_BCC.Api.Services.MasterPlatformPostmarkPostConfigure>();
            builder.Services.AddSingleton<Microsoft.Extensions.Options.IPostConfigureOptions<Ozikol_BCC.Application.Configuration.CloudinarySettings>, Ozikol_BCC.Api.Services.MasterPlatformCloudinaryPostConfigure>();
            builder.Services.AddSingleton<Microsoft.Extensions.Options.IPostConfigureOptions<Ozikol_BCC.Application.Configuration.CloudflareR2Settings>, Ozikol_BCC.Api.Services.MasterPlatformCloudflareR2PostConfigure>();

            var masterConnectionString = builder.Configuration["TenantConfiguration:ConnectionString"] 
                ?? builder.Configuration.GetConnectionString("DefaultConnection") 
                ?? throw new InvalidOperationException(
                    "CRITICAL CONFIGURATION ERROR: Master database connection string is not configured. " +
                    "Please specify 'TenantConfiguration:ConnectionString' or 'ConnectionStrings:DefaultConnection' in your .env file, appsettings.json, or environment variables.");

            builder.Services.AddDbContext<MasterCatalogDbContext>(options =>
                options.UseSqlServer(masterConnectionString, sqlOpts =>
                {
                    sqlOpts.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
                    sqlOpts.CommandTimeout(60);
                }));
            builder.Services.AddScoped<ITenantProvisioningService, TenantProvisioningService>();
            builder.Services.AddScoped<ITenantFeatureGateService, Ozikol_BCC.Api.Services.TenantFeatureGateService>();
            builder.Services.AddScoped<Ozikol_BCC.Api.Services.IBillingSnapshotService, Ozikol_BCC.Api.Services.BillingSnapshotService>();
            // Register default tenant seeder for initial setup
            builder.Services.AddScoped<Ozikol_BCC.Application.Seeders.DefaultTenantSeeder>();
            // Pushes billing/subscription changes made in Central to tenants over the notification WebSocket
            builder.Services.AddHostedService<Ozikol_BCC.Api.Services.BillingRealtimeWorker>();
            builder.Services.AddSingleton<Ozikol_BCC.Api.Services.ITemplateSecurityInspectorService, Ozikol_BCC.Api.Services.TemplateSecurityInspectorService>();
            builder.Services.AddMemoryCache();

            builder.Services.AddHttpClient();
            builder.Services.AddScoped<Ozikol_BCC.Application.Interfaces.Services.IAiSmartAssistService, Ozikol_BCC.AiServices.Services.AiSmartAssistService>();
            builder.Services.AddScoped<Ozikol_BCC.Application.Interfaces.Services.IPaymentGatewayService, Ozikol_BCC.PaymentServices.Paystack.Services.PaystackPaymentGatewayService>();
            builder.Services.AddScoped<Ozikol_BCC.Application.Services.IMemberIdGeneratorService, Ozikol_BCC.Application.Services.MemberIdGeneratorService>();

            // 1b. Multi-Server Distributed Cache (Redis / Valkey / Garnet with L1+L2 fallback) & DataProtection Key Ring
            builder.Services.AddOzikolDistributedCaching(builder.Configuration);
            var activeRedisConnStr = RedisInfrastructureExtensions.ResolveRedisConnectionString(builder.Configuration);
            var dataProtectionBuilder = builder.Services.AddDataProtection()
                .SetApplicationName("Ozikol.BCC.Cluster");
            if (!string.IsNullOrWhiteSpace(activeRedisConnStr))
            {
                try
                {
                    var dpRedis = ConnectionMultiplexer.Connect(activeRedisConnStr);
                    dataProtectionBuilder.PersistKeysToStackExchangeRedis(dpRedis, "OzikolBcc:DataProtection-Keys");
                }
                catch
                {
                    // Fallback to local key ring if Redis is unreachable
                }
            }

            // 2. Identity Configuration
            builder.Services.AddIdentity<Profile, AppRole>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 6;
                options.Password.RequireDigit = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 3;
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddEntityFrameworkStores<DashboardDbContext>()
            .AddDefaultTokenProviders();

            // 3. JWT Bearer Authentication (Fail-Fast Secret Validation - Zero Hardcoded Fallbacks)
            var jwtKey = Environment.GetEnvironmentVariable("Jwt__Key")
                ?? Environment.GetEnvironmentVariable("JWT_KEY")
                ?? builder.Configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: 'Jwt:Key' is missing or shorter than 32 characters. " +
                    "Please configure a strong 256-bit secret key via 'Jwt__Key' in your .env file or OS environment variables.");
            }
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

            // Single-source-of-truth Policy Authorization (normalizes spaced/unspaced roles & checks BcpUserFeatureRoles)
            builder.Services.AddScoped<IAuthorizationHandler, CanonicalRoleAuthorizationHandler>();
            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy(AuthPolicies.ConsoleDashboard, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(SystemRoles.ConsoleDashboardKeys)));
                options.AddPolicy(AuthPolicies.CmsStudio, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.CmsAccessKeys,
                        new[] { "bcp-cms", "CMS", "CmsManager", "CmsStudioManager" })));
                options.AddPolicy(AuthPolicies.IdentityAdmin, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.IdentityAdminKeys,
                        new[] { "IdentityManager", "IdentityAccessControl", "bcp-core-identity" })));
                options.AddPolicy(AuthPolicies.UserManagement, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.UserManagementKeys,
                        new[] { "UserManager", "IdentityManager" })));
                options.AddPolicy(AuthPolicies.CommerceStudio, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.CommerceAccessKeys,
                        new[] { "bcp-store-ecommerce", "CommerceStudio", "CommerceManager" })));
                options.AddPolicy(AuthPolicies.CommunicationStudio, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.CommunicationAccessKeys,
                        new[] { "bcp-mass-communication", "NotificationStudio", "CommunicationManager" })));
                options.AddPolicy(AuthPolicies.FormStudio, policy =>
                    policy.Requirements.Add(new CanonicalRoleRequirement(
                        SystemRoles.FormBuilderAccessKeys,
                        new[] { "bcp-form-builder", "FormsSurveys", "FormBuilder" })));
            });

            // 4. CORS Policy for Multi-Tenant Angular SPA Client
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAngularApp", policy =>
                {
                    policy.SetIsOriginAllowed(origin =>
                    {
                        if (string.IsNullOrWhiteSpace(origin)) return false;
                        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                        var host = uri.Host.ToLowerInvariant();

                        // 1. Localhost & loopback (e.g. localhost:4200, fixthing.localhost, niyke.localhost)
                        if (host == "localhost" || host.EndsWith(".localhost") || host == "127.0.0.1")
                            return true;

                        // 2. Production platform domains (e.g. *.ozikol.cloud, *.ozikol.com)
                        if (host == "ozikol.cloud" || host.EndsWith(".ozikol.cloud") ||
                            host == "ozikol.com" || host.EndsWith(".ozikol.com"))
                            return true;

                        // 3. Custom / dynamic tenant origins from environment variable
                        var extraOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
                        if (!string.IsNullOrWhiteSpace(extraOrigins))
                        {
                            var list = extraOrigins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                            if (list.Any(o => o.Equals(origin, StringComparison.OrdinalIgnoreCase) ||
                                              o.Equals(host, StringComparison.OrdinalIgnoreCase) ||
                                              (o.StartsWith("*.") && host.EndsWith(o.Substring(1), StringComparison.OrdinalIgnoreCase))))
                            {
                                return true;
                            }
                        }

                        return false;
                    })
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials()
                    .WithExposedHeaders("Content-Disposition", "X-Tenant-Key", "X-Tenant-Domain", "X-Pagination");
                });
            });

            // 4b. Defense-in-Depth Native Rate Limiting Policies (Auth, AI, Upload Protection with Cloudflare Real-IP)
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.ContentType = "application/json";
                    await context.HttpContext.Response.WriteAsync(
                        "{\"success\":false,\"message\":\"Too many requests. Please slow down and try again shortly.\",\"statusCode\":429}",
                        token);
                };

                // Policy A: Auth limit (Login / Register / Forgot Password) - 5 requests / min per IP
                options.AddPolicy("auth-limit", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ResolveRealClientIp(httpContext),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        }));

                // Policy B: AI Assist & Generation limit - 15 requests / min per client
                options.AddPolicy("ai-limit", httpContext =>
                    RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: ResolveRealClientIp(httpContext),
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 15,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 3,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        }));

                // Policy C: File / Media Upload limit - 20 uploads / min per IP
                options.AddPolicy("upload-limit", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ResolveRealClientIp(httpContext),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        }));
            });

            // 4c. Forwarded Headers for Cloudflare WAF & Multi-Server Reverse Proxy Load Balancers
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            // 5. SignalR (with automatic Redis Backplane when Redis / Valkey / Garnet is configured) & Form Options
            var signalrBuilder = builder.Services.AddSignalR(options =>
            {
                options.MaximumReceiveMessageSize = 100 * 1024 * 1024; // 100MB
            });
            if (!string.IsNullOrWhiteSpace(activeRedisConnStr))
            {
                signalrBuilder.AddStackExchangeRedis(activeRedisConnStr, redisOpts =>
                {
                    redisOpts.Configuration.ChannelPrefix = RedisChannel.Literal("OzikolBccSignalR:");
                    redisOpts.Configuration.AbortOnConnectFail = false;
                });
            }

            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 100 * 1024 * 1024;
            });

            builder.Services.AddScoped<Ozikol_BCC.Api.Filters.ApiErrorTrackingResultFilter>();
            builder.Services.AddScoped<Ozikol_BCC.Api.Filters.WebsiteContentInvalidationActionFilter>();
            builder.Services.AddControllers(options =>
                {
                    options.Filters.AddService<Ozikol_BCC.Api.Filters.ApiErrorTrackingResultFilter>();
                    options.Filters.AddService<Ozikol_BCC.Api.Filters.WebsiteContentInvalidationActionFilter>();
                })
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
                    Title = "Workspace Enterprise REST API", 
                    Version = "v1",
                    Description = "Comprehensive REST API platform for enterprise workspace governance, member directory, group chat, and AI services."
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

            app.UseForwardedHeaders();
            app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
            app.UseSecurityHeaders();
            app.UseStaticFiles();

            app.UseCors("AllowAngularApp");
            app.UseRateLimiter();

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
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Workspace API v1");
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
                options.Title = "Workspace Interactive API Console";
                options.Theme = ScalarTheme.Purple;
                options.DefaultHttpClient = new(ScalarTarget.JavaScript, ScalarClient.HttpClient);
                options.WithModels(false);
            });
            app.MapHub<GroupChatHub>("/hubs/group-chat");
            app.MapHub<NotificationHub>("/hubs/notifications");

            await app.RunAsync();
        }

        /// <summary>
        /// Resolves the genuine client IP address when behind Cloudflare CDN/WAF or a reverse proxy load balancer,
        /// ensuring rate limiting partitions per real end-user rather than throttling the Cloudflare edge IP.
        /// </summary>
        /// <param name="httpContext">The active HTTP request context.</param>
        /// <returns>The resolved client IP address string.</returns>
        private static string ResolveRealClientIp(HttpContext httpContext)
        {
            if (httpContext.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp) &&
                !string.IsNullOrWhiteSpace(cfIp.ToString()))
            {
                return cfIp.ToString().Trim();
            }

            if (httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var xff) &&
                !string.IsNullOrWhiteSpace(xff.ToString()))
            {
                var firstIp = xff.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
                if (!string.IsNullOrWhiteSpace(firstIp))
                {
                    return firstIp;
                }
            }

            return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
        }
    }
}
