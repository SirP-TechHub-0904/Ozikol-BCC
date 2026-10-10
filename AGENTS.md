# Project Rules & Permanent Memory Bank (Ozikol-BCC)

This document serves as the permanent memory bank and behavioral guidelines for all AI coding agents working in this repository. These rules apply to every prompt and session.

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
* **Standard Professional Placeholders**: All form input fields and text areas MUST use clean, professional, intuitive placeholder text demonstrating the expected input format (e.g., `e.g. First Last`, `name@company.com`, `e.g. Your Organization Name`, `e.g. +0 (000) 000-0000`, `e.g. @@username`, `e.g. mycompany`). **No real names or company names** may be used in placeholder text.
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
