// אפשרויות קבועות לכרטיס לקוח — לפי המפרט

export const SECTORS = [
  "חסידי קלאסי",
  "חסידי מודרני",
  "ליטאי קלאסי",
  "ליטאי מודרני",
  "ספרדי",
  "דתי לאומי",
  "חילוני",
] as const;

export const SOURCES = [
  "אינסטגרם",
  "פייסבוק",
  "טיקטוק",
  "שילוט רחוב",
  "מגזין נשים",
  "מגזין מקומי",
  "סטטוס",
  "המלצה",
  "אחר",
] as const;

export const EVENT_TYPES = [
  "חתונה מקרבה ראשונה",
  "בר מצווה",
  "בת מצווה",
  "שבע ברכות",
  "שבת שבע ברכות",
  "אחר",
] as const;

export const LANGUAGES = [
  { v: "he", l: "עברית" },
  { v: "en", l: "אנגלית" },
  { v: "yi", l: "אידיש" },
] as const;

export const langLabel = (v: string | null | undefined) =>
  LANGUAGES.find((l) => l.v === v)?.l ?? "-";
