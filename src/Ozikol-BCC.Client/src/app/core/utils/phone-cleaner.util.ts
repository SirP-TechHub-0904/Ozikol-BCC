/**
 * International Phone Number Cleaner & Normalizer Utility.
 * Separates country calling code and national subscriber number,
 * auto-strips duplicate country prefixes on paste, handles optional leading zero '0',
 * and produces unified E.164 canonical phone strings (+2348031234567).
 */

export interface CountryPhoneOption {
  code: string;       // Calling prefix, e.g. '+234'
  name: string;       // Country name, e.g. 'Nigeria'
  flag: string;       // Emoji flag, e.g. '🇳🇬'
  iso: string;        // 2-letter ISO, e.g. 'NG'
  samplePlaceholder: string; // e.g. '0801 234 5678'
  nationalDigits: number;   // Expected national digits without leading 0
}

export const SUPPORTED_COUNTRY_PHONES: CountryPhoneOption[] = [
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', iso: 'NG', samplePlaceholder: 'e.g. 0801 234 5678 or 801 234 5678', nationalDigits: 10 },
  { code: '+44',  name: 'United Kingdom', flag: '🇬🇧', iso: 'GB', samplePlaceholder: 'e.g. 07911 123456 or 7911 123456', nationalDigits: 10 },
  { code: '+1',   name: 'United States / Canada', flag: '🇺🇸', iso: 'US', samplePlaceholder: 'e.g. 415 555 2671', nationalDigits: 10 },
  { code: '+233', name: 'Ghana', flag: '🇬🇭', iso: 'GH', samplePlaceholder: 'e.g. 024 123 4567 or 24 123 4567', nationalDigits: 9 },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', iso: 'KE', samplePlaceholder: 'e.g. 0712 345 678 or 712 345 678', nationalDigits: 9 },
  { code: '+27',  name: 'South Africa', flag: '🇿🇦', iso: 'ZA', samplePlaceholder: 'e.g. 082 123 4567 or 82 123 4567', nationalDigits: 9 },
  { code: '+353', name: 'Ireland', flag: '🇮🇪', iso: 'IE', samplePlaceholder: 'e.g. 087 123 4567 or 87 123 4567', nationalDigits: 9 },
  { code: '+33',  name: 'France', flag: '🇫🇷', iso: 'FR', samplePlaceholder: 'e.g. 06 12 34 56 78 or 6 12 34 56 78', nationalDigits: 9 },
  { code: '+49',  name: 'Germany', flag: '🇩🇪', iso: 'DE', samplePlaceholder: 'e.g. 0151 12345678', nationalDigits: 10 },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', iso: 'AE', samplePlaceholder: 'e.g. 050 123 4567 or 50 123 4567', nationalDigits: 9 },
  { code: '+91',  name: 'India', flag: '🇮🇳', iso: 'IN', samplePlaceholder: 'e.g. 98765 43210', nationalDigits: 10 },
  { code: '+61',  name: 'Australia', flag: '🇦🇺', iso: 'AU', samplePlaceholder: 'e.g. 0412 345 678 or 412 345 678', nationalDigits: 9 },
  { code: '+86',  name: 'China', flag: '🇨🇳', iso: 'CN', samplePlaceholder: 'e.g. 138 0000 0000', nationalDigits: 11 },
  { code: '+34',  name: 'Spain', flag: '🇪🇸', iso: 'ES', samplePlaceholder: 'e.g. 612 34 56 78', nationalDigits: 9 },
  { code: '+39',  name: 'Italy', flag: '🇮🇹', iso: 'IT', samplePlaceholder: 'e.g. 312 345 6789', nationalDigits: 10 },
  { code: '+31',  name: 'Netherlands', flag: '🇳🇱', iso: 'NL', samplePlaceholder: 'e.g. 06 12345678 or 6 12345678', nationalDigits: 9 },
  { code: '+41',  name: 'Switzerland', flag: '🇨🇭', iso: 'CH', samplePlaceholder: 'e.g. 079 123 45 67 or 79 123 45 67', nationalDigits: 9 },
  { code: '+46',  name: 'Sweden', flag: '🇸🇪', iso: 'SE', samplePlaceholder: 'e.g. 070 123 45 67 or 70 123 45 67', nationalDigits: 9 },
  { code: '+47',  name: 'Norway', flag: '🇳🇴', iso: 'NO', samplePlaceholder: 'e.g. 412 34 567', nationalDigits: 8 },
  { code: '+45',  name: 'Denmark', flag: '🇩🇰', iso: 'DK', samplePlaceholder: 'e.g. 32 12 34 56', nationalDigits: 8 },
  { code: '+55',  name: 'Brazil', flag: '🇧🇷', iso: 'BR', samplePlaceholder: 'e.g. 11 91234 5678', nationalDigits: 11 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', iso: 'SA', samplePlaceholder: 'e.g. 050 123 4567 or 50 123 4567', nationalDigits: 9 },
  { code: '+65',  name: 'Singapore', flag: '🇸🇬', iso: 'SG', samplePlaceholder: 'e.g. 8123 4567', nationalDigits: 8 },
  { code: '+64',  name: 'New Zealand', flag: '🇳🇿', iso: 'NZ', samplePlaceholder: 'e.g. 021 123 4567 or 21 123 4567', nationalDigits: 9 }
];

export interface CleanedPhoneState {
  countryCode: string;
  nationalNumber: string;
  canonicalE164: string;
  isValid: boolean;
  samplePlaceholder: string;
  feedbackHint: string;
}

/**
 * Resolves the default country code based on active tenant currency or locale.
 */
export function resolveDefaultCountryCode(currencyOrCountry?: string): string {
  if (!currencyOrCountry) return '+234';
  const c = currencyOrCountry.trim().toUpperCase();
  switch (c) {
    case 'GBP':
    case 'GB':
    case 'UK': return '+44';
    case 'USD':
    case 'US': return '+1';
    case 'CAD':
    case 'CA': return '+1';
    case 'GHS':
    case 'GH': return '+233';
    case 'KES':
    case 'KE': return '+254';
    case 'ZAR':
    case 'ZA': return '+27';
    case 'EUR':
    case 'FR': return '+33';
    case 'DE': return '+49';
    case 'AED':
    case 'AE': return '+971';
    case 'INR':
    case 'IN': return '+91';
    case 'AUD':
    case 'AU': return '+61';
    case 'NGN':
    case 'NG':
    default: return '+234';
  }
}

/**
 * Cleans user-entered phone number by removing country code duplicates, spaces, and punctuation.
 * Allows input with or without leading trunk '0' and generates unified E.164.
 */
export function cleanPhoneNumber(countryCode: string, nationalInput: string): CleanedPhoneState {
  const code = countryCode?.startsWith('+') ? countryCode.trim() : `+${(countryCode || '234').trim()}`;
  const codeDigits = code.replace(/\D/g, '');
  const countryConfig = SUPPORTED_COUNTRY_PHONES.find(c => c.code === code) || SUPPORTED_COUNTRY_PHONES[0];

  if (!nationalInput || !nationalInput.trim()) {
    return {
      countryCode: code,
      nationalNumber: '',
      canonicalE164: '',
      isValid: false,
      samplePlaceholder: countryConfig.samplePlaceholder,
      feedbackHint: `Enter local number (with or without 0). Do not re-enter ${code}.`
    };
  }

  // 1. Remove non-digit, non-plus characters (spaces, dashes, parentheses, dots)
  let raw = nationalInput.trim().replace(/[^\d+]/g, '');

  // 2. Auto-strip country code if user accidentally pasted it into the national input
  // e.g. "+2348012345678" -> "8012345678", "00234801..." -> "801...", "234801..." -> "801..."
  if (raw.startsWith('+' + codeDigits)) {
    raw = raw.substring(1 + codeDigits.length);
  } else if (raw.startsWith('00' + codeDigits)) {
    raw = raw.substring(2 + codeDigits.length);
  } else if (raw.startsWith(codeDigits) && raw.length >= codeDigits.length + 7) {
    raw = raw.substring(codeDigits.length);
  } else if (raw.startsWith('+')) {
    raw = raw.replace(/^\+/, '');
  }

  // Strip any remaining non-digits
  const digitsOnly = raw.replace(/\D/g, '');

  // 3. Extract national number without leading trunk zero '0'
  // E.g. Nigerian '08031234567' -> '8031234567'
  let nationalWithoutTrunkZero = digitsOnly;
  if (digitsOnly.startsWith('0') && digitsOnly.length > 1) {
    // Italy (+39) retains leading 0; almost all other countries strip it for E.164
    if (code !== '+39') {
      nationalWithoutTrunkZero = digitsOnly.substring(1);
    }
  }

  // 4. Form canonical E.164 international string
  const canonicalE164 = nationalWithoutTrunkZero.length > 0 ? `${code}${nationalWithoutTrunkZero}` : '';

  // 5. Validation check
  const minDigits = Math.max(5, (countryConfig.nationalDigits || 10) - 2);
  const isValid = nationalWithoutTrunkZero.length >= minDigits && nationalWithoutTrunkZero.length <= 14;

  return {
    countryCode: code,
    nationalNumber: digitsOnly,
    canonicalE164,
    isValid,
    samplePlaceholder: countryConfig.samplePlaceholder,
    feedbackHint: `Local number formatted as ${code} ${nationalWithoutTrunkZero}`
  };
}

/**
 * Splits an existing full phone string (+2348031234567, 08031234567) into country code + local number.
 */
export function splitPhoneNumber(fullPhone?: string, fallbackCurrency?: string): { countryCode: string; nationalNumber: string } {
  const defaultCode = resolveDefaultCountryCode(fallbackCurrency);
  if (!fullPhone || !fullPhone.trim()) {
    return { countryCode: defaultCode, nationalNumber: '' };
  }

  const clean = fullPhone.trim().replace(/[^\d+]/g, '');

  // Check matching country codes in descending length order
  const sortedCodes = [...SUPPORTED_COUNTRY_PHONES].sort((a, b) => b.code.length - a.code.length);

  for (const item of sortedCodes) {
    if (clean.startsWith(item.code)) {
      return {
        countryCode: item.code,
        nationalNumber: clean.substring(item.code.length)
      };
    }
    const cDigits = item.code.replace('+', '');
    if (clean.startsWith(cDigits) && clean.length >= cDigits.length + 7) {
      return {
        countryCode: item.code,
        nationalNumber: clean.substring(cDigits.length)
      };
    }
  }

  // If starts with trunk zero '0' and default currency is NGN, default to +234
  if (clean.startsWith('0')) {
    return { countryCode: defaultCode, nationalNumber: clean };
  }

  return { countryCode: defaultCode, nationalNumber: clean };
}
