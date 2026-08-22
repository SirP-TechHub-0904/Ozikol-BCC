namespace Ozikol_BCC.Website.Middlewares
{
    public class TokenMiddleware
    {
        private readonly RequestDelegate _next;

        public TokenMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Generate a new GUID
            string token = Guid.NewGuid().ToString();

            // Append the token parameter to the URL
            string originalUrl = context.Request.Path + context.Request.QueryString;
            string newUrl = $"{originalUrl}&token={token}";
            // Build a new absolute URL with the token parameter
            var request = context.Request;
            var newUriBuilder = new UriBuilder
            {
                Scheme = request.Scheme,
                Host = request.Host.Host,
                Port = request.Host.Port ?? 80,
                Path = newUrl
            };
            var newUri = newUriBuilder.Uri;

            // Modify the request URL
            if (!context.Request.Path.Equals("/"))
            {
                context.Response.Headers["Location"] = newUri.ToString();
                context.Response.StatusCode = 302; // Redirect status code

            }
            await _next(context);
        }

    }

    public static class TokenMiddlewareExtensions
    {
        public static IApplicationBuilder UseTokenMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<TokenMiddleware>();
        }
    }
}


