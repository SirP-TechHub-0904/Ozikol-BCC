using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Contract for 6-digit cryptographic OTP generation, email/SMS dispatch, and verification.
    /// </summary>
    public interface IOtpVerificationService
    {
        /// <summary>
        /// Generates a 6-digit numeric OTP for email confirmation and sends it via email (throttled to 60s cooldown).
        /// </summary>
        Task<(bool Success, string Message, int RetryAfterSeconds)> SendEmailOtpAsync(string userId, string email);

        /// <summary>
        /// Verifies a 6-digit email OTP and marks EmailConfirmed = true if valid (locks out after 3 failed tries).
        /// </summary>
        Task<(bool Success, string Message)> VerifyEmailOtpAsync(string userId, string otpCode);

        /// <summary>
        /// Generates a 6-digit numeric OTP for phone verification and queues an SMS message (throttled to 60s cooldown).
        /// </summary>
        Task<(bool Success, string Message, int RetryAfterSeconds)> SendPhoneOtpAsync(string userId, string phoneNumber);

        /// <summary>
        /// Verifies a 6-digit phone OTP and marks PhoneNumberConfirmed = true if valid (locks out after 3 failed tries).
        /// </summary>
        Task<(bool Success, string Message)> VerifyPhoneOtpAsync(string userId, string otpCode);
    }
}
