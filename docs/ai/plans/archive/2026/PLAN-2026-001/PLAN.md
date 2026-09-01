---
id: PLAN-2026-001
revision: 2
status: completed
approved_at: 2026-08-31
updated_at: 2026-08-31
---

# Goal
Actualizar todas las superficies activas de horarios y la ventana efectiva de reservas según la captura proporcionada.

# Non-Goals
- No rediseñar los estilos visuales existentes.
- No modificar precios, pagos ni la lógica de festivos fuera de su asociación al horario.
- No desplegar ni ejecutar operaciones Git.

# Current Decisions And Invariants
- Contrato canónico de grupos: `lunMie` = lunes-miércoles 2:00 PM–10:00 PM; `jueVie` = jueves-viernes 2:00 PM–11:00 PM; `sab` = sábados 12:00 PM–11:00 PM; `domFest` = domingos y festivos 12:00 PM–9:00 PM.
- Las superficies públicas que muestran un día individual conservan sus círculos, tipografías, colores y layout; solo cambia el texto de horas.
- La reserva pública y el plano administrativo generan slots desde la configuración por día; no deben seguir usando el grupo obsoleto `jueSab`.
- Configuraciones persistidas con el esquema anterior se completan con los nuevos grupos sin perder lunes-miércoles, domingos/festivos ni promociones/precios.

# Acceptance Criteria
- Homepage y Servicios muestran: L/M/Mi 2pm–10pm; J/V 2pm–11pm; S 12m–11pm; D 12m–9pm.
- Reserva muestra cuatro filas agrupadas con los nuevos nombres/horas y ofrece slots correctos para cada día.
- Administración permite editar/guardar los cuatro grupos y el plano refleja el rango del día seleccionado.
- Defaults de cliente, servidor Express y funciones Netlify coinciden con el contrato canónico.
- No quedan superficies activas con los valores anteriores; el build pasa y el lint focal no añade errores. El lint global conserva errores baseline preexistentes fuera de este cambio.

# Workstream Definitions
- WS-01 Frontend: componentes públicos, reserva, calendario/plano y configuración/migración cliente. Ownership: `src/**`.
- WS-02 Backend: defaults, persistencia/migración y configuración servida por Express/Netlify. Ownership: `server/**`, `netlify/functions/**`.
- WS-03 Senior integration: revisar compatibilidad, actualizar copias HTML legacy si son superficies servidas, ejecutar gates y aceptar diff.

# Integration Order
1. WS-01 y WS-02 en paralelo sobre archivos no compartidos.
2. Senior revisa contrato y cruces `jueSab`/`jueVie`/`sab`.
3. Actualiza artefactos HTML legacy servidos o documenta que no son rutas activas.
4. Ejecuta lint/build una sola vez como gate integrado.

# Verification Gates
- Checks focales de cada workstream.
- `npm run lint`.
- `npm run build`.
- Búsqueda final de nombres/grupos y valores antiguos en superficies activas.

# Risks And Mitigations
- Riesgo: documentos persistidos con `jueSab`; mitigación: fallback/migración explícita a defaults nuevos.
- Riesgo: un sábado herede horario de jueves-viernes; mitigación: grupo separado y pruebas de selección por día.

# Revision Index
- Rev. 1 — alcance inicial derivado de la captura del 2026-08-31.
- Rev. 2 — aceptación de verificación ajustada para reflejar baseline global de lint documentada; build y lint focal en verde.
