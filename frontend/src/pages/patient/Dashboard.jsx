import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import JitsiMeeting from '../../components/shared/JitsiMeeting'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import client from '../../api/api'

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [showMeeting, setShowMeeting] = useState(false)
  const [triajes, setTriajes] = useState([])
  const [citaConfirmada, setCitaConfirmada] = useState(null)

  const tips = [
    'Tomar entre 6 y 8 vasos de agua al día ayuda a prevenir infecciones y mejora la circulación.',
    'Lavarse las manos antes de comer reduce en un 50% el riesgo de enfermedades gastrointestinales.',
    'Dormir al menos 7 horas fortalece el sistema inmune y reduce el riesgo cardiovascular.',
    'Caminar 30 minutos diarios disminuye la presión arterial y mejora el estado de ánimo.',
    'Revisar su presión arterial una vez al mes es clave si tiene más de 40 años.',
  ]
  const tip = tips[new Date().getDay() % tips.length]

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    const h = new Date().getHours()
    if (h < 12) setGreeting('Buenos días')
    else if (h < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
    client.get('/medico/mis-triajes').then(({ data }) => setTriajes(data)).catch((e) => { console.error('Error cargando triajes:', e) })
    const loadCita = () => client.get('/medico/mis-citas')
      .then(({ data }) => {
        const confirmadas = data.filter(c => c.status === 'confirmada')
        setCitaConfirmada(confirmadas[0] ?? null)
      })
      .catch((e) => { console.error('Error cargando citas:', e) })
    loadCita()
    const interval = setInterval(loadCita, 5000)
    return () => { clearInterval(interval) }
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const formatFechaCorta = (iso) => {
    if (!iso) return '—'
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }
  const formatFechaLarga = (iso) => {
    if (!iso) return '—'
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })
  }

  const NIVEL_COLOR = {
    Verde:    { color: '#15803d', bg: '#f0fdf4' },
    Amarillo: { color: '#d97706', bg: '#fef3c7' },
    Naranja:  { color: '#c2410c', bg: '#fff7ed' },
    Rojo:     { color: '#dc2626', bg: '#fef2f2' },
  }

  const notificaciones = triajes.slice(0, 3).map((t, i) => {
    const fecha = t.timestamp
      ? new Date(t.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
      : 'reciente'
    return {
      id: t.id ?? i,
      tipo: 'sistema',
      texto: `Tu resultado de triaje del ${fecha} está disponible en Mis resultados.`,
      hora: t.timestamp ? new Date(t.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      leida: i > 0,
    }
  })

  const documentos = triajes.slice(0, 3).map((t, i) => {
    const fecha = t.timestamp
      ? new Date(t.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'
    const color = t.triage_color || 'Verde'
    return {
      id: t.id ?? i,
      nombre: `Resultado triaje — ${fecha}`,
      tipo: 'Triaje STIGA',
      fecha,
      nivel: { label: color, ...(NIVEL_COLOR[color] || NIVEL_COLOR.Verde) },
    }
  })

  const notiIcon = (tipo) => {
    if (tipo === 'medico') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2e6fa0" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    )
    if (tipo === 'cita') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d7a5a" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a5aa0" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    )
  }

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
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(61,122,90,0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(61,122,90,0); }
        }
        @keyframes pulseGreen {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          50%      { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
        }
        @keyframes bannerGlow {
          0%,100% { box-shadow: 0 4px 24px rgba(15,35,24,0.35), 0 0 0 1px rgba(34,197,94,0.06); }
          50%      { box-shadow: 0 4px 32px rgba(15,35,24,0.45), 0 0 0 1px rgba(34,197,94,0.14); }
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
        .doc-row {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.9rem 1.1rem; border-radius: 10px;
          border: 1px solid #edf0ec; background: white;
          transition: all 0.18s ease; cursor: pointer;
        }
        .doc-row:hover { border-color: #c8ddd0; box-shadow: 0 3px 12px rgba(0,0,0,0.06); transform: translateX(3px); }
        .fab {
          position: fixed; bottom: 2.5rem; right: 2.5rem;
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          border: none; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(26,58,46,0.4);
          animation: pulse 3s ease-in-out infinite;
          transition: transform 0.2s, box-shadow 0.2s; z-index: 200;
        }
        .fab:hover { transform: scale(1.1); box-shadow: 0 12px 32px rgba(26,58,46,0.5); }
        .fab:active { transform: scale(0.95); }
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
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Portal paciente</p>
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
            background: 'linear-gradient(135deg, #3d7a5a, #2e6fa0)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '0.6rem'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
              {user?.name?.charAt(0)}
            </span>
          </div>
          <p style={{ margin: '0 0 0.1rem', color: 'white', fontSize: '0.88rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>Paciente</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 0.5rem 0.5rem', color: 'rgba(255,255,255,0.25)',
            fontSize: '0.7rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>
          <div className="nav-item active" onClick={() => navigate('/paciente')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Inicio
          </div>
          <div className="nav-item" onClick={() => navigate('/paciente/chat')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01"/>
            </svg>
            Nuevo triaje
          </div>
          <div className="nav-item" onClick={() => navigate('/paciente/resultados')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Mis resultados
          </div>
          <div className="nav-item" onClick={() => navigate('/paciente/teleconsulta')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            Teleconsulta
          </div>
          <div className="nav-item" onClick={() => navigate('/paciente/perfil')}>
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
        padding: '2.5rem 2.5rem 6rem',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s',
        width: '100%',
        height: '100vh',
        overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', animation: mounted ? 'fadeInUp 0.5s ease' : 'none' }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', color: '#7a9080', fontSize: '0.9rem' }}>{greeting}</p>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#0f2318' }}>
              {user?.name}
            </h1>
            <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.88rem' }}>
              Este es tu resumen de atención médica
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Recomendación de hoy */}
        <div style={{ marginBottom: '1.5rem', animation: mounted ? 'fadeInUp 0.5s ease 0.1s both' : 'none' }}>
          <div style={{
            background: 'white', border: '1px solid #edf0ec',
            borderLeft: '3px solid #3d7a5a', borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3d7a5a" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, color: '#3a4a3e', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#3d7a5a' }}>Hoy: </strong>{tip}
            </p>
          </div>
        </div>

        {/* Banner teleconsulta confirmada */}
        {citaConfirmada && !showMeeting && (
          <div style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #050f08, #0f2318, #071626)',
            borderRadius: '18px',
            border: '1.5px solid rgba(34,197,94,0.2)',
            padding: '1.1rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            animationName: 'fadeInUp, bannerGlow',
            animationDuration: '0.4s, 3s',
            animationTimingFunction: 'ease, ease-in-out',
            animationIterationCount: '1, infinite',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: '1.5px',
              background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.6), transparent)'
            }} />
            <div style={{
              width: '14px', height: '14px', flexShrink: 0,
              background: '#22c55e', borderRadius: '50%',
              animation: 'pulseGreen 1.6s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(34,197,94,0.7)'
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 0.12rem', color: '#7ac896', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                Teleconsulta confirmada
              </p>
              <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '0.93rem' }}>
                {citaConfirmada.medico_nombre ?? 'Médico asignado'}
              </p>
            </div>
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: '0.45rem 0.85rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            }}>
              <p style={{ margin: 0, lineHeight: 1, fontSize: '1rem', fontWeight: '800', color: 'white' }}>
                {citaConfirmada.hora_solicitada ?? '—'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                {formatFechaCorta(citaConfirmada.fecha_solicitada)}
              </p>
            </div>
            <button
              onClick={() => citaConfirmada?.en_llamada && setShowMeeting(true)}
              disabled={!citaConfirmada?.en_llamada}
              title={!citaConfirmada?.en_llamada ? 'El médico aún no ha iniciado la llamada' : ''}
              style={{
                flexShrink: 0,
                background: citaConfirmada?.en_llamada ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(255,255,255,0.12)',
                border: citaConfirmada?.en_llamada ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: '12px', padding: '0.65rem 1.4rem', color: 'white',
                fontSize: '0.85rem', fontWeight: '800',
                cursor: citaConfirmada?.en_llamada ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: citaConfirmada?.en_llamada ? '0 4px 18px rgba(22,163,74,0.45)' : 'none',
                transition: 'all 0.3s ease', opacity: citaConfirmada?.en_llamada ? 1 : 0.65,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              {citaConfirmada?.en_llamada ? 'Unirse ahora' : 'Esperando al médico…'}
            </button>
          </div>
        )}

        {/* Botón iniciar triaje */}
        <div style={{ marginBottom: '2rem', animation: mounted ? 'fadeInUp 0.5s ease 0.2s both' : 'none' }}>
          <button
            onClick={() => navigate('/paciente/chat')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
              border: 'none', borderRadius: '16px',
              padding: '1.5rem 2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '1.25rem',
              transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: '0 4px 20px rgba(15,35,24,0.2)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,35,24,0.2)' }}
          >
            <div style={{
              width: '52px', height: '52px', flexShrink: 0,
              background: 'rgba(122,200,150,0.15)',
              border: '1px solid rgba(122,200,150,0.25)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7ac896" strokeWidth="1.8">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ margin: '0 0 0.25rem', color: 'white', fontSize: '1.05rem', fontWeight: '700' }}>
                Iniciar nuevo triaje
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                Habla con STIGA y recibe orientación médica en minutos
              </p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Grid de dos columnas */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem', marginBottom: '1.25rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.3s both' : 'none'
        }}>

          {/* Notificaciones */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #edf0ec', padding: '1.4rem',
            display: 'flex', flexDirection: 'column', gap: '0.1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#0f2318' }}>
                Notificaciones
              </h3>
              {notificaciones.filter(n => !n.leida).length > 0 && (
                <span style={{
                  background: '#fef2f2', color: '#dc2626',
                  fontSize: '0.7rem', fontWeight: '700',
                  padding: '0.2rem 0.5rem', borderRadius: '20px'
                }}>
                  {notificaciones.filter(n => !n.leida).length} nueva{notificaciones.filter(n => !n.leida).length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {notificaciones.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem' }}>
                No tienes notificaciones nuevas
              </div>
            )}
            {notificaciones.map(n => (
              <div key={n.id} style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.75rem', borderRadius: '10px',
                background: n.leida ? 'transparent' : '#f8fbf9',
                border: n.leida ? '1px solid transparent' : '1px solid #e8f2ec',
                marginBottom: '0.4rem'
              }}>
                <div style={{
                  width: '32px', height: '32px', flexShrink: 0,
                  background: '#f4f6f8', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {notiIcon(n.tipo)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '0.82rem', color: '#1a2e1a', lineHeight: 1.4 }}>
                    {n.texto}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.73rem', color: '#aabcb0' }}>{n.hora}</p>
                </div>
                {!n.leida && (
                  <div style={{ width: '7px', height: '7px', background: '#3d7a5a', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Próxima cita */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #edf0ec', padding: '1.4rem',
            display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: '700', color: '#0f2318' }}>
              Próxima cita
            </h3>

            {citaConfirmada ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '46px', height: '46px', flexShrink: 0,
                    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.15rem', fontWeight: '700', color: '#0f2318', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {citaConfirmada.medico_nombre ?? 'Médico asignado'}
                    </p>
                    <p style={{ margin: 0, color: '#7a9080', fontSize: '0.8rem' }}>
                      {formatFechaLarga(citaConfirmada.fecha_solicitada)}
                      {citaConfirmada.hora_solicitada ? ` · ${citaConfirmada.hora_solicitada}` : ''}
                    </p>
                  </div>
                </div>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: '#f0fdf4', color: '#15803d',
                  fontSize: '0.75rem', fontWeight: '700',
                  padding: '0.25rem 0.7rem', borderRadius: '20px',
                  border: '1px solid #bbf7d0', width: 'fit-content'
                }}>
                  <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
                  Confirmada
                </span>

              </div>
            ) : (
              <div style={{
                flex: 1, background: '#f8fafb', borderRadius: '14px',
                padding: '1.5rem', border: '1px dashed #d8e6dc',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                textAlign: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c8d8cc" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.83rem', lineHeight: 1.5 }}>
                  No tienes citas programadas.<br/>Solicita una teleconsulta desde Mis resultados.
                </p>
                <button
                  onClick={() => navigate('/paciente/teleconsulta')}
                  style={{
                    background: 'none', border: '1px solid #3d7a5a', color: '#3d7a5a',
                    borderRadius: '8px', padding: '0.4rem 1rem',
                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Ir a Teleconsulta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Documentos y resultados */}
        <div style={{
          background: 'white', borderRadius: '16px',
          border: '1px solid #edf0ec', padding: '1.4rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.4s both' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#0f2318' }}>
              Documentos y resultados
            </h3>
            <button
              onClick={() => navigate('/paciente/resultados')}
              style={{
                background: 'none', border: 'none', color: '#3d7a5a',
                fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer',
                padding: '0.3rem 0.7rem', borderRadius: '6px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eef6f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Ver todos →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {documentos.length === 0 && (
              <p style={{ margin: '1rem 0', textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem' }}>
                Aún no tienes resultados de triaje.
              </p>
            )}
            {documentos.map(doc => (
              <div
                key={doc.id}
                className="doc-row"
                onClick={() => navigate('/paciente/resultados')}
              >
                <div style={{
                  width: '40px', height: '40px', flexShrink: 0,
                  background: '#f4f6f4', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d7a5a" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.15rem', fontWeight: '600', color: '#0f2318', fontSize: '0.88rem' }}>
                    {doc.nombre}
                  </p>
                  <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.77rem' }}>
                    {doc.tipo} · {doc.fecha}
                  </p>
                </div>
                <span style={{
                  background: doc.nivel.bg, color: doc.nivel.color,
                  fontSize: '0.73rem', fontWeight: '700',
                  padding: '0.2rem 0.65rem', borderRadius: '20px', flexShrink: 0
                }}>
                  {doc.nivel.label}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8d8cc" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Jitsi Meeting */}
      {showMeeting && citaConfirmada && (
        <JitsiMeeting
          roomId={`stiga-cita-${citaConfirmada.id}`}
          displayName={user?.name}
          onClose={() => setShowMeeting(false)}
        />
      )}

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/paciente/chat')} title="Iniciar triaje">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
          <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
        </svg>
      </button>

    </div>
  )
}