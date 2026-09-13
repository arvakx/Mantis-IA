'use client';

import { useState, type SyntheticEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Factory,
  Gauge,
  Hash,
  MapPin,
  Save,
  ShieldCheck,
  Tag,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  calculateMachineStatus,
  formatHours,
  type DataStatus,
  type Machine,
} from '@/lib/machines';

type EditorMode = 'create' | 'edit';

type MachineEditorSheetProps = {
  open: boolean;
  mode: EditorMode;
  machine?: Machine;
  existingIds: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (machine: Machine) => void;
};

type FormState = {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  hours: string;
  lastServiceHours: string;
  maintenanceInterval: string;
  lastService: string;
  nextTask: string;
  function: string;
  operatingContext: string;
  performanceStandard: string;
  dataStatus: DataStatus;
  source: string;
};

const blankForm: FormState = {
  id: '',
  name: '',
  type: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  location: '',
  hours: '0',
  lastServiceHours: '0',
  maintenanceInterval: '500',
  lastService: 'Sin servicio registrado',
  nextTask: '',
  function: '',
  operatingContext: '',
  performanceStandard: '',
  dataStatus: 'Pendiente de validación',
  source: '',
};

function machineToForm(machine: Machine): FormState {
  return {
    id: machine.id,
    name: machine.name,
    type: machine.type,
    manufacturer: machine.manufacturer,
    model: machine.model,
    serialNumber: machine.serialNumber,
    location: machine.location,
    hours: String(machine.hours),
    lastServiceHours: String(machine.lastServiceHours),
    maintenanceInterval: String(machine.maintenanceInterval),
    lastService: machine.lastService,
    nextTask: machine.nextTask,
    function: machine.function,
    operatingContext: machine.operatingContext,
    performanceStandard: machine.performanceStandard,
    dataStatus: machine.dataStatus,
    source: machine.source,
  };
}

export function MachineEditorSheet({
  open,
  mode,
  machine,
  existingIds,
  onOpenChange,
  onSave,
}: MachineEditorSheetProps) {
  const [form, setForm] = useState<FormState>(() => mode === 'edit' && machine ? machineToForm(machine) : { ...blankForm });
  const [error, setError] = useState<string | null>(null);
  const previewHours = Number(form.hours);
  const previewLastServiceHours = Number(form.lastServiceHours);
  const previewInterval = Number(form.maintenanceInterval);
  const previewIsValid = Number.isFinite(previewHours) && Number.isFinite(previewLastServiceHours) && Number.isFinite(previewInterval) && previewInterval > 0;
  const previewNextService = previewIsValid ? previewLastServiceHours + previewInterval : 0;
  const previewDelta = previewNextService - previewHours;

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = form.id.trim().toUpperCase().replace(/\s+/g, '-');
    const hours = Number(form.hours);
    const lastServiceHours = Number(form.lastServiceHours);
    const maintenanceInterval = Number(form.maintenanceInterval);

    if (!id || !form.name.trim() || !form.type.trim() || !form.location.trim()) {
      setError('Completa la identificación básica del activo.');
      return;
    }
    if (!form.function.trim() || !form.operatingContext.trim() || !form.nextTask.trim()) {
      setError('La función, el contexto operativo y la próxima tarea son obligatorios.');
      return;
    }
    if (!Number.isFinite(hours) || hours < 0 || !Number.isFinite(lastServiceHours) || lastServiceHours < 0 || lastServiceHours > hours) {
      setError('Las horas actuales y las del último servicio deben ser válidas; el último servicio no puede superar el contador actual.');
      return;
    }
    if (!Number.isFinite(maintenanceInterval) || maintenanceInterval <= 0) {
      setError('El intervalo preventivo debe ser mayor que cero.');
      return;
    }
    if (mode === 'create' && existingIds.includes(id)) {
      setError(`Ya existe un activo con el código ${id}.`);
      return;
    }
    if (form.dataStatus === 'Validado' && (!form.manufacturer.trim() || !form.model.trim() || !form.source.trim() || !form.performanceStandard.trim())) {
      setError('Para marcar el activo como validado necesitas fabricante, modelo, una fuente verificable y un estándar de desempeño confirmado durante el experimento o por el experto.');
      return;
    }

    const status = calculateMachineStatus(hours, lastServiceHours, maintenanceInterval);
    const previousHealth = mode === 'edit' && machine ? machine.health : 88;

    onSave({
      id,
      name: form.name.trim(),
      type: form.type.trim(),
      manufacturer: form.manufacturer.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      location: form.location.trim(),
      hours,
      lastServiceHours,
      maintenanceInterval,
      health: previousHealth,
      status,
      lastService: form.lastService.trim() || 'Sin servicio registrado',
      nextTask: form.nextTask.trim(),
      function: form.function.trim(),
      operatingContext: form.operatingContext.trim(),
      performanceStandard: form.performanceStandard.trim(),
      dataStatus: form.dataStatus,
      source: form.source.trim() || 'Sin fuente documentada',
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="editor-sheet sm:max-w-[760px]" showCloseButton>
        <SheetHeader className="editor-head">
          <div className="editor-heading-mark"><Database /></div>
          <div>
            <div className="editor-title-line">
              <Badge>{mode === 'create' ? 'NUEVO ACTIVO' : 'EDICIÓN CONTROLADA'}</Badge>
              <span>PASO 02 · BASE DE DATOS</span>
            </div>
            <SheetTitle>{mode === 'create' ? 'Registrar una máquina' : `Editar ${machine?.id ?? 'activo'}`}</SheetTitle>
            <SheetDescription>Guarda únicamente datos conocidos y marca con honestidad lo que aún necesita validación.</SheetDescription>
          </div>
        </SheetHeader>

        <form className="editor-form" onSubmit={submit}>
          <div className="editor-scroll">
            <section className="form-section">
              <div className="form-section-head"><span>01</span><div><h3>Identificación</h3><p>Cómo reconoceremos el activo dentro del laboratorio.</p></div></div>
              <div className="form-grid form-grid-four">
                <label className="form-field" htmlFor="asset-id"><span><Tag /> Código del activo</span><Input id="asset-id" value={form.id} onChange={(event) => update('id', event.target.value)} placeholder="Ej. TOR-04" disabled={mode === 'edit'} /></label>
                <label className="form-field form-span-two" htmlFor="asset-name"><span><Activity /> Nombre de la máquina</span><Input id="asset-name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. Torno paralelo" /></label>
                <label className="form-field" htmlFor="asset-location"><span><MapPin /> Ubicación</span><Input id="asset-location" value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Ej. Celda 02" /></label>
                <label className="form-field form-span-two" htmlFor="asset-type"><span><Gauge /> Tipo de equipo</span><Input id="asset-type" value={form.type} onChange={(event) => update('type', event.target.value)} placeholder="Ej. Máquina herramienta" /></label>
                <label className="form-field validation-required" htmlFor="asset-manufacturer"><span><Factory /> Fabricante o marca <em>VALIDAR</em></span><Input id="asset-manufacturer" value={form.manufacturer} onChange={(event) => update('manufacturer', event.target.value)} placeholder="Ej. Siemens" /><small>Copiar exactamente desde la placa o el manual técnico.</small></label>
                <label className="form-field validation-required" htmlFor="asset-model"><span><Tag /> Modelo <em>VALIDAR</em></span><Input id="asset-model" value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="Ej. 1LE1" /><small>No confundir con el tipo general del equipo.</small></label>
                <label className="form-field form-span-two" htmlFor="asset-serial"><span><Hash /> Número de serie</span><Input id="asset-serial" value={form.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} placeholder="Ej. SN-2026-004" /><small>Regístralo si está disponible y legible en la placa.</small></label>
                <label className="form-field" htmlFor="asset-hours"><span><Activity /> Horas actuales</span><Input id="asset-hours" type="number" min="0" step="0.1" value={form.hours} onChange={(event) => update('hours', event.target.value)} /></label>
                <label className="form-field" htmlFor="asset-last-service-hours"><span><ClipboardCheck /> Horas en último servicio</span><Input id="asset-last-service-hours" type="number" min="0" step="0.1" value={form.lastServiceHours} onChange={(event) => update('lastServiceHours', event.target.value)} /></label>
                <label className="form-field" htmlFor="asset-interval"><span><Wrench /> Intervalo preventivo</span><Input id="asset-interval" type="number" min="1" step="1" value={form.maintenanceInterval} onChange={(event) => update('maintenanceInterval', event.target.value)} /><small>Cantidad de horas entre un mantenimiento y el siguiente.</small></label>
                <div className={`service-calculation form-span-three ${previewDelta <= 0 ? 'service-calculation-overdue' : ''}`}><div><span>PRÓXIMO SERVICIO CALCULADO</span><strong>{previewIsValid ? `${formatHours(previewNextService)} h` : 'Completa los contadores'}</strong></div>{previewIsValid && <p>{previewDelta <= 0 ? `${formatHours(Math.abs(previewDelta))} h vencidas` : `${formatHours(previewDelta)} h restantes`}<small>Último servicio ({formatHours(previewLastServiceHours)} h) + intervalo ({formatHours(previewInterval)} h)</small></p>}</div>
              </div>
            </section>

            <section className="form-section rcm-form-section">
              <div className="form-section-head"><span>02</span><div><h3>Base RCM</h3><p>Qué debe hacer la máquina y bajo cuáles condiciones.</p></div><Badge>CLAVE CIENTÍFICA</Badge></div>
              <div className="form-grid">
                <label className="form-field form-span-two" htmlFor="asset-function"><span><ClipboardCheck /> Función del activo</span><Textarea id="asset-function" value={form.function} onChange={(event) => update('function', event.target.value)} placeholder="¿Qué debe hacer esta máquina?" /></label>
                <label className="form-field" htmlFor="asset-context"><span><MapPin /> Contexto operativo</span><Textarea id="asset-context" value={form.operatingContext} onChange={(event) => update('operatingContext', event.target.value)} placeholder="¿Dónde, cuánto y bajo qué condiciones opera?" /></label>
                <label className="form-field validation-required" htmlFor="asset-standard"><span><ShieldCheck /> Estándar de desempeño <em>VALIDAR EN EL EXPERIMENTO</em></span><Textarea id="asset-standard" value={form.performanceStandard} onChange={(event) => update('performanceStandard', event.target.value)} placeholder="Ej. Operar sin vibraciones anormales y conservar la precisión definida por el fabricante." /><small>No se completa automáticamente: debe contrastarse con mediciones, manuales o revisión del técnico.</small></label>
              </div>
              <div className="rcm-scope-note"><AlertTriangle /><p><strong>Esto prepara el contexto RCM, pero no certifica un análisis.</strong> La aplicación completa se comprueba en el caso de mantenimiento: falla funcional, modo, efecto, consecuencia, tarea, fuente y revisión experta.</p></div>
            </section>

            <section className="form-section">
              <div className="form-section-head"><span>03</span><div><h3>Plan y evidencia</h3><p>Qué se hará y de dónde proviene la información.</p></div></div>
              <div className="form-grid">
                <label className="form-field form-span-two" htmlFor="asset-task"><span><Wrench /> Próxima tarea preventiva</span><Input id="asset-task" value={form.nextTask} onChange={(event) => update('nextTask', event.target.value)} placeholder="Ej. Revisar lubricación y alineación" /></label>
                <label className="form-field" htmlFor="asset-last-service"><span><ClipboardCheck /> Último servicio</span><Input id="asset-last-service" value={form.lastService} onChange={(event) => update('lastService', event.target.value)} placeholder="Ej. 09 sep 2026" /></label>
                <label className="form-field validation-required" htmlFor="asset-source"><span><Database /> Fuente del dato <em>OBLIGATORIA AL VALIDAR</em></span><Input id="asset-source" value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="Manual técnico, medición, historial o revisión del técnico" /><small>Identifica de dónde salió la información para que pueda comprobarse.</small></label>
                <label className="form-field" htmlFor="asset-validation"><span><CheckCircle2 /> Estado de validación de los datos</span><NativeSelect id="asset-validation" className="form-native-select" value={form.dataStatus} onChange={(event) => update('dataStatus', event.target.value as DataStatus)}><NativeSelectOption value="Demostrativo">Demostrativo · solo prueba</NativeSelectOption><NativeSelectOption value="Pendiente de validación">Pendiente · requiere validación experimental</NativeSelectOption><NativeSelectOption value="Validado">Validado · fuente y revisión confirmadas</NativeSelectOption></NativeSelect><small className="validation-select-help">“Vencida” pertenece al estado de mantenimiento, no a la validez de los datos.</small></label>
              </div>
            </section>

            {error && <div className="editor-error" role="alert"><AlertTriangle /> {error}</div>}
          </div>

          <div className="editor-actions">
            <div><ShieldCheck /><span>Los cambios quedarán guardados en este dispositivo.</span></div>
            <div><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit"><Save data-icon="inline-start" /> {mode === 'create' ? 'Registrar activo' : 'Guardar cambios'}</Button></div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
