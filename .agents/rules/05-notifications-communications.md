# Notifications, Communications & Email Deliverability (Ozikol-BCC)

---

## 6. Email Deliverability, Spam Protection & Real-Time Blacklist Validation (Mandatory)
* **Anti-Spam Keyword Blacklist & Highlighting**: Whenever programming or implementing email composition, broadcast, template editors, or newsletter features (in UI or backend):
  * **Real-Time As-You-Type Warnings**: Provide real-time client-side analysis that scans and visually highlights spam triggers as the user types (e.g. in subject lines and message bodies).
  * **ALL CAPS Subject Line Warning**: Detect and flag subject lines written in ALL CAPS (e.g., `URGENT! CLAIM YOUR ACCOUNT NOW!!!`) with a spam deliverability alert.
  * **Spam Trigger Words & Phrases**: Maintain an active blacklist of high-risk spam words/phrases (e.g., `100% Free`, `Earn Money Fast`, `No Risk`, `Act Now`, `Guaranteed Return`, `Click Here Now`, `Winner`, `Risk Free`, `Double Your Cash`, `Million Dollars`) and display intuitive warnings/suggestions.
  * **Image-to-Text Ratio**: Warn the author if an email is image-heavy with negligible text content, which triggers SpamAssassin filters and hurts sender reputation.
  * **Suspicious & Shortened Links**: Detect and warn against URL shorteners (e.g., `bit.ly`, `tinyurl`) or unencrypted HTTP links inside email bodies to safeguard domain sender reputation across mailbox providers (Gmail, Yahoo, Outlook).

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
  * **Localization in Notifications & Toasts**: All in-app notifications, toast alerts, and audit activity descriptions MUST consider multi-language translation (`TranslationService` / `TranslatePipe` / `translateDynamic` on Web, `.tr(ref)` on Flutter).
  * **Future Feature Mandate**: All future features, modules, and administrative workflows MUST proactively identify high-impact actions and implement corresponding notification dispatches as part of their initial delivery.

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
