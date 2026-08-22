using Microsoft.AspNetCore.Mvc.Rendering;

namespace Ozikol_BCC.Website.Middlewares
{
    public static class HtmlHelperValueExtensions
    {
        public static string Value(this IHtmlHelper htmlHelper, DateTime? value)
        {
            // Your implementation here
            // Example: return someValue;
            if (value.HasValue)
            {
                return value.Value.ToString("dd.MM.yyyy");
            }

            return string.Empty;
        }
    }
}

