using System;

namespace Ozikol.Central.Configuration;

/// <summary>
/// Configuration parameters controlling automated real-time email crash notifications.
/// Bound from appsettings.json or .env configuration.
/// </summary>
public class ErrorAlertSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "ErrorAlertSettings";

    /// <summary>
    /// Gets or sets a value indicating whether critical unhandled server crashes should trigger instant email alerts.
    /// </summary>
    public bool EnableEmailAlerts { get; set; } = true;

    /// <summary>
    /// Gets or sets one or more recipient administrator email addresses (comma or semicolon separated).
    /// Defaults to "superadmin@ozikol.cloud".
    /// </summary>
    public string RecipientEmails { get; set; } = "superadmin@ozikol.cloud";

    /// <summary>
    /// Gets or sets the deduplication cooldown interval in minutes to prevent flooding on identical repeating exceptions.
    /// Defaults to 5 minutes.
    /// </summary>
    public int CooldownMinutes { get; set; } = 5;
}
