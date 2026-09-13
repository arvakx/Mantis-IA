export type ConsequenceCategory = 'Seguridad' | 'Ambiental' | 'Operacional' | 'No operacional';
export type TaskStrategy = 'Por condición' | 'Restauración programada' | 'Sustitución programada' | 'Búsqueda de falla' | 'Operar hasta fallar' | 'Rediseño';
export type CaseReviewStatus = 'Borrador' | 'Listo para revisión' | 'Validado por técnico';

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
  consequences: ConsequenceCategory[];
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

type StoredMaintenanceCase = Omit<MaintenanceCase, 'consequences' | 'reviewStatus'> & {
  consequences?: ConsequenceCategory[];
  consequence?: ConsequenceCategory;
  reviewStatus?: CaseReviewStatus | 'Validado por experto';
};

const consequenceCategories: ConsequenceCategory[] = ['Seguridad', 'Ambiental', 'Operacional', 'No operacional'];

export function migrateMaintenanceCase(storedCase: StoredMaintenanceCase): MaintenanceCase {
  const { consequence, consequences, reviewStatus, ...caseData } = storedCase;
  const normalizedConsequences = Array.from(new Set(
    (Array.isArray(consequences) ? consequences : consequence ? [consequence] : [])
      .filter((item): item is ConsequenceCategory => consequenceCategories.includes(item)),
  ));

  return {
    ...caseData,
    consequences: normalizedConsequences,
    reviewStatus: reviewStatus === 'Validado por experto' ? 'Validado por técnico' : reviewStatus ?? 'Borrador',
  };
}
