import type { Schichttypen, Schichtplanung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SchichttypenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Schichttypen;
  /** 1:N „Schichtplanung" (schichttyp): VOLLE Liste — der Block filtert auf diesen Record. */
  schichtplanungList: Schichtplanung[];
  /** Zeilen-Klick → overlay.push auf das Schichtplanung-Detail (nie der Edit-Dialog). */
  onOpenSchichtplanung: (record: Schichtplanung) => void;
  /** Kontextuelles „+": öffnet den Schichtplanung-Dialog mit diesem Record vorgesetzt. */
  onAddSchichtplanung: () => void;
}

export function SchichttypenDetails({
  record,
  schichtplanungList,
  onOpenSchichtplanung,
  onAddSchichtplanung,
}: SchichttypenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('schichttypen', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('schichttypen', 'kuerzel')} value={record.fields.kuerzel} format="text" />
        <RecordField label={fieldLabel('schichttypen', 'startzeit')} value={record.fields.startzeit} format="text" />
        <RecordField label={fieldLabel('schichttypen', 'endzeit')} value={record.fields.endzeit} format="text" />
        <RecordField label={fieldLabel('schichttypen', 'pausendauer')} value={record.fields.pausendauer} format="text" />
        <RecordField label={fieldLabel('schichttypen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('schichtplanung')}
        items={schichtplanungList.filter(r => extractRecordId(r.fields.schichttyp) === record.record_id)}
        map={r => ({ name: r.fields.bereich ?? appLabel('schichtplanung'), meta: r.fields.datum })}
        onOpen={onOpenSchichtplanung}
        onAdd={onAddSchichtplanung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SCHICHTTYPEN} recordId={record.record_id} />
    </>
  );
}
