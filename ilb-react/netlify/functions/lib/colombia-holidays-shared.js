function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
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
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
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

const cache = new Map()

export function isWeekendOrHolidayColombia(fechaStr) {
  const year = Number(String(fechaStr).slice(0, 4))
  if (!cache.has(year)) {
    const set = new Set()
    getColombianHolidays(year).forEach(d => set.add(toDateStr(d)))
    cache.set(year, set)
  }
  const holidays = cache.get(year)
  if (holidays.has(fechaStr)) return true
  const [y, m, d] = fechaStr.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 || day === 5 || day === 6
}

export function parseFechaYmdLocal(fechaStr) {
  const [y, m, d] = String(fechaStr).split('-').map(Number)
  return new Date(y, m - 1, d)
}
