# UI/UX Design, Brand & Layout Standards (Ozikol-BCC)

---

## 4. UI Form & Placeholder Standards (Mandatory)
* **Standard Professional Placeholders (Zero Individual or Company Names)**: All form input fields and text areas MUST use clean, professional, intuitive placeholder text demonstrating the expected input format.
  * **Strict Prohibition of Individual & Company Names**: NEVER use individual personal names (e.g. `Jane`, `Doe`, `John`, `Smith`, `Jane Doe`, `jane.doe@organization.org`) or dummy company names (e.g. `acmecorp`, `contoso`) in placeholder text or field demonstrations.
  * **Canonical Format Placeholders**:
    * **First Name**: `e.g. First Name` or `e.g. First`
    * **Last Name**: `e.g. Last Name` or `e.g. Last`
    * **Full Name**: `e.g. First Last`
    * **Email Address**: `name@company.com` or `user@domain.com` (never personal name prefixes like `jane.doe@...`)
    * **Organization / Workspace**: `e.g. access code or url` or `e.g. Your Organization Name`
    * **Phone Number**: `e.g. +0 (000) 000-0000`
    * **Username**: `e.g. @username`
* **No Ambiguous or Cluttered Strings**: Placeholders must avoid arbitrary or overly verbose sample text and show the expected format at a glance.
* **Razor Escaping in Placeholders**: In Razor `.cshtml` files, always properly escape `@` characters in placeholder attributes (e.g., `placeholder="e.g. @@username"` or `placeholder="name@@company.com"` where applicable) to prevent Razor compilation parsing errors.

---

## 7. Product Terminology & Domain Language (Mandatory)
* **Brand & System Terminology (BCC = Business Command Center, NEVER "MIS")**:
  * The system is officially named **Ozikol Business Command Center** (**Ozikol BCC**).
  * **STRICT PROHIBITION**: NEVER use "MIS" or "Management Information System" in UI text, headers, titles, placeholders, banners, update notices, code comments, documentation, or implementation plans.
  * Always use **Business Command Center** or **BCC** wherever the platform, product suite, or client applications are referenced.
* **Universal Brand Color (Royal Blue #0050E5, Zero Red Branding)**:
  * The single official brand primary color across ALL applications (Central Web, Angular BCC Admin, Flutter Desktop/Mobile) is **Royal Blue (`#0050E5`)**.
  * **Strict Prohibition**: Red (`#E5173F` or any variant) is NEVER to be used for logos, primary buttons, active navigation indicators, marketing hero bars, or branding elements.
  * Red is reserved strictly and exclusively for system errors, danger alerts, and destructive deletion actions (`#EF4444` / `#DC2626`).
  * Canonical logo assets must always be `ozikol.png` / `oz-logo.png` (blue on light) or `ozikol-white.png` / `oz-logo-white.png` (white on dark). Never create or use `-red` asset files.
* **Feature & Capability Terminology (No "Fleet")**: Always use **Features**, **Modular Capabilities**, **Tenants**, or **Tenant Organizations**. NEVER use the word "fleet" in UI text, headings, badges, telemetry labels, code comments, documentation, or implementation plans.
* **MRR (Monthly Recurring Revenue)**: Clearly represent MRR as Monthly Subscription Revenue / Recurring Feature Revenue generated from paid feature add-ons and tenant plans.

---

## 8. AI Studio Assistant Docking & Responsive Split-Screen Layout Architecture (Mandatory)
* **Non-Overlapping Screen Sharing (Zero Floating Clutter)**: The Ozi AI assistant (`app-ai-assistant`) must NEVER float over or obscure main workspace content, form inputs, buttons, tables, or code editors when docked.
  * **Sidebar Mode (`docked-right`)**:
    * `:host` must maintain `display: contents` to participate directly as a flex item in `.bcp-workspace-container`.
    * `.ai-panel-wrapper.mode-docked-right` MUST use `position: relative` (never `position: fixed`) with flex sizing (`flex: 0 0 380px; width: 380px; height: 100%`).
    * The main page shell (`.bcp-page-shell`) must dynamically flex (`flex: 1 1 0; min-width: 0`) and shift left (~70% width), sharing the screen side-by-side with the AI assistant (~30% width).
  * **Bottom Bar Mode (`docked-bottom`)**:
    * `.bcp-workspace-container.ai-docked-bottom` uses column flex (`flex-direction: column`).
    * `.ai-panel-wrapper.mode-docked-bottom` MUST use `position: relative` (never `position: fixed`) with flex sizing (`flex: 0 0 340px; height: 340px; width: 100%`).
    * The main page shell shifts upward (`flex: 1 1 0; min-height: 0`), cleanly sharing vertical screen real estate without overlapping any controls.
  * **Floating Mode (`floating`)**:
    * `position: fixed` is reserved strictly for explicit floating window mode (`mode-floating`), where the card hovers over the bottom-right corner and the page remains at 100% width.
  * **Zero Regression Rule**: Never alter these flex docking contracts to re-introduce fixed position overlays during UI tweaks or refactors.

---

## 13. Interactive Tour Guides & Contextual Info Icons (Mandatory)
* **Screen & Menu Tour Guides**:
  * Every major module, menu item, and top-level screen MUST provide an interactive walkthrough / Tour Guide that introduces the screen's core capabilities, workflow steps, and action triggers.
  * Tour completion state MUST be persisted locally per tenant/workspace (e.g. `has_completed_tour_{screenKey}`) so users are not repeatedly interrupted after finishing the walkthrough.
  * Every screen MUST offer a clean Replay Tour / Help action (`(?)`) so users can re-trigger the walkthrough at any time.
* **Contextual Section Info Icons (`(i)`)**:
  * Every key section, card, KPI block, table header, or complex form group MUST include a standardized contextual Info Icon (`(i)`).
  * Tapping or hovering the info icon displays an intuitive popover (desktop) or bottom sheet (mobile) explaining:
    * **Purpose**: Why this section or data matters.
    * **Expected Inputs / Formats**: Specific requirements and examples.
    * **Impact**: How actions taken in this section affect tenant billing, notifications, or members.
    * **Best Practices**: Actionable domain advice for administrators.

---

## 21. Mobile Infinite Scroll vs. Desktop Pagination Standard (Mandatory)
* **Adaptive Viewport Data Loading Pattern**:
  * Feeds, timelines, audit logs, and data lists across all applications MUST dynamically adapt their loading pattern based on the client viewport / device form factor:
    * **Mobile Screens (`isMobile` / viewport width < 600px)**:
      * **Infinite Scroll (Scroll Down to Load More)**: As the user scrolls down towards the bottom of the viewport (`pixels >= maxScrollExtent - 250`), automatically fetch the subsequent page of records and append them (`items.addAll(newItems)`) without interrupting the user's scroll position or requiring manual taps.
      * **No Pagination Buttons on Mobile**: Do NOT render `Previous` / `Page X of Y` / `Next` pagination button strips on mobile screens. Pagination buttons consume valuable vertical screen estate and disrupt natural touch gesture navigation.
      * **Loading Indicator & End of Feed**: When fetching older records on scroll, display an unobtrusive inline loading spinner (`"Loading older activity..."` or `"Loading more..."`). Once the final page is reached, show a subtle end-of-feed label (e.g. `"Showing all X records from the last 30 days"`).
    * **Desktop & Large Tablets (`!isMobile` / viewport width >= 600px)**:
      * **Structured Server-Side Pagination**: Maintain full server-side pagination bars with record counters (`"Showing X of Y records"`), page indicators (`"Page X of Y"`), and `Previous` / `Next` buttons for rapid jumping and precise operational data navigation.
* **Debounce & Guard Against Duplicate Network Queries**:
  * Infinite scroll listeners MUST guard with `!isLoading && !isLoadingMore && currentPage < totalPages` to guarantee zero duplicate network round-trips when reaching the bottom of the list.
* **Refresh / Filter Reset Guarantee**:
  * Pull-to-refresh, filter chips, or search queries must reset `currentPage = 1` and replace the collection with fresh page-1 results, resetting the infinite scroll state cleanly.
