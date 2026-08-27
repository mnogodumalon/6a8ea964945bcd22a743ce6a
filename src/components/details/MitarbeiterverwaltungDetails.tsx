import type { Mitarbeiterverwaltung, Schichtplanung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface MitarbeiterverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Mitarbeiterverwaltung;
  /** 1:N „Schichtplanung" (mitarbeiter): VOLLE Liste — der Block filtert auf diesen Record. */
  schichtplanungList: Schichtplanung[];
  /** Zeilen-Klick → overlay.push auf das Schichtplanung-Detail (nie der Edit-Dialog). */
  onOpenSchichtplanung: (record: Schichtplanung) => void;
  /** Kontextuelles „+": öffnet den Schichtplanung-Dialog mit diesem Record vorgesetzt. */
  onAddSchichtplanung: () => void;
}

export function MitarbeiterverwaltungDetails({
  record,
  schichtplanungList,
  onOpenSchichtplanung,
  onAddSchichtplanung,
}: MitarbeiterverwaltungDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'abteilung')} value={record.fields.abteilung} format="text" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'position')} value={record.fields.position} format="text" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'beschaeftigungsart')} value={record.fields.beschaeftigungsart} format="pill" />
        <RecordField label={fieldLabel('mitarbeiterverwaltung', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('schichtplanung')}
        items={schichtplanungList.filter(r => extractRecordId(r.fields.mitarbeiter) === record.record_id)}
        map={r => ({ name: r.fields.bereich ?? appLabel('schichtplanung'), meta: r.fields.datum })}
        onOpen={onOpenSchichtplanung}
        onAdd={onAddSchichtplanung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MITARBEITERVERWALTUNG} recordId={record.record_id} />
    </>
  );
}
