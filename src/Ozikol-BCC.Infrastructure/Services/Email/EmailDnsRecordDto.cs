using System;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// DNS record configuration and live verification state for tenant custom domain email routing.
/// </summary>
public sealed class EmailDnsRecordDto
{
    /// <summary>
    /// Gets or sets the DNS record type (e.g. "MX" or "TXT").
    /// </summary>
    public string RecordType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the functional category (e.g. "MX", "SPF", "DKIM", or "DMARC").
    /// </summary>
    public string SubType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the hostname/name where this record must be placed (e.g. "@", "dkim._domainkey", "_dmarc").
    /// </summary>
    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expected target value or record content.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the MX record priority (e.g. 10 for MX records; 0 for TXT).
    /// </summary>
    public int Priority { get; set; }

    /// <summary>
    /// Gets or sets the recommended TTL (e.g. "Auto (300s)").
    /// </summary>
    public string Ttl { get; set; } = "Auto (300s)";

    /// <summary>
    /// Gets or sets explanatory guidance on the record's purpose.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether public DNS currently resolves and verifies this record.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Gets or sets the actual detected value resolved from public DNS.
    /// </summary>
    public string? DetectedValue { get; set; }

    /// <summary>
    /// Gets or sets a unique client lookup key for copy and UI tracking.
    /// </summary>
    public string Key { get; set; } = string.Empty;
}

