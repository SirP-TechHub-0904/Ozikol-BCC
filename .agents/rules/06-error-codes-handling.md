---
trigger: always_on
---

# Rules: Standardized API Error Codes, Custom Error vs. Real Error Isolation

## 1. Core Architectural Principle
Every non-success API response (`IsSuccess == false` or `HTTP >= 400`) across the Ozikol Business Command Center MUST strictly separate what the **Client/Tenant** sees from what **Central Administration** sees:

1. **Client / Tenant Response (`ApiResponse<T>`)**:
   - Sees ONLY:
     - `errorCode`: Standard Error Code (`ERR-XXXX`, e.g., `ERR-3001`)
     - `message`: Simple, translated **Custom Error** (e.g., `"Paystack unavailable."`)
     - `traceId`: Correlation ID
   - **NEVER** receives the `RealError` (`[JsonIgnore]`), raw third-party gateway errors (e.g., `"Paystack: Integration has been deactivated"`), database/SQL exceptions, or stack traces.
2. **Client Admin Error Reference (`/identity/console/error-codes` under Audit Logs)**:
   - Displays the searchable catalog of **Standard Error Codes (`ERR-XXXX`)** and their **Meaning / Recommended Action** (translated via `TranslationService`).
   - Never displays `RealError` or internal system logs.
3. **Central Admin Error Telemetry (`/centralwks/error-logs` & `/centralwks/tenants/details`)**:
   - Exclusively for Central administrators.
   - Displays **Error Code + Custom Error + Real Error + Stack Trace + Endpoint + User + IP**.
   - Organized into three clear views in `/centralwks/error-logs`:
     1. **By Tenant**: Grouped per Tenant organization (`MasterTenantCatalogId` / `TenantKey`) with one-click drill-down into a specific tenant's errors (also accessible inside `/centralwks/tenants/details?id={id}`).
     2. **By Central**: Errors occurring on Central/Platform or unauthenticated endpoints without a tenant workspace context.
     3. **All Tenant List**: Complete chronological error feed across all tenant workspaces with tenant filter, error code filter, and trace search.

---

## 2. Standard Error Code Catalog (`ERR-1000` – `ERR-9999`)

### Authentication & Identity (`ERR-1000` – `ERR-1999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-1001` | `Invalid credentials.` | The email, username, or password entered is incorrect. Verify your credentials and try again. |
| `ERR-1002` | `Session expired. Please sign in again.` | Your authentication session has timed out or been revoked. Sign in again to continue. |
| `ERR-1003` | `Access denied.` | Your account does not have sufficient permissions to perform this action. Contact your workspace administrator. |
| `ERR-1004` | `Two-factor verification failed.` | The security verification code entered is invalid or expired. Request a new code and try again. |
| `ERR-1005` | `Account locked or suspended.` | This user account is currently restricted. Contact your workspace administrator for assistance. |
| `ERR-1006` | `Password policy not met.` | The provided password does not satisfy security complexity requirements. |

### Validation & Request Data (`ERR-2000` – `ERR-2999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-2001` | `Invalid request data.` | One or more fields in your submission contain invalid values. Review the highlighted fields and try again. |
| `ERR-2002` | `Required information is missing.` | Mandatory fields were left blank. Complete all required fields before submitting. |
| `ERR-2003` | `Duplicate record detected.` | A record with the same unique identifier, email, or code already exists in your workspace. |
| `ERR-2004` | `Requested record not found.` | The item you are trying to view or update no longer exists or has been removed. |
| `ERR-2005` | `Operation not allowed in current state.` | This item cannot be modified or deleted because of its current status or linked dependencies. |

### Billing, Checkout & Payment Gateways (`ERR-3000` – `ERR-3999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-3001` | `Paystack unavailable.` | The Paystack payment channel is temporarily unavailable. Please select another payment method or try again later. |
| `ERR-3002` | `Flutterwave unavailable.` | The Flutterwave payment channel is temporarily unavailable. Please select another payment method or try again later. |
| `ERR-3003` | `Stripe unavailable.` | The Stripe payment channel is temporarily unavailable. Please select another payment method or try again later. |
| `ERR-3004` | `Payment verification failed.` | We could not confirm the payment status with the payment provider. If debited, please contact support with your invoice number. |
| `ERR-3005` | `Invoice unavailable.` | The requested invoice could not be loaded or is not eligible for payment. |
| `ERR-3006` | `Payment gateway not enabled.` | The selected payment method is not enabled for this workspace. |
| `ERR-3007` | `Subscription update failed.` | Your feature subscription could not be updated at this time. Please refresh and try again. |

### Workspace, Tenant & Capabilities (`ERR-4000` – `ERR-4999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-4001` | `Workspace not found.` | The requested organization workspace could not be resolved. Verify the workspace URL or access code. |
| `ERR-4002` | `Workspace is currently suspended.` | Access to this organization workspace is temporarily paused. Please contact billing or platform support. |
| `ERR-4003` | `Capability not active.` | This modular feature is not currently active on your workspace plan. Activate it in Workspace Features & Capabilities. |
| `ERR-4004` | `Workspace quota limit reached.` | Your organization has reached the maximum allowance for this resource. |
| `ERR-4005` | `Workspace provisioning failed.` | The workspace setup encountered an interruption. Please retry in a few moments. |

### Communications, Media & AI Studio (`ERR-5000` – `ERR-5999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-5001` | `Email dispatch failed.` | The email notification could not be queued or delivered at this time. |
| `ERR-5002` | `SMS dispatch failed.` | The SMS alert could not be dispatched. Verify recipient phone number format. |
| `ERR-5003` | `AI assistant temporarily unavailable.` | The Ozi AI Studio service is currently busy or unreachable. Please try your prompt again shortly. |
| `ERR-5004` | `Media upload failed.` | The file could not be uploaded. Ensure the file format and size meet workspace guidelines. |

### System & Infrastructure (`ERR-9000` – `ERR-9999`)
| Error Code | Custom Error (Client Message) | Meaning & Recommended Action |
| :--- | :--- | :--- |
| `ERR-9001` | `Service temporarily unavailable.` | A background service required for this action is temporarily unreachable. Please try again shortly. |
| `ERR-9002` | `Request timed out.` | The operation took longer than expected to respond. Check your connection and try again. |
| `ERR-9003` | `Too many requests. Please slow down.` | Rate limit exceeded for this action. Wait a moment before retrying. |
| `ERR-9999` | `An unexpected error occurred.` | An unexpected system error prevented this request from completing. Reference the error code if contacting support. |

