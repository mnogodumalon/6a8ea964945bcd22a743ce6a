/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'mitarbeiterverwaltung'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.mitarbeiterverwaltung.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.mitarbeiterverwaltung.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.mitarbeiterverwaltung.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.mitarbeiterverwaltung              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   mitarbeiterverwaltung: vorname, nachname, telefon, email, abteilung, position, beschaeftigungsart, notizen  ·  ← schichtplanung (list + contextual +)
 *   schichttypen: bezeichnung, kuerzel, startzeit, endzeit, pausendauer, beschreibung  ·  ← schichtplanung (list + contextual +)
 *   schichtplanung: datum, mitarbeiter, schichttyp, bereich, anmerkungen  ·  → mitarbeiterverwaltung · → schichttypen
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Mitarbeiterverwaltung, Schichttypen, Schichtplanung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichSchichtplanung } from '@/lib/enrich';
import type { EnrichedSchichtplanung } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { MitarbeiterverwaltungDialog, type MitarbeiterverwaltungDialogDefaults } from '@/components/dialogs/MitarbeiterverwaltungDialog';
import { MitarbeiterverwaltungDetails } from '@/components/details/MitarbeiterverwaltungDetails';
import { SchichttypenDialog, type SchichttypenDialogDefaults } from '@/components/dialogs/SchichttypenDialog';
import { SchichttypenDetails } from '@/components/details/SchichttypenDetails';
import { SchichtplanungDialog, type SchichtplanungDialogDefaults } from '@/components/dialogs/SchichtplanungDialog';
import { SchichtplanungDetails } from '@/components/details/SchichtplanungDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'mitarbeiterverwaltung'; record: Mitarbeiterverwaltung }
  | { type: 'schichttypen'; record: Schichttypen }
  | { type: 'schichtplanung'; record: EnrichedSchichtplanung };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  mitarbeiterverwaltung: EntityCrudApi<Mitarbeiterverwaltung, MitarbeiterverwaltungDialogDefaults>;
  schichttypen: EntityCrudApi<Schichttypen, SchichttypenDialogDefaults>;
  schichtplanung: EntityCrudApi<Schichtplanung, SchichtplanungDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { mitarbeiterverwaltung: Mitarbeiterverwaltung[]; schichttypen: Schichttypen[]; schichtplanung: EnrichedSchichtplanung[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [mitarbeiterverwaltungDialog, setMitarbeiterverwaltungDialog] = useState<{ defaults?: MitarbeiterverwaltungDialogDefaults; editing?: Mitarbeiterverwaltung } | null>(null);
  const [schichttypenDialog, setSchichttypenDialog] = useState<{ defaults?: SchichttypenDialogDefaults; editing?: Schichttypen } | null>(null);
  const [schichtplanungDialog, setSchichtplanungDialog] = useState<{ defaults?: SchichtplanungDialogDefaults; editing?: Schichtplanung } | null>(null);
  const enrichedSchichtplanung = useMemo(() => enrichSchichtplanung(data.schichtplanung, { mitarbeiterverwaltungMap: data.mitarbeiterverwaltungMap, schichttypenMap: data.schichttypenMap }), [data.schichtplanung, data.mitarbeiterverwaltungMap, data.schichttypenMap]);

  function detailMitarbeiterverwaltung(record: Mitarbeiterverwaltung, push = false) {
    const item: OverlayItem = { type: 'mitarbeiterverwaltung', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitMitarbeiterverwaltung(fields: Mitarbeiterverwaltung['fields']) {
    const editing = mitarbeiterverwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setMitarbeiterverwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateMitarbeiterverwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('mitarbeiterverwaltung')} — ${t('crud_updated')}`, async () => {
        data.setMitarbeiterverwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateMitarbeiterverwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createMitarbeiterverwaltungEntry(fields);
      undoToast(`${appLabel('mitarbeiterverwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailSchichttypen(record: Schichttypen, push = false) {
    const item: OverlayItem = { type: 'schichttypen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSchichttypen(fields: Schichttypen['fields']) {
    const editing = schichttypenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSchichttypen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSchichttypenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('schichttypen')} — ${t('crud_updated')}`, async () => {
        data.setSchichttypen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSchichttypenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSchichttypenEntry(fields);
      undoToast(`${appLabel('schichttypen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailSchichtplanung(record: Schichtplanung, push = false) {
    const rec = enrichedSchichtplanung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'schichtplanung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSchichtplanung(fields: Schichtplanung['fields']) {
    const editing = schichtplanungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSchichtplanung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSchichtplanungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('schichtplanung')} — ${t('crud_updated')}`, async () => {
        data.setSchichtplanung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSchichtplanungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSchichtplanungEntry(fields);
      undoToast(`${appLabel('schichtplanung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <MitarbeiterverwaltungDialog
        open={mitarbeiterverwaltungDialog !== null}
        onClose={() => setMitarbeiterverwaltungDialog(null)}
        onSubmit={submitMitarbeiterverwaltung}
        defaultValues={mitarbeiterverwaltungDialog?.defaults}
        recordId={mitarbeiterverwaltungDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiterverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiterverwaltung']}
      />
      <SchichttypenDialog
        open={schichttypenDialog !== null}
        onClose={() => setSchichttypenDialog(null)}
        onSubmit={submitSchichttypen}
        defaultValues={schichttypenDialog?.defaults}
        recordId={schichttypenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Schichttypen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Schichttypen']}
      />
      <SchichtplanungDialog
        open={schichtplanungDialog !== null}
        onClose={() => setSchichtplanungDialog(null)}
        onSubmit={submitSchichtplanung}
        defaultValues={schichtplanungDialog?.defaults}
        recordId={schichtplanungDialog?.editing?.record_id}
        mitarbeiterverwaltungList={data.mitarbeiterverwaltung}
        schichttypenList={data.schichttypen}
        enablePhotoScan={AI_PHOTO_SCAN['Schichtplanung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Schichtplanung']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'mitarbeiterverwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('mitarbeiterverwaltung')} subtitle={undefined} />
                <MitarbeiterverwaltungDetails
                  record={top.record}
                  schichtplanungList={data.schichtplanung}
                  onOpenSchichtplanung={(r) => detailSchichtplanung(r, true)}
                  onAddSchichtplanung={() => setSchichtplanungDialog({ defaults: { mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'schichttypen') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('schichttypen')} subtitle={undefined} />
                <SchichttypenDetails
                  record={top.record}
                  schichtplanungList={data.schichtplanung}
                  onOpenSchichtplanung={(r) => detailSchichtplanung(r, true)}
                  onAddSchichtplanung={() => setSchichtplanungDialog({ defaults: { schichttyp: createRecordUrl(APP_IDS.SCHICHTTYPEN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'schichtplanung') {
            return (
              <>
                <RecordHeader title={top.record.fields.bereich ?? appLabel('schichtplanung')} subtitle={top.record.fields.datum ? formatDate(top.record.fields.datum) : undefined} />
                <SchichtplanungDetails
                  record={top.record}
                  mitarbeiterverwaltungList={data.mitarbeiterverwaltung}
                  onOpenMitarbeiterverwaltung={(r) => detailMitarbeiterverwaltung(r, true)}
                  schichttypenList={data.schichttypen}
                  onOpenSchichttypen={(r) => detailSchichttypen(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'mitarbeiterverwaltung') setMitarbeiterverwaltungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'schichttypen') setSchichttypenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'schichtplanung') setSchichtplanungDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    mitarbeiterverwaltung: {
      openCreate: (defaults?: MitarbeiterverwaltungDialogDefaults) => setMitarbeiterverwaltungDialog({ defaults }),
      openEdit: (record: Mitarbeiterverwaltung) => setMitarbeiterverwaltungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Mitarbeiterverwaltung) => detailMitarbeiterverwaltung(record, false),
    },
    schichttypen: {
      openCreate: (defaults?: SchichttypenDialogDefaults) => setSchichttypenDialog({ defaults }),
      openEdit: (record: Schichttypen) => setSchichttypenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Schichttypen) => detailSchichttypen(record, false),
    },
    schichtplanung: {
      openCreate: (defaults?: SchichtplanungDialogDefaults) => setSchichtplanungDialog({ defaults }),
      openEdit: (record: Schichtplanung) => setSchichtplanungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Schichtplanung) => detailSchichtplanung(record, false),
    },
    enriched: { mitarbeiterverwaltung: data.mitarbeiterverwaltung, schichttypen: data.schichttypen, schichtplanung: enrichedSchichtplanung },
  };
}
