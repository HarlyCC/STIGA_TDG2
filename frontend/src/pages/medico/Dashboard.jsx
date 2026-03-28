import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function MedicoDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [activeTab, setActiveTab] = useState('pacientes')
  const [tipCollapsed, setTipCollapsed] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    const h = new Date().getHours()
    if (h < 12) setGreeting('Buenos días')
    else if (h < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
    const t = setTimeout(() => setTipCollapsed(true), 3500)
    return () => clearTimeout(t)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const pacientes = [
    {
      id: 1, nombre: 'Juan Pérez', edad: 42, municipio: 'Buriticá',
      ultimoTriaje: 'Hace 1 hora',
      nivel: { label: 'Rojo', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
      motivo: 'Dolor torácico · Dificultad respiratoria', pendiente: true
    },
    {
      id: 2, nombre: 'Rosa Cardona', edad: 67, municipio: 'Liborina',
      ultimoTriaje: 'Hace 3 horas',
      nivel: { label: 'Naranja', color: '#c2410c', bg: '#fff7ed', dot: '#f97316' },
      motivo: 'Presión arterial alta · Mareo', pendiente: true
    },
    {
      id: 3, nombre: 'Carlos Múnera', edad: 29, municipio: 'Sabanalarga',
      ultimoTriaje: 'Hace 5 horas',
      nivel: { label: 'Amarillo', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
      motivo: 'Fiebre 38.5°C · Dolor muscular', pendiente: false
    },
    {
      id: 4, nombre: 'Amparo Gil', edad: 53, municipio: 'Olaya',
      ultimoTriaje: 'Hace 1 día',
      nivel: { label: 'Verde', color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
      motivo: 'Tos leve · Malestar general', pendiente: false
    },
  ]

  const consultasHoy = [
    { id: 1, paciente: 'Juan Pérez',   hora: '10:00 AM', tipo: 'Urgente',     estado: 'pendiente' },
    { id: 2, paciente: 'Rosa Cardona', hora: '11:30 AM', tipo: 'Seguimiento', estado: 'pendiente' },
    { id: 3, paciente: 'Luis Ríos',    hora: '02:00 PM', tipo: 'Primera vez', estado: 'completada' },
  ]

  const stats = [
    { label: 'Pacientes hoy', value: '8', color: '#1a5f8a' },
    { label: 'Pendientes',    value: '2', color: '#b91c1c' },
    { label: 'Atendidos',     value: '6', color: '#15803d' },
    { label: 'Consultas',     value: '3', color: '#6d28d9' },
  ]

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#eef5fb'
    }}>

      <style>{`
        * { box-sizing: border-box; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tabSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(185,28,28,0.35); }
          50%      { box-shadow: 0 0 0 8px rgba(185,28,28,0); }
        }

        .tip-hero {
          overflow: hidden;
          transition: max-height 1s cubic-bezier(0.4,0,0.2,1),
                      opacity 0.8s ease, margin-bottom 0.8s ease,
                      padding 0.8s ease;
        }
        .tip-hero.expanded { max-height: 200px; opacity: 1; margin-bottom: 2rem; }
        .tip-hero.collapsed {
          max-height: 0; opacity: 0; margin-bottom: 0;
          padding-top: 0 !important; padding-bottom: 0 !important;
        }
        .tip-small {
          transition: all 0.7s cubic-bezier(0.4,0,0.2,1); overflow: hidden;
        }
        .tip-small.hidden  { max-height: 0; opacity: 0; margin-bottom: 0; }
        .tip-small.visible { max-height: 80px; opacity: 1; margin-bottom: 1.5rem; }

        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          cursor: pointer; color: rgba(255,255,255,0.5);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
        }
        .nav-item.active {
          background: rgba(125,212,240,0.16);
          color: #7dd4f0;
          border-color: rgba(125,212,240,0.22);
        }
        .logout-btn {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
          background: none; border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35); font-size: 0.85rem; cursor: pointer;
          transition: all 0.18s ease;
        }
        .logout-btn:hover {
          background: rgba(220,50,50,0.1);
          border-color: rgba(220,50,50,0.2);
          color: #fca5a5;
        }

        .stat-card {
          background: white;
          border: 1px solid #c8dff0;
          border-radius: 14px; padding: 1.1rem 1.4rem;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #8ec8e8;
          box-shadow: 0 4px 16px rgba(46,143,192,0.1);
          transform: translateY(-2px);
        }

        .tab-btn {
          padding: 0.55rem 1.25rem; border-radius: 9px;
          border: 1.5px solid #b8d8ee; background: white;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; color: #2a5a7a;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .tab-btn:hover:not(.active) {
          background: #e8f4fb;
          border-color: #6ab8d8;
          transform: translateY(-1px);
        }
        .tab-btn.active {
          background: #1a5f8a; color: white;
          border-color: #1a5f8a;
          box-shadow: 0 4px 14px rgba(26,95,138,0.3);
        }

        .paciente-row {
          background: white;
          border: 1px solid #c8dff0;
          border-radius: 16px; padding: 1.2rem 1.5rem;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          cursor: pointer;
        }
        .paciente-row:hover {
          border-color: #6ab8d8;
          box-shadow: 0 8px 28px rgba(26,95,138,0.12);
          transform: translateY(-3px) translateX(3px);
        }
        .paciente-row:active { transform: scale(0.99); }

        .btn-primary-blue {
          background: #1a5f8a; color: white;
          border: none; border-radius: 9px;
          padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .btn-primary-blue:hover {
          background: #134d72;
          box-shadow: 0 6px 18px rgba(26,95,138,0.3);
          transform: translateY(-2px);
        }
        .btn-outline-blue {
          background: none; border: 1.5px solid #b8d8ee;
          border-radius: 9px; padding: 0.5rem 1rem;
          font-size: 0.82rem; font-weight: 600; color: #1a5f8a;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .btn-outline-blue:hover {
          background: #e8f4fb;
          border-color: #1a5f8a;
          transform: translateY(-1px);
        }

        .consulta-row {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.3rem; background: white;
          border: 1px solid #c8dff0; border-radius: 13px;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .consulta-row:hover {
          border-color: #6ab8d8;
          box-shadow: 0 6px 20px rgba(26,95,138,0.1);
          transform: translateY(-2px);
        }

        .fab-med {
          position: fixed; bottom: 2.5rem; right: 2.5rem;
          background: linear-gradient(135deg, #1a5f8a, #2e8fc0);
          color: white; border: none; border-radius: 16px;
          padding: 0.9rem 1.6rem; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; z-index: 200;
          display: flex; align-items: center; gap: 0.65rem;
          box-shadow: 0 8px 28px rgba(26,95,138,0.35);
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fab-med:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 36px rgba(26,95,138,0.45);
        }
        .fab-med:active { transform: scale(0.97); }

        .pending-dot { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #081828 0%, #0d2a42 50%, #081828 100%)',
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
          borderBottom: '1px solid rgba(255,255,255,0.07)'
        }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(125,212,240,0.1)',
            border: '1px solid rgba(125,212,240,0.2)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#7dd4f0" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '2px' }}>STIGA</p>
            <p style={{ margin: 0, color: 'rgba(125,212,240,0.5)', fontSize: '0.7rem' }}>Panel médico</p>
          </div>
        </div>

        {/* Usuario */}
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #1a5f8a, #2e8fc0)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.6rem',
            boxShadow: '0 4px 12px rgba(26,95,138,0.4)'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
              {user?.name?.charAt(0)}
            </span>
          </div>
          <p style={{ margin: '0 0 0.1rem', color: 'white', fontSize: '0.88rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ margin: 0, color: 'rgba(125,212,240,0.45)', fontSize: '0.72rem' }}>Médico general</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 0.5rem 0.5rem', color: 'rgba(255,255,255,0.2)',
            fontSize: '0.68rem', fontWeight: '700',
            letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>

          <div className="nav-item active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Inicio
          </div>
          <div className="nav-item" onClick={() => setActiveTab('pacientes')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Mis pacientes
          </div>
          <div className="nav-item" onClick={() => setActiveTab('consultas')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Consultas del día
          </div>
          <div className="nav-item" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Telemedicina
            <span style={{
              marginLeft: 'auto', fontSize: '0.63rem',
              background: 'rgba(232,160,32,0.15)', color: '#e8a020',
              padding: '0.12rem 0.4rem', borderRadius: '4px', fontWeight: '700'
            }}>Pronto</span>
          </div>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        maxWidth: '900px'
      }}>

        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease' : 'none'
        }}>
          <p style={{ margin: '0 0 0.2rem', color: '#2e6a8a', fontSize: '0.9rem', fontWeight: '500' }}>{greeting}</p>
          <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#06111f' }}>
            {user?.name}
          </h1>
          <p style={{ margin: 0, color: '#2a5a7a', fontSize: '0.88rem' }}>
            Panel clínico · Zona Occidente Antioqueño
          </p>
        </div>

        {/* Tip hero */}
        <div
          className={`tip-hero ${tipCollapsed ? 'collapsed' : 'expanded'}`}
          style={{
            background: 'linear-gradient(135deg, #081828, #0d2a42)',
            borderRadius: '20px', padding: '1.8rem 2.2rem',
            animation: mounted ? 'fadeInUp 0.6s ease 0.05s both' : 'none'
          }}
        >
          <p style={{
            margin: '0 0 0.5rem', fontSize: '0.73rem', fontWeight: '700',
            color: '#7dd4f0', textTransform: 'uppercase', letterSpacing: '1.5px'
          }}>
            Recordatorio clínico
          </p>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'white', lineHeight: 1.6 }}>
            Tienes 2 pacientes con triaje pendiente de revisión. Prioriza los niveles Rojo y Naranja.
          </p>
        </div>

        {/* Tip pequeño */}
        <div className={`tip-small ${tipCollapsed ? 'visible' : 'hidden'}`}>
          <div style={{
            background: 'white', border: '1px solid #c8dff0',
            borderLeft: '3px solid #1a5f8a', borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a5f8a" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, color: '#06111f', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#1a5f8a' }}>Pendiente: </strong>
              2 pacientes requieren tu revisión hoy.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.15s both' : 'none'
        }}>
          {stats.map((s, i) => (
            <div key={s.label} className="stat-card" style={{
              animation: mounted ? `fadeInUp 0.5s ease ${0.15 + i * 0.07}s both` : 'none'
            }}>
              <p style={{
                margin: '0 0 0.4rem', fontSize: '0.73rem', fontWeight: '600',
                color: '#2a5a7a', textTransform: 'uppercase', letterSpacing: '0.8px'
              }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: '700', color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.25s both' : 'none'
        }}>
          {[
            { key: 'pacientes', label: 'Mis pacientes' },
            { key: 'consultas', label: 'Consultas del día' }
          ].map(t => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB Pacientes ── */}
        {activeTab === 'pacientes' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{
              margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700',
              color: '#2a5a7a', textTransform: 'uppercase', letterSpacing: '1.2px'
            }}>
              {pacientes.length} pacientes asignados
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {pacientes.map((p, i) => (
                <div
                  key={p.id} className="paciente-row"
                  style={{
                    animation: `slideIn 0.4s ease ${i * 0.08}s both`,
                    borderLeft: `3px solid ${p.nivel.dot}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>

                    {/* Avatar */}
                    <div style={{
                      width: '46px', height: '46px', flexShrink: 0,
                      background: p.nivel.bg,
                      border: `1.5px solid ${p.nivel.dot}50`,
                      borderRadius: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: '800', color: p.nivel.color
                    }}>
                      {p.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap'
                      }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.96rem' }}>
                          {p.nombre}
                        </p>
                        <span style={{ color: '#2a5a7a', fontSize: '0.8rem', fontWeight: '500' }}>
                          {p.edad} años · {p.municipio}
                        </span>
                        <span style={{
                          background: p.nivel.bg, color: p.nivel.color,
                          fontSize: '0.72rem', fontWeight: '700',
                          padding: '0.2rem 0.65rem', borderRadius: '20px',
                          border: `1px solid ${p.nivel.dot}30`
                        }}>
                          {p.nivel.label}
                        </span>
                        {p.pendiente && (
                          <span className="pending-dot" style={{
                            background: '#fef2f2', color: '#b91c1c',
                            fontSize: '0.7rem', fontWeight: '700',
                            padding: '0.2rem 0.6rem', borderRadius: '20px',
                            border: '1px solid #fecaca'
                          }}>
                            ● Pendiente
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.4rem', color: '#1e3a50', fontSize: '0.85rem', fontWeight: '500' }}>
                        {p.motivo}
                      </p>
                      <p style={{ margin: 0, color: '#2a5a7a', fontSize: '0.77rem' }}>
                        Último triaje: {p.ultimoTriaje}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{
                    display: 'flex', gap: '0.6rem',
                    marginTop: '1rem', paddingTop: '0.85rem',
                    borderTop: '1px solid #ddeef7', flexWrap: 'wrap'
                  }}>
                    <button className="btn-primary-blue">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      Ver triajes
                    </button>
                    <button className="btn-outline-blue">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/>
                        <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/>
                      </svg>
                      Historia clínica
                    </button>
                    <button className="btn-outline-blue" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Teleconsulta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Consultas ── */}
        {activeTab === 'consultas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{
              margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700',
              color: '#2a5a7a', textTransform: 'uppercase', letterSpacing: '1.2px'
            }}>
              {consultasHoy.length} consultas programadas hoy
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {consultasHoy.map((c, i) => (
                <div key={c.id} className="consulta-row" style={{
                  animation: `slideIn 0.35s ease ${i * 0.08}s both`,
                  opacity: c.estado === 'completada' ? 0.65 : 1
                }}>
                  <div style={{
                    minWidth: '76px', textAlign: 'center',
                    padding: '0.5rem 0.75rem', borderRadius: '10px',
                    background: c.estado === 'completada' ? '#f4f7f9' : '#e8f4fb',
                    border: `1px solid ${c.estado === 'completada' ? '#c8d8e4' : '#9ecce8'}`
                  }}>
                    <p style={{
                      margin: 0, fontWeight: '700', fontSize: '0.88rem',
                      color: c.estado === 'completada' ? '#4a7090' : '#1a5f8a'
                    }}>{c.hora}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.15rem', fontWeight: '700', color: '#06111f', fontSize: '0.93rem' }}>
                      {c.paciente}
                    </p>
                    <p style={{ margin: 0, color: '#2a5a7a', fontSize: '0.82rem', fontWeight: '500' }}>{c.tipo}</p>
                  </div>
                  <span style={{
                    fontSize: '0.74rem', fontWeight: '700',
                    padding: '0.25rem 0.75rem', borderRadius: '20px',
                    background: c.estado === 'completada' ? '#f0fdf4' : '#e8f4fb',
                    color: c.estado === 'completada' ? '#15803d' : '#1a5f8a',
                    border: `1px solid ${c.estado === 'completada' ? '#bbf7d0' : '#9ecce8'}`
                  }}>
                    {c.estado === 'completada' ? 'Completada' : 'Pendiente'}
                  </span>
                  {c.estado !== 'completada' && (
                    <button className="btn-primary-blue" style={{ flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                      Iniciar
                    </button>
                  )}
                </div>
              ))}

              <div style={{
                marginTop: '0.5rem', padding: '1.1rem 1.4rem',
                border: '1.5px dashed #b8d8ee', borderRadius: '13px',
                display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4a7090" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <p style={{ margin: 0, color: '#2a5a7a', fontSize: '0.85rem' }}>
                  Las próximas consultas aparecerán aquí
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FAB ── */}
      <button className="fab-med" onClick={() => setActiveTab('consultas')}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2"/>
        </svg>
        Ver consultas de hoy
      </button>

    </div>
  )
}