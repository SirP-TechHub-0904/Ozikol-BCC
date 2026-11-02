using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Ozikol_BCC.Api.Middleware
{
    /// <summary>
    /// Middleware that injects defense-in-depth security response headers (equivalent to Helmet.js)
    /// into every HTTP response, safeguarding the application against clickjacking, MIME-sniffing,
    /// cross-site scripting (XSS), and unauthorized browser feature exploitation.
    /// </summary>
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        /// <summary>
        /// Initializes a new instance of the <see cref="SecurityHeadersMiddleware"/> class.
        /// </summary>
        /// <param name="next">The next middleware in the HTTP request pipeline.</param>
        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        /// <summary>
        /// Invokes the middleware to append protective security headers to the outgoing response.
        /// </summary>
        /// <param name="context">The current HTTP context.</param>
        /// <returns>A task representing the completion of request processing.</returns>
        public async Task InvokeAsync(HttpContext context)
        {
            // Execute on starting response before headers are committed
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;

                // 1. Prevent MIME-sniffing attacks where browsers attempt to guess content types
                if (!headers.ContainsKey("X-Content-Type-Options"))
                {
                    headers.Append("X-Content-Type-Options", "nosniff");
                }

                // 2. Clickjacking protection: permit framing only from the same origin
                if (!headers.ContainsKey("X-Frame-Options"))
                {
                    headers.Append("X-Frame-Options", "SAMEORIGIN");
                }

                // 3. Referrer leakage protection: only send origin on cross-origin requests
                if (!headers.ContainsKey("Referrer-Policy"))
                {
                    headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
                }

                // 4. Restrict sensitive browser hardware APIs (Camera, Microphone, Geolocation) by default
                if (!headers.ContainsKey("Permissions-Policy"))
                {
                    headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
                }

                // 5. Legacy XSS filter activation
                if (!headers.ContainsKey("X-XSS-Protection"))
                {
                    headers.Append("X-XSS-Protection", "1; mode=block");
                }

                return Task.CompletedTask;
            });

            await _next(context);
        }
    }

    /// <summary>
    /// Extension methods for registering <see cref="SecurityHeadersMiddleware"/> in the pipeline.
    /// </summary>
    public static class SecurityHeadersMiddlewareExtensions
    {
        /// <summary>
        /// Adds <see cref="SecurityHeadersMiddleware"/> to the application request pipeline.
        /// </summary>
        /// <param name="app">The application builder instance.</param>
        /// <returns>The application builder instance for chaining.</returns>
        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        {
            return app.UseMiddleware<SecurityHeadersMiddleware>();
        }
    }
}
