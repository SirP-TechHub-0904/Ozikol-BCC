/**
 * Complete Global Phone Number Directory & Normalizer Engine.
 * Covers all 232 sovereign nations and territories with ITU-T E.164 dialing codes,
 * emoji flags, ISO-3166-1 alpha-2 codes, real-time searchable typeahead filtering,
 * automatic prefix-stripping on paste, optional trunk zero ('0') handling, and unified E.164 output.
 */

export interface CountryPhoneOption {
  code: string;       // Calling prefix, e.g. '+234'
  name: string;       // Full country name, e.g. 'Nigeria'
  flag: string;       // Official emoji flag, e.g. '🇳🇬'
  iso: string;        // 2-letter ISO, e.g. 'NG'
  samplePlaceholder: string; // Contextual national input format
  nationalDigits: number;   // Expected national digits without leading 0
}

export const ALL_COUNTRY_PHONES: CountryPhoneOption[] = [
  {
    "code": "+234",
    "name": "Nigeria",
    "flag": "🇳🇬",
    "iso": "NG",
    "samplePlaceholder": "e.g. 0801 234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+44",
    "name": "United Kingdom",
    "flag": "🇬🇧",
    "iso": "GB",
    "samplePlaceholder": "e.g. 07911 123456",
    "nationalDigits": 10
  },
  {
    "code": "+1",
    "name": "United States",
    "flag": "🇺🇸",
    "iso": "US",
    "samplePlaceholder": "e.g. 415 555 2671",
    "nationalDigits": 10
  },
  {
    "code": "+233",
    "name": "Ghana",
    "flag": "🇬🇭",
    "iso": "GH",
    "samplePlaceholder": "e.g. 024 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+254",
    "name": "Kenya",
    "flag": "🇰🇪",
    "iso": "KE",
    "samplePlaceholder": "e.g. 0712 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+27",
    "name": "South Africa",
    "flag": "🇿🇦",
    "iso": "ZA",
    "samplePlaceholder": "e.g. 082 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+1",
    "name": "Canada",
    "flag": "🇨🇦",
    "iso": "CA",
    "samplePlaceholder": "e.g. 416 555 0199",
    "nationalDigits": 10
  },
  {
    "code": "+971",
    "name": "United Arab Emirates",
    "flag": "🇦🇪",
    "iso": "AE",
    "samplePlaceholder": "e.g. 050 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+91",
    "name": "India",
    "flag": "🇮🇳",
    "iso": "IN",
    "samplePlaceholder": "e.g. 98765 43210",
    "nationalDigits": 10
  },
  {
    "code": "+61",
    "name": "Australia",
    "flag": "🇦🇺",
    "iso": "AU",
    "samplePlaceholder": "e.g. 0412 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+33",
    "name": "France",
    "flag": "🇫🇷",
    "iso": "FR",
    "samplePlaceholder": "e.g. 06 12 34 56 78",
    "nationalDigits": 9
  },
  {
    "code": "+49",
    "name": "Germany",
    "flag": "🇩🇪",
    "iso": "DE",
    "samplePlaceholder": "e.g. 0151 12345678",
    "nationalDigits": 10
  },
  {
    "code": "+353",
    "name": "Ireland",
    "flag": "🇮🇪",
    "iso": "IE",
    "samplePlaceholder": "e.g. 087 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+93",
    "name": "Afghanistan",
    "flag": "🇦🇫",
    "iso": "AF",
    "samplePlaceholder": "e.g. 70 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+355",
    "name": "Albania",
    "flag": "🇦🇱",
    "iso": "AL",
    "samplePlaceholder": "e.g. 067 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+213",
    "name": "Algeria",
    "flag": "🇩🇿",
    "iso": "DZ",
    "samplePlaceholder": "e.g. 0551 23 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+1684",
    "name": "American Samoa",
    "flag": "🇦🇸",
    "iso": "AS",
    "samplePlaceholder": "e.g. 733 1234",
    "nationalDigits": 7
  },
  {
    "code": "+376",
    "name": "Andorra",
    "flag": "🇦🇩",
    "iso": "AD",
    "samplePlaceholder": "e.g. 312 345",
    "nationalDigits": 6
  },
  {
    "code": "+244",
    "name": "Angola",
    "flag": "🇦🇴",
    "iso": "AO",
    "samplePlaceholder": "e.g. 923 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+1264",
    "name": "Anguilla",
    "flag": "🇦🇮",
    "iso": "AI",
    "samplePlaceholder": "e.g. 235 1234",
    "nationalDigits": 7
  },
  {
    "code": "+1268",
    "name": "Antigua and Barbuda",
    "flag": "🇦🇬",
    "iso": "AG",
    "samplePlaceholder": "e.g. 720 1234",
    "nationalDigits": 7
  },
  {
    "code": "+54",
    "name": "Argentina",
    "flag": "🇦🇷",
    "iso": "AR",
    "samplePlaceholder": "e.g. 011 15 2345 6789",
    "nationalDigits": 10
  },
  {
    "code": "+374",
    "name": "Armenia",
    "flag": "🇦🇲",
    "iso": "AM",
    "samplePlaceholder": "e.g. 077 123456",
    "nationalDigits": 8
  },
  {
    "code": "+297",
    "name": "Aruba",
    "flag": "🇦🇼",
    "iso": "AW",
    "samplePlaceholder": "e.g. 560 1234",
    "nationalDigits": 7
  },
  {
    "code": "+43",
    "name": "Austria",
    "flag": "🇦🇹",
    "iso": "AT",
    "samplePlaceholder": "e.g. 0664 1234567",
    "nationalDigits": 10
  },
  {
    "code": "+994",
    "name": "Azerbaijan",
    "flag": "🇦🇿",
    "iso": "AZ",
    "samplePlaceholder": "e.g. 050 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+1242",
    "name": "Bahamas",
    "flag": "🇧🇸",
    "iso": "BS",
    "samplePlaceholder": "e.g. 359 1234",
    "nationalDigits": 7
  },
  {
    "code": "+973",
    "name": "Bahrain",
    "flag": "🇧🇭",
    "iso": "BH",
    "samplePlaceholder": "e.g. 3600 1234",
    "nationalDigits": 8
  },
  {
    "code": "+880",
    "name": "Bangladesh",
    "flag": "🇧🇩",
    "iso": "BD",
    "samplePlaceholder": "e.g. 01712 345678",
    "nationalDigits": 10
  },
  {
    "code": "+1246",
    "name": "Barbados",
    "flag": "🇧🇧",
    "iso": "BB",
    "samplePlaceholder": "e.g. 260 1234",
    "nationalDigits": 7
  },
  {
    "code": "+375",
    "name": "Belarus",
    "flag": "🇧🇾",
    "iso": "BY",
    "samplePlaceholder": "e.g. 029 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+32",
    "name": "Belgium",
    "flag": "🇧🇪",
    "iso": "BE",
    "samplePlaceholder": "e.g. 0470 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+501",
    "name": "Belize",
    "flag": "🇧🇿",
    "iso": "BZ",
    "samplePlaceholder": "e.g. 622 1234",
    "nationalDigits": 7
  },
  {
    "code": "+229",
    "name": "Benin",
    "flag": "🇧🇯",
    "iso": "BJ",
    "samplePlaceholder": "e.g. 97 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+1441",
    "name": "Bermuda",
    "flag": "🇧🇲",
    "iso": "BM",
    "samplePlaceholder": "e.g. 295 1234",
    "nationalDigits": 7
  },
  {
    "code": "+975",
    "name": "Bhutan",
    "flag": "🇧🇹",
    "iso": "BT",
    "samplePlaceholder": "e.g. 17 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+591",
    "name": "Bolivia",
    "flag": "🇧🇴",
    "iso": "BO",
    "samplePlaceholder": "e.g. 71234567",
    "nationalDigits": 8
  },
  {
    "code": "+387",
    "name": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "iso": "BA",
    "samplePlaceholder": "e.g. 061 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+267",
    "name": "Botswana",
    "flag": "🇧🇼",
    "iso": "BW",
    "samplePlaceholder": "e.g. 71 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+55",
    "name": "Brazil",
    "flag": "🇧🇷",
    "iso": "BR",
    "samplePlaceholder": "e.g. 11 91234 5678",
    "nationalDigits": 11
  },
  {
    "code": "+1284",
    "name": "British Virgin Islands",
    "flag": "🇻🇬",
    "iso": "VG",
    "samplePlaceholder": "e.g. 496 1234",
    "nationalDigits": 7
  },
  {
    "code": "+673",
    "name": "Brunei",
    "flag": "🇧🇳",
    "iso": "BN",
    "samplePlaceholder": "e.g. 712 3456",
    "nationalDigits": 7
  },
  {
    "code": "+359",
    "name": "Bulgaria",
    "flag": "🇧🇬",
    "iso": "BG",
    "samplePlaceholder": "e.g. 088 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+226",
    "name": "Burkina Faso",
    "flag": "🇧🇫",
    "iso": "BF",
    "samplePlaceholder": "e.g. 70 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+257",
    "name": "Burundi",
    "flag": "🇧🇮",
    "iso": "BI",
    "samplePlaceholder": "e.g. 79 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+855",
    "name": "Cambodia",
    "flag": "🇰🇭",
    "iso": "KH",
    "samplePlaceholder": "e.g. 012 345 678",
    "nationalDigits": 8
  },
  {
    "code": "+237",
    "name": "Cameroon",
    "flag": "🇨🇲",
    "iso": "CM",
    "samplePlaceholder": "e.g. 6 71 23 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+238",
    "name": "Cape Verde",
    "flag": "🇨🇻",
    "iso": "CV",
    "samplePlaceholder": "e.g. 991 12 34",
    "nationalDigits": 7
  },
  {
    "code": "+1345",
    "name": "Cayman Islands",
    "flag": "🇰🇾",
    "iso": "KY",
    "samplePlaceholder": "e.g. 925 1234",
    "nationalDigits": 7
  },
  {
    "code": "+236",
    "name": "Central African Republic",
    "flag": "🇨🇫",
    "iso": "CF",
    "samplePlaceholder": "e.g. 70 01 23 45",
    "nationalDigits": 8
  },
  {
    "code": "+235",
    "name": "Chad",
    "flag": "🇹🇩",
    "iso": "TD",
    "samplePlaceholder": "e.g. 63 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+56",
    "name": "Chile",
    "flag": "🇨🇱",
    "iso": "CL",
    "samplePlaceholder": "e.g. 9 1234 5678",
    "nationalDigits": 9
  },
  {
    "code": "+86",
    "name": "China",
    "flag": "🇨🇳",
    "iso": "CN",
    "samplePlaceholder": "e.g. 138 0000 0000",
    "nationalDigits": 11
  },
  {
    "code": "+57",
    "name": "Colombia",
    "flag": "🇨🇴",
    "iso": "CO",
    "samplePlaceholder": "e.g. 310 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+269",
    "name": "Comoros",
    "flag": "🇰🇲",
    "iso": "KM",
    "samplePlaceholder": "e.g. 321 12 34",
    "nationalDigits": 7
  },
  {
    "code": "+242",
    "name": "Congo (Brazzaville)",
    "flag": "🇨🇬",
    "iso": "CG",
    "samplePlaceholder": "e.g. 06 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+243",
    "name": "Congo (Kinshasa)",
    "flag": "🇨🇩",
    "iso": "CD",
    "samplePlaceholder": "e.g. 081 234 5678",
    "nationalDigits": 9
  },
  {
    "code": "+682",
    "name": "Cook Islands",
    "flag": "🇨🇰",
    "iso": "CK",
    "samplePlaceholder": "e.g. 21 234",
    "nationalDigits": 5
  },
  {
    "code": "+506",
    "name": "Costa Rica",
    "flag": "🇨🇷",
    "iso": "CR",
    "samplePlaceholder": "e.g. 8312 3456",
    "nationalDigits": 8
  },
  {
    "code": "+385",
    "name": "Croatia",
    "flag": "🇭🇷",
    "iso": "HR",
    "samplePlaceholder": "e.g. 091 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+53",
    "name": "Cuba",
    "flag": "🇨🇺",
    "iso": "CU",
    "samplePlaceholder": "e.g. 5 123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+599",
    "name": "Curaçao",
    "flag": "🇨🇼",
    "iso": "CW",
    "samplePlaceholder": "e.g. 9 560 1234",
    "nationalDigits": 8
  },
  {
    "code": "+357",
    "name": "Cyprus",
    "flag": "🇨🇾",
    "iso": "CY",
    "samplePlaceholder": "e.g. 96 123456",
    "nationalDigits": 8
  },
  {
    "code": "+420",
    "name": "Czech Republic",
    "flag": "🇨🇿",
    "iso": "CZ",
    "samplePlaceholder": "e.g. 601 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+45",
    "name": "Denmark",
    "flag": "🇩🇰",
    "iso": "DK",
    "samplePlaceholder": "e.g. 32 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+253",
    "name": "Djibouti",
    "flag": "🇩🇯",
    "iso": "DJ",
    "samplePlaceholder": "e.g. 77 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+1767",
    "name": "Dominica",
    "flag": "🇩🇲",
    "iso": "DM",
    "samplePlaceholder": "e.g. 235 1234",
    "nationalDigits": 7
  },
  {
    "code": "+1809",
    "name": "Dominican Republic",
    "flag": "🇩🇴",
    "iso": "DO",
    "samplePlaceholder": "e.g. 234 5678",
    "nationalDigits": 7
  },
  {
    "code": "+593",
    "name": "Ecuador",
    "flag": "🇪🇨",
    "iso": "EC",
    "samplePlaceholder": "e.g. 099 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+20",
    "name": "Egypt",
    "flag": "🇪🇬",
    "iso": "EG",
    "samplePlaceholder": "e.g. 0100 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+503",
    "name": "El Salvador",
    "flag": "🇸🇻",
    "iso": "SV",
    "samplePlaceholder": "e.g. 7123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+240",
    "name": "Equatorial Guinea",
    "flag": "🇬🇶",
    "iso": "GQ",
    "samplePlaceholder": "e.g. 222 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+291",
    "name": "Eritrea",
    "flag": "🇪🇷",
    "iso": "ER",
    "samplePlaceholder": "e.g. 7 123 456",
    "nationalDigits": 7
  },
  {
    "code": "+372",
    "name": "Estonia",
    "flag": "🇪🇪",
    "iso": "EE",
    "samplePlaceholder": "e.g. 5123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+268",
    "name": "Eswatini",
    "flag": "🇸🇿",
    "iso": "SZ",
    "samplePlaceholder": "e.g. 7612 3456",
    "nationalDigits": 8
  },
  {
    "code": "+251",
    "name": "Ethiopia",
    "flag": "🇪🇹",
    "iso": "ET",
    "samplePlaceholder": "e.g. 091 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+500",
    "name": "Falkland Islands",
    "flag": "🇫🇰",
    "iso": "FK",
    "samplePlaceholder": "e.g. 51234",
    "nationalDigits": 5
  },
  {
    "code": "+298",
    "name": "Faroe Islands",
    "flag": "🇫🇴",
    "iso": "FO",
    "samplePlaceholder": "e.g. 211234",
    "nationalDigits": 6
  },
  {
    "code": "+679",
    "name": "Fiji",
    "flag": "🇫🇯",
    "iso": "FJ",
    "samplePlaceholder": "e.g. 701 2345",
    "nationalDigits": 7
  },
  {
    "code": "+358",
    "name": "Finland",
    "flag": "🇫🇮",
    "iso": "FI",
    "samplePlaceholder": "e.g. 040 1234567",
    "nationalDigits": 9
  },
  {
    "code": "+594",
    "name": "French Guiana",
    "flag": "🇬🇫",
    "iso": "GF",
    "samplePlaceholder": "e.g. 694 20 12 34",
    "nationalDigits": 9
  },
  {
    "code": "+689",
    "name": "French Polynesia",
    "flag": "🇵🇫",
    "iso": "PF",
    "samplePlaceholder": "e.g. 87 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+241",
    "name": "Gabon",
    "flag": "🇬🇦",
    "iso": "GA",
    "samplePlaceholder": "e.g. 06 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+220",
    "name": "Gambia",
    "flag": "🇬🇲",
    "iso": "GM",
    "samplePlaceholder": "e.g. 701 2345",
    "nationalDigits": 7
  },
  {
    "code": "+995",
    "name": "Georgia",
    "flag": "🇬🇪",
    "iso": "GE",
    "samplePlaceholder": "e.g. 555 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+350",
    "name": "Gibraltar",
    "flag": "🇬🇮",
    "iso": "GI",
    "samplePlaceholder": "e.g. 57123456",
    "nationalDigits": 8
  },
  {
    "code": "+30",
    "name": "Greece",
    "flag": "🇬🇷",
    "iso": "GR",
    "samplePlaceholder": "e.g. 691 234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+299",
    "name": "Greenland",
    "flag": "🇬🇱",
    "iso": "GL",
    "samplePlaceholder": "e.g. 22 12 34",
    "nationalDigits": 6
  },
  {
    "code": "+1473",
    "name": "Grenada",
    "flag": "🇬🇩",
    "iso": "GD",
    "samplePlaceholder": "e.g. 403 1234",
    "nationalDigits": 7
  },
  {
    "code": "+590",
    "name": "Guadeloupe",
    "flag": "🇬🇵",
    "iso": "GP",
    "samplePlaceholder": "e.g. 690 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+1671",
    "name": "Guam",
    "flag": "🇬🇺",
    "iso": "GU",
    "samplePlaceholder": "e.g. 727 1234",
    "nationalDigits": 7
  },
  {
    "code": "+502",
    "name": "Guatemala",
    "flag": "🇬🇹",
    "iso": "GT",
    "samplePlaceholder": "e.g. 5123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+224",
    "name": "Guinea",
    "flag": "🇬🇳",
    "iso": "GN",
    "samplePlaceholder": "e.g. 621 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+245",
    "name": "Guinea-Bissau",
    "flag": "🇬🇼",
    "iso": "GW",
    "samplePlaceholder": "e.g. 955 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+592",
    "name": "Guyana",
    "flag": "🇬🇾",
    "iso": "GY",
    "samplePlaceholder": "e.g. 609 1234",
    "nationalDigits": 7
  },
  {
    "code": "+509",
    "name": "Haiti",
    "flag": "🇭🇹",
    "iso": "HT",
    "samplePlaceholder": "e.g. 3412 3456",
    "nationalDigits": 8
  },
  {
    "code": "+504",
    "name": "Honduras",
    "flag": "🇭🇳",
    "iso": "HN",
    "samplePlaceholder": "e.g. 9123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+852",
    "name": "Hong Kong",
    "flag": "🇭🇰",
    "iso": "HK",
    "samplePlaceholder": "e.g. 5123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+36",
    "name": "Hungary",
    "flag": "🇭🇺",
    "iso": "HU",
    "samplePlaceholder": "e.g. 06 20 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+354",
    "name": "Iceland",
    "flag": "🇮🇸",
    "iso": "IS",
    "samplePlaceholder": "e.g. 612 3456",
    "nationalDigits": 7
  },
  {
    "code": "+62",
    "name": "Indonesia",
    "flag": "🇮🇩",
    "iso": "ID",
    "samplePlaceholder": "e.g. 0812 3456 7890",
    "nationalDigits": 10
  },
  {
    "code": "+98",
    "name": "Iran",
    "flag": "🇮🇷",
    "iso": "IR",
    "samplePlaceholder": "e.g. 0912 345 6789",
    "nationalDigits": 10
  },
  {
    "code": "+964",
    "name": "Iraq",
    "flag": "🇮🇶",
    "iso": "IQ",
    "samplePlaceholder": "e.g. 0790 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+972",
    "name": "Israel",
    "flag": "🇮🇱",
    "iso": "IL",
    "samplePlaceholder": "e.g. 050 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+39",
    "name": "Italy",
    "flag": "🇮🇹",
    "iso": "IT",
    "samplePlaceholder": "e.g. 312 345 6789",
    "nationalDigits": 10
  },
  {
    "code": "+225",
    "name": "Ivory Coast",
    "flag": "🇨🇮",
    "iso": "CI",
    "samplePlaceholder": "e.g. 07 01 23 45 67",
    "nationalDigits": 10
  },
  {
    "code": "+1876",
    "name": "Jamaica",
    "flag": "🇯🇲",
    "iso": "JM",
    "samplePlaceholder": "e.g. 285 1234",
    "nationalDigits": 7
  },
  {
    "code": "+81",
    "name": "Japan",
    "flag": "🇯🇵",
    "iso": "JP",
    "samplePlaceholder": "e.g. 090 1234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+962",
    "name": "Jordan",
    "flag": "🇯🇴",
    "iso": "JO",
    "samplePlaceholder": "e.g. 07 9012 3456",
    "nationalDigits": 9
  },
  {
    "code": "+7",
    "name": "Kazakhstan",
    "flag": "🇰🇿",
    "iso": "KZ",
    "samplePlaceholder": "e.g. 701 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+686",
    "name": "Kiribati",
    "flag": "🇰🇮",
    "iso": "KI",
    "samplePlaceholder": "e.g. 720 12345",
    "nationalDigits": 8
  },
  {
    "code": "+383",
    "name": "Kosovo",
    "flag": "🇽🇰",
    "iso": "XK",
    "samplePlaceholder": "e.g. 044 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+965",
    "name": "Kuwait",
    "flag": "🇰🇼",
    "iso": "KW",
    "samplePlaceholder": "e.g. 9123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+996",
    "name": "Kyrgyzstan",
    "flag": "🇰🇬",
    "iso": "KG",
    "samplePlaceholder": "e.g. 0700 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+856",
    "name": "Laos",
    "flag": "🇱🇦",
    "iso": "LA",
    "samplePlaceholder": "e.g. 020 1234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+371",
    "name": "Latvia",
    "flag": "🇱🇻",
    "iso": "LV",
    "samplePlaceholder": "e.g. 2123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+961",
    "name": "Lebanon",
    "flag": "🇱🇧",
    "iso": "LB",
    "samplePlaceholder": "e.g. 03 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+266",
    "name": "Lesotho",
    "flag": "🇱🇸",
    "iso": "LS",
    "samplePlaceholder": "e.g. 5812 3456",
    "nationalDigits": 8
  },
  {
    "code": "+231",
    "name": "Liberia",
    "flag": "🇱🇷",
    "iso": "LR",
    "samplePlaceholder": "e.g. 077 012 3456",
    "nationalDigits": 8
  },
  {
    "code": "+218",
    "name": "Libya",
    "flag": "🇱🇾",
    "iso": "LY",
    "samplePlaceholder": "e.g. 091 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+423",
    "name": "Liechtenstein",
    "flag": "🇱🇮",
    "iso": "LI",
    "samplePlaceholder": "e.g. 660 12 34",
    "nationalDigits": 7
  },
  {
    "code": "+370",
    "name": "Lithuania",
    "flag": "🇱🇹",
    "iso": "LT",
    "samplePlaceholder": "e.g. 8 612 34567",
    "nationalDigits": 8
  },
  {
    "code": "+352",
    "name": "Luxembourg",
    "flag": "🇱🇺",
    "iso": "LU",
    "samplePlaceholder": "e.g. 621 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+853",
    "name": "Macau",
    "flag": "🇲🇴",
    "iso": "MO",
    "samplePlaceholder": "e.g. 6123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+261",
    "name": "Madagascar",
    "flag": "🇲🇬",
    "iso": "MG",
    "samplePlaceholder": "e.g. 032 12 345 67",
    "nationalDigits": 9
  },
  {
    "code": "+265",
    "name": "Malawi",
    "flag": "🇲🇼",
    "iso": "MW",
    "samplePlaceholder": "e.g. 0991 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+60",
    "name": "Malaysia",
    "flag": "🇲🇾",
    "iso": "MY",
    "samplePlaceholder": "e.g. 012 345 6789",
    "nationalDigits": 9
  },
  {
    "code": "+960",
    "name": "Maldives",
    "flag": "🇲🇻",
    "iso": "MV",
    "samplePlaceholder": "e.g. 771 2345",
    "nationalDigits": 7
  },
  {
    "code": "+223",
    "name": "Mali",
    "flag": "🇲🇱",
    "iso": "ML",
    "samplePlaceholder": "e.g. 65 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+356",
    "name": "Malta",
    "flag": "🇲🇹",
    "iso": "MT",
    "samplePlaceholder": "e.g. 9912 3456",
    "nationalDigits": 8
  },
  {
    "code": "+692",
    "name": "Marshall Islands",
    "flag": "🇲🇭",
    "iso": "MH",
    "samplePlaceholder": "e.g. 235 1234",
    "nationalDigits": 7
  },
  {
    "code": "+596",
    "name": "Martinique",
    "flag": "🇲🇶",
    "iso": "MQ",
    "samplePlaceholder": "e.g. 696 20 12 34",
    "nationalDigits": 9
  },
  {
    "code": "+222",
    "name": "Mauritania",
    "flag": "🇲🇷",
    "iso": "MR",
    "samplePlaceholder": "e.g. 22 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+230",
    "name": "Mauritius",
    "flag": "🇲🇺",
    "iso": "MU",
    "samplePlaceholder": "e.g. 5251 2345",
    "nationalDigits": 8
  },
  {
    "code": "+262",
    "name": "Mayotte",
    "flag": "🇾🇹",
    "iso": "YT",
    "samplePlaceholder": "e.g. 639 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+52",
    "name": "Mexico",
    "flag": "🇲🇽",
    "iso": "MX",
    "samplePlaceholder": "e.g. 55 1234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+691",
    "name": "Micronesia",
    "flag": "🇫🇲",
    "iso": "FM",
    "samplePlaceholder": "e.g. 920 1234",
    "nationalDigits": 7
  },
  {
    "code": "+373",
    "name": "Moldova",
    "flag": "🇲🇩",
    "iso": "MD",
    "samplePlaceholder": "e.g. 0621 12 345",
    "nationalDigits": 8
  },
  {
    "code": "+377",
    "name": "Monaco",
    "flag": "🇲🇨",
    "iso": "MC",
    "samplePlaceholder": "e.g. 06 12 34 56 78",
    "nationalDigits": 8
  },
  {
    "code": "+976",
    "name": "Mongolia",
    "flag": "🇲🇳",
    "iso": "MN",
    "samplePlaceholder": "e.g. 8812 3456",
    "nationalDigits": 8
  },
  {
    "code": "+382",
    "name": "Montenegro",
    "flag": "🇲🇪",
    "iso": "ME",
    "samplePlaceholder": "e.g. 067 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+1664",
    "name": "Montserrat",
    "flag": "🇲🇸",
    "iso": "MS",
    "samplePlaceholder": "e.g. 492 1234",
    "nationalDigits": 7
  },
  {
    "code": "+212",
    "name": "Morocco",
    "flag": "🇲🇦",
    "iso": "MA",
    "samplePlaceholder": "e.g. 0661 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+258",
    "name": "Mozambique",
    "flag": "🇲🇿",
    "iso": "MZ",
    "samplePlaceholder": "e.g. 82 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+95",
    "name": "Myanmar",
    "flag": "🇲🇲",
    "iso": "MM",
    "samplePlaceholder": "e.g. 09 212 3456",
    "nationalDigits": 9
  },
  {
    "code": "+264",
    "name": "Namibia",
    "flag": "🇳🇦",
    "iso": "NA",
    "samplePlaceholder": "e.g. 081 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+674",
    "name": "Nauru",
    "flag": "🇳🇷",
    "iso": "NR",
    "samplePlaceholder": "e.g. 555 1234",
    "nationalDigits": 7
  },
  {
    "code": "+977",
    "name": "Nepal",
    "flag": "🇳🇵",
    "iso": "NP",
    "samplePlaceholder": "e.g. 984 1234567",
    "nationalDigits": 10
  },
  {
    "code": "+31",
    "name": "Netherlands",
    "flag": "🇳🇱",
    "iso": "NL",
    "samplePlaceholder": "e.g. 06 12345678",
    "nationalDigits": 9
  },
  {
    "code": "+687",
    "name": "New Caledonia",
    "flag": "🇳🇨",
    "iso": "NC",
    "samplePlaceholder": "e.g. 75 12 34",
    "nationalDigits": 6
  },
  {
    "code": "+64",
    "name": "New Zealand",
    "flag": "🇳🇿",
    "iso": "NZ",
    "samplePlaceholder": "e.g. 021 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+505",
    "name": "Nicaragua",
    "flag": "🇳🇮",
    "iso": "NI",
    "samplePlaceholder": "e.g. 8712 3456",
    "nationalDigits": 8
  },
  {
    "code": "+227",
    "name": "Niger",
    "flag": "🇳🇪",
    "iso": "NE",
    "samplePlaceholder": "e.g. 96 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+683",
    "name": "Niue",
    "flag": "🇳🇺",
    "iso": "NU",
    "samplePlaceholder": "e.g. 4123",
    "nationalDigits": 4
  },
  {
    "code": "+672",
    "name": "Norfolk Island",
    "flag": "🇳🇫",
    "iso": "NF",
    "samplePlaceholder": "e.g. 322 123",
    "nationalDigits": 6
  },
  {
    "code": "+850",
    "name": "North Korea",
    "flag": "🇰🇵",
    "iso": "KP",
    "samplePlaceholder": "e.g. 191 234 5678",
    "nationalDigits": 10
  },
  {
    "code": "+389",
    "name": "North Macedonia",
    "flag": "🇲🇰",
    "iso": "MK",
    "samplePlaceholder": "e.g. 070 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+1670",
    "name": "Northern Mariana Islands",
    "flag": "🇲🇵",
    "iso": "MP",
    "samplePlaceholder": "e.g. 287 1234",
    "nationalDigits": 7
  },
  {
    "code": "+47",
    "name": "Norway",
    "flag": "🇳🇴",
    "iso": "NO",
    "samplePlaceholder": "e.g. 412 34 567",
    "nationalDigits": 8
  },
  {
    "code": "+968",
    "name": "Oman",
    "flag": "🇴🇲",
    "iso": "OM",
    "samplePlaceholder": "e.g. 9123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+92",
    "name": "Pakistan",
    "flag": "🇵🇰",
    "iso": "PK",
    "samplePlaceholder": "e.g. 0300 1234567",
    "nationalDigits": 10
  },
  {
    "code": "+680",
    "name": "Palau",
    "flag": "🇵🇼",
    "iso": "PW",
    "samplePlaceholder": "e.g. 775 1234",
    "nationalDigits": 7
  },
  {
    "code": "+970",
    "name": "Palestine",
    "flag": "🇵🇸",
    "iso": "PS",
    "samplePlaceholder": "e.g. 059 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+507",
    "name": "Panama",
    "flag": "🇵🇦",
    "iso": "PA",
    "samplePlaceholder": "e.g. 6123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+675",
    "name": "Papua New Guinea",
    "flag": "🇵🇬",
    "iso": "PG",
    "samplePlaceholder": "e.g. 7012 3456",
    "nationalDigits": 8
  },
  {
    "code": "+595",
    "name": "Paraguay",
    "flag": "🇵🇾",
    "iso": "PY",
    "samplePlaceholder": "e.g. 0981 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+51",
    "name": "Peru",
    "flag": "🇵🇪",
    "iso": "PE",
    "samplePlaceholder": "e.g. 912 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+63",
    "name": "Philippines",
    "flag": "🇵🇭",
    "iso": "PH",
    "samplePlaceholder": "e.g. 0917 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+48",
    "name": "Poland",
    "flag": "🇵🇱",
    "iso": "PL",
    "samplePlaceholder": "e.g. 512 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+351",
    "name": "Portugal",
    "flag": "🇵🇹",
    "iso": "PT",
    "samplePlaceholder": "e.g. 912 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+1787",
    "name": "Puerto Rico",
    "flag": "🇵🇷",
    "iso": "PR",
    "samplePlaceholder": "e.g. 787 1234",
    "nationalDigits": 7
  },
  {
    "code": "+974",
    "name": "Qatar",
    "flag": "🇶🇦",
    "iso": "QA",
    "samplePlaceholder": "e.g. 3312 3456",
    "nationalDigits": 8
  },
  {
    "code": "+40",
    "name": "Romania",
    "flag": "🇷🇴",
    "iso": "RO",
    "samplePlaceholder": "e.g. 0712 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+7",
    "name": "Russia",
    "flag": "🇷🇺",
    "iso": "RU",
    "samplePlaceholder": "e.g. 912 345-67-89",
    "nationalDigits": 10
  },
  {
    "code": "+250",
    "name": "Rwanda",
    "flag": "🇷🇼",
    "iso": "RW",
    "samplePlaceholder": "e.g. 078 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+262",
    "name": "Réunion",
    "flag": "🇷🇪",
    "iso": "RE",
    "samplePlaceholder": "e.g. 692 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+590",
    "name": "Saint Barthélemy",
    "flag": "🇧🇱",
    "iso": "BL",
    "samplePlaceholder": "e.g. 690 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+290",
    "name": "Saint Helena",
    "flag": "🇸🇭",
    "iso": "SH",
    "samplePlaceholder": "e.g. 51234",
    "nationalDigits": 5
  },
  {
    "code": "+1869",
    "name": "Saint Kitts and Nevis",
    "flag": "🇰🇳",
    "iso": "KN",
    "samplePlaceholder": "e.g. 762 1234",
    "nationalDigits": 7
  },
  {
    "code": "+1758",
    "name": "Saint Lucia",
    "flag": "🇱🇨",
    "iso": "LC",
    "samplePlaceholder": "e.g. 712 1234",
    "nationalDigits": 7
  },
  {
    "code": "+590",
    "name": "Saint Martin",
    "flag": "🇲🇫",
    "iso": "MF",
    "samplePlaceholder": "e.g. 690 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+508",
    "name": "Saint Pierre and Miquelon",
    "flag": "🇵🇲",
    "iso": "PM",
    "samplePlaceholder": "e.g. 55 12 34",
    "nationalDigits": 6
  },
  {
    "code": "+1784",
    "name": "Saint Vincent and the Grenadines",
    "flag": "🇻🇨",
    "iso": "VC",
    "samplePlaceholder": "e.g. 493 1234",
    "nationalDigits": 7
  },
  {
    "code": "+685",
    "name": "Samoa",
    "flag": "🇼🇸",
    "iso": "WS",
    "samplePlaceholder": "e.g. 72 12345",
    "nationalDigits": 7
  },
  {
    "code": "+378",
    "name": "San Marino",
    "flag": "🇸🇲",
    "iso": "SM",
    "samplePlaceholder": "e.g. 66 123456",
    "nationalDigits": 8
  },
  {
    "code": "+966",
    "name": "Saudi Arabia",
    "flag": "🇸🇦",
    "iso": "SA",
    "samplePlaceholder": "e.g. 050 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+221",
    "name": "Senegal",
    "flag": "🇸🇳",
    "iso": "SN",
    "samplePlaceholder": "e.g. 77 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+381",
    "name": "Serbia",
    "flag": "🇷🇸",
    "iso": "RS",
    "samplePlaceholder": "e.g. 060 1234567",
    "nationalDigits": 9
  },
  {
    "code": "+248",
    "name": "Seychelles",
    "flag": "🇸🇨",
    "iso": "SC",
    "samplePlaceholder": "e.g. 2 51 12 34",
    "nationalDigits": 7
  },
  {
    "code": "+232",
    "name": "Sierra Leone",
    "flag": "🇸🇱",
    "iso": "SL",
    "samplePlaceholder": "e.g. 076 123456",
    "nationalDigits": 8
  },
  {
    "code": "+65",
    "name": "Singapore",
    "flag": "🇸🇬",
    "iso": "SG",
    "samplePlaceholder": "e.g. 8123 4567",
    "nationalDigits": 8
  },
  {
    "code": "+1721",
    "name": "Sint Maarten",
    "flag": "🇸🇽",
    "iso": "SX",
    "samplePlaceholder": "e.g. 520 1234",
    "nationalDigits": 7
  },
  {
    "code": "+421",
    "name": "Slovakia",
    "flag": "🇸🇰",
    "iso": "SK",
    "samplePlaceholder": "e.g. 0912 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+386",
    "name": "Slovenia",
    "flag": "🇸🇮",
    "iso": "SI",
    "samplePlaceholder": "e.g. 041 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+677",
    "name": "Solomon Islands",
    "flag": "🇸🇧",
    "iso": "SB",
    "samplePlaceholder": "e.g. 742 1234",
    "nationalDigits": 7
  },
  {
    "code": "+252",
    "name": "Somalia",
    "flag": "🇸🇴",
    "iso": "SO",
    "samplePlaceholder": "e.g. 061 234 567",
    "nationalDigits": 8
  },
  {
    "code": "+82",
    "name": "South Korea",
    "flag": "🇰🇷",
    "iso": "KR",
    "samplePlaceholder": "e.g. 010-1234-5678",
    "nationalDigits": 10
  },
  {
    "code": "+211",
    "name": "South Sudan",
    "flag": "🇸🇸",
    "iso": "SS",
    "samplePlaceholder": "e.g. 0912 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+34",
    "name": "Spain",
    "flag": "🇪🇸",
    "iso": "ES",
    "samplePlaceholder": "e.g. 612 34 56 78",
    "nationalDigits": 9
  },
  {
    "code": "+94",
    "name": "Sri Lanka",
    "flag": "🇱🇰",
    "iso": "LK",
    "samplePlaceholder": "e.g. 071 234 5678",
    "nationalDigits": 9
  },
  {
    "code": "+249",
    "name": "Sudan",
    "flag": "🇸🇩",
    "iso": "SD",
    "samplePlaceholder": "e.g. 091 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+597",
    "name": "Suriname",
    "flag": "🇸🇷",
    "iso": "SR",
    "samplePlaceholder": "e.g. 741 2345",
    "nationalDigits": 7
  },
  {
    "code": "+46",
    "name": "Sweden",
    "flag": "🇸🇪",
    "iso": "SE",
    "samplePlaceholder": "e.g. 070 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+41",
    "name": "Switzerland",
    "flag": "🇨🇭",
    "iso": "CH",
    "samplePlaceholder": "e.g. 079 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+963",
    "name": "Syria",
    "flag": "🇸🇾",
    "iso": "SY",
    "samplePlaceholder": "e.g. 0944 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+239",
    "name": "São Tomé and Príncipe",
    "flag": "🇸🇹",
    "iso": "ST",
    "samplePlaceholder": "e.g. 991 2345",
    "nationalDigits": 7
  },
  {
    "code": "+886",
    "name": "Taiwan",
    "flag": "🇹🇼",
    "iso": "TW",
    "samplePlaceholder": "e.g. 0912 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+992",
    "name": "Tajikistan",
    "flag": "🇹🇯",
    "iso": "TJ",
    "samplePlaceholder": "e.g. 917 12 34 56",
    "nationalDigits": 9
  },
  {
    "code": "+255",
    "name": "Tanzania",
    "flag": "🇹🇿",
    "iso": "TZ",
    "samplePlaceholder": "e.g. 0712 345 678",
    "nationalDigits": 9
  },
  {
    "code": "+66",
    "name": "Thailand",
    "flag": "🇹🇭",
    "iso": "TH",
    "samplePlaceholder": "e.g. 081 234 5678",
    "nationalDigits": 9
  },
  {
    "code": "+670",
    "name": "Timor-Leste",
    "flag": "🇹🇱",
    "iso": "TL",
    "samplePlaceholder": "e.g. 7721 2345",
    "nationalDigits": 8
  },
  {
    "code": "+228",
    "name": "Togo",
    "flag": "🇹🇬",
    "iso": "TG",
    "samplePlaceholder": "e.g. 90 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+690",
    "name": "Tokelau",
    "flag": "🇹🇰",
    "iso": "TK",
    "samplePlaceholder": "e.g. 2123",
    "nationalDigits": 4
  },
  {
    "code": "+676",
    "name": "Tonga",
    "flag": "🇹🇴",
    "iso": "TO",
    "samplePlaceholder": "e.g. 771 2345",
    "nationalDigits": 7
  },
  {
    "code": "+1868",
    "name": "Trinidad and Tobago",
    "flag": "🇹🇹",
    "iso": "TT",
    "samplePlaceholder": "e.g. 291 1234",
    "nationalDigits": 7
  },
  {
    "code": "+216",
    "name": "Tunisia",
    "flag": "🇹🇳",
    "iso": "TN",
    "samplePlaceholder": "e.g. 20 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+90",
    "name": "Turkey",
    "flag": "🇹🇷",
    "iso": "TR",
    "samplePlaceholder": "e.g. 0501 234 56 78",
    "nationalDigits": 10
  },
  {
    "code": "+993",
    "name": "Turkmenistan",
    "flag": "🇹🇲",
    "iso": "TM",
    "samplePlaceholder": "e.g. 66 12 34 56",
    "nationalDigits": 8
  },
  {
    "code": "+1649",
    "name": "Turks and Caicos Islands",
    "flag": "🇹🇨",
    "iso": "TC",
    "samplePlaceholder": "e.g. 231 1234",
    "nationalDigits": 7
  },
  {
    "code": "+688",
    "name": "Tuvalu",
    "flag": "🇹🇻",
    "iso": "TV",
    "samplePlaceholder": "e.g. 901234",
    "nationalDigits": 6
  },
  {
    "code": "+256",
    "name": "Uganda",
    "flag": "🇺🇬",
    "iso": "UG",
    "samplePlaceholder": "e.g. 0772 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+380",
    "name": "Ukraine",
    "flag": "🇺🇦",
    "iso": "UA",
    "samplePlaceholder": "e.g. 050 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+598",
    "name": "Uruguay",
    "flag": "🇺🇾",
    "iso": "UY",
    "samplePlaceholder": "e.g. 099 123 456",
    "nationalDigits": 8
  },
  {
    "code": "+998",
    "name": "Uzbekistan",
    "flag": "🇺🇿",
    "iso": "UZ",
    "samplePlaceholder": "e.g. 90 123 45 67",
    "nationalDigits": 9
  },
  {
    "code": "+678",
    "name": "Vanuatu",
    "flag": "🇻🇺",
    "iso": "VU",
    "samplePlaceholder": "e.g. 551 2345",
    "nationalDigits": 7
  },
  {
    "code": "+39",
    "name": "Vatican City",
    "flag": "🇻🇦",
    "iso": "VA",
    "samplePlaceholder": "e.g. 06 6981 2345",
    "nationalDigits": 10
  },
  {
    "code": "+58",
    "name": "Venezuela",
    "flag": "🇻🇪",
    "iso": "VE",
    "samplePlaceholder": "e.g. 0412 123 4567",
    "nationalDigits": 10
  },
  {
    "code": "+84",
    "name": "Vietnam",
    "flag": "🇻🇳",
    "iso": "VN",
    "samplePlaceholder": "e.g. 091 234 56 78",
    "nationalDigits": 9
  },
  {
    "code": "+681",
    "name": "Wallis and Futuna",
    "flag": "🇼🇫",
    "iso": "WF",
    "samplePlaceholder": "e.g. 72 12 34",
    "nationalDigits": 6
  },
  {
    "code": "+967",
    "name": "Yemen",
    "flag": "🇾🇪",
    "iso": "YE",
    "samplePlaceholder": "e.g. 71 123 456",
    "nationalDigits": 9
  },
  {
    "code": "+260",
    "name": "Zambia",
    "flag": "🇿🇲",
    "iso": "ZM",
    "samplePlaceholder": "e.g. 097 123 4567",
    "nationalDigits": 9
  },
  {
    "code": "+263",
    "name": "Zimbabwe",
    "flag": "🇿🇼",
    "iso": "ZW",
    "samplePlaceholder": "e.g. 071 234 5678",
    "nationalDigits": 9
  }
];

export const SUPPORTED_COUNTRY_PHONES = ALL_COUNTRY_PHONES;

export interface CleanedPhoneState {
  countryCode: string;
  nationalNumber: string;
  canonicalE164: string;
  isValid: boolean;
  samplePlaceholder: string;
  feedbackHint: string;
}

/**
 * Searches the 230+ country phone database in real time by:
 * - Country name (e.g. "Nigeria", "United", "Can")
 * - Dialing prefix (e.g. "234", "+44", "1")
 * - 2-letter ISO code (e.g. "NG", "GB", "US")
 */
export function searchCountries(query: string, source: CountryPhoneOption[] = ALL_COUNTRY_PHONES): CountryPhoneOption[] {
  if (!query || !query.trim()) return source;
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  return source.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(q);
    const isoMatch = c.iso.toLowerCase() === q;
    const codeDigits = c.code.replace(/\D/g, '');
    const codeMatch = codeDigits.startsWith(q) || c.code.toLowerCase().includes(q);
    return nameMatch || isoMatch || codeMatch;
  });
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
  const countryConfig = ALL_COUNTRY_PHONES.find(c => c.code === code) || ALL_COUNTRY_PHONES[0];

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
  } else if (raw.startsWith(codeDigits) && raw.length >= codeDigits.length + 6) {
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
  const minDigits = Math.max(4, (countryConfig.nationalDigits || 10) - 3);
  const isValid = nationalWithoutTrunkZero.length >= minDigits && nationalWithoutTrunkZero.length <= 15;

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
  const sortedCodes = [...ALL_COUNTRY_PHONES].sort((a, b) => b.code.length - a.code.length);

  for (const item of sortedCodes) {
    if (clean.startsWith(item.code)) {
      return {
        countryCode: item.code,
        nationalNumber: clean.substring(item.code.length)
      };
    }
    const cDigits = item.code.replace('+', '');
    if (clean.startsWith(cDigits) && clean.length >= cDigits.length + 6) {
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
