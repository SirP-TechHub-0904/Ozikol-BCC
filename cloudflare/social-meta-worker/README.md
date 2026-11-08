# Ozikol Multi-Tenant Social Preview Cloudflare Worker

Dynamically intercepts social bots (**WhatsApp**, **Facebook**, **Twitter/X**, **Telegram**, **LinkedIn**, **Discord**, **Slack**) visiting any tenant subdomain on `*.ozikol.cloud` (e.g. `nightpress.ozikol.cloud`) and uses Cloudflare's high-speed **HTMLRewriter** to stream-inject:
- Tenant-specific `<title>`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">` (from tenant's Cloudinary / CDN logo)
- Twitter Card tags

Regular browser traffic (Chrome, Safari, Edge, Mobile) is passed through untouched with zero overhead.

---

## Deployment Options

### Method 1: Cloudflare Dashboard (Quickest - 60 seconds)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) and select your account (`Ozikolbcc@gmail.com's Account`).
2. In the left sidebar, click **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Name the Worker: `ozikol-social-meta-worker` and click **Deploy**.
4. Click **Edit code**.
5. Paste the entire contents of [`worker.js`](worker.js) into the editor.
6. Click **Deploy**.
7. Go to the Worker's **Settings** tab -> **Domains & Routes** -> **Add route**:
   - **Route**: `*://*.ozikol.cloud/*`
   - **Zone**: `ozikol.cloud`
8. Done! Any WhatsApp link shared for `https://nightpress.ozikol.cloud` will instantly display the Nightpress title, description, and shield logo!

---

### Method 2: Via Cloudflare API / Wrangler CLI
If deploying from terminal, ensure your API Token has **Workers Scripts (Edit)** and **Worker Routes (Edit)** permissions, then run:
```bash
npx wrangler deploy
```
