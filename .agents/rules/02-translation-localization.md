# Multi-Language Localization, Zero Dummy Data & Error Standards (Ozikol-BCC)

---

## 17. Multi-Language Localization & Translation Engine Standards (Mandatory)
* **Strict Universal Translation Adherence (Mandatory from Phase 1)**:
  * Every user-facing UI text, title, eyebrow, header, button, subtitle, form field label, placeholder, tooltip, table column header, filter pill, status badge, empty-state illustration headline/description, confirmation dialog, contextual help guide, and custom notification in both the **Administration Console** and **Users Workspace** MUST strictly use the translation engine.
  * **Zero Hardcoded Text (Absolute Prohibition)**: NEVER write raw English string literals directly inside HTML templates, Razor views, or Flutter widget trees. Every string MUST be bound via standard translation tokens:
    * **Web (Angular)**: Use the `| translate` pipe in templates (e.g. `{{ 'nav.console_dashboard' | translate }}` or `[placeholder]="'shell.search_placeholder' | translate"`). In standalone components, always import `TranslatePipe` in the component's `imports: [...]` array.
    * **Desktop & Mobile (Flutter)**: Use the reactive Riverpod translation extension (e.g. `'btn.update_password'.tr(ref, fallback: 'Update Password')` or `context.trc('token')`).
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
