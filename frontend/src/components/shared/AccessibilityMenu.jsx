import { useState, useEffect } from 'react'

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState({
    fontSize: 'normal',
    contrast: 'normal',
    reduceMotion: false,
    dyslexiaFont: false,
    lineHeight: 'normal',
  })

  useEffect(() => {
    const saved = localStorage.getItem('stiga_accessibility')
    if (saved) setSettings(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('stiga_accessibility', JSON.stringify(settings))
    applySettings(settings)
  }, [settings])

  const applySettings = (s) => {
    const root = document.documentElement

    const fontSizes = { small: '14px', normal: '16px', large: '19px', xlarge: '22px' }
    root.style.fontSize = fontSizes[s.fontSize]

    if (s.contrast === 'high') {
      document.body.style.filter = 'contrast(1.3)'
    } else if (s.contrast === 'low') {
      document.body.style.filter = 'contrast(0.85)'
    } else {
      document.body.style.filter = ''
    }

    if (s.reduceMotion) {
      const style = document.getElementById('stiga-motion-style') || document.createElement('style')
      style.id = 'stiga-motion-style'
      style.textContent = '*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }'
      document.head.appendChild(style)
    } else {
      document.getElementById('stiga-motion-style')?.remove()
    }

    if (s.dyslexiaFont) {
      root.style.fontFamily = "'Comic Sans MS', 'OpenDyslexic', cursive"
    } else {
      root.style.fontFamily = ''
    }

    const lineHeights = { normal: '1.5', comfortable: '1.8', spacious: '2.2' }
    root.style.lineHeight = lineHeights[s.lineHeight]
  }

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  const reset = () => {
    const defaults = {
      fontSize: 'normal', contrast: 'normal',
      reduceMotion: false, dyslexiaFont: false, lineHeight: 'normal'
    }
    setSettings(defaults)
  }

  return (
    <>
      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .acc-option {
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1.5px solid #e2e8ee;
          background: white;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 500;
          color: #3a4a3e;
          transition: all 0.15s ease;
        }
        .acc-option:hover { border-color: #3d7a5a; color: #3d7a5a; }
        .acc-option.active {
          background: #1a3a2e;
          border-color: #1a3a2e;
          color: white;
        }
        .acc-toggle {
          width: 44px; height: 24px;
          border-radius: 12px;
          border: none; cursor: pointer;
          position: relative;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .acc-toggle-thumb {
          position: absolute;
          top: 3px;
          width: 18px; height: 18px;
          background: white;
          border-radius: 50%;
          transition: left 0.2s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* Botón accesibilidad — esquina superior derecha */}
      <button
        onClick={() => setOpen(!open)}
        title="Opciones de accesibilidad"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          width: '42px', height: '42px',
          background: open ? '#1a3a2e' : 'white',
          border: '1.5px solid #e2e8ee',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          zIndex: 300
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={open ? 'white' : '#3a4a3e'} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8h.01M11 12h1v4h1"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: '4rem', right: '1rem',
          width: '340px',
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #edf0ec',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          zIndex: 299,
          animation: 'menuIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden'
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
            padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ac896" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8h.01M11 12h1v4h1"/>
              </svg>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.92rem' }}>
                Accesibilidad
              </span>
            </div>
            <button
              onClick={reset}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem', cursor: 'pointer',
                padding: '0.25rem 0.6rem', fontWeight: '500'
              }}
            >
              Restablecer
            </button>
          </div>

          {/* Contenido */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Tamaño de texto */}
            <div>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: '700', color: '#3a4a3e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Tamaño del texto
              </p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { key: 'small',  label: 'A', size: '0.75rem' },
                  { key: 'normal', label: 'A', size: '0.88rem' },
                  { key: 'large',  label: 'A', size: '1rem'    },
                  { key: 'xlarge', label: 'A', size: '1.15rem' },
                ].map(o => (
                  <button
                    key={o.key}
                    className={`acc-option ${settings.fontSize === o.key ? 'active' : ''}`}
                    onClick={() => update('fontSize', o.key)}
                    style={{ flex: 1, textAlign: 'center', fontSize: o.size, padding: '0.5rem 0' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contraste */}
            <div>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: '700', color: '#3a4a3e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Contraste
              </p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { key: 'low',    label: 'Bajo'   },
                  { key: 'normal', label: 'Normal' },
                  { key: 'high',   label: 'Alto'   },
                ].map(o => (
                  <button
                    key={o.key}
                    className={`acc-option ${settings.contrast === o.key ? 'active' : ''}`}
                    onClick={() => update('contrast', o.key)}
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interlineado */}
            <div>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: '700', color: '#3a4a3e', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Espaciado entre líneas
              </p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { key: 'normal',      label: 'Normal' },
                  { key: 'comfortable', label: 'Cómodo' },
                  { key: 'spacious',    label: 'Amplio' },
                ].map(o => (
                  <button
                    key={o.key}
                    className={`acc-option ${settings.lineHeight === o.key ? 'active' : ''}`}
                    onClick={() => update('lineHeight', o.key)}
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Reducir movimiento */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: '0 0 0.1rem', fontSize: '0.88rem', fontWeight: '600', color: '#1a2e1a' }}>
                    Reducir animaciones
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#aabcb0' }}>
                    Desactiva efectos de movimiento
                  </p>
                </div>
                <button
                  className="acc-toggle"
                  onClick={() => update('reduceMotion', !settings.reduceMotion)}
                  style={{ background: settings.reduceMotion ? '#1a3a2e' : '#e2e8ee' }}
                >
                  <div className="acc-toggle-thumb"
                    style={{ left: settings.reduceMotion ? '23px' : '3px' }}
                  />
                </button>
              </div>

              {/* Fuente dislexia */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: '0 0 0.1rem', fontSize: '0.88rem', fontWeight: '600', color: '#1a2e1a' }}>
                    Fuente para dislexia
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#aabcb0' }}>
                    Mejora la lectura
                  </p>
                </div>
                <button
                  className="acc-toggle"
                  onClick={() => update('dyslexiaFont', !settings.dyslexiaFont)}
                  style={{ background: settings.dyslexiaFont ? '#1a3a2e' : '#e2e8ee' }}
                >
                  <div className="acc-toggle-thumb"
                    style={{ left: settings.dyslexiaFont ? '23px' : '3px' }}
                  />
                </button>
              </div>

            </div>

            {/* Pie */}
            <p style={{
              margin: 0, fontSize: '0.73rem', color: '#c8d8cc',
              textAlign: 'center', borderTop: '1px solid #f0f4f2',
              paddingTop: '0.75rem'
            }}>
              Los cambios se guardan automáticamente
            </p>

          </div>
        </div>
      )}
    </>
  )
}