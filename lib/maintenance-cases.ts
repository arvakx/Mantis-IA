export type ConsequenceCategory = 'Seguridad' | 'Ambiental' | 'Operacional' | 'No operacional';
export type TaskStrategy = 'Por condición' | 'Restauración programada' | 'Sustitución programada' | 'Búsqueda de falla' | 'Operar hasta fallar' | 'Rediseño';
export type CaseReviewStatus = 'Borrador' | 'Listo para revisión' | 'Validado por experto';

export type MaintenanceCase = {
  id: string;
  machineId: string;
  title: string;
  observation: string;
  functionSnapshot: string;
  performanceStandardSnapshot: string;
  functionalFailure: string;
  failureMode: string;
  failureCause: string;
  failureEffect: string;
  consequence: ConsequenceCategory;
  consequenceReason: string;
  proposedTask: string;
  taskStrategy: TaskStrategy;
  intervalTrigger: string;
  source: string;
  reviewedBy: string;
  expertApproved: boolean;
  reviewStatus: CaseReviewStatus;
  completeness: number;
  createdAt: string;
};
