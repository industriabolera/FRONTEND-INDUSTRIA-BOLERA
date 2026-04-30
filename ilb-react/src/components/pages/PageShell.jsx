import './PageShell.css'

export default function PageShell({ title, subtitle, children }) {
  return (
    <section className="page-shell">
      <div className="page-shell-bg" />
      <div className="page-shell-container">
        <header className="page-shell-header">
          <h1 className="page-shell-title">{title}</h1>
          {subtitle && <p className="page-shell-subtitle">{subtitle}</p>}
        </header>

        <div className="page-shell-body">
          {children}
        </div>
      </div>
    </section>
  )
}

