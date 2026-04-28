import './ScheduleSection.css'

const schedule = [
  { day: 'L', hours: ['12m a', '10pm'] },
  { day: 'M', hours: ['12m a', '10pm'] },
  { day: 'Mi', hours: ['12m a', '10pm'] },
  { day: 'J', hours: ['12m a', '11pm'] },
  { day: 'V', hours: ['12m a', '11 pm'] },
  { day: 'S', hours: ['12m a', '11 pm'] },
  { day: 'D', hours: ['12m a', '9pm'] },
]

export default function ScheduleSection() {
  return (
    <section className="schedule-section">
      <div className="schedule-content">
        <p className="schedule-subtitle">NUESTROS</p>
        <h2 className="schedule-title">HORARIOS</h2>

        <div className="schedule-grid">
          {schedule.map((item, index) => (
            <div key={item.day} className={`schedule-day schedule-day-${index}`}>
              <div className="schedule-circle">
                <span className="schedule-day-letter">{item.day}</span>
              </div>
              <div className="schedule-hours">
                {item.hours.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < item.hours.length - 1 && <br />}
                  </span>
                ))}
              </div>
              <div className="schedule-divider">
                <span className="schedule-divider-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
