import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'datum',
    'mitarbeiter',
    'schichttyp',
    'bereich',
    'anmerkungen',
  ],
  defaults: {
    'datum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
