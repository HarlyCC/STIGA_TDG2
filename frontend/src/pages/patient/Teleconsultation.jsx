import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import JitsiMeeting from '../../components/shared/JitsiMeeting'
import client from '../../api/api'

export default function PatientTeleconsultation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedTriaje, setSelectedTriaje] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [confirmedId, setConfirmedId] = useState('')
  const [triajes, setTriajes] = useState([])
  const [loadingTriajes, setLoadingTriajes] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [citasConfirmadas, setCitasConfirmadas] = useState([])
  const [activeMeeting, setActiveMeeting] = useState(null)


  const NIVEL_CFG = {
    Verde:    { label: 'Verde',    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
    Amarillo: { label: 'Amarillo', color: '#b45309', bg: '#fef3c7', border: '#fde68a', dot: '#f59e0b' },
    Naranja:  { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316' },
    Rojo:     { label: 'Rojo',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  }

  const handleConfirmar = async () => {
    setConfirming(true)
    setConfirmError('')
    try {
      const { data } = await client.post('/medico/mis-citas', {
        triaje_id:        selectedTriaje?.id ?? null,
        fecha_solicitada: selectedDate?.toISOString().split('T')[0] ?? null,
        hora_solicitada:  selectedSlot,
      })
      setConfirmedId(data.id)
      setStep(4)
    } catch {
      setConfirmError('No se pudo registrar la solicitud. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setConfirming(false)
    }
  }

  useEffect(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    const fecha = selectedDate.toISOString().split('T')[0]
    client.get(`/medico/disponibilidad?fecha=${fecha}`)
      .then(({ data }) => setSlots(data))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate])

  useEffect(() => {
    client.get('/medico/mis-citas')
      .then(({ data }) => setCitasConfirmadas(data.filter(c => c.status === 'confirmada')))
      .catch(() => {})
  }, [])


  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    client.get('/medico/mis-triajes')
      .then(({ data }) => setTriajes(data.map(r => {
        const color = r.triage_color || 'Verde'
        const cfg = NIVEL_CFG[color] || NIVEL_CFG.Verde
        const fecha = r.timestamp
          ? new Date(r.timestamp).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'
        return { id: r.id, fecha, sintomas: r.symptoms || 'Sin información', nivel: cfg }
      })))
      .catch(() => {})
      .finally(() => setLoadingTriajes(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }


  const doctor = { nombre: 'Pendiente de asignación', especialidad: 'Un médico revisará tu solicitud pronto', iniciales: '?' }

  const getWeekdays = () => {
    const days = []
    const d = new Date()
    d.setDate(d.getDate() + 1)
    while (days.length < 5) {
      if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return days
  }
  const weekdays = getWeekdays()

  const formatDate = (date) =>
    date?.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) ?? ''

  const formatDateShort = (date) =>
    date?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) ?? ''

  const STEPS = ['Triaje', 'Fecha y hora', 'Resumen', 'Confirmación']

  /* ── Render ── */
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
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0; }
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
        .triaje-card {
          display: flex; align-items: flex-start; gap: 1rem;
          padding: 1.1rem 1.25rem; border-radius: 14px;
          border: 1.5px solid #edf0ec; background: white;
          cursor: pointer; transition: all 0.2s ease;
        }
        .triaje-card:hover { border-color: #b0d0c0; box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .triaje-card.selected { border-color: #3d7a5a; box-shadow: 0 0 0 3px rgba(61,122,90,0.12); }
        .date-btn {
          flex: 1; padding: 0.75rem 0.5rem; border-radius: 12px;
          border: 1.5px solid #e2e8ee; background: white;
          cursor: pointer; transition: all 0.18s ease;
          display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
          font-family: inherit;
        }
        .date-btn:hover { border-color: #3d7a5a; }
        .date-btn.selected { background: #1a3a2e; border-color: #1a3a2e; }
        .slot-btn {
          padding: 0.6rem; border-radius: 10px;
          border: 1.5px solid #e2e8ee; background: white;
          cursor: pointer; transition: all 0.18s ease;
          font-size: 0.88rem; font-weight: 600; color: #1a2e1a;
          font-family: inherit;
        }
        .slot-btn:hover:not(:disabled) { border-color: #3d7a5a; color: #3d7a5a; }
        .slot-btn.selected { background: #1a3a2e; border-color: #1a3a2e; color: white; }
        .slot-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-primary {
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          color: white; border: none; border-radius: 12px;
          padding: 0.8rem 2rem; font-size: 0.92rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease; font-family: inherit;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(26,58,46,0.3); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-outline {
          background: none; border: 1.5px solid #e2e8ee; border-radius: 12px;
          padding: 0.8rem 2rem; font-size: 0.92rem; font-weight: 600;
          color: #3a4a3e; cursor: pointer; transition: all 0.18s ease; font-family: inherit;
        }
        .btn-outline:hover { border-color: #3d7a5a; color: #3d7a5a; }
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
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Portal paciente</p>
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
            background: 'linear-gradient(135deg, #3d7a5a, #2e6fa0)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '0.6rem',
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
            fontSize: '0.7rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>Menú</p>
          <div className="nav-item" onClick={() => navigate('/paciente')}>
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
          <div className="nav-item active">
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
            <p style={{ margin: '0 0 0.2rem', color: '#7a9080', fontSize: '0.9rem' }}>Portal paciente</p>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#0f2318' }}>
              Solicitar teleconsulta
            </h1>
            <p style={{ margin: 0, color: '#aabcb0', fontSize: '0.88rem' }}>
              Agenda una videollamada con tu médico
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Citas confirmadas */}
        {citasConfirmadas.length > 0 && step < 4 && (
          <div style={{
            marginBottom: '1.5rem',
            animation: mounted ? 'fadeInUp 0.5s ease 0.02s both' : 'none',
          }}>
            {citasConfirmadas.map(cita => (
              <div key={cita.id} style={{
                background: 'white', borderRadius: '16px',
                border: '1.5px solid #bbf7d0', padding: '1.1rem 1.5rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  width: '42px', height: '42px', flexShrink: 0,
                  background: '#dcfce7', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.1rem', fontWeight: '700', color: '#0f2318', fontSize: '0.92rem' }}>
                    Teleconsulta confirmada
                  </p>
                  <p style={{ margin: 0, color: '#7a9080', fontSize: '0.8rem' }}>
                    {cita.fecha_solicitada ?? '—'} · {cita.hora_solicitada ?? '—'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveMeeting(cita)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    padding: '0.6rem 1.2rem', fontSize: '0.85rem', fontWeight: '700',
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  Unirse a la consulta
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stepper */}
        {step < 4 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            marginBottom: '2rem',
            background: 'white', borderRadius: '16px',
            border: '1px solid #edf0ec', padding: '1.1rem 1.5rem',
            animation: mounted ? 'fadeInUp 0.5s ease 0.05s both' : 'none',
          }}>
            {STEPS.slice(0, 3).map((label, i) => {
              const num = i + 1
              const done = step > num
              const active = step === num
              return (
                <div key={num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? '#3d7a5a' : active ? '#1a3a2e' : '#f0f4f2',
                      border: `2px solid ${done ? '#3d7a5a' : active ? '#1a3a2e' : '#e2e8ee'}`,
                      transition: 'all 0.3s ease',
                    }}>
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: '0.75rem', fontWeight: '700',
                          color: active ? 'white' : '#aabcb0',
                        }}>{num}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: active ? '700' : '500',
                      color: done ? '#3d7a5a' : active ? '#0f2318' : '#aabcb0',
                      whiteSpace: 'nowrap',
                    }}>{label}</span>
                  </div>
                  {i < 2 && (
                    <div style={{
                      flex: 1, height: '2px', margin: '0 0.75rem',
                      background: done ? '#3d7a5a' : '#e2e8ee',
                      borderRadius: '2px', transition: 'background 0.3s ease',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Paso 1: Seleccionar triaje ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #edf0ec', padding: '1.5rem',
              marginBottom: '1.25rem',
            }}>
              <h2 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: '700', color: '#0f2318' }}>
                ¿Qué triaje motiva esta consulta?
              </h2>
              <p style={{ margin: '0 0 1.25rem', color: '#7a9080', fontSize: '0.85rem' }}>
                Selecciona el resultado de triaje que deseas comentar con el médico.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loadingTriajes && (
                  <p style={{ textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem', padding: '1rem 0' }}>
                    Cargando triajes…
                  </p>
                )}
                {!loadingTriajes && triajes.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem', padding: '1rem 0' }}>
                    No tienes triajes registrados. Inicia un triaje primero.
                  </p>
                )}
                {triajes.map(t => (
                  <div
                    key={t.id}
                    className={`triaje-card ${selectedTriaje?.id === t.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTriaje(t)}
                  >
                    {/* Indicador de selección */}
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                      border: `2px solid ${selectedTriaje?.id === t.id ? '#3d7a5a' : '#d0dcd4'}`,
                      background: selectedTriaje?.id === t.id ? '#3d7a5a' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}>
                      {selectedTriaje?.id === t.id && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>

                    {/* Dot de nivel */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                      background: t.nivel.dot, boxShadow: `0 0 6px ${t.nivel.dot}80`,
                    }} />

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.9rem' }}>
                          Triaje — {t.fecha}
                        </p>
                        <span style={{
                          background: t.nivel.bg, color: t.nivel.color,
                          fontSize: '0.7rem', fontWeight: '700',
                          padding: '0.1rem 0.5rem', borderRadius: '20px',
                        }}>
                          {t.nivel.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#7a9080', fontSize: '0.83rem', lineHeight: 1.4 }}>
                        {t.sintomas}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                disabled={!selectedTriaje}
                onClick={() => setStep(2)}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Fecha y hora ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            {/* Doctor asignado */}
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #edf0ec', padding: '1.25rem 1.5rem',
              marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                width: '48px', height: '48px', flexShrink: 0,
                background: 'linear-gradient(135deg, #2e6fa0, #3d7a5a)',
                borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: '700' }}>
                  {doctor.iniciales}
                </span>
              </div>
              <div>
                <p style={{ margin: '0 0 0.1rem', fontWeight: '700', color: '#0f2318', fontSize: '0.92rem' }}>
                  {doctor.nombre}
                </p>
                <p style={{ margin: 0, color: '#7a9080', fontSize: '0.8rem' }}>{doctor.especialidad}</p>
              </div>
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: '#f0fdf4', borderRadius: '20px', padding: '0.3rem 0.8rem',
                border: '1px solid #bbf7d0',
              }}>
                <div style={{ width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#15803d' }}>Disponible</span>
              </div>
            </div>

            {/* Selector de fecha */}
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #edf0ec', padding: '1.5rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: '700', color: '#3a4a3e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Selecciona una fecha
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {weekdays.map((d, i) => (
                  <button
                    key={i}
                    className={`date-btn ${selectedDate?.getTime() === d.getTime() ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: selectedDate?.getTime() === d.getTime() ? 'rgba(255,255,255,0.6)' : '#aabcb0',
                    }}>
                      {d.toLocaleDateString('es-CO', { weekday: 'short' })}
                    </span>
                    <span style={{
                      fontSize: '1.1rem', fontWeight: '800',
                      color: selectedDate?.getTime() === d.getTime() ? 'white' : '#0f2318',
                    }}>
                      {d.getDate()}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '500',
                      color: selectedDate?.getTime() === d.getTime() ? 'rgba(255,255,255,0.6)' : '#aabcb0',
                    }}>
                      {d.toLocaleDateString('es-CO', { month: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de hora */}
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #edf0ec', padding: '1.5rem',
              marginBottom: '1.25rem',
              opacity: selectedDate ? 1 : 0.45,
              transition: 'opacity 0.2s ease',
            }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: '700', color: '#3a4a3e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Horarios disponibles
              </p>
              {loadingSlots && (
                <p style={{ textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  Cargando horarios…
                </p>
              )}
              {!loadingSlots && selectedDate && slots.length === 0 && (
                <p style={{ textAlign: 'center', color: '#aabcb0', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  No hay horarios disponibles para este día.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {slots.map(s => (
                  <button
                    key={s.hora}
                    className={`slot-btn ${selectedSlot === s.hora ? 'selected' : ''}`}
                    disabled={!s.disponible || !selectedDate}
                    onClick={() => setSelectedSlot(s.hora)}
                  >
                    {s.hora}
                    {!s.disponible && (
                      <div style={{ fontSize: '0.65rem', color: 'inherit', opacity: 0.6 }}>Ocupado</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-outline" onClick={() => setStep(1)}>← Atrás</button>
              <button
                className="btn-primary"
                disabled={!selectedDate || !selectedSlot}
                onClick={() => setStep(3)}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Resumen ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #edf0ec', overflow: 'hidden',
              marginBottom: '1.25rem',
            }}>
              {/* Header resumen */}
              <div style={{
                background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
                padding: '1.5rem',
              }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: '700', color: '#7ac896', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Resumen de solicitud
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                  Revisa los detalles antes de confirmar
                </p>
              </div>

              {/* Detalles */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Triaje seleccionado */}
                <div style={{
                  background: '#f8fafb', borderRadius: '12px', padding: '1rem 1.25rem',
                  border: '1px solid #edf0ec',
                }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: '700', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                    Motivo de consulta
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.9rem' }}>
                      Triaje — {selectedTriaje?.fecha}
                    </p>
                    <span style={{
                      background: selectedTriaje?.nivel.bg, color: selectedTriaje?.nivel.color,
                      fontSize: '0.7rem', fontWeight: '700', padding: '0.1rem 0.5rem', borderRadius: '20px',
                    }}>
                      {selectedTriaje?.nivel.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#7a9080', fontSize: '0.83rem' }}>{selectedTriaje?.sintomas}</p>
                </div>

                {/* Fecha y hora */}
                <div style={{
                  background: '#f8fafb', borderRadius: '12px', padding: '1rem 1.25rem',
                  border: '1px solid #edf0ec',
                  display: 'flex', gap: '2rem',
                }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Fecha
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.92rem' }}>
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Hora
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.92rem' }}>
                      {selectedSlot} a.m./p.m.
                    </p>
                  </div>
                </div>

                {/* Doctor */}
                <div style={{
                  background: '#f8fafb', borderRadius: '12px', padding: '1rem 1.25rem',
                  border: '1px solid #edf0ec',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #2e6fa0, #3d7a5a)',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: '700' }}>{doctor.iniciales}</span>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.1rem', fontWeight: '700', color: '#0f2318', fontSize: '0.9rem' }}>
                      {doctor.nombre}
                    </p>
                    <p style={{ margin: 0, color: '#7a9080', fontSize: '0.8rem' }}>{doctor.especialidad}</p>
                  </div>
                </div>

                {/* Nota */}
                <div style={{
                  display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                  padding: '0.75rem 1rem', background: '#eff6fb',
                  borderRadius: '10px', border: '1px solid #dceaf4',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e6fa0" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8h.01M11 12h1v4h1"/>
                  </svg>
                  <p style={{ margin: 0, color: '#2e6fa0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Recibirás un enlace de videollamada por correo electrónico 15 minutos antes de la cita.
                  </p>
                </div>
              </div>
            </div>

            {confirmError && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.83rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                {confirmError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-outline" onClick={() => setStep(2)}>← Editar</button>
              <button className="btn-primary" onClick={handleConfirmar} disabled={confirming}>
                {confirming ? 'Enviando…' : 'Confirmar solicitud ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 4: Confirmación ── */}
        {step === 4 && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{
              background: 'white', borderRadius: '20px',
              border: '1px solid #edf0ec', overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
            }}>
              {/* Encabezado de éxito */}
              <div style={{
                background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
                padding: '2.5rem 1.5rem', textAlign: 'center',
              }}>
                {/* Icono animado */}
                <div style={{
                  width: '72px', height: '72px', margin: '0 auto 1.25rem',
                  background: 'rgba(34,197,94,0.15)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid rgba(34,197,94,0.3)',
                  animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray: 50, animation: 'checkDraw 0.5s ease 0.3s both' }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ margin: '0 0 0.4rem', color: 'white', fontSize: '1.4rem', fontWeight: '800' }}>
                  ¡Teleconsulta agendada!
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem' }}>
                  Tu cita ha sido confirmada exitosamente
                </p>
              </div>

              {/* Detalles de la cita */}
              <div style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* ID de cita */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f8fafb', borderRadius: '10px', padding: '0.8rem 1rem',
                  border: '1px solid #edf0ec',
                }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#7a9080', fontWeight: '500' }}>Código de cita</p>
                  <p style={{ margin: 0, fontWeight: '800', color: '#0f2318', fontSize: '0.92rem', letterSpacing: '1px' }}>
                    {confirmedId}
                  </p>
                </div>

                {/* Fecha y hora */}
                <div style={{
                  display: 'flex', gap: '0.75rem',
                }}>
                  <div style={{
                    flex: 1, background: '#f8fafb', borderRadius: '10px',
                    padding: '0.8rem 1rem', border: '1px solid #edf0ec',
                  }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', fontWeight: '700', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Fecha
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.88rem' }}>
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                  <div style={{
                    flex: 1, background: '#f8fafb', borderRadius: '10px',
                    padding: '0.8rem 1rem', border: '1px solid #edf0ec',
                  }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', fontWeight: '700', color: '#7a9080', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Hora
                    </p>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.88rem' }}>
                      {selectedSlot}
                    </p>
                  </div>
                </div>

                {/* Doctor */}
                <div style={{
                  background: '#f8fafb', borderRadius: '10px', padding: '0.8rem 1rem',
                  border: '1px solid #edf0ec',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    width: '38px', height: '38px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #2e6fa0, #3d7a5a)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '700' }}>{doctor.iniciales}</span>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.05rem', fontWeight: '700', color: '#0f2318', fontSize: '0.88rem' }}>
                      {doctor.nombre}
                    </p>
                    <p style={{ margin: 0, color: '#7a9080', fontSize: '0.77rem' }}>{doctor.especialidad}</p>
                  </div>
                </div>

                {/* Aviso de enlace */}
                <div style={{
                  display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                  padding: '0.8rem 1rem', background: '#f0fdf4',
                  borderRadius: '10px', border: '1px solid #bbf7d0',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p style={{ margin: 0, color: '#15803d', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Un médico revisará tu solicitud y la confirmará. Cuando esté confirmada, podrás unirte a la consulta desde la sección <strong>Mis Teleconsultas</strong>.
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    className="btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => { setStep(1); setSelectedTriaje(null); setSelectedDate(null); setSelectedSlot(null); setConfirmedId('') }}
                  >
                    Nueva solicitud
                  </button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => navigate('/paciente')}
                  >
                    Ir al inicio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {activeMeeting && (
        <JitsiMeeting
          roomId={`stiga-cita-${activeMeeting.id}`}
          displayName={user?.name ?? 'Paciente'}
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </div>
  )
}
