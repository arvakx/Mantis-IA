import type { DataStatus } from '@/lib/machines';

export type MaintenanceType = 'Preventivo' | 'Correctivo' | 'Inspección';

export type MaintenanceRecord = {
  id: string;
  machineId: string;
  maintenanceType: MaintenanceType;
  performedAt: string;
  serviceHours: number;
  technician: string;
  completedTask: string;
  workSummary: string;
  partsUsed: string;
  observations: string;
  source: string;
  resetsPreventivePlan: boolean;
  dataStatus: DataStatus;
};

export function formatMaintenanceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha sin registrar';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatMaintenanceDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha válida';

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
