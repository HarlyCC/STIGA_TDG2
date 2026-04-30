import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import JitsiMeeting from '../../components/shared/JitsiMeeting'
import client from '../../api/api'

const NIVEL_CFG = {
  Verde:    { label: 'Verde',    color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  Amarillo: { label: 'Amarillo', color: '#854d0e', bg: '#fefce8', dot: '#eab308' },
  Naranja:  { label: 'Naranja',  color: '#9a3412', bg: '#fff7ed', dot: '#f97316' },
  Rojo:     { label: 'Rojo',     color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
}

function normalizeCita(c) {
  return {
    id: c.id,
    pacienteNombre: c.paciente_nombre || c.paciente_email,
    pacienteCedula: c.paciente_cedula || '',
    status: c.status,
    fechaSolicitadaISO: c.fecha_solicitada,
    horaSlot: c.hora_solicitada,
    fechaConfirmadaISO: c.fecha_confirmada,
    horaConfirmada: c.hora_confirmada,
    triaje: c.triage_color ? {
      nivel: NIVEL_CFG[c.triage_color] ?? null,
      sintomas: c.triaje_sintomas || '',
      fecha: c.triaje_fecha ? c.triaje_fecha.split('T')[0] : '',
    } : null,
  }
}

function formatDateLong(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DoctorTeleconsultations() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendientes')
  const [aceptandoId, setAceptandoId] = useState(null)
  const [cancelandoId, setCancelandoId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState(null)

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const loadCitas = useCallback(() => {
    setLoading(true)
    client.get('/medico/citas')
      .then(({ data }) => setCitas(data.map(normalizeCita)))
      .catch((e) => { console.error('Error cargando citas:', e) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadCitas() }, [loadCitas])

  const handleLogout = () => { logout(); navigate('/login') }

  const pendientes = citas.filter(c => c.status === 'pendiente')
  const confirmadas = citas.filter(c => c.status === 'confirmada')
  const rechazadas = citas.filter(c => c.status === 'rechazada')

  const handleAbrirAceptar = (id) => setAceptandoId(id)
  const handleCancelarAceptar = () => setAceptandoId(null)

  const handleConfirmarAceptar = async (id) => {
    setSubmitting(true)
    try {
      await client.put(`/medico/citas/${id}/status`, { status: 'confirmada' })
      loadCitas()
      setAceptandoId(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async (id) => {
    await client.put(`/medico/citas/${id}/status`, { status: 'rechazada' })
    loadCitas()
  }

  const handleCancelar = async (id) => {
    setSubmitting(true)
    try {
      await client.put(`/medico/citas/${id}/status`, { status: 'cancelada' })
      loadCitas()
      setCancelandoId(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleIniciarLlamada = async (cita) => {
    try { await client.put(`/medico/citas/${cita.id}/llamada`, { en_llamada: true }) } catch {}
    setActiveMeeting(cita)
  }

  const handleCerrarLlamada = async () => {
    if (activeMeeting) {
      try { await client.put(`/medico/citas/${activeMeeting.id}/llamada`, { en_llamada: false }) } catch {}
    }
    setActiveMeeting(null)
  }

  const nivelBadge = (nivel) => {
    if (!nivel) return null
    return (
      <span style={{
        background: nivel.bg, color: nivel.color,
        fontSize: '0.7rem', fontWeight: '700',
        padding: '0.15rem 0.55rem', borderRadius: '20px', flexShrink: 0,
      }}>
        {nivel.label}
      </span>
    )
  }

  const tabCounts = { pendientes: pendientes.length, confirmadas: confirmadas.length, rechazadas: rechazadas.length }
  const currentList = tab === 'pendientes' ? pendientes : tab === 'confirmadas' ? confirmadas : rechazadas


  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#f4f6f8',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          cursor: pointer; color: rgba(255,255,255,0.5);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
        .nav-item.active { background: rgba(122,200,150,0.12); color: #7ac896; border-color: rgba(122,200,150,0.15); }
        .logout-btn {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
          background: none; border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4); font-size: 0.85rem; cursor: pointer;
          transition: all 0.18s ease;
        }
        .logout-btn:hover { background: rgba(220,50,50,0.1); border-color: rgba(220,50,50,0.2); color: #ff8080; }
        .tab-btn {
          padding: 0.5rem 1.1rem; border-radius: 20px;
          border: 1.5px solid #e2e8ee; background: white;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          color: #3a4a3e; transition: all 0.18s ease; font-family: inherit;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .tab-btn:hover { border-color: #3d7a5a; color: #3d7a5a; }
        .tab-btn.active { background: #1a3a2e; border-color: #1a3a2e; color: white; }
        .cita-card {
          background: white; border: 1px solid #edf0ec;
          border-radius: 14px; overflow: hidden;
          transition: all 0.2s ease;
        }
        .cita-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); border-color: #d0dcd4; }
        .btn-accept {
          display: flex; align-items: center; gap: 0.4rem;
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          color: white; border: none; border-radius: 10px;
          padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease; font-family: inherit;
        }
        .btn-accept:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,58,46,0.3); }
        .btn-reject {
          background: none; border: 1.5px solid #fecaca; color: #dc2626;
          border-radius: 10px; padding: 0.5rem 1rem;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.18s ease; font-family: inherit;
        }
        .btn-reject:hover { background: #fef2f2; }
        .slot-chip {
          padding: 0.45rem 0.7rem; border-radius: 8px;
          font-size: 0.82rem; font-weight: 600;
          border: 1.5px solid #e2e8ee; background: white;
          cursor: pointer; transition: all 0.15s ease; font-family: inherit;
          color: #1a2e1a;
        }
        .slot-chip:hover { border-color: #3d7a5a; color: #3d7a5a; }
        .slot-chip.avail { background: #f0fdf4; border-color: #86efac; color: #15803d; }
        .slot-chip.sel-avail { background: #1a3a2e; border-color: #1a3a2e; color: white; }
        .date-chip {
          flex: 1; padding: 0.65rem 0.4rem; border-radius: 10px;
          border: 1.5px solid #e2e8ee; background: white;
          cursor: pointer; transition: all 0.18s ease;
          display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
          font-family: inherit; min-width: 0;
        }
        .date-chip:hover { border-color: #3d7a5a; }
        .date-chip.selected { background: #1a3a2e; border-color: #1a3a2e; }
        .date-chip:disabled { opacity: 0.35; cursor: not-allowed; }
        .stat-card {
          background: white; border: 1px solid #edf0ec;
          border-radius: 14px; padding: 1.1rem 1.4rem;
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '1.75rem 1.25rem',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '2.5rem', paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '2px' }}>STIGA</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Panel médico</p>
          </div>
        </div>

        {/* Usuario */}
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
          borderRadius: '12px', marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #2e6fa0, #3d7a5a)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '0.6rem',
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
              {user?.name?.charAt(0)}
            </span>
          </div>
          <p style={{ margin: '0 0 0.1rem', color: 'white', fontSize: '0.88rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>Médico general</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 0.5rem 0.5rem', color: 'rgba(255,255,255,0.25)',
            fontSize: '0.7rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>Menú</p>
          <div className="nav-item" onClick={() => navigate('/medico')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Cola de triajes
          </div>
          <div className="nav-item" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Historia clínica
            <span style={{
              marginLeft: 'auto', fontSize: '0.65rem',
              background: 'rgba(232,160,32,0.15)', color: '#e8a020',
              padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600',
            }}>Pronto</span>
          </div>
          <div className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Teleconsultas
            {pendientes.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem',
                background: 'rgba(220,38,38,0.15)', color: '#ef4444',
                padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '700',
              }}>{pendientes.length}</span>
            )}
          </div>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* ── Contenido ── */}
      <main style={{
        marginLeft: '240px', flex: 1,
        padding: '2.5rem 2.5rem 5rem',
        width: '100%', height: '100vh', overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '2rem', animation: mounted ? 'fadeInUp 0.5s ease' : 'none',
        }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', color: '#7a9080', fontSize: '0.9rem' }}>Panel médico</p>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#0f2318' }}>
              Teleconsultas
            </h1>
            <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.88rem' }}>
              Gestiona solicitudes y administra tu disponibilidad
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem', marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.1s both' : 'none',
        }}>
          {[
            { label: 'Pendientes', value: pendientes.length, color: '#d97706' },
            { label: 'Confirmadas', value: confirmadas.length, color: '#15803d' },
            { label: 'Rechazadas', value: rechazadas.length, color: '#6a8070' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: '700', color: '#8aaa8a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {s.label}
              </p>
              <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Alerta pendientes */}
        {pendientes.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fde68a',
            borderRadius: '14px', padding: '0.9rem 1.5rem',
            marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
            animation: mounted ? 'fadeInUp 0.5s ease 0.15s both' : 'none',
          }}>
            <div style={{
              width: '8px', height: '8px', flexShrink: 0,
              background: '#f59e0b', borderRadius: '50%',
            }} />
            <p style={{ margin: 0, color: '#92400e', fontSize: '0.88rem', fontWeight: '600' }}>
              {pendientes.length} solicitud(es) de teleconsulta esperan tu respuesta
            </p>
          </div>
        )}

        {/* Layout 2 columnas */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr',
          gap: '1.25rem', alignItems: 'start',
          animation: mounted ? 'fadeInUp 0.5s ease 0.2s both' : 'none',
        }}>

          {/* ── Columna izquierda: solicitudes ── */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem' }}>
              {(['pendientes', 'confirmadas', 'rechazadas']).map(t => (
                <button
                  key={t}
                  className={`tab-btn ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {tabCounts[t] > 0 && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '700',
                      background: tab === t ? 'rgba(255,255,255,0.2)' : '#f0f4f2',
                      color: tab === t ? 'white' : '#3a4a3e',
                      padding: '0.05rem 0.4rem', borderRadius: '10px',
                    }}>
                      {tabCounts[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loading ? (
                <p style={{ textAlign: 'center', color: '#aabcb0', fontSize: '0.9rem', padding: '3rem 0' }}>
                  Cargando citas…
                </p>
              ) : currentList.length === 0 ? (
                <div style={{
                  background: 'white', border: '1px solid #edf0ec',
                  borderRadius: '14px', padding: '3rem',
                  textAlign: 'center',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d0dcd4" strokeWidth="1.5" style={{ marginBottom: '0.75rem' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.9rem' }}>
                    {tab === 'pendientes'
                      ? 'No hay solicitudes pendientes. Cuando un paciente solicite una teleconsulta, aparecerá aquí.'
                      : tab === 'confirmadas'
                      ? 'No hay citas confirmadas aún.'
                      : 'No hay solicitudes rechazadas.'}
                  </p>
                </div>
              ) : null}
              {!loading && currentList.map(cita => (
                <div key={cita.id} className="cita-card"
                  style={{ borderLeft: `4px solid ${cita.triaje?.nivel?.dot ?? '#aabcb0'}` }}>
                  {/* Cabecera */}
                  <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '44px', height: '44px', flexShrink: 0,
                      background: cita.triaje?.nivel?.bg ?? '#f4f6f8',
                      borderRadius: '12px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1rem', fontWeight: '700',
                      color: cita.triaje?.nivel?.color ?? '#3a4a3e',
                    }}>
                      {(cita.pacienteNombre ?? '?').charAt(0)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.95rem' }}>
                          {cita.pacienteNombre}
                        </p>
                        {nivelBadge(cita.triaje?.nivel)}
                        <span style={{
                          fontSize: '0.7rem', fontWeight: '600', color: '#aabcb0',
                          background: '#f4f6f8', padding: '0.1rem 0.5rem', borderRadius: '8px',
                        }}>
                          {cita.id}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.2rem', color: '#3a4a3e', fontSize: '0.84rem', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: '600', color: '#7a9080' }}>Triaje {cita.triaje?.fecha}: </span>
                        {cita.triaje?.sintomas}
                      </p>
                      <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.77rem' }}>
                        Solicitado: {cita.fechaSolicitadaISO ? formatDateLong(cita.fechaSolicitadaISO) : '—'} · {cita.horaSlot}
                      </p>
                    </div>

                    {/* Badge estado */}
                    {cita.status !== 'pendiente' && (
                      <span style={{
                        flexShrink: 0,
                        fontSize: '0.72rem', fontWeight: '700',
                        padding: '0.2rem 0.65rem', borderRadius: '20px',
                        background: cita.status === 'confirmada' ? '#f0fdf4' : '#fef2f2',
                        color: cita.status === 'confirmada' ? '#15803d' : '#dc2626',
                      }}>
                        {cita.status === 'confirmada' ? 'Confirmada' : 'Rechazada'}
                      </span>
                    )}
                  </div>

                  {/* Acciones para confirmadas */}
                  {cita.status === 'confirmada' && cancelandoId !== cita.id && (
                    <div style={{ padding: '0 1.25rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-reject"
                        onClick={() => setCancelandoId(cita.id)}
                      >
                        Cancelar cita
                      </button>
                      <button
                        onClick={() => handleIniciarLlamada(cita)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
                          color: 'white', border: 'none', borderRadius: '10px',
                          padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: '700',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"/>
                          <rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                        Iniciar teleconsulta
                      </button>
                    </div>
                  )}

                  {/* Confirmación cancelar inline */}
                  {cita.status === 'confirmada' && cancelandoId === cita.id && (
                    <div style={{
                      margin: '0 1.25rem 1.1rem',
                      background: '#fff5f5', borderRadius: '12px',
                      border: '1px solid #fecaca', padding: '1rem 1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#dc2626', fontWeight: '600' }}>
                        ¿Confirmas la cancelación de esta cita?
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setCancelandoId(null)}
                          style={{
                            background: 'none', border: '1.5px solid #d0dcd4', borderRadius: '8px',
                            padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: '600',
                            color: '#3a4a3e', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Volver
                        </button>
                        <button
                          className="btn-reject"
                          disabled={submitting}
                          style={{ opacity: submitting ? 0.6 : 1 }}
                          onClick={() => handleCancelar(cita.id)}
                        >
                          Sí, cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fecha confirmada */}
                  {cita.status === 'confirmada' && cita.fechaConfirmadaISO && (
                    <div style={{
                      margin: '0 1.25rem 1rem', padding: '0.65rem 1rem',
                      background: '#f0fdf4', borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p style={{ margin: 0, color: '#15803d', fontSize: '0.82rem', fontWeight: '600' }}>
                        {formatDateLong(cita.fechaConfirmadaISO)} a las {cita.horaConfirmada}
                      </p>
                    </div>
                  )}

                  {/* Acciones para pendientes */}
                  {cita.status === 'pendiente' && aceptandoId !== cita.id && (
                    <div style={{
                      padding: '0 1.25rem 1.1rem',
                      display: 'flex', gap: '0.5rem', justifyContent: 'flex-end',
                    }}>
                      <button className="btn-reject" onClick={() => handleRechazar(cita.id)}>
                        Rechazar
                      </button>
                      <button className="btn-accept" onClick={() => handleAbrirAceptar(cita.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Aceptar
                      </button>
                    </div>
                  )}

                  {/* Panel de aceptación inline */}
                  {cita.status === 'pendiente' && aceptandoId === cita.id && (
                    <div style={{
                      margin: '0 1.25rem 1.1rem',
                      background: '#f0fdf4', borderRadius: '12px',
                      border: '1px solid #bbf7d0', padding: '1rem 1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#15803d', fontWeight: '600' }}>
                        Confirmar para {formatDateLong(cita.fechaSolicitadaISO)} a las {cita.horaSlot}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleCancelarAceptar}
                          style={{
                            background: 'none', border: '1.5px solid #d0dcd4', borderRadius: '8px',
                            padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: '600',
                            color: '#3a4a3e', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn-accept"
                          disabled={submitting}
                          style={{ opacity: submitting ? 0.6 : 1 }}
                          onClick={() => handleConfirmarAceptar(cita.id)}
                        >
                          Confirmar cita
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


        </div>
      </main>

      {activeMeeting && (
        <JitsiMeeting
          roomId={`stiga-cita-${activeMeeting.id}`}
          displayName={user?.name ?? 'Médico'}
          pacienteNombre={activeMeeting.pacienteNombre}
          pacienteCedula={activeMeeting.pacienteCedula}
          nivelLabel={activeMeeting.triaje?.nivel?.label}
          nivelColor={activeMeeting.triaje?.nivel?.dot}
          isDoctor
          onClose={handleCerrarLlamada}
        />
      )}
    </div>
  )
}
