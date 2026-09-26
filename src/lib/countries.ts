// ================================================================
// FILE: countries.ts
// ================================================================

// ----------------------------------------------------------------
// CountryInfo Interface
// ----------------------------------------------------------------
// Ye TypeScript interface define karta hai ki ek "country object" mein
// exactly kaun se fields hone chahiye aur unka data type kya hoga.
// Iska fayda: agar kisi country entry mein koi field miss ho ya galat
// type ho toh TypeScript compile time pe hi error throw kar dega -
// runtime pe bug nahi aayega.
// country name -> { dialCode, phoneDigits: [min, max], pattern description }
export interface CountryInfo {
  name: string;       // Country ka full English naam (e.g. "India") - Nominatim ke naam se exactly match karna chahiye
  dialCode: string;   // International dialing prefix, "+" ke saath (e.g. "+91")
  minDigits: number;  // Local phone number mein minimum kitne digits hone chahiye (dial code exclude)
  maxDigits: number;  // Local phone number mein maximum kitne digits allowed hain (dial code exclude)
  flag: string;       // Country ka flag emoji (e.g. "🇮🇳") - dropdown mein visual indicator ke liye
}

// ----------------------------------------------------------------
// COUNTRIES Array
// ----------------------------------------------------------------
// Ye ek exported constant array hai jisme duniya ke ~140+ countries ka
// data rakha gaya hai. `CountryInfo[]` type annotation ka matlab hai:
// "ye ek array hai jisme har element CountryInfo interface ke according hoga."
//
// Is array ka use hota hai:
//   1. Country dropdown render karne ke liye (map karo aur options banao)
//   2. findCountry() function is array ko search karta hai
//   3. validatePhone() isi array se phone digit rules fetch karta hai
//
// NOTE: Kuch countries ka dialCode same hota hai (jaise +1 USA, Canada,
// Jamaica sab liye) - is case mein phone validation country-specific
// digit rules use karta hai, sirf dialCode pe depend nahi karta.

// Full list - name must exactly match what Nominatim returns (English)
export const COUNTRIES: CountryInfo[] = [
  // -- A --
  { name: "Afghanistan", dialCode: "+93", minDigits: 9, maxDigits: 9, flag: "🇦🇫" },
  { name: "Albania", dialCode: "+355", minDigits: 9, maxDigits: 9, flag: "🇦🇱" },
  { name: "Algeria", dialCode: "+213", minDigits: 9, maxDigits: 9, flag: "🇩🇿" },
  { name: "Andorra", dialCode: "+376", minDigits: 6, maxDigits: 9, flag: "🇦🇩" }, // Andorra mein variable length numbers hain isliye range 6-9
  { name: "Angola", dialCode: "+244", minDigits: 9, maxDigits: 9, flag: "🇦🇴" },
  { name: "Argentina", dialCode: "+54", minDigits: 10, maxDigits: 11, flag: "🇦🇷" }, // Argentina mein mobile aur landline digits differ karte hain
  { name: "Armenia", dialCode: "+374", minDigits: 8, maxDigits: 8, flag: "🇦🇲" },
  { name: "Australia", dialCode: "+61", minDigits: 9, maxDigits: 9, flag: "🇦🇺" },
  { name: "Austria", dialCode: "+43", minDigits: 10, maxDigits: 13, flag: "🇦🇹" }, // Austria mein landline numbers bahut lambe ho sakte hain (13 digits tak)
  { name: "Azerbaijan", dialCode: "+994", minDigits: 9, maxDigits: 9, flag: "🇦🇿" },

  // -- B --
  { name: "Bahrain", dialCode: "+973", minDigits: 8, maxDigits: 8, flag: "🇧🇭" },
  { name: "Bangladesh", dialCode: "+880", minDigits: 10, maxDigits: 10, flag: "🇧🇩" },
  { name: "Belarus", dialCode: "+375", minDigits: 9, maxDigits: 9, flag: "🇧🇾" },
  { name: "Belgium", dialCode: "+32", minDigits: 9, maxDigits: 9, flag: "🇧🇪" },
  { name: "Bhutan", dialCode: "+975", minDigits: 8, maxDigits: 8, flag: "🇧🇹" },
  { name: "Bolivia", dialCode: "+591", minDigits: 8, maxDigits: 8, flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", dialCode: "+387", minDigits: 8, maxDigits: 8, flag: "🇧🇦" },
  { name: "Botswana", dialCode: "+267", minDigits: 8, maxDigits: 8, flag: "🇧🇼" },
  { name: "Brazil", dialCode: "+55", minDigits: 10, maxDigits: 11, flag: "🇧🇷" }, // Brazil mein mobile 11 digit, landline 10 digit hote hain
  { name: "Brunei", dialCode: "+673", minDigits: 7, maxDigits: 7, flag: "🇧🇳" },
  { name: "Bulgaria", dialCode: "+359", minDigits: 9, maxDigits: 9, flag: "🇧🇬" },

  // -- C --
  { name: "Cambodia", dialCode: "+855", minDigits: 9, maxDigits: 9, flag: "🇰🇭" },
  { name: "Cameroon", dialCode: "+237", minDigits: 9, maxDigits: 9, flag: "🇨🇲" },
  { name: "Canada", dialCode: "+1", minDigits: 10, maxDigits: 10, flag: "🇨🇦" }, // Canada aur USA dono ka dialCode +1 hai - naam se distinguish hota hai
  { name: "Chile", dialCode: "+56", minDigits: 9, maxDigits: 9, flag: "🇨🇱" },
  { name: "China", dialCode: "+86", minDigits: 11, maxDigits: 11, flag: "🇨🇳" }, // China mein mobile numbers exactly 11 digits ke hote hain
  { name: "Colombia", dialCode: "+57", minDigits: 10, maxDigits: 10, flag: "🇨🇴" },
  { name: "Croatia", dialCode: "+385", minDigits: 8, maxDigits: 9, flag: "🇭🇷" },
  { name: "Cuba", dialCode: "+53", minDigits: 8, maxDigits: 8, flag: "🇨🇺" },
  { name: "Cyprus", dialCode: "+357", minDigits: 8, maxDigits: 8, flag: "🇨🇾" },
  { name: "Czech Republic", dialCode: "+420", minDigits: 9, maxDigits: 9, flag: "🇨🇿" },

  // -- D --
  { name: "Denmark", dialCode: "+45", minDigits: 8, maxDigits: 8, flag: "🇩🇰" },

  // -- E --
  { name: "Ecuador", dialCode: "+593", minDigits: 9, maxDigits: 9, flag: "🇪🇨" },
  { name: "Egypt", dialCode: "+20", minDigits: 10, maxDigits: 10, flag: "🇪🇬" },
  { name: "Ethiopia", dialCode: "+251", minDigits: 9, maxDigits: 9, flag: "🇪🇹" },

  // -- F --
  { name: "Finland", dialCode: "+358", minDigits: 9, maxDigits: 11, flag: "🇫🇮" }, // Finland mein special numbers 11 digit tak ho sakte hain
  { name: "France", dialCode: "+33", minDigits: 9, maxDigits: 9, flag: "🇫🇷" },

  // -- G --
  { name: "Georgia", dialCode: "+995", minDigits: 9, maxDigits: 9, flag: "🇬🇪" },
  { name: "Germany", dialCode: "+49", minDigits: 10, maxDigits: 12, flag: "🇩🇪" }, // Germany mein landline area codes alag-alag length ke hain isliye range zyada broad hai
  { name: "Ghana", dialCode: "+233", minDigits: 9, maxDigits: 9, flag: "🇬🇭" },
  { name: "Greece", dialCode: "+30", minDigits: 10, maxDigits: 10, flag: "🇬🇷" },
  { name: "Guatemala", dialCode: "+502", minDigits: 8, maxDigits: 8, flag: "🇬🇹" },

  // -- H --
  { name: "Hong Kong", dialCode: "+852", minDigits: 8, maxDigits: 8, flag: "🇭🇰" },
  { name: "Hungary", dialCode: "+36", minDigits: 9, maxDigits: 9, flag: "🇭🇺" },

  // -- I --
  { name: "Iceland", dialCode: "+354", minDigits: 7, maxDigits: 9, flag: "🇮🇸" },
  { name: "India", dialCode: "+91", minDigits: 10, maxDigits: 10, flag: "🇮🇳" }, // India mein saare mobile numbers exactly 10 digits ke hote hain
  { name: "Indonesia", dialCode: "+62", minDigits: 10, maxDigits: 12, flag: "🇮🇩" }, // Indonesia mein regional codes alag hain isliye range wider hai
  { name: "Iran", dialCode: "+98", minDigits: 10, maxDigits: 10, flag: "🇮🇷" },
  { name: "Iraq", dialCode: "+964", minDigits: 10, maxDigits: 10, flag: "🇮🇶" },
  { name: "Ireland", dialCode: "+353", minDigits: 9, maxDigits: 9, flag: "🇮🇪" },
  { name: "Israel", dialCode: "+972", minDigits: 9, maxDigits: 9, flag: "🇮🇱" },
  { name: "Italy", dialCode: "+39", minDigits: 9, maxDigits: 11, flag: "🇮🇹" }, // Italy mein landline numbers 11 digits tak ho sakte hain

  // -- J --
  { name: "Jamaica", dialCode: "+1", minDigits: 10, maxDigits: 10, flag: "🇯🇲" }, // Jamaica ka dialCode bhi +1 hai (North American Numbering Plan)
  { name: "Japan", dialCode: "+81", minDigits: 10, maxDigits: 11, flag: "🇯🇵" },
  { name: "Jordan", dialCode: "+962", minDigits: 9, maxDigits: 9, flag: "🇯🇴" },

  // -- K --
  { name: "Kazakhstan", dialCode: "+7", minDigits: 10, maxDigits: 10, flag: "🇰🇿" }, // Kazakhstan aur Russia dono ka dialCode +7 hai
  { name: "Kenya", dialCode: "+254", minDigits: 9, maxDigits: 9, flag: "🇰🇪" },
  { name: "Kuwait", dialCode: "+965", minDigits: 8, maxDigits: 8, flag: "🇰🇼" },
  { name: "Kyrgyzstan", dialCode: "+996", minDigits: 9, maxDigits: 9, flag: "🇰🇬" },

  // -- L --
  { name: "Laos", dialCode: "+856", minDigits: 9, maxDigits: 10, flag: "🇱🇦" },
  { name: "Latvia", dialCode: "+371", minDigits: 8, maxDigits: 8, flag: "🇱🇻" },
  { name: "Lebanon", dialCode: "+961", minDigits: 8, maxDigits: 8, flag: "🇱🇧" },
  { name: "Libya", dialCode: "+218", minDigits: 9, maxDigits: 9, flag: "🇱🇾" },
  { name: "Lithuania", dialCode: "+370", minDigits: 8, maxDigits: 8, flag: "🇱🇹" },
  { name: "Luxembourg", dialCode: "+352", minDigits: 9, maxDigits: 11, flag: "🇱🇺" },

  // -- M --
  { name: "Macau", dialCode: "+853", minDigits: 8, maxDigits: 8, flag: "🇲🇴" },
  { name: "Malaysia", dialCode: "+60", minDigits: 9, maxDigits: 10, flag: "🇲🇾" },
  { name: "Maldives", dialCode: "+960", minDigits: 7, maxDigits: 7, flag: "🇲🇻" }, // Maldives bahut chhota desh hai isliye sirf 7 digits
  { name: "Mexico", dialCode: "+52", minDigits: 10, maxDigits: 10, flag: "🇲🇽" },
  { name: "Moldova", dialCode: "+373", minDigits: 8, maxDigits: 8, flag: "🇲🇩" },
  { name: "Mongolia", dialCode: "+976", minDigits: 8, maxDigits: 8, flag: "🇲🇳" },
  { name: "Morocco", dialCode: "+212", minDigits: 9, maxDigits: 9, flag: "🇲🇦" },
  { name: "Mozambique", dialCode: "+258", minDigits: 9, maxDigits: 9, flag: "🇲🇿" },
  { name: "Myanmar", dialCode: "+95", minDigits: 9, maxDigits: 10, flag: "🇲🇲" },

  // -- N --
  { name: "Nepal", dialCode: "+977", minDigits: 10, maxDigits: 10, flag: "🇳🇵" },
  { name: "Netherlands", dialCode: "+31", minDigits: 9, maxDigits: 9, flag: "🇳🇱" },
  { name: "New Zealand", dialCode: "+64", minDigits: 9, maxDigits: 10, flag: "🇳🇿" },
  { name: "Nigeria", dialCode: "+234", minDigits: 10, maxDigits: 10, flag: "🇳🇬" },
  { name: "North Korea", dialCode: "+850", minDigits: 9, maxDigits: 10, flag: "🇰🇵" },
  { name: "Norway", dialCode: "+47", minDigits: 8, maxDigits: 8, flag: "🇳🇴" },

  // -- O --
  { name: "Oman", dialCode: "+968", minDigits: 8, maxDigits: 8, flag: "🇴🇲" },

  // -- P --
  { name: "Pakistan", dialCode: "+92", minDigits: 10, maxDigits: 10, flag: "🇵🇰" },
  { name: "Palestine", dialCode: "+970", minDigits: 9, maxDigits: 9, flag: "🇵🇸" },
  { name: "Panama", dialCode: "+507", minDigits: 8, maxDigits: 8, flag: "🇵🇦" },
  { name: "Paraguay", dialCode: "+595", minDigits: 9, maxDigits: 9, flag: "🇵🇾" },
  { name: "Peru", dialCode: "+51", minDigits: 9, maxDigits: 9, flag: "🇵🇪" },
  { name: "Philippines", dialCode: "+63", minDigits: 10, maxDigits: 10, flag: "🇵🇭" },
  { name: "Poland", dialCode: "+48", minDigits: 9, maxDigits: 9, flag: "🇵🇱" },
  { name: "Portugal", dialCode: "+351", minDigits: 9, maxDigits: 9, flag: "🇵🇹" },

  // -- Q --
  { name: "Qatar", dialCode: "+974", minDigits: 8, maxDigits: 8, flag: "🇶🇦" },

  // -- R --
  { name: "Romania", dialCode: "+40", minDigits: 9, maxDigits: 9, flag: "🇷🇴" },
  { name: "Russia", dialCode: "+7", minDigits: 10, maxDigits: 10, flag: "🇷🇺" }, // Russia ka dialCode +7 hai - Kazakhstan bhi same use karta hai
  { name: "Rwanda", dialCode: "+250", minDigits: 9, maxDigits: 9, flag: "🇷🇼" },

  // -- S --
  { name: "Saudi Arabia", dialCode: "+966", minDigits: 9, maxDigits: 9, flag: "🇸🇦" },
  { name: "Senegal", dialCode: "+221", minDigits: 9, maxDigits: 9, flag: "🇸🇳" },
  { name: "Serbia", dialCode: "+381", minDigits: 9, maxDigits: 9, flag: "🇷🇸" },
  { name: "Singapore", dialCode: "+65", minDigits: 8, maxDigits: 8, flag: "🇸🇬" },
  { name: "Slovakia", dialCode: "+421", minDigits: 9, maxDigits: 9, flag: "🇸🇰" },
  { name: "Slovenia", dialCode: "+386", minDigits: 8, maxDigits: 8, flag: "🇸🇮" },
  { name: "Somalia", dialCode: "+252", minDigits: 9, maxDigits: 9, flag: "🇸🇴" },
  { name: "South Africa", dialCode: "+27", minDigits: 9, maxDigits: 11, flag: "🇿🇦" },
  { name: "South Korea", dialCode: "+82", minDigits: 10, maxDigits: 10, flag: "🇰🇷" },
  { name: "Spain", dialCode: "+34", minDigits: 9, maxDigits: 9, flag: "🇪🇸" },
  { name: "Sri Lanka", dialCode: "+94", minDigits: 9, maxDigits: 9, flag: "🇱🇰" },
  { name: "Sudan", dialCode: "+249", minDigits: 9, maxDigits: 9, flag: "🇸🇩" },
  { name: "Sweden", dialCode: "+46", minDigits: 9, maxDigits: 10, flag: "🇸🇪" },
  { name: "Switzerland", dialCode: "+41", minDigits: 9, maxDigits: 9, flag: "🇨🇭" },
  { name: "Syria", dialCode: "+963", minDigits: 9, maxDigits: 9, flag: "🇸🇾" },

  // -- T --
  { name: "Taiwan", dialCode: "+886", minDigits: 9, maxDigits: 10, flag: "🇹🇼" },
  { name: "Tajikistan", dialCode: "+992", minDigits: 9, maxDigits: 9, flag: "🇹🇯" },
  { name: "Tanzania", dialCode: "+255", minDigits: 9, maxDigits: 9, flag: "🇹🇿" },
  { name: "Thailand", dialCode: "+66", minDigits: 9, maxDigits: 9, flag: "🇹🇭" },
  { name: "Tunisia", dialCode: "+216", minDigits: 8, maxDigits: 8, flag: "🇹🇳" },
  { name: "Turkey", dialCode: "+90", minDigits: 10, maxDigits: 10, flag: "🇹🇷" },
  { name: "Turkmenistan", dialCode: "+993", minDigits: 8, maxDigits: 8, flag: "🇹🇲" },

  // -- U --
  { name: "Uganda", dialCode: "+256", minDigits: 9, maxDigits: 9, flag: "🇺🇬" },
  { name: "Ukraine", dialCode: "+380", minDigits: 9, maxDigits: 9, flag: "🇺🇦" },
  { name: "United Arab Emirates", dialCode: "+971", minDigits: 9, maxDigits: 9, flag: "🇦🇪" },
  { name: "United Kingdom", dialCode: "+44", minDigits: 10, maxDigits: 10, flag: "🇬🇧" },
  { name: "United States", dialCode: "+1", minDigits: 10, maxDigits: 10, flag: "🇺🇸" }, // USA, Canada, Jamaica sab +1 share karte hain lekin validation alag hai
  { name: "Uruguay", dialCode: "+598", minDigits: 9, maxDigits: 9, flag: "🇺🇾" },
  { name: "Uzbekistan", dialCode: "+998", minDigits: 9, maxDigits: 9, flag: "🇺🇿" },

  // -- V --
  { name: "Venezuela", dialCode: "+58", minDigits: 10, maxDigits: 10, flag: "🇻🇪" },
  { name: "Vietnam", dialCode: "+84", minDigits: 9, maxDigits: 10, flag: "🇻🇳" },

  // -- Y --
  { name: "Yemen", dialCode: "+967", minDigits: 9, maxDigits: 9, flag: "🇾🇪" },

  // -- Z --
  { name: "Zambia", dialCode: "+260", minDigits: 9, maxDigits: 9, flag: "🇿🇲" },
  { name: "Zimbabwe", dialCode: "+263", minDigits: 9, maxDigits: 9, flag: "🇿🇼" },
];

// ----------------------------------------------------------------
// findCountry() - Country dhundne ka function
// ----------------------------------------------------------------
// Ye function country ka naam lekar COUNTRIES array mein se us country ki
// poori info return karta hai (CountryInfo object).
//
// Parameters:
//   name (string) - Country ka naam jaise "India", "Pakistan", "Germany"
//
// Returns:
//   CountryInfo object agar country mili - jisme dialCode, minDigits etc. hain
//   undefined agar naam se koi match nahi mila (toh validatePhone fallback use karega)
//
// USAGE EXAMPLE:
//   const info = findCountry("India");
//   console.log(info?.dialCode); // "+91"
//   console.log(info?.flag);     // "🇮🇳"
export function findCountry(name: string): CountryInfo | undefined {
  const q: string = name.trim().toLowerCase(); // Pehle naam ke aage-peeche spaces hatao, phir lowercase karo taaki "India" aur "india" dono match ho sakein
  return COUNTRIES.find((c: CountryInfo): boolean => c.name.toLowerCase() === q); // Array mein har country ko check karo - jo match kare wahi return karo
}

// ----------------------------------------------------------------
// validatePhone() - Phone number valid hai ya nahi check karna
// ----------------------------------------------------------------
// Ye function kisi bhi phone number ko validate karta hai us country ke
// rules ke according. Form submission se pehle is function ko call kiya
// jaata hai taaki user ne galat format ka number toh nahi diya.
//
// Parameters:
//   phone (string)       - User ka input, jaise "9876543210" ya "+91-9876 543210"
//   countryName (string) - Country ka naam, jaise "India"
//
// Returns:
//   true  - Phone number valid hai (digit count sahi range mein hai)
//   false - Phone number invalid hai (bahut chhota ya bahut bada)
//
// LOGIC SAMJHO:
//   1. Phone string se saare non-digit characters hatao (\D matlab "not a digit")
//   2. Agar country mili toh us country ke minDigits/maxDigits se compare karo
//   3. Agar country nahi mili (unknown country) toh generic international rule:
//      ITU-T standard ke according phone numbers 7 se 15 digits ke beech hote hain
//
// USAGE EXAMPLE:
//   validatePhone("9876543210", "India")     // true  (exactly 10 digits)
//   validatePhone("987654", "India")         // false (sirf 6 digits, kam hai)
//   validatePhone("+91 98765 43210", "India") // true (non-digits hata ke 10 digits bache)
export function validatePhone(phone: string, countryName: string): boolean {
  const digits: string = phone.replace(/\D/g, ""); // Regex \D = "non-digit character" - spaces, dashes, brackets, plus sign sab hata do, sirf numbers rakho
  const info: CountryInfo | undefined = findCountry(countryName); // Is country ke liye digit rules fetch karo
  if (!info) return digits.length >= 7 && digits.length <= 15; // Agar country data nahi mili toh generic ITU-T international standard use karo (7-15 digits)
  return digits.length >= info.minDigits && digits.length <= info.maxDigits; // Country-specific validation: digits count us country ki valid range mein hona chahiye
}