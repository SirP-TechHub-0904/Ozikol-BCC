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

const EDGE_LLMS_TXT = `# Ozikol Business Command Center (Ozikol BCC)

> Ozikol Business Command Center (Ozikol BCC) is an all-in-one unified enterprise operations and workspace operating platform designed for modern organizations, enterprises, educational institutions, healthcare centers, non-profits, and service teams. It delivers complete operational control across Web, Native Desktop, and Mobile.

## Core Cross-Platform Clients
- **Web Administrative Console**: Instant browser-based governance for leadership, human resources, and site administrators (\`https://{workspace}.ozikol.cloud\` or custom domain).
- **Native Desktop Application (Workspace & Workstation Supervisor)**: High-performance desktop application for Windows (.exe), macOS (.app), and Linux. Features the hardware-verified workstation supervisor, desktop process gatekeeper, document sandboxing, and station telemetry (\`bcp-workspace\`).
- **Mobile Companion**: Native iOS and Android mobile apps for workforce clock-in/out, shift rota notifications, committee reports, and team collaboration.

## Modular Capabilities & Suites

### 1. Workspace & Workstation Supervisor (\`bcp-workspace\`)
- Physical workstation hardware binding and supervisor controls.
- Desktop application gatekeeper and secure document sandboxing.
- Hardware-verified physical attendance handshake, preventing remote clock-in fraud.
- Multi-station activity logging and real-time operational status monitoring.
- Read more: [Workstation Supervisor Guide](https://ozikol.cloud/features/workspace)

### 2. Workforce Management & Real-Time Rota (\`bcp-staff-rota\`)
- Dynamic shift scheduling with drag-and-drop rota planner.
- Employee availability windows, leave management, and shift swap workflows.
- Night shift premiums, operational non-compliance penalties, and attendance telemetry.
- Mobile clock-in/out with location verification and shift handover notes.
- Read more: [Workforce Scheduling Overview](https://ozikol.cloud/features/staff-rota)

### 3. Digital Presence & CMS Studio (\`bcp-cms-studio\`)
- Modular enterprise website builder with dynamic page sections and visual themes.
- Drag-and-drop category builder, blog publications, media storage, and custom forms.
- White-label custom domain mapping with automated SSL issuance and edge CDN caching.
- Dynamic lead capture and customizable public registration forms.
- Read more: [CMS Studio Capabilities](https://ozikol.cloud/features/cms-studio)

### 4. Commerce & Point of Sale (POS) (\`bcp-commerce-studio\`)
- Multi-category product catalog with variants, SKU management, and stock alerts.
- Integrated public storefront with shopping cart and streamlined checkout.
- Multi-gateway payment processing supporting Paystack, Stripe, and Direct Bank Transfer.
- In-person Point of Sale (POS) checkout terminal with digital receipts.
- Read more: [Commerce & POS System](https://ozikol.cloud/features/store-ecommerce)

### 5. Independent Committees & Governance (\`bcp-committees\`)
- Autonomous committee and board workspace management.
- Structured meeting agendas, attendee rosters, and voting procedures.
- Formal minuted report composer with attached cloud documents and action items.
- Read more: [Committees & Board Management](https://ozikol.cloud/features/committees)

### 6. Identity, RBAC & Security Infrastructure
- Granular Role-Based Access Control (RBAC) with customizable permission policies.
- Multi-Factor Authentication (2FA), one-time passwords (OTP), and device tracking.
- Immutable security audit logs and custom system error code registry.
- Provisioned transactional email routing with domain authentication.

### 7. Ozi AI Studio Assistant
- Embedded in-app companion providing split-screen side-by-side workspace assistance.
- Contextual drafting for news articles, page content, SEO metadata, and summaries.
- Completely seamless, non-overlapping responsive layout in both desktop and web consoles.

## Getting Started & Access Channels
- **Register a Workspace**: Start a 14-day free trial at [Ozikol Registration](https://ozikol.cloud/register).
- **Desktop Client Downloads**: Access Windows, macOS, and Linux workstation binaries from the Workspace Stations console.
- **Mobile Apps**: Available on iOS App Store and Google Play Store for authenticated staff and members.
- **Developer Integration API**: Explore REST API documentation at [Ozikol Developer API](https://ozikol.cloud/DeveloperApi).
- **Public Website & Pricing**: Explore modular plans and features at [Ozikol Pricing](https://ozikol.cloud/Pricing).
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();

    // 0. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    // 1. High-performance Edge intercept for AI discovery & SEO metadata endpoints
    // Normalizes culture prefixes (e.g. /en/sitemap.xml -> /sitemap.xml) and attaches universal CORS
    const isAiOrSeoFile =
      pathname === "/llms.txt" || pathname === "/en/llms.txt" || pathname === "/fr/llms.txt" || pathname === "/es/llms.txt" || pathname === "/de/llms.txt" ||
      pathname === "/llms-full.txt" || pathname === "/en/llms-full.txt" || pathname === "/fr/llms-full.txt" || pathname === "/es/llms-full.txt" || pathname === "/de/llms-full.txt" ||
      pathname === "/robots.txt" || pathname === "/en/robots.txt" || pathname === "/fr/robots.txt" || pathname === "/es/robots.txt" || pathname === "/de/robots.txt" ||
      pathname === "/sitemap.xml" || pathname === "/en/sitemap.xml" || pathname === "/fr/sitemap.xml" || pathname === "/es/sitemap.xml" || pathname === "/de/sitemap.xml";

    if (isAiOrSeoFile) {
      let canonicalPath = pathname;
      if (canonicalPath.startsWith("/en/") || canonicalPath.startsWith("/fr/") || canonicalPath.startsWith("/es/") || canonicalPath.startsWith("/de/")) {
        canonicalPath = canonicalPath.substring(3);
      }

      const targetUrl = new URL(url.origin + canonicalPath);
      try {
        const originRes = await fetch(targetUrl.toString(), {
          headers: request.headers,
          cf: { cacheTtl: 1800, cacheEverything: true }
        });

        if (originRes.ok) {
          const respHeaders = new Headers(originRes.headers);
          respHeaders.set("Access-Control-Allow-Origin", "*");
          respHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          return new Response(originRes.body, {
            status: originRes.status,
            statusText: originRes.statusText,
            headers: respHeaders
          });
        }
      } catch (err) {
        // Fall through to edge fallback if origin fetch fails
      }

      // Edge fallback for llms.txt to guarantee 100% availability for AI agents
      if (canonicalPath === "/llms.txt") {
        return new Response(EDGE_LLMS_TXT, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }

    const userAgent = request.headers.get("User-Agent") || "";
    const isBot = BOT_USER_AGENTS.some(regex => regex.test(userAgent));

    // Non-crawler requests (real users, API calls, static assets) pass straight through
    if (!isBot) {
      return fetch(request);
    }

    const host = url.hostname.toLowerCase();
    const parts = host.split(".");

    // Only process HTML pages (ignore images, JS, CSS, JSON)
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
            const companyName = data.companyName || "";
            const title = data.websiteTitle || data.dashboardTitle || companyName;
            const desc = data.companyDescription || data.footerDescription || "";
            // Prioritize square icon (companyIconUrl) for social preview cards so it doesn't get cropped
            const img = data.companyIconUrl || data.companyLogoUrl || data.companyWhiteLogoUrl || "";

            meta = {
              title: escapeHtml(title),
              description: escapeHtml(desc),
              image: img,
              companyName: escapeHtml(companyName)
            };
          }
        } else {
          const capitalized = tenantKey.charAt(0).toUpperCase() + tenantKey.slice(1);
          meta = {
            title: capitalized,
            description: "",
            image: "",
            companyName: capitalized
          };
        }
      } catch (err) {
        const capitalized = tenantKey.charAt(0).toUpperCase() + tenantKey.slice(1);
        meta = {
          title: capitalized,
          description: "",
          image: "",
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
    let rewriter = new HTMLRewriter();

    if (meta.title) {
      rewriter = rewriter.on("title", {
        element(e) {
          e.setInnerContent(meta.title);
        }
      });
    }

    rewriter = rewriter.on("head", {
      element(e) {
        let tags = '\n  <!-- Dynamic Multi-Tenant Social Preview Injected by Cloudflare Worker -->\n';
        if (meta.description) tags += `  <meta name="description" content="${meta.description}">\n`;
        tags += `  <meta property="og:type" content="website">\n`;
        if (siteName) tags += `  <meta property="og:site_name" content="${siteName}">\n`;
        if (meta.title) tags += `  <meta property="og:title" content="${meta.title}">\n`;
        if (meta.description) tags += `  <meta property="og:description" content="${meta.description}">\n`;
        if (meta.image) {
          tags += `  <meta property="og:image" content="${meta.image}">\n`;
          tags += `  <meta property="og:image:secure_url" content="${meta.image}">\n`;
        }
        tags += `  <meta property="og:url" content="${pageUrl}">\n`;
        tags += `  <meta name="twitter:card" content="summary_large_image">\n`;
        if (meta.title) tags += `  <meta name="twitter:title" content="${meta.title}">\n`;
        if (meta.description) tags += `  <meta name="twitter:description" content="${meta.description}">\n`;
        if (meta.image) tags += `  <meta name="twitter:image" content="${meta.image}">\n`;

        e.append(tags, { html: true });
      }
    });

    return rewriter.transform(response);
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

