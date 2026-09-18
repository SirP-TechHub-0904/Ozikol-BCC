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

---

## 4. UI Form & Placeholder Standards (Mandatory)
* **Standard Professional Placeholders**: All form input fields and text areas MUST use clean, professional, intuitive placeholder text demonstrating the expected input format (e.g., `e.g. John Doe`, `name@company.com`, `e.g. Acme Corporation`, `e.g. +1 (555) 000-0000`, `e.g. @@username`, `e.g. mycompany`).
* **No Ambiguous or Cluttered Strings**: Placeholders must avoid arbitrary or overly verbose sample text and show the expected format at a glance.
* **Razor Escaping in Placeholders**: In Razor `.cshtml` files, always properly escape `@` characters in placeholder attributes (e.g., `placeholder="e.g. @@username"` or `placeholder="name@@company.com"` where applicable) to prevent Razor compilation parsing errors.

---

## 5. Central Database Migrations & Schema Changes (Mandatory)
* **No Ad-Hoc Runtime Schema Scripts**: Do not embed ad-hoc `ALTER TABLE` or raw DDL statements inside application startup or seeder classes.
* **Standard EF Core Migrations**: Whenever a model or schema changes in `Ozikol.MasterDomain` or `Ozikol.Central`, always generate the official EF Core migration in `Ozikol.MasterPersistence.EF.MasterSQL`.
* **Explicit User Migration Notification**: Always inform the user clearly: *"I have added the migration. Please update both your local and production database."* (e.g. via `dotnet ef database update` or Package Manager Console `Update-Database`).

---

## 6. Email Deliverability, Spam Protection & Real-Time Blacklist Validation (Mandatory)
* **Anti-Spam Keyword Blacklist & Highlighting**: Whenever programming or implementing email composition, broadcast, template editors, or newsletter features (in UI or backend):
  * **Real-Time As-You-Type Warnings**: Provide real-time client-side analysis that scans and visually highlights spam triggers as the user types (e.g. in subject lines and message bodies).
  * **ALL CAPS Subject Line Warning**: Detect and flag subject lines written in ALL CAPS (e.g., `URGENT! CLAIM YOUR ACCOUNT NOW!!!`) with a spam deliverability alert.
  * **Spam Trigger Words & Phrases**: Maintain an active blacklist of high-risk spam words/phrases (e.g., `100% Free`, `Earn Money Fast`, `No Risk`, `Act Now`, `Guaranteed Return`, `Click Here Now`, `Winner`, `Risk Free`, `Double Your Cash`, `Million Dollars`) and display intuitive warnings/suggestions.
  * **Image-to-Text Ratio**: Warn the author if an email is image-heavy with negligible text content, which triggers SpamAssassin filters and hurts sender reputation.
  * **Suspicious & Shortened Links**: Detect and warn against URL shorteners (e.g., `bit.ly`, `tinyurl`) or unencrypted HTTP links inside email bodies to safeguard domain sender reputation across mailbox providers (Gmail, Yahoo, Outlook).


