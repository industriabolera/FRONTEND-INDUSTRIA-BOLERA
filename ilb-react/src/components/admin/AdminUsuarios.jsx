import { useEffect, useMemo, useState } from 'react'
import { useBolera } from '../../context/BoleraContext'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminUsuarios() {
  const { auth } = useBolera()
  const authHeaders = useMemo(() => (auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}), [auth?.token])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/admin/users', { headers: { ...authHeaders } })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d.error || String(r.status)))))
      .then(data => {
        setUsers(Array.isArray(data.users) ? data.users : [])
        if (!selected && data.users?.[0]?.username) setSelected(data.users[0].username)
        setError('')
      })
      .catch(e => setError(e.message || 'Error cargando usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!auth?.token) return
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token])

  const selectedUser = users.find(u => u.username === selected)

  const handleSave = async () => {
    if (!selected || !newPassword) return
    setSaving(true)
    setSaved(false)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ username: selected, newPassword }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
      setNewPassword('')
      setSaved(true)
      fetchUsers()
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      window.alert(e.message || e)
    } finally {
      setSaving(false)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="dash-loading">
        <i className="fas fa-spinner fa-spin" />
        <span>Cargando usuarios...</span>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <p className="admin-panel-desc">
          Cambia contraseñas de usuarios del portal. Solo el rol <strong>admin</strong> tiene acceso.
        </p>
        <button className="dash-refresh-btn" onClick={fetchUsers} title="Actualizar">
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {error && (
        <div className="dash-error">
          <i className="fas fa-exclamation-triangle" />
          <span>{error}</span>
          <button onClick={fetchUsers}>Reintentar</button>
        </div>
      )}

      <div className="admin-card admin-form-card">
        <div className="admin-form-row admin-form-row-2">
          <div className="admin-field">
            <label className="admin-field-label">Usuario</label>
            <select className="admin-input" value={selected} onChange={e => setSelected(e.target.value)}>
              {users.map(u => (
                <option key={u.username} value={u.username}>
                  {u.username} — {u.roleLabel || u.role}
                </option>
              ))}
            </select>
            {selectedUser && (
              <span className="admin-field-current">
                Última actualización: {formatDateTime(selectedUser.updatedAt)}
              </span>
            )}
          </div>

          <div className="admin-field">
            <label className="admin-field-label">Nueva contraseña</label>
            <div className="admin-input-group">
              <i className="fas fa-key" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowNewPassword(v => !v)}
                aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <i className={showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
              </button>
            </div>
            <span className="admin-field-current">
              Recomendación: comparte la clave por un canal seguro.
            </span>
          </div>
        </div>

        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving || !selected || newPassword.length < 6}>
            <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-key'} /> Guardar contraseña
          </button>
          {saved && <span className="admin-saved-msg"><i className="fas fa-check-circle" /> Contraseña actualizada</span>}
        </div>
      </div>
    </div>
  )
}

