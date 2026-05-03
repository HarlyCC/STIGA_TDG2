import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client, { login as loginApi } from '../api/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionRole, setTransitionRole] = useState('')
  const [showMedicoForm, setShowMedicoForm] = useState(false)
  const [medicoForm, setMedicoForm] = useState({
    tipo_documento: 'CC', numero_documento: '', nombre: '',
    centro_salud: '', especialidad: '', telefono: '', email: '',
  })
  const [medicoSubmitting, setMedicoSubmitting] = useState(false)
  const [medicoSuccess, setMedicoSuccess] = useState(false)
  const [medicoError, setMedicoError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justVerified = new URLSearchParams(location.search).get('verified') === '1'

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginApi(email, password)
      const userData = { name: data.user.nombre, role: data.user.role, email: data.user.email }
      login(userData, data.access_token)
      setTransitionRole(data.user.role)
      setTransitioning(true)
      setTimeout(() => navigate('/' + data.user.role), 2400)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join('. ') || 'Correo o contraseña incorrectos')
      } else {
        setError(detail || 'Correo o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMedicoSubmit = async (e) => {
    e.preventDefault()
    setMedicoError('')
    setMedicoSubmitting(true)
    try {
      await client.post('/auth/request-doctor-access', medicoForm)
      setMedicoSuccess(true)
    } catch (err) {
      setMedicoError(err?.response?.data?.detail || 'No se pudo enviar la solicitud. Intenta de nuevo.')
    } finally {
      setMedicoSubmitting(false)
    }
  }

  const roleLabel = {
    paciente: 'Bienvenido a tu portal de salud',
    medico:   'Cargando panel clínico',
    admin:    'Accediendo al panel de control',
  }

  const transitionBg = {
    paciente: 'linear-gradient(160deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
    medico:   'linear-gradient(160deg, #0a1e36 0%, #0e3a5a 50%, #0a1e36 100%)',
    admin:    'linear-gradient(160deg, #111827 0%, #1f2937 50%, #111827 100%)',
  }

  const transitionBar = {
    paciente: 'linear-gradient(90deg, #3d7a5a, #7ac896)',
    medico:   'linear-gradient(90deg, #2e8fc0, #7dd4f0)',
    admin:    'linear-gradient(90deg, #374151, #9ca3af)',
  }

  const transitionAccent = {
    paciente: '#7ac896',
    medico:   '#7dd4f0',
    admin:    '#d1d5db',
  }

  return (
    <div style={{
      height: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
    }}>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes stigaReveal {
          0%   { opacity: 0; transform: scale(0.7) translateY(30px); }
          65%  { opacity: 1; transform: scale(1.04) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes letterSpread {
          0%   { letter-spacing: -4px; opacity: 0; }
          100% { letter-spacing: 8px; opacity: 1; }
        }
        @keyframes barFill {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .input-stiga {
          width: 100%;
          background: #f8fafb;
          border: 1.5px solid #e2e8ee;
          border-radius: 10px;
          padding: 0.78rem 1rem;
          font-size: 0.95rem;
          color: #1a2332;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-stiga::placeholder { color: #b0bec5; }
        .input-stiga:focus {
          outline: none;
          border-color: #2e8fc0;
          box-shadow: 0 0 0 3px rgba(46,143,192,0.12);
          background: white;
        }
        .btn-primary {
          width: 100%;
          background: #1a3a2e;
          color: white; border: none;
          border-radius: 10px; padding: 0.85rem;
          font-size: 0.97rem; font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          letter-spacing: 0.3px;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2a5a44;
          box-shadow: 0 6px 20px rgba(26,58,46,0.28);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { background: #8aada0; cursor: wait; }
      `}</style>

      {/* ── Panel izquierdo oscuro ── */}
      <div style={{
        width: '45%', minWidth: '340px',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '3rem',
        height: '100vh', overflow: 'hidden', flexShrink: 0,
        position: 'relative',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease'
      }}>

        {/* Círculos decorativos */}
        <div style={{
          position: 'absolute', top: '-120px', right: '-120px',
          width: '350px', height: '350px',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-80px',
          width: '260px', height: '260px',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '50%'
        }} />

        {/* Logo y título */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.9rem',
            marginBottom: '3rem',
            animation: mounted ? 'fadeInLeft 0.7s ease' : 'none'
          }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none"/>
                <path d="M12 8v8M8 12h8" stroke="rgba(122,200,150,0.9)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{
              color: 'white', fontSize: '1.3rem',
              fontWeight: '800', letterSpacing: '3px'
            }}>STIGA</span>
          </div>

          <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.15s both' : 'none' }}>
            <h2 style={{
              color: 'white', fontSize: '1.9rem',
              fontWeight: '700', lineHeight: 1.3, margin: '0 0 1rem'
            }}>
              Triaje médico<br />
              <span style={{ color: '#7ac896' }}>inteligente</span>
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.92rem', lineHeight: 1.7, margin: 0
            }}>
              Plataforma de apoyo clínico para zonas rurales de Antioquia. Orientación médica accesible para quienes más lo necesitan.
            </p>
          </div>
        </div>

        {/* Niveles de triaje */}
        <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.3s both' : 'none' }}>
          <p style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem',
            fontWeight: '600', letterSpacing: '1.5px',
            textTransform: 'uppercase', margin: '0 0 1rem'
          }}>
            Niveles de triaje
          </p>
          {[
            { color: '#e74c3c', label: 'Rojo',     desc: 'Emergencia crítica' },
            { color: '#e67e22', label: 'Naranja',  desc: 'Urgencia alta' },
            { color: '#f1c40f', label: 'Amarillo', desc: 'Urgencia moderada' },
            { color: '#27ae60', label: 'Verde',    desc: 'No urgente' },
          ].map(n => (
            <div key={n.label} style={{
              display: 'flex', alignItems: 'center',
              gap: '0.75rem', marginBottom: '0.6rem'
            }}>
              <div style={{
                width: '10px', height: '10px',
                background: n.color, borderRadius: '50%', flexShrink: 0,
                boxShadow: `0 0 8px ${n.color}60`
              }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                <strong style={{ color: 'white' }}>{n.label}</strong> — {n.desc}
              </span>
            </div>
          ))}
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', margin: 0,
          animation: mounted ? 'fadeInLeft 0.7s ease 0.4s both' : 'none'
        }}>
          Universidad Católica Luis Amigó · 2026
        </p>
      </div>

      {/* ── Panel derecho blanco ── */}
      <div style={{
        flex: 1, background: '#ffffff',
        height: '100vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(20px)',
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
      }}>
        {/* Bloque login — margin:auto lo centra verticalmente cuando hay espacio */}
        <div style={{ width: '100%', maxWidth: '480px', margin: 'auto', padding: 'clamp(1rem, 4vh, 3rem) 2rem 1.5rem' }}>
        <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>

          {/* Encabezado */}
          <div style={{
            marginBottom: '2.5rem',
            animation: mounted ? 'fadeInRight 0.6s ease 0.2s both' : 'none'
          }}>
            <h1 style={{
              margin: '0 0 0.4rem', fontSize: '1.75rem',
              fontWeight: '700', color: '#0f2318'
            }}>
              Bienvenido
            </h1>
            <p style={{ margin: 0, color: '#7a9080', fontSize: '0.92rem' }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Banner cuenta verificada */}
          {justVerified && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '0.75rem 1rem',
              marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p style={{ margin: 0, color: '#15803d', fontSize: '0.84rem', fontWeight: '500' }}>
                ¡Cuenta verificada! Ya puedes iniciar sesión.
              </p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{
            animation: mounted ? 'fadeInRight 0.6s ease 0.3s both' : 'none'
          }}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: '600',
                color: '#3a4a3e', marginBottom: '0.4rem', letterSpacing: '0.3px'
              }}>
                Correo electrónico
              </label>
              <input
                className="input-stiga" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com" required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{
                  fontSize: '0.82rem', fontWeight: '600',
                  color: '#3a4a3e', letterSpacing: '0.3px'
                }}>
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'none', border: 'none',
                    color: '#2e8fc0', fontWeight: '500',
                    cursor: 'pointer', padding: 0,
                    fontSize: '0.78rem', textDecoration: 'underline',
                    fontFamily: 'inherit'
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                className="input-stiga" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p style={{
                margin: '0 0 1rem', color: '#c0392b',
                fontSize: '0.85rem', animation: 'fadeInUp 0.3s ease',
                textAlign: 'center'
              }}>
                {error}
              </p>
            )}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                  Verificando...
                </>
              ) : 'Ingresar'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '1.1rem', fontSize: '0.85rem', color: '#7a9080' }}>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                style={{
                  background: 'none', border: 'none',
                  color: '#2e8fc0', fontWeight: '600',
                  cursor: 'pointer', padding: 0,
                  fontSize: '0.85rem', textDecoration: 'underline',
                  fontFamily: 'inherit'
                }}
              >
                Regístrate aquí
              </button>
            </p>
          </form>

          {/* Separador y botón de solicitud médica */}
          <div style={{
            marginTop: '1.75rem',
            animation: mounted ? 'fadeInRight 0.6s ease 0.6s both' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
              <span style={{ color: '#b0c0b4', fontSize: '0.78rem', fontWeight: '500' }}>personal médico</span>
              <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
            </div>
            <button
              type="button"
              onClick={() => { setShowMedicoForm(v => !v); setMedicoSuccess(false); setMedicoError('') }}
              style={{
                width: '100%', background: showMedicoForm ? '#f3f4f6' : 'white',
                border: `1.5px solid ${showMedicoForm ? '#9ca3af' : '#d1d5db'}`,
                borderRadius: '10px', padding: '0.7rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7ac896" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.32a2 2 0 0 1 1.95-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: '600', color: '#0f2318' }}>
                  ¿Eres médico de nuestro equipo?
                </p>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#7a9080' }}>
                  Solicita tu acceso al sistema
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
                style={{ transform: showMedicoForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

        </div>
        </div>

        {/* Formulario de solicitud médica — expande debajo */}
        <div style={{
          width: '100%', maxWidth: '480px',
          flexShrink: 0,
          overflow: 'hidden',
          maxHeight: showMedicoForm ? '1400px' : '0',
          transition: 'max-height 0.55s cubic-bezier(0.4,0,0.2,1)',
          padding: showMedicoForm ? '0 2rem 3rem' : '0 2rem 0',
        }}>
          <div style={{
            borderRadius: '18px', overflow: 'hidden',
            border: '1px solid #e5e7eb',
            boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
          }}>
            {/* Header oscuro STIGA */}
            <div style={{
              background: 'linear-gradient(135deg, #0f2318 0%, #1a3a2e 100%)',
              padding: '1.5rem 2rem',
            }}>
              <p style={{ margin: '0 0 0.15rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Solicitud de acceso
              </p>
              <h2 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: '700' }}>
                Personal médico
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                Completa el formulario y el equipo de STIGA evaluará tu solicitud para crear tu cuenta.
              </p>
            </div>

            {/* Cuerpo del formulario */}
            <div style={{ background: 'white', padding: '1.75rem 2rem' }}>
              {medicoSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#f0fdf4', border: '2px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p style={{ margin: '0 0 0.4rem', fontWeight: '700', color: '#0f2318', fontSize: '1rem' }}>
                    Solicitud enviada
                  </p>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Hemos recibido tu información. El equipo de STIGA revisará tu solicitud y se comunicará contigo pronto.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMedicoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                        Tipo de documento *
                      </label>
                      <select
                        value={medicoForm.tipo_documento}
                        onChange={e => setMedicoForm(f => ({ ...f, tipo_documento: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #e2e8ee', borderRadius: '10px', fontSize: '0.88rem', color: '#1a2332', background: '#f8fafb', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', textAlignLast: 'center' }}
                      >
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="PP">PP</option>
                        <option value="TI">TI</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                        Número de documento *
                      </label>
                      <input
                        className="input-stiga"
                        placeholder="Ej. 1023456789"
                        value={medicoForm.numero_documento}
                        onChange={e => setMedicoForm(f => ({ ...f, numero_documento: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                      Nombre completo *
                    </label>
                    <input
                      className="input-stiga"
                      placeholder="Ej. Dra. María Rodríguez"
                      value={medicoForm.nombre}
                      onChange={e => setMedicoForm(f => ({ ...f, nombre: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                      Centro de salud / IPS *
                    </label>
                    <input
                      className="input-stiga"
                      placeholder="Ej. Hospital San Rafael de Buriticá"
                      value={medicoForm.centro_salud}
                      onChange={e => setMedicoForm(f => ({ ...f, centro_salud: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                      Especialidad médica
                    </label>
                    <input
                      className="input-stiga"
                      placeholder="Ej. Medicina general, Urgenciología…"
                      value={medicoForm.especialidad}
                      onChange={e => setMedicoForm(f => ({ ...f, especialidad: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                        Teléfono de contacto *
                      </label>
                      <input
                        className="input-stiga"
                        placeholder="Ej. 3001234567"
                        value={medicoForm.telefono}
                        onChange={e => setMedicoForm(f => ({ ...f, telefono: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#3a4a3e', marginBottom: '0.35rem' }}>
                        Correo electrónico *
                      </label>
                      <input
                        className="input-stiga"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={medicoForm.email}
                        onChange={e => setMedicoForm(f => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {medicoError && (
                    <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 1rem', color: '#c0392b', fontSize: '0.85rem' }}>
                      {medicoError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={medicoSubmitting}
                    style={{
                      background: medicoSubmitting ? '#8aada0' : '#1a3a2e',
                      color: 'white', border: 'none', borderRadius: '10px',
                      padding: '0.82rem', fontSize: '0.93rem', fontWeight: '600',
                      cursor: medicoSubmitting ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      transition: 'background 0.2s', fontFamily: 'inherit',
                      marginTop: '0.25rem',
                    }}
                  >
                    {medicoSubmitting ? (
                      <>
                        <div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        Enviando solicitud…
                      </>
                    ) : 'Enviar solicitud'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Pantalla de transición por rol ── */}
      {transitioning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: transitionBg[transitionRole],
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          animation: 'overlayIn 0.35s ease'
        }}>

          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            marginBottom: '2.5rem',
            animation: 'stigaReveal 0.7s cubic-bezier(0.34,1.56,0.64,1)'
          }}>
            <div style={{
              width: '60px', height: '60px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
                <path d="M12 8v8M8 12h8" stroke={transitionAccent[transitionRole]} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{
              color: 'white', fontSize: '2.4rem', fontWeight: '900',
              animation: 'letterSpread 0.8s ease 0.2s both'
            }}>
              STIGA
            </span>
          </div>

          {/* Mensaje */}
          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.95rem', fontWeight: '400',
            margin: '0 0 2rem',
            animation: 'fadeInUp 0.5s ease 0.5s both'
          }}>
            {roleLabel[transitionRole]}
          </p>

          {/* Barra de progreso */}
          <div style={{
            width: '180px', height: '3px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px', overflow: 'hidden',
            animation: 'fadeInUp 0.5s ease 0.6s both'
          }}>
            <div style={{
              height: '100%',
              background: transitionBar[transitionRole],
              borderRadius: '3px',
              animation: 'barFill 1.8s cubic-bezier(0.4,0,0.2,1) 0.4s both'
            }} />
          </div>

        </div>
      )}

    </div>
  )
}