# Mantis IA

Sistema inteligente de apoyo al mantenimiento preventivo de maquinaria mediante inteligencia artificial.

Mantis IA busca centralizar la información de las máquinas, automatizar la planificación de mantenimientos y ayudar a interpretar historiales, síntomas y documentación técnica. Su propósito es facilitar la identificación temprana de riesgos y la toma de decisiones trazables, sin reemplazar al personal técnico ni afirmar predicciones que no hayan sido validadas.

## Objetivo del proyecto

Evaluar en qué medida una plataforma digital asistida por IA puede mejorar el tiempo y la precisión de tareas de mantenimiento preventivo frente a métodos de registro convencionales.

## Alcance inicial

- Registro y consulta de máquinas.
- Seguimiento por fechas y horas de operación.
- Planes y alertas de mantenimiento preventivo.
- Historial de intervenciones y fallas.
- Identificación de máquinas mediante códigos QR.
- Agente de IA conectado con los datos del sistema.
- Consulta de manuales técnicos con fuentes verificables.
- Acciones controladas y confirmadas por el usuario.
- Validación experimental: método manual, plataforma y plataforma con IA.

## Estado

Primera superficie funcional en desarrollo para la XIV Feria de Ciencia, Tecnología e Innovación USTA 2026.

La versión actual incluye:

- Pantalla inicial de acceso con inicio de sesión, registro y entrada rápida a la demo.
- Sesión local de demostración y cierre de sesión desde el tablero.
- Tablero operativo responsivo.
- Cinco máquinas de demostración con estados y prioridades.
- Filtros y ficha dinámica de cada máquina.
- Registro local de lecturas de horas.
- Panel demostrativo del agente Mantis IA.
- Flujo confirmado para crear una tarea preventiva.

Los datos y el acceso actuales son demostrativos y se guardan únicamente en el navegador. Las siguientes fases incorporarán persistencia, autenticación segura, manuales técnicos y la conexión controlada con el modelo de IA.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación se abre en `http://localhost:3000`.

La documentación de planificación se encuentra en [`docs/`](docs/).

