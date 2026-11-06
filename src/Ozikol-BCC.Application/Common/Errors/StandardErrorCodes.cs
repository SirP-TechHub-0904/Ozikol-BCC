using System;
using System.Collections.Generic;
using System.Linq;

namespace Ozikol_BCC.Application.Common.Errors;

/// <summary>
/// Represents a single standardized error code definition in the Ozikol BCC Error Catalog.
/// </summary>
public sealed class StandardErrorDefinition
{
    /// <summary>
    /// Gets or sets the standardized error code (e.g., "ERR-3001").
    /// </summary>
    public string Code { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the functional category of the error code.
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the short, user-friendly Custom Error message shown to the client.
    /// </summary>
    public string CustomError { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the plain-language explanation and recommended action shown on the Client Admin Error Codes reference page.
    /// </summary>
    public string Meaning { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the default HTTP status code associated with this error.
    /// </summary>
    public int DefaultHttpStatus { get; init; } = 400;
}

/// <summary>
/// Central registry of all standardized error codes ("ERR-1000" through "ERR-9999") across the Ozikol Business Command Center.
/// Ensures clients only ever receive a clean CustomError + ErrorCode while Central records the full RealError.
/// </summary>
public static class StandardErrorCodes
{
    // ── Authentication & Identity (ERR-1000 – ERR-1999) ──
    public const string InvalidCredentials = "ERR-1001";
    public const string SessionExpired = "ERR-1002";
    public const string AccessDenied = "ERR-1003";
    public const string TwoFactorFailed = "ERR-1004";
    public const string AccountSuspended = "ERR-1005";
    public const string PasswordPolicyFailed = "ERR-1006";

    // ── Validation & Request Data (ERR-2000 – ERR-2999) ──
    public const string InvalidRequestData = "ERR-2001";
    public const string RequiredFieldMissing = "ERR-2002";
    public const string DuplicateRecord = "ERR-2003";
    public const string RecordNotFound = "ERR-2004";
    public const string InvalidOperationState = "ERR-2005";
    public const string SaveOperationFailed = "ERR-2006";

    // ── Billing, Checkout & Payment Gateways (ERR-3000 – ERR-3999) ──
    public const string PaystackUnavailable = "ERR-3001";
    public const string FlutterwaveUnavailable = "ERR-3002";
    public const string StripeUnavailable = "ERR-3003";
    public const string PaymentVerificationFailed = "ERR-3004";
    public const string InvoiceUnavailable = "ERR-3005";
    public const string PaymentGatewayNotEnabled = "ERR-3006";
    public const string SubscriptionUpdateFailed = "ERR-3007";

    // ── Workspace, Tenant & Capabilities (ERR-4000 – ERR-4999) ──
    public const string WorkspaceNotFound = "ERR-4001";
    public const string WorkspaceSuspended = "ERR-4002";
    public const string CapabilityNotActive = "ERR-4003";
    public const string QuotaLimitReached = "ERR-4004";
    public const string WorkspaceProvisioningFailed = "ERR-4005";

    // ── Communications, Media & AI Studio (ERR-5000 – ERR-5999) ──
    public const string EmailDispatchFailed = "ERR-5001";
    public const string SmsDispatchFailed = "ERR-5002";
    public const string AiAssistantUnavailable = "ERR-5003";
    public const string MediaUploadFailed = "ERR-5004";

    // ── System & Infrastructure (ERR-9000 – ERR-9999) ──
    public const string ServiceUnavailable = "ERR-9001";
    public const string RequestTimeout = "ERR-9002";
    public const string RateLimitExceeded = "ERR-9003";
    public const string UnexpectedError = "ERR-9999";

    private static readonly IReadOnlyList<StandardErrorDefinition> _catalog = new List<StandardErrorDefinition>
    {
        // Authentication & Identity
        new()
        {
            Code = InvalidCredentials,
            Category = "Authentication & Identity",
            CustomError = "Invalid credentials.",
            Meaning = "The email, username, or password entered is incorrect. Verify your login details and try again.",
            DefaultHttpStatus = 401
        },
        new()
        {
            Code = SessionExpired,
            Category = "Authentication & Identity",
            CustomError = "Session expired. Please sign in again.",
            Meaning = "Your authentication session has timed out or been signed out. Sign in again to continue.",
            DefaultHttpStatus = 401
        },
        new()
        {
            Code = AccessDenied,
            Category = "Authentication & Identity",
            CustomError = "Access denied.",
            Meaning = "Your account does not have permission to perform this action. Contact your workspace administrator.",
            DefaultHttpStatus = 403
        },
        new()
        {
            Code = TwoFactorFailed,
            Category = "Authentication & Identity",
            CustomError = "Two-factor verification failed.",
            Meaning = "The security verification code entered is invalid or has expired. Request a new code and try again.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = AccountSuspended,
            Category = "Authentication & Identity",
            CustomError = "Account locked or suspended.",
            Meaning = "This user account is currently restricted or deactivated. Contact your workspace administrator.",
            DefaultHttpStatus = 403
        },
        new()
        {
            Code = PasswordPolicyFailed,
            Category = "Authentication & Identity",
            CustomError = "Password policy requirements not met.",
            Meaning = "The password provided does not meet the workspace security complexity requirements.",
            DefaultHttpStatus = 400
        },

        // Validation & Request Data
        new()
        {
            Code = InvalidRequestData,
            Category = "Validation & Request Data",
            CustomError = "Invalid request data.",
            Meaning = "One or more fields in your submission contain invalid values. Review the form fields and try again.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = RequiredFieldMissing,
            Category = "Validation & Request Data",
            CustomError = "Required information is missing.",
            Meaning = "Mandatory fields were left blank. Complete all required fields before submitting.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = DuplicateRecord,
            Category = "Validation & Request Data",
            CustomError = "Duplicate record detected.",
            Meaning = "A record with the same unique identifier, email, or code already exists in your workspace.",
            DefaultHttpStatus = 409
        },
        new()
        {
            Code = RecordNotFound,
            Category = "Validation & Request Data",
            CustomError = "Requested record not found.",
            Meaning = "The item you are attempting to view, update, or delete could not be found.",
            DefaultHttpStatus = 404
        },
        new()
        {
            Code = InvalidOperationState,
            Category = "Validation & Request Data",
            CustomError = "Operation not allowed in current state.",
            Meaning = "This action cannot be completed because of the item's current status or linked dependencies.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = SaveOperationFailed,
            Category = "Validation & Request Data",
            CustomError = "Save operation failed.",
            Meaning = "The changes could not be saved at this time. Review your inputs and try again.",
            DefaultHttpStatus = 400
        },

        // Billing, Checkout & Payment Gateways
        new()
        {
            Code = PaystackUnavailable,
            Category = "Billing & Payments",
            CustomError = "Paystack unavailable.",
            Meaning = "The Paystack payment channel is temporarily unavailable. Please select another payment method or try again later.",
            DefaultHttpStatus = 502
        },
        new()
        {
            Code = FlutterwaveUnavailable,
            Category = "Billing & Payments",
            CustomError = "Flutterwave unavailable.",
            Meaning = "The Flutterwave payment channel is temporarily unavailable. Please select another payment method or try again later.",
            DefaultHttpStatus = 502
        },
        new()
        {
            Code = StripeUnavailable,
            Category = "Billing & Payments",
            CustomError = "Stripe unavailable.",
            Meaning = "The Stripe payment channel is temporarily unavailable. Please select another payment method or try again later.",
            DefaultHttpStatus = 502
        },
        new()
        {
            Code = PaymentVerificationFailed,
            Category = "Billing & Payments",
            CustomError = "Payment verification failed.",
            Meaning = "We could not confirm the payment status with the payment provider. If debited, please contact support with your invoice number.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = InvoiceUnavailable,
            Category = "Billing & Payments",
            CustomError = "Invoice unavailable.",
            Meaning = "The requested invoice could not be found or is no longer eligible for payment.",
            DefaultHttpStatus = 404
        },
        new()
        {
            Code = PaymentGatewayNotEnabled,
            Category = "Billing & Payments",
            CustomError = "Payment gateway not enabled.",
            Meaning = "The selected payment method is not enabled for this workspace.",
            DefaultHttpStatus = 400
        },
        new()
        {
            Code = SubscriptionUpdateFailed,
            Category = "Billing & Payments",
            CustomError = "Subscription update failed.",
            Meaning = "Your feature subscription could not be updated at this time. Please refresh and try again.",
            DefaultHttpStatus = 400
        },

        // Workspace, Tenant & Capabilities
        new()
        {
            Code = WorkspaceNotFound,
            Category = "Workspace & Capabilities",
            CustomError = "Workspace not found.",
            Meaning = "The requested organization workspace could not be resolved. Verify the workspace URL or access code.",
            DefaultHttpStatus = 404
        },
        new()
        {
            Code = WorkspaceSuspended,
            Category = "Workspace & Capabilities",
            CustomError = "Workspace is currently suspended.",
            Meaning = "Access to this organization workspace is temporarily paused. Please contact billing or platform support.",
            DefaultHttpStatus = 403
        },
        new()
        {
            Code = CapabilityNotActive,
            Category = "Workspace & Capabilities",
            CustomError = "Capability not active.",
            Meaning = "This modular feature is not currently active on your workspace plan. Activate it in Workspace Features & Capabilities.",
            DefaultHttpStatus = 403
        },
        new()
        {
            Code = QuotaLimitReached,
            Category = "Workspace & Capabilities",
            CustomError = "Workspace quota limit reached.",
            Meaning = "Your organization has reached the maximum allowance for this resource.",
            DefaultHttpStatus = 429
        },
        new()
        {
            Code = WorkspaceProvisioningFailed,
            Category = "Workspace & Capabilities",
            CustomError = "Workspace provisioning failed.",
            Meaning = "The workspace setup encountered an interruption. Please retry in a few moments.",
            DefaultHttpStatus = 500
        },

        // Communications, Media & AI Studio
        new()
        {
            Code = EmailDispatchFailed,
            Category = "Communications & AI",
            CustomError = "Email dispatch failed.",
            Meaning = "The email notification could not be queued or delivered at this time.",
            DefaultHttpStatus = 502
        },
        new()
        {
            Code = SmsDispatchFailed,
            Category = "Communications & AI",
            CustomError = "SMS dispatch failed.",
            Meaning = "The SMS alert could not be dispatched. Verify the recipient phone number format.",
            DefaultHttpStatus = 502
        },
        new()
        {
            Code = AiAssistantUnavailable,
            Category = "Communications & AI",
            CustomError = "AI assistant temporarily unavailable.",
            Meaning = "The Ozi AI Studio service is currently busy or unreachable. Please try your prompt again shortly.",
            DefaultHttpStatus = 503
        },
        new()
        {
            Code = MediaUploadFailed,
            Category = "Communications & AI",
            CustomError = "Media upload failed.",
            Meaning = "The file could not be uploaded. Ensure the file format and size meet workspace guidelines.",
            DefaultHttpStatus = 400
        },

        // System & Infrastructure
        new()
        {
            Code = ServiceUnavailable,
            Category = "System & Infrastructure",
            CustomError = "Service temporarily unavailable.",
            Meaning = "A background service required for this action is temporarily unreachable. Please try again shortly.",
            DefaultHttpStatus = 503
        },
        new()
        {
            Code = RequestTimeout,
            Category = "System & Infrastructure",
            CustomError = "Request timed out.",
            Meaning = "The operation took longer than expected to respond. Check your connection and try again.",
            DefaultHttpStatus = 504
        },
        new()
        {
            Code = RateLimitExceeded,
            Category = "System & Infrastructure",
            CustomError = "Too many requests. Please slow down.",
            Meaning = "Rate limit exceeded for this action. Wait a moment before retrying.",
            DefaultHttpStatus = 429
        },
        new()
        {
            Code = UnexpectedError,
            Category = "System & Infrastructure",
            CustomError = "An unexpected error occurred.",
            Meaning = "An unexpected system error prevented this request from completing. Reference the error code if contacting support.",
            DefaultHttpStatus = 500
        }
    };

    private static readonly IReadOnlyDictionary<string, StandardErrorDefinition> _byCode =
        _catalog.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gets the complete read-only list of standardized error code definitions.
    /// </summary>
    public static IReadOnlyList<StandardErrorDefinition> GetAll() => _catalog;

    /// <summary>
    /// Looks up a standard error definition by its code (e.g., "ERR-3001").
    /// Falls back to <see cref="UnexpectedError"/> ("ERR-9999") if not found.
    /// </summary>
    /// <param name="errorCode">The error code to resolve.</param>
    /// <returns>The matching <see cref="StandardErrorDefinition"/>.</returns>
    public static StandardErrorDefinition GetByCode(string? errorCode)
    {
        if (!string.IsNullOrWhiteSpace(errorCode) && _byCode.TryGetValue(errorCode.Trim(), out var def))
        {
            return def;
        }

        return _byCode[UnexpectedError];
    }

    /// <summary>
    /// Resolves the appropriate <see cref="StandardErrorDefinition"/> and sanitized client CustomError
    /// from an endpoint path, HTTP status code, and raw/controller message.
    /// </summary>
    /// <param name="endpoint">The request path (e.g., "/api/billing/invoices/123/paystack/initialize").</param>
    /// <param name="httpStatusCode">The HTTP status code.</param>
    /// <param name="rawMessage">The controller message or raw exception message.</param>
    /// <param name="explicitErrorCode">An optional explicit error code if already specified by the caller.</param>
    /// <returns>A tuple containing the resolved <see cref="StandardErrorDefinition"/>, the sanitized client CustomError, and the full RealError.</returns>
    public static (StandardErrorDefinition Definition, string CustomError, string RealError) ResolveError(
        string? endpoint,
        int httpStatusCode,
        string? rawMessage,
        string? explicitErrorCode = null)
    {
        var path = (endpoint ?? string.Empty).ToLowerInvariant();
        var msg = (rawMessage ?? string.Empty).Trim();
        var msgLower = msg.ToLowerInvariant();

        StandardErrorDefinition def;

        if (!string.IsNullOrWhiteSpace(explicitErrorCode) && _byCode.TryGetValue(explicitErrorCode.Trim(), out var explicitDef))
        {
            def = explicitDef;
        }
        else if (msgLower.Contains("paystack") || path.Contains("/paystack"))
        {
            def = _byCode[PaystackUnavailable];
        }
        else if (msgLower.Contains("flutterwave") || path.Contains("/flutterwave"))
        {
            def = _byCode[FlutterwaveUnavailable];
        }
        else if (msgLower.Contains("stripe") || path.Contains("/stripe"))
        {
            def = _byCode[StripeUnavailable];
        }
        else if (path.Contains("/billing/invoices") && (httpStatusCode == 404 || msgLower.Contains("invoice not found")))
        {
            def = _byCode[InvoiceUnavailable];
        }
        else if (path.Contains("/billing") && msgLower.Contains("verif"))
        {
            def = _byCode[PaymentVerificationFailed];
        }
        else if (path.Contains("/billing") && (msgLower.Contains("not enabled") || msgLower.Contains("not configured")))
        {
            def = _byCode[PaymentGatewayNotEnabled];
        }
        else if (path.Contains("/billing"))
        {
            def = _byCode[SubscriptionUpdateFailed];
        }
        else if (httpStatusCode == 401 || msgLower.Contains("invalid credentials") || msgLower.Contains("invalid email or password"))
        {
            def = msgLower.Contains("expired") || msgLower.Contains("token")
                ? _byCode[SessionExpired]
                : _byCode[InvalidCredentials];
        }
        else if (httpStatusCode == 403 || msgLower.Contains("forbidden") || msgLower.Contains("access denied"))
        {
            def = msgLower.Contains("suspended")
                ? _byCode[WorkspaceSuspended]
                : _byCode[AccessDenied];
        }
        else if (httpStatusCode == 404 || msgLower.Contains("not found"))
        {
            def = path.Contains("tenant") || path.Contains("workspace")
                ? _byCode[WorkspaceNotFound]
                : _byCode[RecordNotFound];
        }
        else if (httpStatusCode == 409 || msgLower.Contains("already exists") || msgLower.Contains("duplicate"))
        {
            def = _byCode[DuplicateRecord];
        }
        else if (msgLower.Contains("database") || msgLower.Contains("save failed") || msgLower.Contains("failed to save") || msgLower.Contains("persist"))
        {
            def = _byCode[SaveOperationFailed];
        }
        else if (httpStatusCode == 429 || msgLower.Contains("rate limit") || msgLower.Contains("too many requests"))
        {
            def = _byCode[RateLimitExceeded];
        }
        else if (httpStatusCode == 504 || msgLower.Contains("timeout") || msgLower.Contains("timed out"))
        {
            def = _byCode[RequestTimeout];
        }
        else if (path.Contains("/ai") || msgLower.Contains("gemini") || msgLower.Contains("deepseek"))
        {
            def = _byCode[AiAssistantUnavailable];
        }
        else if (httpStatusCode >= 500)
        {
            def = _byCode[UnexpectedError];
        }
        else
        {
            def = _byCode[InvalidRequestData];
        }

        // Determine if rawMessage is safe to show as CustomError or if it contains internal/gateway details
        bool isSensitiveOrRaw =
            string.IsNullOrWhiteSpace(msg) ||
            httpStatusCode >= 500 ||
            msgLower.Contains("database") ||
            msgLower.Contains("dbcontext") ||
            msgLower.Contains("sql") ||
            msgLower.Contains("table") ||
            msgLower.Contains("column") ||
            msgLower.Contains("entity") ||
            msgLower.Contains("save to") ||
            msgLower.Contains("cloudinary") ||
            msgLower.Contains("exception") ||
            msgLower.Contains("deactivated") ||
            msgLower.Contains("stacktrace") ||
            msgLower.Contains("inner exception") ||
            msgLower.Contains("http ") ||
            msgLower.Contains("paystack:") ||
            msgLower.Contains("flutterwave:") ||
            msgLower.Contains("stripe:") ||
            msgLower.Contains("connection string") ||
            msgLower.Contains("nullreference") ||
            msg.Length > 160;

        string customError = isSensitiveOrRaw ? def.CustomError : msg;
        string realError = string.IsNullOrWhiteSpace(msg) ? def.CustomError : msg;

        return (def, customError, realError);
    }
}

