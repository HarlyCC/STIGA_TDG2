import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import client from '../../api/api'

const NIVEL_DOT  = { Rojo: '#ef4444', Naranja: '#f97316', Amarillo: '#eab308', Verde: '#22c55e' }
const NIVEL_BG   = { Rojo: '#fef2f2', Naranja: '#fff7ed', Amarillo: '#fefce8', Verde: '#f0fdf4' }
const NIVEL_TEXT = { Rojo: '#dc2626', Naranja: '#c2410c', Amarillo: '#d97706', Verde: '#15803d' }

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export default function JitsiMeeting({ roomId, displayName, onClose, pacienteNombre, pacienteCedula, nivelLabel, nivelColor, isDoctor }) {
  const containerRef = useRef(null)
  const apiRef       = useRef(null)
  const [elapsed, setElapsed]         = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  // Panel HC
  const [panelOpen, setPanelOpen]         = useState(false)
  const [hcLoading, setHcLoading]         = useState(false)
  const [hcData, setHcData]               = useState(null)
  const [hcError, setHcError]             = useState('')
  const [mostrarNota, setMostrarNota]     = useState(false)
  const [notaForm, setNotaForm]           = useState({ titulo: '', contenido: '' })
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [notaExito, setNotaExito]         = useState(false)

  // Hospital simulation iframe
  const hospitalIframe   = useRef(null)
  const iframeReadyRef   = useRef(false)
  const queryPendingRef  = useRef(false)
  const hospitalTimerRef = useRef(null)
  const [hospitalData, setHospitalData]       = useState(null)
  const [hospitalLoading, setHospitalLoading] = useState(false)

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Cronómetro
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // Jitsi
  useEffect(() => {
    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/external_api.js'
        script.onload = initJitsi
        document.body.appendChild(script)
      } else { initJitsi() }
    }
    const initJitsi = () => {
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomId,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false, prejoinPageEnabled: false, disableDeepLinking: true },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen', 'hangup', 'chat', 'settings', 'raisehand', 'videoquality', 'tileview'],
          SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, DEFAULT_BACKGROUND: '#0f2318',
        },
        width: '100%', height: '100%',
      })
      apiRef.current.addEventListeners({
        readyToClose: () => onClose?.(),
        videoConferenceLeft: () => onClose?.(),
      })
    }
    loadJitsi()
    return () => { apiRef.current?.dispose() }
  }, [roomId, displayName])

  // Escuchar respuesta del hospital
  useEffect(() => {
    if (!isDoctor) return
    const handler = (e) => {
      if (e.origin !== window.location.origin) return
      if (!e.data || e.data.type !== 'HSJD_RESULTADO') return
      setHospitalData(e.data.data || null)
      setHospitalLoading(false)
      if (hospitalTimerRef.current) { clearTimeout(hospitalTimerRef.current); hospitalTimerRef.current = null }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isDoctor])

  const sendBuscar = useCallback(() => {
    if (!hospitalIframe.current?.contentWindow || !pacienteCedula) return
    hospitalIframe.current.contentWindow.postMessage(
      { type: 'HSJD_BUSCAR', cedula: String(pacienteCedula) },
      window.location.origin
    )
  }, [pacienteCedula])

  const onIframeLoad = useCallback(() => {
    iframeReadyRef.current = true
    if (queryPendingRef.current) {
      queryPendingRef.current = false
      sendBuscar()
    }
  }, [sendBuscar])

  const fetchHistoria = useCallback(async () => {
    if (!pacienteCedula) { setHcError('No hay cédula registrada para este paciente.'); return }
    setHcLoading(true)
    setHcError('')
    setHospitalData(null)
    setHospitalLoading(true)

    if (iframeReadyRef.current) {
      sendBuscar()
    } else {
      queryPendingRef.current = true
    }
    hospitalTimerRef.current = setTimeout(() => setHospitalLoading(false), 6000)

    try {
      const { data } = await client.get(`/medico/historia/${pacienteCedula}`)
      setHcData(data)
    } catch {
      setHcError('No se pudo cargar la historia clínica.')
    } finally {
      setHcLoading(false)
    }
  }, [pacienteCedula, sendBuscar])

  const abrirPanel = () => { setPanelOpen(true); fetchHistoria() }

  const cerrarPanel = () => {
    setPanelOpen(false)
    setHcData(null)
    setHcError('')
    setHospitalData(null)
    setHospitalLoading(false)
    setMostrarNota(false)
    setNotaForm({ titulo: '', contenido: '' })
    setNotaExito(false)
    queryPendingRef.current = false
    if (hospitalTimerRef.current) { clearTimeout(hospitalTimerRef.current); hospitalTimerRef.current = null }
  }

  const abrirFormularioNota = () => {
    const ultimo = hcData?.triajes?.[0]
    if (ultimo?.symptoms) {
      setNotaForm({
        titulo: '',
        contenido: `Motivo de consulta: ${ultimo.symptoms}\nNivel de triaje: ${ultimo.triage_color || '—'}\n\nDiagnóstico:\n\nIndicaciones:\n`,
      })
    }
    setMostrarNota(true)
  }

  const guardarNota = async () => {
    if (!notaForm.titulo.trim() || !notaForm.contenido.trim()) return
    setGuardandoNota(true)
    try {
      await client.post(`/medico/historia/${pacienteCedula}/nota`, notaForm)
      setNotaForm({ titulo: '', contenido: '' })
      setMostrarNota(false)
      setNotaExito(true)
      setTimeout(() => setNotaExito(false), 4000)
      const { data } = await client.get(`/medico/historia/${pacienteCedula}`)
      setHcData(data)
    } catch {
      alert('No se pudo guardar la nota. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setGuardandoNota(false)
    }
  }

  const dotColor = nivelColor || '#22c55e'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#0f2318', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes pulseConnected { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }
        @keyframes confirmIn { from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)} }
        @keyframes slideIn { from{transform:translateX(100%)}to{transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .end-btn { display:flex;align-items:center;gap:0.45rem;background:rgba(220,50,50,0.12);border:1.5px solid rgba(220,50,50,0.25);color:#ff8080;border-radius:8px;padding:0.48rem 1rem;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .end-btn:hover { background:rgba(220,50,50,0.22);border-color:rgba(220,50,50,0.45);color:#fca5a5; }
        .hc-btn { display:flex;align-items:center;gap:0.45rem;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.85);border-radius:8px;padding:0.48rem 1rem;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .hc-btn:hover { background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.28); }
        .hc-btn.active { background:rgba(46,143,192,0.25);border-color:rgba(46,143,192,0.55);color:#7dd4f0; }
        .confirm-cancel { flex:1;background:none;border:1.5px solid #e2e8ee;border-radius:10px;padding:0.7rem;font-size:0.88rem;font-weight:600;color:#3a4a3e;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .confirm-cancel:hover { border-color:#b0c8b8;background:#f8faf8; }
        .confirm-end { flex:1;background:#dc2626;border:none;border-radius:10px;padding:0.7rem;font-size:0.88rem;font-weight:700;color:white;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .confirm-end:hover { background:#b91c1c; }
        .hc-panel { position:absolute;top:60px;right:0;bottom:0;width:540px;background:#eef2f7;box-shadow:-8px 0 32px rgba(0,0,0,0.3);z-index:8;display:flex;flex-direction:column;animation:slideIn 0.32s cubic-bezier(0.4,0,0.2,1); }
        @media(max-width:600px){.hc-panel{width:100%;}}
        .doc-section-title { font-size:0.65rem;font-weight:800;color:#1a56a0;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 0.75rem;display:flex;align-items:center;gap:0.45rem; }
        .doc-section-title::after { content:'';flex:1;height:1px;background:#dce8f5; }
        .vital-chip { background:#f0f6ff;border:1px solid #c7ddf7;border-radius:6px;padding:0.35rem 0.6rem;font-size:0.75rem;color:#1e3a5f; }
        .vital-val { font-weight:700;color:#0f2a4a; }
        .nota-card { background:white;border:1px solid #e2e8f0;border-left:3px solid #1a56a0;border-radius:8px;padding:0.9rem 1rem;margin-bottom:0.65rem; }
        .hc-inp { width:100%;border:1.5px solid #d1dae6;border-radius:8px;padding:0.6rem 0.85rem;font-size:0.85rem;font-family:inherit;color:#1e293b;background:white;transition:border-color 0.18s;outline:none;box-sizing:border-box; }
        .hc-inp:focus { border-color:#1a56a0;box-shadow:0 0 0 3px rgba(26,86,160,0.1); }
        .btn-nota { display:flex;align-items:center;gap:0.4rem;border:none;border-radius:8px;padding:0.6rem 1.1rem;font-size:0.83rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.18s; }
        .btn-nota:disabled { opacity:0.5;cursor:not-allowed; }
        .spinner { width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite; }
        .tag-hosp { display:inline-block;border-radius:20px;padding:0.18rem 0.65rem;font-size:0.75rem;font-weight:500; }
        .tag-alergia { background:#fee2e2;border:1px solid #fca5a5;color:#b91c1c; }
        .tag-enf { background:#dbeafe;border:1px solid #93c5fd;color:#1e40af; }
      `}</style>

      {/* iframe oculto del hospital — cargado en segundo plano */}
      {isDoctor && (
        <iframe
          ref={hospitalIframe}
          src="/hospital/index.html"
          title="hospital-sim"
          onLoad={onIframeLoad}
          style={{ position: 'absolute', width: 0, height: 0, border: 'none', pointerEvents: 'none', opacity: 0 }}
        />
      )}

      {/* Header */}
      <div style={{ height: '60px', flexShrink: 0, background: 'linear-gradient(135deg,#060f09,#1a3a2e)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '32px', height: '32px', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none" /><path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STIGA — Teleconsulta en curso</p>
            {pacienteNombre ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '0.88rem' }}>{pacienteNombre}</span>
                {nivelLabel && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: `${dotColor}20`, color: dotColor, fontSize: '0.65rem', fontWeight: '700', padding: '0.08rem 0.45rem', borderRadius: '20px', border: `1px solid ${dotColor}35` }}>
                    <div style={{ width: '5px', height: '5px', background: dotColor, borderRadius: '50%' }} />
                    Nivel {nivelLabel}
                  </span>
                )}
              </div>
            ) : <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.85rem' }}>Sesión activa</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ width: '8px', height: '8px', flexShrink: 0, background: '#22c55e', borderRadius: '50%', animation: 'pulseConnected 2s ease-in-out infinite' }} />
          <span style={{ color: 'white', fontWeight: '700', fontSize: '0.97rem', letterSpacing: '2.5px', fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsed)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isDoctor && (
            <button className={`hc-btn${panelOpen ? ' active' : ''}`} onClick={() => panelOpen ? cerrarPanel() : abrirPanel()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              Historia clínica
            </button>
          )}
          <button className="end-btn" onClick={() => setShowConfirm(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            Terminar consulta
          </button>
        </div>
      </div>

      {/* Jitsi */}
      <div ref={containerRef} style={{ flex: 1 }} />

      {/* Panel Historia Clínica */}
      {panelOpen && (
        <div className="hc-panel">

          {/* Cabecera panel */}
          <div style={{ background: 'linear-gradient(135deg,#0f2a4a,#1a56a0)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px' }}>STIGA · Hospital San Juan de Dios</p>
                <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>Historia Clínica</p>
              </div>
            </div>
            <button onClick={cerrarPanel} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

            {hcLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #c7ddf7', borderTopColor: '#1a56a0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>Cargando historia clínica…</p>
              </div>
            )}

            {hcError && !hcLoading && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem', color: '#dc2626', fontSize: '0.84rem', textAlign: 'center' }}>
                {hcError}
              </div>
            )}

            {hcData && !hcLoading && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '1rem' }}>

                  {/* Membrete */}
                  <div style={{ background: 'linear-gradient(135deg,#0f2a4a,#1e3f6e)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" /><path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round" /></svg>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>STIGA</span>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>Hospital San Juan de Dios</span>
                      </div>
                      <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem' }}>Historia Clínica Unificada</p>
                      <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>Sistema de Triaje Inteligente · Santa Fe de Antioquia</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha de consulta</p>
                      <p style={{ margin: '2px 0 0', color: 'white', fontWeight: '600', fontSize: '0.8rem' }}>{new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Datos del paciente */}
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8eef5' }}>
                    <p className="doc-section-title">Datos del paciente</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      {[
                        ['Nombre completo', hcData.perfil.nombre || hospitalData?.nombre || '—'],
                        ['Cédula',          hcData.perfil.cedula || '—'],
                        ['EPS',             hcData.perfil.eps || '—'],
                        ['Municipio',       hcData.perfil.ciudad || hospitalData?.municipio || '—'],
                        ['Teléfono',        hcData.perfil.telefono || hospitalData?.telefono || '—'],
                        ['Correo',          hcData.perfil.email || hospitalData?.email || '—'],
                        ...(hospitalData?.fechaNacimiento ? [['Fecha de nacimiento', hospitalData.fechaNacimiento]] : []),
                        ...(hospitalData?.sexo ? [['Sexo', hospitalData.sexo === 'F' ? 'Femenino' : 'Masculino']] : []),
                        ...(hospitalData?.grupoSanguineo ? [['Grupo sanguíneo', hospitalData.grupoSanguineo]] : []),
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{l}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.83rem', fontWeight: '600', color: '#1e293b' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Antecedentes clínicos — desde hospital */}
                  {hospitalLoading && !hospitalData && (
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e8eef5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '14px', height: '14px', border: '2px solid #c7ddf7', borderTopColor: '#1a56a0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Cargando antecedentes del hospital…</span>
                    </div>
                  )}

                  {hospitalData && (
                    <>
                      {/* Antecedentes */}
                      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8eef5' }}>
                        <p className="doc-section-title">Antecedentes clínicos</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Alergias</p>
                            {hospitalData.alergias?.length
                              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                  {hospitalData.alergias.map((a, i) => <span key={i} className="tag-hosp tag-alergia">{a}</span>)}
                                </div>
                              : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin alergias conocidas</span>
                            }
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Enfermedades crónicas</p>
                            {hospitalData.enfermedadesCronicas?.length
                              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                  {hospitalData.enfermedadesCronicas.map((e, i) => <span key={i} className="tag-hosp tag-enf">{e}</span>)}
                                </div>
                              : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ninguna registrada</span>
                            }
                          </div>
                        </div>
                      </div>

                      {/* Medicamentos */}
                      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8eef5' }}>
                        <p className="doc-section-title">Medicamentos actuales</p>
                        {hospitalData.medicamentosActuales?.length ? (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ background: '#f0f6ff' }}>
                                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Medicamento</th>
                                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Dosis</th>
                                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Frecuencia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {hospitalData.medicamentosActuales.map((m, i) => (
                                  <tr key={i} style={{ borderBottom: i < hospitalData.medicamentosActuales.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#1e293b' }}>{m.nombre}</td>
                                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{m.dosis}</td>
                                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{m.frecuencia}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>Sin medicación actual registrada.</p>
                        )}
                      </div>

                      {/* Consultas previas del hospital */}
                      {hospitalData.consultasPrevias?.length > 0 && (
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8eef5' }}>
                          <p className="doc-section-title">Consultas previas — Hospital HSJD ({hospitalData.consultasPrevias.length})</p>
                          {[...hospitalData.consultasPrevias].reverse().map((c, i) => (
                            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #1a56a0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '0.6rem' }}>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}><strong style={{ color: '#334155' }}>Fecha:</strong> {c.fecha}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}><strong style={{ color: '#334155' }}>Médico:</strong> {c.medico}</span>
                              </div>
                              <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#475569' }}><strong style={{ color: '#1e293b' }}>Motivo:</strong> {c.motivo}</p>
                              <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#475569' }}><strong style={{ color: '#1e293b' }}>Diagnóstico:</strong> {c.diagnostico}</p>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}><strong style={{ color: '#1e293b' }}>Tratamiento:</strong> {c.tratamiento}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Triajes registrados en STIGA */}
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e8eef5' }}>
                    <p className="doc-section-title">Triajes STIGA ({hcData.triajes.length})</p>
                    {hcData.triajes.length === 0 ? (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>Sin triajes registrados.</p>
                    ) : hcData.triajes.map((t, i) => {
                      const dot = NIVEL_DOT[t.triage_color]  || '#22c55e'
                      const bg  = NIVEL_BG[t.triage_color]   || '#f0fdf4'
                      const txt = NIVEL_TEXT[t.triage_color] || '#15803d'
                      return (
                        <div key={t.id || i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `3px solid ${dot}`, borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ background: bg, color: txt, fontSize: '0.7rem', fontWeight: '800', padding: '0.15rem 0.6rem', borderRadius: '20px', border: `1px solid ${dot}40` }}>
                              {t.triage_color || 'Verde'}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{fmtFecha(t.timestamp)} {fmtHora(t.timestamp)}</span>
                          </div>
                          {t.symptoms && (
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#334155', fontStyle: 'italic' }}>"{t.symptoms}"</p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {t.heart_rate       != null && <span className="vital-chip">FC: <span className="vital-val">{t.heart_rate} lpm</span></span>}
                            {t.systolic_bp      != null && <span className="vital-chip">PAS: <span className="vital-val">{t.systolic_bp} mmHg</span></span>}
                            {t.o2_sat           != null && <span className="vital-chip">SpO₂: <span className="vital-val">{t.o2_sat}%</span></span>}
                            {t.body_temp        != null && <span className="vital-chip">Temp: <span className="vital-val">{t.body_temp}°C</span></span>}
                            {t.respiratory_rate != null && <span className="vital-chip">FR: <span className="vital-val">{t.respiratory_rate} rpm</span></span>}
                            {t.pain_scale       != null && <span className="vital-chip">Dolor: <span className="vital-val">{t.pain_scale}/10</span></span>}
                            {t.glucose          != null && <span className="vital-chip">Glucosa: <span className="vital-val">{t.glucose} mg/dL</span></span>}
                          </div>
                          {t.confianza != null && (
                            <p style={{ margin: '0.45rem 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                              Confianza IA: <strong>{Math.round(t.confianza * 100)}%</strong>
                              {t.escalado ? <span style={{ marginLeft: '0.5rem', color: '#dc2626', fontWeight: '700' }}>· Escalado SIRS</span> : null}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Notas médicas */}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    <p className="doc-section-title">Notas médicas ({hcData.notas.length})</p>

                    {notaExito && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeUp 0.3s ease' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '600' }}>Nota guardada correctamente.</span>
                      </div>
                    )}

                    {hcData.notas.length === 0 && (
                      <p style={{ margin: '0 0 0.75rem', color: '#94a3b8', fontSize: '0.82rem' }}>Sin notas registradas aún.</p>
                    )}

                    {hcData.notas.map((n, i) => (
                      <div key={n.id || i} className="nota-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                          <p style={{ margin: 0, fontWeight: '700', color: '#1e293b', fontSize: '0.84rem' }}>{n.titulo}</p>
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', flexShrink: 0, marginLeft: '0.5rem' }}>{fmtFecha(n.created_at)}</span>
                        </div>
                        {n.medico_nombre && (
                          <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', color: '#64748b' }}>Dr(a). {n.medico_nombre}</p>
                        )}
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.contenido}</p>
                      </div>
                    ))}

                    {!mostrarNota ? (
                      <button
                        onClick={abrirFormularioNota}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1.5px dashed #c7ddf7', borderRadius: '8px', padding: '0.6rem 1rem', color: '#1a56a0', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'all 0.18s', fontFamily: 'inherit' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Agregar nota médica
                      </button>
                    ) : (
                      <div style={{ background: '#f0f6ff', border: '1.5px solid #c7ddf7', borderRadius: '10px', padding: '1rem', animation: 'fadeUp 0.25s ease' }}>
                        <p style={{ margin: '0 0 0.75rem', fontWeight: '700', color: '#1a3a6e', fontSize: '0.84rem' }}>Nueva nota médica</p>
                        <div style={{ marginBottom: '0.6rem' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título</label>
                          <input
                            className="hc-inp"
                            placeholder="Ej: Diagnóstico, Evolución, Prescripción…"
                            value={notaForm.titulo}
                            onChange={e => setNotaForm(f => ({ ...f, titulo: e.target.value }))}
                          />
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contenido</label>
                          <textarea
                            className="hc-inp"
                            rows={4}
                            style={{ resize: 'vertical', minHeight: '80px' }}
                            placeholder="Hallazgos, diagnóstico, indicaciones, medicamentos…"
                            value={notaForm.contenido}
                            onChange={e => setNotaForm(f => ({ ...f, contenido: e.target.value }))}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-nota"
                            style={{ background: '#1a56a0', color: 'white', flex: 1, justifyContent: 'center' }}
                            onClick={guardarNota}
                            disabled={guardandoNota || !notaForm.titulo.trim() || !notaForm.contenido.trim()}
                          >
                            {guardandoNota
                              ? <><div className="spinner" />Guardando…</>
                              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>Guardar nota</>
                            }
                          </button>
                          <button
                            className="btn-nota"
                            style={{ background: 'white', border: '1.5px solid #d1dae6', color: '#64748b' }}
                            onClick={() => { setMostrarNota(false); setNotaForm({ titulo: '', contenido: '' }) }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmación terminar consulta */}
      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'white', borderRadius: '22px', padding: '2.25rem 2.5rem', maxWidth: '370px', width: '90%', animation: 'confirmIn 0.28s cubic-bezier(0.34,1.56,0.64,1)', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ width: '56px', height: '56px', background: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.86 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </div>
            <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.08rem', fontWeight: '700', color: '#0f2318' }}>¿Terminar la consulta?</h3>
            <p style={{ margin: '0 0 1.75rem', color: '#6a8070', fontSize: '0.88rem', lineHeight: 1.55 }}>
              {pacienteNombre ? `${pacienteNombre} será desconectado/a de la sala.` : 'El paciente será desconectado de la sala.'}{' '}Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="confirm-end" onClick={() => { setShowConfirm(false); onClose?.() }}>Terminar consulta</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
