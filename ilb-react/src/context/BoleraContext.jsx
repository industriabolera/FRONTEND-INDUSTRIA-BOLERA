import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ilb_admin_config'

const DEFAULT_CONFIG = {
  precios: {
    pistaLJ: 120000,
    pistaVD: 132000,
    zapatos: 7500,
    jugadorAdicional: 31000,
  },
  horarios: {
    lunMie: { apertura: '12:00 PM', cierre: '10:00 PM' },
    jueSab: { apertura: '12:00 PM', cierre: '11:00 PM' },
    domFest: { apertura: '12:00 PM', cierre: '9:00 PM' },
  },
  promociones: [],
  bloqueos: [],
  reservasAdmin: [],
}

/*
  Promocion shape:
  {
    id: string,
    nombre: string,
    descripcion: string,
    tipo: 'porcentaje' | 'valor' | '2x1',
    valor: number,       // % or COP amount
    fechaInicio: string,  // YYYY-MM-DD
    fechaFin: string,
    diasSemana: number[], // 0=Dom..6=Sab, empty = todos
    activa: boolean,
  }

  Bloqueo shape:
  {
    id: string,
    pista: number,
    fechaInicio: string,   // YYYY-MM-DD
    fechaFin: string,      // YYYY-MM-DD (same as fechaInicio for single day)
    horas: string[],       // ['12:00 PM', '1:00 PM'] or empty = todo el día
    motivo: string,
  }

  ReservaAdmin shape:
  {
    id: string,
    pista: number,
    fecha: string,
    hora: string,
    personas: number,
    nombre: string,
    telefono: string,
    notas: string,
    creadaEn: string,
  }
*/

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        bloqueos: [],
        precios: { ...DEFAULT_CONFIG.precios, ...parsed.precios },
        horarios: { ...DEFAULT_CONFIG.horarios, ...parsed.horarios },
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function saveConfig(config) {
  const persist = { ...config }
  delete persist.bloqueos
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persist))
}

const BoleraContext = createContext(null)

export function BoleraProvider({ children }) {
  const [config, setConfig] = useState(loadConfig)
  const [onlineSlots, setOnlineSlots] = useState([])

  useEffect(() => { saveConfig(config) }, [config])

  useEffect(() => {
    let cancelled = false
    const fetchSlots = () => {
      fetch('/api/reservas/slots')
        .then(r => r.json())
        .then(data => { if (!cancelled && data.slots) setOnlineSlots(data.slots) })
        .catch(() => {})
    }
    fetchSlots()
    const interval = setInterval(fetchSlots, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const fetchBloqueos = useCallback(() => {
    return fetch('/api/bloqueos')
      .then(r => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then(data => {
        if (data.bloqueos) {
          const bloqueos = data.bloqueos.map(b => ({
            ...b,
            horas: Array.isArray(b.horas) ? b.horas : [],
            motivo: b.motivo ?? '',
          }))
          setConfig(prev => ({ ...prev, bloqueos }))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBloqueos()
    const interval = setInterval(fetchBloqueos, 30000)
    return () => clearInterval(interval)
  }, [fetchBloqueos])

  const updatePrecios = useCallback((precios) => {
    setConfig(prev => ({ ...prev, precios: { ...prev.precios, ...precios } }))
  }, [])

  const updateHorarios = useCallback((horarios) => {
    setConfig(prev => ({ ...prev, horarios: { ...prev.horarios, ...horarios } }))
  }, [])

  const addPromocion = useCallback((promo) => {
    setConfig(prev => ({
      ...prev,
      promociones: [...prev.promociones, { ...promo, id: crypto.randomUUID() }]
    }))
  }, [])

  const updatePromocion = useCallback((id, updates) => {
    setConfig(prev => ({
      ...prev,
      promociones: prev.promociones.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }, [])

  const deletePromocion = useCallback((id) => {
    setConfig(prev => ({
      ...prev,
      promociones: prev.promociones.filter(p => p.id !== id)
    }))
  }, [])

  const addBloqueo = useCallback(async (bloqueo) => {
    const id = crypto.randomUUID()
    const payload = { ...bloqueo, id }
    const r = await fetch('/api/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.error || `Error ${r.status}`)
    }
    await r.json().catch(() => ({}))
    await fetchBloqueos()
  }, [fetchBloqueos])

  const deleteBloqueo = useCallback(async (id) => {
    const r = await fetch('/api/bloqueos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.error || `Error ${r.status}`)
    }
    await fetchBloqueos()
  }, [fetchBloqueos])

  const addReservaAdmin = useCallback((reserva) => {
    setConfig(prev => ({
      ...prev,
      reservasAdmin: [...prev.reservasAdmin, { ...reserva, id: crypto.randomUUID(), creadaEn: new Date().toISOString() }]
    }))
  }, [])

  const deleteReservaAdmin = useCallback((id) => {
    setConfig(prev => ({
      ...prev,
      reservasAdmin: prev.reservasAdmin.filter(r => r.id !== id)
    }))
  }, [])

  const isLaneBlocked = useCallback((pista, fechaStr, hora) => {
    return config.bloqueos.some(b => {
      if (b.pista !== pista) return false
      if (b.fechaInicio && b.fechaFin) {
        if (fechaStr < b.fechaInicio || fechaStr > b.fechaFin) return false
      } else if (b.fecha) {
        if (b.fecha !== fechaStr) return false
      }
      if (b.horas.length === 0) return true
      return b.horas.includes(hora)
    })
  }, [config.bloqueos])

  const isLaneFullDayBlocked = useCallback((pista, fechaStr) => {
    return config.bloqueos.some(b => {
      if (b.pista !== pista) return false
      if (b.fechaInicio && b.fechaFin) {
        if (fechaStr < b.fechaInicio || fechaStr > b.fechaFin) return false
      } else if (b.fecha) {
        if (b.fecha !== fechaStr) return false
      }
      return b.horas.length === 0
    })
  }, [config.bloqueos])

  const isLaneReservedAdmin = useCallback((pista, fechaStr, hora) => {
    return config.reservasAdmin.some(r => r.pista === pista && r.fecha === fechaStr && r.hora === hora)
  }, [config.reservasAdmin])

  const isLaneReservedOnline = useCallback((pista, fechaStr, hora) => {
    return onlineSlots.some(s => s.pista === pista && s.fecha === fechaStr && s.hora === hora)
  }, [onlineSlots])

  const getActivePromo = useCallback((fechaStr, diaSemana) => {
    return config.promociones.find(p => {
      if (!p.activa) return false
      if (fechaStr < p.fechaInicio || fechaStr > p.fechaFin) return false
      if (p.diasSemana.length > 0 && !p.diasSemana.includes(diaSemana)) return false
      return true
    }) || null
  }, [config.promociones])

  const value = {
    config,
    updatePrecios, updateHorarios,
    addPromocion, updatePromocion, deletePromocion,
    addBloqueo, deleteBloqueo,
    addReservaAdmin, deleteReservaAdmin,
    isLaneBlocked, isLaneFullDayBlocked, isLaneReservedAdmin, isLaneReservedOnline,
    getActivePromo, onlineSlots,
  }

  return <BoleraContext.Provider value={value}>{children}</BoleraContext.Provider>
}

export function useBolera() {
  const ctx = useContext(BoleraContext)
  if (!ctx) throw new Error('useBolera must be used within BoleraProvider')
  return ctx
}
