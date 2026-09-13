'use client';

import { useMemo, useState, type SyntheticEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  HardHat,
  Leaf,
  Save,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import type { Machine } from '@/lib/machines';
import type {
  ConsequenceCategory,
  MaintenanceCase,
  TaskStrategy,
} from '@/lib/maintenance-cases';

type MaintenanceCaseWorkspaceProps = {
  machines: Machine[];
  onClose: () => void;
  onSave: (maintenanceCase: MaintenanceCase) => void;
};

type CaseForm = {
  machineId: string;
  title: string;
  observation: string;
  functionalFailure: string;
  failureMode: string;
  failureCause: string;
  failureEffect: string;
  consequences: ConsequenceCategory[];
  consequenceReason: string;
  proposedTask: string;
  taskStrategy: TaskStrategy;
  intervalTrigger: string;
  source: string;
  reviewedBy: string;
  expertApproved: boolean;
};

const consequenceOptions: Array<{ value: ConsequenceCategory; label: string; detail: string; icon: typeof HardHat }> = [
  { value: 'Seguridad', label: 'Seguridad', detail: 'Puede afectar a una persona', icon: HardHat },
  { value: 'Ambiental', label: 'Ambiental', detail: 'Puede afectar al entorno', icon: Leaf },
  { value: 'Operacional', label: 'Operacional', detail: 'Afecta producción o servicio', icon: Gauge },
  { value: 'No operacional', label: 'No operacional', detail: 'Impacto principalmente económico', icon: Wrench },
];

const taskStrategies: TaskStrategy[] = [
  'Por condición',
  'Restauración programada',
  'Sustitución programada',
  'Búsqueda de falla',
  'Operar hasta fallar',
  'Rediseño',
];

const taskStrategyHelp: Record<TaskStrategy, string> = {
  'Por condición': 'Medir o inspeccionar una señal de deterioro y actuar cuando alcance un límite definido.',
  'Restauración programada': 'Restaurar la capacidad del elemento a una edad u horas establecidas, aunque todavía funcione.',
  'Sustitución programada': 'Reemplazar el elemento a una edad u horas establecidas antes de que falle.',
  'Búsqueda de falla': 'Probar periódicamente una función oculta o de protección para descubrir si dejó de funcionar.',
  'Operar hasta fallar': 'No realizar una tarea preventiva y reparar después de la falla, solo cuando el riesgo sea aceptable.',
  'Rediseño': 'Modificar el equipo o el proceso cuando ninguna tarea de mantenimiento reduce suficientemente la consecuencia.',
};

export function MaintenanceCaseWorkspace({ machines, onClose, onSave }: MaintenanceCaseWorkspaceProps) {
  const [form, setForm] = useState<CaseForm>({
    machineId: machines[0]?.id ?? '',
    title: '',
    observation: '',
    functionalFailure: '',
    failureMode: '',
    failureCause: '',
    failureEffect: '',
    consequences: [],
    consequenceReason: '',
    proposedTask: '',
    taskStrategy: 'Por condición',
    intervalTrigger: '',
    source: '',
    reviewedBy: '',
    expertApproved: false,
  });
  const [error, setError] = useState<string | null>(null);

  const machine = machines.find((item) => item.id === form.machineId) ?? machines[0];

  const qualityChecks = useMemo(() => [
    { label: 'Función y desempeño específicos', complete: Boolean(machine?.function.trim() && machine.performanceStandard.trim() && !machine.performanceStandard.toLowerCase().includes('pendiente')) },
    { label: 'Datos base validados y con fuente', complete: Boolean(machine?.dataStatus === 'Validado' && machine.source.trim() && machine.source !== 'Sin fuente documentada') },
    { label: 'Falla funcional descrita', complete: Boolean(form.functionalFailure.trim()) },
    { label: 'Modo y causa de falla', complete: Boolean(form.failureMode.trim() && form.failureCause.trim()) },
    { label: 'Efecto observable explicado', complete: Boolean(form.failureEffect.trim()) },
    { label: 'Consecuencia justificada', complete: Boolean(form.consequences.length > 0 && form.consequenceReason.trim()) },
    { label: 'Política o tarea propuesta', complete: Boolean(form.proposedTask.trim() && form.taskStrategy) },
    { label: 'Intervalo o disparador definido', complete: Boolean(form.intervalTrigger.trim()) },
    { label: 'Fuente técnica trazable', complete: Boolean(form.source.trim()) },
  ], [form, machine]);

  const completedChecks = qualityChecks.filter((item) => item.complete).length;
  const completeness = Math.round((completedChecks / qualityChecks.length) * 100);
  const reviewStatus = completeness === 100
    ? form.expertApproved && form.reviewedBy.trim() ? 'Validado por técnico' : 'Listo para revisión'
    : 'Borrador';

  function update<Key extends keyof CaseForm>(key: Key, value: CaseForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function toggleConsequence(consequence: ConsequenceCategory, checked: boolean) {
    update('consequences', checked
      ? Array.from(new Set([...form.consequences, consequence]))
      : form.consequences.filter((item) => item !== consequence));
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!machine || !form.title.trim() || !form.observation.trim()) {
      setError('Selecciona una máquina y describe el caso observado antes de guardarlo.');
      return;
    }
    if (form.expertApproved && completeness < 100) {
      setError('Un análisis no puede marcarse como validado mientras tenga criterios RCM incompletos.');
      return;
    }
    if (form.expertApproved && !form.reviewedBy.trim()) {
      setError('Escribe el nombre del técnico que realizó la revisión.');
      return;
    }

    onSave({
      id: `RCM-${Date.now().toString().slice(-6)}`,
      machineId: machine.id,
      title: form.title.trim(),
      observation: form.observation.trim(),
      functionSnapshot: machine.function,
      performanceStandardSnapshot: machine.performanceStandard,
      functionalFailure: form.functionalFailure.trim(),
      failureMode: form.failureMode.trim(),
      failureCause: form.failureCause.trim(),
      failureEffect: form.failureEffect.trim(),
      consequences: form.consequences,
      consequenceReason: form.consequenceReason.trim(),
      proposedTask: form.proposedTask.trim(),
      taskStrategy: form.taskStrategy,
      intervalTrigger: form.intervalTrigger.trim(),
      source: form.source.trim(),
      reviewedBy: form.reviewedBy.trim(),
      expertApproved: form.expertApproved,
      reviewStatus,
      completeness,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <dialog className="case-workspace" open aria-labelledby="case-workspace-title">
      <header className="case-topbar">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Volver al tablero"><ArrowLeft /></Button>
        <div className="case-brand"><span>M</span><div><strong>Mantis IA</strong><small>Espacio de decisión RCM</small></div></div>
        <div className="case-top-title"><span>PASO 03</span><strong>Nuevo caso de mantenimiento</strong></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar caso"><X /></Button>
      </header>

      <form className="case-layout" onSubmit={submit}>
        <main className="case-main">
          <section className="case-intro">
            <div><Badge>RCM GUIADO</Badge><h2 id="case-workspace-title">Documenta la decisión, no solo la tarea.</h2><p>Conecta lo que la máquina debe hacer con la falla, sus consecuencias y una acción técnicamente justificable.</p></div>
            <div className="case-flow" aria-label="Secuencia del análisis RCM">
              {['Contexto', 'Falla', 'Consecuencia', 'Decisión', 'Validación'].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < 4 && <ChevronRight />}</div>)}
            </div>
          </section>

          <section className="case-section case-context-section">
            <div className="case-section-heading"><span>01</span><div><h3>Contexto del caso</h3><p>Parte siempre de la función que se necesita preservar.</p></div></div>
            <div className="case-grid">
              <label className="form-field" htmlFor="case-machine"><span><Gauge /> Máquina</span><NativeSelect id="case-machine" className="form-native-select" value={form.machineId} onChange={(event) => update('machineId', event.target.value)}>{machines.map((item) => <NativeSelectOption value={item.id} key={item.id}>{item.id} · {item.name}</NativeSelectOption>)}</NativeSelect></label>
              <label className="form-field" htmlFor="case-title"><span><ClipboardCheck /> Nombre del caso</span><Input id="case-title" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej. Pérdida de presión durante la práctica" /></label>
              <label className="form-field case-full" htmlFor="case-observation"><span><BookOpenCheck /> Observación inicial</span><Textarea id="case-observation" value={form.observation} onChange={(event) => update('observation', event.target.value)} placeholder="¿Qué vio, escuchó o midió el operador? Escribe hechos, no conclusiones." /></label>
            </div>
            <div className="function-snapshot"><div><span>FUNCIÓN REGISTRADA</span><strong>{machine?.function}</strong></div><div><span>DESEMPEÑO ESPERADO</span><strong className={!machine?.performanceStandard ? 'snapshot-pending' : undefined}>{machine?.performanceStandard || 'Sin validar en el experimento'}</strong></div><Badge>{machine?.dataStatus}</Badge></div>
          </section>

          <section className="case-section">
            <div className="case-section-heading"><span>02</span><div><h3>Falla funcional y modo de falla</h3><p>Diferencia lo que deja de cumplirse de aquello que lo provoca.</p></div></div>
            <div className="case-grid">
              <label className="form-field" htmlFor="functional-failure"><span>Falla funcional</span><Textarea id="functional-failure" value={form.functionalFailure} onChange={(event) => update('functionalFailure', event.target.value)} placeholder="Ej. No logra suministrar la presión mínima requerida." /></label>
              <label className="form-field" htmlFor="failure-mode"><span>Modo de falla</span><Textarea id="failure-mode" value={form.failureMode} onChange={(event) => update('failureMode', event.target.value)} placeholder="Ej. El filtro de admisión se encuentra obstruido." /></label>
              <label className="form-field" htmlFor="failure-cause"><span>Causa posible</span><Textarea id="failure-cause" value={form.failureCause} onChange={(event) => update('failureCause', event.target.value)} placeholder="Ej. Acumulación de partículas por exposición al ambiente." /></label>
              <label className="form-field" htmlFor="failure-effect"><span>Efecto observable</span><Textarea id="failure-effect" value={form.failureEffect} onChange={(event) => update('failureEffect', event.target.value)} placeholder="¿Qué ocurre localmente y qué percibe el operador?" /></label>
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading"><span>03</span><div><h3>Consecuencias de la falla</h3><p>Selecciona todas las consecuencias que realmente apliquen en este contexto.</p></div></div>
            <fieldset className="consequence-fieldset">
              <legend className="sr-only">Consecuencias de la falla; permite selección múltiple</legend>
              <div className="consequence-grid">
                {consequenceOptions.map(({ value, label, detail, icon: Icon }) => <label htmlFor={`consequence-${value}`} className="consequence-option" key={value}><Checkbox id={`consequence-${value}`} checked={form.consequences.includes(value)} onCheckedChange={(checked) => toggleConsequence(value, Boolean(checked))} /><Icon /><div><strong>{label}</strong><span>{detail}</span></div></label>)}
              </div>
            </fieldset>
            <p className="consequence-help">Puedes marcar varias. Para la puerta de calidad siguen contando como un solo criterio y debes justificar cada impacto seleccionado.</p>
            <label className="form-field case-consequence-reason" htmlFor="consequence-reason"><span>¿Por qué aplica cada consecuencia seleccionada?</span><Textarea id="consequence-reason" value={form.consequenceReason} onChange={(event) => update('consequenceReason', event.target.value)} placeholder="Describe por separado los impactos de seguridad, ambientales, operacionales o económicos que correspondan." /></label>
          </section>

          <section className="case-section case-decision-section">
            <div className="case-section-heading"><span>04</span><div><h3>Decisión de mantenimiento</h3><p>La tarea debe actuar sobre el modo de falla o reducir su consecuencia.</p></div></div>
            <div className="case-grid">
              <label className="form-field case-full" htmlFor="proposed-task"><span><Wrench /> Tarea o política propuesta</span><Textarea id="proposed-task" value={form.proposedTask} onChange={(event) => update('proposedTask', event.target.value)} placeholder="¿Qué acción concreta propone y sobre qué modo de falla actúa?" /></label>
              <label className="form-field" htmlFor="task-strategy"><span>Estrategia RCM</span><NativeSelect id="task-strategy" className="form-native-select" value={form.taskStrategy} onChange={(event) => update('taskStrategy', event.target.value as TaskStrategy)}>{taskStrategies.map((strategy) => <NativeSelectOption value={strategy} key={strategy}>{strategy}</NativeSelectOption>)}</NativeSelect><small>{taskStrategyHelp[form.taskStrategy]}</small></label>
              <label className="form-field" htmlFor="interval-trigger"><span>Intervalo o disparador</span><Input id="interval-trigger" value={form.intervalTrigger} onChange={(event) => update('intervalTrigger', event.target.value)} placeholder="Ej. Cada 250 h o ΔP superior a 0,4 bar" /></label>
              <label className="form-field case-full" htmlFor="case-source"><span><FileCheck2 /> Fuente técnica</span><Input id="case-source" value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="Manual y sección, historial, medición o criterio del técnico" /></label>
            </div>
          </section>

          <section className="case-section review-section">
            <div className="case-section-heading"><span>05</span><div><h3>Revisión humana</h3><p>El software organiza la evidencia; una persona competente valida la decisión.</p></div></div>
            <div className="review-grid">
              <label className="form-field" htmlFor="reviewer-name"><span>Técnico revisor</span><Input id="reviewer-name" value={form.reviewedBy} onChange={(event) => update('reviewedBy', event.target.value)} placeholder="Nombre del técnico responsable de la revisión" /></label>
              <label className="approval-check" htmlFor="expert-approval"><Checkbox id="expert-approval" checked={form.expertApproved} onCheckedChange={(checked) => update('expertApproved', Boolean(checked))} /><span><strong>Confirmo revisión técnica</strong><small>La cadena RCM y la tarea propuesta fueron revisadas con la evidencia indicada.</small></span></label>
            </div>
          </section>

          {error && <div className="case-error" role="alert"><AlertTriangle /> {error}</div>}
        </main>

        <aside className="quality-gate">
          <div className="quality-sticky">
            <div className="quality-heading"><div><ShieldAlert /></div><span>PUERTA DE CALIDAD RCM</span></div>
            <div className="quality-score"><strong>{completeness}</strong><span>%</span><p>{completedChecks} de {qualityChecks.length} criterios completos</p></div>
            <Progress value={completeness} className="quality-progress" />
            <div className="quality-list">{qualityChecks.map((item) => <div className={item.complete ? 'complete' : ''} key={item.label}><span>{item.complete ? <Check /> : null}</span><p>{item.label}</p></div>)}</div>
            <div className={`review-state ${reviewStatus === 'Validado por técnico' ? 'validated' : reviewStatus === 'Listo para revisión' ? 'ready' : ''}`}><span>ESTADO</span><strong>{reviewStatus}</strong></div>
            <div className="quality-warning"><Sparkles /><p><strong>Completitud no significa corrección.</strong> Mantis verifica que la cadena exista; el técnico confirma que sea coherente y técnicamente válida.</p></div>
            <div className="quality-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit"><Save data-icon="inline-start" /> Guardar caso</Button></div>
          </div>
        </aside>
      </form>
    </dialog>
  );
}
