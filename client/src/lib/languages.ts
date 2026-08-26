export const languages = [
  { code: "en", label: "English", native: "English", experimental: false },
  { code: "hi", label: "Hindi", native: "हिन्दी", experimental: false },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", experimental: false },
  { code: "mr", label: "Marathi", native: "मराठी", experimental: true },
  { code: "bn", label: "Bengali", native: "বাংলা", experimental: true },
  { code: "ta", label: "Tamil", native: "தமிழ்", experimental: true },
  { code: "te", label: "Telugu", native: "తెలుగు", experimental: true },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", experimental: true },
  { code: "ml", label: "Malayalam", native: "മലയാളം", experimental: true },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", experimental: true },
] as const;

export type Language = (typeof languages)[number]["code"];

export const experimentalLanguageCodes = languages
  .filter((language) => language.experimental)
  .map((language) => language.code);
