using System;
using System.Text.RegularExpressions;

namespace Ozikol_BCC.Application.Common
{
    /// <summary>
    /// Robust utility for normalizing, sanitizing, and matching international and local phone numbers
    /// across different formats (+234, +44, +1, local trunk 080/090/07, spaces, dashes, parentheses).
    /// </summary>
    public static class PhoneNumberNormalizer
    {
        private static readonly Regex NonDigitRegex = new(@"[^\d+]", RegexOptions.Compiled);
        private static readonly Regex DigitsOnlyRegex = new(@"[^\d]", RegexOptions.Compiled);

        /// <summary>
        /// Normalizes an input phone number into canonical international E.164 format (e.g. +2348031234567).
        /// Handles local trunk prefixes (080, 090, 070, 081, 091, 07xxx) and country code variations.
        /// </summary>
        /// <param name="phone">Raw phone string from user input or external payload.</param>
        /// <param name="defaultCountryOrCurrency">Optional tenant currency or ISO country (e.g. "NGN", "GBP", "USD").</param>
        /// <returns>Canonical E.164 phone string (e.g. +2348031234567) or cleaned digits.</returns>
        public static string Normalize(string? phone, string? defaultCountryOrCurrency = null)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                return string.Empty;
            }

            // 1. Remove all spaces, dashes, dots, parentheses, and noise characters
            var clean = NonDigitRegex.Replace(phone.Trim(), string.Empty);
            if (string.IsNullOrEmpty(clean)) return string.Empty;

            // 2. Handle international prefix '00' (e.g. 00234803... -> +234803...)
            if (clean.StartsWith("00", StringComparison.Ordinal))
            {
                clean = "+" + clean[2..];
            }

            // 3. If already begins with '+', keep standard E.164
            if (clean.StartsWith("+", StringComparison.Ordinal))
            {
                return clean;
            }

            var digitsOnly = DigitsOnlyRegex.Replace(clean, string.Empty);

            // 4. Auto-detect common country codes provided without the '+' prefix
            // Nigeria: 234 followed by 10 digits (13 digits total)
            if (digitsOnly.StartsWith("234", StringComparison.Ordinal) && digitsOnly.Length == 13)
            {
                return "+" + digitsOnly;
            }

            // United Kingdom: 44 followed by 10 digits (12 digits total)
            if (digitsOnly.StartsWith("44", StringComparison.Ordinal) && digitsOnly.Length == 12)
            {
                return "+" + digitsOnly;
            }

            // North America (US/CA): 1 followed by 10 digits (11 digits total)
            if (digitsOnly.StartsWith("1", StringComparison.Ordinal) && digitsOnly.Length == 11)
            {
                return "+" + digitsOnly;
            }

            // 5. Handle local trunk zero '0' prefixes (e.g. 080..., 090..., 070..., 081..., 091...)
            if (digitsOnly.StartsWith("0", StringComparison.Ordinal))
            {
                var nationalPart = digitsOnly[1..];

                // Nigerian mobile prefixes (080, 081, 090, 091, 070, 071) -> 11 digits total
                if (digitsOnly.Length == 11 &&
                    (digitsOnly.StartsWith("080", StringComparison.Ordinal) ||
                     digitsOnly.StartsWith("081", StringComparison.Ordinal) ||
                     digitsOnly.StartsWith("090", StringComparison.Ordinal) ||
                     digitsOnly.StartsWith("091", StringComparison.Ordinal) ||
                     digitsOnly.StartsWith("070", StringComparison.Ordinal) ||
                     digitsOnly.StartsWith("071", StringComparison.Ordinal)))
                {
                    return "+234" + nationalPart;
                }

                // UK mobile prefixes (07xxx) -> 11 digits total
                if (digitsOnly.Length == 11 && digitsOnly.StartsWith("07", StringComparison.Ordinal) &&
                    string.Equals(defaultCountryOrCurrency, "GBP", StringComparison.OrdinalIgnoreCase))
                {
                    return "+44" + nationalPart;
                }

                // Default country or currency fallback
                if (string.Equals(defaultCountryOrCurrency, "NGN", StringComparison.OrdinalIgnoreCase) && digitsOnly.Length == 11)
                {
                    return "+234" + nationalPart;
                }
                if (string.Equals(defaultCountryOrCurrency, "GBP", StringComparison.OrdinalIgnoreCase) && digitsOnly.Length == 11)
                {
                    return "+44" + nationalPart;
                }
            }

            // 6. 10-digit numbers without trunk zero (US/CA local format e.g. 5551234567)
            if (digitsOnly.Length == 10 && (string.Equals(defaultCountryOrCurrency, "USD", StringComparison.OrdinalIgnoreCase) || string.Equals(defaultCountryOrCurrency, "CAD", StringComparison.OrdinalIgnoreCase)))
            {
                return "+1" + digitsOnly;
            }

            // Fallback: Return cleanly stripped digits with leading '+' if length suggests international
            return digitsOnly.Length >= 11 && !digitsOnly.StartsWith("0", StringComparison.Ordinal)
                ? "+" + digitsOnly
                : digitsOnly;
        }

        /// <summary>
        /// Extracts the core significant national digits (the trailing 8 to 10 digits)
        /// used for invariant duplicate detection across different country-code variations.
        /// </summary>
        /// <example>
        /// +2348031234567 -> "8031234567"
        /// 08031234567    -> "8031234567"
        /// 2348031234567  -> "8031234567"
        /// </example>
        public static string GetSignificantDigits(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;

            var digits = DigitsOnlyRegex.Replace(phone, string.Empty);
            if (digits.Length <= 10)
            {
                // If it starts with trunk '0', strip it for 10-digit national number
                return digits.StartsWith("0", StringComparison.Ordinal) && digits.Length > 1
                    ? digits[1..]
                    : digits;
            }

            // For international numbers with country codes (+234..., +44...),
            // the trailing 10 digits represent the unique national subscriber number.
            return digits[^10..];
        }

        /// <summary>
        /// Evaluates whether two phone numbers represent the exact same physical line,
        /// even if one uses a local trunk (080...) and the other uses an international code (+23480...).
        /// </summary>
        public static bool AreEquivalent(string? phone1, string? phone2, string? defaultCountryOrCurrency = null)
        {
            if (string.IsNullOrWhiteSpace(phone1) || string.IsNullOrWhiteSpace(phone2)) return false;

            // Direct match
            if (string.Equals(phone1.Trim(), phone2.Trim(), StringComparison.OrdinalIgnoreCase)) return true;

            // Normalized E.164 match
            var norm1 = Normalize(phone1, defaultCountryOrCurrency);
            var norm2 = Normalize(phone2, defaultCountryOrCurrency);
            if (!string.IsNullOrEmpty(norm1) && string.Equals(norm1, norm2, StringComparison.OrdinalIgnoreCase)) return true;

            // Significant national digits match
            var sig1 = GetSignificantDigits(phone1);
            var sig2 = GetSignificantDigits(phone2);
            return sig1.Length >= 8 && string.Equals(sig1, sig2, StringComparison.Ordinal);
        }
    }
}
