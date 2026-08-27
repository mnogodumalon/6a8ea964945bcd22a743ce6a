import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
    abteilung?: string;
    position?: string;
    beschaeftigungsart?: LookupValue;
    notizen?: string;
  };
}

export interface Schichttypen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    kuerzel?: string;
    startzeit?: string;
    endzeit?: string;
    pausendauer?: number;
    beschreibung?: string;
  };
}

export interface Schichtplanung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    mitarbeiter?: RecordUrl; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    schichttyp?: RecordUrl; // applookup -> URL zu 'Schichttypen' Record
    bereich?: string;
    anmerkungen?: string;
  };
}

export const APP_IDS = {
  MITARBEITERVERWALTUNG: '6a8ea94b2c75efc3d74cf88a',
  SCHICHTTYPEN: '6a8ea94f92a7e5a47c8a69a4',
  SCHICHTPLANUNG: '6a8ea950bf339d438377da34',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeiterverwaltung': {
    beschaeftigungsart: [{ key: "vollzeit", get label() { return lookupLabel('mitarbeiterverwaltung', 'beschaeftigungsart', "vollzeit") ?? "Vollzeit"; } }, { key: "teilzeit", get label() { return lookupLabel('mitarbeiterverwaltung', 'beschaeftigungsart', "teilzeit") ?? "Teilzeit"; } }, { key: "minijob", get label() { return lookupLabel('mitarbeiterverwaltung', 'beschaeftigungsart', "minijob") ?? "Minijob"; } }, { key: "aushilfe", get label() { return lookupLabel('mitarbeiterverwaltung', 'beschaeftigungsart', "aushilfe") ?? "Aushilfe"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitarbeiterverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'abteilung': 'string/text',
    'position': 'string/text',
    'beschaeftigungsart': 'lookup/select',
    'notizen': 'string/textarea',
  },
  'schichttypen': {
    'bezeichnung': 'string/text',
    'kuerzel': 'string/text',
    'startzeit': 'string/text',
    'endzeit': 'string/text',
    'pausendauer': 'number',
    'beschreibung': 'string/textarea',
  },
  'schichtplanung': {
    'datum': 'date/date',
    'mitarbeiter': 'applookup/select',
    'schichttyp': 'applookup/select',
    'bereich': 'string/text',
    'anmerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;
export type CreateSchichttypen = StripLookup<Schichttypen['fields']>;
export type CreateSchichtplanung = StripLookup<Schichtplanung['fields']>;