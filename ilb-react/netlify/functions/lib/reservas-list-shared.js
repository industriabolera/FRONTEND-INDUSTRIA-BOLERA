/** YYYY-MM-DD del día 1 del mes calendario anterior (fecha local del entorno Lambda). */
export function defaultFechaDesdeMesAnterior(now = new Date()) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = prev.getFullYear()
  const m = String(prev.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export const FECHA_YMD_QUERY_RE = /^\d{4}-\d{2}-\d{2}$/

export function mapReservaDocToListRow(d) {
  return {
    reference: d.reference,
    estado: d.estado,
    origen: d.origen || (String(d.reference || '').startsWith('MANUAL-') ? 'manual' : null),
    fecha: d.fecha,
    pistas: d.pistas,
    horas: d.horas,
    personas: d.personas,
    extras: d.extras,
    total: d.total,
    description: d.description,
    datosPersonales: d.datosPersonales,
    metodoPago: d.metodoPago || '',
    notas: d.notas || '',
    motivoPendiente: d.estado === 'pendiente' ? (d.placetopay?.statusMessage || '') : '',
    creadaEn: d.creadaEn,
    actualizadaEn: d.actualizadaEn,
  }
}

/** Filtro: desde el día 1 del mes anterior en adelante (por fecha de juego); legacy sin fecha por creadaEn. */
export function buildReservaListFilter(fechaDesde) {
  const creadaEnDesde = new Date(`${fechaDesde}T00:00:00.000Z`)
  return {
    $or: [
      { fecha: { $gte: fechaDesde } },
      {
        $and: [
          { $or: [{ fecha: null }, { fecha: '' }, { fecha: { $exists: false } }] },
          { creadaEn: { $gte: creadaEnDesde } },
        ],
      },
    ],
  }
}
