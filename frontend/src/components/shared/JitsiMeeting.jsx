import { useEffect, useRef, useState } from 'react'

export default function JitsiMeeting({ roomId, displayName, onClose, pacienteNombre, nivelLabel, nivelColor }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  // Cronómetro de duración de consulta
  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  useEffect(() => {
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/external_api.js'
        script.onload = initJitsi
        document.body.appendChild(script)
      } else {
        initJitsi()
      }
    }

    const initJitsi = () => {
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomId,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions',
            'desktop', 'fullscreen', 'hangup', 'chat',
            'settings', 'raisehand', 'videoquality', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0f2318',
        },
        width: '100%',
        height: '100%',
      })

      apiRef.current.addEventListeners({
        readyToClose: () => { onClose?.() },
        videoConferenceLeft: () => { onClose?.() },
      })
    }

    loadJitsi()
    return () => { apiRef.current?.dispose() }
  }, [roomId, displayName])

  const dotColor = nivelColor || '#22c55e'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#0f2318',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', -apple-system, sans-serif"
    }}>
      <style>{`
        @keyframes pulseConnected {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .end-btn {
          display: flex; align-items: center; gap: 0.45rem;
          background: rgba(220,50,50,0.12);
          border: 1.5px solid rgba(220,50,50,0.25);
          color: #ff8080; border-radius: 8px;
          padding: 0.48rem 1rem; font-size: 0.82rem;
          font-weight: 700; cursor: pointer;
          transition: all 0.18s ease; font-family: inherit;
        }
        .end-btn:hover {
          background: rgba(220,50,50,0.22);
          border-color: rgba(220,50,50,0.45);
          color: #fca5a5;
        }
        .confirm-cancel {
          flex: 1; background: none;
          border: 1.5px solid #e2e8ee; border-radius: 10px;
          padding: 0.7rem; font-size: 0.88rem; font-weight: 600;
          color: #3a4a3e; cursor: pointer;
          transition: all 0.18s ease; font-family: inherit;
        }
        .confirm-cancel:hover { border-color: #b0c8b8; background: #f8faf8; }
        .confirm-end {
          flex: 1; background: #dc2626;
          border: none; border-radius: 10px;
          padding: 0.7rem; font-size: 0.88rem; font-weight: 700;
          color: white; cursor: pointer;
          transition: all 0.18s ease; font-family: inherit;
        }
        .confirm-end:hover { background: #b91c1c; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        height: '60px', flexShrink: 0,
        background: 'linear-gradient(135deg, #060f09, #1a3a2e)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Izquierda: logo + info paciente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '32px', height: '32px', flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{
              margin: 0, color: 'rgba(255,255,255,0.35)',
              fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              STIGA — Teleconsulta en curso
            </p>
            {pacienteNombre ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '0.88rem' }}>
                  {pacienteNombre}
                </span>
                {nivelLabel && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: `${dotColor}20`,
                    color: dotColor, fontSize: '0.65rem', fontWeight: '700',
                    padding: '0.08rem 0.45rem', borderRadius: '20px',
                    border: `1px solid ${dotColor}35`
                  }}>
                    <div style={{ width: '5px', height: '5px', background: dotColor, borderRadius: '50%' }} />
                    Nivel {nivelLabel}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                Sesión activa
              </span>
            )}
          </div>
        </div>

        {/* Centro: cronómetro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{
            width: '8px', height: '8px', flexShrink: 0,
            background: '#22c55e', borderRadius: '50%',
            animation: 'pulseConnected 2s ease-in-out infinite'
          }} />
          <span style={{
            color: 'white', fontWeight: '700', fontSize: '0.97rem',
            letterSpacing: '2.5px', fontVariantNumeric: 'tabular-nums'
          }}>
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Derecha: botón terminar */}
        <button className="end-btn" onClick={() => setShowConfirm(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Terminar consulta
        </button>
      </div>

      {/* ── Jitsi container ── */}
      <div ref={containerRef} style={{ flex: 1 }} />

      {/* ── Confirmación de cierre ── */}
      {showConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '22px',
            padding: '2.25rem 2.5rem', maxWidth: '370px', width: '90%',
            animation: 'confirmIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '56px', height: '56px',
              background: '#fef2f2', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.86 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.08rem', fontWeight: '700', color: '#0f2318' }}>
              ¿Está seguro que desea terminar la consulta?
            </h3>
            <p style={{ margin: '0 0 1.75rem', color: '#6a8070', fontSize: '0.88rem', lineHeight: 1.55 }}>
              {pacienteNombre ? `${pacienteNombre} será desconectado/a de la sala.` : 'El paciente será desconectado de la sala.'}
              {' '}Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button className="confirm-end" onClick={() => { setShowConfirm(false); onClose?.() }}>
                Terminar consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
