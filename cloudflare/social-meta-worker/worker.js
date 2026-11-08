/**
 * ===================================================================
 * Ozikol Multi-Tenant Dynamic Social Crawler Open Graph Worker
 * ===================================================================
 * Intercepts social media bots and scrapers (WhatsApp, Facebook,
 * Twitter/X, Telegram, LinkedIn, Discord, Slack) across *.ozikol.cloud
 * and dynamically injects per-tenant Open Graph metadata (Title,
 * Description, Logo) using Cloudflare HTMLRewriter.
 *
 * Real browser requests pass through with zero modification.
 * ===================================================================
 */

const BOT_USER_AGENTS = [
  /WhatsApp/i,
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /TelegramBot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /Discordbot/i,
  /Pinterest/i,
  /SkypeUriPreview/i
];

const DEFAULT_BRAND = {
  title: "Ozikol Business Command Center",
  description: "Enterprise Operations, Sovereign Multi-Tenant Infrastructure & Business Command Center.",
  image: "https://ozikol.cloud/assets/images/ozikol.png"
};

export default {
  async fetch(request, env, ctx) {
    const userAgent = request.headers.get("User-Agent") || "";
    const isBot = BOT_USER_AGENTS.some(regex => regex.test(userAgent));

    // Non-crawler requests (real users, API calls, static assets) pass straight through
    if (!isBot) {
      return fetch(request);
    }

    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const parts = host.split(".");

    // Only process HTML pages (ignore images, JS, CSS, JSON)
    const pathname = url.pathname;
    if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map)$/i)) {
      return fetch(request);
    }

    // Determine tenant key from subdomain (e.g. nightpress from nightpress.ozikol.cloud)
    let tenantKey = null;
    if (parts.length >= 3 && !["app", "central", "api", "admin", "www"].includes(parts[0])) {
      tenantKey = parts[0];
    }

    let meta = { ...DEFAULT_BRAND };

    if (tenantKey) {
      try {
        const apiUrl = `https://api.ozikol.cloud/api/settingsapi/brand`;
        const apiResponse = await fetch(apiUrl, {
          headers: {
            "X-Tenant-Key": tenantKey,
            "Accept": "application/json"
          },
          // Cache API response at Cloudflare edge for 5 minutes to keep crawler responses lightning fast
          cf: { cacheTtl: 300 }
        });

        if (apiResponse.ok) {
          const json = await apiResponse.json();
          if (json && json.data) {
            const data = json.data;
            const companyName = data.companyName || tenantKey.charAt(0).toUpperCase() + tenantKey.slice(1);
            const title = data.websiteTitle || data.dashboardTitle || companyName;
            const desc = data.companyDescription || data.footerDescription || `Welcome to ${companyName}`;
            // Prioritize square icon (companyIconUrl) for social preview cards so it doesn't get cropped like wide logos
            const img = data.companyIconUrl || data.companyLogoUrl || data.companyWhiteLogoUrl || DEFAULT_BRAND.image;

            meta = {
              title: escapeHtml(title),
              description: escapeHtml(desc),
              image: img,
              companyName: escapeHtml(companyName)
            };
          }
        } else {
          // Fallback if tenant DB is unpopulated: format subdomain name
          const capitalized = tenantKey.charAt(0).toUpperCase() + tenantKey.slice(1);
          meta = {
            title: `${capitalized} Portal`,
            description: `Welcome to ${capitalized} official command portal.`,
            image: DEFAULT_BRAND.image,
            companyName: capitalized
          };
        }
      } catch (err) {
        // Fallback on fetch error
        const capitalized = tenantKey.charAt(0).toUpperCase() + tenantKey.slice(1);
        meta = {
          title: `${capitalized} Portal`,
          description: `Welcome to ${capitalized} official command portal.`,
          image: DEFAULT_BRAND.image,
          companyName: capitalized
        };
      }
    }

    // Fetch the origin response
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";

    // If origin did not return HTML, pass through as-is
    if (!contentType.includes("text/html")) {
      return response;
    }

    const pageUrl = url.href;
    const siteName = meta.companyName || DEFAULT_BRAND.title;

    // Use Cloudflare HTMLRewriter to stream-inject Open Graph and Twitter tags into <head>
    return new HTMLRewriter()
      .on("title", {
        element(e) {
          e.setInnerContent(meta.title);
        }
      })
      .on("head", {
        element(e) {
          e.append(`
  <!-- Dynamic Multi-Tenant Social Preview Injected by Cloudflare Worker -->
  <meta name="description" content="${meta.description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${meta.title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:image" content="${meta.image}">
  <meta property="og:image:secure_url" content="${meta.image}">
  <meta property="og:url" content="${pageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title}">
  <meta name="twitter:description" content="${meta.description}">
  <meta name="twitter:image" content="${meta.image}">
`, { html: true });
        }
      })
      .transform(response);
  }
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

