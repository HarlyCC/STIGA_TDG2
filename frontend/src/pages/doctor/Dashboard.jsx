import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import JitsiMeeting from '../../components/shared/JitsiMeeting'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import client from '../../api/api'

const COLOR_CONFIG = {
  Rojo:     { color: '#dc2626', bg: '#fef2f2', dot: '#ef4444' },
  Naranja:  { color: '#c2410c', bg: '#fff7ed', dot: '#f97316' },
  Amarillo: { color: '#d97706', bg: '#fefce8', dot: '#f59e0b' },
  Verde:    { color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
}

function formatHora(timestamp) {
  if (!timestamp) return '—'
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `Hace ${diff} min`
  const h = Math.floor(diff / 60)
  return `Hace ${h} hora${h > 1 ? 's' : ''}`
}

function mapRecord(r) {
  const cfg = COLOR_CONFIG[r.triage_color] || COLOR_CONFIG['Verde']
  return {
    id:          r.id ?? r.session_id,
    citaId:      r.cita_id ?? null,
    roomToken:   r.room_token ?? null,
    nombre:      r.nombre || 'Sin nombre',
    cedula:      r.cedula || '—',
    telefono:    r.telefono || '—',
    eps:         r.eps || '—',
    edad:        r.age ?? '—',
    genero:      r.gender,
    municipio:   r.ciudad || '—',
    hora:        formatHora(r.timestamp),
    timestamp:   r.timestamp,
    nivel:       { label: r.triage_color || 'Verde', ...cfg },
    sintomas:    r.symptoms || '—',
    severidad:   r.symptom_severity ?? 0,
    transporte:  !!r.tiene_transporte,
    ambulancia:  !!r.necesita_ambulancia,
    // Signos vitales
    fc:          r.heart_rate,
    pas:         r.systolic_bp,
    spo2:        r.o2_sat,
    temp:        r.body_temp,
    glucosa:     r.glucose,
    colesterol:  r.cholesterol,
    frResp:      r.respiratory_rate,
    dolor:       r.pain_scale,
    duracion:    r.symptom_duration,
    confianza:   r.confianza,
    escalado:    !!r.escalado,
  }
}

export default function DoctorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [loadingId, setLoadingId] = useState(null)
  const [transitPaciente, setTransitPaciente] = useState(null)
  const [activePaciente, setActivePaciente] = useState(null)
  const [pacientes, setPacientes] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState(false)
  const [errorConsulta, setErrorConsulta] = useState('')
  const [fichaAbierta, setFichaAbierta] = useState(null)

  const fetchPacientes = () => {
    setLoadingData(true)
    setErrorData(false)
    client.get('/medico/pacientes')
      .then(({ data }) => { setPacientes((data.items ?? data).map(mapRecord)); setErrorData(false) })
      .catch(() => setErrorData(true))
      .finally(() => setLoadingData(false))
  }

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    fetchPacientes()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPacientes() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleIniciarConsulta = async (e, paciente) => {
    e.stopPropagation()
    if (showMeeting) { return }
    if (loadingId) return
    setLoadingId(paciente.id)
    try {
      await client.put(`/medico/citas/${paciente.citaId}/llamada`, { en_llamada: true })
      setActivePaciente(paciente)
      setLoadingId(null)
      setTransitPaciente(paciente)
      setTimeout(() => { setTransitPaciente(null); setShowMeeting(true) }, 2000)
    } catch (err) {
      setLoadingId(null)
      setErrorConsulta('No se pudo iniciar la consulta. Verifica tu conexión e intenta de nuevo.')
      setTimeout(() => setErrorConsulta(''), 5000)
    }
  }

  const filtrados = filtro === 'todos'
    ? pacientes
    : pacientes.filter(p => p.nivel.label.toLowerCase() === filtro)

  const stats = [
    { label: 'Total',          value: pacientes.length,                                                color: '#1a3a2e' },
    { label: 'Urgentes',       value: pacientes.filter(p => p.nivel.label === 'Amarillo').length,      color: '#d97706' },
    { label: 'Sin transporte', value: pacientes.filter(p => !p.transporte).length,                     color: '#b45309' },
    { label: 'Con ambulancia', value: pacientes.filter(p => !p.transporte && p.severidad >= 7).length, color: '#15803d' },
  ]

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#f4f6f8'
    }}>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
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
        .filtro-btn {
          padding: 0.45rem 1rem; border-radius: 20px;
          border: 1.5px solid #e2e8ee; background: white;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          color: #3a4a3e; transition: all 0.18s ease;
        }
        .filtro-btn:hover { border-color: #3d7a5a; color: #3d7a5a; }
        .filtro-btn.active { background: #1a3a2e; border-color: #1a3a2e; color: white; }
        .paciente-card {
          background: white; border: 1px solid #edf0ec;
          border-radius: 14px; padding: 1.25rem 1.5rem;
          transition: all 0.2s ease;
        }
        .paciente-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); border-color: #d0dcd4; }
        .btn-consulta {
          display: flex; align-items: center; gap: 0.4rem;
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          color: white; border: none; border-radius: 10px;
          padding: 0.55rem 1.1rem; font-size: 0.82rem;
          font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-consulta:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,58,46,0.3); }
        .btn-outline-sm {
          background: none; border: 1.5px solid #e2e8ee;
          border-radius: 8px; padding: 0.45rem 0.9rem;
          font-size: 0.8rem; font-weight: 600; color: #3a4a3e;
          cursor: pointer; transition: all 0.18s ease;
        }
        .btn-outline-sm:hover { border-color: #3d7a5a; color: #3d7a5a; }
        .stat-card {
          background: white; border: 1px solid #edf0ec;
          border-radius: 14px; padding: 1.1rem 1.4rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes btnPulseCritico {
          0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45), 0 6px 16px rgba(26,58,46,0.3); }
          50%      { box-shadow: 0 0 0 7px rgba(220,38,38,0), 0 6px 16px rgba(26,58,46,0.3); }
        }
        @keyframes transitFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes transitCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotsMove {
          0%,80%,100% { transform: translateY(0); opacity: 0.35; }
          40%          { transform: translateY(-9px); opacity: 1; }
        }
        .btn-consulta-critico { animation: btnPulseCritico 2s ease-in-out infinite; }
        .btn-consulta:disabled { opacity: 0.72; cursor: not-allowed; transform: none !important; box-shadow: none !important; animation: none !important; }
        .btn-spinner {
          width: 13px; height: 13px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '1.75rem 1.25rem',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '2.5rem', paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #2e6fa0, #3d7a5a)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '0.6rem'
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
            fontSize: '0.7rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>
          <div className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Cola de triajes
          </div>
          <div className="nav-item" onClick={() => navigate('/medico/teleconsultas')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Teleconsultas
          </div>
          <div className="nav-item" onClick={() => navigate('/medico/perfil')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Mi perfil
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
        padding: '2.5rem 2.5rem 4rem',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s',
        width: '100%',
        height: '100vh',
        overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', animation: mounted ? 'fadeInUp 0.5s ease' : 'none' }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', color: '#7a9080', fontSize: '0.9rem' }}>Panel médico</p>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#0f2318' }}>
              {user?.name}
            </h1>
            <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.88rem' }}>
              Cola de triajes activa — {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.1s both' : 'none'
        }}>
          {stats.map(s => (
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


        {/* Filtros */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '1rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.2s both' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#0f2318' }}>
              Pacientes en espera
            </h2>
            <button
              onClick={fetchPacientes}
              disabled={loadingData}
              title="Actualizar lista"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.65rem', borderRadius: '8px',
                border: '1px solid #d1fae5', background: '#f0fdf4',
                color: '#15803d', fontSize: '0.75rem', fontWeight: '600',
                cursor: loadingData ? 'not-allowed' : 'pointer',
                opacity: loadingData ? 0.6 : 1, transition: 'all 0.18s'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: loadingData ? 'spin 0.8s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {loadingData ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['todos', 'amarillo', 'verde'].map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtro === f ? 'active' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de pacientes */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.25s both' : 'none'
        }}>
          {errorConsulta && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
              padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem',
              fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.5rem'
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errorConsulta}
            </div>
          )}
          {loadingData && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#aabcb0', fontSize: '0.9rem' }}>
              Cargando pacientes...
            </div>
          )}
          {!loadingData && errorData && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px',
              padding: '2rem', textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 0.75rem', color: '#991b1b', fontWeight: '600', fontSize: '0.9rem' }}>
                No se pudo cargar la lista de pacientes
              </p>
              <p style={{ margin: '0 0 1rem', color: '#b91c1c', fontSize: '0.83rem' }}>
                Verifica tu conexión e intenta de nuevo.
              </p>
              <button
                onClick={fetchPacientes}
                style={{
                  background: '#1a3a2e', color: 'white', border: 'none',
                  borderRadius: '8px', padding: '0.5rem 1.25rem',
                  fontSize: '0.83rem', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          {!loadingData && filtrados.map((p, i) => (
            <div
              key={p.id}
              className="paciente-card"
              style={{
                borderLeft: `4px solid ${p.nivel.dot}`,
                animation: mounted ? `fadeInUp 0.4s ease ${0.25 + i * 0.07}s both` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                {/* Avatar */}
                <div style={{
                  width: '44px', height: '44px', flexShrink: 0,
                  background: p.nivel.bg, borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: '700', color: p.nivel.color
                }}>
                  {p.nombre.charAt(0)}
                </div>

                {/* Info paciente */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.95rem' }}>
                      {p.nombre}
                    </p>
                    <span style={{
                      background: p.nivel.bg, color: p.nivel.color,
                      fontSize: '0.72rem', fontWeight: '700',
                      padding: '0.15rem 0.6rem', borderRadius: '20px'
                    }}>
                      {p.nivel.label}
                    </span>
                    {!p.transporte && (
                      <span style={{
                        background: '#fef3c7', color: '#92700a',
                        fontSize: '0.7rem', fontWeight: '600',
                        padding: '0.15rem 0.55rem', borderRadius: '20px'
                      }}>
                        Sin transporte
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 0.2rem', color: '#6a8070', fontSize: '0.84rem' }}>
                    {p.sintomas}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ color: '#aabcb0', fontSize: '0.77rem' }}>
                      {p.edad} años · {p.municipio}
                    </span>
                    <span style={{ color: '#aabcb0', fontSize: '0.77rem' }}>
                      {p.hora}
                    </span>
                  </div>
                </div>

                {/* Severidad */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: '#aabcb0', fontWeight: '600' }}>
                    SEVERIDAD
                  </p>
                  <p style={{
                    margin: 0, fontSize: '1.4rem', fontWeight: '800',
                    color: p.severidad >= 8 ? '#dc2626' : p.severidad >= 5 ? '#d97706' : '#15803d'
                  }}>
                    {p.severidad}/10
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn-outline-sm" onClick={() => setFichaAbierta(p)}>
                    Ver ficha
                  </button>
                  <button
                    className="btn-consulta"
                    onClick={(e) => handleIniciarConsulta(e, p)}
                    disabled={!!loadingId || !p.citaId}
                  >
                    {loadingId === p.id ? (
                      <>
                        <div className="btn-spinner" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"/>
                          <rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                        Iniciar consulta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loadingData && !errorData && filtrados.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '3rem',
              background: 'white', borderRadius: '14px',
              border: '1px solid #edf0ec'
            }}>
              <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.9rem' }}>
                {filtro === 'todos' ? 'No hay pacientes en espera' : `No hay pacientes con nivel ${filtro} en espera`}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Pantalla de transición ── */}
      {transitPaciente && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 490,
          background: 'linear-gradient(160deg, #050d08, #0f2318, #08162a)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          animation: 'transitFadeIn 0.35s ease',
          fontFamily: "'Segoe UI', -apple-system, sans-serif"
        }}>
          {/* Logo */}
          <div style={{
            width: '68px', height: '68px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '2.25rem',
            animation: 'transitCardIn 0.5s ease 0.05s both'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Tarjeta del paciente */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '22px', padding: '2rem 3rem',
            textAlign: 'center', marginBottom: '2.5rem',
            animation: 'transitCardIn 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.12s both',
            minWidth: '300px'
          }}>
            <p style={{
              margin: '0 0 0.3rem', color: 'rgba(255,255,255,0.35)',
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600'
            }}>
              Conectando con
            </p>
            <h2 style={{ margin: '0 0 1rem', color: 'white', fontSize: '1.6rem', fontWeight: '800' }}>
              {transitPaciente.nombre}
            </h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              background: `${transitPaciente.nivel.dot}20`,
              color: transitPaciente.nivel.dot,
              border: `1px solid ${transitPaciente.nivel.dot}38`,
              fontSize: '0.78rem', fontWeight: '700',
              padding: '0.35rem 1rem', borderRadius: '20px'
            }}>
              <div style={{
                width: '7px', height: '7px',
                background: transitPaciente.nivel.dot, borderRadius: '50%'
              }} />
              Nivel {transitPaciente.nivel.label} · {transitPaciente.municipio}
            </span>
          </div>

          {/* Puntos animados */}
          <div style={{
            display: 'flex', gap: '9px',
            animation: 'transitCardIn 0.4s ease 0.25s both'
          }}>
            {[0, 0.18, 0.36].map((d, i) => (
              <div key={i} style={{
                width: '10px', height: '10px',
                background: '#7ac896', borderRadius: '50%',
                animation: `dotsMove 1.4s ease-in-out ${d}s infinite`
              }} />
            ))}
          </div>
          <p style={{
            marginTop: '1.25rem', color: 'rgba(255,255,255,0.28)',
            fontSize: '0.82rem', animation: 'transitCardIn 0.4s ease 0.3s both'
          }}>
            Preparando sala de videollamada...
          </p>
        </div>
      )}

      {/* ── Jitsi Meeting ── */}
      {showMeeting && (
        <JitsiMeeting
          roomId={`stiga-cita-${activePaciente?.citaId}`}
          displayName={user?.name}
          pacienteNombre={activePaciente?.nombre}
          pacienteCedula={activePaciente?.cedula !== '—' ? activePaciente?.cedula : ''}
          nivelLabel={activePaciente?.nivel?.label}
          nivelColor={activePaciente?.nivel?.dot}
          isDoctor
          onClose={() => {
            setShowMeeting(false)
            if (activePaciente?.citaId) {
              client.put(`/medico/citas/${activePaciente.citaId}/llamada`, { en_llamada: false }).catch(() => {})
            }
          }}
        />
      )}

      {/* ── Modal ficha clínica ── */}
      {fichaAbierta && (
        <div
          onClick={() => setFichaAbierta(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '20px',
              width: '100%', maxWidth: '560px', maxHeight: '88vh',
              overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            {/* Cabecera */}
            <div style={{
              background: `linear-gradient(135deg, ${fichaAbierta.nivel.bg}, white)`,
              borderBottom: `3px solid ${fichaAbierta.nivel.dot}`,
              padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '20px 20px 0 0',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                  <div style={{ width: '10px', height: '10px', background: fichaAbierta.nivel.dot, borderRadius: '50%', boxShadow: `0 0 8px ${fichaAbierta.nivel.dot}` }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: '800', color: fichaAbierta.nivel.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Nivel {fichaAbierta.nivel.label}
                  </span>
                  {fichaAbierta.escalado && (
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '0.1rem 0.5rem' }}>
                      Escalado SIRS
                    </span>
                  )}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f2318' }}>{fichaAbierta.nombre}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7a9080' }}>
                  C.C. {fichaAbierta.cedula} · {fichaAbierta.municipio} · {fichaAbierta.hora}
                </p>
              </div>
              <button
                onClick={() => setFichaAbierta(null)}
                style={{ background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a4a3e" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Datos personales */}
              <section>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: '800', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos del paciente</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    ['Edad', fichaAbierta.edad !== '—' ? `${fichaAbierta.edad} años` : '—'],
                    ['Sexo', fichaAbierta.genero === 1 ? 'Masculino' : fichaAbierta.genero === 0 ? 'Femenino' : '—'],
                    ['Teléfono', fichaAbierta.telefono],
                    ['EPS', fichaAbierta.eps],
                    ['Transporte', fichaAbierta.transporte ? 'Sí' : 'No'],
                    ['Ambulancia', fichaAbierta.ambulancia ? 'Sí requerida' : 'No requerida'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: '#f8fafb', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
                      <p style={{ margin: 0, fontSize: '0.66rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>{l}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Signos vitales */}
              <section>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: '800', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '1px' }}>Signos vitales</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    ['FC', fichaAbierta.fc, 'lpm'],
                    ['PAS', fichaAbierta.pas, 'mmHg'],
                    ['SpO₂', fichaAbierta.spo2, '%'],
                    ['Temp.', fichaAbierta.temp, '°C'],
                    ['Glucosa', fichaAbierta.glucosa, 'mg/dL'],
                    ['Colesterol', fichaAbierta.colesterol, 'mg/dL'],
                    ['FR', fichaAbierta.frResp, 'rpm'],
                    ['Dolor', fichaAbierta.dolor, '/10'],
                    ['Duración sínt.', fichaAbierta.duracion, 'días'],
                  ].map(([l, v, u]) => (
                    <div key={l} style={{ background: '#f8fafb', borderRadius: '8px', padding: '0.55rem 0.8rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>{l}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
                        {v != null ? v : '—'}<span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '500' }}> {v != null ? u : ''}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Síntomas y evaluación */}
              <section>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: '800', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '1px' }}>Síntomas reportados</p>
                <div style={{ background: '#f8fafb', borderRadius: '8px', padding: '0.75rem 0.9rem', fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.55 }}>
                  {fichaAbierta.sintomas}
                </div>
              </section>

              {/* Resultado IA */}
              <section style={{ background: `${fichaAbierta.nivel.bg}`, border: `1px solid ${fichaAbierta.nivel.dot}30`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.68rem', fontWeight: '800', color: fichaAbierta.nivel.color, textTransform: 'uppercase', letterSpacing: '1px' }}>Resultado del triaje IA</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>NIVEL</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: fichaAbierta.nivel.color }}>{fichaAbierta.nivel.label}</p>
                  </div>
                  <div style={{ flex: 1, height: '1px', background: `${fichaAbierta.nivel.dot}30` }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>SEVERIDAD</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: fichaAbierta.nivel.color }}>{fichaAbierta.severidad}/10</p>
                  </div>
                  {fichaAbierta.confianza != null && (
                    <>
                      <div style={{ flex: 1, height: '1px', background: `${fichaAbierta.nivel.dot}30` }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>CONFIANZA</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: fichaAbierta.nivel.color }}>{Math.round(fichaAbierta.confianza * 100)}%</p>
                      </div>
                    </>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}