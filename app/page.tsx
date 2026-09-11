'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Bot, CheckCircle2, ClipboardCheck,
  ChevronRight, Clock3, FileText, Gauge, History,
  LayoutDashboard, Menu, Pencil, Plus, Radio, ScanLine, Search, Send, Settings,
  ShieldCheck, Sparkles, Wrench,
} from 'lucide-react';

import { MachineEditorSheet } from '@/components/machine-editor-sheet';
import { MaintenanceCaseWorkspace } from '@/components/maintenance-case-workspace';
import { MachineProfileSheet } from '@/components/machine-profile-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  calculateMachineStatus,
  formatHours,
  initialMachines,
  statusStyles,
  type Machine,
  type MachineStatus,
} from '@/lib/machines';
import type { MaintenanceCase } from '@/lib/maintenance-cases';

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
  { label: 'Documentos', icon: FileText },
];

const MACHINES_STORAGE_KEY = 'mantis-ia-assets-v1';
const CASES_STORAGE_KEY = 'mantis-ia-rcm-cases-v1';
const LEGACY_PENDING_STANDARD = 'Pendiente de validación con el experto de mantenimiento.';

export default function Home() {
  const [machines, setMachines] = useState(initialMachines);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedId, setSelectedId] = useState('COMP-01');
  const [filter, setFilter] = useState<'Todas' | MachineStatus>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assetProfileOpen, setAssetProfileOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [storageReady, setStorageReady] = useState(false);
  const [maintenanceCases, setMaintenanceCases] = useState<MaintenanceCase[]>([]);
  const [casesReady, setCasesReady] = useState(false);
  const [caseWorkspaceOpen, setCaseWorkspaceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = machines.find((machine) => machine.id === selectedId) ?? machines[0];
  const filteredMachines = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    return machines.filter((machine) => {
      const matchesStatus = filter === 'Todas' || machine.status === filter;
      const searchableText = `${machine.id} ${machine.name} ${machine.type} ${machine.location}`.toLocaleLowerCase('es');
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [filter, machines, searchQuery]);
  const overdueCount = machines.filter((machine) => machine.status === 'Vencida').length;
  const warningCount = machines.filter((machine) => machine.status === 'Atención próxima').length;
  const priorityMachines = useMemo(() => [...machines]
    .sort((a, b) => {
      const rank: Record<MachineStatus, number> = { Vencida: 0, 'Atención próxima': 1, Operativa: 2 };
      return rank[a.status] - rank[b.status] || (a.dueAt - a.hours) - (b.dueAt - b.hours);
    })
    .slice(0, 3), [machines]);

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(MACHINES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Machine[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMachines(parsed.map((machine) => ({
              ...machine,
              performanceStandard: machine.performanceStandard === LEGACY_PENDING_STANDARD ? '' : machine.performanceStandard,
            })));
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
          const parsed = JSON.parse(saved) as MaintenanceCase[];
          if (Array.isArray(parsed)) setMaintenanceCases(parsed);
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
          .map((machine) => ({ id: machine.id, name: machine.name, status: machine.status, hours: machine.hours, dueAt: machine.dueAt })),
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
          return { ...item, hours, status: calculateMachineStatus(hours, item.dueAt) };
        }));
        setSelectedId(machineId);
        setNotice(`Lectura registrada: +${additionalHours} h en ${machineId}`);
        window.setTimeout(() => setNotice(null), 2600);
        return { machineId, previousHours: machine.hours, currentHours: machine.hours + additionalHours };
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    return () => lifecycle.abort();
  }, [machines]);

  function registerReading() {
    setMachines((current) => current.map((machine) => {
      if (machine.id !== selected.id) return machine;
      const hours = machine.hours + 8;
      return { ...machine, hours, status: calculateMachineStatus(hours, machine.dueAt) };
    }));
    setNotice(`Lectura registrada: +8 h en ${selected.id}`);
    window.setTimeout(() => setNotice(null), 2600);
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
    setTaskCreated(false);
    setAssistantReply(`${selected.name} superó su intervalo preventivo en ${Math.max(selected.hours - selected.dueAt, 0)} h. Recomiendo revisar primero el nivel de aceite, el filtro y el registro de temperatura antes de autorizar una nueva jornada.`);
    setPrompt('');
  }

  function renderMachineRows(items: Machine[]) {
    if (items.length === 0) {
      return <div className="machine-empty"><Search /><strong>No encontramos máquinas</strong><span>Prueba con otra búsqueda o cambia el filtro seleccionado.</span></div>;
    }

    return items.map((machine) => {
      const difference = machine.dueAt - machine.hours;
      return (
        <button key={machine.id} className={`machine-row ${selected.id === machine.id ? 'selected' : ''}`} onClick={() => setSelectedId(machine.id)}>
          <span className="machine-identity"><i><Activity /></i><span><strong>{machine.name}</strong><small>{machine.id} · {machine.location}</small></span></span>
          <span><Badge className={`status-badge ${statusStyles[machine.status]}`}>{machine.status}</Badge></span>
          <span className="mono-value">{formatHours(machine.hours)} h</span>
          <span className={difference < 0 ? 'due-critical' : 'due-value'}>{difference < 0 ? `${Math.abs(difference)} h vencidas` : `en ${difference} h`}</span>
          <span className="condition-cell"><strong>{machine.health}%</strong><i aria-hidden="true"><b style={{ width: `${machine.health}%` }} /></i></span>
          <span className="row-arrow"><ChevronRight /></span>
        </button>
      );
    });
  }

  const machineDetailColumn = (
    <aside className="detail-column">
      <article className="machine-detail">
        <div className="detail-head"><div className="asset-code"><ScanLine /></div><div><p>{selected.id}</p><h3>{selected.name}</h3><span>{selected.type}</span></div><button aria-label="Abrir ficha completa" onClick={() => setAssetProfileOpen(true)}><ArrowUpRight /></button></div>
        <div className="detail-score"><div className="score-ring" style={{ '--score': `${selected.health}%` } as React.CSSProperties}><span>{selected.health}</span></div><div><p>Índice de condición</p><strong>{selected.health < 70 ? 'Requiere atención' : selected.health < 86 ? 'Condición vigilada' : 'Condición estable'}</strong><span>Calculado con reglas del plan</span></div></div>
        <div className="detail-stats"><div><span>HORAS ACTUALES</span><strong>{formatHours(selected.hours)} h</strong></div><div><span>PRÓXIMO SERVICIO</span><strong>{formatHours(selected.dueAt)} h</strong></div><div><span>ÚLTIMO SERVICIO</span><strong>{selected.lastService}</strong></div></div>
        <div className="next-task"><div className="task-heading"><span>PRÓXIMA TAREA</span><Badge variant="outline">Preventivo</Badge></div><strong>{selected.nextTask}</strong><p>Basado en el plan preventivo registrado para esta máquina.</p><div className="task-progress"><span style={{ width: `${Math.min((selected.hours / selected.dueAt) * 100, 100)}%` }} /></div></div>
        <div className="detail-actions"><Button onClick={registerReading}><Plus data-icon="inline-start" /> Lectura</Button><Button variant="outline" onClick={() => openEditor('edit')}><Pencil data-icon="inline-start" /> Editar</Button><Button variant="outline" onClick={() => setCaseWorkspaceOpen(true)}><ClipboardCheck data-icon="inline-start" /> Caso RCM</Button></div>
      </article>
      <article className="activity-card">
        <div className="section-head compact"><div><h3>Actividad reciente</h3><p>Trazabilidad del laboratorio</p></div><button>Ver todo</button></div>
        {maintenanceCases[0] ? <div className="activity-item"><span className="activity-dot violet"><ClipboardCheck /></span><div><strong>{maintenanceCases[0].title}</strong><p>{maintenanceCases[0].id} · {maintenanceCases[0].reviewStatus}</p></div></div> : <div className="activity-item"><span className="activity-dot success"><CheckCircle2 /></span><div><strong>Inspección completada</strong><p>Bomba centrífuga · hace 2 h</p></div></div>}
        <div className="activity-item"><span className="activity-dot warning"><Clock3 /></span><div><strong>Lectura actualizada</strong><p>Torno paralelo · ayer</p></div></div>
      </article>
    </aside>
  );

  return (
    <main className="mantis-shell">
      <aside className={`side-rail ${mobileNavOpen ? 'side-rail-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>M</span></div>
          <div><p>Mantis</p><span>Intelligence for maintenance</span></div>
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
                if (label === 'Mantenimiento') setCaseWorkspaceOpen(true);
                setMobileNavOpen(false);
              }}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {label === 'Mantenimiento' && <strong>{overdueCount + warningCount}</strong>}
            </button>
          ))}
          <p className="nav-caption nav-caption-secondary">SISTEMA</p>
          <button className="nav-item" onClick={() => setAssistantOpen(true)}>
            <Bot aria-hidden="true" /><span>Agente IA</span><Sparkles className="nav-spark" aria-hidden="true" />
          </button>
          <button className="nav-item"><Settings aria-hidden="true" /><span>Configuración</span></button>
        </nav>

        <div className="rail-foot">
          <div className="system-pulse"><span /> Sistema estable</div>
          <p>Demo científica · v0.1</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <div className="top-heading">
            <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Abrir navegación" onClick={() => setMobileNavOpen((open) => !open)}><Menu /></Button>
            <div><p>Laboratorio Piloto <ChevronRight aria-hidden="true" /> {activeView === 'overview' ? 'Vista general' : 'Máquinas'}</p><div className="top-title-line"><h1>{activeView === 'overview' ? 'Estado operativo' : 'Inventario de activos'}</h1><span>{activeView === 'overview' ? 'Monitorea, anticipa y mantén tus activos en funcionamiento.' : 'Registra, consulta y valida la información técnica de cada máquina.'}</span></div></div>
          </div>
          <div className="top-actions">
            <div className="search-shell"><Search aria-hidden="true" /><input aria-label="Buscar máquinas" placeholder="Buscar máquina..." value={searchQuery} onFocus={() => setActiveView('machines')} onChange={(event) => setSearchQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
            <Button variant="ghost" size="icon" className="icon-button" aria-label="Notificaciones"><Bell /><span className="notification-dot" /></Button>
            <Button className="primary-action" onClick={() => openEditor('create')}><Plus data-icon="inline-start" /> Registrar activo</Button>
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
                  <div className="hero-actions"><Button className="assistant-button" onClick={() => setAssistantOpen(true)}><Sparkles data-icon="inline-start" /> Consultar a Mantis IA</Button><Button variant="ghost" className="hero-case-button" onClick={() => setCaseWorkspaceOpen(true)}><ClipboardCheck data-icon="inline-start" /> Nuevo caso RCM</Button></div>
                </div>
                <div className="live-insight">
                  <div className="live-insight-icon"><Radio /></div>
                  <div><strong>Análisis de demostración</strong><span>La IA explica; el técnico decide.</span></div>
                  <i aria-label="Sistema disponible" />
                </div>
                <div className="hero-scanline" aria-hidden="true" />
              </section>

              <section className="metric-grid" aria-label="Resumen operativo">
                <article className="metric-card metric-violet"><div className="metric-icon neutral"><Gauge /></div><div className="metric-copy"><p>Máquinas registradas</p><strong>{machines.length}</strong><span>inventario total</span></div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></article>
                <article className="metric-card metric-amber"><div className="metric-icon warning"><Clock3 /></div><div className="metric-copy"><p>Atención próxima</p><strong>{warningCount}</strong><span>por horas de uso</span></div><div className="mini-trend" aria-hidden="true"><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></article>
                <article className="metric-card metric-coral critical-card"><div className="metric-icon critical"><AlertTriangle /></div><div className="metric-copy"><p>Mantenimiento vencido</p><strong>{overdueCount}</strong><span>requiere prioridad</span></div><div className="mini-bars coral" aria-hidden="true"><i /><i /><i /><i /><i /></div><ArrowUpRight className="metric-arrow" /></article>
                <article className="metric-card metric-mint"><div className="metric-icon success"><ShieldCheck /></div><div className="metric-copy"><p>Cumplimiento del plan</p><strong>87%</strong><span>dato demostrativo</span></div><div className="metric-mini-ring"><span>87</span></div><ArrowUpRight className="metric-arrow" /></article>
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
                        <div className="priority-reason"><AlertTriangle aria-hidden="true" /><div><strong>{machine.status === 'Vencida' ? `Mantenimiento vencido por ${machine.hours - machine.dueAt} horas` : `Próximo servicio en ${machine.dueAt - machine.hours} horas`}</strong><span>{machine.nextTask}</span></div></div>
                        <div className="priority-actions">
                          <Button className="light-action" onClick={() => { setSelectedId(machine.id); setAssistantOpen(true); }}>Analizar con IA <Sparkles data-icon="inline-end" /></Button>
                          <Button variant="ghost" className="transparent-action" onClick={() => { setSelectedId(machine.id); setActiveView('machines'); }}>Ver en Máquinas <ChevronRight data-icon="inline-end" /></Button>
                        </div>
                      </div>
                      <div className="health-orbit" style={{ '--health': `${machine.health}%` } as React.CSSProperties}><div><strong>{machine.health}</strong><span>Salud estimada</span></div><i className="orbit-dot" /></div>
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

              <section className="inventory-layout">
                <article className="machine-panel inventory-panel">
                  <div className="section-head inventory-section-head">
                    <div><h3>Inventario completo</h3><p>{filteredMachines.length} de {machines.length} activos visibles</p></div>
                    <div className="inventory-controls">
                      <div className="filter-pills" aria-label="Filtrar máquinas">
                        {(['Todas', 'Operativa', 'Atención próxima', 'Vencida'] as const).map((item) => (
                          <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'Todas' ? 'Todas' : item === 'Operativa' ? 'Operativas' : item}</button>
                        ))}
                      </div>
                      <Button className="inventory-register" onClick={() => openEditor('create')}><Plus data-icon="inline-start" /> Registrar activo</Button>
                    </div>
                  </div>
                  <div className="machine-table" aria-label="Inventario de máquinas">
                    <div className="machine-row table-head"><span>MÁQUINA</span><span>ESTADO</span><span>HORAS</span><span>PRÓXIMO SERVICIO</span><span>CONDICIÓN</span><span /></div>
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
        open={assetProfileOpen}
        onOpenChange={setAssetProfileOpen}
        onAskAssistant={() => {
          setAssetProfileOpen(false);
          setAssistantOpen(true);
        }}
        onEdit={() => openEditor('edit')}
      />

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

      <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
        <SheetContent className="assistant-sheet sm:max-w-[520px]" showCloseButton>
          <SheetHeader className="assistant-head"><div className="assistant-avatar"><Bot /></div><div><div className="assistant-title-row"><SheetTitle>Mantis IA</SheetTitle><Badge className="demo-badge">MODO DEMO</Badge></div><SheetDescription>Asistente de mantenimiento con respuestas trazables.</SheetDescription></div></SheetHeader>
          <div className="assistant-context"><span>CONTEXTO ACTIVO</span><div><Activity /><strong>{selected.name}</strong><small>{selected.id} · {formatHours(selected.hours)} h</small></div></div>
          <div className="assistant-thread">
            <div className="assistant-welcome"><Sparkles /><h3>¿Qué necesitas entender?</h3><p>Puedo explicar alertas, revisar historiales y preparar tareas usando los datos registrados.</p></div>
            {!assistantReply && <div className="suggestion-grid"><button onClick={() => setPrompt('¿Por qué esta máquina requiere atención?')}>¿Por qué requiere atención?</button><button onClick={() => setPrompt('¿Qué debo inspeccionar primero?')}>¿Qué inspecciono primero?</button><button onClick={() => setPrompt('Resume el historial reciente')}>Resumir historial</button></div>}
            {assistantReply && <div className="assistant-response"><div className="response-icon"><Bot /></div><div><p>{assistantReply}</p><div className="source-chip"><FileText /> Fuente: plan preventivo registrado · {selected.id}</div>{!taskCreated ? <Button onClick={() => setTaskCreated(true)}><Wrench data-icon="inline-start" /> Crear tarea preventiva</Button> : <div className="task-success"><CheckCircle2 /> Tarea creada con confirmación</div>}</div></div>}
          </div>
          <form className="assistant-composer" onSubmit={askAssistant}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Pregúntale sobre esta máquina..." aria-label="Pregunta para Mantis IA" /><div><span><ShieldCheck /> Las acciones requieren confirmación</span><Button type="submit" size="icon" aria-label="Enviar pregunta"><Send /></Button></div></form>
        </SheetContent>
      </Sheet>
    </main>
  );
}
