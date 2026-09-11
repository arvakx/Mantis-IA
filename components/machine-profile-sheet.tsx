'use client';

import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  MapPin,
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

type MachineProfileSheetProps = {
  machine: Machine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskAssistant: () => void;
  onEdit: () => void;
};

export function MachineProfileSheet({
  machine,
  open,
  onOpenChange,
  onAskAssistant,
  onEdit,
}: MachineProfileSheetProps) {
  const nextServiceAt = getNextServiceAt(machine);
  const serviceDelta = nextServiceAt - machine.hours;
  const progress = getServiceProgress(machine);
  const profileEvidenceState = machine.dataStatus === 'Validado'
    ? 'ready'
    : machine.dataStatus === 'Demostrativo' ? 'demo' : 'pending';
  const evidence = [
    { label: 'Identificación del activo', detail: `Fuente: ${machine.source}`, state: profileEvidenceState },
    { label: 'Plan preventivo', detail: 'Intervalo y tarea listos para revisión técnica', state: machine.dataStatus === 'Validado' ? 'ready' : 'draft' },
    { label: 'Manual técnico', detail: 'Pendiente de cargar y referenciar', state: 'pending' },
    { label: 'Historial real', detail: 'Pendiente de datos del laboratorio', state: 'pending' },
    { label: 'Análisis RCM', detail: 'Pendiente de funciones y modos de falla validados', state: 'pending' },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="asset-sheet sm:max-w-[720px]" showCloseButton>
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
                <span>CONDICIÓN ESTIMADA</span>
                <strong>{machine.health < 70 ? 'Atención prioritaria' : machine.health < 86 ? 'Condición vigilada' : 'Condición estable'}</strong>
                <small>Regla demostrativa, no diagnóstico</small>
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
              <div><span>01</span><h3>Información esencial</h3></div>
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
              <div><span>02</span><h3>Próxima intervención</h3></div>
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
              <div><span>03</span><h3>Calidad de la evidencia</h3></div>
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
          <div className="asset-action-buttons"><Button variant="outline" onClick={onEdit}>Editar datos</Button><Button onClick={onAskAssistant}><Bot data-icon="inline-start" /> Consultar con Mantis IA <Sparkles data-icon="inline-end" /></Button></div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
