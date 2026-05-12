import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBolera } from '../context/BoleraContext'
import FloorPlan, { LANE_PAIRS } from './FloorPlan'
import './ReservasPage.css'

const STEPS = ['Fecha', 'Pista y Hora', 'Extras', 'Datos Personales', 'Confirmar']

/**
 * Tipos de documento permitidos por PlaceToPay.
 * Ref: https://docs.placetopay.dev/checkout/document-types
 * 
 * Se incluyen: Colombia (CC, CE, TI, NIT, RUT) + Globales (PPN, TAX, LIC)
 * + DNI (Perú) para turistas frecuentes en la región.
 */
const DOC_TYPES = [
  // ── Colombia ──
  { value: 'CC',  label: 'Cédula de Ciudadanía',           pattern: /^[1-9][0-9]{3,9}$/,                    hint: '4 a 10 dígitos; no puede empezar en 0', maxLen: 10 },
  { value: 'CE',  label: 'Cédula de Extranjería',          pattern: /^([a-zA-Z]{1,5})?[1-9][0-9]{3,7}$/,    hint: 'Opcional 1–5 letras + 4–8 dígitos (no empezar en 0)', maxLen: 13 },
  { value: 'TI',  label: 'Tarjeta de Identidad',           pattern: /^[1-9][0-9]{4,11}$/,                   hint: '5 a 12 dígitos; no puede empezar en 0', maxLen: 12 },
  { value: 'NIT', label: 'NIT',                            pattern: /^[1-9]\d{6,9}$/,                       hint: '7 a 10 dígitos', maxLen: 10 },
  { value: 'RUT', label: 'Registro Único Tributario',      pattern: /^[1-9]\d{6,9}$/,                       hint: '7 a 10 dígitos', maxLen: 10 },
  // ── Globales ──
  { value: 'PPN', label: 'Pasaporte',                      pattern: /^[a-zA-Z0-9]{4,16}$/,                  hint: '4 a 16 caracteres alfanuméricos', maxLen: 16 },
  { value: 'TAX', label: 'TAX',                            pattern: /^[a-zA-Z0-9]{4,16}$/,                  hint: '4 a 16 caracteres alfanuméricos', maxLen: 16 },
  { value: 'LIC', label: 'Labeler Identification Code',    pattern: /^[a-zA-Z0-9]{4,16}$/,                  hint: '4 a 16 caracteres alfanuméricos', maxLen: 16 },
  // ── Perú (DNI) ──
  { value: 'DNI', label: 'DNI (Perú)',                     pattern: /^\d{8}$/,                               hint: '8 dígitos exactos', maxLen: 8 },
]

function filterCEInput(raw) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let i = 0
  while (i < s.length && s[i] >= 'A' && s[i] <= 'Z' && i < 5) i += 1
  const letters = s.slice(0, i)
  const digits = s.slice(i).replace(/\D/g, '').slice(0, 8)
  return letters + digits
}

function validateDocumento(tipo, valor) {
  const docType = DOC_TYPES.find(t => t.value === tipo)
  if (!docType || !valor.trim()) return null
  const v = tipo === 'CE' ? valor.trim().toUpperCase() : valor.trim()
  return docType.pattern.test(v) ? null : docType.hint
}

const PHONE_CODES = [
  { code: '+57', country: 'CO', flag: '🇨🇴' },
  { code: '+1',  country: 'US', flag: '🇺🇸' },
  { code: '+52', country: 'MX', flag: '🇲🇽' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+51', country: 'PE', flag: '🇵🇪' },
  { code: '+56', country: 'CL', flag: '🇨🇱' },
  { code: '+54', country: 'AR', flag: '🇦🇷' },
  { code: '+593', country: 'EC', flag: '🇪🇨' },
  { code: '+58', country: 'VE', flag: '🇻🇪' },
  { code: '+507', country: 'PA', flag: '🇵🇦' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
]

/** Reglas por indicativo (número nacional sin + ni prefijo internacional) */
const PHONE_RULES = {
  '+57': {
    pattern: /^[1-9]\d{9}$/,
    hint: '10 dígitos (Colombia), sin 0 inicial',
    maxLen: 10,
    placeholder: '3001234567',
  },
  '+1': {
    pattern: /^\d{10}$/,
    hint: '10 dígitos (EE.UU./Canadá, sin el +1)',
    maxLen: 10,
    placeholder: '2025550123',
  },
  '+52': {
    pattern: /^\d{10}$/,
    hint: '10 dígitos (México, sin 1 de larga distancia)',
    maxLen: 10,
    placeholder: '5512345678',
  },
  '+34': {
    pattern: /^\d{9}$/,
    hint: '9 dígitos (España)',
    maxLen: 9,
    placeholder: '612345678',
  },
  '+51': {
    pattern: /^\d{9}$/,
    hint: '9 dígitos (Perú)',
    maxLen: 9,
    placeholder: '987654321',
  },
  '+56': {
    pattern: /^\d{8,9}$/,
    hint: '8 o 9 dígitos (Chile)',
    maxLen: 9,
    placeholder: '912345678',
  },
  '+54': {
    pattern: /^\d{10,11}$/,
    hint: '10 u 11 dígitos (Argentina, sin 15 ni 0 inicial)',
    maxLen: 11,
    placeholder: '1123456789',
  },
  '+593': {
    pattern: /^\d{9}$/,
    hint: '9 dígitos (Ecuador)',
    maxLen: 9,
    placeholder: '987654321',
  },
  '+58': {
    pattern: /^\d{10}$/,
    hint: '10 dígitos (Venezuela)',
    maxLen: 10,
    placeholder: '4121234567',
  },
  '+507': {
    pattern: /^\d{8}$/,
    hint: '8 dígitos (Panamá)',
    maxLen: 8,
    placeholder: '61234567',
  },
  '+55': {
    pattern: /^\d{10,11}$/,
    hint: '10 u 11 dígitos (Brasil: DDD + número)',
    maxLen: 11,
    placeholder: '11987654321',
  },
}

function getPhoneRule(codigoPais) {
  return PHONE_RULES[codigoPais] || PHONE_RULES['+57']
}

/**
 * Valida que un nombre/apellido solo contenga letras (incluyendo tildes, ñ, ü),
 * espacios y guiones. No permite números, símbolos ni caracteres especiales.
 * Mínimo 3 caracteres.
 */
function validateNombre(valor) {
  if (!valor || valor.trim().length < 3) return 'Mínimo 3 caracteres'
  // Permite letras unicode (tildes, ñ, ü, etc.), espacios, guiones y apóstrofos
  const pattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
  if (!pattern.test(valor.trim())) {
    return 'Solo se permiten letras, espacios, tildes y ñ. No se permiten números ni símbolos.'
  }
  return null
}

function validateTelefono(codigoPais, valor) {
  const rule = getPhoneRule(codigoPais)
  const digits = String(valor || '').replace(/\D/g, '')
  if (!digits) return null
  return rule.pattern.test(digits) ? null : rule.hint
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_HEADER = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const MAX_PERSONAS = 6

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days = []
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, currentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, currentMonth: true })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false })
  }
  return days
}

function getEasterDate(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function nextMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 1) return d
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day))
  return d
}

function getColombianHolidays(year) {
  const easter = getEasterDate(year)
  return [
    new Date(year, 0, 1),
    nextMonday(new Date(year, 0, 6)),
    nextMonday(new Date(year, 2, 19)),
    addDays(easter, -3),
    addDays(easter, -2),
    new Date(year, 4, 1),
    nextMonday(addDays(easter, 39)),
    nextMonday(addDays(easter, 60)),
    nextMonday(addDays(easter, 68)),
    nextMonday(new Date(year, 5, 29)),
    new Date(year, 6, 20),
    new Date(year, 7, 7),
    nextMonday(new Date(year, 7, 15)),
    nextMonday(new Date(year, 9, 12)),
    nextMonday(new Date(year, 10, 1)),
    nextMonday(new Date(year, 10, 11)),
    new Date(year, 11, 8),
    new Date(year, 11, 25),
  ]
}

function buildHolidaysSet(years) {
  const set = new Set()
  years.forEach(y => {
    getColombianHolidays(y).forEach(d => set.add(toDateStr(d)))
  })
  return set
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(price)
}

function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 5 || day === 6
}

function isWeekendOrHoliday(date, holidaysSet) {
  return isWeekend(date) || holidaysSet.has(toDateStr(date))
}

const ALL_HOUR_SLOTS = [
  '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
  '10:00 PM', '11:00 PM', '12:00 AM',
]

function getHorarioGroup(date, holidaysSet) {
  if (!date) return null
  if (holidaysSet && holidaysSet.has(toDateStr(date))) return 'domFest'
  const day = date.getDay()
  if (day === 0) return 'domFest'
  if (day >= 1 && day <= 3) return 'lunMie'
  return 'jueSab'
}

function generateSlots(apertura, cierre) {
  const startIdx = ALL_HOUR_SLOTS.indexOf(apertura)
  const endIdx = ALL_HOUR_SLOTS.indexOf(cierre)
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return []
  return ALL_HOUR_SLOTS.slice(startIdx, endIdx)
}

function getHorariosForDate(date, horarios, holidaysSet) {
  if (!date) return []
  const group = getHorarioGroup(date, holidaysSet)
  if (!group || !horarios[group]) return []
  return generateSlots(horarios[group].apertura, horarios[group].cierre)
}

function getHorarioLabel(date, horarios, holidaysSet) {
  if (!date) return ''
  const group = getHorarioGroup(date, holidaysSet)
  const labels = { lunMie: 'Lunes - Miércoles', jueSab: 'Jueves - Sábado', domFest: 'Domingos y Festivos' }
  if (!group || !horarios[group]) return ''
  return `${labels[group]}: ${horarios[group].apertura} - ${horarios[group].cierre}`
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfCalendarDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Inicio del slot en el calendario local (misma hora que el usuario del navegador). */
function slotStartOnCalendarDay(dayDate, slotStr) {
  const m = String(slotStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  const ap = m[3].toUpperCase()
  if (ap === 'AM') {
    if (hh === 12) hh = 0
  } else if (hh !== 12) {
    hh += 12
  }
  return new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hh, mm, 0, 0)
}

/** Si la reserva es para hoy, excluye horarios cuyo inicio ya pasó. */
function filterPastSlotsForSameDay(selectedDate, slots) {
  if (!selectedDate || !slots?.length) return slots || []
  const todayStart = startOfCalendarDayLocal(new Date())
  const selStart = startOfCalendarDayLocal(selectedDate)
  if (selStart.getTime() < todayStart.getTime()) return []
  if (selStart.getTime() !== todayStart.getTime()) return slots
  const now = Date.now()
  return slots.filter(h => {
    const sd = slotStartOnCalendarDay(selectedDate, h)
    return sd && sd.getTime() > now
  })
}

const CONDICIONES = [
  'Debes estar en la bolera como mínimo 20 minutos antes de la hora programada.',
  'Ten en cuenta que la hora del juego empieza a correr a la hora programada.',
  'Recuerda, los zapatos y las medias tienen un costo adicional y deben estar pagos antes de iniciar el juego.',
  'En caso de no asistir no se hará la devolución del dinero.',
  'Cambios de reserva: mínimo 4 horas antes de la hora reservada.',
]

export default function ReservasPage() {
  const { config, isLaneBlocked, isLaneFullDayBlocked, isLaneReservedAdmin, isLaneReservedOnline, getActivePromo, onlineSlots } = useBolera()
  const { precios } = config

  const today = new Date()
  const [currentStep, setCurrentStep] = useState(0)
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  // Each entry: { pista: number, horas: string[] }
  const [pistaSelection, setPistaSelection] = useState([])
  /** Horarios de juego elegidos (varias horas en la misma pista). */
  const [globalBookingHoras, setGlobalBookingHoras] = useState([])
  const [personas, setPersonas] = useState(2)
  const [addZapatos, setAddZapatos] = useState(false)
  const [zapatosTodasLasHoras, setZapatosTodasLasHoras] = useState(true)
  const [addJugadorExtra, setAddJugadorExtra] = useState(false)
  const [datosPersonales, setDatosPersonales] = useState({
    nombre: '', codigoPais: '+57', telefono: '', correo: '', fechaNacimiento: '',
    tipoDocumento: 'CC', documento: '',
    esMayorDeEdad: false,
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  /** Recalcula horarios disponibles cuando la fecha es “hoy” y pasa la hora. */
  const [bookingClockTick, setBookingClockTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setBookingClockTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  }, [])

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const scrollToEl = useCallback((el) => {
    if (!el || !isMobile) return
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [isMobile, prefersReducedMotion])

  /** Al pasar de Fecha → Pista y hora: sube el viewport (móvil y escritorio); respeta `#reservar` scroll-margin-top. */
  const scrollReservaSectionTop = useCallback(() => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('reservar')
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [prefersReducedMotion])

  const completedFieldsRef = useRef(new Set())
  const dpNombreRef = useRef(null)
  const dpTelRef = useRef(null)
  const dpEmailRef = useRef(null)
  const dpDocRef = useRef(null)
  const dpMayorRef = useRef(null)
  const sidebarActionsRef = useRef(null)

  const maybeAdvanceScroll = useCallback((key, isComplete, nextRef) => {
    if (!isMobile) return
    const done = completedFieldsRef.current
    if (!isComplete) return
    if (done.has(key)) return
    done.add(key)
    const next = nextRef?.current
    if (next) {
      scrollToEl(next)
      const focusable = next.querySelector?.('input, select, textarea, button')
      focusable?.focus?.({ preventScroll: true })
    }
  }, [isMobile, scrollToEl])

  // UX móvil: al cambiar de paso, volver arriba del flujo
  useEffect(() => {
    if (!isMobile) return
    setTimeout(() => {
      const el = document.getElementById('reservar')
      if (el) scrollToEl(el)
    }, 0)
  }, [currentStep, isMobile, scrollToEl])

  useEffect(() => {
    if (personas !== 6 && addJugadorExtra) {
      setAddJugadorExtra(false)
    }
  }, [personas, addJugadorExtra])

  useEffect(() => {
    const ref = searchParams.get('ref') || localStorage.getItem('ilb_reference')
    const status = searchParams.get('status')

    if (!ref) return

    if (status === 'cancelled') {
      setPaymentResult({ status: 'CANCELLED', reference: ref })
      // Persistir cancelación en BD para que no quede "pendiente"
      fetch('/api/payment/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, reason: 'Cancelada por el usuario' }),
      }).catch(() => {})
      localStorage.removeItem('ilb_requestId')
      localStorage.removeItem('ilb_reference')
      setSearchParams({}, { replace: true })
      return
    }

    let requestId = searchParams.get('requestId')
    if (!requestId || requestId === '{requestId}') {
      requestId = localStorage.getItem('ilb_requestId')
    }

    if (requestId) {
      let cancelled = false
      const maxAttempts = 24
      const delayMs = 5000

      const applyPaymentResult = (data) => {
        const resolvedStatus = data.estado === 'exitosa'
          ? 'APPROVED'
          : data.estado === 'rechazada'
            ? 'REJECTED'
            : data.estado === 'cancelada'
              ? 'CANCELLED'
              : data.status?.status || 'UNKNOWN'

        setPaymentResult({
          status: resolvedStatus,
          reference: ref,
          message: data.status?.message,
          reserva: data.reserva || null,
        })
      }

      const verifyPayment = async (attempt = 0) => {
        const finishReturnFlow = () => {
          localStorage.removeItem('ilb_requestId')
          localStorage.removeItem('ilb_reference')
          setSearchParams({}, { replace: true })
        }

        try {
          const response = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
          })
          const data = await response.json()
          if (cancelled) return

          applyPaymentResult(data)

          const stillPending = data.estado === 'pendiente' || data.status?.status === 'PENDING'
          if (stillPending && attempt < maxAttempts) {
            window.setTimeout(() => {
              verifyPayment(attempt + 1)
            }, delayMs)
            return
          }

          finishReturnFlow()
        } catch {
          if (!cancelled) {
            setPaymentResult({ status: 'ERROR', reference: ref })
            finishReturnFlow()
          }
        }
      }

      verifyPayment()

      return () => {
        cancelled = true
      }
    }
  }, [searchParams, setSearchParams])

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const holidaysSet = useMemo(
    () => buildHolidaysSet([viewYear - 1, viewYear, viewYear + 1]),
    [viewYear]
  )

  const horarios = useMemo(
    () => filterPastSlotsForSameDay(selectedDate, getHorariosForDate(selectedDate, config.horarios, holidaysSet)),
    [selectedDate, config.horarios, holidaysSet, bookingClockTick]
  )

  useEffect(() => {
    if (!selectedDate) return
    const sodSel = startOfCalendarDayLocal(selectedDate).getTime()
    const sodNow = startOfCalendarDayLocal(new Date()).getTime()
    if (sodSel < sodNow) {
      setSelectedDate(null)
      setGlobalBookingHoras([])
      setPistaSelection([])
      setCurrentStep(0)
    }
  }, [selectedDate, bookingClockTick])

  const fechaStr = selectedDate ? toDateStr(selectedDate) : ''

  const isPistaHoraReservable = useCallback((pistaNum, hora) => {
    if (!fechaStr || !hora) return false
    if (isLaneFullDayBlocked(pistaNum, fechaStr)) return false
    return !isLaneBlocked(pistaNum, fechaStr, hora) &&
      !isLaneReservedAdmin(pistaNum, fechaStr, hora) &&
      !isLaneReservedOnline(pistaNum, fechaStr, hora)
  }, [fechaStr, isLaneFullDayBlocked, isLaneBlocked, isLaneReservedAdmin, isLaneReservedOnline])

  const pistaTieneHorasSeleccionDisponibles = useCallback((pistaNum, horasSeleccionadas) => {
    const unique = [...new Set(horasSeleccionadas)]
    if (unique.length === 0) return false
    return unique.every(h => isPistaHoraReservable(pistaNum, h))
  }, [isPistaHoraReservable])

  const activePromo = selectedDate ? getActivePromo(fechaStr, selectedDate.getDay()) : null

  const selectedPistaNums = useMemo(() => pistaSelection.map(p => p.pista), [pistaSelection])

  const hasDifferentTables = useMemo(() => {
    if (selectedPistaNums.length < 2) return false
    const pairIndices = selectedPistaNums.map(l => LANE_PAIRS.findIndex(p => p.includes(l)))
    return new Set(pairIndices).size > 1
  }, [selectedPistaNums])

  const allLanes = useMemo(() => Array.from({ length: 11 }, (_, i) => i + 1), [])

  const floorPlanHiddenLanes = useMemo(() => {
    if (!fechaStr || globalBookingHoras.length === 0) return allLanes
    return allLanes.filter(p => !pistaTieneHorasSeleccionDisponibles(p, globalBookingHoras))
  }, [fechaStr, globalBookingHoras, allLanes, pistaTieneHorasSeleccionDisponibles])

  const isHoraSelectableGlobal = useCallback((hora) => {
    if (!fechaStr || !hora) return false
    if (globalBookingHoras.includes(hora)) return true

    const candidate = [...globalBookingHoras, hora]
    return allLanes.some(p => pistaTieneHorasSeleccionDisponibles(p, candidate))
  }, [fechaStr, globalBookingHoras, allLanes, pistaTieneHorasSeleccionDisponibles])

  useEffect(() => {
    if (!fechaStr) return
    setPistaSelection(prev => {
      let changed = false
      const next = prev.map(p => {
        const horas = p.horas.filter(h => isPistaHoraReservable(p.pista, h))
        if (horas.length !== p.horas.length) changed = true
        return horas.length === p.horas.length ? p : { ...p, horas }
      })
      return changed ? next : prev
    })
    setGlobalBookingHoras(prev => prev.filter(h => isHoraSelectableGlobal(h)))
  }, [fechaStr, isPistaHoraReservable, isHoraSelectableGlobal, config.bloqueos, onlineSlots, bookingClockTick])

  const toggleGlobalHora = (hora) => {
    const removing = globalBookingHoras.includes(hora)
    const nextGlobal = removing
      ? globalBookingHoras.filter(h => h !== hora)
      : [...globalBookingHoras, hora]

    if (!removing && !isHoraSelectableGlobal(hora)) return

    setGlobalBookingHoras(nextGlobal)

    setPistaSelection(prev => {
      if (prev.length === 0) return prev
      return prev
        .map(p => ({
          ...p,
          horas: nextGlobal.filter(h => isPistaHoraReservable(p.pista, h)),
        }))
        .filter(p => nextGlobal.length === 0 || p.horas.length === nextGlobal.length)
    })
  }

  const togglePista = (pistaNum) => {
    if (!fechaStr) return
    setPistaSelection(prev => {
      const exists = prev.find(p => p.pista === pistaNum)
      if (exists) return prev.filter(p => p.pista !== pistaNum)
      if (globalBookingHoras.length === 0) return prev
      if (!pistaTieneHorasSeleccionDisponibles(pistaNum, globalBookingHoras)) return prev
      return [...prev, { pista: pistaNum, horas: [...globalBookingHoras] }]
    })
  }

  const slotSelectionError = useMemo(() => {
    if (!fechaStr) return null
    if (pistaSelection.length === 0) {
      return globalBookingHoras.length === 0 ? 'Elige al menos un horario de juego.' : null
    }
    for (const { pista, horas } of pistaSelection) {
      if (horas.length === 0) return `Elige al menos un horario para la pista ${pista}.`
      if (horas.length !== globalBookingHoras.length) {
        return `La pista ${pista} no está disponible en todos los horarios seleccionados.`
      }
      if (!pistaTieneHorasSeleccionDisponibles(pista, horas)) {
        return `La pista ${pista} no está disponible en todos los horarios seleccionados. Quita los turnos ocupados o elige otra pista.`
      }
    }
    return null
  }, [fechaStr, globalBookingHoras, pistaSelection, pistaTieneHorasSeleccionDisponibles])

  const calendarCanGoPrevMonth = useMemo(() => {
    const firstOfView = new Date(viewYear, viewMonth, 1)
    const d = new Date()
    const firstOfThisMonth = new Date(d.getFullYear(), d.getMonth(), 1)
    return firstOfView.getTime() > firstOfThisMonth.getTime()
  }, [viewYear, viewMonth, bookingClockTick])

  const prevMonth = () => {
    if (!calendarCanGoPrevMonth) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (day) => {
    if (!day.currentMonth) return
    const d = new Date(viewYear, viewMonth, day.day)
    if (startOfCalendarDayLocal(d).getTime() < startOfCalendarDayLocal(new Date()).getTime()) return
    setSelectedDate(d)
    setPistaSelection([])
    setGlobalBookingHoras([])
    // UX: al seleccionar fecha, avanzar automáticamente a "Pista y Hora"
    setCurrentStep(1)
    // Tras el commit de React, llevar arriba la sección de reserva (evita quedar abajo del calendario)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollReservaSectionTop()
      })
    })
  }

  const isToday = (day) =>
    day.currentMonth && day.day === today.getDate() &&
    viewMonth === today.getMonth() && viewYear === today.getFullYear()

  const isSelected = (day) => {
    if (!selectedDate || !day.currentMonth) return false
    return day.day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear()
  }

  const isPast = (day) => {
    if (!day.currentMonth) return false
    const d = new Date(viewYear, viewMonth, day.day)
    return startOfCalendarDayLocal(d).getTime() < startOfCalendarDayLocal(new Date()).getTime()
  }

  const totalPersonas = personas + (addJugadorExtra ? 1 : 0)

  const totalHorasReservadas = pistaSelection.length > 0
    ? pistaSelection.reduce((sum, p) => sum + p.horas.length, 0)
    : globalBookingHoras.length
  const horasCobroZapatos = totalHorasReservadas <= 1 ? 1 : (zapatosTodasLasHoras ? totalHorasReservadas : 1)
  const zapatosCobroQty = totalPersonas * horasCobroZapatos
  const horasSinZapatos = Math.max(0, totalHorasReservadas - horasCobroZapatos)

  const precioPistaBase = selectedDate
    ? (isWeekendOrHoliday(selectedDate, holidaysSet) ? precios.pistaVD : precios.pistaLJ)
    : 0

  let precioPista = precioPistaBase
  let promoLabel = ''
  let promo2x1Active = false

  if (activePromo) {
    if (activePromo.tipo === 'porcentaje') {
      precioPista = Math.round(precioPistaBase * (1 - activePromo.valor / 100))
      promoLabel = `${activePromo.valor}% desc.`
    } else if (activePromo.tipo === 'valor') {
      precioPista = Math.max(0, precioPistaBase - activePromo.valor)
      promoLabel = `-${formatPrice(activePromo.valor)}`
    } else if (activePromo.tipo === '2x1') {
      const minH = activePromo.minHoras || 2
      if (totalHorasReservadas >= minH) {
        promo2x1Active = true
        promoLabel = '2×1'
      } else {
        promoLabel = `2×1 (mín. ${minH}h)`
      }
    }
  }

  const horasFacturables = promo2x1Active
    ? Math.ceil(totalHorasReservadas / 2)
    : totalHorasReservadas
  const totalPistasCost = promo2x1Active
    ? precioPistaBase * horasFacturables
    : precioPista * totalHorasReservadas
  const totalSinDescuento2x1 = promo2x1Active
    ? precioPistaBase * totalHorasReservadas
    : 0

  const precioZapatos = addZapatos ? precios.zapatos * zapatosCobroQty : 0
  const precioJugador = addJugadorExtra ? precios.jugadorAdicional * pistaSelection.length : 0
  const totalPrice = totalPistasCost + precioZapatos + precioJugador

  const updateDatos = (field, value) => setDatosPersonales(prev => ({ ...prev, [field]: value }))

  const canContinue = () => {
    switch (currentStep) {
      case 0: return selectedDate !== null
      case 1:
        return globalBookingHoras.length > 0 &&
          pistaSelection.length > 0 &&
          !slotSelectionError &&
          pistaSelection.every(p =>
            p.horas.length === globalBookingHoras.length &&
            pistaTieneHorasSeleccionDisponibles(p.pista, p.horas)
          )
      case 2: return true
      case 3: {
        const d = datosPersonales
        return !validateNombre(d.nombre) &&
          !validateTelefono(d.codigoPais, d.telefono) &&
          d.telefono.replace(/\D/g, '').length > 0 &&
          d.correo.includes('@') && d.correo.includes('.') &&
          !validateDocumento(d.tipoDocumento, d.documento) &&
          d.documento.trim().length > 0 &&
          d.esMayorDeEdad
      }
      case 4: return acceptTerms
      default: return false
    }
  }

  const goNext = () => {
    if (canContinue() && currentStep < STEPS.length - 1) setCurrentStep(s => s + 1)
  }
  const goBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    return `${DAYS_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}, ${selectedDate.getFullYear()}`
  }

  const formatShortDate = () => {
    if (!selectedDate) return 'Sin seleccionar'
    return `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}, ${selectedDate.getFullYear()}`
  }

  const handlePay = async () => {
    // Prevenir múltiples clics — si ya está en proceso, ignorar
    if (paying) return
    setPaying(true)
    try {
      for (const { pista, horas } of pistaSelection) {
        if (!pistaTieneHorasSeleccionDisponibles(pista, horas)) {
          throw new Error(`La pista ${pista} ya no está disponible en uno o más horarios elegidos.`)
        }
      }

      const reference = `ILB-${Date.now()}`
      const pistasDesc = pistaSelection.map(p => `Pista ${p.pista}`).join(', ')
      const description = `Reserva ${pistasDesc} - ${totalPersonas} personas`

      const extras = [
        addZapatos ? `Zapatos x${zapatosCobroQty}${horasSinZapatos > 0 ? ` (faltan ${horasSinZapatos}h por comprar presencial)` : ''}` : null,
        addJugadorExtra ? `Jugador adicional x${pistaSelection.length}` : null,
      ].filter(Boolean).join(', ')

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          description,
          total: totalPrice,
          pista: pistaSelection.map(p => p.pista).join(','),
          fecha: fechaStr,
          hora: pistaSelection.map(p => `P${p.pista}:${p.horas.join(',')}`).join('|'),
          personas: totalPersonas,
          extras,
          datosPersonales: {
            nombre: datosPersonales.nombre,
            telefono: `${datosPersonales.codigoPais}${datosPersonales.telefono}`,
            correo: datosPersonales.correo,
            fechaNacimiento: datosPersonales.fechaNacimiento,
            tipoDocumento: datosPersonales.tipoDocumento,
            documento: datosPersonales.documento,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la sesión de pago')
      }

      localStorage.setItem('ilb_requestId', String(data.requestId))
      localStorage.setItem('ilb_reference', reference)
      window.location.href = data.processUrl
    } catch (err) {
      console.error('Payment error:', err)
      let errorMsg = 'Error desconocido. Inténtalo de nuevo.'
      if (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED') || err.message.includes('NetworkError')) {
        errorMsg = 'No se pudo conectar con el servidor. Verifica que el servidor backend esté corriendo (npm run dev:all).'
      } else if (err.message.includes('non-JSON')) {
        errorMsg = 'La pasarela de pagos devolvió una respuesta inesperada. Verifica las credenciales de PlaceToPay.'
      } else if (err.message) {
        errorMsg = err.message
      }
      setPaymentResult({ status: 'ERROR', reference: '', message: errorMsg })
    } finally {
      setPaying(false)
    }
  }

  return (
    <section className="reservas-page">
      <div className="reservas-bg-decoration">
        <div className="bowling-pin-left" />
        <div className="bowling-pin-right" />
        <div className="bowling-ball-decoration" />
      </div>

      {paymentResult && paymentResult.status === 'APPROVED' && paymentResult.reserva && (
        <div className="receipt-overlay">
          <div className="receipt-card" id="receipt-printable">
            <div className="receipt-header">
              <div className="receipt-check-icon">
                <i className="fas fa-check" />
              </div>
              <h2 className="receipt-title">Reserva Confirmada</h2>
              <p className="receipt-subtitle">Tu pago ha sido procesado exitosamente</p>
            </div>

            <div className="receipt-ref-badge">
              <span className="receipt-ref-label">N.° de Reserva</span>
              <span className="receipt-ref-value">{paymentResult.reference}</span>
            </div>

            <div className="receipt-body">
              <div className="receipt-section">
                <h4 className="receipt-section-title"><i className="far fa-calendar-alt" /> Detalles de la Reserva</h4>
                <div className="receipt-row">
                  <span>Fecha</span>
                  <span>{paymentResult.reserva.fecha}</span>
                </div>
                <div className="receipt-row">
                  <span>Pistas</span>
                  <span>{paymentResult.reserva.pistas}</span>
                </div>
                <div className="receipt-row">
                  <span>Horarios</span>
                  <span>{paymentResult.reserva.horas}</span>
                </div>
                <div className="receipt-row">
                  <span>Personas</span>
                  <span>{paymentResult.reserva.personas}</span>
                </div>
                {paymentResult.reserva.extras && (
                  <div className="receipt-row">
                    <span>Extras</span>
                    <span>{paymentResult.reserva.extras}</span>
                  </div>
                )}
              </div>

              <div className="receipt-divider" />

              <div className="receipt-section">
                <h4 className="receipt-section-title"><i className="fas fa-user" /> Datos del Responsable</h4>
                <div className="receipt-row">
                  <span>Nombre</span>
                  <span>{paymentResult.reserva.datosPersonales?.nombre}</span>
                </div>
                <div className="receipt-row">
                  <span>Documento</span>
                  <span>{paymentResult.reserva.datosPersonales?.tipoDocumento} {paymentResult.reserva.datosPersonales?.documento}</span>
                </div>
                <div className="receipt-row">
                  <span>Teléfono</span>
                  <span>{paymentResult.reserva.datosPersonales?.telefono}</span>
                </div>
                <div className="receipt-row">
                  <span>Correo</span>
                  <span>{paymentResult.reserva.datosPersonales?.correo}</span>
                </div>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-total-block">
                <span className="receipt-total-label">Total Pagado</span>
                <span className="receipt-total-value">{formatPrice(paymentResult.reserva.total)}</span>
              </div>
            </div>

            <div className="receipt-footer">
              <p className="receipt-note">
                <i className="fas fa-info-circle" /> Presenta este comprobante al llegar. Recibirás confirmación por WhatsApp.
              </p>
              <div className="receipt-actions">
                <button className="receipt-btn receipt-btn-print" onClick={() => {
                  const el = document.getElementById('receipt-printable')
                  const win = window.open('', '_blank')
                  win.document.write(`<!DOCTYPE html><html><head><title>Comprobante - ${paymentResult.reference}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com"/>
                    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Yeseva+One&display=swap" rel="stylesheet"/>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
                    <style>
                      *{margin:0;padding:0;box-sizing:border-box}
                      body{font-family:'Montserrat',sans-serif;background:#111;display:flex;justify-content:center;padding:20px}
                      .receipt-card{background:linear-gradient(180deg,#1a1a1a 0%,#111 100%);border:1px solid rgba(228,210,141,.15);border-radius:20px;max-width:520px;width:100%;overflow:hidden}
                      .receipt-header{text-align:center;padding:32px 24px 20px;background:linear-gradient(135deg,rgba(228,210,141,.08),rgba(228,210,141,.02))}
                      .receipt-check-icon{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2e7d32,#43a047);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;color:#fff}
                      .receipt-title{font-family:'Yeseva One',cursive;font-size:24px;color:#e4d28d;margin-bottom:6px}
                      .receipt-subtitle{color:rgba(255,255,255,.5);font-size:14px}
                      .receipt-ref-badge{text-align:center;padding:14px;margin:0 24px;border:1px dashed rgba(228,210,141,.25);border-radius:10px;background:rgba(228,210,141,.04)}
                      .receipt-ref-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(228,210,141,.5);margin-bottom:4px}
                      .receipt-ref-value{font-size:18px;font-weight:700;color:#e4d28d;letter-spacing:1px}
                      .receipt-body{padding:24px}
                      .receipt-section-title{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
                      .receipt-section-title i{margin-right:6px;color:#e4d28d}
                      .receipt-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)}
                      .receipt-row span:first-child{color:rgba(255,255,255,.5);font-size:14px}
                      .receipt-row span:last-child{color:#fff;font-weight:600;font-size:14px;text-align:right;max-width:60%}
                      .receipt-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(228,210,141,.15),transparent);margin:20px 0}
                      .receipt-total-block{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:rgba(228,210,141,.06);border:1px solid rgba(228,210,141,.12);border-radius:12px}
                      .receipt-total-label{font-size:16px;font-weight:600;color:rgba(255,255,255,.7)}
                      .receipt-total-value{font-size:22px;font-weight:800;color:#e4d28d}
                      .receipt-footer{padding:20px 24px 28px;text-align:center}
                      .receipt-note{font-size:13px;color:rgba(255,255,255,.4)}
                      .receipt-note i{color:#e4d28d;margin-right:4px}
                      @media print{body{background:#fff;padding:0}.receipt-card{border:none;box-shadow:none}}
                    </style></head><body>${el.outerHTML}</body></html>`)
                  win.document.close()
                  setTimeout(() => win.print(), 500)
                }}>
                  <i className="fas fa-print" /> Imprimir
                </button>
                <button className="receipt-btn receipt-btn-close" onClick={() => setPaymentResult(null)}>
                  Nueva Reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentResult && paymentResult.status !== 'APPROVED' && (
        <div className={`payment-result-banner ${paymentResult.status === 'CANCELLED' ? 'cancelled' : 'rejected'}`}>
          <div className="payment-result-inner">
            {paymentResult.status === 'CANCELLED' && (
              <>
                <i className="fas fa-times-circle" />
                <div>
                  <strong>Pago cancelado</strong>
                  <p>Cancelaste el proceso de pago. Puedes intentarlo de nuevo cuando quieras.</p>
                </div>
              </>
            )}
            {paymentResult.status === 'ERROR' && (
              <>
                <i className="fas fa-exclamation-triangle" />
                <div>
                  <strong>Error de conexión</strong>
                  <p>{paymentResult.message}</p>
                </div>
              </>
            )}
            {paymentResult.status !== 'CANCELLED' && paymentResult.status !== 'ERROR' && (
              <>
                <i className="fas fa-exclamation-circle" />
                <div>
                  <strong>Pago {paymentResult.status === 'REJECTED' ? 'rechazado' : 'pendiente'}</strong>
                  <p>{paymentResult.message || 'Hubo un problema con tu pago. Inténtalo de nuevo o contacta soporte.'}</p>
                </div>
              </>
            )}
            <button className="payment-result-close" onClick={() => setPaymentResult(null)}>
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      )}

      <div className="reservas-container" id="reservar">
        <div className="reservas-header-block">
          <h1 className="reservas-main-title">Reserva tu Pista</h1>
          <p className="reservas-subtitle">Selecciona la fecha, pista y hora para disfrutar en La Industria Bolera</p>
        </div>

        {/* Stepper */}
        <div className="reservas-stepper">
          {STEPS.map((step, i) => (
            <div key={step} className="stepper-item-wrapper">
              <button
                className={`stepper-item ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                onClick={() => i < currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
              >
                <span className="stepper-label">{step}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`stepper-arrow ${i < currentStep ? 'completed' : ''}`}>
                  <i className="fas fa-arrow-right" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="reservas-body">
          <div className="reservas-main">

            {/* ===== STEP 0: FECHA ===== */}
            {currentStep === 0 && (
              <div className="calendar-component">
                <div className="calendar-header">
                  <h2 className="calendar-month-title">
                    {MONTHS[viewMonth].toUpperCase()} {viewYear}
                  </h2>
                  <div className="calendar-nav">
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      onClick={prevMonth}
                      aria-label="Mes anterior"
                      disabled={!calendarCanGoPrevMonth}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {DAYS_HEADER.map(d => (
                    <div key={d} className="calendar-day-header">{d}</div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    const isHoliday = day.currentMonth && holidaysSet.has(
                      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
                    )
                    return (
                      <button
                        key={idx}
                        className={`calendar-day
                          ${!day.currentMonth ? 'other-month' : ''}
                          ${isToday(day) ? 'today' : ''}
                          ${isSelected(day) ? 'selected' : ''}
                          ${isPast(day) ? 'past' : ''}
                          ${isHoliday ? 'holiday' : ''}
                        `}
                        onClick={() => handleDayClick(day)}
                        disabled={!day.currentMonth || isPast(day)}
                        title={isHoliday ? 'Día festivo' : ''}
                      >
                        {day.day}
                      </button>
                    )
                  })}
                </div>

                <div className="calendar-holiday-legend">
                  <span className="holiday-legend-dot" />
                  <span>Día festivo — se aplica tarifa de fin de semana</span>
                </div>

                {/* Pricing info */}
                <div className="calendar-pricing-info">
                  <div className="pricing-row">
                    <span className="pricing-label">Lunes - Jueves</span>
                    <span className="pricing-value">{formatPrice(precios.pistaLJ)} / pista</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pricing-label">Viernes - Domingo</span>
                    <span className="pricing-value">{formatPrice(precios.pistaVD)} / pista</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pricing-label">Festivos</span>
                    <span className="pricing-value">{formatPrice(precios.pistaVD)} / pista</span>
                  </div>
                </div>

                {/* Active promo banner */}
                {selectedDate && activePromo && (
                  <div className="calendar-promo-banner">
                    <i className="fas fa-gift" />
                    <div>
                      <strong>{activePromo.nombre}</strong>
                      {activePromo.descripcion && <span> — {activePromo.descripcion}</span>}
                    </div>
                  </div>
                )}

                {/* Schedule info */}
                <div className="calendar-schedule-info">
                  <h4><i className="far fa-clock" /> Horarios</h4>
                  <div className="schedule-rows">
                    <div><span>Lunes - Miércoles</span><span>{config.horarios.lunMie.apertura} - {config.horarios.lunMie.cierre}</span></div>
                    <div><span>Jueves - Sábado</span><span>{config.horarios.jueSab.apertura} - {config.horarios.jueSab.cierre}</span></div>
                    <div><span>Domingos y Festivos</span><span>{config.horarios.domFest.apertura} - {config.horarios.domFest.cierre}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 1: PISTA Y HORA ===== */}
            {currentStep === 1 && (
              <div className="pista-hora-component">

                {activePromo?.tipo === '2x1' && (
                  <div className={`promo-2x1-banner ${promo2x1Active ? 'active' : 'pending'}`}>
                    <i className={promo2x1Active ? 'fas fa-check-circle' : 'fas fa-gift'} />
                    <div>
                      <strong>{activePromo.nombre}</strong>
                      {promo2x1Active ? (
                        <p>2×1 activado — Pagas {horasFacturables} de {totalHorasReservadas} hora{totalHorasReservadas > 1 ? 's' : ''}. ¡Ahorras {formatPrice(totalSinDescuento2x1 - totalPistasCost)}!</p>
                      ) : (
                        <p>Selecciona al menos {activePromo.minHoras || 2} hora{(activePromo.minHoras || 2) > 1 ? 's' : ''} para activar el 2×1 — te falta{totalHorasReservadas === 0 ? 'n' : ''} {Math.max(0, (activePromo.minHoras || 2) - totalHorasReservadas)} hora{Math.max(0, (activePromo.minHoras || 2) - totalHorasReservadas) !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pista-selection">
                  <h3 className="selection-title">Selecciona tus horarios</h3>
                  <p className="selection-subtitle">
                    <i className="far fa-clock" /> {getHorarioLabel(selectedDate, config.horarios, holidaysSet)}
                    <span className="hora-multi-hint"> — elige una o más horas; el plano muestra solo pistas libres en todos los turnos</span>
                  </p>
                  <div className="hora-grid">
                    {horarios.map(h => {
                      const ocupada = !isHoraSelectableGlobal(h)
                      const selected = globalBookingHoras.includes(h)
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={ocupada && !selected}
                          className={`hora-chip ${selected ? 'selected' : ''} ${ocupada ? 'unavailable' : ''}`}
                          onClick={() => toggleGlobalHora(h)}
                          title={ocupada ? 'No hay pistas libres en este horario' : undefined}
                        >
                          <i className="far fa-clock" />
                          <span>{h}</span>
                        </button>
                      )
                    })}
                    {horarios.length === 0 && (
                      <p className="no-hours-msg">No hay horarios disponibles para esta fecha.</p>
                    )}
                  </div>
                  {slotSelectionError ? (
                    <p className="slot-selection-error" role="alert">
                      <i className="fas fa-exclamation-circle" /> {slotSelectionError}
                    </p>
                  ) : null}
                </div>

                <div className="pista-selection">
                  <h3 className="selection-title">Selecciona tus Pistas</h3>
                  <p className="selection-subtitle">Puedes elegir varias pistas — Máximo {MAX_PERSONAS} personas por pista</p>
                  <FloorPlan
                    selectedPistas={selectedPistaNums}
                    onTogglePista={togglePista}
                    hiddenLanes={floorPlanHiddenLanes}
                    footerHint={
                      globalBookingHoras.length === 0
                        ? 'Elige al menos un horario para ver las pistas disponibles.'
                        : `Pistas libres en ${globalBookingHoras.join(', ')}.`
                    }
                  />

                  <div className="accessibility-notice">
                    <i className="fas fa-wheelchair" />
                    <p>Si hay personas con movilidad reducida, la recomendación es la <strong>Pista 1</strong>.</p>
                  </div>

                  {hasDifferentTables && (
                    <div className="different-tables-notice">
                      <i className="fas fa-exclamation-triangle" />
                      <p>Las pistas seleccionadas cuentan con <strong>mesas diferentes</strong> y están separadas entre sí.</p>
                    </div>
                  )}
                </div>


                <div className="personas-selection">
                  <h3 className="selection-title">Número de Personas</h3>
                  <p className="selection-subtitle">Máximo {MAX_PERSONAS} por pista (1 hora de juego por slot)</p>
                  <div className="personas-control">
                    <button className="personas-btn" onClick={() => setPersonas(p => Math.max(1, p - 1))}>
                      <i className="fas fa-minus" />
                    </button>
                    <span className="personas-count">{personas}</span>
                    <button className="personas-btn" onClick={() => setPersonas(p => Math.min(MAX_PERSONAS, p + 1))}>
                      <i className="fas fa-plus" />
                    </button>
                  </div>
                </div>

                {/* Mobile: botón continuar dentro del paso */}
                <div className="step-mobile-actions">
                  <button
                    className="step-mobile-continue"
                    onClick={goNext}
                    disabled={!canContinue()}
                    type="button"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 2: EXTRAS ===== */}
            {currentStep === 2 && (
              <div className="extras-component">
                <h3 className="selection-title">Extras para tu Reserva</h3>

                {/* Mandatory shoes notice */}
                <div className="extras-notice">
                  <i className="fas fa-exclamation-triangle" />
                  <p>
                    <strong>Recuerda:</strong> el uso de medias y zapatos es obligatorio. Si no los incluyes en tu compra, debes adquirirlos directamente en la Bolera.
                    <strong> Medias y Zapatos {formatPrice(precios.zapatos)}</strong>. El cobro aplica por cada bloque de pista-hora y no se reutilizan.
                  </p>
                </div>

                <div className="extras-cards">
                  {/* Zapatos y Polainas */}
                  <div className={`extra-card-v2 ${addZapatos ? 'selected' : ''}`} onClick={() => setAddZapatos(v => !v)}>
                    <div className="extra-card-left">
                      <div className="extra-card-check">
                        <i className={addZapatos ? 'fas fa-check-square' : 'far fa-square'} />
                      </div>
                      <div className="extra-card-info">
                        <span className="extra-card-name">Zapatos y Medias</span>
                        <span className="extra-card-desc">Incluye zapatos de bolos + medias antideslizantes</span>
                      </div>
                    </div>
                    <div className="extra-card-right">
                      <span className="extra-card-price">{formatPrice(precios.zapatos)}</span>
                      <span className="extra-card-unit">/ persona</span>
                    </div>
                  </div>

                  {addZapatos && (
                    <div className="extra-qty-row">
                      {totalHorasReservadas > 1 && (
                        <label className="extra-hours-checkbox" onClick={() => setZapatosTodasLasHoras(v => !v)}>
                          <i className={zapatosTodasLasHoras ? 'fas fa-check-square' : 'far fa-square'} />
                          <span>Comprar zapatos y medias para todas las horas seleccionadas</span>
                        </label>
                      )}
                      <span className="extra-qty-label">
                        Cobro: {totalPersonas} persona(s) × {horasCobroZapatos} hora(s)
                        <i
                          className="fas fa-info-circle extra-tooltip-icon"
                          title="Si no compras para todas las horas, en los horarios restantes deberán adquirirse presencialmente en la bolera."
                        />
                      </span>
                      <span className="extra-qty-total">= {formatPrice(precios.zapatos * zapatosCobroQty)}</span>
                      {horasSinZapatos > 0 && (
                        <span className="extra-qty-warning">
                          En {horasSinZapatos} hora(s) restante(s) los zapatos/medias deben comprarse presencialmente.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Jugador Adicional (solo cuando hay 6 personas) */}
                  {personas === 6 && (
                    <div className={`extra-card-v2 ${addJugadorExtra ? 'selected' : ''}`} onClick={() => setAddJugadorExtra(v => !v)}>
                      <div className="extra-card-left">
                        <div className="extra-card-check">
                          <i className={addJugadorExtra ? 'fas fa-check-square' : 'far fa-square'} />
                        </div>
                        <div className="extra-card-info">
                          <span className="extra-card-name">Jugador Adicional (+1)</span>
                          <span className="extra-card-desc">Agrega un 7° jugador a tu pista</span>
                        </div>
                      </div>
                      <div className="extra-card-right">
                        <span className="extra-card-price">{formatPrice(precios.jugadorAdicional)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP 3: DATOS PERSONALES ===== */}
            {currentStep === 3 && (
              <div className="datos-personales-component">
                <h3 className="selection-title">Datos Personales</h3>
                <p className="selection-subtitle">Ingresa tus datos para la reserva. Debes ser mayor de edad.</p>

                <div className="datos-form">
                  <div className="datos-field" ref={dpNombreRef}>
                    <label htmlFor="dp-nombre">Nombre completo *</label>
                    <input
                      id="dp-nombre"
                      type="text"
                      value={datosPersonales.nombre}
                      onChange={e => {
                        // Filtrar caracteres no permitidos en tiempo real (solo letras, tildes, ñ, espacios, guiones, apóstrofos)
                        const filtered = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '')
                        updateDatos('nombre', filtered)
                        maybeAdvanceScroll('dp_nombre', !validateNombre(filtered), dpTelRef)
                      }}
                      placeholder="Tu nombre completo"
                      autoComplete="name"
                      maxLength={80}
                    />
                    {datosPersonales.nombre.trim().length > 0 && validateNombre(datosPersonales.nombre) && (
                      <span className="datos-field-error">
                        <i className="fas fa-exclamation-circle" /> {validateNombre(datosPersonales.nombre)}
                      </span>
                    )}
                  </div>

                  <div className="datos-field" ref={dpTelRef}>
                    <label htmlFor="dp-tel">Teléfono *</label>
                    <div className="datos-phone-row">
                      <select
                        className="datos-phone-code"
                        value={datosPersonales.codigoPais}
                        onChange={e => {
                          updateDatos('codigoPais', e.target.value)
                          updateDatos('telefono', '')
                        }}
                      >
                        {PHONE_CODES.map(p => (
                          <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                        ))}
                      </select>
                      <input
                        id="dp-tel"
                        type="tel"
                        inputMode="numeric"
                        value={datosPersonales.telefono}
                        onChange={e => {
                          const rule = getPhoneRule(datosPersonales.codigoPais)
                          const digits = e.target.value.replace(/\D/g, '').slice(0, rule.maxLen)
                          updateDatos('telefono', digits)
                          const isValid = !validateTelefono(datosPersonales.codigoPais, digits) && digits.length === rule.maxLen
                          maybeAdvanceScroll('dp_tel', isValid, dpEmailRef)
                        }}
                        placeholder={getPhoneRule(datosPersonales.codigoPais).placeholder}
                        autoComplete="tel"
                        maxLength={getPhoneRule(datosPersonales.codigoPais).maxLen}
                      />
                    </div>
                    {datosPersonales.telefono.replace(/\D/g, '').length > 0 && validateTelefono(datosPersonales.codigoPais, datosPersonales.telefono) && (
                      <span className="datos-field-error datos-field-error-phone">
                        <i className="fas fa-exclamation-circle" /> {validateTelefono(datosPersonales.codigoPais, datosPersonales.telefono)}
                      </span>
                    )}
                  </div>

                  <div className="datos-field" ref={dpEmailRef}>
                    <label htmlFor="dp-email">Correo electrónico *</label>
                    <input
                      id="dp-email"
                      type="email"
                      value={datosPersonales.correo}
                      onChange={e => {
                        const v = e.target.value
                        updateDatos('correo', v)
                        const isValid = v.includes('@') && v.includes('.')
                        maybeAdvanceScroll('dp_email', isValid, dpDocRef)
                      }}
                      placeholder="tu@correo.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="datos-field">
                    <label htmlFor="dp-fecha-nacimiento">Fecha de cumpleaños (opcional)</label>
                    <input
                      id="dp-fecha-nacimiento"
                      type="date"
                      value={datosPersonales.fechaNacimiento}
                      onChange={e => updateDatos('fechaNacimiento', e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>

                  <div className="datos-field-row" ref={dpDocRef}>
                    <div className="datos-field datos-field-tipo">
                      <label htmlFor="dp-tipodoc">Tipo de documento *</label>
                      <select
                        id="dp-tipodoc"
                        value={datosPersonales.tipoDocumento}
                        onChange={e => { updateDatos('tipoDocumento', e.target.value); updateDatos('documento', '') }}
                      >
                        {DOC_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="datos-field datos-field-doc">
                      <label htmlFor="dp-doc">Número de documento *</label>
                      <input
                        id="dp-doc"
                        type="text"
                        value={datosPersonales.documento}
                        onChange={e => {
                          const tipo = datosPersonales.tipoDocumento
                          const onlyDigits = ['CC', 'TI', 'NIT', 'RUT', 'DNI'].includes(tipo)
                          let val
                          if (tipo === 'CE') val = filterCEInput(e.target.value)
                          else if (onlyDigits) val = e.target.value.replace(/\D/g, '')
                          else val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                          const maxLen = DOC_TYPES.find(t => t.value === tipo)?.maxLen ?? 16
                          const trimmed = val.slice(0, maxLen)
                          updateDatos('documento', trimmed)
                          const isValid = trimmed.trim().length > 0 && !validateDocumento(tipo, trimmed)
                          maybeAdvanceScroll('dp_doc', isValid, dpMayorRef)
                        }}
                        placeholder={DOC_TYPES.find(t => t.value === datosPersonales.tipoDocumento)?.hint || 'Número de documento'}
                        autoComplete="off"
                        maxLength={DOC_TYPES.find(t => t.value === datosPersonales.tipoDocumento)?.maxLen ?? 16}
                      />
                      {datosPersonales.documento.trim() && validateDocumento(datosPersonales.tipoDocumento, datosPersonales.documento) && (
                        <span className="datos-field-error">
                          <i className="fas fa-exclamation-circle" /> {validateDocumento(datosPersonales.tipoDocumento, datosPersonales.documento)}
                        </span>
                      )}
                    </div>
                  </div>

                  <label
                    className="datos-mayor-label"
                    ref={dpMayorRef}
                    onClick={() => {
                      const next = !datosPersonales.esMayorDeEdad
                      updateDatos('esMayorDeEdad', next)
                      maybeAdvanceScroll('dp_mayor', next, sidebarActionsRef)
                    }}
                  >
                    <div className={`datos-checkbox ${datosPersonales.esMayorDeEdad ? 'checked' : ''}`}>
                      <i className={datosPersonales.esMayorDeEdad ? 'fas fa-check-square' : 'far fa-square'} />
                    </div>
                    <span>Confirmo que soy mayor de edad (18 años o más)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ===== STEP 4: CONFIRMAR ===== */}
            {currentStep === 4 && (
              <div className="confirm-component">
                <h3 className="selection-title">Confirma tu Reserva</h3>

                {/* Summary */}
                <div className="confirm-details">
                  <div className="confirm-row">
                    <span className="confirm-label"><i className="far fa-calendar-alt" /> Fecha</span>
                    <span className="confirm-value">{formatSelectedDate()}</span>
                  </div>

                  {pistaSelection.map(({ pista, horas }) => (
                    <div key={pista} className="confirm-pista-block">
                      <div className="confirm-row">
                        <span className="confirm-label"><i className="fas fa-bowling-ball" /> Pista {pista}</span>
                        <span className="confirm-value">{horas.length} hora{horas.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="confirm-horas-list">
                        {horas.map(h => <span key={h} className="confirm-hora-tag">{h}</span>)}
                      </div>
                    </div>
                  ))}

                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-users" /> Personas</span>
                    <span className="confirm-value">
                      {personas}{addJugadorExtra ? ` + ${pistaSelection.length} adicional(es)` : ''} ({totalPersonas} total)
                    </span>
                  </div>
                  <div className="confirm-divider" />

                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-user" /> Responsable</span>
                    <span className="confirm-value">{datosPersonales.nombre}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-phone" /> Teléfono</span>
                    <span className="confirm-value">{datosPersonales.codigoPais} {datosPersonales.telefono}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-envelope" /> Correo</span>
                    <span className="confirm-value">{datosPersonales.correo}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-birthday-cake" /> Cumpleaños</span>
                    <span className="confirm-value">{datosPersonales.fechaNacimiento || '—'}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label"><i className="fas fa-id-card" /> Documento</span>
                    <span className="confirm-value">{datosPersonales.tipoDocumento} {datosPersonales.documento}</span>
                  </div>
                  <div className="confirm-divider" />

                  <div className="confirm-row">
                    <span className="confirm-label">
                      {promo2x1Active
                        ? `${totalHorasReservadas} hora${totalHorasReservadas > 1 ? 's' : ''} → pagas ${horasFacturables}`
                        : `${pistaSelection.length} pista${pistaSelection.length > 1 ? 's' : ''} × ${totalHorasReservadas} hora${totalHorasReservadas > 1 ? 's' : ''}`
                      }
                      {' '}({isWeekendOrHoliday(selectedDate, holidaysSet) ? 'Vie-Dom/Fest.' : 'Lun-Jue'})
                      {promoLabel && <span className="confirm-promo-tag">{promoLabel}</span>}
                    </span>
                    <span className="confirm-value">
                      {promo2x1Active && (
                        <span className="confirm-old-price">{formatPrice(totalSinDescuento2x1)}</span>
                      )}
                      {!promo2x1Active && activePromo && precioPista !== precioPistaBase && (
                        <span className="confirm-old-price">{formatPrice(precioPistaBase * totalHorasReservadas)}</span>
                      )}
                      {formatPrice(totalPistasCost)}
                    </span>
                  </div>
                  {promo2x1Active && (
                    <div className="confirm-savings-row">
                      <i className="fas fa-tag" />
                      <span>¡Ahorras {formatPrice(totalSinDescuento2x1 - totalPistasCost)} con la promoción 2×1!</span>
                    </div>
                  )}
                  {addZapatos && (
                    <div className="confirm-row">
                      <span className="confirm-label">Zapatos y Medias × {zapatosCobroQty}{horasSinZapatos > 0 ? ` (restan ${horasSinZapatos}h presencial)` : ''}</span>
                      <span className="confirm-value">{formatPrice(precioZapatos)}</span>
                    </div>
                  )}
                  {addJugadorExtra && (
                    <div className="confirm-row">
                      <span className="confirm-label">Jugador Adicional × {pistaSelection.length}</span>
                      <span className="confirm-value">{formatPrice(precioJugador)}</span>
                    </div>
                  )}
                  <div className="confirm-divider" />
                  <div className="confirm-row confirm-total-row">
                    <span className="confirm-label">TOTAL</span>
                    <span className="confirm-value confirm-total">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Conditions */}
                <div className="confirm-conditions">
                  <h4 className="conditions-title">
                    <i className="fas fa-info-circle" /> Condiciones de Reserva
                  </h4>
                  <ul className="conditions-list">
                    {CONDICIONES.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>

                {/* Terms checkbox */}
                <label className="confirm-terms-label" onClick={() => setAcceptTerms(v => !v)}>
                  <div className={`terms-checkbox ${acceptTerms ? 'checked' : ''}`}>
                    <i className={acceptTerms ? 'fas fa-check-square' : 'far fa-square'} />
                  </div>
                  <span className="terms-text">
                    Acepto los{' '}
                    <a href="/docs/Terminos y Condiciones La Industria Bolera.docx" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      Términos y Condiciones
                    </a>.
                  </span>
                </label>

                {/* Payment info */}
                <div className="confirm-payment-info">
                  <i className="fas fa-shield-alt" />
                  <p>El pago se procesa de forma segura a través de <strong>PlaceToPay</strong>. Al continuar serás redirigido a la pasarela de pagos.</p>
                </div>

                {/* Pay button */}
                <button
                  className="confirm-btn confirm-btn-pay"
                  disabled={!acceptTerms || paying}
                  onClick={handlePay}
                >
                  {paying ? (
                    <>
                      <i className="fas fa-spinner fa-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock" />
                      Pagar {formatPrice(totalPrice)}
                    </>
                  )}
                </button>

                <p className="confirm-whatsapp-note">
                  <i className="fab fa-whatsapp" /> Una vez confirmado el pago, recibirás la confirmación de tu reserva por WhatsApp al número registrado.
                </p>
              </div>
            )}
          </div>

          {/* ===== SIDEBAR ===== */}
          <aside className="reservas-sidebar">
            <div className="sidebar-card">
              <h3 className="sidebar-title">Resumen de Reserva</h3>

              {/* Mobile: continuar antes del resumen */}
              {isMobile && currentStep < STEPS.length - 1 && (
                <div className="sidebar-actions sidebar-actions-top">
                  <button className="sidebar-btn sidebar-btn-next" onClick={goNext} disabled={!canContinue()}>
                    Continuar
                  </button>
                </div>
              )}

              <div className="sidebar-section">
                <div className="sidebar-date-badge">
                  <i className="far fa-calendar-alt" />
                  <div>
                    <span className="sidebar-date-label">Fecha Seleccionada:</span>
                    <span className="sidebar-date-value">{formatShortDate()}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-divider" />

              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Detalles</h4>
                {pistaSelection.length === 0 ? (
                  <div className="sidebar-detail">
                    <span className="sidebar-detail-label">Pistas</span>
                    <span className="sidebar-detail-value">—</span>
                  </div>
                ) : (
                  pistaSelection.map(({ pista, horas }) => (
                    <div key={pista} className="sidebar-detail">
                      <span className="sidebar-detail-label">Pista {pista}</span>
                      <span className="sidebar-detail-value">{horas.length > 0 ? horas.join(', ') : 'Sin hora'}</span>
                    </div>
                  ))
                )}
                <div className="sidebar-detail">
                  <span className="sidebar-detail-label">Personas</span>
                  <span className="sidebar-detail-value">{totalPersonas}</span>
                </div>
                {datosPersonales.nombre && (
                  <div className="sidebar-detail">
                    <span className="sidebar-detail-label">Responsable</span>
                    <span className="sidebar-detail-value sidebar-detail-truncate">{datosPersonales.nombre}</span>
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              {selectedDate && (
                <>
                  <div className="sidebar-divider" />
                  <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Precio</h4>
                    <div className="sidebar-detail">
                      <span className="sidebar-detail-label">
                        Pistas ({totalHorasReservadas}h{promo2x1Active ? ` → ${horasFacturables}h` : ''})
                      </span>
                      <span className="sidebar-detail-value">
                        {promo2x1Active && <span className="sidebar-old-price">{formatPrice(totalSinDescuento2x1)}</span>}
                        {formatPrice(totalPistasCost)}
                      </span>
                    </div>
                    {promo2x1Active && (
                      <div className="sidebar-detail sidebar-promo-badge">
                        <span>2×1 aplicado</span>
                      </div>
                    )}
                    {addZapatos && (
                      <div className="sidebar-detail">
                        <span className="sidebar-detail-label">Zapatos × {zapatosCobroQty}</span>
                        <span className="sidebar-detail-value">{formatPrice(precioZapatos)}</span>
                      </div>
                    )}
                    {addJugadorExtra && (
                      <div className="sidebar-detail">
                        <span className="sidebar-detail-label">+1 Jugador × {pistaSelection.length}</span>
                        <span className="sidebar-detail-value">{formatPrice(precioJugador)}</span>
                      </div>
                    )}
                    <div className="sidebar-detail sidebar-total">
                      <span className="sidebar-detail-label">Total</span>
                      <span className="sidebar-detail-value">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="sidebar-actions" ref={sidebarActionsRef}>
                {currentStep > 0 && (
                  <button className="sidebar-btn sidebar-btn-back" onClick={goBack}>
                    Volver
                  </button>
                )}
                {currentStep < STEPS.length - 1 && (
                  <button className="sidebar-btn sidebar-btn-next" onClick={goNext} disabled={!canContinue()}>
                    Continuar
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
