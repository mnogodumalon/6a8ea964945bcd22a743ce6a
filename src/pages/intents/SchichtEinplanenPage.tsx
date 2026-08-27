/**
 * Schicht Einplanen — 3-Schritt-Wizard.
 * Steps: 1) Mitarbeiter wählen → 2) Schichttyp wählen → 3) Details & Bestätigung.
 * Reads: mitarbeiterverwaltung, schichttypen. Writes: schichtplanung (createSchichtplanungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconCalendar, IconCheck } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import type { Mitarbeiterverwaltung, Schichttypen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { tx } from '@/i18n';

export default function SchichtEinplanenPage() {
  const { mitarbeiterverwaltung, schichttypen, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<Mitarbeiterverwaltung | null>(null);
  const [selectedSchichttyp, setSelectedSchichttyp] = useState<Schichttypen | null>(null);
  const [datumValue, setDatumValue] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bereichValue, setBereichValue] = useState('');
  const [anmerkungenValue, setAnmerkungenValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSelectMitarbeiter = (id: string) => {
    const ma = mitarbeiterverwaltung.find(m => m.record_id === id) ?? null;
    setSelectedMitarbeiter(ma);
    setStep(2);
  };

  const handleSelectSchichttyp = (id: string) => {
    const st = schichttypen.find(s => s.record_id === id) ?? null;
    setSelectedSchichttyp(st);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedMitarbeiter || !selectedSchichttyp || !datumValue) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createSchichtplanungEntry({
        datum: datumValue,
        mitarbeiter: createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, selectedMitarbeiter.record_id),
        schichttyp: createRecordUrl(APP_IDS.SCHICHTTYPEN, selectedSchichttyp.record_id),
        bereich: bereichValue || undefined,
        anmerkungen: anmerkungenValue || undefined,
      });
      await fetchAll();
      setSuccess(true);
    } catch (e) {
      setSubmitError(tx('Fehler beim Speichern. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedMitarbeiter(null);
    setSelectedSchichttyp(null);
    setDatumValue(format(new Date(), 'yyyy-MM-dd'));
    setBereichValue('');
    setAnmerkungenValue('');
    setSubmitError(null);
    setSuccess(false);
    setStep(1);
  };

  if (success) {
    return (
      <IntentWizardShell
        title={tx('Schicht einplanen')}
        subtitle={tx('Mitarbeiter erfolgreich eingeplant')}
        steps={[
          { label: tx('Mitarbeiter') },
          { label: tx('Schichttyp') },
          { label: tx('Details') },
        ]}
        currentStep={3}
        onStepChange={setStep}
        loading={false}
        error={null}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="rounded-full bg-emerald-100 p-4">
            <IconCheck size={40} className="text-emerald-600" stroke={2} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Schicht erfolgreich eingeplant!')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedMitarbeiter
                ? `${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()
                : ''}{' '}
              {tx('wurde für')}{' '}
              {selectedSchichttyp?.fields.bezeichnung ?? ''}{' '}
              {tx('am')}{' '}
              {datumValue}{' '}
              {tx('eingeplant.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button className="flex-1" onClick={handleReset}>
              {tx('Weitere Schicht einplanen')}
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href="#/">{tx('Zurück zum Dashboard')}</a>
            </Button>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Schicht einplanen')}
      subtitle={tx('Mitarbeiter in 3 Schritten für eine Schicht einplanen')}
      steps={[
        { label: tx('Mitarbeiter') },
        { label: tx('Schichttyp') },
        { label: tx('Details') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Schritt 1: Mitarbeiter wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={mitarbeiterverwaltung.map(m => ({
            id: m.record_id,
            title: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || m.record_id,
            subtitle: [m.fields.abteilung, m.fields.position].filter(Boolean).join(' · '),
            status: m.fields.beschaeftigungsart
              ? { key: m.fields.beschaeftigungsart.key, label: m.fields.beschaeftigungsart.label }
              : undefined,
          }))}
          onSelect={handleSelectMitarbeiter}
          searchPlaceholder={tx('Mitarbeiter suchen …')}
          emptyText={tx('Kein Mitarbeiter gefunden')}
        />
      )}

      {/* Schritt 2: Schichttyp wählen */}
      {step === 2 && (
        <div className="space-y-4">
          {!selectedMitarbeiter ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <IconCalendar size={16} className="shrink-0 text-primary" />
                <span>
                  {tx('Mitarbeiter:')}{' '}
                  <span className="font-medium text-foreground">
                    {`${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()}
                  </span>
                </span>
              </div>
              <EntitySelectStep
                items={schichttypen.map(s => ({
                  id: s.record_id,
                  title: s.fields.bezeichnung ?? s.record_id,
                  subtitle: s.fields.startzeit && s.fields.endzeit
                    ? `${s.fields.startzeit} – ${s.fields.endzeit}`
                    : s.fields.startzeit ?? '',
                  stats: s.fields.kuerzel
                    ? [{ label: tx('Kürzel'), value: s.fields.kuerzel }]
                    : undefined,
                }))}
                onSelect={handleSelectSchichttyp}
                searchPlaceholder={tx('Schichttyp suchen …')}
                emptyText={tx('Kein Schichttyp gefunden')}
              />
            </>
          )}
        </div>
      )}

      {/* Schritt 3: Details & Bestätigung */}
      {step === 3 && (
        <div className="space-y-6">
          {!selectedMitarbeiter || !selectedSchichttyp ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          ) : (
            <>
              {/* Zusammenfassung der Auswahl */}
              <div className="rounded-xl border bg-secondary/40 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tx('Mitarbeiter')}</span>
                  <span className="font-medium">
                    {`${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tx('Schichttyp')}</span>
                  <span className="font-medium">{selectedSchichttyp.fields.bezeichnung}</span>
                </div>
                {selectedSchichttyp.fields.startzeit && selectedSchichttyp.fields.endzeit && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{tx('Uhrzeit')}</span>
                    <span className="font-medium">
                      {selectedSchichttyp.fields.startzeit} – {selectedSchichttyp.fields.endzeit}
                    </span>
                  </div>
                )}
              </div>

              {/* Detailfelder */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="datum">{tx('Datum')}</Label>
                  <Input
                    id="datum"
                    type="date"
                    required
                    value={datumValue}
                    onChange={e => setDatumValue(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bereich">{tx('Bereich')}</Label>
                  <Input
                    id="bereich"
                    type="text"
                    value={bereichValue}
                    onChange={e => setBereichValue(e.target.value)}
                    placeholder={tx('z. B. Empfang, Lager, Küche …')}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anmerkungen">{tx('Anmerkungen')}</Label>
                  <Textarea
                    id="anmerkungen"
                    value={anmerkungenValue}
                    onChange={e => setAnmerkungenValue(e.target.value)}
                    placeholder={tx('Optionale Hinweise zur Schicht …')}
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  disabled={!datumValue || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? tx('Wird gespeichert …') : tx('Schicht einplanen')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  {tx('Zurück')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
