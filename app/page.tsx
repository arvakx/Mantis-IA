'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Bot, CheckCircle2,
  ChevronRight, CircleDot, Clock3, FileText, Gauge, History,
  LayoutDashboard, Menu, Plus, ScanLine, Search, Send, Settings,
  ShieldCheck, Sparkles, Wrench, LogOut,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoginScreen, SESSION_KEY } from '@/components/login-screen';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

type MachineStatus = 'Operativa' | 'Atención próxima' | 'Vencida';

type Machine = {
  id: string;
  name: string;
  type: string;
  location: string;
  hours: number;
  dueAt: number;
  health: number;
  status: MachineStatus;
  lastService: string;
  nextTask: string;
};

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

const initialMachines: Machine[] = [
  { id: 'COMP-01', name: 'Compresor principal', type: 'Compresor de tornillo', location: 'Zona neumática', hours: 2547, dueAt: 2500, health: 62, status: 'Vencida', lastService: '14 jun 2026', nextTask: 'Cambio de aceite y revisión de filtro' },
  { id: 'TAL-02', name: 'Taladro de banco', type: 'Taladro de columna', location: 'Banco 02', hours: 1035, dueAt: 1100, health: 79, status: 'Atención próxima', lastService: '02 ago 2026', nextTask: 'Inspección de correa y portabrocas' },
  { id: 'TOR-03', name: 'Torno paralelo', type: 'Máquina herramienta', location: 'Celda de mecanizado', hours: 1870, dueAt: 2000, health: 84, status: 'Atención próxima', lastService: '26 jul 2026', nextTask: 'Lubricación y control de alineación' },
  { id: 'BOM-01', name: 'Bomba centrífuga', type: 'Equipo hidráulico', location: 'Banco hidráulico', hours: 724, dueAt: 1000, health: 94, status: 'Operativa', lastService: '18 ago 2026', nextTask: 'Revisión de sello y rodamientos' },
  { id: 'ESM-01', name: 'Esmeriladora', type: 'Equipo rotativo', location: 'Banco 04', hours: 390, dueAt: 500, health: 91, status: 'Operativa', lastService: '11 ago 2026', nextTask: 'Inspección de guarda y muela' },
];

const navItems = [
  { label: 'Vista general', icon: LayoutDashboard, active: true },
  { label: 'Máquinas', icon: Gauge },
  { label: 'Mantenimiento', icon: Wrench },
  { label: 'Historial', icon: History },
  { label: 'Documentos', icon: FileText },
];

const statusStyles: Record<MachineStatus, string> = {
  Operativa: 'status-ok',
  'Atención próxima': 'status-warning',
  Vencida: 'status-critical',
};

function formatHours(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

export default function Home() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userName, setUserName] = useState('Gabo');
  const [machines, setMachines] = useState(initialMachines);
  const [selectedId, setSelectedId] = useState('COMP-01');
  const [filter, setFilter] = useState<'Todas' | MachineStatus>('Todas');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = machines.find((machine) => machine.id === selectedId) ?? machines[0];
  const filteredMachines = useMemo(
    () => filter === 'Todas' ? machines : machines.filter((machine) => machine.status === filter),
    [filter, machines],
  );
  const overdueCount = machines.filter((machine) => machine.status === 'Vencida').length;
  const warningCount = machines.filter((machine) => machine.status === 'Atención próxima').length;

  useEffect(() => {
    const sessionTimer = window.setTimeout(() => {
      const savedSession = window.localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession) as { name?: string };
          setUserName(session.name?.trim() || 'Gabo');
          setAuthenticated(true);
        } catch {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
      setSessionChecked(true);
    }, 0);

    return () => window.clearTimeout(sessionTimer);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
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
        setMachines((current) => current.map((item) => item.id === machineId ? { ...item, hours: item.hours + additionalHours } : item));
        setSelectedId(machineId);
        setNotice(`Lectura registrada: +${additionalHours} h en ${machineId}`);
        window.setTimeout(() => setNotice(null), 2600);
        return { machineId, previousHours: machine.hours, currentHours: machine.hours + additionalHours };
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    return () => lifecycle.abort();
  }, [authenticated, machines]);

  function handleAuthenticated(name: string) {
    setUserName(name);
    setAuthenticated(true);
  }

  function logOut() {
    window.localStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setAssistantOpen(false);
    setMobileNavOpen(false);
  }

  function registerReading() {
    setMachines((current) => current.map((machine) => machine.id === selected.id ? { ...machine, hours: machine.hours + 8 } : machine));
    setNotice(`Lectura registrada: +8 h en ${selected.id}`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function askAssistant(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setTaskCreated(false);
    setAssistantReply(`${selected.name} superó su intervalo preventivo en ${Math.max(selected.hours - selected.dueAt, 0)} h. Recomiendo revisar primero el nivel de aceite, el filtro y el registro de temperatura antes de autorizar una nueva jornada.`);
    setPrompt('');
  }

  if (!sessionChecked) return <main className="session-loader" aria-label="Cargando Mantis IA"><div className="loader-mark">M</div></main>;
  if (!authenticated) return <LoginScreen onAuthenticated={handleAuthenticated} />;

  const initials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="mantis-shell">
      <aside className={`side-rail ${mobileNavOpen ? 'side-rail-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>M</span></div>
          <div><p>Mantis</p><span>Intelligence for maintenance</span></div>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          <p className="nav-caption">OPERACIÓN</p>
          {navItems.map(({ label, icon: Icon, active }) => (
            <button key={label} className={active ? 'nav-item active' : 'nav-item'}>
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
            <div><p>Laboratorio Piloto <ChevronRight aria-hidden="true" /> Vista general</p><h1>Estado operativo</h1></div>
          </div>
          <div className="top-actions">
            <div className="search-shell"><Search aria-hidden="true" /><input aria-label="Buscar máquinas" placeholder="Buscar máquina..." /><kbd>⌘ K</kbd></div>
            <Button variant="ghost" size="icon" className="icon-button" aria-label="Notificaciones"><Bell /><span className="notification-dot" /></Button>
            <Button className="primary-action" onClick={registerReading}><Plus data-icon="inline-start" /> Registrar lectura</Button>
            <button className="profile-chip" aria-label={`Cerrar sesión de ${userName}`} onClick={logOut}><span>{initials}</span><div><strong>{userName}</strong><small>Administrador</small></div><LogOut className="logout-icon" aria-hidden="true" /></button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-intro">
            <div>
              <p className="eyebrow"><CircleDot aria-hidden="true" /> MARTES, 8 DE SEPTIEMBRE</p>
              <h2>El mantenimiento que necesita tu atención.</h2>
              <p>Datos de demostración preparados para validar el flujo de la plataforma.</p>
            </div>
            <Button className="assistant-button" onClick={() => setAssistantOpen(true)}><Sparkles data-icon="inline-start" /> Consultar a Mantis IA</Button>
          </div>

          <section className="metric-grid" aria-label="Resumen operativo">
            <article className="metric-card"><div className="metric-icon neutral"><Gauge /></div><div><p>Máquinas registradas</p><strong>{machines.length}</strong><span>en 4 zonas</span></div><ArrowUpRight className="metric-arrow" /></article>
            <article className="metric-card"><div className="metric-icon warning"><Clock3 /></div><div><p>Atención próxima</p><strong>{warningCount}</strong><span>próximos 7 días</span></div><ArrowUpRight className="metric-arrow" /></article>
            <article className="metric-card critical-card"><div className="metric-icon critical"><AlertTriangle /></div><div><p>Mantenimiento vencido</p><strong>{overdueCount}</strong><span>requiere prioridad</span></div><ArrowUpRight className="metric-arrow" /></article>
            <article className="metric-card"><div className="metric-icon success"><ShieldCheck /></div><div><p>Cumplimiento del plan</p><strong>87%</strong><span>+6% este mes</span></div><ArrowUpRight className="metric-arrow" /></article>
          </section>

          <section className="operations-grid">
            <div className="main-column">
              <article className="priority-panel">
                <div className="priority-copy">
                  <div className="priority-label"><span /> PRIORIDAD CRÍTICA</div>
                  <h3>{machines[0].name}</h3><p>{machines[0].id} · {machines[0].location}</p>
                  <div className="priority-reason"><AlertTriangle aria-hidden="true" /><div><strong>Mantenimiento vencido por {machines[0].hours - machines[0].dueAt} horas</strong><span>{machines[0].nextTask}</span></div></div>
                  <div className="priority-actions">
                    <Button className="light-action" onClick={() => { setSelectedId('COMP-01'); setAssistantOpen(true); }}>Analizar con IA <Sparkles data-icon="inline-end" /></Button>
                    <Button variant="ghost" className="transparent-action" onClick={() => setSelectedId('COMP-01')}>Ver ficha <ChevronRight data-icon="inline-end" /></Button>
                  </div>
                </div>
                <div className="health-orbit" style={{ '--health': '62%' } as React.CSSProperties}><div><strong>62</strong><span>Salud estimada</span></div><i className="orbit-dot" /></div>
                <div className="technical-grid" aria-hidden="true" />
              </article>

              <article className="machine-panel">
                <div className="section-head">
                  <div><h3>Flota monitoreada</h3><p>Selecciona una máquina para revisar su condición.</p></div>
                  <div className="filter-pills" aria-label="Filtrar máquinas">
                    {(['Todas', 'Operativa', 'Atención próxima', 'Vencida'] as const).map((item) => (
                      <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'Todas' ? 'Todas' : item === 'Operativa' ? 'Operativas' : item}</button>
                    ))}
                  </div>
                </div>
                <div className="machine-table" aria-label="Máquinas monitoreadas">
                  <div className="machine-row table-head"><span>MÁQUINA</span><span>ESTADO</span><span>HORAS</span><span>PRÓXIMO SERVICIO</span><span /></div>
                  {filteredMachines.map((machine) => {
                    const difference = machine.dueAt - machine.hours;
                    return (
                      <button key={machine.id} className={`machine-row ${selected.id === machine.id ? 'selected' : ''}`} onClick={() => setSelectedId(machine.id)}>
                        <span className="machine-identity"><i><Activity /></i><span><strong>{machine.name}</strong><small>{machine.id} · {machine.location}</small></span></span>
                        <span><Badge className={`status-badge ${statusStyles[machine.status]}`}>{machine.status}</Badge></span>
                        <span className="mono-value">{formatHours(machine.hours)} h</span>
                        <span className={difference < 0 ? 'due-critical' : 'due-value'}>{difference < 0 ? `${Math.abs(difference)} h vencidas` : `en ${difference} h`}</span>
                        <span className="row-arrow"><ChevronRight /></span>
                      </button>
                    );
                  })}
                </div>
              </article>
            </div>

            <aside className="detail-column">
              <article className="machine-detail">
                <div className="detail-head"><div className="asset-code"><ScanLine /></div><div><p>{selected.id}</p><h3>{selected.name}</h3><span>{selected.type}</span></div><button aria-label="Abrir ficha completa"><ArrowUpRight /></button></div>
                <div className="detail-score"><div className="score-ring" style={{ '--score': `${selected.health}%` } as React.CSSProperties}><span>{selected.health}</span></div><div><p>Índice de condición</p><strong>{selected.health < 70 ? 'Requiere atención' : selected.health < 86 ? 'Condición vigilada' : 'Condición estable'}</strong><span>Calculado con reglas del plan</span></div></div>
                <div className="detail-stats"><div><span>HORAS ACTUALES</span><strong>{formatHours(selected.hours)} h</strong></div><div><span>INTERVALO</span><strong>{formatHours(selected.dueAt)} h</strong></div><div><span>ÚLTIMO SERVICIO</span><strong>{selected.lastService}</strong></div></div>
                <div className="next-task"><div className="task-heading"><span>PRÓXIMA TAREA</span><Badge variant="outline">Preventivo</Badge></div><strong>{selected.nextTask}</strong><p>Basado en el plan preventivo registrado para esta máquina.</p><div className="task-progress"><span style={{ width: `${Math.min((selected.hours / selected.dueAt) * 100, 100)}%` }} /></div></div>
                <div className="detail-actions"><Button onClick={registerReading}><Plus data-icon="inline-start" /> Añadir lectura</Button><Button variant="outline" onClick={() => setAssistantOpen(true)}><Bot data-icon="inline-start" /> Preguntar a IA</Button></div>
              </article>
              <article className="activity-card">
                <div className="section-head compact"><div><h3>Actividad reciente</h3><p>Trazabilidad del laboratorio</p></div><button>Ver todo</button></div>
                <div className="activity-item"><span className="activity-dot success"><CheckCircle2 /></span><div><strong>Inspección completada</strong><p>Bomba centrífuga · hace 2 h</p></div></div>
                <div className="activity-item"><span className="activity-dot warning"><Clock3 /></span><div><strong>Lectura actualizada</strong><p>Torno paralelo · ayer</p></div></div>
              </article>
            </aside>
          </section>
        </div>
      </section>

      {notice && <div className="notice-toast"><CheckCircle2 /> {notice}</div>}

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
