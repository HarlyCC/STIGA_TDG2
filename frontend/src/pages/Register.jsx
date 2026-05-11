import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import validator from 'validator'
import { register as registerApi } from '../api/api'
import client from '../api/api'
import { MUNICIPIOS_ANTIOQUIA } from '../constants/municipios'

const GENDER_OPTIONS = [
  { value: 0, label: 'Femenino' },
  { value: 1, label: 'Masculino' },
  { value: 2, label: 'Prefiero no decir' },
]

const CODE_LENGTH = 6

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [toast, setToast]     = useState(null)
  const [emailError, setEmailError] = useState('')
  const [digits, setDigits]   = useState(Array(CODE_LENGTH).fill(''))
  const inputsRef             = useRef([])

  const code = digits.join('')

  const [form, setForm] = useState({
    nombre: '', email: '', cedula: '',
    telefono: '', direccion: '', eps: '', ciudad: '',
    fecha_nacimiento: '', gender: '0',
  })

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3800)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'email') setEmailError('')
  }

  const validateEmail = () => {
    if (!form.email) return
    if (!validator.isEmail(form.email)) {
      setEmailError('El correo ingresado no es válido.')
      showToast('error', 'El correo ingresado no es válido.')
    }
  }

  const CAMPOS_OBLIGATORIOS = [
    { key: 'nombre',           label: 'Nombre completo' },
    { key: 'email',            label: 'Correo electrónico' },
    { key: 'cedula',           label: 'Cédula' },
    { key: 'telefono',         label: 'Teléfono' },
    { key: 'ciudad',           label: 'Ciudad / Municipio' },
    { key: 'fecha_nacimiento', label: 'Fecha de nacimiento' },
  ]

  const camposVacios = CAMPOS_OBLIGATORIOS.filter(c => !form[c.key]?.trim())
  const formularioCompleto = camposVacios.length === 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (camposVacios.length > 0) {
      showToast('error', `Campo obligatorio: ${camposVacios[0].label}`)
      return
    }
    if (!validator.isEmail(form.email)) {
      setEmailError('El correo ingresado no es válido.')
      showToast('error', 'El correo ingresado no es válido.')
      return
    }
    setLoading(true)
    try {
      await registerApi({ ...form, gender: parseInt(form.gender) })
      setStep(2)
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Error al registrar. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleDigitKey = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleDigitPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array(CODE_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (code.length !== CODE_LENGTH) {
      showToast('error', 'Ingrese el código de 6 dígitos.')
      return
    }
    setLoading(true)
    try {
      await client.post('/auth/verify', { email: form.email, code })
      showToast('success', '¡Cuenta verificada! Redirigiendo...')
      setTimeout(() => navigate('/login?verified=1'), 2200)
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Código incorrecto o expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await client.post('/auth/resend-code', { email: form.email })
      showToast('success', 'Nuevo código enviado a tu correo.')
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Error al reenviar el código.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex',
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
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        .input-stiga {
          width: 100%;
          background: #f8fafb;
          border: 1.5px solid #e2e8ee;
          border-radius: 10px;
          padding: 0.72rem 1rem;
          font-size: 0.9rem;
          color: #1a2332;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .input-stiga::placeholder { color: #b0bec5; }
        .input-stiga:focus {
          outline: none;
          border-color: #2e8fc0;
          box-shadow: 0 0 0 3px rgba(46,143,192,0.12);
          background: white;
        }
        .input-error {
          border-color: #f87171 !important;
          box-shadow: 0 0 0 3px rgba(248,113,113,0.12) !important;
          background: white !important;
        }
        .btn-primary {
          width: 100%;
          background: #1a3a2e;
          color: white; border: none;
          border-radius: 10px; padding: 0.85rem;
          font-size: 0.95rem; font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          letter-spacing: 0.3px; font-family: inherit;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2a5a44;
          box-shadow: 0 6px 20px rgba(26,58,46,0.28);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { background: #8aada0; cursor: wait; }
        .step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700; transition: all 0.3s ease;
        }
.link-btn {
          background: none; border: none;
          color: #2e8fc0; font-size: 0.85rem;
          cursor: pointer; padding: 0;
          font-family: inherit;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .link-btn:hover { color: #1a6fa0; }
        .link-btn:disabled { color: #aabcb0; cursor: wait; }
        select.input-stiga {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23b0bec5' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.85rem center;
          padding-right: 2.5rem;
          cursor: pointer;
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.85rem 1.25rem',
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '12px',
          color: toast.type === 'error' ? '#c0392b' : '#166534',
          fontSize: '0.88rem', fontWeight: '500',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          animation: 'toastIn 0.3s ease',
          maxWidth: '340px',
        }}>
          {toast.type === 'error' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Panel izquierdo ── */}
      <div style={{
        width: '40%', minWidth: '300px',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '3rem 2.5rem',
        position: 'relative', overflow: 'hidden',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease'
      }}>
        {/* Círculos decorativos */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '300px', height: '300px',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '220px', height: '220px',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.9rem',
            marginBottom: '2.5rem',
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
            <span style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '3px' }}>
              STIGA
            </span>
          </div>

          <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.15s both' : 'none' }}>
            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '700', lineHeight: 1.3, margin: '0 0 1rem' }}>
              Crea tu cuenta<br />
              <span style={{ color: '#7ac896' }}>en minutos</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>
              Registra tus datos para acceder al triaje médico inteligente. Tus datos quedan protegidos y solo los usa el sistema de salud.
            </p>
          </div>
        </div>

        {/* Pasos del proceso */}
        <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.3s both' : 'none' }}>
          <p style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem',
            fontWeight: '600', letterSpacing: '1.5px',
            textTransform: 'uppercase', margin: '0 0 1.25rem'
          }}>Proceso de registro</p>

          {[
            { n: 1, label: 'Datos personales', desc: 'Completa el formulario' },
            { n: 2, label: 'Verificación',     desc: 'Código enviado al correo' },
            { n: 3, label: 'Listo',            desc: 'Inicia sesión' },
          ].map((s, i) => {
            const done    = step > s.n
            const current = step === s.n
            return (
              <div key={s.n} style={{ display: 'flex', gap: '0.9rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="step-dot" style={{
                    background: done ? '#7ac896' : current ? 'rgba(122,200,150,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${done ? '#7ac896' : current ? '#7ac896' : 'rgba(255,255,255,0.12)'}`,
                    color: done ? '#0f2318' : current ? '#7ac896' : 'rgba(255,255,255,0.3)',
                  }}>
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : s.n}
                  </div>
                  {i < 2 && (
                    <div style={{
                      width: '1px', flex: 1, minHeight: '20px',
                      background: done ? '#7ac896' : 'rgba(255,255,255,0.08)',
                      margin: '4px 0'
                    }} />
                  )}
                </div>
                <div style={{ paddingTop: '4px' }}>
                  <p style={{
                    margin: '0 0 0.1rem', fontSize: '0.85rem', fontWeight: '600',
                    color: current ? 'white' : done ? '#7ac896' : 'rgba(255,255,255,0.35)'
                  }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: 0,
          animation: mounted ? 'fadeInLeft 0.7s ease 0.4s both' : 'none'
        }}>
          Universidad Católica Luis Amigó · 2026
        </p>
      </div>

      {/* ── Panel derecho ── */}
      <div style={{
        flex: 1, minWidth: 0, background: '#ffffff',
        height: '100vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '2.5rem 3.5rem',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(20px)',
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
      }}>
        <div style={{ maxWidth: '520px', width: '100%', margin: 'auto 0' }}>

          {/* ── STEP 1: Formulario de registro ── */}
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '38px', height: '38px', marginBottom: '1.5rem',
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                  borderRadius: '50%', cursor: 'pointer', transition: 'all 0.18s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1a3a2e'; e.currentTarget.style.borderColor = '#1a3a2e' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a2e" strokeWidth="2.5" style={{ pointerEvents: 'none' }}>
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <div style={{
                marginBottom: '2rem',
                animation: mounted ? 'fadeInRight 0.6s ease 0.2s both' : 'none'
              }}>
                <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.65rem', fontWeight: '700', color: '#0f2318' }}>
                  Datos personales
                </h1>
                <p style={{ margin: 0, color: '#7a9080', fontSize: '0.88rem' }}>
                  Estos datos permitirán a STIGA atenderte mejor
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ animation: mounted ? 'fadeInRight 0.6s ease 0.3s both' : 'none' }}>

                {/* Nombre */}
                <Field label="Nombre completo">
                  <input
                    className="input-stiga" name="nombre" required
                    value={form.nombre} onChange={handleChange}
                    placeholder="Ej. Ana María Restrepo"
                  />
                </Field>

                {/* Email */}
                <Field label="Correo electrónico" error={emailError}>
                  <input
                    className={`input-stiga${emailError ? ' input-error' : ''}`}
                    name="email" type="email" required
                    value={form.email} onChange={handleChange}
                    onBlur={validateEmail}
                    placeholder="correo@ejemplo.com"
                  />
                </Field>

                {/* Cédula + Teléfono */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="Cédula *">
                    <input
                      className="input-stiga" name="cedula" required
                      value={form.cedula} onChange={handleChange}
                      placeholder="Número de cédula"
                    />
                  </Field>
                  <Field label="Teléfono *">
                    <input
                      className="input-stiga" name="telefono" required
                      value={form.telefono} onChange={handleChange}
                      placeholder="Ej. 3001234567"
                    />
                  </Field>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  background: '#fffbeb', border: '1.5px solid #fde68a',
                  borderRadius: '10px', padding: '0.75rem 1rem',
                  margin: '0.1rem 0 0.85rem',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Contraseña inicial:</strong> los últimos 6 dígitos de tu cédula.<br />
                    <span style={{ color: '#b45309' }}>Ejemplo: cédula 1020107203 → contraseña <strong>107203</strong></span>
                  </p>
                </div>

                {/* Dirección */}
                <Field label="Dirección">
                  <input
                    className="input-stiga" name="direccion" required
                    value={form.direccion} onChange={handleChange}
                    placeholder="Vereda, corregimiento o municipio"
                  />
                </Field>

                {/* EPS + Ciudad */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="EPS">
                    <input
                      className="input-stiga" name="eps" required
                      value={form.eps} onChange={handleChange}
                      placeholder="Ej. Sura, Coosalud"
                    />
                  </Field>
                  <Field label="Ciudad / Municipio *">
                    <select
                      className="input-stiga" name="ciudad" required
                      value={form.ciudad} onChange={handleChange}
                    >
                      <option value="">Selecciona tu municipio…</option>
                      {MUNICIPIOS_ANTIOQUIA.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Fecha nacimiento + Sexo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="Fecha de nacimiento *">
                    <input
                      className="input-stiga" name="fecha_nacimiento" type="date" required
                      value={form.fecha_nacimiento} onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </Field>
                  <Field label="Sexo biológico">
                    <select className="input-stiga" name="gender" value={form.gender} onChange={handleChange}>
                      {GENDER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <button className="btn-primary" type="submit" disabled={loading || !formularioCompleto} style={{ marginTop: '0.5rem' }}>
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite'
                      }} />
                      Enviando código...
                    </>
                  ) : 'Continuar →'}
                </button>

                <p style={{ textAlign: 'center', margin: '1.25rem 0 0', fontSize: '0.85rem', color: '#7a9080' }}>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => navigate('/login')}
                  >
                    Inicia sesión
                  </button>
                </p>
              </form>
            </>
          )}

          {/* ── STEP 2: Verificación de código ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeInRight 0.5s ease' }}>

              {/* Ícono */}
              <div style={{
                width: '64px', height: '64px',
                background: 'linear-gradient(135deg, #1a3a2e, #2a5a44)',
                borderRadius: '18px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(26,58,46,0.25)'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>

              <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.65rem', fontWeight: '700', color: '#0f2318' }}>
                Revisa tu correo
              </h1>
              <p style={{ margin: '0 0 0.35rem', color: '#7a9080', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Enviamos un código de 6 dígitos a:
              </p>
              <div style={{ margin: '0 0 2rem', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <p style={{
                  margin: 0, fontWeight: '700', color: '#1a3a2e',
                  fontSize: '0.95rem', background: '#f0fdf4',
                  padding: '0.5rem 1rem', borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                }}>
                  {form.email}
                </p>
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: '0.8rem', color: '#2e8fc0' }}
                  onClick={() => setStep(1)}
                >
                  ¿Correo incorrecto? Corregirlo
                </button>
              </div>

              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{
                    display: 'block', fontSize: '0.78rem', fontWeight: '600',
                    color: '#3a4a3e', marginBottom: '0.75rem', letterSpacing: '0.3px'
                  }}>
                    Código de verificación
                  </label>
                  <div style={{
                    display: 'flex', gap: '0.6rem', justifyContent: 'center'
                  }}
                    onPaste={handleDigitPaste}
                  >
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => inputsRef.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        autoFocus={i === 0}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleDigitKey(i, e)}
                        style={{
                          width: '52px', height: '60px',
                          textAlign: 'center',
                          fontSize: '1.6rem', fontWeight: '800',
                          color: '#1a3a2e',
                          background: d ? '#f0fdf4' : '#f8fafb',
                          border: `2px solid ${d ? '#3d7a5a' : '#e2e8ee'}`,
                          borderRadius: '12px',
                          outline: 'none',
                          transition: 'border-color 0.2s, background 0.2s',
                          fontFamily: 'monospace',
                          cursor: 'text',
                        }}
                        onFocus={e => e.target.style.borderColor = '#2e8fc0'}
                        onBlur={e => e.target.style.borderColor = d ? '#3d7a5a' : '#e2e8ee'}
                      />
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#aabcb0', margin: '0.5rem 0 1.25rem', textAlign: 'center' }}>
                  El código expira en 15 minutos
                </p>

                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  background: '#fffbeb', border: '1.5px solid #fde68a',
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Tu contraseña inicial</strong> son los últimos 6 dígitos de tu cédula.<br />
                    Úsala para iniciar sesión una vez verifiques tu cuenta.
                  </p>
                </div>

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
                  ) : 'Verificar cuenta'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#7a9080' }}>
                    ¿No recibiste el correo?
                  </p>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                </div>

                <div style={{
                  marginTop: '2rem', paddingTop: '1.25rem',
                  borderTop: '1px solid #edf0ec', textAlign: 'center'
                }}>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: '#aabcb0', fontSize: '0.82rem', textDecoration: 'none' }}
                    onClick={() => setStep(1)}
                  >
                    ← Volver al formulario
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Componente auxiliar para campos del formulario */
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={{
        display: 'block', fontSize: '0.78rem', fontWeight: '600',
        color: '#3a4a3e', marginBottom: '0.35rem', letterSpacing: '0.3px'
      }}>
        {label}
      </label>
      {children}
      {error && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: '#c0392b' }}>
          {error}
        </p>
      )}
    </div>
  )
}
