/**
 * Minor consent regulations by country/region.
 * 
 * Maps ISO 3166-1 alpha-2 country codes to their consent age threshold.
 * If the user's age is below the threshold AND the country requires
 * parental consent, the COPPA-like flow is triggered.
 * 
 * Countries/regions not listed here do NOT require parental consent
 * for minors (or have no specific digital-consent law).
 */

export type ConsentRegulation = {
  /** Minimum age for independent digital consent */
  consentAge: number;
  /** Name of the applicable law/regulation */
  law: string;
  /** Short label for UI display */
  label: string;
};

/**
 * Countries that require parental consent for minors in digital services.
 * 
 * Sources:
 * - USA: COPPA (Children's Online Privacy Protection Act) — under 13
 * - EU/EEA: GDPR Article 8 — varies by member state (13-16)
 * - UK: UK GDPR / Age Appropriate Design Code — under 13
 * - South Korea: PIPA — under 14
 * - Brazil: LGPD — under 12 (absolute minor), under 18 (relative)
 * - Canada: PIPEDA — under 13
 * - Australia: Privacy Act — under 15
 * - Japan: APPI — under 15
 * - Argentina: PDPA — under 13
 * - Chile: Ley 19.628 — under 14
 * - Colombia: Ley 1581 — under 14
 * - China: PIPL — under 14
 */
export const CONSENT_REGULATIONS: Record<string, ConsentRegulation> = {
  // North America
  US: { consentAge: 13, law: 'COPPA', label: 'EE.UU. (COPPA)' },
  CA: { consentAge: 13, law: 'PIPEDA', label: 'Canadá (PIPEDA)' },

  // Europe — GDPR Article 8 (member states set 13-16)
  AT: { consentAge: 14, law: 'GDPR', label: 'Austria (GDPR)' },
  BE: { consentAge: 13, law: 'GDPR', label: 'Bélgica (GDPR)' },
  BG: { consentAge: 14, law: 'GDPR', label: 'Bulgaria (GDPR)' },
  HR: { consentAge: 16, law: 'GDPR', label: 'Croacia (GDPR)' },
  CY: { consentAge: 14, law: 'GDPR', label: 'Chipre (GDPR)' },
  CZ: { consentAge: 15, law: 'GDPR', label: 'Chequia (GDPR)' },
  DK: { consentAge: 13, law: 'GDPR', label: 'Dinamarca (GDPR)' },
  EE: { consentAge: 13, law: 'GDPR', label: 'Estonia (GDPR)' },
  FI: { consentAge: 13, law: 'GDPR', label: 'Finlandia (GDPR)' },
  FR: { consentAge: 15, law: 'GDPR', label: 'Francia (GDPR)' },
  DE: { consentAge: 16, law: 'GDPR', label: 'Alemania (GDPR)' },
  GR: { consentAge: 15, law: 'GDPR', label: 'Grecia (GDPR)' },
  HU: { consentAge: 16, law: 'GDPR', label: 'Hungría (GDPR)' },
  IE: { consentAge: 16, law: 'GDPR', label: 'Irlanda (GDPR)' },
  IT: { consentAge: 14, law: 'GDPR', label: 'Italia (GDPR)' },
  LV: { consentAge: 13, law: 'GDPR', label: 'Letonia (GDPR)' },
  LT: { consentAge: 14, law: 'GDPR', label: 'Lituania (GDPR)' },
  LU: { consentAge: 16, law: 'GDPR', label: 'Luxemburgo (GDPR)' },
  MT: { consentAge: 13, law: 'GDPR', label: 'Malta (GDPR)' },
  NL: { consentAge: 16, law: 'GDPR', label: 'Países Bajos (GDPR)' },
  PL: { consentAge: 16, law: 'GDPR', label: 'Polonia (GDPR)' },
  PT: { consentAge: 13, law: 'GDPR', label: 'Portugal (GDPR)' },
  RO: { consentAge: 16, law: 'GDPR', label: 'Rumanía (GDPR)' },
  SK: { consentAge: 16, law: 'GDPR', label: 'Eslovaquia (GDPR)' },
  SI: { consentAge: 16, law: 'GDPR', label: 'Eslovenia (GDPR)' },
  ES: { consentAge: 14, law: 'GDPR', label: 'España (GDPR)' },
  SE: { consentAge: 13, law: 'GDPR', label: 'Suecia (GDPR)' },

  // EEA (non-EU)
  IS: { consentAge: 13, law: 'GDPR', label: 'Islandia (GDPR)' },
  LI: { consentAge: 16, law: 'GDPR', label: 'Liechtenstein (GDPR)' },
  NO: { consentAge: 13, law: 'GDPR', label: 'Noruega (GDPR)' },

  // UK
  GB: { consentAge: 13, law: 'UK GDPR', label: 'Reino Unido (UK GDPR)' },

  // Asia
  KR: { consentAge: 14, law: 'PIPA', label: 'Corea del Sur (PIPA)' },
  JP: { consentAge: 15, law: 'APPI', label: 'Japón (APPI)' },
  CN: { consentAge: 14, law: 'PIPL', label: 'China (PIPL)' },

  // Latin America
  BR: { consentAge: 12, law: 'LGPD', label: 'Brasil (LGPD)' },
  AR: { consentAge: 13, law: 'PDPA', label: 'Argentina (PDPA)' },
  CL: { consentAge: 14, law: 'Ley 19.628', label: 'Chile (Ley 19.628)' },
  CO: { consentAge: 14, law: 'Ley 1581', label: 'Colombia (Ley 1581)' },

  // Oceania
  AU: { consentAge: 15, law: 'Privacy Act', label: 'Australia (Privacy Act)' },
  NZ: { consentAge: 16, law: 'Privacy Act 2020', label: 'Nueva Zelanda' },
};

/**
 * Countries that do NOT require special parental consent
 * (includes Mexico — LFPDPPP does not have a specific digital consent
 * age for minors accessing online services, unlike COPPA/GDPR).
 * 
 * If a country code is NOT in CONSENT_REGULATIONS, we skip
 * the parental consent flow entirely.
 */

/**
 * Determine if a country requires parental consent for a given age.
 */
export function requiresParentalConsent(countryCode: string, age: number): boolean {
  const regulation = CONSENT_REGULATIONS[countryCode.toUpperCase()];
  if (!regulation) return false;
  return age < regulation.consentAge;
}

/**
 * Get the consent regulation for a country, or null if none.
 */
export function getConsentRegulation(countryCode: string): ConsentRegulation | null {
  return CONSENT_REGULATIONS[countryCode.toUpperCase()] || null;
}

/**
 * Map common timezones to country codes as a fallback.
 * Only maps unambiguous timezone → country mappings.
 */
export const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Americas
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Detroit': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/Montreal': 'CA',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Monterrey': 'MX',
  'America/Tijuana': 'MX',
  'America/Chihuahua': 'MX',
  'America/Hermosillo': 'MX',
  'America/Mazatlan': 'MX',
  'America/Merida': 'MX',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Santiago': 'CL',
  'America/Buenos_Aires': 'AR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Sao_Paulo': 'BR',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'America/Asuncion': 'PY',
  'America/Montevideo': 'UY',
  'America/La_Paz': 'BO',

  // Europe
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Lisbon': 'PT',
  'Europe/Dublin': 'IE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR',

  // Asia
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'CN',
  'Asia/Kolkata': 'IN',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Taipei': 'TW',

  // Oceania
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Pacific/Auckland': 'NZ',
};

/**
 * Detect country from client timezone (fallback method).
 */
export function detectCountryFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_COUNTRY[tz] || null;
  } catch {
    return null;
  }
}
