import type { Schichtplanung } from './app';

export type EnrichedSchichtplanung = Schichtplanung & {
  mitarbeiterName: string;
  schichttypName: string;
};
