import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import client from '../../api/api'

const NIVEL_CONFIG = {
  Verde:    { color: '#15803d', bg: '#f0fdf4', dot: '#22c55e', texto: 'No urgente',        requiere: false },
  Amarillo: { color: '#b45309', bg: '#fef3c7', dot: '#f59e0b', texto: 'Urgencia moderada', requiere: true  },
  Naranja:  { color: '#c2410c', bg: '#fff7ed', dot: '#f97316', texto: 'Urgencia alta',     requiere: true  },
  Rojo:     { color: '#dc2626', bg: '#fef2f2', dot: '#ef4444', texto: 'Emergencia crítica', requiere: true  },
}

const RECOMENDACIONES = {
  Verde:    ['Puede manejarse en casa con reposo y líquidos abundantes.', 'Tome medicamentos de venta libre según indicaciones.', 'Si los síntomas persisten más de 7 días, consulte a su médico.'],
  Amarillo: ['Tome acetaminofén según indicaciones para el dolor y la fiebre.', 'Manténgase hidratado — tome al menos 2 litros de agua al día.', 'Reposo en cama y evite esfuerzos físicos.', 'Si los síntomas empeoran, busque atención médica de inmediato.'],
  Naranja:  ['Busque atención médica presencial lo antes posible.', 'No tome analgésicos sin consultar un médico.', 'Tome líquidos claros en pequeñas cantidades.', 'Si el dolor aumenta o aparece fiebre alta, vaya urgentemente al centro de salud.'],
  Rojo:     ['Requiere atención médica de emergencia inmediata.', 'Llame a servicios de emergencia o diríjase al hospital más cercano.', 'No espere — busque ayuda ahora.'],
}

const MENSAJE_ATENCION = {
  Verde:    'Su condición no requiere atención urgente. Puede tratarse en casa siguiendo las recomendaciones.',
  Amarillo: 'Su nivel de urgencia es moderado. Se recomienda consulta médica en las próximas 24 horas.',
  Naranja:  'Su nivel de urgencia es alto. Se recomienda atención médica presencial lo antes posible.',
  Rojo:     'Emergencia crítica. Requiere atención médica inmediata.',
}

function formatFecha(timestamp) {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatHora(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function mapTriaje(r) {
  const color  = r.triage_color || 'Verde'
  const cfg    = NIVEL_CONFIG[color] || NIVEL_CONFIG.Verde
  const sintomas = r.symptoms ? r.symptoms.split(',').map(s => s.trim()).filter(Boolean) : ['Sin información']
  return {
    id:                r.id,
    fecha:             formatFecha(r.timestamp),
    hora:              formatHora(r.timestamp),
    nivel:             { label: color, ...cfg },
    sintomas,
    recomendaciones:   RECOMENDACIONES[color] || [],
    requierePresencial: cfg.requiere,
    mensajeAtencion:   MENSAJE_ATENCION[color] || '',
    confianza:         r.confianza,
    escalado:          !!r.escalado,
    necesitaAmbulancia: !!r.necesita_ambulancia,
    medico:            r.medico_nombre || null,
  }
}

export default function PatientResults() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [selectedTriaje, setSelectedTriaje] = useState(null)
  const [triajes, setTriajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    client.get('/medico/mis-triajes')
      .then(({ data }) => setTriajes(data.map(mapTriaje)))
      .catch(() => { setToastMsg('No se pudieron cargar los resultados. Intente de nuevo.') })
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  const handleDescargarPDF = () => {
    const t = selectedTriaje
    const win = window.open('', '_blank')
    if (!win) {
      showToast('No se pudo abrir el PDF. Permite ventanas emergentes en tu navegador.')
      return
    }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Resultado de Triaje STIGA</title>
<style>
  body{font-family:'Segoe UI',sans-serif;max-width:680px;margin:40px auto;color:#1a2e1a;line-height:1.5}
  .header{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #3d7a5a}
  .logo-box{width:44px;height:44px;background:#1a3a2e;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;letter-spacing:1px;flex-shrink:0}
  h1{font-size:20px;margin:0 0 4px;color:#0f2318}
  .sub{color:#6b8070;font-size:12px;margin:0}
  .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-weight:700;font-size:13px;margin-bottom:22px;background:${t.nivel.bg};color:${t.nivel.color}}
  .section{margin-bottom:20px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4a6a4a;margin-bottom:8px}
  ul{margin:0;padding-left:18px}
  li{margin-bottom:5px;font-size:13px}
  .message{padding:12px 14px;border-radius:8px;font-size:13px;font-weight:500;background:${t.requierePresencial?'#fffbeb':'#f0fdf4'};border-left:3px solid ${t.requierePresencial?'#f59e0b':'#22c55e'};margin-bottom:20px}
  .meta{font-size:11px;color:#aabcb0}
  .footer{font-size:11px;color:#aabcb0;text-align:center;margin-top:36px;padding-top:14px;border-top:1px solid #edf0ec}
  @media print{body{margin:20px}}
</style></head><body>
<div class="header">
  <div class="logo-box">ST</div>
  <div><h1>Reporte de Triaje</h1><p class="sub">Sistema de Triaje Inteligente STIGA &nbsp;·&nbsp; ${t.fecha} &nbsp;·&nbsp; ${t.hora}</p></div>
</div>
<span class="badge">Nivel ${t.nivel.label} — ${t.nivel.texto}</span>
<div class="section"><div class="section-title">Síntomas reportados</div><ul>${t.sintomas.map(s=>`<li>${s}</li>`).join('')}</ul></div>
<div class="section"><div class="section-title">Recomendaciones</div><ul>${t.recomendaciones.map(r=>`<li>${r}</li>`).join('')}</ul></div>
<div class="message">${t.mensajeAtencion}</div>
${t.confianza!=null?`<p class="meta">Confianza del modelo: ${Math.round(t.confianza*100)}%</p>`:''}
<div class="footer">Generado por STIGA &nbsp;·&nbsp; Este reporte no reemplaza una consulta médica profesional.</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const handleCompartir = () => {
    const t = selectedTriaje
    const text = [
      `Reporte de Triaje STIGA — ${t.fecha} ${t.hora}`,
      `Nivel: ${t.nivel.label} (${t.nivel.texto})`,
      `Síntomas: ${t.sintomas.join(', ')}`,
      t.mensajeAtencion,
    ].join('\n')
    navigator.clipboard.writeText(text)
      .then(() => showToast('Resumen copiado al portapapeles'))
      .catch(() => showToast('No se pudo copiar'))
  }

  const graficaNiveles = triajes.slice(-6).map(t => ({
    mes:   (() => { const p = t.fecha.split(' '); return p[0] + (p[2] ? ' ' + p[2].slice(0, 3) : '') })(),
    hora:  t.hora,
    nivel: ['Verde', 'Amarillo', 'Naranja', 'Rojo'].indexOf(t.nivel.label),
    label: t.nivel.label,
  }))

  const nivelAltura = { 0: 15, 1: 40, 2: 65, 3: 90, '-1': 15 }
  const nivelColor = {
    'Verde': '#22c55e', 'Amarillo': '#f59e0b',
    'Naranja': '#f97316', 'Rojo': '#ef4444'
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          cursor: pointer; color: rgba(255,255,255,0.5);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.9);
        }
        .nav-item.active {
          background: rgba(122,200,150,0.12);
          color: #7ac896;
          border-color: rgba(122,200,150,0.15);
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
          color: #ff8080;
        }

        .triaje-card {
          background: white; border: 1px solid #edf0ec;
          border-radius: 16px; padding: 1.25rem 1.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .triaje-card:hover {
          border-color: #c8ddd0;
          box-shadow: 0 8px 28px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }
        .triaje-card.selected {
          border-color: #3d7a5a;
          box-shadow: 0 8px 28px rgba(61,122,90,0.12);
        }

        .btn-green {
          background: #1a3a2e; color: white;
          border: none; border-radius: 10px;
          padding: 0.65rem 1.25rem; font-size: 0.87rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .btn-green:hover {
          background: #2a5a44;
          box-shadow: 0 6px 18px rgba(26,58,46,0.28);
          transform: translateY(-2px);
        }
        .btn-outline-green {
          background: none; border: 1.5px solid #c8ddd0;
          border-radius: 10px; padding: 0.65rem 1.25rem;
          font-size: 0.87rem; font-weight: 600; color: #3d7a5a;
          cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .btn-outline-green:hover {
          background: #eef6f2; border-color: #3d7a5a;
          transform: translateY(-1px);
        }
        .btn-blue {
          background: #1a5f8a; color: white;
          border: none; border-radius: 10px;
          padding: 0.65rem 1.25rem; font-size: 0.87rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .btn-blue:hover {
          background: #134d72;
          box-shadow: 0 6px 18px rgba(26,95,138,0.25);
          transform: translateY(-2px);
        }

        .recomendacion-item {
          display: flex; gap: 0.75rem; align-items: flex-start;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0f4f2;
          transition: background 0.15s;
        }
        .recomendacion-item:last-child { border-bottom: none; }

        .overlay {
          position: fixed; inset: 0; zIndex: 200;
          background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: flex-end;
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(2px);
        }
        .ficha-panel {
          width: 480px; height: 100vh;
          background: white; overflow-y: auto;
          animation: slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; flex-direction: column;
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
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Portal paciente</p>
          </div>
        </div>

        {/* Usuario */}
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #3d7a5a, #2e6fa0)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.6rem'
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
            fontSize: '0.7rem', fontWeight: '700',
            letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>
          <div className="nav-item" onClick={() => navigate('/paciente')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Inicio
          </div>
          <div className="nav-item" onClick={() => navigate('/paciente/chat')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01"/>
            </svg>
            Nuevo triaje
          </div>
          <div className="nav-item active">
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
        width: '100%', height: '100vh', overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease' : 'none'
        }}>
          <div>
            <button
              onClick={() => navigate('/paciente')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#3d7a5a', fontSize: '0.85rem', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginBottom: '0.75rem', padding: 0,
                transition: 'opacity 0.15s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Volver al inicio
            </button>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#06111f' }}>
              Mis resultados
            </h1>
            <p style={{ margin: 0, color: '#4a6a4a', fontSize: '0.88rem' }}>
              {triajes.length} triajes registrados
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Gráfica de evolución */}
        <div style={{
          background: 'white', border: '1px solid #edf0ec',
          borderRadius: '16px', padding: '1.5rem',
          marginBottom: '1.5rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.1s both' : 'none'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.25rem'
          }}>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                Evolución de urgencia
              </p>
              <p style={{ margin: 0, color: '#4a6a4a', fontSize: '0.82rem' }}>
                Últimos 3 triajes registrados
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['Verde', 'Amarillo', 'Naranja', 'Rojo'].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{
                    width: '8px', height: '8px',
                    background: nivelColor[n], borderRadius: '50%'
                  }} />
                  <span style={{ fontSize: '0.72rem', color: '#6b8070', fontWeight: '500' }}>{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfica SVG */}
          <div style={{ position: 'relative', height: '160px' }}>
            <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
              {/* Líneas de referencia */}
              {[0, 33, 66, 100].map(p => (
                <line key={p} x1="0" y1={120 - p * 1.1} x2="600" y2={120 - p * 1.1}
                  stroke="#f0f4f2" strokeWidth="1"/>
              ))}

              {/* Área bajo la línea */}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d7a5a" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#3d7a5a" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {graficaNiveles.length > 1 && (() => {
                const pts = graficaNiveles.map((p, i) => ({
                  x: 60 + i * (480 / (graficaNiveles.length - 1)),
                  y: 120 - nivelAltura[p.nivel] * 1.1
                }))
                const areaPath = `M${pts[0].x},115 ` +
                  pts.map(p => `L${p.x},${p.y}`).join(' ') +
                  ` L${pts[pts.length-1].x},115 Z`
                const linePath = `M${pts[0].x},${pts[0].y} ` +
                  pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ')
                return (
                  <>
                    <path d={areaPath} fill="url(#areaGrad)"/>
                    <path d={linePath} fill="none" stroke="#3d7a5a" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="6" fill="white"
                          stroke={nivelColor[graficaNiveles[i].label]} strokeWidth="2.5"/>
                        <circle cx={p.x} cy={p.y} r="3"
                          fill={nivelColor[graficaNiveles[i].label]}/>
                        <text x={p.x} y={132} textAnchor="middle"
                          fontSize="10" fill="#6b8070" fontWeight="500">
                          {graficaNiveles[i].mes}
                        </text>
                        <text x={p.x} y={145} textAnchor="middle"
                          fontSize="9" fill="#9aaa9a">
                          {graficaNiveles[i].hora}
                        </text>
                      </g>
                    ))}
                  </>
                )
              })()}
            </svg>

            {/* Labels de nivel */}
            <div style={{
              position: 'absolute', left: 0, top: 0,
              height: '100%', display: 'flex',
              flexDirection: 'column', justifyContent: 'space-between',
              paddingBottom: '20px'
            }}>
              {['Rojo', 'Naranja', 'Amarillo', 'Verde'].map(n => (
                <span key={n} style={{
                  fontSize: '0.68rem', color: '#aabcb0', fontWeight: '500'
                }}>{n}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de triajes */}
        <div style={{ animation: mounted ? 'fadeInUp 0.5s ease 0.2s both' : 'none' }}>
          <p style={{
            margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: '700',
            color: '#4a6a4a', textTransform: 'uppercase', letterSpacing: '1.2px'
          }}>
            Historial completo
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loading && (
              <p style={{ color: '#aabcb0', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                Cargando historial...
              </p>
            )}
            {!loading && triajes.length === 0 && (
              <p style={{ color: '#aabcb0', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem 0' }}>
                Aún no tienes triajes registrados.
              </p>
            )}
            {triajes.map((t, i) => (
              <div
                key={t.id}
                className={`triaje-card ${selectedTriaje?.id === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedTriaje(t)}
                style={{
                  animation: `slideIn 0.4s ease ${i * 0.08}s both`,
                  borderLeft: `3px solid ${t.nivel.dot}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                  {/* Indicador nivel */}
                  <div style={{
                    width: '46px', height: '46px', flexShrink: 0,
                    background: t.nivel.bg,
                    border: `1.5px solid ${t.nivel.dot}40`,
                    borderRadius: '13px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '14px', height: '14px',
                      background: t.nivel.dot, borderRadius: '50%',
                      boxShadow: `0 0 8px ${t.nivel.dot}60`
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap'
                    }}>
                      <span style={{
                        background: t.nivel.bg, color: t.nivel.color,
                        fontSize: '0.75rem', fontWeight: '700',
                        padding: '0.22rem 0.7rem', borderRadius: '20px'
                      }}>
                        {t.nivel.label} — {t.nivel.texto}
                      </span>
                      <span style={{ color: '#aabcb0', fontSize: '0.78rem' }}>
                        {t.hora}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: '600', color: '#06111f', fontSize: '0.9rem' }}>
                      {t.fecha}
                    </p>
                    <p style={{ margin: 0, color: '#4a6a4a', fontSize: '0.82rem' }}>
                      {t.sintomas.slice(0, 2).join(' · ')}
                      {t.sintomas.length > 2 ? ` · +${t.sintomas.length - 2} más` : ''}
                    </p>
                  </div>

                  {/* Flecha */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={selectedTriaje?.id === t.id ? '#3d7a5a' : '#c8ddd0'} strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Panel de ficha clínica (overlay lateral) ── */}
      {selectedTriaje && (
        <div className="overlay" onClick={() => setSelectedTriaje(null)}>
          <div className="ficha-panel" onClick={e => e.stopPropagation()}>

            {/* Header de la ficha */}
            <div style={{
              background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
              padding: '1.75rem 1.5rem',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '1rem'
              }}>
                <div>
                  <p style={{
                    margin: '0 0 0.3rem', fontSize: '0.72rem', fontWeight: '700',
                    color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
                    letterSpacing: '1.5px'
                  }}>
                    Ficha clínica
                  </p>
                  <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '1rem' }}>
                    {selectedTriaje.fecha}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                    {selectedTriaje.hora}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTriaje(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', flexShrink: 0
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Badge nivel */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: selectedTriaje.nivel.bg,
                color: selectedTriaje.nivel.color,
                fontSize: '0.82rem', fontWeight: '700',
                padding: '0.35rem 0.9rem', borderRadius: '20px'
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  background: selectedTriaje.nivel.dot,
                  borderRadius: '50%',
                  boxShadow: `0 0 6px ${selectedTriaje.nivel.dot}`
                }} />
                Nivel {selectedTriaje.nivel.label} — {selectedTriaje.nivel.texto}
              </span>
            </div>

            {/* Cuerpo de la ficha */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

              {/* Médico asignado */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: '#f4f7f2', borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'linear-gradient(135deg, #3d7a5a, #2e6fa0)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.1rem', fontSize: '0.75rem', color: '#6b8070', fontWeight: '600' }}>
                    MÉDICO ASIGNADO
                  </p>
                  <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.9rem' }}>
                    {selectedTriaje.medico || 'Sin asignar'}
                  </p>
                </div>
              </div>

              {/* Síntomas */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{
                  margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: '700',
                  color: '#4a6a4a', textTransform: 'uppercase', letterSpacing: '1.2px'
                }}>
                  Síntomas reportados
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedTriaje.sintomas.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.6rem 0.85rem',
                      background: '#f8faf8', borderRadius: '10px',
                      border: '1px solid #edf0ec'
                    }}>
                      <div style={{
                        width: '6px', height: '6px',
                        background: selectedTriaje.nivel.dot,
                        borderRadius: '50%', flexShrink: 0
                      }} />
                      <span style={{ fontSize: '0.87rem', color: '#1e3a1e', fontWeight: '500' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendaciones */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{
                  margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: '700',
                  color: '#4a6a4a', textTransform: 'uppercase', letterSpacing: '1.2px'
                }}>
                  Recomendaciones de STIGA
                </p>
                <div style={{
                  background: '#f8faf8', border: '1px solid #edf0ec',
                  borderRadius: '12px', padding: '0.25rem 1rem'
                }}>
                  {selectedTriaje.recomendaciones.map((r, i) => (
                    <div key={i} className="recomendacion-item">
                      <div style={{
                        width: '22px', height: '22px', flexShrink: 0,
                        background: '#eef6f2', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: '1px'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3d7a5a' }}>
                          {i + 1}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#1e3a1e', lineHeight: 1.55, fontWeight: '500' }}>
                        {r}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mensaje de atención */}
              <div style={{
                padding: '1rem 1.1rem',
                background: selectedTriaje.requierePresencial ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${selectedTriaje.requierePresencial ? '#fde68a' : '#bbf7d0'}`,
                borderLeft: `3px solid ${selectedTriaje.requierePresencial ? '#f59e0b' : '#22c55e'}`,
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={selectedTriaje.requierePresencial ? '#b45309' : '#15803d'}
                    strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{
                    margin: 0, fontSize: '0.85rem', lineHeight: 1.55,
                    color: selectedTriaje.requierePresencial ? '#78350f' : '#14532d',
                    fontWeight: '500'
                  }}>
                    {selectedTriaje.mensajeAtencion}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedTriaje.requierePresencial && (
                  <button className="btn-blue" style={{ justifyContent: 'center' }} onClick={() => navigate('/paciente/teleconsulta')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Solicitar teleconsulta
                  </button>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-outline-green" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDescargarPDF}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar PDF
                  </button>
                  <button className="btn-outline-green" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCompartir}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Compartir
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1a3a2e', color: 'white', padding: '0.7rem 1.5rem',
          borderRadius: '12px', fontSize: '0.88rem', fontWeight: '600',
          zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          pointerEvents: 'none'
        }}>
          {toastMsg}
        </div>
      )}

    </div>
  )
}