# Architecture, Database, AI Key Pool & Template Engine Rules (Ozikol-BCC)

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

## 5. Database Migrations & Schema Changes (Master & Tenant - Mandatory)
* **Zero Unmigrated Persistent Model Properties (CRITICAL)**: Whenever a domain model, table, or entity in either `Ozikol.MasterDomain` OR `Ozikol-BCC.Domain` is created or modified:
  * **Immediate Migration Generation**: If any new property, column, relationship, or constraint is added, the agent MUST IMMEDIATELY generate the official EF Core migration before concluding the prompt, task, or feature implementation.
  * **Master Domain Changes**: Must target `Ozikol.MasterPersistence.EF.MasterSQL`:
    `dotnet ef migrations add <DescriptiveName> --project src/Ozikol.MasterPersistence.EF.MasterSQL --startup-project src/Ozikol.Central`
  * **Tenant Domain Changes**: Must target `Ozikol-BCC.Persistence.EF.SQL`:
    `dotnet ef migrations add <DescriptiveName> --project src/Ozikol-BCC.Persistence.EF.SQL --startup-project src/Ozikol-BCC.Api`
  * **Runtime-Only Properties (`[NotMapped]`)**: If a model property is intended strictly for in-memory, computed, or runtime display purposes and is NOT a database column, it MUST be explicitly annotated with `[NotMapped]`. Never leave an unmapped runtime property unannotated.
* **No Ad-Hoc Runtime Schema Scripts**: Do not embed ad-hoc `ALTER TABLE` or raw DDL statements inside application startup or seeder classes.
* **Zero Retroactive Migration Editing**: NEVER manually edit already-generated EF Core migration files (`.cs` or `.Designer.cs`) to patch schema drift or bypass discrepancies. Migrations must remain immutable historical records. If schema changes occur, generate a new forward migration or perform an explicit approved reset.
* **Zero Automated Database Execution**: NEVER execute `dotnet ef database update`, `Update-Database`, or any DDL/DML script against the database. Migration generation (`dotnet ef migrations add`) is permitted and mandatory, but applying migrations is strictly reserved for the user.
* **Explicit User Migration Notification**: Always inform the user clearly: *"I have generated the EF Core migration `<MigrationName>`. Please update both your local and production database."* Provide the exact command targeting the relevant project (`Ozikol.MasterPersistence.EF.MasterSQL` or `Ozikol-BCC.Persistence.EF.SQL`).

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
