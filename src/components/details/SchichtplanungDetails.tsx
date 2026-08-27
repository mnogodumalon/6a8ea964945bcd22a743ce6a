import type { Schichtplanung, Mitarbeiterverwaltung, Schichttypen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface SchichtplanungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Schichtplanung;
  /** N:1-Ziel „Mitarbeiterverwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  /** Klick auf die Mitarbeiterverwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenMitarbeiterverwaltung?: (record: Mitarbeiterverwaltung) => void;
  /** N:1-Ziel „Schichttypen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  schichttypenList: Schichttypen[];
  /** Klick auf die Schichttypen-Relation → overlay.push auf dessen Detail. */
  onOpenSchichttypen?: (record: Schichttypen) => void;
}

export function SchichtplanungDetails({
  record,
  mitarbeiterverwaltungList,
  onOpenMitarbeiterverwaltung,
  schichttypenList,
  onOpenSchichttypen,
}: SchichtplanungDetailsProps) {
  const mitarbeiterTarget = mitarbeiterverwaltungList.find(r => r.record_id === extractRecordId(record.fields.mitarbeiter));
  const schichttypTarget = schichttypenList.find(r => r.record_id === extractRecordId(record.fields.schichttyp));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('schichtplanung', 'datum')} value={record.fields.datum} format="date" />
        <RecordField label={fieldLabel('schichtplanung', 'bereich')} value={record.fields.bereich} format="text" />
        <RecordField label={fieldLabel('schichtplanung', 'anmerkungen')} value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('schichtplanung', 'mitarbeiter')}
          name={mitarbeiterTarget?.fields.vorname ?? '—'}
          meta={[mitarbeiterTarget?.fields.telefon, mitarbeiterTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={mitarbeiterTarget && onOpenMitarbeiterverwaltung ? () => onOpenMitarbeiterverwaltung!(mitarbeiterTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('schichtplanung', 'schichttyp')}
          name={schichttypTarget?.fields.bezeichnung ?? '—'}
          meta={[schichttypTarget?.fields.kuerzel, schichttypTarget?.fields.startzeit].filter(Boolean).join(' · ') || undefined}
          onClick={schichttypTarget && onOpenSchichttypen ? () => onOpenSchichttypen!(schichttypTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SCHICHTPLANUNG} recordId={record.record_id} />
    </>
  );
}
