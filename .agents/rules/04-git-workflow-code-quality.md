# Git Workflow, Commit Standards & Code Quality (Ozikol-BCC)

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
* **Mandatory Translation Consideration Across All Activities**: Every activity, UI update, toast message, audit log view, or feature added across any platform MUST wire multi-language translation (`TranslationService` / `TranslatePipe` on Web, `.tr(ref)` on Flutter) across `en`, `fr`, `es`, and `de` before completion.
* **No Platform Left Behind**: Never deliver a feature to web while leaving mobile/desktop unhandled or vice versa. Ensure business logic, data models, validation, localization, and real-time feeds achieve 1-to-1 operational parity.

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

## 23. Fast Code-Fix Mode & User-Led Build Verification (Mandatory)
* **Direct Fast Code Modifications**: Whenever the user reports an issue, bug, or requests code modifications, the agent MUST immediately inspect and apply the exact, production-ready code edits directly to the relevant source files in seconds.
* **No Blocking Background Builds or Live SSH Deployments**: The agent must NEVER initiate long-running local compilation processes (`dotnet build`, `dotnet publish`, `ng build`, `flutter build`), test runners, or live VPS SSH transfers/container restarts during conversational turns unless the user explicitly asks for a build or remote deployment.
* **User-Led Compilation & Verification**: The user compiles, runs, and tests the project on their own machine at their own pace.
* **Instant Error Resolution**: If the user encounters any compiler errors, warnings, runtime exceptions, or linter failures and provides the log or screenshot, the agent must immediately analyze the root cause and provide the exact fix without delay.
