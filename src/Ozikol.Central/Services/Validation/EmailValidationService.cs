using System;
using System.Collections.Generic;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace Ozikol.Central.Services.Validation
{
    /// <summary>
    /// Service contract for validating email syntax, legitimate top-level domains (TLDs), and disposable email domain filtering.
    /// </summary>
    public interface IEmailValidationService
    {
        /// <summary>
        /// Validates if an email string has valid RFC syntax, a recognized multi-character TLD, and is not from a disposable email domain.
        /// </summary>
        /// <param name="email">The candidate email address.</param>
        /// <param name="errorMessage">Detailed reason if the candidate email is invalid.</param>
        /// <returns>True if valid and delivery-ready; false otherwise.</returns>
        bool IsValidEmail(string? email, out string? errorMessage);

        /// <summary>
        /// Convenience validator returning boolean validity.
        /// </summary>
        /// <param name="email">The candidate email address.</param>
        /// <returns>True if valid; false otherwise.</returns>
        bool IsValidEmail(string? email);
    }

    /// <summary>
    /// Enterprise email validation service implementing RFC format checks, TLD syntax verification, and disposable email blocklists.
    /// </summary>
    public class EmailValidationService : IEmailValidationService
    {
        // Match standard domain structure: label.tld where tld is 2-24 alphabetic characters
        private static readonly Regex DomainRegex = new(@"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        // Blocklist of popular throwaway / disposable email service domains
        private static readonly HashSet<string> DisposableDomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "mailinator.com",
            "guerrillamail.com",
            "guerrillamail.net",
            "guerrillamail.org",
            "10minutemail.com",
            "10minutemail.net",
            "tempmail.com",
            "temp-mail.org",
            "yopmail.com",
            "yopmail.fr",
            "yopmail.net",
            "trashmail.com",
            "sharklasers.com",
            "dispostable.com",
            "getairmail.com",
            "fakeinbox.com",
            "throwawaymail.com",
            "burnermail.io",
            "nada.ltd",
            "mohmal.com",
            "tempail.com",
            "fakemailgenerator.com",
            "crazymailing.com",
            "mytemp.email"
        };

        /// <inheritdoc />
        public bool IsValidEmail(string? email, out string? errorMessage)
        {
            errorMessage = null;

            if (string.IsNullOrWhiteSpace(email))
            {
                errorMessage = "Email address is required.";
                return false;
            }

            var trimmed = email.Trim();

            // 1. Basic length constraints
            if (trimmed.Length > 254 || trimmed.Length < 6)
            {
                errorMessage = "Email address length is invalid.";
                return false;
            }

            // 2. MailAddress RFC syntax check
            string domain;
            try
            {
                var addr = new MailAddress(trimmed);
                if (addr.Address != trimmed)
                {
                    errorMessage = "Email address syntax is malformed.";
                    return false;
                }
                domain = addr.Host;
            }
            catch
            {
                errorMessage = "Email address format is invalid.";
                return false;
            }

            // 3. Domain and TLD validation (must have valid dots and >= 2 character TLD like .com, .org, not .j)
            if (string.IsNullOrWhiteSpace(domain) || !DomainRegex.IsMatch(domain))
            {
                errorMessage = "Email domain is invalid or contains an unrecognized top-level domain.";
                return false;
            }

            // Reject single-character or numeric top-level domains
            var lastDotIndex = domain.LastIndexOf('.');
            if (lastDotIndex < 0 || domain.Length - lastDotIndex - 1 < 2)
            {
                errorMessage = "Email domain must end with a valid top-level domain (e.g. .com, .org, .io).";
                return false;
            }

            // 4. Disposable temporary domain rejection
            if (DisposableDomains.Contains(domain))
            {
                errorMessage = "Disposable or temporary email addresses are not permitted.";
                return false;
            }

            return true;
        }

        /// <inheritdoc />
        public bool IsValidEmail(string? email)
        {
            return IsValidEmail(email, out _);
        }
    }
}
