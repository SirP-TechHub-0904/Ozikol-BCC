using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Middlewares
{
    public class UserSessionMiddleware
    {
        private readonly RequestDelegate _next;

        public UserSessionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, DashboardDbContext dbContext, SignInManager<Profile> signInManager, Services.IBcpMessageQueueService messageQueue)
        {
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrWhiteSpace(userId))
                {
                    const string sessionCookieName = "BCP_SessionKey";
                    string? sessionKey = context.Request.Cookies[sessionCookieName];

                    var userAgent = context.Request.Headers["User-Agent"].ToString();
                    var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                    var (deviceType, deviceName) = ParseUserAgent(userAgent);

                    if (string.IsNullOrWhiteSpace(sessionKey))
                    {
                        sessionKey = Guid.NewGuid().ToString();
                        context.Response.Cookies.Append(sessionCookieName, sessionKey, new CookieOptions
                        {
                            HttpOnly = true,
                            Secure = context.Request.IsHttps,
                            SameSite = SameSiteMode.Lax,
                            Expires = DateTimeOffset.UtcNow.AddDays(30)
                        });
                    }

                    var session = await dbContext.UserDeviceSessions
                        .FirstOrDefaultAsync(s => s.ProfileId == userId && s.SessionKey == sessionKey);

                    if (session != null)
                    {
                        if (session.IsRevoked)
                        {
                            await signInManager.SignOutAsync();
                            context.Response.Cookies.Delete(sessionCookieName);
                            context.Response.Redirect("/BcpIdentity/Authenticate/Login");
                            return;
                        }

                        session.LastActiveAt = DateTime.UtcNow;
                        session.IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress;
                        session.DeviceName = deviceName;
                        session.DeviceType = deviceType;
                        session.UserAgent = userAgent;
                        await dbContext.SaveChangesAsync();
                    }
                    else
                    {
                        var newSession = new UserDeviceSession
                        {
                            ProfileId = userId,
                            SessionKey = sessionKey,
                            DeviceType = deviceType,
                            DeviceName = deviceName,
                            UserAgent = userAgent,
                            IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
                            CreatedAt = DateTime.UtcNow,
                            LastActiveAt = DateTime.UtcNow,
                            IsRevoked = false
                        };
                        dbContext.UserDeviceSessions.Add(newSession);
                        await dbContext.SaveChangesAsync();

                        // Notify user about new device sign-in
                        try
                        {
                            await messageQueue.EnqueueAsync(
                                Ozikol_BCC.Domain.Enum.Enum.BcpEventType.NewDeviceSignedIn,
                                userId,
                                "New Device Signed In",
                                $"A new sign-in was detected from {deviceName} ({deviceType}) at IP {ipAddress}.",
                                actionUrl: "/BcpIdentity/Workspace/ActiveSessions");
                        }
                        catch
                        {
                            // Notification failures must not break authentication flow
                        }
                    }
                }
            }

            await _next(context);
        }

        private static (string DeviceType, string DeviceName) ParseUserAgent(string ua)
        {
            if (string.IsNullOrWhiteSpace(ua))
            {
                return ("Desktop", "Unknown Browser");
            }

            string deviceType = "Desktop";
            if (ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) || ua.Contains("Android", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase))
            {
                deviceType = "Mobile";
            }
            else if (ua.Contains("Tablet", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase))
            {
                deviceType = "Tablet";
            }

            string browser = "Browser";
            if (ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) browser = "Microsoft Edge";
            else if (ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) browser = "Google Chrome";
            else if (ua.Contains("Safari/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)) browser = "Safari";
            else if (ua.Contains("Firefox/", StringComparison.OrdinalIgnoreCase)) browser = "Mozilla Firefox";

            string os = "Windows";
            if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase)) os = "Windows";
            else if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase)) os = "iOS";
            else if (ua.Contains("Mac OS", StringComparison.OrdinalIgnoreCase)) os = "macOS";
            else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase)) os = "Android";
            else if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase)) os = "Linux";

            return (deviceType, $"{browser} on {os}");
        }
    }
}
