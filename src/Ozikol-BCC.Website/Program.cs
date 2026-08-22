using Amazon.S3;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Website.Middlewares;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Services.AWS;
using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Application.Repository.DeviceInformation;
using Serilog;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Ozikol_BCC.Application.Repository.Base;
using Ozikol_BCC.Application.Repository.GeneralRepository.Users;
using Ozikol_BCC.Application.Repository.Services;
using Amazon.S3;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Website.Middlewares;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Services.AWS;
using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Application.Repository.DeviceInformation;
using Serilog;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Ozikol_BCC.Application.Repository.Base;
using Ozikol_BCC.Application.Repository.GeneralRepository.Users;
using Ozikol_BCC.Application.Repository.Services;
using Microsoft.AspNetCore.Authorization;
using Ozikol_BCC.Application;
using Ozikol_BCC.Application.Services;

using Ozikol_BCC.Application.Repository.BCP.UserManagement;

namespace Ozikol_BCC.Website
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Warning() // Don't log Information to avoid huge files, Warning/Error/Fatal only
                .Enrich.FromLogContext()
                .WriteTo.Map("Tenant", "System", (tenant, wt) => 
                    wt.File(Path.Combine("wwwroot", "logs", tenant.ToString(), "syslog-.txt"), 
                        rollingInterval: RollingInterval.Day,
                        retainedFileCountLimit: 30))
                .CreateLogger();

            try
            {
                DotNetEnv.Env.TraversePath().Load();
                var builder = WebApplication.CreateBuilder(args);
                builder.Configuration
                    .SetBasePath(builder.Environment.ContentRootPath)
                    .AddJsonFile(Path.Combine(builder.Environment.ContentRootPath, "..", "Ozikol-BCC.Api", "appsettings.json"), optional: true, reloadOnChange: true);
                builder.Host.UseSerilog();

                // Add services to the container.

            builder.Services.AddAWSService<IAmazonS3>();
            builder.Services.Configure<Ozikol_BCC.Application.Configuration.CloudinarySettings>(builder.Configuration.GetSection("CloudinarySettings"));
            builder.Services.AddScoped<Ozikol_BCC.Application.Services.Cloudinary.ICloudinaryService, Ozikol_BCC.CloudinaryServices.Services.CloudinaryService>();
            builder.Services
                .AddApplicationExtensions(builder.Configuration)
                .AddTenantSupport(builder.Configuration)
                .AddEntityFrameworkSqlServer<DashboardDbContext>();

            var cacheProvider = builder.Configuration["Cache:Provider"];
            if (string.Equals(cacheProvider, "Redis", StringComparison.OrdinalIgnoreCase))
            {
                var redisConnectionString = builder.Configuration["Redis:ConnectionString"];
                if (string.IsNullOrWhiteSpace(redisConnectionString))
                {
                    throw new InvalidOperationException("Cache provider is Redis, but Redis:ConnectionString is not configured.");
                }

                builder.Services.AddStackExchangeRedisCache(options =>
                {
                    options.Configuration = redisConnectionString;
                    options.InstanceName = builder.Configuration["Redis:InstanceName"] ?? "OzikolBcp:";
                });
            }
            else
            {
                builder.Services.AddDistributedMemoryCache();
            }

            builder.Services.AddIdentity<Profile, AppRole>(options =>
            {
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<DashboardDbContext>()
            .AddDefaultTokenProviders();

            builder.Services.AddRazorPages().AddMvcOptions(options =>
            {
                options.Filters.Add(typeof(Ozikol_BCC.Website.Filters.BcpFeatureAccessFilter));
                options.Filters.Add(typeof(Ozikol_BCC.Website.Filters.GlobalSettingsFilter));
            });

            // --- SignalR for Group Chat (100MB Max Payload Limit) ---
            builder.Services.AddSignalR(options =>
            {
                options.MaximumReceiveMessageSize = 100 * 1024 * 1024; // 100 MB
            });

            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100 MB
                options.ValueLengthLimit = 100 * 1024 * 1024;
            });

            builder.Services.Configure<IdentityOptions>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequiredLength = 6;

                options.User.AllowedUserNameCharacters =
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
                options.User.RequireUniqueEmail = true;
            });


            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.LoginPath = "/BcpIdentity/Authenticate/Login";
                options.LogoutPath = "/BcpIdentity/Authenticate/Logout";
                options.AccessDeniedPath = "/BcpIdentity/Authenticate/AccessDenied";
            });

            builder.Services.AddAuthentication()
                .AddCookie("ApplicantAuth", options =>
                {
                    options.LoginPath = "/BcpRecruitment/Platform/Auth/Login";
                    options.LogoutPath = "/BcpRecruitment/Platform/Auth/Logout";
                    options.AccessDeniedPath = "/BcpRecruitment/Platform/Auth/Login";
                });


            builder.Services.AddHttpClient();

            // Unified notification, email, and SMS queue pool service
            builder.Services.AddScoped<Ozikol_BCC.Website.Services.IBcpMessageQueueService, Ozikol_BCC.Website.Services.BcpMessageQueueService>();
            builder.Services.AddScoped<Ozikol_BCC.Website.Services.IBcpAuthorizationService, Ozikol_BCC.Website.Services.BcpAuthorizationService>();
            builder.Services.AddScoped<Ozikol_BCC.Website.Services.IBcpSmartAssistService, Ozikol_BCC.Website.Services.BcpSmartAssistService>();




            // Payment services â€” each registered by concrete type so Checkout can use both
            builder.Services.AddHttpClient<Ozikol_BCC.Application.Services.PixelPayService>();
            builder.Services.AddHttpClient<Ozikol_BCC.Application.Services.PaystackService>();
            
            // Mass Comm SMS Scheduler Background Service
            // builder.Services.AddHostedService<Ozikol_BCC.Application.Services.SmsSchedulerBackgroundService>();
            // builder.Services.AddHostedService<Ozikol_BCC.Application.Services.NewsletterSchedulerBackgroundService>();

            // Email Background Worker for ZeptoMail Retries and Pruning
            // builder.Services.AddHostedService<Ozikol_BCC.Application.Services.EmailBackgroundWorker>();

            var app = builder.Build();

           
            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
                //app.Use(async (context, next) =>
                //{
                //    context.Items["RedirectTohttpswww"] = false;
                //    context.Items["RedirectTohttps"] = false;
                //    await next();
                //});
            }
            else
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();

            app.Use(async (context, next) =>
            {
                var host = context.Request.Host.Value;
                // Sanitize host for folder creation (Windows doesn't allow colons)
                host = host.Replace(":", "_");
                using (Serilog.Context.LogContext.PushProperty("Tenant", host))
                {
                    await next();
                }
            });

            app.UseStaticFiles();
            app.UseTenantScopeMiddleware();
            app.UseSetupRedirectMiddleware();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseMiddleware<Ozikol_BCC.Website.Middlewares.UserSessionMiddleware>();

            app.MapControllers();
            app.MapRazorPages();
            app.MapHub<Ozikol_BCC.Website.Hubs.GroupChatHub>("/hubs/group-chat");

            app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Application terminated unexpectedly");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}
