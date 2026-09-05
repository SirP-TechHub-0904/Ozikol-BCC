using System.Threading.Tasks;

namespace Ozikol.Central.Services;

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
    /// <returns>True if verification succeeds or passes development mock; otherwise false.</returns>
    Task<bool> ValidateTokenAsync(string? recaptchaResponse, string? remoteIp = null);
}
