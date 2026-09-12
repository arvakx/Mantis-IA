'use client';

import { useState, type SyntheticEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatHours, type DataStatus, type Machine } from '@/lib/machines';
import type { MeterReading } from '@/lib/meter-readings';

type MeterReadingDialogProps = {
  machine: Machine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reading: MeterReading) => void;
};

type ReadingForm = {
  currentHours: string;
  responsible: string;
  source: string;
  note: string;
  dataStatus: DataStatus;
};

function getInitialForm(machine: Machine): ReadingForm {
  return {
    currentHours: String(machine.hours),
    responsible: '',
    source: '',
    note: '',
    dataStatus: 'Demostrativo',
  };
}

export function MeterReadingDialog({
  machine,
  open,
  onOpenChange,
  onSave,
}: MeterReadingDialogProps) {
  const [form, setForm] = useState<ReadingForm>(() => getInitialForm(machine));
  const [error, setError] = useState<string | null>(null);
  const nextHours = Number(form.currentHours);
  const difference = Number.isFinite(nextHours) ? nextHours - machine.hours : 0;

  function update<Key extends keyof ReadingForm>(key: Key, value: ReadingForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!Number.isFinite(nextHours) || nextHours < machine.hours) {
      setError(`La nueva lectura no puede ser menor que las ${formatHours(machine.hours)} h registradas.`);
      return;
    }
    if (!form.responsible.trim() || !form.source.trim()) {
      setError('Registra quién tomó la lectura y de dónde proviene el dato.');
      return;
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `reading-${Date.now()}`;

    onSave({
      id,
      machineId: machine.id,
      previousHours: machine.hours,
      currentHours: nextHours,
      addedHours: difference,
      recordedAt: new Date().toISOString(),
      responsible: form.responsible.trim(),
      source: form.source.trim(),
      note: form.note.trim(),
      dataStatus: form.dataStatus,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reading-dialog sm:max-w-[680px]" showCloseButton>
        <DialogHeader className="reading-dialog-head">
          <div className="reading-dialog-icon"><Gauge /></div>
          <div>
            <div className="reading-title-line"><Badge>LECTURA DE HORÓMETRO</Badge><span>TRAZABILIDAD OPERATIVA</span></div>
            <DialogTitle>Actualizar horas de {machine.name}</DialogTitle>
            <DialogDescription>{machine.id} · La lectura actualiza el estado del mantenimiento y queda guardada en el historial.</DialogDescription>
          </div>
        </DialogHeader>

        <form className="reading-form" onSubmit={submit}>
          <div className="reading-counter-flow" aria-label="Cambio calculado en el horómetro">
            <div><span>LECTURA ANTERIOR</span><strong>{formatHours(machine.hours)} h</strong></div>
            <ArrowRight />
            <div><span>NUEVA LECTURA</span><strong>{Number.isFinite(nextHours) ? `${formatHours(nextHours)} h` : '—'}</strong></div>
            <div className={difference > 0 ? 'positive' : undefined}><span>DIFERENCIA</span><strong>{difference > 0 ? `+${formatHours(difference)} h` : 'Sin aumento'}</strong></div>
          </div>

          <div className="reading-form-grid">
            <label className="form-field" htmlFor="reading-hours"><span><Activity /> Nueva lectura total del horómetro</span><Input id="reading-hours" type="number" min={machine.hours} step="0.1" value={form.currentHours} onChange={(event) => update('currentHours', event.target.value)} /><small>Escribe el total visible en la máquina, no solamente las horas añadidas.</small></label>
            <label className="form-field" htmlFor="reading-responsible"><span><UserRound /> Responsable de la lectura</span><Input id="reading-responsible" value={form.responsible} onChange={(event) => update('responsible', event.target.value)} placeholder="Ej. Gabo Córdoba" /><small>Persona que observó o registró el contador.</small></label>
            <label className="form-field" htmlFor="reading-source"><span><Database /> Fuente o método</span><Input id="reading-source" value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="Ej. Lectura directa del horómetro" /><small>Permite comprobar cómo se obtuvo el dato.</small></label>
            <label className="form-field" htmlFor="reading-validation"><span><ShieldCheck /> Estado de validación</span><NativeSelect id="reading-validation" className="form-native-select" value={form.dataStatus} onChange={(event) => update('dataStatus', event.target.value as DataStatus)}><NativeSelectOption value="Demostrativo">Demostrativo · prueba del prototipo</NativeSelectOption><NativeSelectOption value="Pendiente de validación">Pendiente · requiere revisión</NativeSelectOption><NativeSelectOption value="Validado">Validado · lectura y fuente confirmadas</NativeSelectOption></NativeSelect><small>“Validado” significa que el valor y su fuente fueron comprobados.</small></label>
            <label className="form-field reading-note-field" htmlFor="reading-note"><span><Clock3 /> Observación opcional</span><Textarea id="reading-note" value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Ej. Lectura tomada antes de iniciar la práctica de mecanizado." /></label>
          </div>

          {error && <div className="reading-error" role="alert"><AlertTriangle /> {error}</div>}

          <DialogFooter className="reading-dialog-actions">
            <div><CheckCircle2 /><span>Se guardarán fecha, hora, valor anterior y valor nuevo.</span></div>
            <div><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit"><Save data-icon="inline-start" /> Guardar lectura</Button></div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
