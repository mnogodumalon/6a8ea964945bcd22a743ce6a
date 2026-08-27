import { useMemo, useState, useCallback } from 'react';
import { format, parseISO, isSameDay, startOfWeek, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import { IconCalendar, IconUsers, IconClock, IconPlus, IconAlertTriangle, IconUserCheck } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { ResourceTimeline, type ResourceEvent, type ResourceGroup } from '@/components/widgets/ResourceTimeline';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { Button } from '@/components/ui/button';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    mitarbeiterverwaltung,
    schichttypen,
    schichtplanung,
    setSchichtplanung,
    mitarbeiterverwaltungMap,
    schichttypenMap,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedSchichtplanung = crud.enriched.schichtplanung;

  const clock = useClock();

  // Active filter for strip segment
  const [filter, setFilter] = useState<'heute' | 'woche' | null>(null);

  // KPIs: today's shifts, this week's shifts, unique employees this week
  const todayKey = format(clock, 'yyyy-MM-dd');
  const weekStart = startOfWeek(clock, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(clock, { weekStartsOn: 1 });

  const heuteSchichten = useMemo(
    () => schichtplanung.filter(s => s.fields.datum === todayKey),
    [schichtplanung, todayKey],
  );

  const wocheSchichten = useMemo(
    () =>
      schichtplanung.filter(s => {
        if (!s.fields.datum) return false;
        try {
          const d = parseISO(s.fields.datum);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      }),
    [schichtplanung, weekStart, weekEnd],
  );

  // Employees with NO shift this week
  const mitarbeiterMitSchichtIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of wocheSchichten) {
      const id = extractRecordId(s.fields.mitarbeiter);
      if (id) ids.add(id);
    }
    return ids;
  }, [wocheSchichten]);

  const ohneSchichtDieseWoche = useMemo(
    () => mitarbeiterverwaltung.filter(m => !mitarbeiterMitSchichtIds.has(m.record_id)),
    [mitarbeiterverwaltung, mitarbeiterMitSchichtIds],
  );

  // Hero: employees without any shift planned this week
  const showHero = ohneSchichtDieseWoche.length > 0 && mitarbeiterverwaltung.length > 0;

  // ResourceTimeline: employees as rows, shifts as events
  const groups = useMemo<ResourceGroup[]>(
    () =>
      mitarbeiterverwaltung.map(m => ({
        key: m.record_id,
        label: [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id,
      })),
    [mitarbeiterverwaltung],
  );

  const events = useMemo<ResourceEvent[]>(
    () =>
      schichtplanung
        .filter(s => !!s.fields.datum && !!s.fields.mitarbeiter)
        .map(s => {
          const mitarbeiterId = extractRecordId(s.fields.mitarbeiter) ?? '';
          const schichttypId = extractRecordId(s.fields.schichttyp);
          const schichttyp = schichttypId ? schichttypenMap.get(schichttypId) : undefined;
          const kuerzel = schichttyp?.fields.kuerzel ?? schichttyp?.fields.bezeichnung ?? '';
          const startzeit = schichttyp?.fields.startzeit;
          const endzeit = schichttyp?.fields.endzeit;
          const subtitle = startzeit && endzeit ? `${startzeit}–${endzeit}` : kuerzel;
          return {
            id: `schicht:${s.record_id}`,
            start: s.fields.datum!,
            allDay: true,
            title: kuerzel || tx('Schicht'),
            subtitle: subtitle || undefined,
            tone: 'primary' as const,
            group: mitarbeiterId,
          };
        }),
    [schichtplanung, schichttypenMap],
  );

  // Drag: move a shift to a new date / employee
  const handleEventDrop = useCallback(
    async (id: string, newStart: string, _newEnd?: string, newGroup?: string) => {
      const rid = id.split(':')[1] ?? '';
      if (!rid) return;
      const prev = schichtplanung.find(s => s.record_id === rid);
      if (!prev) return;

      const patch: Record<string, unknown> = { datum: newStart };
      if (newGroup) patch.mitarbeiter = createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, newGroup);

      // Optimistic
      setSchichtplanung(old =>
        old.map(s =>
          s.record_id === rid
            ? {
                ...s,
                fields: {
                  ...s.fields,
                  datum: newStart,
                  ...(newGroup ? { mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, newGroup) } : {}),
                },
              }
            : s,
        ),
      );

      undoToast(tx('Schicht verschoben'), async () => {
        const revertPatch: Record<string, unknown> = { datum: prev.fields.datum };
        if (newGroup) revertPatch.mitarbeiter = prev.fields.mitarbeiter ?? null;
        setSchichtplanung(old =>
          old.map(s =>
            s.record_id === rid
              ? { ...s, fields: { ...s.fields, ...revertPatch } }
              : s,
          ),
        );
        await LivingAppsService.updateSchichtplanungEntry(rid, revertPatch as Parameters<typeof LivingAppsService.updateSchichtplanungEntry>[1]);
      });

      try {
        await LivingAppsService.updateSchichtplanungEntry(rid, patch as Parameters<typeof LivingAppsService.updateSchichtplanungEntry>[1]);
      } catch {
        await fetchAll();
      }
    },
    [schichtplanung, setSchichtplanung, fetchAll],
  );

  // Empty cell tapped → create prefilled
  const handleEmptyClick = useCallback(
    (date: Date, group?: string) => {
      const day = format(date, 'yyyy-MM-dd');
      crud.schichtplanung.openCreate({
        datum: day,
        ...(group ? { mitarbeiter: group } : {}),
      });
    },
    [crud],
  );

  // Range drag to create
  const handleRangeCreate = useCallback(
    (start: Date, _end: Date, group?: string) => {
      const day = format(start, 'yyyy-MM-dd');
      crud.schichtplanung.openCreate({
        datum: day,
        ...(group ? { mitarbeiter: group } : {}),
      });
    },
    [crud],
  );

  // Context line: today's employees on shift
  const heuteNamen = useMemo(() => {
    const ids = heuteSchichten
      .map(s => extractRecordId(s.fields.mitarbeiter))
      .filter((id): id is string => !!id);
    const names = ids.map(id => {
      const m = mitarbeiterverwaltungMap.get(id);
      return m?.fields.vorname ?? '';
    }).filter(Boolean);
    return names;
  }, [heuteSchichten, mitarbeiterverwaltungMap]);

  const contextLine = useMemo(() => {
    if (mitarbeiterverwaltung.length === 0) {
      return tx('Noch keine Mitarbeiter angelegt.');
    }
    if (heuteSchichten.length === 0) {
      return tx('Heute sind keine Schichten geplant.');
    }
    return tx`Heute im Dienst: ${namen(heuteNamen)}.`;
  }, [mitarbeiterverwaltung.length, heuteSchichten.length, heuteNamen]);

  // Filtered view for aside list
  const asideSchichten = useMemo(() => {
    if (filter === 'heute') return heuteSchichten;
    return wocheSchichten;
  }, [filter, heuteSchichten, wocheSchichten]);

  // Empty state
  const isEmpty = mitarbeiterverwaltung.length === 0 && schichtplanung.length === 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {gruss(clock)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button
          onClick={() => crud.schichtplanung.openCreate({ datum: todayKey })}
          className="shrink-0"
        >
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          {tx('Neue Schicht')}
        </Button>
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-4">
          <IconCalendar size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <p className="font-medium text-foreground">{tx('Schichtplan einrichten')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tx('Lege zuerst Mitarbeiter und Schichttypen an, dann kannst du den Wochenplan befüllen.')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button variant="outline" onClick={() => crud.mitarbeiterverwaltung.openCreate({})}>
              <IconUsers size={16} className="mr-1.5" />
              {tx('Mitarbeiter anlegen')}
            </Button>
            <Button variant="outline" onClick={() => crud.schichttypen.openCreate({})}>
              <IconClock size={16} className="mr-1.5" />
              {tx('Schichttyp anlegen')}
            </Button>
          </div>
        </div>
      ) : (
        <DashboardGrid
          variant="wide"
          hero={
            showHero && (
              <HeroBanner
                icon={<IconAlertTriangle size={18} />}
                action={{
                  label: tx('Schicht planen'),
                  onClick: () =>
                    crud.schichtplanung.openCreate({
                      mitarbeiter: ohneSchichtDieseWoche[0]?.record_id,
                      datum: todayKey,
                    }),
                }}
              >
                <b>{namen(ohneSchichtDieseWoche.map(m => m.fields.vorname ?? ''))}</b>{' '}
                {ohneSchichtDieseWoche.length === 1
                  ? tx`${namen(ohneSchichtDieseWoche.map(m => m.fields.vorname ?? ''))} hat diese Woche noch keine Schicht.`
                  : tx`haben diese Woche noch keine Schicht.`}
              </HeroBanner>
            )
          }
          kpis={
            <StatStrip>
              <StatStripItem
                title={tx('Heute')}
                value={heuteSchichten.length}
                icon={<IconCalendar size={16} />}
                tone={heuteSchichten.length === 0 ? 'default' : 'primary'}
                onClick={() => setFilter(f => f === 'heute' ? null : 'heute')}
                active={filter === 'heute'}
              />
              <StatStripItem
                title={tx('Diese Woche')}
                value={wocheSchichten.length}
                icon={<IconClock size={16} />}
                tone="default"
                onClick={() => setFilter(f => f === 'woche' ? null : 'woche')}
                active={filter === 'woche'}
              />
              <StatStripItem
                title={appLabel('mitarbeiterverwaltung')}
                value={mitarbeiterverwaltung.length}
                icon={<IconUsers size={16} />}
                tone="default"
                onClick={() => crud.mitarbeiterverwaltung.openCreate({})}
              />
              <StatStripItem
                title={tx('Ohne Schicht')}
                value={ohneSchichtDieseWoche.length}
                icon={<IconUserCheck size={16} />}
                tone={ohneSchichtDieseWoche.length > 0 ? 'warning' : 'default'}
              />
            </StatStrip>
          }
          primary={
            <ResourceTimeline
              events={events}
              groups={groups}
              axis="day"
              defaultRange="week"
              weekDays={5}
              locale={dateFnsLocale()}
              onEventClick={ev => {
                const rid = ev.id.split(':')[1] ?? '';
                const rec = schichtplanung.find(s => s.record_id === rid);
                if (rec) crud.schichtplanung.openDetail(rec);
              }}
              onEventDrop={handleEventDrop}
              onEmptyClick={handleEmptyClick}
              onRangeCreate={handleRangeCreate}
            />
          }
          aside={
            <>
              <WorkList
                title={filter === 'heute' ? tx('Heutige Schichten') : tx('Schichten diese Woche')}
                items={asideSchichten.slice(0, 8).map(s => {
                  const enriched = enrichedSchichtplanung.find(e => e.record_id === s.record_id);
                  const mitarbeiterId = extractRecordId(s.fields.mitarbeiter);
                  const schichttypId = extractRecordId(s.fields.schichttyp);
                  const schichttyp = schichttypId ? schichttypenMap.get(schichttypId) : undefined;
                  const mitarbeiter = mitarbeiterId ? mitarbeiterverwaltungMap.get(mitarbeiterId) : undefined;
                  const name = enriched?.mitarbeiterName
                    || [mitarbeiter?.fields.vorname, mitarbeiter?.fields.nachname].filter(Boolean).join(' ')
                    || tx('Unbekannt');
                  const schichttypLabel = enriched?.schichttypName || schichttyp?.fields.bezeichnung || tx('Schicht');
                  const zeitraum = schichttyp?.fields.startzeit && schichttyp?.fields.endzeit
                    ? `${schichttyp.fields.startzeit}–${schichttyp.fields.endzeit}`
                    : '';
                  return {
                    id: s.record_id,
                    title: name,
                    secondLine: (
                      <>
                        <span className="font-medium text-foreground">{schichttypLabel}</span>
                        {zeitraum && (
                          <span className="text-muted-foreground"> · {zeitraum}</span>
                        )}
                        {s.fields.datum && (
                          <span className="text-muted-foreground"> · {formatDate(s.fields.datum)}</span>
                        )}
                      </>
                    ),
                    action: {
                      label: tx('Bearbeiten'),
                      onClick: () => crud.schichtplanung.openEdit(s),
                    },
                  };
                })}
                onItemClick={id => {
                  const rec = schichtplanung.find(s => s.record_id === id);
                  if (rec) crud.schichtplanung.openDetail(rec);
                }}
                empty={{
                  text: filter === 'heute'
                    ? tx('Heute keine Schichten — neuen Eintrag erstellen.')
                    : tx('Diese Woche keine Schichten geplant.'),
                  action: {
                    label: tx('Schicht anlegen'),
                    onClick: () => crud.schichtplanung.openCreate({ datum: todayKey }),
                  },
                }}
              />
              <WorkList
                title={tx('Mitarbeiter ohne Schicht (Woche)')}
                items={ohneSchichtDieseWoche.slice(0, 6).map(m => ({
                  id: m.record_id,
                  title: [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id,
                  secondLine: (
                    <>
                      {m.fields.abteilung && (
                        <span className="text-muted-foreground">{m.fields.abteilung}</span>
                      )}
                      {m.fields.beschaeftigungsart?.label && (
                        <span className="text-muted-foreground"> · {m.fields.beschaeftigungsart.label}</span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('Einplanen'),
                    onClick: () => crud.schichtplanung.openCreate({
                      mitarbeiter: m.record_id,
                      datum: todayKey,
                    }),
                  },
                }))}
                onItemClick={id => {
                  const rec = mitarbeiterverwaltung.find(m => m.record_id === id);
                  if (rec) crud.mitarbeiterverwaltung.openDetail(rec);
                }}
                empty={{
                  text: tx('Alle Mitarbeiter haben Schichten diese Woche.'),
                }}
              />
            </>
          }
        />
      )}

      {crud.surfaces}
    </div>
  );
}
