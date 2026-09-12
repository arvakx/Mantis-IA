'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Factory,
  FileClock,
  Gauge,
  Hash,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatHours, getNextServiceAt, getServiceProgress, type Machine, statusStyles } from '@/lib/machines';
import { formatMaintenanceDate, type MaintenanceRecord } from '@/lib/maintenance-records';
import { formatReadingDate, type MeterReading } from '@/lib/meter-readings';

type MachineProfileSheetProps = {
  machine: Machine;
  readings: MeterReading[];
  maintenanceRecords: MaintenanceRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantEnabled: boolean;
  onAskAssistant: () => void;
  onEdit: () => void;
};

export function MachineProfileSheet({
  machine,
  readings,
  maintenanceRecords,
  open,
  onOpenChange,
  assistantEnabled,
  onAskAssistant,
  onEdit,
}: MachineProfileSheetProps) {
  const nextServiceAt = getNextServiceAt(machine);
  const serviceDelta = nextServiceAt - machine.hours;
  const progress = getServiceProgress(machine);
  const profileEvidenceState = machine.dataStatus === 'Validado'
    ? 'ready'
    : machine.dataStatus === 'Demostrativo' ? 'demo' : 'pending';
  const technicalIdentityComplete = Boolean(machine.manufacturer && machine.model);
  const latestReading = readings[0];
  const latestMaintenance = maintenanceRecords[0];
  const readingEvidenceState = !latestReading
    ? 'pending'
    : latestReading.dataStatus === 'Validado' ? 'ready' : latestReading.dataStatus === 'Demostrativo' ? 'demo' : 'draft';
  const evidence = [
    {
      label: 'Identificación técnica',
      detail: technicalIdentityComplete
        ? `${machine.manufacturer} ${machine.model} · Fuente: ${machine.source}`
        : 'Faltan fabricante o modelo por verificar en la placa o el manual',
      state: technicalIdentityComplete ? profileEvidenceState : 'pending',
    },
    { label: 'Plan preventivo', detail: 'Intervalo y tarea listos para revisión técnica', state: machine.dataStatus === 'Validado' ? 'ready' : 'draft' },
    { label: 'Manual técnico', detail: 'Pendiente de cargar y referenciar', state: 'pending' },
    { label: 'Historial de mantenimiento', detail: latestMaintenance ? `${maintenanceRecords.length} intervención${maintenanceRecords.length === 1 ? '' : 'es'} · Última: ${formatMaintenanceDate(latestMaintenance.performedAt)}` : 'Aún no hay intervenciones ejecutadas', state: latestMaintenance ? latestMaintenance.dataStatus === 'Validado' ? 'ready' : latestMaintenance.dataStatus === 'Demostrativo' ? 'demo' : 'draft' : 'pending' },
    { label: 'Historial de lecturas', detail: latestReading ? `${readings.length} registro${readings.length === 1 ? '' : 's'} · Último: ${formatReadingDate(latestReading.recordedAt)}` : 'Aún no hay lecturas trazables', state: readingEvidenceState },
    { label: 'Análisis RCM', detail: 'Pendiente de funciones y modos de falla validados', state: 'pending' },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="asset-sheet asset-sheet-fullscreen" showCloseButton>
        <SheetHeader className="asset-sheet-head">
          <div className="asset-sheet-kicker">
            <span>FICHA CENTRAL DEL ACTIVO</span>
            <Badge className={`asset-demo-badge data-${profileEvidenceState}`}>{machine.dataStatus.toUpperCase()}</Badge>
          </div>
          <div className="asset-sheet-title-row">
            <div className="asset-sheet-icon"><Activity /></div>
            <div>
              <div className="asset-id-line">
                <span>{machine.id}</span>
                <Badge className={`status-badge ${statusStyles[machine.status]}`}>{machine.status}</Badge>
              </div>
              <SheetTitle>{machine.name}</SheetTitle>
              <SheetDescription>{machine.type} · {machine.location}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="asset-sheet-scroll">
          <section className="asset-hero-card">
            <div className="asset-condition">
              <div className="asset-condition-ring" style={{ '--score': `${machine.health}%` } as React.CSSProperties}>
                <strong>{machine.health}</strong>
                <span>/ 100</span>
              </div>
              <div>
                <span>INDICADOR VISUAL · DEMO</span>
                <strong>{machine.health}/100 · No validado</strong>
                <small>La fórmula sigue pendiente de datos reales; no es un diagnóstico ni define la prioridad.</small>
              </div>
            </div>
            <div className="asset-function">
              <span>FUNCIÓN DEL ACTIVO</span>
              <h3>{machine.function}</h3>
              <p><MapPin /> {machine.operatingContext}</p>
            </div>
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>01</span><h3>Identificación técnica</h3></div>
              <p>Datos de placa que distinguen esta máquina sin ambigüedad.</p>
            </div>
            <div className="asset-nameplate">
              <article className={!machine.manufacturer ? 'pending' : undefined}><Factory /><span>Fabricante o marca</span><strong>{machine.manufacturer || 'Sin registrar'}</strong></article>
              <article className={!machine.model ? 'pending' : undefined}><Activity /><span>Modelo</span><strong>{machine.model || 'Sin registrar'}</strong></article>
              <article className={!machine.serialNumber ? 'pending optional' : undefined}><Hash /><span>Número de serie</span><strong>{machine.serialNumber || 'Sin registrar (opcional)'}</strong></article>
            </div>
            <div className={`identity-validation-state ${technicalIdentityComplete ? 'complete' : 'pending'}`}>
              <ShieldCheck />
              <div><strong>{technicalIdentityComplete ? 'Identidad técnica registrada' : 'Identidad pendiente de validación'}</strong><span>{technicalIdentityComplete ? 'Fabricante y modelo están documentados; su confiabilidad depende del estado y la fuente del activo.' : 'Verifica fabricante y modelo directamente en la placa, el manual técnico o con el responsable del laboratorio.'}</span></div>
              <Badge variant="outline">{technicalIdentityComplete ? machine.dataStatus.toUpperCase() : 'VALIDAR'}</Badge>
            </div>
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>02</span><h3>Información esencial</h3></div>
              <p>Lo mínimo que el operador necesita para entender el activo.</p>
            </div>
            <div className="asset-facts-grid">
              <article><Activity /><span>Horas actuales</span><strong>{formatHours(machine.hours)} h</strong></article>
              <article><FileClock /><span>Horas último servicio</span><strong>{formatHours(machine.lastServiceHours)} h</strong></article>
              <article><Clock3 /><span>Intervalo preventivo</span><strong>{formatHours(machine.maintenanceInterval)} h</strong></article>
              <article><Wrench /><span>Próximo servicio</span><strong>{formatHours(nextServiceAt)} h</strong></article>
              <article><FileClock /><span>Último servicio</span><strong>{machine.lastService}</strong></article>
              <article><MapPin /><span>Ubicación</span><strong>{machine.location}</strong></article>
            </div>
            <div className="asset-standard">
              <ShieldCheck />
              <div><span>ESTÁNDAR DE DESEMPEÑO</span><strong className={!machine.performanceStandard ? 'pending-value' : undefined}>{machine.performanceStandard || 'Sin dato registrado'}</strong></div>
              <Badge variant="outline">{machine.performanceStandard && machine.dataStatus === 'Validado' ? 'VALIDADO' : 'VALIDAR EN EXPERIMENTO'}</Badge>
            </div>
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>03</span><h3>Próxima intervención</h3></div>
              <p>Prioridad calculada a partir del plan preventivo cargado.</p>
            </div>
            <div className={`asset-service-card ${serviceDelta < 0 ? 'overdue' : ''}`}>
              <div className="asset-service-top">
                <div className="asset-service-icon">{serviceDelta < 0 ? <AlertTriangle /> : <Wrench />}</div>
                <div><span>TAREA PREVENTIVA</span><strong>{machine.nextTask}</strong></div>
                <Badge>{serviceDelta < 0 ? `${Math.abs(serviceDelta)} h vencidas` : `En ${serviceDelta} h`}</Badge>
              </div>
              <div className="asset-service-progress"><span style={{ width: `${progress}%` }} /></div>
              <div className="asset-service-scale"><span>{formatHours(machine.lastServiceHours)} h</span><strong>{formatHours(machine.hours)} h actuales</strong><span>{formatHours(nextServiceAt)} h</span></div>
            </div>
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>04</span><h3>Historial de mantenimiento</h3></div>
              <p>Intervenciones ejecutadas y su efecto documentado sobre el plan preventivo.</p>
            </div>
            {maintenanceRecords.length > 0 ? (
              <div className="maintenance-history-list">
                {maintenanceRecords.slice(0, 5).map((record) => {
                  const recordState = record.dataStatus === 'Validado' ? 'ready' : record.dataStatus === 'Demostrativo' ? 'demo' : 'pending';
                  return (
                    <article className="maintenance-history-row" key={record.id}>
                      <div className="maintenance-history-icon"><Wrench /></div>
                      <div className="maintenance-history-copy">
                        <div><Badge variant="outline">{record.maintenanceType}</Badge><strong>{record.completedTask}</strong></div>
                        <p>{formatMaintenanceDate(record.performedAt)} · {record.technician} · {formatHours(record.serviceHours)} h</p>
                        <small>{record.workSummary}</small>
                        <span>Fuente: {record.source}{record.partsUsed ? ` · Repuestos: ${record.partsUsed}` : ''}</span>
                      </div>
                      <div className="maintenance-history-states"><Badge className={`asset-demo-badge data-${recordState}`}>{record.dataStatus.toUpperCase()}</Badge><span className={record.resetsPreventivePlan ? 'cycle-reset' : 'cycle-unchanged'}><RotateCcw /> {record.resetsPreventivePlan ? 'CICLO REINICIADO' : 'CICLO SIN CAMBIOS'}</span></div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="reading-history-empty"><Wrench /><div><strong>Sin mantenimientos registrados</strong><span>La primera intervención aparecerá aquí con su técnico, evidencia y efecto sobre el plan.</span></div></div>
            )}
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>05</span><h3>Historial del horómetro</h3></div>
              <p>Cada cambio conserva quién lo registró, cuándo y con qué fuente.</p>
            </div>
            {readings.length > 0 ? (
              <div className="reading-history-list">
                {readings.slice(0, 5).map((reading) => {
                  const readingState = reading.dataStatus === 'Validado' ? 'ready' : reading.dataStatus === 'Demostrativo' ? 'demo' : 'pending';
                  return (
                    <article className="reading-history-row" key={reading.id}>
                      <div className="reading-history-icon"><Gauge /></div>
                      <div className="reading-history-copy">
                        <div><strong>{formatHours(reading.previousHours)} h</strong><ArrowRight /><strong>{formatHours(reading.currentHours)} h</strong><span>{reading.addedHours > 0 ? `+${formatHours(reading.addedHours)} h` : 'Sin aumento'}</span></div>
                        <p>{formatReadingDate(reading.recordedAt)} · {reading.responsible}</p>
                        <small>Fuente: {reading.source}{reading.note ? ` · ${reading.note}` : ''}</small>
                      </div>
                      <Badge className={`asset-demo-badge data-${readingState}`}>{reading.dataStatus.toUpperCase()}</Badge>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="reading-history-empty"><Clock3 /><div><strong>Sin lecturas registradas</strong><span>La primera actualización del horómetro aparecerá aquí con toda su evidencia.</span></div></div>
            )}
          </section>

          <section className="asset-section">
            <div className="asset-section-title">
              <div><span>06</span><h3>Calidad de la evidencia</h3></div>
              <p>Mantis muestra qué información es confiable y qué falta validar.</p>
            </div>
            <div className="evidence-list">
              {evidence.map((item) => (
                <div className="evidence-row" key={item.label}>
                  <span className={`evidence-icon ${item.state}`}>
                    {item.state === 'ready' ? <CheckCircle2 /> : item.state === 'demo' ? <Database /> : item.state === 'draft' ? <FileClock /> : <Clock3 />}
                  </span>
                  <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                  <span className={`evidence-state ${item.state}`}>
                    {item.state === 'ready' ? 'VALIDADO' : item.state === 'demo' ? 'DEMO' : item.state === 'draft' ? 'BORRADOR' : 'PENDIENTE'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="asset-safety-note">
            <AlertTriangle />
            <div>
              <strong>Prototipo para validación científica</strong>
              <p>No utilizar estos datos para intervenir una máquina real. Serán reemplazados por información validada del laboratorio USTA y sus manuales técnicos.</p>
            </div>
          </div>
        </div>

        <div className="asset-sheet-actions">
          <div><CheckCircle2 /><span>La decisión final siempre queda en manos del técnico.</span></div>
          <div className="asset-action-buttons"><Button variant="outline" onClick={onEdit}>Editar datos</Button>{assistantEnabled && <Button onClick={onAskAssistant}><Bot data-icon="inline-start" /> Consultar con Mantis IA <Sparkles data-icon="inline-end" /></Button>}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
