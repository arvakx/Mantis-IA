export type MachineStatus = 'Operativa' | 'Atención próxima' | 'Vencida';
export type DataStatus = 'Demostrativo' | 'Pendiente de validación' | 'Validado';

export type Machine = {
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
  function: string;
  operatingContext: string;
  performanceStandard: string;
  dataStatus: DataStatus;
  source: string;
};

export const initialMachines: Machine[] = [
  {
    id: 'COMP-01',
    name: 'Compresor principal',
    type: 'Compresor de tornillo',
    location: 'Zona neumática',
    hours: 2547,
    dueAt: 2500,
    health: 62,
    status: 'Vencida',
    lastService: '14 jun 2026',
    nextTask: 'Cambio de aceite y revisión de filtro',
    function: 'Suministrar aire comprimido a los equipos neumáticos del laboratorio.',
    operatingContext: 'Servicio intermitente en un entorno académico de manufactura.',
    performanceStandard: '',
    dataStatus: 'Demostrativo',
    source: 'Escenario construido para probar el prototipo',
  },
  {
    id: 'TAL-02',
    name: 'Taladro de banco',
    type: 'Taladro de columna',
    location: 'Banco 02',
    hours: 1035,
    dueAt: 1100,
    health: 79,
    status: 'Atención próxima',
    lastService: '02 ago 2026',
    nextTask: 'Inspección de correa y portabrocas',
    function: 'Realizar perforaciones controladas en piezas de práctica del laboratorio.',
    operatingContext: 'Uso académico por jornadas y bajo supervisión docente.',
    performanceStandard: '',
    dataStatus: 'Demostrativo',
    source: 'Escenario construido para probar el prototipo',
  },
  {
    id: 'TOR-03',
    name: 'Torno paralelo',
    type: 'Máquina herramienta',
    location: 'Celda de mecanizado',
    hours: 1870,
    dueAt: 2000,
    health: 84,
    status: 'Atención próxima',
    lastService: '26 jul 2026',
    nextTask: 'Lubricación y control de alineación',
    function: 'Mecanizar piezas cilíndricas para prácticas de manufactura y metrología.',
    operatingContext: 'Operación variable según el tipo de práctica y material procesado.',
    performanceStandard: '',
    dataStatus: 'Demostrativo',
    source: 'Escenario construido para probar el prototipo',
  },
  {
    id: 'BOM-01',
    name: 'Bomba centrífuga',
    type: 'Equipo hidráulico',
    location: 'Banco hidráulico',
    hours: 724,
    dueAt: 1000,
    health: 94,
    status: 'Operativa',
    lastService: '18 ago 2026',
    nextTask: 'Revisión de sello y rodamientos',
    function: 'Impulsar fluido a través del banco de pruebas hidráulicas.',
    operatingContext: 'Ensayos académicos de duración corta y caudal controlado.',
    performanceStandard: '',
    dataStatus: 'Demostrativo',
    source: 'Escenario construido para probar el prototipo',
  },
  {
    id: 'ESM-01',
    name: 'Esmeriladora',
    type: 'Equipo rotativo',
    location: 'Banco 04',
    hours: 390,
    dueAt: 500,
    health: 91,
    status: 'Operativa',
    lastService: '11 ago 2026',
    nextTask: 'Inspección de guarda y muela',
    function: 'Desbastar y acondicionar piezas y herramientas de práctica.',
    operatingContext: 'Uso manual intermitente con exposición a polvo y partículas.',
    performanceStandard: '',
    dataStatus: 'Demostrativo',
    source: 'Escenario construido para probar el prototipo',
  },
];

export const statusStyles: Record<MachineStatus, string> = {
  Operativa: 'status-ok',
  'Atención próxima': 'status-warning',
  Vencida: 'status-critical',
};

export function formatHours(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function calculateMachineStatus(hours: number, dueAt: number): MachineStatus {
  if (hours >= dueAt) return 'Vencida';
  if (dueAt - hours <= dueAt * 0.15) return 'Atención próxima';
  return 'Operativa';
}
