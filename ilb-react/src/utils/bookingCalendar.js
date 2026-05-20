import { buildHolidaysSet, toDateStr } from './adminReservasGrid'

export const CALENDAR_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const CALENDAR_DAYS_HEADER = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export function parseFechaToDate(fechaStr) {
  if (!fechaStr) return null
  const [y, m, d] = fechaStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function startOfCalendarDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function getCalendarDays(year, month) {
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

export function getHolidaysSetForYear(year) {
  return buildHolidaysSet([year - 1, year, year + 1])
}

export { toDateStr }
