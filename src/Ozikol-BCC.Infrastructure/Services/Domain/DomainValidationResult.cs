using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Result of validating a custom domain string against RFC standards and security filters.
/// </summary>
public sealed class DomainValidationResult
{
    /// <summary>
    /// Gets a value indicating whether the domain string is structurally valid and allowed.
    /// </summary>
    public bool IsValid { get; }

    /// <summary>
    /// Gets the sanitized, lowercased, protocol-stripped domain name (e.g., "nightpresssecurity.co.uk").
    /// </summary>
    public string SanitizedDomain { get; }

    /// <summary>
    /// Gets the validation error message if invalid, or null if valid.
    /// </summary>
    public string? ErrorMessage { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="DomainValidationResult"/> class.
    /// </summary>
    /// <param name="isValid">Indicates validity.</param>
    /// <param name="sanitizedDomain">Sanitized domain string.</param>
    /// <param name="errorMessage">Error message if invalid.</param>
    public DomainValidationResult(bool isValid, string sanitizedDomain, string? errorMessage = null)
    {
        IsValid = isValid;
        SanitizedDomain = sanitizedDomain;
        ErrorMessage = errorMessage;
    }

    /// <summary>
    /// Factory for a successful validation result.
    /// </summary>
    /// <param name="sanitizedDomain">The cleaned domain.</param>
    public static DomainValidationResult Success(string sanitizedDomain) =>
        new(true, sanitizedDomain);

    /// <summary>
    /// Factory for a failed validation result.
    /// </summary>
    /// <param name="errorMessage">Description of why the domain is invalid.</param>
    public static DomainValidationResult Failure(string errorMessage) =>
        new(false, string.Empty, errorMessage);
}
