import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import { startChat, sendMessage, syncForward, closeSession } from '../../api/api'

export default function PatientChat() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')
  const bottomRef = useRef(null)
  const sessionIdRef = useRef(null)
  const startedRef = useRef(false)

  const levelConfig = {
    Verde:    { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
    Amarillo: { color: '#d97706', bg: '#fefce8', border: '#fde68a', dot: '#f59e0b' },
    Naranja:  { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', dot: '#f97316' },
    Rojo:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  }

  useEffect(() => {
    if (!user?.email) { navigate('/login'); return }
    if (startedRef.current) return
    startedRef.current = true

    sessionIdRef.current = `${user.email}_${Date.now()}`
    const sessionId = sessionIdRef.current

    setTimeout(() => setMounted(true), 100)
    setTyping(true)
    startChat(sessionId)
      .then(({ data }) => {
        setTyping(false)
        setMessages([{ id: Date.now(), from: 'stiga', text: data.message }])
      })
      .catch(() => {
        setTyping(false)
        setApiError('No se pudo conectar con el servidor. Verifique su conexión.')
      })

    return () => {
      closeSession(sessionId).catch(() => {})
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const handleSend = async () => {
    if (!input.trim() || sessionDone || typing) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }])
    setTyping(true)
    setApiError('')

    try {
      const { data } = await sendMessage(sessionIdRef.current, text)
      setTyping(false)
      setMessages(prev => [...prev, { id: Date.now(), from: 'stiga', text: data.message }])

      if (data.status === 'complete' && data.triage_result) {
        const tr = data.triage_result
        setResult(tr)
        setSessionDone(true)
        syncForward(sessionIdRef.current, data.patient_data, tr).catch(() => {
          setApiError('No se pudo guardar el registro de triaje. Contacte al administrador.')
        })
      }
    } catch {
      setTyping(false)
      setApiError('Hubo un error. Por favor intente de nuevo.')
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const cfg = result ? levelConfig[result.color] : null

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
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dot-bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40%          { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes resultIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .msg-stiga {
          animation: fadeInLeft 0.35s ease;
        }
        .msg-user {
          animation: fadeInRight 0.35s ease;
        }
        .send-btn {
          width: 44px; height: 44px; border-radius: 12px;
          background: #1a3a2e; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; flex-shrink: 0;
        }
        .send-btn:hover { background: #2a5a44; transform: scale(1.05); }
        .send-btn:active { transform: scale(0.95); }
        .send-btn:disabled { background: #d0dcd4; cursor: not-allowed; transform: none; }
        .chat-input {
          flex: 1; border: 1.5px solid #e2e8ee;
          border-radius: 12px; padding: 0.7rem 1rem;
          font-size: 0.93rem; color: #1a2332;
          background: white; resize: none;
          font-family: inherit; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          max-height: 120px;
        }
        .chat-input:focus {
          border-color: #3d7a5a;
          box-shadow: 0 0 0 3px rgba(61,122,90,0.1);
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
          <div className="nav-item" onClick={() => navigate('/paciente')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Inicio
          </div>
          <div className="nav-item active">
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

        <button className="logout-btn" onClick={() => { logout(); navigate('/login') }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* ── Chat área ── */}
      <main style={{
        marginLeft: '240px', flex: 1,
        display: 'flex', flexDirection: 'column',
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s'
      }}>

        {/* Header del chat */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #edf0ec',
          padding: '1rem 2rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          flexShrink: 0
        }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: '700', color: '#0f2318', fontSize: '0.97rem' }}>
              STIGA
            </p>
            <p style={{ margin: 0, color: '#7a9080', fontSize: '0.78rem' }}>
              Asistente de triaje médico
            </p>
          </div>
          <div style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: '8px', height: '8px',
                background: '#22c55e', borderRadius: '50%',
                boxShadow: '0 0 6px rgba(34,197,94,0.5)'
              }} />
              <span style={{ color: '#7a9080', fontSize: '0.78rem' }}>En línea</span>
            </div>
            <AccessibilityMenu inline />
          </div>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1rem'
        }}>

          {messages.map(msg => (
            <div
              key={msg.id}
              className={msg.from === 'stiga' ? 'msg-stiga' : 'msg-user'}
              style={{
                display: 'flex',
                justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.75rem', alignItems: 'flex-end'
              }}
            >
              {/* Avatar STIGA */}
              {msg.from === 'stiga' && (
                <div style={{
                  width: '32px', height: '32px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
                    <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              )}

              {/* Burbuja */}
              <div style={{
                maxWidth: '65%',
                background: msg.from === 'stiga' ? 'white' : 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
                color: msg.from === 'stiga' ? '#1a2332' : 'white',
                border: msg.from === 'stiga' ? '1px solid #edf0ec' : 'none',
                borderRadius: msg.from === 'stiga'
                  ? '4px 16px 16px 16px'
                  : '16px 16px 4px 16px',
                padding: '0.85rem 1.1rem',
                fontSize: '0.92rem', lineHeight: 1.6,
                boxShadow: msg.from === 'stiga'
                  ? '0 2px 8px rgba(0,0,0,0.05)'
                  : '0 4px 16px rgba(26,58,46,0.3)'
              }}>
                {msg.text}
              </div>

              {/* Avatar usuario */}
              {msg.from === 'user' && (
                <div style={{
                  width: '32px', height: '32px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #3d7a5a, #2e6fa0)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '700' }}>
                    {user?.name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="msg-stiga" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                background: 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
                  <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{
                background: 'white', border: '1px solid #edf0ec',
                borderRadius: '4px 16px 16px 16px',
                padding: '0.85rem 1.1rem',
                display: 'flex', gap: '5px', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width: '7px', height: '7px',
                    background: '#3d7a5a', borderRadius: '50%',
                    animation: `dot-bounce 1.2s ease-in-out ${delay}s infinite`
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error de API */}
          {apiError && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fecaca',
              borderRadius: '10px', padding: '0.75rem 1rem',
              color: '#c0392b', fontSize: '0.85rem'
            }}>
              {apiError}
            </div>
          )}

          {/* Resultado del triaje */}
          {sessionDone && result && cfg && (
            <div style={{
              animation: 'resultIn 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              marginTop: '0.5rem'
            }}>
              {/* Separador */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                margin: '1rem 0'
              }}>
                <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
                <span style={{ color: '#aabcb0', fontSize: '0.75rem', fontWeight: '600' }}>
                  Resultado del triaje
                </span>
                <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
              </div>

              {/* Tarjeta resultado */}
              <div style={{
                background: 'white',
                border: `1.5px solid ${cfg.border}`,
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
              }}>
                {/* Header resultado */}
                <div style={{
                  background: cfg.bg,
                  padding: '1.5rem 1.75rem',
                  borderBottom: `1px solid ${cfg.border}`,
                  display: 'flex', alignItems: 'center', gap: '1.25rem'
                }}>
                  <div style={{
                    width: '52px', height: '52px',
                    background: 'white',
                    borderRadius: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${cfg.dot}30`
                  }}>
                    <div style={{
                      width: '20px', height: '20px',
                      background: cfg.dot, borderRadius: '50%',
                      boxShadow: `0 0 12px ${cfg.dot}80`
                    }} />
                  </div>
                  <div>
                    <p style={{
                      margin: '0 0 0.2rem',
                      fontSize: '0.75rem', fontWeight: '700',
                      color: cfg.color, textTransform: 'uppercase', letterSpacing: '1px'
                    }}>
                      Nivel {result.color}
                    </p>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f2318' }}>
                      {result.urgencia}
                    </h3>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <p style={{ margin: '0 0 0.15rem', fontSize: '0.75rem', color: '#aabcb0' }}>Confianza</p>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: cfg.color }}>
                      {Math.round(result.confianza * 100)}%
                    </p>
                  </div>
                </div>

                {/* Cuerpo resultado */}
                <div style={{ padding: '1.5rem 1.75rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    background: '#f8fafb', borderRadius: '12px',
                    marginBottom: '1.25rem'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d7a5a" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <div>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#0f2318', fontSize: '0.88rem' }}>
                        Acción recomendada
                      </p>
                      <p style={{ margin: 0, color: '#4a6a4a', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        {result.accion}
                      </p>
                    </div>
                  </div>

                  {result.escalado && (
                    <div style={{
                      background: '#fef3c7', border: '1px solid #fde68a',
                      borderRadius: '10px', padding: '0.6rem 1rem',
                      marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e'
                    }}>
                      Nivel ajustado por severidad de síntomas reportados.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => navigate('/paciente/resultados')}
                      style={{
                        flex: 1, background: '#1a3a2e', color: 'white',
                        border: 'none', borderRadius: '10px',
                        padding: '0.75rem', fontSize: '0.88rem', fontWeight: '600',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2a5a44'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1a3a2e'}
                    >
                      Ver resultado completo
                    </button>
                    <button
                      onClick={() => navigate('/paciente')}
                      style={{
                        flex: 1, background: 'none',
                        border: '1.5px solid #e2e8ee', color: '#3a4a3e',
                        borderRadius: '10px', padding: '0.75rem',
                        fontSize: '0.88rem', fontWeight: '600',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3d7a5a'; e.currentTarget.style.color = '#3d7a5a' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8ee'; e.currentTarget.style.color = '#3a4a3e' }}
                    >
                      Volver al inicio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!sessionDone && (
          <div style={{
            background: 'white',
            borderTop: '1px solid #edf0ec',
            padding: '1rem 2rem',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
            flexShrink: 0
          }}>
            <textarea
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escriba su respuesta aquí..."
              rows={1}
              disabled={typing}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || typing}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}

      </main>
    </div>
  )
}