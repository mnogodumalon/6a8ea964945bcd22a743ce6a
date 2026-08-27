import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'bezeichnung',
    'kuerzel',
    { row: ['startzeit', 'endzeit'] },
    'pausendauer',
    'beschreibung',
  ],
  defaults: {
    'pausendauer': { kind: 'literal', value: 30 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
