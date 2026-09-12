import type { DataStatus } from '@/lib/machines';

export type MeterReading = {
  id: string;
  machineId: string;
  previousHours: number;
  currentHours: number;
  addedHours: number;
  recordedAt: string;
  responsible: string;
  source: string;
  note: string;
  dataStatus: DataStatus;
};

export function formatReadingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha sin registrar';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
