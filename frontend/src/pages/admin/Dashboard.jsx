import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [activeTab, setActiveTab] = useState('metricas')
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

  const stats = [
    { label: 'Triajes hoy',     value: '24',  color: '#374151' },
    { label: 'Usuarios activos', value: '138', color: '#1a5f8a' },
    { label: 'Médicos en línea', value: '6',   color: '#15803d' },
    { label: 'Alertas activas',  value: '3',   color: '#b91c1c' },
  ]

  const alertas = [
    {
      id: 1, tipo: 'crítico', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca',
      titulo: 'Triaje sin atender — Nivel Rojo',
      desc: 'Juan Pérez (Buriticá) lleva 2 horas sin respuesta médica.',
      hora: 'Hace 2 horas'
    },
    {
      id: 2, tipo: 'advertencia', color: '#b45309', bg: '#fffbeb', border: '#fde68a',
      titulo: 'Latencia elevada en el modelo IA',
      desc: 'El tiempo de respuesta de Gemma supera los 8 segundos.',
      hora: 'Hace 35 min'
    },
    {
      id: 3, tipo: 'info', color: '#1a5f8a', bg: '#eff6ff', border: '#bfdbfe',
      titulo: 'Nuevo médico registrado',
      desc: 'Dr. Camilo Restrepo fue añadido al sistema — pendiente de aprobación.',
      hora: 'Hace 1 hora'
    },
  ]

  const usuarios = [
    { id: 1, nombre: 'Juan Pérez',        rol: 'Paciente', municipio: 'Buriticá',    estado: 'activo',    triajes: 3  },
    { id: 2, nombre: 'Dra. María López',  rol: 'Médico',   municipio: 'Sta. Fe Ant.', estado: 'activo',   triajes: 0  },
    { id: 3, nombre: 'Rosa Cardona',      rol: 'Paciente', municipio: 'Liborina',     estado: 'activo',   triajes: 5  },
    { id: 4, nombre: 'Dr. Camilo Restrepo', rol: 'Médico', municipio: 'Olaya',       estado: 'pendiente', triajes: 0 },
    { id: 5, nombre: 'Carlos Múnera',     rol: 'Paciente', municipio: 'Sabanalarga',  estado: 'activo',   triajes: 1  },
    { id: 6, nombre: 'Amparo Gil',        rol: 'Paciente', municipio: 'Olaya',        estado: 'inactivo', triajes: 2  },
  ]

  const triajes = [
    { id: 1, paciente: 'Juan Pérez',    municipio: 'Buriticá',    fecha: 'Hoy 08:14',    nivel: { label: 'Rojo',     color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' }, medico: 'Sin asignar',      teleconsulta: true  },
    { id: 2, paciente: 'Rosa Cardona',  municipio: 'Liborina',    fecha: 'Hoy 09:30',    nivel: { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', dot: '#f97316' }, medico: 'Dra. María López', teleconsulta: true  },
    { id: 3, paciente: 'Carlos Múnera', municipio: 'Sabanalarga', fecha: 'Hoy 11:05',    nivel: { label: 'Amarillo', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' }, medico: 'Dra. María López', teleconsulta: false },
    { id: 4, paciente: 'Amparo Gil',    municipio: 'Olaya',       fecha: 'Ayer 14:22',   nivel: { label: 'Verde',    color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' }, medico: 'Dra. María López', teleconsulta: false },
    { id: 5, paciente: 'Luis Ríos',     municipio: 'Buriticá',    fecha: 'Ayer 16:47',   nivel: { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', dot: '#f97316' }, medico: 'Sin asignar',      teleconsulta: true  },
  ]

  // Puntos del mapa simulado (coordenadas relativas sobre imagen SVG Colombia/Antioquia)
  const mapaPoints = [
    { id: 1, nombre: 'Buriticá',    x: 38, y: 42, nivel: '#ef4444', teleconsulta: true,  count: 2 },
    { id: 2, nombre: 'Liborina',    x: 32, y: 38, nivel: '#f97316', teleconsulta: true,  count: 1 },
    { id: 3, nombre: 'Sabanalarga', x: 44, y: 35, nivel: '#f59e0b', teleconsulta: false, count: 1 },
    { id: 4, nombre: 'Olaya',       x: 36, y: 44, nivel: '#22c55e', teleconsulta: false, count: 2 },
    { id: 5, nombre: 'Sta. Fe Ant.', x: 40, y: 48, nivel: '#f97316', teleconsulta: true, count: 1 },
  ]

  const rolColor = { Paciente: '#374151', Médico: '#1a5f8a' }
  const estadoBadge = {
    activo:    { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    pendiente: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    inactivo:  { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#f3f4f6'
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
          0%,100% { box-shadow: 0 0 0 0 rgba(185,28,28,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(185,28,28,0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        .tip-hero {
          overflow: hidden;
          transition: max-height 1s cubic-bezier(0.4,0,0.2,1),
                      opacity 0.8s ease, margin-bottom 0.8s ease, padding 0.8s ease;
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
          cursor: pointer; color: rgba(255,255,255,0.45);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
        }
        .nav-item.active {
          background: rgba(255,255,255,0.12);
          color: white;
          border-color: rgba(255,255,255,0.15);
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
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1.1rem 1.4rem;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #9ca3af;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }

        .tab-btn {
          padding: 0.55rem 1.25rem; border-radius: 9px;
          border: 1.5px solid #d1d5db; background: white;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; color: #374151;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .tab-btn:hover:not(.active) {
          background: #f9fafb; border-color: #6b7280;
          transform: translateY(-1px);
        }
        .tab-btn.active {
          background: #1f2937; color: white;
          border-color: #1f2937;
          box-shadow: 0 4px 14px rgba(31,41,55,0.3);
        }

        .alerta-card {
          background: white; border-radius: 14px;
          padding: 1.1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          border-left: 3px solid transparent;
        }
        .alerta-card:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.07);
        }

        .usuario-row {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; gap: 1rem;
        }
        .usuario-row:hover {
          border-color: #9ca3af;
          box-shadow: 0 6px 20px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }

        .triaje-row {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
        }
        .triaje-row:hover {
          border-color: #9ca3af;
          box-shadow: 0 6px 20px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }

        .btn-admin {
          background: #1f2937; color: white;
          border: none; border-radius: 9px;
          padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .btn-admin:hover {
          background: #111827;
          box-shadow: 0 4px 12px rgba(31,41,55,0.3);
          transform: translateY(-1px);
        }
        .btn-outline-admin {
          background: none; border: 1.5px solid #d1d5db;
          border-radius: 9px; padding: 0.45rem 0.9rem;
          font-size: 0.8rem; font-weight: 600; color: #374151;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .btn-outline-admin:hover {
          background: #f3f4f6; border-color: #6b7280;
          transform: translateY(-1px);
        }
        .btn-danger {
          background: none; border: 1.5px solid #fecaca;
          border-radius: 9px; padding: 0.45rem 0.9rem;
          font-size: 0.8rem; font-weight: 600; color: #b91c1c;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .btn-danger:hover {
          background: #fef2f2; border-color: #f87171;
          transform: translateY(-1px);
        }

        .fab-admin {
          position: fixed; bottom: 2.5rem; right: 2.5rem;
          background: linear-gradient(135deg, #1f2937, #374151);
          color: white; border: none; border-radius: 16px;
          padding: 0.9rem 1.6rem; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; z-index: 200;
          display: flex; align-items: center; gap: 0.65rem;
          box-shadow: 0 8px 28px rgba(31,41,55,0.35);
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fab-admin:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 36px rgba(31,41,55,0.45);
        }
        .fab-admin:active { transform: scale(0.97); }

        .map-dot {
          position: absolute;
          transform: translate(-50%, -50%);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .map-dot:hover .map-tooltip { opacity: 1; transform: translateY(-4px); }
        .map-tooltip {
          position: absolute; bottom: 130%; left: 50%;
          transform: translateX(-50%) translateY(0px);
          background: #1f2937; color: white;
          font-size: 0.72rem; font-weight: 600;
          padding: 0.35rem 0.7rem; border-radius: 6px;
          white-space: nowrap; opacity: 0;
          transition: all 0.2s ease;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .map-tooltip::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1f2937;
        }
        .alert-pulse { animation: pulse 2s ease-in-out infinite; }
        .live-dot { animation: blink 1.5s ease-in-out infinite; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #111827 0%, #1f2937 50%, #111827 100%)',
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
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '2px' }}>STIGA</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>Panel administrador</p>
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
            background: 'linear-gradient(135deg, #374151, #6b7280)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.6rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
              {user?.name?.charAt(0)}
            </span>
          </div>
          <p style={{ margin: '0 0 0.1rem', color: 'white', fontSize: '0.88rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>Superadministrador</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 0.5rem 0.5rem', color: 'rgba(255,255,255,0.2)',
            fontSize: '0.68rem', fontWeight: '700',
            letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>

          {[
            { key: 'metricas',  label: 'Métricas',         icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
            { key: 'alertas',   label: 'Alertas',           icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
            { key: 'usuarios',  label: 'Usuarios',          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
            { key: 'triajes',   label: 'Historial triajes', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
            { key: 'mapa',      label: 'Mapa de pacientes', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0z' },
          ].map(item => (
            <div
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon}/>
              </svg>
              {item.label}
              {item.key === 'alertas' && (
                <span style={{
                  marginLeft: 'auto', minWidth: '20px', height: '20px',
                  background: '#b91c1c', color: 'white',
                  fontSize: '0.68rem', fontWeight: '700',
                  borderRadius: '10px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px'
                }}>3</span>
              )}
            </div>
          ))}
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
        maxWidth: '960px'
      }}>

        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>{greeting}</p>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '20px', padding: '0.15rem 0.6rem',
              fontSize: '0.72rem', fontWeight: '700', color: '#15803d'
            }}>
              <span className="live-dot" style={{
                width: '6px', height: '6px',
                background: '#22c55e', borderRadius: '50%',
                display: 'inline-block'
              }} />
              Sistema en línea
            </span>
          </div>
          <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#06111f' }}>
            {user?.name}
          </h1>
          <p style={{ margin: 0, color: '#374151', fontSize: '0.88rem', fontWeight: '500' }}>
            Panel de control · STIGA Antioquia
          </p>
        </div>

        {/* Tip hero */}
        <div
          className={`tip-hero ${tipCollapsed ? 'collapsed' : 'expanded'}`}
          style={{
            background: 'linear-gradient(135deg, #111827, #1f2937)',
            borderRadius: '20px', padding: '1.8rem 2.2rem',
            animation: mounted ? 'fadeInUp 0.6s ease 0.05s both' : 'none'
          }}
        >
          <p style={{
            margin: '0 0 0.5rem', fontSize: '0.73rem', fontWeight: '700',
            color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px'
          }}>
            Resumen del sistema
          </p>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'white', lineHeight: 1.6 }}>
            Hay 3 alertas activas hoy. Un triaje nivel Rojo lleva 2 horas sin médico asignado — requiere atención inmediata.
          </p>
        </div>

        {/* Tip pequeño */}
        <div className={`tip-small ${tipCollapsed ? 'visible' : 'hidden'}`}>
          <div style={{
            background: 'white', border: '1px solid #e5e7eb',
            borderLeft: '3px solid #374151', borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, color: '#06111f', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#374151' }}>Alerta: </strong>
              3 alertas activas — triaje Rojo sin médico asignado.
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
                color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px'
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
          flexWrap: 'wrap',
          animation: mounted ? 'fadeInUp 0.5s ease 0.25s both' : 'none'
        }}>
          {[
            { key: 'metricas',  label: 'Métricas' },
            { key: 'alertas',   label: 'Alertas (3)' },
            { key: 'usuarios',  label: 'Usuarios' },
            { key: 'triajes',   label: 'Historial triajes' },
            { key: 'mapa',      label: 'Mapa' },
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

        {/* ── TAB Métricas ── */}
        {activeTab === 'metricas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>

            {/* Gráfica de barras simulada */}
            <div style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: '16px', padding: '1.5rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '1.5rem'
              }}>
                <div>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                    Triajes por día — últimos 7 días
                  </p>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.82rem' }}>
                    Total: 142 triajes esta semana
                  </p>
                </div>
                <span style={{
                  background: '#f0fdf4', color: '#15803d',
                  fontSize: '0.78rem', fontWeight: '700',
                  padding: '0.3rem 0.8rem', borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  ↑ 18% vs semana anterior
                </span>
              </div>

              {/* Barras */}
              {[
                { dia: 'Lun', valor: 16, max: 30 },
                { dia: 'Mar', valor: 22, max: 30 },
                { dia: 'Mié', valor: 18, max: 30 },
                { dia: 'Jue', valor: 28, max: 30 },
                { dia: 'Vie', valor: 24, max: 30 },
                { dia: 'Sáb', valor: 10, max: 30 },
                { dia: 'Hoy', valor: 24, max: 30 },
              ].map((b, i) => (
                <div key={b.dia} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: i < 6 ? '0.75rem' : 0
                }}>
                  <span style={{
                    minWidth: '30px', fontSize: '0.78rem',
                    fontWeight: '600', color: '#6b7280', textAlign: 'right'
                  }}>{b.dia}</span>
                  <div style={{
                    flex: 1, height: '28px', background: '#f3f4f6',
                    borderRadius: '6px', overflow: 'hidden', position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(b.valor / b.max) * 100}%`,
                      background: b.dia === 'Hoy'
                        ? 'linear-gradient(90deg, #1f2937, #374151)'
                        : 'linear-gradient(90deg, #9ca3af, #d1d5db)',
                      borderRadius: '6px',
                      transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                      display: 'flex', alignItems: 'center',
                      paddingLeft: '0.6rem'
                    }}>
                      <span style={{
                        color: 'white', fontSize: '0.75rem', fontWeight: '700'
                      }}>{b.valor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Distribución por nivel */}
            <div style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: '16px', padding: '1.5rem'
            }}>
              <p style={{ margin: '0 0 1.25rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                Distribución por nivel de urgencia — hoy
              </p>
              {[
                { label: 'Rojo',     count: 3,  total: 24, color: '#ef4444', bg: '#fef2f2' },
                { label: 'Naranja',  count: 6,  total: 24, color: '#f97316', bg: '#fff7ed' },
                { label: 'Amarillo', count: 9,  total: 24, color: '#f59e0b', bg: '#fef3c7' },
                { label: 'Verde',    count: 6,  total: 24, color: '#22c55e', bg: '#f0fdf4' },
              ].map(n => (
                <div key={n.label} style={{
                  display: 'flex', alignItems: 'center',
                  gap: '0.75rem', marginBottom: '0.85rem'
                }}>
                  <div style={{
                    width: '10px', height: '10px',
                    background: n.color, borderRadius: '50%', flexShrink: 0,
                    boxShadow: `0 0 6px ${n.color}60`
                  }} />
                  <span style={{
                    minWidth: '65px', fontSize: '0.83rem',
                    fontWeight: '600', color: '#374151'
                  }}>{n.label}</span>
                  <div style={{
                    flex: 1, height: '22px', background: '#f3f4f6',
                    borderRadius: '6px', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(n.count / n.total) * 100}%`,
                      background: n.color, borderRadius: '6px',
                      opacity: 0.75
                    }} />
                  </div>
                  <span style={{
                    minWidth: '36px', fontSize: '0.83rem',
                    fontWeight: '700', color: '#374151', textAlign: 'right'
                  }}>{n.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Alertas ── */}
        {activeTab === 'alertas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{
              margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700',
              color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px'
            }}>
              {alertas.length} alertas activas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {alertas.map((a, i) => (
                <div
                  key={a.id}
                  className="alerta-card"
                  style={{
                    border: `1px solid ${a.border}`,
                    borderLeft: `3px solid ${a.color}`,
                    animation: `slideIn 0.4s ease ${i * 0.08}s both`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      background: a.bg, borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...(a.tipo === 'crítico' ? { animation: 'pulse 2s ease-in-out infinite' } : {})
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5">
                        {a.tipo === 'crítico'
                          ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                          : a.tipo === 'advertencia'
                          ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                          : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                        }
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: '0.3rem', gap: '1rem'
                      }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>
                          {a.titulo}
                        </p>
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem', flexShrink: 0 }}>{a.hora}</span>
                      </div>
                      <p style={{ margin: '0 0 0.85rem', color: '#374151', fontSize: '0.84rem', lineHeight: 1.5 }}>
                        {a.desc}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-admin">Atender</button>
                        <button className="btn-outline-admin">Ignorar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Usuarios ── */}
        {activeTab === 'usuarios' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem'
            }}>
              <p style={{
                margin: 0, fontSize: '0.73rem', fontWeight: '700',
                color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px'
              }}>
                {usuarios.length} usuarios registrados
              </p>
              <button className="btn-admin">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Nuevo usuario
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {usuarios.map((u, i) => (
                <div key={u.id} className="usuario-row" style={{
                  animation: `slideIn 0.4s ease ${i * 0.07}s both`
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: rolColor[u.rol] + '15',
                    border: `1.5px solid ${rolColor[u.rol]}30`,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: '800',
                    color: rolColor[u.rol]
                  }}>
                    {u.nombre.split(' ').filter(n => !['Dra.', 'Dr.'].includes(n)).map(n => n[0]).join('').slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap'
                    }}>
                      <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>
                        {u.nombre}
                      </p>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700',
                        color: rolColor[u.rol],
                        background: rolColor[u.rol] + '12',
                        padding: '0.15rem 0.55rem', borderRadius: '20px',
                        border: `1px solid ${rolColor[u.rol]}25`
                      }}>{u.rol}</span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700',
                        color: estadoBadge[u.estado].color,
                        background: estadoBadge[u.estado].bg,
                        padding: '0.15rem 0.55rem', borderRadius: '20px',
                        border: `1px solid ${estadoBadge[u.estado].border}`
                      }}>{u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}</span>
                    </div>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.8rem', fontWeight: '500' }}>
                      {u.municipio} {u.triajes > 0 ? `· ${u.triajes} triajes` : ''}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn-outline-admin">Editar</button>
                    <button className="btn-danger">
                      {u.estado === 'activo' ? 'Desactivar' : u.estado === 'pendiente' ? 'Aprobar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Triajes ── */}
        {activeTab === 'triajes' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{
              margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700',
              color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px'
            }}>
              {triajes.length} triajes recientes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {triajes.map((t, i) => (
                <div key={t.id} className="triaje-row" style={{
                  animation: `slideIn 0.4s ease ${i * 0.07}s both`,
                  borderLeft: `3px solid ${t.nivel.dot}`
                }}>
                  {/* Nivel dot */}
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: t.nivel.bg,
                    border: `1.5px solid ${t.nivel.dot}40`,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '12px', height: '12px',
                      background: t.nivel.dot, borderRadius: '50%',
                      boxShadow: `0 0 6px ${t.nivel.dot}80`
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap'
                    }}>
                      <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>
                        {t.paciente}
                      </p>
                      <span style={{
                        background: t.nivel.bg, color: t.nivel.color,
                        fontSize: '0.72rem', fontWeight: '700',
                        padding: '0.18rem 0.6rem', borderRadius: '20px'
                      }}>{t.nivel.label}</span>
                      {t.teleconsulta && (
                        <span style={{
                          background: '#eff6ff', color: '#1a5f8a',
                          fontSize: '0.7rem', fontWeight: '700',
                          padding: '0.18rem 0.6rem', borderRadius: '20px',
                          border: '1px solid #bfdbfe'
                        }}>
                          📹 Teleconsulta
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.8rem', fontWeight: '500' }}>
                      {t.municipio} · {t.fecha} · {t.medico}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn-outline-admin">Ver detalle</button>
                    {t.medico === 'Sin asignar' && (
                      <button className="btn-admin">Asignar médico</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Mapa ── */}
        {activeTab === 'mapa' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem'
            }}>
              <div>
                <p style={{
                  margin: '0 0 0.2rem', fontWeight: '700',
                  color: '#06111f', fontSize: '0.97rem'
                }}>
                  Ubicación de pacientes activos
                </p>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.82rem' }}>
                  Occidente Antioqueño · {mapaPoints.length} municipios con actividad
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { color: '#ef4444', label: 'Triaje' },
                  { color: '#1a5f8a', label: 'Teleconsulta' },
                ].map(l => (
                  <div key={l.label} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}>
                    <div style={{
                      width: '10px', height: '10px',
                      background: l.color, borderRadius: '50%'
                    }} />
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '500' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapa SVG simulado */}
            <div style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: '16px', overflow: 'hidden',
              position: 'relative'
            }}>
              <svg
                viewBox="0 0 100 100"
                style={{ width: '100%', height: '420px', display: 'block' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Fondo del mapa */}
                <rect width="100" height="100" fill="#f8fafc"/>

                {/* Silueta simplificada Occidente Antioqueño */}
                <path
                  d="M20 25 L45 18 L65 22 L72 35 L68 55 L58 68 L42 72 L28 65 L18 50 Z"
                  fill="#e8f4fb" stroke="#b8d8ee" strokeWidth="0.5"
                />
                {/* Ríos */}
                <path d="M25 40 Q35 45 50 42 Q60 40 70 48" fill="none" stroke="#90c4e0" strokeWidth="0.8" opacity="0.6"/>
                <path d="M30 55 Q40 58 48 65" fill="none" stroke="#90c4e0" strokeWidth="0.6" opacity="0.5"/>

                {/* Grid de referencia sutil */}
                {[20,30,40,50,60,70,80].map(v => (
                  <g key={v}>
                    <line x1={v} y1="10" x2={v} y2="90" stroke="#f0f4f8" strokeWidth="0.3"/>
                    <line x1="10" y1={v} x2="90" y2={v} stroke="#f0f4f8" strokeWidth="0.3"/>
                  </g>
                ))}

                {/* Puntos de municipios */}
                {mapaPoints.map(p => (
                  <g key={p.id}>
                    {/* Anillo exterior */}
                    <circle
                      cx={p.x} cy={p.y} r="4.5"
                      fill={p.teleconsulta ? 'rgba(26,95,138,0.15)' : 'rgba(239,68,68,0.12)'}
                      stroke={p.teleconsulta ? '#1a5f8a' : p.nivel}
                      strokeWidth="0.4"
                    />
                    {/* Punto central */}
                    <circle
                      cx={p.x} cy={p.y} r="2.5"
                      fill={p.teleconsulta ? '#1a5f8a' : p.nivel}
                    />
                    {/* Contador */}
                    {p.count > 1 && (
                      <text
                        x={p.x + 3.5} y={p.y - 3}
                        fontSize="3" fontWeight="700"
                        fill="#374151"
                      >{p.count}</text>
                    )}
                    {/* Nombre del municipio */}
                    <text
                      x={p.x} y={p.y + 7}
                      fontSize="2.8" textAnchor="middle"
                      fill="#374151" fontWeight="500"
                    >{p.nombre}</text>
                  </g>
                ))}

                {/* Brújula */}
                <g transform="translate(85, 15)">
                  <circle cx="0" cy="0" r="5" fill="white" stroke="#e5e7eb" strokeWidth="0.4"/>
                  <text x="0" y="-2" fontSize="3.5" textAnchor="middle" fill="#374151" fontWeight="700">N</text>
                  <line x1="0" y1="-4" x2="0" y2="0" stroke="#374151" strokeWidth="0.5"/>
                  <line x1="0" y1="0" x2="0" y2="4" stroke="#9ca3af" strokeWidth="0.5"/>
                </g>
              </svg>

              {/* Leyenda inferior */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f3f4f6',
                display: 'flex', gap: '1.5rem', flexWrap: 'wrap'
              }}>
                {mapaPoints.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '8px', height: '8px',
                      background: p.teleconsulta ? '#1a5f8a' : p.nivel,
                      borderRadius: '50%'
                    }} />
                    <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
                      {p.nombre}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', color: '#9ca3af',
                      background: '#f3f4f6', padding: '0.1rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {p.count} {p.count === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FAB ── */}
      <button className="fab-admin" onClick={() => setActiveTab('alertas')}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Ver alertas activas (3)
      </button>

    </div>
  )
}