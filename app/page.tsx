'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Bot, CheckCircle2, ClipboardCheck,
  ChevronRight, Clock3, FileText, Gauge, History,
  LayoutDashboard, Menu, Pencil, Plus, Radio, ScanLine, Search, Send, Settings,
  ShieldCheck, Sparkles, Wrench,
} from 'lucide-react';

import { MachineEditorSheet } from '@/components/machine-editor-sheet';
import { MaintenanceCaseWorkspace } from '@/components/maintenance-case-workspace';
import { MaintenanceRecordDialog } from '@/components/maintenance-record-dialog';
import { MachineProfileSheet } from '@/components/machine-profile-sheet';
import { MeterReadingDialog } from '@/components/meter-reading-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  calculateMachineStatus,
  formatHours,
  getNextServiceAt,
  getServiceProgress,
  initialMachines,
  statusStyles,
  type Machine,
  type MachineStatus,
} from '@/lib/machines';
import { migrateMaintenanceCase, type MaintenanceCase } from '@/lib/maintenance-cases';
import { formatMaintenanceDate, formatMaintenanceDay, type MaintenanceRecord } from '@/lib/maintenance-records';
import { formatReadingDate, type MeterReading } from '@/lib/meter-readings';

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

type ActiveView = 'overview' | 'machines';

const navItems = [
  { id: 'overview' as const, label: 'Vista general', icon: LayoutDashboard },
  { id: 'machines' as const, label: 'Máquinas', icon: Gauge },
  { label: 'Mantenimiento', icon: Wrench },
  { label: 'Historial', icon: History },
];

const MACHINES_STORAGE_KEY = 'mantis-ia-assets-v1';
const CASES_STORAGE_KEY = 'mantis-ia-rcm-cases-v1';
const READINGS_STORAGE_KEY = 'mantis-ia-meter-readings-v1';
const MAINTENANCE_STORAGE_KEY = 'mantis-ia-maintenance-records-v1';
const LEGACY_PENDING_STANDARD = 'Pendiente de validación con el experto de mantenimiento.';
// Conservamos el prototipo de asistencia sin exponerlo hasta integrar y validar una IA real.
const AI_FEATURES_ENABLED = false;

type StoredMachine = Omit<Machine, 'lastServiceHours' | 'maintenanceInterval' | 'manufacturer' | 'model' | 'serialNumber'> & {
  lastServiceHours?: number;
  maintenanceInterval?: number;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  dueAt?: number;
};

function migrateStoredMachine(machine: StoredMachine): Machine {
  const seededMachine = initialMachines.find((item) => item.id === machine.id);
  const legacyDueAt = Number(machine.dueAt);
  const lastServiceHours = Number.isFinite(machine.lastServiceHours)
    ? Number(machine.lastServiceHours)
    : seededMachine?.lastServiceHours ?? 0;
  const maintenanceInterval = Number.isFinite(machine.maintenanceInterval) && Number(machine.maintenanceInterval) > 0
    ? Number(machine.maintenanceInterval)
    : seededMachine?.maintenanceInterval ?? (Number.isFinite(legacyDueAt) ? Math.max(legacyDueAt - lastServiceHours, 1) : 500);
  const migrated = { ...machine };
  delete migrated.dueAt;

  return {
    ...migrated,
    manufacturer: typeof machine.manufacturer === 'string' ? machine.manufacturer : '',
    model: typeof machine.model === 'string' ? machine.model : '',
    serialNumber: typeof machine.serialNumber === 'string' ? machine.serialNumber : '',
    lastServiceHours,
    maintenanceInterval,
    status: calculateMachineStatus(machine.hours, lastServiceHours, maintenanceInterval),
    performanceStandard: machine.performanceStandard === LEGACY_PENDING_STANDARD ? '' : machine.performanceStandard,
  };
}

export default function Home() {
  const [machines, setMachines] = useState(initialMachines);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedId, setSelectedId] = useState('COMP-01');
  const [filter, setFilter] = useState<'Todas' | MachineStatus | 'Validados'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assetProfileOpen, setAssetProfileOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [storageReady, setStorageReady] = useState(false);
  const [maintenanceCases, setMaintenanceCases] = useState<MaintenanceCase[]>([]);
  const [casesReady, setCasesReady] = useState(false);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [readingsReady, setReadingsReady] = useState(false);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [maintenanceReady, setMaintenanceReady] = useState(false);
  const [caseWorkspaceOpen, setCaseWorkspaceOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [assistantSource, setAssistantSource] = useState('Plan preventivo registrado');
  const [notice, setNotice] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = machines.find((machine) => machine.id === selectedId) ?? machines[0];
  const filteredMachines = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    return machines.filter((machine) => {
      const matchesStatus = filter === 'Todas'
        || (filter === 'Validados' ? machine.dataStatus === 'Validado' : machine.status === filter);
      const searchableText = `${machine.id} ${machine.name} ${machine.type} ${machine.manufacturer} ${machine.model} ${machine.serialNumber} ${machine.location}`.toLocaleLowerCase('es');
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [filter, machines, searchQuery]);
  const overdueCount = machines.filter((machine) => machine.status === 'Vencida').length;
  const warningCount = machines.filter((machine) => machine.status === 'Atención próxima').length;
  const validatedCount = machines.filter((machine) => machine.dataStatus === 'Validado').length;
  const validatedPercent = machines.length > 0 ? Math.round((validatedCount / machines.length) * 100) : 0;
  const priorityMachines = useMemo(() => [...machines]
    .sort((a, b) => {
      const rank: Record<MachineStatus, number> = { Vencida: 0, 'Atención próxima': 1, Operativa: 2 };
      return rank[a.status] - rank[b.status] || (getNextServiceAt(a) - a.hours) - (getNextServiceAt(b) - b.hours);
    })
    .slice(0, 3), [machines]);
  const selectedReadings = useMemo(
    () => meterReadings.filter((reading) => reading.machineId === selected.id),
    [meterReadings, selected.id],
  );
  const selectedMaintenanceRecords = useMemo(
    () => maintenanceRecords.filter((record) => record.machineId === selected.id),
    [maintenanceRecords, selected.id],
  );
  const selectedActivityItems = useMemo(() => [
    ...maintenanceRecords
      .filter((record) => record.machineId === selected.id)
      .map((record) => ({ id: record.id, kind: 'maintenance' as const, at: record.performedAt, title: record.completedTask, detail: `${record.maintenanceType} · ${record.technician}` })),
    ...maintenanceCases
      .filter((maintenanceCase) => maintenanceCase.machineId === selected.id)
      .map((maintenanceCase) => ({ id: maintenanceCase.id, kind: 'rcm' as const, at: maintenanceCase.createdAt, title: maintenanceCase.title, detail: `${maintenanceCase.id} · ${maintenanceCase.reviewStatus}` })),
    ...meterReadings
      .filter((reading) => reading.machineId === selected.id)
      .map((reading) => ({ id: reading.id, kind: 'reading' as const, at: reading.recordedAt, title: `${formatHours(reading.currentHours)} h registradas`, detail: reading.responsible })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 3),
  [maintenanceCases, maintenanceRecords, meterReadings, selected.id],
  );

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(MACHINES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StoredMachine[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMachines(parsed.map(migrateStoredMachine));
          }
        } catch {
          window.localStorage.removeItem(MACHINES_STORAGE_KEY);
        }
      }
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(storageTimer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
  }, [machines, storageReady]);

  useEffect(() => {
    const casesTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(CASES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Parameters<typeof migrateMaintenanceCase>[0][];
          if (Array.isArray(parsed)) setMaintenanceCases(parsed.map(migrateMaintenanceCase));
        } catch {
          window.localStorage.removeItem(CASES_STORAGE_KEY);
        }
      }
      setCasesReady(true);
    }, 0);

    return () => window.clearTimeout(casesTimer);
  }, []);

  useEffect(() => {
    if (!casesReady) return;
    window.localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(maintenanceCases));
  }, [casesReady, maintenanceCases]);

  useEffect(() => {
    const readingsTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(READINGS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MeterReading[];
          if (Array.isArray(parsed)) setMeterReadings(parsed);
        } catch {
          window.localStorage.removeItem(READINGS_STORAGE_KEY);
        }
      }
      setReadingsReady(true);
    }, 0);

    return () => window.clearTimeout(readingsTimer);
  }, []);

  useEffect(() => {
    if (!readingsReady) return;
    window.localStorage.setItem(READINGS_STORAGE_KEY, JSON.stringify(meterReadings));
  }, [meterReadings, readingsReady]);

  useEffect(() => {
    const maintenanceTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(MAINTENANCE_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MaintenanceRecord[];
          if (Array.isArray(parsed)) setMaintenanceRecords(parsed);
        } catch {
          window.localStorage.removeItem(MAINTENANCE_STORAGE_KEY);
        }
      }
      setMaintenanceReady(true);
    }, 0);

    return () => window.clearTimeout(maintenanceTimer);
  }, []);

  useEffect(() => {
    if (!maintenanceReady) return;
    window.localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(maintenanceRecords));
  }, [maintenanceReady, maintenanceRecords]);

  useEffect(() => {
    function focusInventorySearch(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setActiveView('machines');
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    window.addEventListener('keydown', focusInventorySearch);
    return () => window.removeEventListener('keydown', focusInventorySearch);
  }, []);

  useEffect(() => {
    if (!AI_FEATURES_ENABLED) return;
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const reportError = (error: unknown) => {
      console.warn('No fue posible registrar una herramienta de Mantis IA.', error);
    };

    void Promise.resolve(context.registerTool({
      name: 'list_maintenance_priorities',
      title: 'Listar prioridades de mantenimiento',
      description: 'Consulta las máquinas visibles y devuelve primero las que tienen mantenimiento vencido o próximo.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        priorities: machines
          .filter((machine) => machine.status !== 'Operativa')
          .map((machine) => ({ id: machine.id, name: machine.name, status: machine.status, hours: machine.hours, nextServiceAt: getNextServiceAt(machine), maintenanceInterval: machine.maintenanceInterval })),
      }),
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'record_machine_hours',
      title: 'Registrar horas de máquina',
      description: 'Suma una lectura positiva de horas a una máquina existente y actualiza el tablero visible.',
      inputSchema: {
        type: 'object',
        properties: {
          machineId: { type: 'string', description: 'Identificador como COMP-01.' },
          additionalHours: { type: 'number', minimum: 0.1, maximum: 24 },
        },
        required: ['machineId', 'additionalHours'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const value = input as { machineId?: unknown; additionalHours?: unknown };
        if (typeof value.machineId !== 'string' || typeof value.additionalHours !== 'number' || value.additionalHours <= 0 || value.additionalHours > 24) {
          throw new Error('La máquina y una lectura entre 0,1 y 24 horas son obligatorias.');
        }
        const machineId = value.machineId;
        const additionalHours = value.additionalHours;
        const machine = machines.find((item) => item.id === machineId);
        if (!machine) throw new Error('La máquina indicada no existe.');
        setMachines((current) => current.map((item) => {
          if (item.id !== machineId) return item;
          const hours = item.hours + additionalHours;
          return { ...item, hours, status: calculateMachineStatus(hours, item.lastServiceHours, item.maintenanceInterval) };
        }));
        setMeterReadings((current) => [{
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `reading-${Date.now()}`,
          machineId,
          previousHours: machine.hours,
          currentHours: machine.hours + additionalHours,
          addedHours: additionalHours,
          recordedAt: new Date().toISOString(),
          responsible: 'Registro mediante Mantis IA',
          source: 'Actualización solicitada mediante herramienta local',
          note: 'Pendiente de confirmación contra el horómetro físico.',
          dataStatus: 'Pendiente de validación',
        }, ...current]);
        setSelectedId(machineId);
        setNotice(`Lectura registrada: +${additionalHours} h en ${machineId}`);
        window.setTimeout(() => setNotice(null), 2600);
        return { machineId, previousHours: machine.hours, currentHours: machine.hours + additionalHours };
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    return () => lifecycle.abort();
  }, [machines]);

  function saveMeterReading(reading: MeterReading) {
    setMachines((current) => current.map((machine) => machine.id === reading.machineId
      ? {
          ...machine,
          hours: reading.currentHours,
          status: calculateMachineStatus(reading.currentHours, machine.lastServiceHours, machine.maintenanceInterval),
        }
      : machine));
    setMeterReadings((current) => [reading, ...current]);
    setReadingDialogOpen(false);
    setNotice(reading.addedHours > 0
      ? `Lectura guardada: +${formatHours(reading.addedHours)} h en ${reading.machineId}`
      : `Lectura de ${reading.machineId} confirmada sin aumento`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function saveMaintenanceRecord(record: MaintenanceRecord) {
    setMachines((current) => current.map((machine) => {
      if (machine.id !== record.machineId || !record.resetsPreventivePlan) return machine;
      return {
        ...machine,
        lastServiceHours: record.serviceHours,
        lastService: formatMaintenanceDay(record.performedAt),
        status: calculateMachineStatus(machine.hours, record.serviceHours, machine.maintenanceInterval),
      };
    }));
    setMaintenanceRecords((current) => [record, ...current]);
    setMaintenanceDialogOpen(false);
    setNotice(record.resetsPreventivePlan
      ? `Mantenimiento guardado y ciclo preventivo actualizado en ${record.machineId}`
      : `Mantenimiento guardado sin modificar el ciclo de ${record.machineId}`);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function openEditor(mode: 'create' | 'edit') {
    setEditorMode(mode);
    setAssetProfileOpen(false);
    setEditorOpen(true);
  }

  function saveMachine(machine: Machine) {
    setMachines((current) => editorMode === 'create'
      ? [...current, machine]
      : current.map((item) => item.id === selected.id ? machine : item));
    setSelectedId(machine.id);
    setActiveView('machines');
    setEditorOpen(false);
    setNotice(editorMode === 'create' ? `${machine.id} se registró correctamente` : `Cambios guardados en ${machine.id}`);
    window.setTimeout(() => setNotice(null), 2800);
  }

  function saveMaintenanceCase(maintenanceCase: MaintenanceCase) {
    setMaintenanceCases((current) => [maintenanceCase, ...current]);
    setCaseWorkspaceOpen(false);
    setNotice(`${maintenanceCase.id} guardado como ${maintenanceCase.reviewStatus.toLowerCase()}`);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function askAssistant(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!prompt.trim()) return;
    const normalizedPrompt = prompt.trim().toLocaleLowerCase('es');
    const serviceDelta = getNextServiceAt(selected) - selected.hours;

    if (normalizedPrompt.includes('historial')) {
      const latestMaintenance = selectedMaintenanceRecords[0];
      const latestReading = selectedReadings[0];
      setAssistantReply(`El historial local de ${selected.name} contiene ${selectedMaintenanceRecords.length} mantenimiento${selectedMaintenanceRecords.length === 1 ? '' : 's'} y ${selectedReadings.length} lectura${selectedReadings.length === 1 ? '' : 's'} de horómetro.${latestMaintenance ? ` La última intervención registrada fue “${latestMaintenance.completedTask}”.` : ' Todavía no hay una intervención ejecutada.'}${latestReading ? ` La lectura más reciente dejó el horómetro en ${formatHours(latestReading.currentHours)} h.` : ' Todavía no existe una lectura trazable.'}`);
      setAssistantSource('Historial local del activo');
    } else if (normalizedPrompt.includes('inspeccion')) {
      setAssistantReply(`Empieza verificando la tarea registrada: “${selected.nextTask}”. Confirma el horómetro físico, revisa la fuente del plan y documenta cualquier hallazgo antes de intervenir. ${selected.performanceStandard ? `El estándar cargado es: ${selected.performanceStandard}` : 'El estándar de desempeño sigue pendiente, por lo que esta orientación no debe tomarse como un procedimiento aprobado.'}`);
      setAssistantSource('Plan preventivo y ficha del activo');
    } else {
      setAssistantReply(serviceDelta <= 0
        ? `${selected.name} superó el punto programado de servicio en ${formatHours(Math.abs(serviceDelta))} h. La prioridad proviene únicamente del horómetro y del intervalo cargado; conviene verificar ambos datos y la evidencia antes de autorizar una nueva jornada.`
        : `${selected.name} tiene ${formatHours(serviceDelta)} h restantes antes del próximo servicio programado. Esta alerta se calcula con el horómetro actual, las horas del último servicio y el intervalo preventivo registrado.`);
      setAssistantSource('Contador e intervalo preventivo');
    }
    setPrompt('');
  }

  function renderMachineRows(items: Machine[]) {
    if (items.length === 0) {
      return <div className="machine-empty"><Search /><strong>No encontramos máquinas</strong><span>Prueba con otra búsqueda o cambia el filtro seleccionado.</span></div>;
    }

    return items.map((machine) => {
      const difference = getNextServiceAt(machine) - machine.hours;
      return (
        <button key={machine.id} data-status={machine.status} className={`machine-row ${selected.id === machine.id ? 'selected' : ''}`} aria-current={selected.id === machine.id ? 'true' : undefined} onClick={() => setSelectedId(machine.id)}>
          <span className="machine-identity"><i><Activity /></i><span><strong>{machine.name}</strong><small>{machine.id} · {machine.location}</small></span></span>
          <span><Badge className={`status-badge ${statusStyles[machine.status]}`}>{machine.status}</Badge></span>
          <span className="mono-value">{formatHours(machine.hours)} h</span>
          <span className={difference < 0 ? 'due-critical' : 'due-value'}>{difference < 0 ? `${Math.abs(difference)} h vencidas` : `en ${difference} h`}</span>
          <span className="condition-cell" aria-label={`Indicador visual demostrativo: ${machine.health} de 100; fórmula pendiente de validación`}><strong>{machine.health}/100</strong><i aria-hidden="true"><b style={{ width: `${machine.health}%` }} /></i></span>
          <span className="row-arrow"><ChevronRight /></span>
        </button>
      );
    });
  }

  const selectedNextServiceAt = getNextServiceAt(selected);
  const selectedServiceDelta = selectedNextServiceAt - selected.hours;
  const selectedServiceIsDue = selectedServiceDelta <= 0;

  const machineDetailColumn = (
    <aside className="detail-column">
      <article className={`machine-detail ${selectedServiceIsDue ? 'machine-detail-overdue' : ''}`}>
        <div className="detail-head"><div className="asset-code"><ScanLine /></div><div><p>{selected.id}</p><h3>{selected.name}</h3><span>{selected.manufacturer || selected.model ? `${selected.manufacturer}${selected.manufacturer && selected.model ? ' · ' : ''}${selected.model}` : selected.type}</span></div><button aria-label="Abrir ficha completa" onClick={() => setAssetProfileOpen(true)}><ArrowUpRight /></button></div>
        <div className="detail-score detail-score-demo"><div className="score-ring" style={{ '--score': `${selected.health}%` } as React.CSSProperties}><span>{selected.health}</span></div><div><p>INDICADOR VISUAL · DEMO</p><strong>{selected.health}/100 · No validado</strong><span>Fórmula pendiente; no determina la prioridad.</span></div></div>
        <div className={`service-state-banner ${selectedServiceIsDue ? 'overdue' : 'upcoming'}`}>{selectedServiceIsDue ? <AlertTriangle /> : <Clock3 />}<div><span>{selectedServiceDelta < 0 ? 'MANTENIMIENTO VENCIDO' : selectedServiceDelta === 0 ? 'MANTENIMIENTO REQUERIDO' : 'SERVICIO PROGRAMADO'}</span><strong>{selectedServiceDelta < 0 ? `${formatHours(Math.abs(selectedServiceDelta))} h vencidas` : selectedServiceDelta === 0 ? 'Debe realizarse ahora' : `${formatHours(selectedServiceDelta)} h restantes`}</strong><small>{selectedServiceIsDue ? `Venció a las ${formatHours(selectedNextServiceAt)} h` : `Programado a las ${formatHours(selectedNextServiceAt)} h`}</small></div></div>
        <div className="detail-stats detail-stats-four"><div><span>HORAS ACTUALES</span><strong>{formatHours(selected.hours)} h</strong></div><div><span>ÚLTIMO SERVICIO</span><strong>{formatHours(selected.lastServiceHours)} h</strong></div><div><span>INTERVALO</span><strong>{formatHours(selected.maintenanceInterval)} h</strong></div><div className={selectedServiceIsDue ? 'service-deadline-expired' : ''}><span>{selectedServiceIsDue ? 'VENCIÓ A LAS' : 'PRÓXIMO SERVICIO'}</span><strong>{formatHours(selectedNextServiceAt)} h</strong></div></div>
        <div className="next-task"><div className="task-heading"><span>{selectedServiceIsDue ? 'TAREA PENDIENTE' : 'PRÓXIMA TAREA'}</span><Badge variant="outline">Preventivo</Badge></div><strong>{selected.nextTask}</strong><p>{selectedServiceDelta < 0 ? `Debió ejecutarse a las ${formatHours(selectedNextServiceAt)} h y acumula ${formatHours(Math.abs(selectedServiceDelta))} h de retraso.` : selectedServiceDelta === 0 ? `Debe ejecutarse ahora, al alcanzar las ${formatHours(selectedNextServiceAt)} h.` : `Programada para las ${formatHours(selectedNextServiceAt)} h. Último servicio: ${selected.lastService}.`}</p><div className="task-progress"><span style={{ width: `${getServiceProgress(selected)}%` }} /></div></div>
        <div className="detail-actions detail-actions-four"><Button onClick={() => setReadingDialogOpen(true)}><Plus data-icon="inline-start" /> Lectura</Button><Button className="maintenance-record-action" onClick={() => setMaintenanceDialogOpen(true)}><Wrench data-icon="inline-start" /> Servicio</Button><Button variant="outline" onClick={() => openEditor('edit')}><Pencil data-icon="inline-start" /> Editar</Button><Button variant="outline" onClick={() => setCaseWorkspaceOpen(true)}><ClipboardCheck data-icon="inline-start" /> Caso RCM</Button></div>
      </article>
      <article className="activity-card">
        <div className="section-head compact"><div><h3>Actividad reciente</h3><p>Trazabilidad de esta máquina</p></div><button onClick={() => setAssetProfileOpen(true)}>Abrir ficha</button></div>
        {selectedActivityItems.map((item) => <div className="activity-item" key={`${item.kind}-${item.id}`}><span className={`activity-dot ${item.kind === 'maintenance' ? 'success' : item.kind === 'rcm' ? 'violet' : 'warning'}`}>{item.kind === 'maintenance' ? <Wrench /> : item.kind === 'rcm' ? <ClipboardCheck /> : <Clock3 />}</span><div><strong>{item.title}</strong><p>{item.detail} · {item.kind === 'maintenance' ? formatMaintenanceDate(item.at) : item.kind === 'reading' ? formatReadingDate(item.at) : formatMaintenanceDate(item.at)}</p></div></div>)}
        {selectedActivityItems.length === 0 && <div className="activity-empty"><Clock3 /><strong>Sin actividad registrada</strong><span>Las lecturas, intervenciones y casos RCM de esta máquina aparecerán aquí.</span></div>}
      </article>
    </aside>
  );

  return (
    <main className="mantis-shell">
      <aside className={`side-rail ${mobileNavOpen ? 'side-rail-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>M</span></div>
          <div><p>Mantis</p><span>Gestión visual de mantenimiento</span></div>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          <p className="nav-caption">OPERACIÓN</p>
          {navItems.map(({ label, icon: Icon, id }) => (
            <button
              key={label}
              className={id && activeView === id ? 'nav-item active' : 'nav-item'}
              aria-current={id && activeView === id ? 'page' : undefined}
              onClick={() => {
                if (id) setActiveView(id);
                if (label === 'Mantenimiento') {
                  setActiveView('machines');
                  setMaintenanceDialogOpen(true);
                }
                if (label === 'Historial') {
                  setActiveView('machines');
                  setAssetProfileOpen(true);
                }
                setMobileNavOpen(false);
              }}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {label === 'Mantenimiento' && <strong>{overdueCount + warningCount}</strong>}
            </button>
          ))}
          <p className="nav-caption nav-caption-secondary">SISTEMA</p>
          {AI_FEATURES_ENABLED && <button className="nav-item" onClick={() => setAssistantOpen(true)}>
            <Bot aria-hidden="true" /><span>Agente IA</span><Sparkles className="nav-spark" aria-hidden="true" />
          </button>}
          <button hidden data-future-feature="settings" className="nav-item"><Settings aria-hidden="true" /><span>Configuración</span></button>
        </nav>

        <div className="rail-foot" title="Indica que la interfaz de demostración está disponible; no representa monitoreo de las máquinas.">
          <div className="system-pulse"><span /> Prototipo activo</div>
          <p>Demo científica · v0.1</p>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileNavOpen(false)} />}

      <section className="workspace">
        <header className="top-bar">
          <div className="top-heading">
            <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Abrir navegación" onClick={() => setMobileNavOpen((open) => !open)}><Menu /></Button>
            <div><p>Laboratorio Piloto <ChevronRight aria-hidden="true" /> {activeView === 'overview' ? 'Vista general' : 'Máquinas'}</p><div className="top-title-line"><h1>{activeView === 'overview' ? 'Estado operativo' : 'Inventario de activos'}</h1><span>{activeView === 'overview' ? 'Monitorea, anticipa y mantén tus activos en funcionamiento.' : 'Registra, consulta y valida la información técnica de cada máquina.'}</span></div></div>
          </div>
          <div className="top-actions">
            <Button hidden data-future-feature="notifications" variant="ghost" size="icon" className="icon-button" aria-label="Notificaciones"><Bell /><span className="notification-dot" /></Button>
            {activeView === 'overview' && <Button className="primary-action" onClick={() => openEditor('create')}><Plus data-icon="inline-start" /> Registrar activo</Button>}
            <div className="profile-chip" aria-label="Sesión de demostración"><span>GC</span><div><strong>Gabo</strong><small>Modo demostración</small></div></div>
          </div>
        </header>

        <div className={`content-wrap ${activeView === 'machines' ? 'inventory-content' : ''}`}>
          {activeView === 'overview' ? (
            <>
              <section className="visual-hero">
                <div className="visual-hero-copy">
                  <Badge className="hero-status"><Sparkles /> PROTOTIPO ACTIVO</Badge>
                  <h2>El mantenimiento que necesita<br />tu <em>atención.</em></h2>
                  <p>Datos demostrativos para validar el flujo antes de trabajar con información real del laboratorio.</p>
                  <div className="hero-actions">{AI_FEATURES_ENABLED && <Button className="assistant-button" onClick={() => setAssistantOpen(true)}><Sparkles data-icon="inline-start" /> Consultar a Mantis IA</Button>}<Button variant="ghost" className="hero-case-button" onClick={() => setCaseWorkspaceOpen(true)}><ClipboardCheck data-icon="inline-start" /> Nuevo caso RCM</Button></div>
                </div>
                {AI_FEATURES_ENABLED && <div className="live-insight">
                  <div className="live-insight-icon"><Radio /></div>
                  <div><strong>Análisis de demostración</strong><span>La IA explica; el técnico decide.</span></div>
                  <i aria-label="Sistema disponible" />
                </div>}
                <div className="hero-scanline" aria-hidden="true" />
              </section>

              <section className="priority-showcase" aria-labelledby="priority-showcase-title">
                <div className="priority-showcase-head">
                  <div><span>FOCO OPERATIVO</span><h3 id="priority-showcase-title">Prioridades inmediatas</h3><p>Los tres activos que requieren atención primero, ordenados por urgencia.</p></div>
                  <Button variant="ghost" className="section-head-action" onClick={() => setActiveView('machines')}>Ver inventario <ChevronRight data-icon="inline-end" /></Button>
                </div>
                <div className="priority-card-stack">
                  {priorityMachines.map((machine, index) => (
                    <article className={`priority-panel priority-machine-card priority-tone-${index + 1}`} key={machine.id}>
                      <div className="priority-copy">
                        <div className="priority-label"><span /> {machine.status === 'Vencida' ? 'PRIORIDAD CRÍTICA' : 'ATENCIÓN PRÓXIMA'}</div>
                        <h3>{machine.name}</h3><p>{machine.id} · {machine.location}</p>
                        <div className="priority-reason"><AlertTriangle aria-hidden="true" /><div><strong>{machine.status === 'Vencida' ? `Mantenimiento vencido por ${machine.hours - getNextServiceAt(machine)} horas` : `Próximo servicio en ${getNextServiceAt(machine) - machine.hours} horas`}</strong><span>{machine.nextTask}</span></div></div>
                        <div className="priority-actions">
                          {AI_FEATURES_ENABLED && <Button className="light-action" onClick={() => { setSelectedId(machine.id); setAssistantOpen(true); }}>Analizar con IA <Sparkles data-icon="inline-end" /></Button>}
                          <Button variant="ghost" className="transparent-action" onClick={() => { setSelectedId(machine.id); setActiveView('machines'); }}>Ver en Máquinas <ChevronRight data-icon="inline-end" /></Button>
                        </div>
                      </div>
                      <div className="health-orbit" style={{ '--health': `${machine.health}%` } as React.CSSProperties}><div><strong>{machine.health}</strong><span>Indicador demo</span><small>No define prioridad</small></div><i className="orbit-dot" /></div>
                      <div className="technical-grid" aria-hidden="true" />
                      <div className="priority-image-glow" aria-hidden="true" />
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="inventory-intro">
                <div className="inventory-heading">
                  <Badge><Gauge /> INVENTARIO TÉCNICO</Badge>
                  <h2>Máquinas</h2>
                  <p>Consulta los activos del laboratorio, revisa su condición y conserva la trazabilidad de sus datos.</p>
                </div>
                <div className="validation-legend">
                  <div className="validation-legend-icon"><ShieldCheck /></div>
                  <div><strong>Control de validez experimental</strong><span><b>Demostrativo:</b> solo prueba · <b>Pendiente:</b> requiere experimento o revisión experta · <b>Validado:</b> cuenta con fuente y revisión.</span></div>
                </div>
              </section>

              <section className="metric-grid inventory-metrics" aria-label="Resumen y filtros del inventario">
                <button className="metric-card metric-violet" aria-pressed={filter === 'Todas'} onClick={() => setFilter('Todas')}><div className="metric-icon neutral"><Gauge /></div><div className="metric-copy"><p>Máquinas registradas</p><strong>{machines.length}</strong><span>mostrar inventario total</span></div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></button>
                <button className="metric-card metric-amber" aria-pressed={filter === 'Atención próxima'} onClick={() => setFilter('Atención próxima')}><div className="metric-icon warning"><Clock3 /></div><div className="metric-copy"><p>Atención próxima</p><strong>{warningCount}</strong><span>filtrar por horas de uso</span></div><div className="mini-trend" aria-hidden="true"><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></button>
                <button className="metric-card metric-coral critical-card" aria-pressed={filter === 'Vencida'} onClick={() => setFilter('Vencida')}><div className="metric-icon critical"><AlertTriangle /></div><div className="metric-copy"><p>Mantenimiento vencido</p><strong>{overdueCount}</strong><span>mostrar activos prioritarios</span></div><div className="mini-bars coral" aria-hidden="true"><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></button>
                <button className="metric-card metric-mint" aria-pressed={filter === 'Validados'} onClick={() => setFilter('Validados')}><div className="metric-icon success"><ShieldCheck /></div><div className="metric-copy"><p>Activos validados</p><strong>{validatedCount}/{machines.length}</strong><span>filtrar con fuente y revisión</span></div><div className="metric-mini-ring" style={{ '--validation-progress': `${validatedPercent}%` } as React.CSSProperties}><span>{validatedPercent}%</span></div><ArrowUpRight className="metric-arrow" /></button>
              </section>

              <section className="inventory-layout">
                <article className="machine-panel inventory-panel">
                  <div className="section-head inventory-section-head">
                    <div><h3>Inventario completo</h3><p>{filteredMachines.length} de {machines.length} activos visibles</p></div>
                    <div className="inventory-controls">
                      <div className="search-shell inventory-search"><Search aria-hidden="true" /><input ref={searchInputRef} aria-label="Buscar en el inventario de máquinas" placeholder="Buscar máquina, código, modelo o serie..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><kbd>Ctrl K</kbd></div>
                      <div className="filter-pills" aria-label="Filtrar máquinas">
                        {(['Todas', 'Operativa', 'Atención próxima', 'Vencida', 'Validados'] as const).map((item) => (
                          <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === 'Todas' ? 'Todas' : item === 'Operativa' ? 'Operativas' : item}</button>
                        ))}
                      </div>
                      <Button className="inventory-register" onClick={() => openEditor('create')}><Plus data-icon="inline-start" /> Registrar activo</Button>
                    </div>
                  </div>
                  <div className="machine-table" aria-label="Inventario de máquinas">
                    <div className="machine-row table-head"><span>MÁQUINA</span><span>ESTADO</span><span>HORAS</span><span>PRÓXIMO SERVICIO</span><span>INDICADOR DEMO</span><span /></div>
                    {renderMachineRows(filteredMachines)}
                  </div>
                </article>
                {machineDetailColumn}
              </section>
            </>
          )}
        </div>
      </section>

      {notice && <div className="notice-toast"><CheckCircle2 /> {notice}</div>}

      {caseWorkspaceOpen && <MaintenanceCaseWorkspace machines={machines} onClose={() => setCaseWorkspaceOpen(false)} onSave={saveMaintenanceCase} />}

      <MachineProfileSheet
        machine={selected}
        readings={selectedReadings}
        maintenanceRecords={selectedMaintenanceRecords}
        open={assetProfileOpen}
        onOpenChange={setAssetProfileOpen}
        assistantEnabled={AI_FEATURES_ENABLED}
        onAskAssistant={() => {
          setAssetProfileOpen(false);
          setAssistantOpen(true);
        }}
        onEdit={() => openEditor('edit')}
      />

      {readingDialogOpen && (
        <MeterReadingDialog
          machine={selected}
          open
          onOpenChange={setReadingDialogOpen}
          onSave={saveMeterReading}
        />
      )}

      {maintenanceDialogOpen && (
        <MaintenanceRecordDialog
          machine={selected}
          open
          onOpenChange={setMaintenanceDialogOpen}
          onSave={saveMaintenanceRecord}
        />
      )}

      {editorOpen && (
        <MachineEditorSheet
          open
          mode={editorMode}
          machine={editorMode === 'edit' ? selected : undefined}
          existingIds={machines.map((machine) => machine.id)}
          onOpenChange={setEditorOpen}
          onSave={saveMachine}
        />
      )}

      {AI_FEATURES_ENABLED && <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
        <SheetContent className="assistant-sheet sm:max-w-[520px]" showCloseButton>
          <SheetHeader className="assistant-head"><div className="assistant-avatar"><Bot /></div><div><div className="assistant-title-row"><SheetTitle>Mantis IA</SheetTitle><Badge className="demo-badge">MODO DEMO</Badge></div><SheetDescription>Asistente de mantenimiento con respuestas trazables.</SheetDescription></div></SheetHeader>
          <div className="assistant-context"><span>CONTEXTO ACTIVO</span><div><Activity /><strong>{selected.name}</strong><small>{selected.id} · {formatHours(selected.hours)} h</small></div></div>
          <div className="assistant-thread">
            <div className="assistant-welcome"><Sparkles /><h3>¿Qué necesitas entender?</h3><p>Puedo explicar alertas, resumir historiales y guiar registros usando los datos disponibles.</p></div>
            {!assistantReply && <div className="suggestion-grid"><button onClick={() => setPrompt('¿Por qué esta máquina requiere atención?')}>¿Por qué requiere atención?</button><button onClick={() => setPrompt('¿Qué debo inspeccionar primero?')}>¿Qué inspecciono primero?</button><button onClick={() => setPrompt('Resume el historial reciente')}>Resumir historial</button></div>}
            {assistantReply && <div className="assistant-response"><div className="response-icon"><Bot /></div><div><p>{assistantReply}</p><div className="source-chip"><FileText /> Fuente: {assistantSource} · {selected.id}</div><div className="assistant-response-actions"><Button onClick={() => { setAssistantOpen(false); setMaintenanceDialogOpen(true); }}><Wrench data-icon="inline-start" /> Registrar servicio</Button><Button variant="outline" onClick={() => { setAssistantOpen(false); setCaseWorkspaceOpen(true); }}><ClipboardCheck data-icon="inline-start" /> Abrir caso RCM</Button></div></div></div>}
          </div>
          <form className="assistant-composer" onSubmit={askAssistant}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Pregúntale sobre esta máquina..." aria-label="Pregunta para Mantis IA" /><div><span><ShieldCheck /> Las acciones requieren confirmación</span><Button type="submit" size="icon" aria-label="Enviar pregunta"><Send /></Button></div></form>
        </SheetContent>
      </Sheet>}
    </main>
  );
}
