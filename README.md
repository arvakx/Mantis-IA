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

- Entrada directa al prototipo para evitar que el acceso distraiga las pruebas científicas.
- Tablero operativo responsivo.
- Cinco máquinas de demostración con estados y prioridades.
- Filtros y ficha central del activo con función, contexto operativo, condición y plan preventivo.
- Estado visible de la evidencia: datos demostrativos, borradores y campos aún por validar.
- Registro y edición de activos con los campos mínimos de identificación, operación, RCM, plan preventivo y fuente.
- Registro de activos en una superficie completa, legible y adaptable a computador o móvil.
- Persistencia local de máquinas y lecturas para conservar el trabajo al recargar el navegador.
- Registro local de lecturas de horas.
- Casos de mantenimiento guiados por la cadena RCM: función, falla funcional, modo, causa, efecto, consecuencia, política, intervalo y fuente.
- Puerta de calidad que separa completitud documental, preparación para revisión y validación por un experto identificado.
- Panel demostrativo del agente Mantis IA.
- Flujo confirmado para crear una tarea preventiva.

Los datos incluidos de fábrica son demostrativos. Los activos creados o editados quedan guardados en el navegador del dispositivo; todavía no existe una base de datos compartida. Las siguientes fases incorporarán los datos reales validados del laboratorio, manuales técnicos, análisis RCM y la conexión controlada con el modelo de IA. La autenticación se evaluará más adelante si aporta valor fuera del experimento de feria.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación se abre en `http://localhost:3000`.

La documentación de planificación se encuentra en [`docs/`](docs/).

