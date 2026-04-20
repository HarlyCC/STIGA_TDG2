import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/api'

const CODE_LENGTH = 6

export default function ForgotPassword() {
  const [step, setStep]         = useState(1) // 1=email, 2=codigo+pass, 3=exito
  const [email, setEmail]       = useState('')
  const [digits, setDigits]     = useState(Array(CODE_LENGTH).fill(''))
  const [newPass, setNewPass]   = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mounted, setMounted]   = useState(false)
  const [toast, setToast]       = useState('')
  const inputsRef               = useRef([])
  const navigate                = useNavigate()

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  // ── Paso 1: enviar correo ──────────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/auth/forgot-password', { email })
      setStep(2)
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar el código.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP handlers ──────────────────────────────────────────────────────────
  const handleDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array(CODE_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  // ── Paso 2: resetear contraseña ───────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    const code = digits.join('')
    if (code.length < CODE_LENGTH) { showToast('Ingresa el código completo.'); return }
    if (newPass.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newPass !== confirmPass) { showToast('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      await client.post('/auth/reset-password', { email, code, new_password: newPass })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Código incorrecto o expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await client.post('/auth/forgot-password', { email })
      setDigits(Array(CODE_LENGTH).fill(''))
      showToast('Nuevo código enviado a tu correo.')
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch {
      showToast('Error al reenviar el código.')
    }
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
          from { opacity:0; transform:translateX(-24px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity:0; transform:translateX(24px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes toastIn {
          from { opacity:0; transform:translateY(-10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .input-stiga {
          width:100%; background:#f8fafb;
          border:1.5px solid #e2e8ee; border-radius:10px;
          padding:0.78rem 1rem; font-size:0.95rem; color:#1a2332;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .input-stiga::placeholder { color:#b0bec5; }
        .input-stiga:focus {
          outline:none; border-color:#2e8fc0;
          box-shadow:0 0 0 3px rgba(46,143,192,0.12); background:white;
        }
        .otp-box {
          width:48px; height:56px; text-align:center;
          font-size:1.5rem; font-weight:700; color:#0f2318;
          background:#f8fafb; border:2px solid #e2e8ee;
          border-radius:10px; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
          caret-color:transparent;
        }
        .otp-box:focus {
          border-color:#2e8fc0;
          box-shadow:0 0 0 3px rgba(46,143,192,0.15);
          background:white;
        }
        .otp-box.filled { border-color:#1a3a2e; }
        .btn-primary {
          width:100%; background:#1a3a2e; color:white;
          border:none; border-radius:10px; padding:0.85rem;
          font-size:0.97rem; font-weight:600; cursor:pointer;
          transition:background 0.2s, transform 0.15s, box-shadow 0.2s;
          display:flex; align-items:center; justify-content:center; gap:0.5rem;
        }
        .btn-primary:hover:not(:disabled) {
          background:#2a5a44;
          box-shadow:0 6px 20px rgba(26,58,46,0.28);
          transform:translateY(-1px);
        }
        .btn-primary:disabled { background:#8aada0; cursor:wait; }
        .link-btn {
          background:none; border:none; color:#2e8fc0;
          font-weight:600; cursor:pointer; padding:0;
          font-size:0.85rem; text-decoration:underline;
          font-family:inherit;
        }
      `}</style>

      {/* ── Panel izquierdo ─────────────────────────────────────────────── */}
      <div style={{
        width:'45%', minWidth:'340px',
        background:'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display:'flex', flexDirection:'column',
        justifyContent:'space-between', padding:'3rem',
        position:'relative', overflow:'hidden',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition:'opacity 0.6s ease, transform 0.6s ease'
      }}>
        <div style={{
          position:'absolute', top:'-120px', right:'-120px',
          width:'350px', height:'350px',
          border:'1px solid rgba(255,255,255,0.04)', borderRadius:'50%'
        }} />
        <div style={{
          position:'absolute', bottom:'-80px', left:'-80px',
          width:'260px', height:'260px',
          border:'1px solid rgba(255,255,255,0.04)', borderRadius:'50%'
        }} />

        <div>
          <div style={{
            display:'flex', alignItems:'center', gap:'0.9rem',
            marginBottom:'3rem',
            animation: mounted ? 'fadeInLeft 0.7s ease' : 'none'
          }}>
            <div style={{
              width:'48px', height:'48px',
              background:'rgba(255,255,255,0.08)',
              border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:'14px',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none"/>
                <path d="M12 8v8M8 12h8" stroke="rgba(122,200,150,0.9)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ color:'white', fontSize:'1.3rem', fontWeight:'800', letterSpacing:'3px' }}>
              STIGA
            </span>
          </div>

          <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.15s both' : 'none' }}>
            <h2 style={{ color:'white', fontSize:'1.9rem', fontWeight:'700', lineHeight:1.3, margin:'0 0 1rem' }}>
              Recupera tu<br />
              <span style={{ color:'#7ac896' }}>acceso seguro</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.92rem', lineHeight:1.7, margin:0 }}>
              Te enviaremos un código de 6 dígitos a tu correo registrado para restablecer tu contraseña.
            </p>
          </div>
        </div>

        {/* Pasos */}
        <div style={{ animation: mounted ? 'fadeInLeft 0.7s ease 0.3s both' : 'none' }}>
          <p style={{
            color:'rgba(255,255,255,0.35)', fontSize:'0.75rem',
            fontWeight:'600', letterSpacing:'1.5px',
            textTransform:'uppercase', margin:'0 0 1rem'
          }}>
            Pasos
          </p>
          {[
            { num:1, label:'Correo', desc:'Ingresa tu correo registrado' },
            { num:2, label:'Verificación', desc:'Código + nueva contraseña' },
            { num:3, label:'Listo', desc:'Vuelve a iniciar sesión' },
          ].map(s => (
            <div key={s.num} style={{
              display:'flex', alignItems:'center',
              gap:'0.75rem', marginBottom:'0.75rem'
            }}>
              <div style={{
                width:'26px', height:'26px', borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.75rem', fontWeight:'700',
                background: step >= s.num ? '#7ac896' : 'rgba(255,255,255,0.1)',
                color: step >= s.num ? '#0f2318' : 'rgba(255,255,255,0.4)',
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ color: step >= s.num ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)', fontSize:'0.85rem' }}>
                <strong>{s.label}</strong> — {s.desc}
              </span>
            </div>
          ))}
        </div>

        <p style={{
          color:'rgba(255,255,255,0.2)', fontSize:'0.75rem', margin:0,
          animation: mounted ? 'fadeInLeft 0.7s ease 0.4s both' : 'none'
        }}>
          Universidad Católica Luis Amigó · 2026
        </p>
      </div>

      {/* ── Panel derecho ───────────────────────────────────────────────── */}
      <div style={{
        flex:1, background:'#ffffff',
        display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'3rem 4rem',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(20px)',
        transition:'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        position:'relative'
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position:'fixed', top:'1.5rem', right:'1.5rem',
            background:'#1a3a2e', color:'white',
            padding:'0.75rem 1.25rem', borderRadius:'10px',
            fontSize:'0.88rem', fontWeight:'500',
            boxShadow:'0 8px 24px rgba(0,0,0,0.18)',
            animation:'toastIn 0.3s ease', zIndex:999
          }}>
            {toast}
          </div>
        )}

        <div style={{ maxWidth:'380px', width:'100%' }}>

          {/* ── PASO 1: email ── */}
          {step === 1 && (
            <div style={{ animation:'fadeInRight 0.5s ease' }}>
              <div style={{ marginBottom:'2.5rem' }}>
                <h1 style={{ margin:'0 0 0.4rem', fontSize:'1.75rem', fontWeight:'700', color:'#0f2318' }}>
                  ¿Olvidaste tu contraseña?
                </h1>
                <p style={{ margin:0, color:'#7a9080', fontSize:'0.92rem' }}>
                  Ingresa tu correo y te enviaremos un código de recuperación.
                </p>
              </div>

              <form onSubmit={handleSendCode}>
                <div style={{ marginBottom:'1.4rem' }}>
                  <label style={{
                    display:'block', fontSize:'0.82rem', fontWeight:'600',
                    color:'#3a4a3e', marginBottom:'0.4rem'
                  }}>
                    Correo electrónico
                  </label>
                  <input
                    className="input-stiga"
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" required
                  />
                </div>

                {error && (
                  <div style={{
                    background:'#fff5f5', border:'1px solid #fecaca',
                    borderRadius:'8px', padding:'0.65rem 1rem',
                    marginBottom:'1rem', color:'#c0392b', fontSize:'0.85rem'
                  }}>
                    {error}
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div style={{
                        width:'16px', height:'16px',
                        border:'2px solid rgba(255,255,255,0.3)',
                        borderTopColor:'white', borderRadius:'50%',
                        animation:'spin 0.7s linear infinite'
                      }} />
                      Enviando...
                    </>
                  ) : 'Enviar código'}
                </button>

                <p style={{ textAlign:'center', marginTop:'1.1rem', fontSize:'0.85rem', color:'#7a9080' }}>
                  <button type="button" className="link-btn" onClick={() => navigate('/login')}>
                    Volver al inicio de sesión
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* ── PASO 2: código + nueva contraseña ── */}
          {step === 2 && (
            <div style={{ animation:'fadeInRight 0.5s ease' }}>
              <div style={{ marginBottom:'2rem' }}>
                <h1 style={{ margin:'0 0 0.4rem', fontSize:'1.75rem', fontWeight:'700', color:'#0f2318' }}>
                  Ingresa el código
                </h1>
                <p style={{ margin:0, color:'#7a9080', fontSize:'0.92rem' }}>
                  Enviamos un código de 6 dígitos a <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleReset}>
                {/* OTP boxes */}
                <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', justifyContent:'center' }}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => inputsRef.current[i] = el}
                      className={`otp-box${d ? ' filled' : ''}`}
                      type="text" inputMode="numeric"
                      maxLength={1} value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                    />
                  ))}
                </div>

                <div style={{ marginBottom:'1rem' }}>
                  <label style={{
                    display:'block', fontSize:'0.82rem', fontWeight:'600',
                    color:'#3a4a3e', marginBottom:'0.4rem'
                  }}>
                    Nueva contraseña
                  </label>
                  <input
                    className="input-stiga"
                    type="password" value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </div>

                <div style={{ marginBottom:'1.5rem' }}>
                  <label style={{
                    display:'block', fontSize:'0.82rem', fontWeight:'600',
                    color:'#3a4a3e', marginBottom:'0.4rem'
                  }}>
                    Confirmar contraseña
                  </label>
                  <input
                    className="input-stiga"
                    type="password" value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div style={{
                    background:'#fff5f5', border:'1px solid #fecaca',
                    borderRadius:'8px', padding:'0.65rem 1rem',
                    marginBottom:'1rem', color:'#c0392b', fontSize:'0.85rem'
                  }}>
                    {error}
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div style={{
                        width:'16px', height:'16px',
                        border:'2px solid rgba(255,255,255,0.3)',
                        borderTopColor:'white', borderRadius:'50%',
                        animation:'spin 0.7s linear infinite'
                      }} />
                      Actualizando...
                    </>
                  ) : 'Cambiar contraseña'}
                </button>

                <p style={{ textAlign:'center', marginTop:'1.1rem', fontSize:'0.85rem', color:'#7a9080' }}>
                  ¿No recibiste el código?{' '}
                  <button type="button" className="link-btn" onClick={handleResend}>
                    Reenviar
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* ── PASO 3: éxito ── */}
          {step === 3 && (
            <div style={{ textAlign:'center', animation:'fadeInUp 0.5s ease' }}>
              <div style={{
                width:'72px', height:'72px', borderRadius:'50%',
                background:'rgba(26,58,46,0.08)',
                border:'2px solid #1a3a2e',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 1.5rem'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#1a3a2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 style={{ margin:'0 0 0.5rem', fontSize:'1.75rem', fontWeight:'700', color:'#0f2318' }}>
                ¡Contraseña actualizada!
              </h1>
              <p style={{ color:'#7a9080', fontSize:'0.92rem', marginBottom:'2rem' }}>
                Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tus nuevas credenciales.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate('/login')}
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
