'use client';

import { useState, type SyntheticEvent } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  PackageOpen,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  calculateMachineStatus,
  formatHours,
  getNextServiceAt,
  type DataStatus,
  type Machine,
} from '@/lib/machines';
import type { MaintenanceRecord, MaintenanceType } from '@/lib/maintenance-records';

type MaintenanceRecordDialogProps = {
  machine: Machine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: MaintenanceRecord) => void;
};

type MaintenanceForm = {
  maintenanceType: MaintenanceType;
  performedAt: string;
  serviceHours: string;
  technician: string;
  completedTask: string;
  workSummary: string;
  partsUsed: string;
  observations: string;
  source: string;
  resetsPreventivePlan: boolean;
  dataStatus: DataStatus;
};

function toLocalDateTimeValue(date: Date) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function getInitialForm(machine: Machine): MaintenanceForm {
  return {
    maintenanceType: 'Preventivo',
    performedAt: toLocalDateTimeValue(new Date()),
    serviceHours: String(machine.hours),
    technician: '',
    completedTask: machine.nextTask,
    workSummary: '',
    partsUsed: '',
    observations: '',
    source: '',
    resetsPreventivePlan: true,
    dataStatus: 'Demostrativo',
  };
}

export function MaintenanceRecordDialog({
  machine,
  open,
  onOpenChange,
  onSave,
}: MaintenanceRecordDialogProps) {
  const [form, setForm] = useState<MaintenanceForm>(() => getInitialForm(machine));
  const [error, setError] = useState<string | null>(null);
  const serviceHours = Number(form.serviceHours);
  const serviceHoursAreValid = Number.isFinite(serviceHours)
    && serviceHours >= machine.lastServiceHours
    && serviceHours <= machine.hours;
  const projectedNextService = serviceHoursAreValid
    ? serviceHours + machine.maintenanceInterval
    : getNextServiceAt(machine);
  const projectedStatus = form.resetsPreventivePlan && serviceHoursAreValid
    ? calculateMachineStatus(machine.hours, serviceHours, machine.maintenanceInterval)
    : machine.status;

  function update<Key extends keyof MaintenanceForm>(key: Key, value: MaintenanceForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function changeMaintenanceType(value: MaintenanceType) {
    setForm((current) => ({
      ...current,
      maintenanceType: value,
      resetsPreventivePlan: value === 'Preventivo',
    }));
    setError(null);
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const performedAt = new Date(form.performedAt);

    if (!form.completedTask.trim() || !form.workSummary.trim()) {
      setError('Describe la tarea ejecutada y el trabajo que realmente se realizó.');
      return;
    }
    if (!form.technician.trim() || !form.source.trim()) {
      setError('Registra el técnico responsable y la fuente o evidencia de la intervención.');
      return;
    }
    if (!serviceHoursAreValid) {
      setError(`Las horas del servicio deben estar entre ${formatHours(machine.lastServiceHours)} h y ${formatHours(machine.hours)} h.`);
      return;
    }
    if (Number.isNaN(performedAt.getTime()) || performedAt.getTime() > Date.now() + 5 * 60_000) {
      setError('Registra una fecha válida que no esté en el futuro.');
      return;
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `maintenance-${Date.now()}`;

    onSave({
      id,
      machineId: machine.id,
      maintenanceType: form.maintenanceType,
      performedAt: performedAt.toISOString(),
      serviceHours,
      technician: form.technician.trim(),
      completedTask: form.completedTask.trim(),
      workSummary: form.workSummary.trim(),
      partsUsed: form.partsUsed.trim(),
      observations: form.observations.trim(),
      source: form.source.trim(),
      resetsPreventivePlan: form.resetsPreventivePlan,
      dataStatus: form.dataStatus,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="maintenance-dialog sm:max-w-[820px]" showCloseButton>
        <DialogHeader className="maintenance-dialog-head">
          <div className="maintenance-dialog-icon"><Wrench /></div>
          <div>
            <div className="maintenance-title-line"><Badge>INTERVENCIÓN EJECUTADA</Badge><span>CIERRE DEL CICLO PREVENTIVO</span></div>
            <DialogTitle>Registrar mantenimiento de {machine.name}</DialogTitle>
            <DialogDescription>{machine.id} · Documenta lo realizado y decide si esta intervención reinicia el contador del plan.</DialogDescription>
          </div>
        </DialogHeader>

        <form className="maintenance-form" onSubmit={submit}>
          <div className="maintenance-context-strip">
            <div><span>ESTADO ACTUAL</span><strong>{machine.status}</strong></div>
            <div><span>HORÓMETRO</span><strong>{formatHours(machine.hours)} h</strong></div>
            <div><span>ÚLTIMO SERVICIO</span><strong>{formatHours(machine.lastServiceHours)} h</strong></div>
            <div><span>INTERVALO DEL PLAN</span><strong>{formatHours(machine.maintenanceInterval)} h</strong></div>
          </div>

          <div className="maintenance-form-grid">
            <label className="form-field" htmlFor="maintenance-type"><span><Wrench /> Tipo de intervención</span><NativeSelect id="maintenance-type" className="form-native-select" value={form.maintenanceType} onChange={(event) => changeMaintenanceType(event.target.value as MaintenanceType)}><NativeSelectOption value="Preventivo">Preventivo</NativeSelectOption><NativeSelectOption value="Correctivo">Correctivo</NativeSelectOption><NativeSelectOption value="Inspección">Inspección</NativeSelectOption></NativeSelect><small>El tipo no determina por sí solo si se reinicia el plan.</small></label>
            <label className="form-field" htmlFor="maintenance-date"><span><CalendarDays /> Fecha y hora de ejecución</span><Input id="maintenance-date" type="datetime-local" max={toLocalDateTimeValue(new Date())} value={form.performedAt} onChange={(event) => update('performedAt', event.target.value)} /></label>
            <label className="form-field" htmlFor="maintenance-hours"><span><Gauge /> Horas al realizar el servicio</span><Input id="maintenance-hours" type="number" min={machine.lastServiceHours} max={machine.hours} step="0.1" value={form.serviceHours} onChange={(event) => update('serviceHours', event.target.value)} /><small>No modifica el horómetro actual; ubica la intervención en la línea de tiempo.</small></label>
            <label className="form-field" htmlFor="maintenance-technician"><span><UserRound /> Técnico responsable</span><Input id="maintenance-technician" value={form.technician} onChange={(event) => update('technician', event.target.value)} placeholder="Ej. Carlos Pérez" /></label>
            <label className="form-field maintenance-full" htmlFor="maintenance-task"><span><ClipboardCheck /> Tarea ejecutada</span><Input id="maintenance-task" value={form.completedTask} onChange={(event) => update('completedTask', event.target.value)} placeholder="Describe la intervención completada" /></label>
            <label className="form-field maintenance-full" htmlFor="maintenance-summary"><span><CheckCircle2 /> Trabajo realizado</span><Textarea id="maintenance-summary" value={form.workSummary} onChange={(event) => update('workSummary', event.target.value)} placeholder="Explica concretamente qué se inspeccionó, ajustó, limpió o reemplazó." /></label>
            <label className="form-field" htmlFor="maintenance-parts"><span><PackageOpen /> Repuestos o insumos</span><Input id="maintenance-parts" value={form.partsUsed} onChange={(event) => update('partsUsed', event.target.value)} placeholder="Ej. Aceite ISO VG 46 y filtro" /><small>Opcional. Escribe “ninguno” únicamente si fue comprobado.</small></label>
            <label className="form-field" htmlFor="maintenance-source"><span><Database /> Fuente o evidencia</span><Input id="maintenance-source" value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="Ej. Orden OT-024 y lista de chequeo" /><small>Documento, fotografía, orden o revisión que respalda el registro.</small></label>
            <label className="form-field maintenance-full" htmlFor="maintenance-observations"><span><AlertTriangle /> Hallazgos u observaciones</span><Textarea id="maintenance-observations" value={form.observations} onChange={(event) => update('observations', event.target.value)} placeholder="Opcional: condición encontrada, anomalías pendientes o recomendaciones." /></label>
            <label className="form-field" htmlFor="maintenance-validation"><span><ShieldCheck /> Estado de validación</span><NativeSelect id="maintenance-validation" className="form-native-select" value={form.dataStatus} onChange={(event) => update('dataStatus', event.target.value as DataStatus)}><NativeSelectOption value="Demostrativo">Demostrativo · prueba</NativeSelectOption><NativeSelectOption value="Pendiente de validación">Pendiente · requiere revisión</NativeSelectOption><NativeSelectOption value="Validado">Validado · evidencia confirmada</NativeSelectOption></NativeSelect></label>
            <label className={`maintenance-reset-control ${form.resetsPreventivePlan ? 'active' : ''}`} htmlFor="maintenance-reset">
              <Checkbox id="maintenance-reset" checked={form.resetsPreventivePlan} onCheckedChange={(checked) => update('resetsPreventivePlan', checked)} />
              <RotateCcw />
              <span><strong>Reiniciar ciclo preventivo</strong><small>Actívalo solo si esta intervención cumplió la tarea del plan y su intervalo debe comenzar desde estas horas.</small></span>
            </label>
          </div>

          <div className={`maintenance-result-preview ${form.resetsPreventivePlan ? 'reset' : 'unchanged'}`}>
            <RotateCcw />
            <div><span>RESULTADO AL GUARDAR</span><strong>{form.resetsPreventivePlan ? `Próximo servicio a las ${formatHours(projectedNextService)} h` : 'El ciclo preventivo no cambiará'}</strong><small>{form.resetsPreventivePlan ? `El estado calculado quedará como “${projectedStatus}”.` : `La máquina conservará su estado “${machine.status}” y su base de ${formatHours(machine.lastServiceHours)} h.`}</small></div>
          </div>

          {form.maintenanceType !== 'Preventivo' && form.resetsPreventivePlan && <div className="maintenance-caution"><AlertTriangle /><span>Una intervención {form.maintenanceType.toLowerCase()} solo debe reiniciar el plan si también cumplió completamente la tarea preventiva programada.</span></div>}
          {error && <div className="maintenance-error" role="alert"><AlertTriangle /> {error}</div>}

          <DialogFooter className="maintenance-dialog-actions">
            <div><ShieldCheck /><span>Guardar no cambia la condición estimada ni afirma que la máquina quedó reparada.</span></div>
            <div><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit"><Save data-icon="inline-start" /> Guardar mantenimiento</Button></div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
