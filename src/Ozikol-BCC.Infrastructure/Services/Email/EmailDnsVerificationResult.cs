using System;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Diagnostic report for a single email DNS record verification probe.
/// </summary>
public sealed class EmailDnsVerificationResult
{
    /// <summary>
    /// Gets or sets the custom domain queried.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the DNS record type (e.g. "MX", "TXT").
    /// </summary>
    public string RecordType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the email record subtype (e.g. "MX", "SPF", "DKIM", "DMARC").
    /// </summary>
    public string SubType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the exact hostname queried in public DNS.
    /// </summary>
    public string QueryHost { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expected record target or content.
    /// </summary>
    public string ExpectedValue { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the detected record content from public DNS resolvers.
    /// </summary>
    public string DetectedValue { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the record is verified and matching.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Gets or sets a descriptive message explaining the verification status.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

