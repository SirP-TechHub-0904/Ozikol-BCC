using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Recaptcha;

/// <summary>
/// Provides dynamically resolved Google reCAPTCHA credentials from central platform storage.
/// </summary>
public interface IRecaptchaCredentialProvider
{
    /// <summary>
    /// Resolves the configured Google reCAPTCHA SiteKey and SecretKey pair, if present.
    /// </summary>
    /// <returns>A tuple containing the configured <c>SiteKey</c> and <c>SecretKey</c>, or nulls if unconfigured.</returns>
    (string? SiteKey, string? SecretKey) GetCredentials();
}

/// <summary>
/// Service contract for validating Google reCAPTCHA challenges submitted from public forms.
/// </summary>
public interface IRecaptchaService
{
    /// <summary>
    /// Gets the public Google reCAPTCHA site key for client widget rendering.
    /// </summary>
    string SiteKey { get; }

    /// <summary>
    /// Validates the token returned by the Google reCAPTCHA widget.
    /// </summary>
    /// <param name="recaptchaResponse">The response token string from the g-recaptcha-response form parameter.</param>
    /// <param name="remoteIp">Optional client remote IP address.</param>
    /// <returns>True if verification succeeds; otherwise false.</returns>
    Task<bool> ValidateTokenAsync(string? recaptchaResponse, string? remoteIp = null);
}
