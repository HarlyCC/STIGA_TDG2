import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionRole, setTransitionRole] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const users = {
      'paciente@stiga.co': { name: 'Juan Pérez',       role: 'paciente' },
      'medico@stiga.co':   { name: 'Dra. María López', role: 'medico'   },
      'admin@stiga.co':    { name: 'Administrador',    role: 'admin'    },
    }

    setTimeout(() => {
      const user = users[email]
      if (!user || password !== '1234') {
        setError('Correo o contraseña incorrectos')
        setLoading(false)
        return
      }
      login(user, 'token-demo-' + user.role)
      setLoading(false)
      setTransitionRole(user.role)
      setTransitioning(true)
      setTimeout(() => navigate('/' + user.role), 2400)
    }, 800)
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
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      overflow: 'hidden'
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
        .demo-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.6rem 0.75rem; border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          border: 1px solid transparent;
        }
        .demo-row:hover {
          background: rgba(46,143,192,0.06);
          border-color: rgba(46,143,192,0.15);
          transform: translateX(3px);
        }
      `}</style>

      {/* ── Panel izquierdo oscuro ── */}
      <div style={{
        width: '45%', minWidth: '340px',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '3rem',
        position: 'relative', overflow: 'hidden',
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
          Universidad Católica Luis Amigó · 2025
        </p>
      </div>

      {/* ── Panel derecho blanco ── */}
      <div style={{
        flex: 1, background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '3rem 4rem',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(20px)',
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
      }}>
        <div style={{ maxWidth: '380px', width: '100%' }}>

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
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: '600',
                color: '#3a4a3e', marginBottom: '0.4rem', letterSpacing: '0.3px'
              }}>
                Contraseña
              </label>
              <input
                className="input-stiga" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
              />
            </div>

            {error && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '0.65rem 1rem',
                marginBottom: '1rem', color: '#c0392b',
                fontSize: '0.85rem', animation: 'fadeInUp 0.3s ease'
              }}>
                {error}
              </div>
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
          </form>

          {/* Divisor */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            margin: '1.75rem 0',
            animation: mounted ? 'fadeInRight 0.6s ease 0.4s both' : 'none'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
            <span style={{ color: '#b0c0b4', fontSize: '0.78rem', fontWeight: '500' }}>
              accesos de prueba
            </span>
            <div style={{ flex: 1, height: '1px', background: '#edf0ec' }} />
          </div>

          {/* Usuarios demo */}
          <div style={{ animation: mounted ? 'fadeInRight 0.6s ease 0.5s both' : 'none' }}>
            {[
              { email: 'paciente@stiga.co', label: 'Paciente',      role: 'P', color: '#3d7a5a' },
              { email: 'medico@stiga.co',   label: 'Médico',        role: 'M', color: '#2e8fc0' },
              { email: 'admin@stiga.co',    label: 'Administrador', role: 'A', color: '#374151' },
            ].map(u => (
              <div
                key={u.email} className="demo-row"
                onClick={() => { setEmail(u.email); setPassword('1234') }}
              >
                <div style={{
                  width: '34px', height: '34px',
                  background: u.color + '15',
                  border: `1px solid ${u.color}30`,
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: '700',
                  color: u.color, flexShrink: 0
                }}>
                  {u.role}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: '600', color: '#1a2e1a' }}>
                    {u.label}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#8aaa8a' }}>
                    {u.email}
                  </p>
                </div>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.72rem',
                  color: '#b0c0b4', fontWeight: '500'
                }}>
                  1234
                </span>
              </div>
            ))}
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