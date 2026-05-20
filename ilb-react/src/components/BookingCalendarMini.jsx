import { useMemo, useState, useEffect } from 'react'
import {
  CALENDAR_MONTHS,
  CALENDAR_DAYS_HEADER,
  getCalendarDays,
  getHolidaysSetForYear,
  parseFechaToDate,
  startOfCalendarDayLocal,
  toDateStr,
} from '../utils/bookingCalendar'
import './BookingCalendar.css'

/**
 * Calendario compacto (misma apariencia que reservas).
 * @param {{ value: string, onChange: (fecha: string) => void, allowPastDays?: boolean, showHoyButton?: boolean }} props
 */
export default function BookingCalendarMini({
  value,
  onChange,
  allowPastDays = true,
  showHoyButton = true,
}) {
  const today = useMemo(() => new Date(), [])
  const selectedDate = useMemo(() => parseFechaToDate(value), [value])

  const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? today.getMonth())
  const [viewYear, setViewYear] = useState(() => selectedDate?.getFullYear() ?? today.getFullYear())

  useEffect(() => {
    if (!selectedDate) return
    setViewMonth(selectedDate.getMonth())
    setViewYear(selectedDate.getFullYear())
  }, [value])

  const holidaysSet = useMemo(() => getHolidaysSetForYear(viewYear), [viewYear])
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  const calendarCanGoPrevMonth = useMemo(() => {
    if (allowPastDays) return true
    const firstOfView = startOfCalendarDayLocal(new Date(viewYear, viewMonth, 1))
    const todayStart = startOfCalendarDayLocal(today)
    return firstOfView.getTime() > todayStart.getTime()
  }, [allowPastDays, viewYear, viewMonth, today])

  const prevMonth = () => {
    if (!calendarCanGoPrevMonth) return
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else setViewMonth(m => m + 1)
  }

  const isToday = (day) =>
    day.currentMonth &&
    day.day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear()

  const isSelected = (day) => {
    if (!selectedDate || !day.currentMonth) return false
    return (
      day.day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() &&
      viewYear === selectedDate.getFullYear()
    )
  }

  const isPast = (day) => {
    if (allowPastDays || !day.currentMonth) return false
    const d = new Date(viewYear, viewMonth, day.day)
    return startOfCalendarDayLocal(d).getTime() < startOfCalendarDayLocal(today).getTime()
  }

  const handleDayClick = (day) => {
    if (!day.currentMonth || isPast(day)) return
    const d = new Date(viewYear, viewMonth, day.day)
    onChange(toDateStr(d))
  }

  const goHoy = () => {
    onChange(toDateStr(today))
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
  }

  return (
    <div className="calendar-component booking-calendar-mini">
      <div className="calendar-header">
        <h2 className="calendar-month-title">
          {CALENDAR_MONTHS[viewMonth].toUpperCase()} {viewYear}
        </h2>
        <div className="calendar-nav">
          {showHoyButton && (
            <button type="button" className="booking-calendar-mini-hoy" onClick={goHoy}>
              Hoy
            </button>
          )}
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={prevMonth}
            aria-label="Mes anterior"
            disabled={!calendarCanGoPrevMonth}
          >
            <i className="fas fa-chevron-left" />
          </button>
          <button type="button" className="calendar-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {CALENDAR_DAYS_HEADER.map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {calendarDays.map((day, idx) => {
          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
          const isHoliday = day.currentMonth && holidaysSet.has(dateKey)
          return (
            <button
              key={idx}
              type="button"
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

      <div className="calendar-holiday-legend booking-calendar-mini-legend">
        <span className="holiday-legend-dot" />
        <span>Festivo</span>
      </div>
    </div>
  )
}
