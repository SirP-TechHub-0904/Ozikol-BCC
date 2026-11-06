# Project Rules & Permanent Memory Bank (Ozikol-BCC)

This document serves as the permanent memory bank and behavioral guidelines for all AI coding agents working in this repository. These rules apply to every prompt and session.

> [!IMPORTANT]
> **Active Rule Set**: This master memory bank is also modularized into `.agents/rules/` (`01-architecture-database-ai.md`, `02-translation-localization.md`, `03-ui-ux-design-standards.md`, `04-git-workflow-code-quality.md`, `05-notifications-communications.md`, `06-error-codes-handling.md`, `07-sidebar-navigation-hierarchy.md`) to guarantee 100% prompt injection with zero byte truncation across all AI agent sessions. Always adhere strictly to all rules in this document and in `.agents/rules/`.

---

## 1. Code Documentation & Comments (Mandatory)
* **XML Documentation**: Every newly created or modified class, interface, method, and property MUST include clear, professional XML documentation (`/// <summary>`).
* **Parameter & Return Docs**: Methods must document parameters (`/// <param name="...">`) and return values (`/// <returns>`).
* **Inline Explanations**: Any non-trivial business logic, database queries, calculations, cryptographic operations, or error-handling blocks must have concise inline comments explaining the *intent* and *why*, not just repeating what the code does.
* **No "Naked" Code**: Never generate bare functions or classes without contextual documentation. Preserve all existing unrelated comments.

---

## 2. Git Branching & Commit Standards (Mandatory)
* **Master Branch Protection**: NEVER commit directly to the `master` branch under any circumstances.
* **Dedicated Task Branching**: Always create and work on a dedicated, descriptive branch before modifying files or creating commits:
  * Features / Integrations: `feat/<feature-name>` (e.g., `feat/telemetry-postmark-sentry`)
  * Bug fixes / UI issues: `fix/<bug-name>` (e.g., `fix/login-currency-column-error`)
  * Maintenance / Config / Migrations: `chore/<task-name>` (e.g., `chore/migration-tenant-last-accessed`)
  * Refactoring / Cleanups: `refactor/<task-name>` (e.g., `refactor/auth-middleware-pipeline`)
* **Context-Driven Task Branch Switching & Isolation (Mandatory)**:
  * **Use Discretion on Domain Scope**: If incoming user requests, features, or bug fixes address a different subsystem, domain, or architectural area than the currently active branch (e.g., CMS layout sections / Cloudflare R2 vs. Email dispatch services), the agent MUST proactively use discretion to create, switch to, and push changes on a new dedicated, descriptive task branch.
  * **No Unrelated Task Stacking**: NEVER accumulate unrelated domain changes onto a mismatched branch. Each task branch must remain cleanly scoped to its specific functional domain.
* **Zero-Error Pre-Commit Rule**: Code MUST build cleanly with 0 compilation errors across all affected projects before any commit is created.
* **Conventional Commits Format**:
  * Structure: `<type>(<scope>): <concise summary>` followed by a blank line and a bulleted list of changed files and architectural context.
  * Recognized types: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`.
  * Commit message example:
    ```
    feat(telemetry): integrate postmark email suite, sentry monitoring, and crash alerts

    - Added Ozikol-BCC.EmailServices.Postmark with single, bulk, template, and attachment support
    - Added Ozikol-BCC.Telemetry.Sentry class library with PII header scrubbing
    - Implemented GlobalExceptionHandlingMiddleware in Ozikol.Central for instant crash emails
    - Added EF Core migration 20260918061200_AddTenantLastAccessedAndUpdatedColumns
    ```


---

## 3. Architecture & Strict Rules
* **No Hardcoded Connection Strings / Secrets**: Never provide hardcoded connection strings or dummy fallbacks in code. Always resolve from `.env` or environment variables and throw clear descriptive `InvalidOperationException` if missing.
* **Master vs. Tenant Layer Isolation**:
  * Master Catalog persistence lives strictly in `Ozikol.MasterDomain` and `Ozikol.MasterPersistence.EF.MasterSQL`.
  * Tenant persistence lives strictly in `Ozikol-BCC.Domain` and `Ozikol-BCC.Persistence.EF.SQL`.
  * Never cross-contaminate models, contexts, or migrations between Master and Tenant.
* **Planning Before Modification**: Always provide a structured implementation plan and obtain user approval before modifying, deleting, or moving files across project boundaries.
* **No Unauthorized Database Operations (CRITICAL)**: NEVER execute any SQL command (`ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `CREATE`, `EXEC`, `dotnet ef database update`, `Update-Database`, or any raw DDL/DML) against **any** database (Master, Tenant, or otherwise) without the user's **explicit, written go-ahead** in the current conversation. This applies to:
  * Direct SQL scripts or ad-hoc queries.
  * EF Core migration application (`dotnet ef database update`, `Update-Database`).
  * Seed data scripts or data manipulation commands.
  * Any command that reads, modifies, alters, or destroys production or development database content or schema.
  * **Generating** migration files via `dotnet ef migrations add` is permitted, but **applying** them is not without written approval.

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

## 5. Central Database Migrations & Schema Changes (Mandatory)
* **No Ad-Hoc Runtime Schema Scripts**: Do not embed ad-hoc `ALTER TABLE` or raw DDL statements inside application startup or seeder classes.
* **Standard EF Core Migrations**: Whenever a model or schema changes in `Ozikol.MasterDomain` or `Ozikol.Central`, always generate the official EF Core migration in `Ozikol.MasterPersistence.EF.MasterSQL`.
* **Zero Retroactive Migration Editing**: NEVER manually edit already-generated EF Core migration files (`.cs` or `.Designer.cs`) to patch schema drift or bypass discrepancies. Migrations must remain immutable historical records. If schema changes occur, generate a new forward migration or perform an explicit approved reset.
* **Zero Automated Database Execution**: NEVER execute `dotnet ef database update`, `Update-Database`, or any DDL/DML script against the database. Migration generation (`dotnet ef migrations add`) is permitted, but applying migrations is strictly reserved for the user.
* **Explicit User Migration Notification**: Always inform the user clearly: *"I have added the migration. Please update both your local and production database."* (e.g. via `dotnet ef database update` or Package Manager Console `Update-Database`).

---

## 6. Email Deliverability, Spam Protection & Real-Time Blacklist Validation (Mandatory)
* **Anti-Spam Keyword Blacklist & Highlighting**: Whenever programming or implementing email composition, broadcast, template editors, or newsletter features (in UI or backend):
  * **Real-Time As-You-Type Warnings**: Provide real-time client-side analysis that scans and visually highlights spam triggers as the user types (e.g. in subject lines and message bodies).
  * **ALL CAPS Subject Line Warning**: Detect and flag subject lines written in ALL CAPS (e.g., `URGENT! CLAIM YOUR ACCOUNT NOW!!!`) with a spam deliverability alert.
  * **Spam Trigger Words & Phrases**: Maintain an active blacklist of high-risk spam words/phrases (e.g., `100% Free`, `Earn Money Fast`, `No Risk`, `Act Now`, `Guaranteed Return`, `Click Here Now`, `Winner`, `Risk Free`, `Double Your Cash`, `Million Dollars`) and display intuitive warnings/suggestions.
  * **Image-to-Text Ratio**: Warn the author if an email is image-heavy with negligible text content, which triggers SpamAssassin filters and hurts sender reputation.
  * **Suspicious & Shortened Links**: Detect and warn against URL shorteners (e.g., `bit.ly`, `tinyurl`) or unencrypted HTTP links inside email bodies to safeguard domain sender reputation across mailbox providers (Gmail, Yahoo, Outlook).

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

## 9. Central Master DB AI Key Pool & Provider Execution Standards (Mandatory)
* **Central Master DB Key Storage (Never in `.env`)**: All AI provider API keys (Google Gemini, DeepSeek, etc.) MUST be stored and managed dynamically in the Central Master Catalog Database (`Ozikol_MasterCatalogDb`) table `[dbo].[MasterAiApiKeys]` via `IAiKeyPoolManagerService`. Never expect, require, or store raw AI keys in `.env` or `appsettings.json`.
* **Central Works Web Management UI**: AI keys are managed, added, and health-probed via the Central Works portal route **`/centralwks/aikeys`** (e.g. `https://localhost:5001/centralwks/aikeys`).
* **Key Generation Sources**:
  * **Google Gemini API Keys**: Generated from Google AI Studio (`https://aistudio.google.com/app/apikey`).
  * **DeepSeek API Keys**: Generated from DeepSeek Platform (`https://platform.deepseek.com/api_keys`).
* **Provider Hierarchy & Execution Order**:
  1. **Primary Provider (Priority #1)**: **Google Gemini 2.5 Flash** (`Provider == "Gemini"`) — Delivers 1-to-1 HTML/CSS DOM fidelity, exact tokenization matching canonical models, and ~1.2s response latency.
  2. **Automated Secondary Failover**: **DeepSeek Chat / Coder** (`Provider == "DeepSeek"`) — Seamless failover if all active Gemini keys are rate-limited or exhausted.
  3. **Last-Resort Local Engine**: Ollama (`qwen2.5-coder:1.5b` at `https://ozi-ai.ozikol.cloud/api/generate`) / In-Memory Tokenizer — Engaged only if external key pools are unreachable or unpopulated.
* **Dynamic Pool Governance**:
  * **Round-Robin Load Distribution**: The least-used healthy key (`TodayRequestsCount < DailyQuotaLimit`) is selected first.
  * **Automatic Rate-Limit Cooldown**: When a provider returns `429 Too Many Requests` or quota exhaustion, the key is immediately put into cooldown (300s for Gemini, 120s for DeepSeek) and traffic automatically rotates to the next available key in the pool.

---

## 10. Template Modular Hydration, Assembler & Preview Architecture (Mandatory)
* **Master HTML Document Assembler (`HtmlAssemblerService`)**:
  * **Location**: `src/Ozikol-BCC.Client/src/app/pages/admin/content/templates/services/html-assembler.service.ts`
  * **Responsibilities**:
    * `assembleSectionPreview(options: SectionPreviewOptions)`: Assembles complete, self-contained HTML5 documents for single category previews in iframe isolation, dynamically linking zone code injections (head, body-open, footer), suite fonts, reset CSS, and scripts.
    * `assembleFullPage(options: FullPageAssemblyOptions)`: Synthesizes production-ready multi-section web pages (Navbar + Hero + Breadcrumbs + Body sections + Footer + Injections).
* **Modular Content Placeholder Replacement Engine (Hydrators)**:
  * **Master Hydration Services**: `template-hydration.service.ts` and `content-hydration.service.ts`.
  * **Modular Category Hydrators** (`services/hydrators/`):
    * `navigation-hydrator.ts`: Multi-zone and sequential nav items (`NavItems="first|middle|last"`), top bar pages (`TopBarPages`), menu dropdown categories with nested pages (`MenuDropdowns`), CTA action buttons (`MenuCtaButtons`), and auth triggers (`ActivateLoginInMenu`).
    * `hero-hydrator.ts`: Hero headlines, descriptions, action buttons, image URLs, and repeater item loops.
    * `breadcrumb-hydrator.ts`: Breadcrumb roots, child navigation links, and active page trail.
    * `body-sections-hydrator.ts`: Feature cards, stats counters, process steps, split showcases, and FAQ accordion loops.
    * `footer-hydrator.ts`: Navigation groups, legal compliance links, copyright, and powered-by credits.
    * `blog-feed-hydrator.ts` & `blog-detail-hydrator.ts`: Article grid, tag pills, author metadata, publication dates, and sanitized post bodies.
    * `hydration-core.utils.ts`: Balanced block regex parsers, token sanitization, and fallback placeholder resolution.
* **Live Database Tokens vs. Static Sample JSON Separation**:
  * Live tenant database tokens fetched via `ContentApi/templates/editor-tokens` (`topMenuItems`, `menuDropdowns`, `menuCtaButtons`, `footerGroups`, `legalPages`, `brand`) MUST take precedence during preview hydration to reflect real tenant configuration.
  * Static `sampleContent` / preset JSON acts strictly as fallback demonstration mock data when database collections are unpopulated.
  * Never conflate preview simulation output with static sample JSON inspector state.

---

## 11. Background Task Lifecycle & Queue Protection (Mandatory)
* **Zero Hung or Zombie Background Tasks**: Never leave background tasks running indefinitely. If any background task (e.g., builds, tests, git operations, or shell commands) runs longer than required or appears idle/unresponsive, the agent MUST immediately terminate (`kill`) it via `manage_task` to keep the user's chat thread unblocked.
* **Non-Blocking Git Operations**: Never leave git operations (`git push`, `git pull`, `git fetch`) hanging in the background where credential prompts or network latency can stall silently. If a remote git command does not complete within 15–20 seconds, terminate it immediately and report the outcome to the user.
* **Proactive Queue Health Check**: The agent must never finish an interaction while leaving orphaned, silent background processes running that cause incoming user messages to wait in a pending queue. Always verify and terminate stale background processes before concluding.

---

## 12. Feature-by-Feature Cross-Platform Parity (Mandatory)
* **Unified Cross-Platform Delivery**: Every new feature or domain capability MUST be implemented and verified cohesively across all target platforms:
  * **Web Client**: Angular Admin Dashboard (`src/Ozikol-BCC.Client`)
  * **Desktop**: Flutter Desktop (Windows `.exe`, macOS `.app`, Linux)
  * **Mobile**: Flutter Mobile (Android `.apk`/App Bundle, iOS)
  * **Backend**: ASP.NET Core Web API (`src/Ozikol-BCC.Api`) and Application layer
* **No Platform Left Behind**: Never deliver a feature to web while leaving mobile/desktop unhandled or vice versa. Ensure business logic, data models, validation, and real-time feeds achieve 1-to-1 operational parity.

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

## 14. Automated Working Code Commit Standard (Mandatory)
* **Immediate Working Commit**: As soon as code modifications for a feature, sub-task, or phase are confirmed working (builds with 0 errors across .NET, passes 100% of unit/widget tests, and reports 0 lints), the agent MUST immediately create a Conventional Commit on the dedicated task branch.
* **No Accumulation of Working Code**: Never let working, verified changes accumulate uncommitted across multiple conversational turns. Commit proactively so the repository maintains a clean, recoverable history at every milestone.

---

## 15. Platform-Specific Native Code Implementation (Mandatory)
* **Complete Native Implementations**: Whenever a feature requires native platform code, the agent MUST write the exact, production-ready code directly into the target platform directories:
  * **Android**: `AndroidManifest.xml` (permissions, queries, services), `build.gradle` (SDK versions, dependencies), and Kotlin/Java native handlers.
  * **iOS**: `Info.plist` (privacy keys, usage descriptions, schemes), `Podfile`, and Swift native AppDelegate plugins.
  * **Windows Desktop**: `windows/runner/main.cpp`, `Runner.rc`, application manifest, and CMake dependencies.
  * **macOS Desktop**: `macos/Runner/Info.plist`, `Base.lproj/MainMenu.xib`, and Swift AppDelegate configurations.
  * **Web**: `web/index.html` (meta tags, viewport, service worker scripts), manifest, and asset linkages.
* **Zero Native Stubs**: Never assume platform code will be added "later", and never leave empty stub methods or placeholder comments where native configuration is required.

---

## 16. Unified Multi-Channel Notification Pool Architecture (Mandatory)
* **Single Notification Pool Ingestion**: All user-facing communications and alerts across all channels—**In-App Notifications**, **Email Sending**, **WhatsApp Messages**, and **SMS Alerts**—MUST be routed and dispatched through the unified notification pool architecture (`ICentralNotificationDispatcher`, `BcpNotification`, `BcpEmailQueue`, `BcpSmsQueue`).
* **Zero Direct/Ad-Hoc Dispatches in Business Handlers**: Feature handlers, controllers, background services, and UI flows MUST NEVER directly instantiate or invoke low-level email clients (e.g. raw Postmark), SMS gateways, or WhatsApp HTTP webhooks in an ad-hoc or blocking manner. All outbound events must be enqueued into the tenant's notification and message queue pool.
* **Multi-Channel Fallback & Routing**:
  * **In-App Notifications**: Stored in `[dbo].[BcpNotifications]` with canonical 6-tier severity levels (`info`, `success`, `warning`, `danger`, `urgent`, `critical`), deep-link action URLs, and unread badges. Streamed to Web and Flutter clients in real-time.
  * **Email Dispatch**: Enqueued into `[dbo].[BcpEmailQueue]` with Postmark template support, anti-spam blacklist validation, and responsive HTML layouts.
  * **SMS Alerts**: Enqueued into `[dbo].[BcpSmsQueue]` with sender ID compliance, character count validation, and transaction tracking.
  * **WhatsApp Alerts**: Managed through the unified notification queue with template verification and status tracking.
* **Audit & Idempotency Protection**: Every notification pool entry MUST record the originating `TenantKey`, `UserId`, `SystemId`, `Category`, `Priority`, and timestamp to guarantee zero message loss, deduplication, and complete delivery telemetry.
* **Mandatory Notifications for High-Impact & Serious Activities (Permanent Rule)**:
  * Whenever an authentication, security, credential, permission, or serious operational action occurs, the system MUST automatically dispatch an in-app and real-time socket notification to the affected user(s) via `ICentralNotificationDispatcher.DispatchAsync`.
  * **Mandatory Trigger Events**:
    1. **New Device / Browser Sign-in**: Alert user of unrecognized device access, IP address, and timestamp with action link to Manage Devices (`/identity/console/account?tab=devices`).
    2. **Password Updates & Resets**: Immediate confirmation of self-service or administrative password alterations (`/identity/console/account?tab=password`).
    3. **Two-Factor Authentication (2FA)**: Enabling, disabling, or regenerating recovery codes (`/identity/console/account?tab=2fa`).
    4. **Session Termination**: Notification when an active device session is revoked remotely (`/identity/console/account?tab=devices`).
    5. **Role & Privilege Adjustments**: Granting, upgrading, or revoking administrative roles and scopes.
    6. **Account Status & Membership Changes**: Activation, suspension, category transfers, or administrative profile updates.
  * **Clickable Deep Linking Requirement**: Every notification MUST populate `ActionUrl` with a clean route (e.g. `/identity/console/account?tab=devices`) enabling users across Web, Mobile, and Desktop to click the notification and immediately navigate to the exact tab/screen.
  * **Future Feature Mandate**: All future features, modules, and administrative workflows MUST proactively identify high-impact actions and implement corresponding notification dispatches as part of their initial delivery.

---

## 17. Multi-Language Localization & Translation Engine Standards (Mandatory)
* **All Activities Must Consider Translation (Universal Mandate)**:
  * **Every single activity, feature, screen, modal, form, table, audit log, activity timeline, billing checkout, toast alert, and notification** created or modified by any agent MUST proactively consider and implement multi-language translation from the very beginning—never as an afterthought.
  * Every user-facing UI text, title, eyebrow, header, button, subtitle, form field label, placeholder, tooltip, table column header, filter pill, status badge, empty-state illustration headline/description, confirmation dialog, contextual help guide, audit log entry label, and custom notification in both the **Administration Console** and **Users Workspace** MUST strictly use the translation engine.
  * **Zero Hardcoded Text (Absolute Prohibition)**: NEVER write raw English string literals directly inside HTML templates, TypeScript toast calls, Razor views, or Flutter widget trees. Every string MUST be bound via standard translation tokens or `translateDynamic(...)`:
    * **Web (Angular)**: Use the `| translate` pipe in templates (e.g. `{{ 'nav.console_dashboard' | translate }}` or `[placeholder]="'shell.search_placeholder' | translate"`), `this.translationService.translate('token', 'Fallback')` in TypeScript toast/alert calls, and `this.translationService.translateDynamic(text)` for system-generated descriptions, audit log actions/statuses/modules, and dynamic catalog labels. In standalone components, always import `TranslatePipe` in the component's `imports: [...]` array.
    * **Desktop & Mobile (Flutter)**: Use the reactive Riverpod translation extension (e.g. `'btn.update_password'.tr(ref, fallback: 'Update Password')`).
* **Audit Logs & Activity Feeds Translation Standard**:
  * Both the **Security Audit & Log Activity** console (`/identity/console/audit-logs`) and **My Activity** timeline (`/identity/console/account?tab=activity` on Web and `MyActivityView` on Flutter) MUST translate:
    1. All static UI chrome (page headers, search placeholders, module filter options, table headers, pagination counters, action buttons, and toasts) via `| translate` / `.tr(ref)`.
    2. All system-generated audit fields (`actionType`, `status`, `description`, `module`, and device/browser summaries) via `translationService.translateDynamic(...)` or localized status/action token mappers, while preserving user-identifiable literals (user names, emails, IP addresses, and timestamps).
* **Clear Distinction: UI Chrome vs Dynamic Database Entities**:
  * **UI Chrome & Framework Controls (100% Translated)**: All application buttons, table headers, form inputs, dialogs, validation notices, empty states, and in-app notifications MUST resolve through translation tokens.
  * **Dynamic Database Records (Stored as User Content)**: Only live data values originating from the database (e.g., user-entered names, tenant organization names, user bio text, custom message bodies) are rendered as persisted. If a French-speaking administrator writes in French, their database content will naturally be French, and the entire BCC UI surrounding it will seamlessly match in French.
* **Pluggable Multi-Language Architecture (Drop-In New Languages)**:
  * The translation architecture across Web, Desktop, and Mobile is strictly decoupled so that introducing a new language (e.g. Italian, Arabic, Portuguese, Chinese) requires only TWO steps:
    1. Add the dictionary file / map containing the translated token keys for the new ISO code.
    2. Register the language entry (code, name, nativeName, flag emoji) in the supported languages catalog (`AppTranslations.supportedLanguages` in Flutter, `translation.service.ts` in Angular).
  * Once registered, the language switcher automatically displays the new option, and selecting it immediately executes the entire application in that language without modifying any screen, widget, or template.
* **Central Pattern `.oz-lang-switcher` Component Parity**:
  * The language switcher UI across all applications MUST faithfully replicate the **Ozikol Central** design system:
    * **Pill Trigger Button**: Features a rounded pill (`border-radius: 9999px`), frosted glass background (`rgba(255, 255, 255, 0.75)` on light, `rgba(30, 41, 59, 0.75)` on dark), subtle borders, country flag emoji, uppercase ISO code (e.g. `🇬🇧 EN`, `🇫🇷 FR`, `🇪🇸 ES`, `🇩🇪 DE`), and a 180° animated rotating chevron arrow.
    * **Desktop Viewports**: Floating frosted glass dropdown menu anchored directly beneath the trigger button (`RelativeRect.fromRect`), featuring flags, native names, subtle hover transitions, and Royal Blue (`#0050E5`) active checkmark indicators.
    * **Mobile Viewports**: Adaptive modal bottom sheet (`showModalBottomSheet`) with a grab handle bar, translated header (`Select Language`), language list with flags, native names, English subtitles, and Royal Blue active checkmarks.
    * **Local Persistence**: Language selections MUST persist locally across restarts (`localStorage.getItem('bcp_language')` on Web, `SecureStorageService.getLanguage()` on Mobile/Desktop).
* **Four Canonical Base Languages (Extensible)**:
  * **English (`en`)**: `🇬🇧 EN` (`English`) — Default base language.
  * **French (`fr`)**: `🇫🇷 FR` (`Français`).
  * **Spanish (`es`)**: `🇪🇸 ES` (`Español`).
  * **German (`de`)**: `🇩🇪 DE` (`Deutsch`).
* **Standard Hierarchical Token Namespaces**:
  * `shell.*`: Shell labels, mode switcher (`shell.console`, `shell.workspace`), topbar search placeholders, user menu actions, footer credits.
  * `nav.*`: Navigation groups, sidebar sections, menu categories, screen headers.
  * `btn.*`: Action triggers (e.g. `btn.refresh_telemetry`, `btn.register_new_member`, `btn.save_changes`, `btn.cancel`, `btn.continue`, `btn.terminate_other_sessions`, `btn.export_csv`).
  * `account.*`: Account & Security suite titles, tabs, descriptions, credentials, device sessions, and login history.
  * `table.*`: Table column headers (e.g. `table.device_name`, `table.ip_address`, `table.last_active`, `table.status`, `table.actions`).
  * `form.*` & `modal.*`: Form labels, input placeholders, validation error alerts, dialog titles, prompt instructions.
  * `notif.*`: In-app custom notification titles, category labels, severity badges, and notification feed actions.
  * `badge.*` & `status.*`: Service states, role indicators, and verification pill labels.
* **Fail-Safe Fallback Contract**:
  * If a token is not defined in the active language dictionary, the engine MUST automatically fall back to the English dictionary.
  * If absent from English as well, it MUST gracefully fall back to the provided fallback argument or token key, preventing runtime crashes or blank UI elements.
* **Pre-Commit Translation Verification**:
  * Every code change or feature addition MUST verify that all newly added user-facing strings are bound via translation tokens across all target platforms before creating a commit.

---

## 18. Strict Zero Dummy Data Policy (Mandatory)
* **Strict Prohibition of Dummy / Mock / Fallback Records**:
  * NEVER return, render, or inject fake, mock, simulated, sample, or hardcoded dummy records across ANY platform (Angular Web Client, Flutter Desktop/Mobile, ASP.NET Core API).
  * This strictly applies to notifications, feeds, user directories, tables, KPI metrics, telemetry counters, audit logs, messages, billing transactions, cards, and dropdowns.
  * Functions like `_getSampleNotifications()`, mock array fallbacks, or sample seed cards in production client code are strictly prohibited and must NEVER be introduced or retained.
* **100% Tenant Database Sourcing**:
  * ALL data displayed in the application MUST be queried live from the active Tenant Database (or Central Master Database where specifically dealing with catalog/tenant metadata).
  * If a tenant database query returns zero records (empty table or list), the system MUST return empty collections (`[]`) without falling back to sample or mock records.
* **High-Aesthetic Localized Empty States**:
  * When a data query yields 0 records, the UI MUST render a clean, high-aesthetic empty state with:
    1. A relevant contextual icon (e.g. `notifications_none_rounded`, `inbox`, `person_off`).
    2. A clear, localized headline (e.g. `'notif.empty_title'.tr(ref)` -> `"All caught up!"` or `"No records found"`).
    3. A helpful, localized descriptive prompt (e.g. `'notif.empty_desc'.tr(ref)` -> `"New alerts, updates, and maintenance advisories will appear right here in real time."`).
    4. An optional contextual action button if applicable (e.g. create or refresh).
* **Test Isolation**:
  * Mock data or fixtures may ONLY exist inside explicit test suites (`/test/`, `*Test.cs`, `*.spec.ts`) and must NEVER bleed into production models, services, repositories, or UI widgets.

---

## 19. Proactive Multi-Channel Notification & Communication Dispatch (Mandatory)
* **Active Event-Driven Notification Consideration**:
  * Whenever designing, implementing, or updating any feature, security workflow, user management process, administrative action, or transactional state change, the agent MUST proactively identify and implement multi-channel communications.
  * Key triggering events include:
    * **Identity & Access**: User registration, role assignments, password reset, 2FA enable/disable, login from new device/location, account lockouts.
    * **Administration & Governance**: Status change, user suspension, member deletion, category reassignments.
    * **Billing & Operations**: Subscription renewals, license threshold alerts, payment gateway verifications, maintenance windows.
    * **User Workspaces**: Mentions, group invites, direct messages, broadcast announcements.
* **Multi-Channel Orchestration via Unified Ingestion**:
  * All communications MUST route through `ICentralNotificationDispatcher` (`DispatchNotificationRequest` / `NotificationDispatchPayload`) to ensure tenant-partitioned execution across:
    * **In-App Alerts**: Stored in tenant DB `[dbo].[BcpNotifications]` and broadcasted immediately via SignalR WebSocket for instant bell-badge increments and slide-over/dropdown toast notifications.
    * **Transactional Email**: Dispatched via Postmark queue with anti-spam blacklist validation and professional HTML responsive layouts.
    * **SMS Carrier Alerts**: Queued via `[dbo].[BcpSmsQueue]` with character count limits and carrier compliance.
    * **WhatsApp Notifications**: Dispatched through the verified messaging pipeline.
* **Zero Direct Third-Party Client Coupling**:
  * Domain services and controllers must NEVER directly call external Postmark/Twilio/Meta HTTP endpoints. All events must be enqueued into the tenant database queues to ensure retry resilience, idempotency, and complete telemetry logging.

---

## 20. Clean, User-Friendly Error Messaging & Strict Sanitization (Mandatory)
* **Strict Prohibition of Brand & Internal Infrastructure in Errors**:
  * User-facing error messages, alerts, banners, dialogs, form feedback, and toasts across ALL platforms (Web Client, Flutter Desktop/Mobile, API responses) MUST NEVER expose:
    * **Brand Names in Errors**: NEVER include `"Ozikol"` in error messages, failure notices, or alert descriptions. System failures must never associate negative user experiences with the brand name.
    * **Internal Architecture & Infrastructure Jargon**: NEVER expose internal terms such as `"server"`, `"server error"`, `"sql"`, `"sql error"`, `"database"`, `"db"`, `"master catalog"`, `"catalog db"`, `"exception"`, `"stack trace"`, `"null reference"`, `"endpoint"`, `"http 500"`, or table/column schema details.
* **Friendly, Human, Actionable Error Standards**:
  * Error messages must be clean, simple, empathetic, and actionable so users immediately know what to do without being confused or alarmed by technical jargon.
  * **Canonical Examples**:
    * Instead of `"Ozikol Server error: SQL connection failed"` or `"Cannot connect to Ozikol server"` -> `"Unable to connect. Please check your network connection and try again."`
    * Instead of `"Tenant not found in Ozikol Master Catalog DB"` or `"Resolution failed for Ozikol"` -> `"Workspace could not be found."`
    * Instead of `"Internal server error 500: SQL query timeout"` -> `"Something went wrong. Please try again in a few moments."`
    * Instead of `"Invalid credentials in user database"` -> `"Invalid email or password. Please verify your details."`
    * Instead of `"Request timed out by server"` -> `"Unable to connect. Please check your connection and try again."`
    * Instead of `"Active members still assigned, or server rejected request"` -> `"Could not delete category. Active members may still be assigned, or the request could not be completed."`
* **Automated Sanitization Pipeline**:
  * Network interceptors and repositories MUST pass all raw exceptions and error payloads through a central sanitizer (`sanitizeError`) before setting UI state or presenting snackbars, banners, or toast alerts.
  * The sanitizer must strip or replace any raw technical or branded terms with canonical, user-friendly language.

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

---

## 22. Strict Prohibition of Emojis & Iconography Standard (Mandatory)
* **Zero Raw Emojis in UI**: NEVER use raw Unicode emojis (e.g., 🚀, ⚡, 🎉, 💡, 🔥, 👍, ❌, 📅, ⚠️, etc.) in UI buttons, call-to-actions, headers, titles, placeholders, banners, alerts, badges, table columns, or menu navigation across all applications (Central Web Razor, Angular Client, Flutter Desktop/Mobile).
* **Mandatory Vector / Font Icons**: Always use crisp, scalable, professional vector/font icons matching the platform design system:
  * **Central Web (Razor Pages)**: Use Google Material Symbols (`<span class="material-symbols-outlined">icon_name</span>`).
  * **Angular Client**: Use official Angular Material / Material Symbols / FontAwesome or custom SVG icons.
  * **Flutter Desktop & Mobile**: Use Flutter `Icons.<icon_name>` (e.g. `Icons.rocket_launch`, `Icons.bolt`, `Icons.calendar_month`, `Icons.warning_amber`).
* **Design Rationale**: Raw Unicode emojis render inconsistently across operating systems (Windows, macOS, iOS, Android, Linux), disrupt typography baselines, and convey an informal/unprofessional appearance incompatible with an enterprise Business Command Center. Vector icons ensure 100% theme color fidelity, responsive scaling, and unified cross-platform aesthetics.


---

## 23. Standardized API Error Codes, Custom Error vs. Real Error Isolation (Mandatory)
* **Strict Client vs. Central Error Separation**:
  * **Client / Tenant Response Contract**: Every non-success API response (`IsSuccess == false` or `HTTP >= 400`) returned to a client (Angular Web, Flutter Desktop/Mobile) MUST return ONLY:
    1. **`ErrorCode`**: A standard catalog code (`ERR-XXXX`, e.g., `ERR-3001`).
    2. **`Message` (Custom Error)**: A simple, clean, translated user-friendly message (e.g., `"Paystack unavailable."`).
    3. **`TraceId`**: The correlation identifier for support lookup.
  * **Zero Raw / Real Error Exposure to Clients**: NEVER expose raw gateway messages (e.g., `"Paystack: Integration has been deactivated"`), SQL exception messages, stack traces, internal class names, or third-party HTTP error payloads to the client UI or API response JSON (`[JsonIgnore] public string? RealError { get; set; }`).
* **Central-Only Real Error Telemetry (`MasterApiErrorLogs`)**:
  * Whenever any API request fails or returns a non-success response, the backend (`ApiErrorTrackingResultFilter` & `GlobalExceptionHandlingMiddleware`) automatically records the full diagnostic record in `MasterApiErrorLogs`:
    * `ErrorCode` (`ERR-XXXX`)
    * `CustomError` (the clean message shown to the client)
    * `RealError` (the exact underlying error, raw gateway response, or exception message)
    * `StackTrace`, `Endpoint`, `HttpMethod`, `HttpStatusCode`, `MasterTenantCatalogId`, `TenantKey`, `UserId`, `UserEmail`, `IpAddress`, and `TraceId`.
  * **Central Inspection (`/centralwks/error-logs` & `/centralwks/tenants/details`)**:
    * Only Central administrators can view the **Custom Error + Real Error + Error Code**, organized into **By Tenant**, **By Central**, and **All Tenant List** views, as well as inside each individual Tenant's Details page.
* **Client Admin Error Codes Directory (`/identity/console/error-codes`)**:
  * Under **Audit Logs** in the Client Admin, provide the **Error Codes** reference page displaying only the **Error Code (`ERR-XXXX`)**, **Category**, **Custom Error**, and **Plain-Language Meaning / Recommended Action** (100% translated via `TranslationService`), never the `RealError`.
* **Full Catalog Reference**: See `.agents/rules/06-error-codes-handling.md` for the complete `ERR-1000` through `ERR-9999` standard error code registry.

---

## 24. Canonical Sidebar Navigation Hierarchy & Feature Gating Standards (Mandatory)
* **Absolute Sidebar Sequence (Top-to-Bottom across all platforms)**:
  1. **Core Navigation & User Management**:
     * `Dashboard Overview` / `Workspace Home`
     * `User Directory` (`All Members`, `Categories`, `KPIs`, `User Settings`)
     * `Identity & Access Control`
     * `Manage Account & Profile` (`My Account`)
  2. **Subscribed Modular Features**:
     * Appears immediately after User Management / My Account.
     * Includes `Workspace (Desktop Stations)`, `Messenger`, `Groups`, `Alumni`, etc.
  3. **Billing & Subscriptions** (Admin / Tenant level only):
     * `Subscription Plans`
     * `Subscriptions & Invoices`
  4. **Security, Audit & System Logs** (Admin / Tenant level only):
     * `Security Audit` & Activity Logs
     * `Error Codes`
* **Strict Member Menu Isolation**:
  * Members ONLY ever have `Dashboard (Workspace Home)` and `Manage My Account` by default.
  * Modular features appear in the member menu ONLY if actively subscribed and enabled by the tenant administrator.
  * Billing & Subscriptions and Security Logs are strictly prohibited from appearing in the member menu.
* **Direct URL Protection (`feature.guard.ts`)**:
  * Typing or deep-linking to an unsubscribed feature route (e.g. `/workspace/stations`) must be blocked by `FeatureGuard` and redirect to `/feature-unavailable` showing the unavailable advisory.
* **Full Specification Reference**: See `.agents/rules/07-sidebar-navigation-hierarchy.md`.



---

## 25. Fast Code-Fix Mode & User-Led Build Verification (Mandatory)
* **Straight-to-the-Point Code Fixes (Zero Unrequested Builds/Deployments)**: When the user says "do this" or "fix this", the agent MUST go straight to the code and modify the relevant source files directly in seconds. Do not initiate local compilations (`dotnet build`, `dotnet publish`, `ng build`), test suites, or background tasks unless the user explicitly requests them.
* **Strict Prohibition on VPS SSH / Remote Access Without Permission**: The agent must NEVER communicate with, connect to, or execute commands against the VPS via SSH (`ssh`, `scp`, `rsync`, or remote shells) without the user's **explicit, written permission** in the current conversation.
* **User-Led Compilation & Verification**: The user compiles, runs, and tests the project on their own machine at their own pace.
* **Instant Error Resolution**: If the user encounters any compiler errors, warnings, runtime exceptions, or linter failures and provides the log or screenshot, the agent must immediately analyze the root cause and provide the exact fix without delay.
