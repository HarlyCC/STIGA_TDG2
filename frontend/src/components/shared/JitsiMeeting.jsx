import { useEffect, useRef, useState, useCallback } from 'react'

export default function JitsiMeeting({ roomId, displayName, onClose, pacienteNombre, nivelLabel, nivelColor }) {
  const containerRef    = useRef(null)
  const apiRef          = useRef(null)
  const hospitalIframe  = useRef(null)
  const [elapsed, setElapsed]         = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Historia clínica ──────────────────────────────────────
  const [panelOpen, setPanelOpen]         = useState(false)
  const [cedulaInput, setCedulaInput]     = useState('')
  const [busquedaState, setBusquedaState] = useState('idle') // idle | buscando | encontrado | no_encontrado
  const [pacienteHC, setPacienteHC]       = useState(null)
  const [iframeReady, setIframeReady]     = useState(false)
  const [guardando, setGuardando]         = useState(false)
  const [exitoGuardado, setExitoGuardado] = useState(false)
  const [formConsulta, setFormConsulta]   = useState({
    motivo: '', hallazgos: '', diagnostico: '',
    medicamentos: [{ nombre: '', dosis: '', frecuencia: '' }],
    recomendaciones: '', proximaCita: ''
  })

  // Cronómetro
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

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
          TOOLBAR_BUTTONS: ['microphone','camera','closedcaptions','desktop','fullscreen','hangup','chat','settings','raisehand','videoquality','tileview'],
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

  // postMessage desde el hospital
  const handleMessage = useCallback((event) => {
    if (!event.data?.type) return
    if (event.data.type === 'HSJD_RESULTADO') {
      if (event.data.data) {
        setPacienteHC(event.data.data)
        setBusquedaState('encontrado')
      } else {
        setBusquedaState('no_encontrado')
      }
    }
    if (event.data.type === 'HSJD_GUARDADO') {
      setGuardando(false)
      if (event.data.success) {
        setExitoGuardado(true)
        setTimeout(() => { setPanelOpen(false); setExitoGuardado(false) }, 2000)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  const buscarPaciente = () => {
    if (!cedulaInput.trim()) return
    setBusquedaState('buscando')
    setPacienteHC(null)
    const send = () => {
      hospitalIframe.current?.contentWindow?.postMessage({ type: 'HSJD_BUSCAR', cedula: cedulaInput.trim() }, '*')
    }
    if (iframeReady) { send() }
    else {
      const t = setInterval(() => { if (iframeReady) { clearInterval(t); send() } }, 100)
      setTimeout(() => clearInterval(t), 5000)
      hospitalIframe.current?.contentWindow?.postMessage({ type: 'HSJD_BUSCAR', cedula: cedulaInput.trim() }, '*')
    }
  }

  const guardarConsulta = () => {
    if (!pacienteHC) return
    setGuardando(true)
    const consulta = {
      fecha: new Date().toISOString().split('T')[0],
      medico: displayName || 'Médico STIGA',
      motivo: formConsulta.motivo,
      hallazgos: formConsulta.hallazgos,
      diagnostico: formConsulta.diagnostico,
      medicamentos: formConsulta.medicamentos.filter(m => m.nombre.trim()),
      recomendaciones: formConsulta.recomendaciones,
      proximaCita: formConsulta.proximaCita,
    }
    hospitalIframe.current?.contentWindow?.postMessage({ type: 'HSJD_ACTUALIZAR', cedula: pacienteHC.cedula, consulta }, '*')
  }

  const agregarMed = () => setFormConsulta(f => ({ ...f, medicamentos: [...f.medicamentos, { nombre: '', dosis: '', frecuencia: '' }] }))
  const quitarMed  = (i) => setFormConsulta(f => ({ ...f, medicamentos: f.medicamentos.filter((_, idx) => idx !== i) }))
  const updateMed  = (i, k, v) => setFormConsulta(f => {
    const meds = [...f.medicamentos]; meds[i] = { ...meds[i], [k]: v }; return { ...f, medicamentos: meds }
  })

  const cerrarPanel = () => {
    setPanelOpen(false)
    setBusquedaState('idle')
    setCedulaInput('')
    setPacienteHC(null)
    setExitoGuardado(false)
    setFormConsulta({ motivo: '', hallazgos: '', diagnostico: '', medicamentos: [{ nombre: '', dosis: '', frecuencia: '' }], recomendaciones: '', proximaCita: '' })
  }

  const calcEdad = (fecha) => {
    const hoy = new Date(), nac = new Date(fecha)
    let e = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
    return e
  }

  const dotColor = nivelColor || '#22c55e'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'#0f2318', display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes pulseConnected { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }
        @keyframes confirmIn { from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)} }
        @keyframes slideIn { from{transform:translateX(100%)}to{transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        .end-btn { display:flex;align-items:center;gap:0.45rem;background:rgba(220,50,50,0.12);border:1.5px solid rgba(220,50,50,0.25);color:#ff8080;border-radius:8px;padding:0.48rem 1rem;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .end-btn:hover { background:rgba(220,50,50,0.22);border-color:rgba(220,50,50,0.45);color:#fca5a5; }
        .hc-btn { display:flex;align-items:center;gap:0.45rem;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.85);border-radius:8px;padding:0.48rem 1rem;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .hc-btn:hover { background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.28); }
        .hc-btn.active { background:rgba(46,143,192,0.25);border-color:rgba(46,143,192,0.55);color:#7dd4f0; }
        .confirm-cancel { flex:1;background:none;border:1.5px solid #e2e8ee;border-radius:10px;padding:0.7rem;font-size:0.88rem;font-weight:600;color:#3a4a3e;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .confirm-cancel:hover { border-color:#b0c8b8;background:#f8faf8; }
        .confirm-end { flex:1;background:#dc2626;border:none;border-radius:10px;padding:0.7rem;font-size:0.88rem;font-weight:700;color:white;cursor:pointer;transition:all 0.18s ease;font-family:inherit; }
        .confirm-end:hover { background:#b91c1c; }
        .hc-panel { position:absolute;top:60px;right:0;bottom:0;width:480px;background:white;box-shadow:-8px 0 32px rgba(0,0,0,0.25);z-index:8;display:flex;flex-direction:column;animation:slideIn 0.32s cubic-bezier(0.4,0,0.2,1); }
        @media(max-width:600px){.hc-panel{width:100%;}}
        .hc-inp { width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:0.65rem 0.9rem;font-size:0.88rem;font-family:inherit;color:#1e293b;transition:border-color 0.2s;background:#f8fafc; }
        .hc-inp:focus { outline:none;border-color:#1a56a0;box-shadow:0 0 0 3px rgba(26,86,160,0.1);background:white; }
        .hc-inp::placeholder { color:#94a3b8; }
        .btn-hcp { display:inline-flex;align-items:center;gap:0.4rem;border:none;border-radius:9px;padding:0.65rem 1.1rem;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.18s ease; }
        .btn-hcp:disabled { opacity:0.55;cursor:wait; }
        .tag-r { display:inline-block;padding:0.18rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:600;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;margin:2px; }
        .tag-b { display:inline-block;padding:0.18rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:600;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;margin:2px; }
        .hc-section { font-size:0.7rem;font-weight:800;color:#1a56a0;text-transform:uppercase;letter-spacing:1px;padding:0.85rem 1.25rem 0.4rem;border-top:1px solid #f1f5f9;margin-top:0.5rem; }
        .consulta-prev { background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #1a56a0;border-radius:8px;padding:0.85rem 1rem;margin:0 1.25rem 0.65rem;font-size:0.82rem; }
        .consulta-stiga { border-left-color:#059669;background:#f0fdf4; }
        .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite; }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ height:'60px', flexShrink:0, background:'linear-gradient(135deg,#060f09,#1a3a2e)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          <div style={{ width:'32px', height:'32px', flexShrink:0, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/><path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p style={{ margin:0, color:'rgba(255,255,255,0.35)', fontSize:'0.67rem', textTransform:'uppercase', letterSpacing:'1px' }}>STIGA — Teleconsulta en curso</p>
            {pacienteNombre ? (
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'2px' }}>
                <span style={{ color:'white', fontWeight:'700', fontSize:'0.88rem' }}>{pacienteNombre}</span>
                {nivelLabel && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', background:`${dotColor}20`, color:dotColor, fontSize:'0.65rem', fontWeight:'700', padding:'0.08rem 0.45rem', borderRadius:'20px', border:`1px solid ${dotColor}35` }}>
                    <div style={{ width:'5px', height:'5px', background:dotColor, borderRadius:'50%' }} />
                    Nivel {nivelLabel}
                  </span>
                )}
              </div>
            ) : <span style={{ color:'rgba(255,255,255,0.6)', fontWeight:'600', fontSize:'0.85rem' }}>Sesión activa</span>}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
          <div style={{ width:'8px', height:'8px', flexShrink:0, background:'#22c55e', borderRadius:'50%', animation:'pulseConnected 2s ease-in-out infinite' }} />
          <span style={{ color:'white', fontWeight:'700', fontSize:'0.97rem', letterSpacing:'2.5px', fontVariantNumeric:'tabular-nums' }}>{formatTime(elapsed)}</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          {/* Botón Historia clínica */}
          <button className={`hc-btn${panelOpen ? ' active' : ''}`} onClick={() => panelOpen ? cerrarPanel() : setPanelOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Historia clínica
          </button>
          <button className="end-btn" onClick={() => setShowConfirm(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Terminar consulta
          </button>
        </div>
      </div>

      {/* ── Jitsi ── */}
      <div ref={containerRef} style={{ flex:1 }} />

      {/* ── iframe oculto del hospital ── */}
      <iframe
        ref={hospitalIframe}
        src="/hospital/index.html"
        style={{ display:'none' }}
        onLoad={() => setIframeReady(true)}
        title="Hospital HSJD"
      />

      {/* ── Panel Historia Clínica ── */}
      {panelOpen && (
        <div className="hc-panel">
          {/* Cabecera panel */}
          <div style={{ background:'linear-gradient(135deg,#123e7a,#1a56a0)', padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
              <div style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.12)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <p style={{ margin:0, color:'rgba(255,255,255,0.45)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'1px' }}>Hospital San Juan de Dios</p>
                <p style={{ margin:0, color:'white', fontWeight:'700', fontSize:'0.9rem' }}>Historia Clínica</p>
              </div>
            </div>
            <button onClick={cerrarPanel} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Búsqueda */}
          <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
            <label style={{ fontSize:'0.72rem', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'0.5rem' }}>Cédula del paciente</label>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <input
                className="hc-inp"
                placeholder="Ingrese el número de cédula…"
                value={cedulaInput}
                onChange={e => setCedulaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarPaciente()}
              />
              <button
                className="btn-hcp"
                style={{ background:'#1a56a0', color:'white', flexShrink:0 }}
                onClick={buscarPaciente}
                disabled={busquedaState === 'buscando' || !cedulaInput.trim()}
              >
                {busquedaState === 'buscando' ? <div className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                )}
                {busquedaState === 'buscando' ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
            {busquedaState === 'no_encontrado' && (
              <p style={{ margin:'0.6rem 0 0', fontSize:'0.8rem', color:'#dc2626', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Paciente no encontrado en el sistema del hospital.
              </p>
            )}
          </div>

          {/* Contenido scrollable */}
          <div style={{ flex:1, overflowY:'auto' }}>

            {/* Estado vacío */}
            {busquedaState === 'idle' && (
              <div style={{ padding:'2.5rem 1.5rem', textAlign:'center' }}>
                <div style={{ width:'56px', height:'56px', background:'#eff6ff', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a56a0" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <p style={{ margin:0, fontWeight:'600', color:'#1e293b', fontSize:'0.9rem' }}>Consultar historia clínica</p>
                <p style={{ margin:'0.4rem 0 0', color:'#94a3b8', fontSize:'0.8rem', lineHeight:1.6 }}>Ingresa la cédula del paciente para acceder a su historia clínica en el Hospital San Juan de Dios.</p>
              </div>
            )}

            {/* Paciente encontrado */}
            {busquedaState === 'encontrado' && pacienteHC && !exitoGuardado && (
              <div style={{ animation:'fadeUp 0.3s ease' }}>

                {/* Datos personales */}
                <div style={{ background:'#1a56a0', padding:'1rem 1.25rem' }}>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.6)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px' }}>Paciente encontrado</p>
                  <p style={{ margin:'2px 0 0', color:'white', fontWeight:'800', fontSize:'1rem' }}>{pacienteHC.nombre}</p>
                  <p style={{ margin:'2px 0 0', color:'rgba(255,255,255,0.55)', fontSize:'0.78rem' }}>C.C. {pacienteHC.cedula} · {pacienteHC.municipio}</p>
                </div>

                <div style={{ padding:'0.85rem 1.25rem', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
                    {[
                      ['Edad', calcEdad(pacienteHC.fechaNacimiento) + ' años'],
                      ['Sexo', pacienteHC.sexo === 'F' ? 'Femenino' : 'Masculino'],
                      ['Grupo sanguíneo', pacienteHC.grupoSanguineo],
                      ['Teléfono', pacienteHC.telefono],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p style={{ margin:0, fontSize:'0.68rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</p>
                        <p style={{ margin:'1px 0 0', fontSize:'0.84rem', fontWeight:'600', color:'#1e293b' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alergias */}
                <p className="hc-section">⚠ Alergias</p>
                <div style={{ padding:'0 1.25rem 0.5rem' }}>
                  {pacienteHC.alergias.length
                    ? pacienteHC.alergias.map(a => <span key={a} className="tag-r">{a}</span>)
                    : <span style={{ color:'#94a3b8', fontSize:'0.82rem' }}>Sin alergias conocidas</span>}
                </div>

                {/* Enfermedades crónicas */}
                <p className="hc-section">Enfermedades crónicas</p>
                <div style={{ padding:'0 1.25rem 0.5rem' }}>
                  {pacienteHC.enfermedadesCronicas.length
                    ? pacienteHC.enfermedadesCronicas.map(e => <span key={e} className="tag-b">{e}</span>)
                    : <span style={{ color:'#94a3b8', fontSize:'0.82rem' }}>Ninguna registrada</span>}
                </div>

                {/* Medicamentos actuales */}
                <p className="hc-section">Medicamentos actuales</p>
                <div style={{ padding:'0 1.25rem 0.5rem' }}>
                  {pacienteHC.medicamentosActuales.length ? pacienteHC.medicamentosActuales.map((m, i) => (
                    <div key={i} style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'0.65rem 0.85rem', marginBottom:'0.45rem', fontSize:'0.82rem' }}>
                      <strong style={{ color:'#1e293b' }}>{m.nombre}</strong>
                      <span style={{ color:'#475569', marginLeft:'6px' }}>{m.dosis} · {m.frecuencia}</span>
                    </div>
                  )) : <span style={{ color:'#94a3b8', fontSize:'0.82rem' }}>Sin medicación actual</span>}
                </div>

                {/* Consultas previas */}
                <p className="hc-section">Consultas previas ({pacienteHC.consultasPrevias.length})</p>
                {[...pacienteHC.consultasPrevias].reverse().slice(0, 3).map((c, i) => (
                  <div key={i} className="consulta-prev">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <span style={{ fontWeight:'700', color:'#1e293b', fontSize:'0.82rem' }}>{c.medico}</span>
                      <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>{c.fecha}</span>
                    </div>
                    <p style={{ margin:0, color:'#475569', fontSize:'0.8rem' }}><strong>Dx:</strong> {c.diagnostico}</p>
                  </div>
                ))}

                {/* Teleconsultas STIGA previas */}
                {(pacienteHC.consultasStiga || []).length > 0 && (
                  <>
                    <p className="hc-section" style={{ color:'#059669' }}>Teleconsultas STIGA ({pacienteHC.consultasStiga.length})</p>
                    {[...pacienteHC.consultasStiga].reverse().slice(0, 2).map((c, i) => (
                      <div key={i} className="consulta-prev consulta-stiga">
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                          <span style={{ fontWeight:'700', color:'#1e293b', fontSize:'0.82rem' }}>{c.medico}</span>
                          <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>{c.fecha}</span>
                        </div>
                        <p style={{ margin:0, color:'#475569', fontSize:'0.8rem' }}><strong>Dx:</strong> {c.diagnostico}</p>
                      </div>
                    ))}
                  </>
                )}

                {/* ── Formulario nueva consulta ── */}
                <div style={{ margin:'0.75rem 1.25rem', background:'white', border:'1.5px solid #dbeafe', borderRadius:'12px', overflow:'hidden' }}>
                  <div style={{ background:'#eff6ff', padding:'0.85rem 1rem', borderBottom:'1px solid #dbeafe' }}>
                    <p style={{ margin:0, fontWeight:'700', color:'#1e40af', fontSize:'0.84rem' }}>Nueva consulta</p>
                    <p style={{ margin:0, color:'#64748b', fontSize:'0.75rem' }}>Completar al finalizar la teleconsulta</p>
                  </div>
                  <div style={{ padding:'1rem' }}>
                    {[
                      ['motivo', 'Motivo de consulta *', 'Ej. Dolor abdominal de 3 días de evolución'],
                      ['hallazgos', 'Hallazgos clínicos', 'Ej. Abdomen blando, dolor en FID…'],
                      ['diagnostico', 'Diagnóstico *', 'Ej. Apendicitis aguda probable'],
                      ['recomendaciones', 'Recomendaciones', 'Ej. Reposo, hidratación, acudir a urgencias si…'],
                    ].map(([key, label, ph]) => (
                      <div key={key} style={{ marginBottom:'0.75rem' }}>
                        <label style={{ fontSize:'0.72rem', fontWeight:'600', color:'#475569', display:'block', marginBottom:'0.3rem' }}>{label}</label>
                        <textarea
                          className="hc-inp"
                          rows={2}
                          style={{ resize:'vertical', minHeight:'52px' }}
                          placeholder={ph}
                          value={formConsulta[key]}
                          onChange={e => setFormConsulta(f => ({ ...f, [key]: e.target.value }))}
                        />
                      </div>
                    ))}

                    {/* Medicamentos recetados */}
                    <div style={{ marginBottom:'0.75rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
                        <label style={{ fontSize:'0.72rem', fontWeight:'600', color:'#475569' }}>Medicamentos recetados</label>
                        <button onClick={agregarMed} style={{ background:'none', border:'none', color:'#1a56a0', fontSize:'0.75rem', fontWeight:'700', cursor:'pointer', padding:'0', fontFamily:'inherit' }}>+ Agregar</button>
                      </div>
                      {formConsulta.medicamentos.map((m, i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr 24px', gap:'0.4rem', marginBottom:'0.4rem', alignItems:'center' }}>
                          <input className="hc-inp" placeholder="Medicamento" value={m.nombre} onChange={e => updateMed(i,'nombre',e.target.value)} style={{ fontSize:'0.78rem', padding:'0.45rem 0.7rem' }} />
                          <input className="hc-inp" placeholder="Dosis" value={m.dosis} onChange={e => updateMed(i,'dosis',e.target.value)} style={{ fontSize:'0.78rem', padding:'0.45rem 0.7rem' }} />
                          <input className="hc-inp" placeholder="Frecuencia" value={m.frecuencia} onChange={e => updateMed(i,'frecuencia',e.target.value)} style={{ fontSize:'0.78rem', padding:'0.45rem 0.7rem' }} />
                          {formConsulta.medicamentos.length > 1 && (
                            <button onClick={() => quitarMed(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', padding:'0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Próxima cita */}
                    <div style={{ marginBottom:'0.75rem' }}>
                      <label style={{ fontSize:'0.72rem', fontWeight:'600', color:'#475569', display:'block', marginBottom:'0.3rem' }}>Próxima cita sugerida</label>
                      <input className="hc-inp" type="date" value={formConsulta.proximaCita} onChange={e => setFormConsulta(f => ({ ...f, proximaCita: e.target.value }))} />
                    </div>

                    {/* Botón guardar */}
                    <button
                      className="btn-hcp"
                      style={{ width:'100%', background: guardando ? '#64748b' : '#16a34a', color:'white', justifyContent:'center', marginTop:'0.25rem' }}
                      onClick={guardarConsulta}
                      disabled={guardando || !formConsulta.motivo.trim() || !formConsulta.diagnostico.trim()}
                    >
                      {guardando ? <><div className="spinner" />Guardando…</> : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Guardar en historia clínica</>
                      )}
                    </button>
                    {(!formConsulta.motivo.trim() || !formConsulta.diagnostico.trim()) && (
                      <p style={{ margin:'0.4rem 0 0', fontSize:'0.72rem', color:'#94a3b8', textAlign:'center' }}>Completa el motivo y diagnóstico para guardar.</p>
                    )}
                  </div>
                </div>
                <div style={{ height:'1.5rem' }} />
              </div>
            )}

            {/* Éxito guardado */}
            {exitoGuardado && (
              <div style={{ padding:'3rem 1.5rem', textAlign:'center', animation:'fadeUp 0.3s ease' }}>
                <div style={{ width:'64px', height:'64px', background:'#f0fdf4', border:'2px solid #bbf7d0', borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ margin:0, fontWeight:'800', color:'#15803d', fontSize:'1rem' }}>Historia clínica actualizada</p>
                <p style={{ margin:'0.5rem 0 0', color:'#475569', fontSize:'0.84rem', lineHeight:1.6 }}>
                  La consulta fue guardada correctamente en el<br />
                  <strong>Hospital San Juan de Dios</strong>.
                </p>
                <p style={{ margin:'1rem 0 0', color:'#94a3b8', fontSize:'0.78rem' }}>El panel se cerrará automáticamente…</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Confirmación terminar consulta ── */}
      {showConfirm && (
        <div style={{ position:'absolute', inset:0, zIndex:10, background:'rgba(0,0,0,0.72)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
          <div style={{ background:'white', borderRadius:'22px', padding:'2.25rem 2.5rem', maxWidth:'370px', width:'90%', animation:'confirmIn 0.28s cubic-bezier(0.34,1.56,0.64,1)', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ width:'56px', height:'56px', background:'#fef2f2', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.86 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h3 style={{ margin:'0 0 0.6rem', fontSize:'1.08rem', fontWeight:'700', color:'#0f2318' }}>¿Está seguro que desea terminar la consulta?</h3>
            <p style={{ margin:'0 0 1.75rem', color:'#6a8070', fontSize:'0.88rem', lineHeight:1.55 }}>
              {pacienteNombre ? `${pacienteNombre} será desconectado/a de la sala.` : 'El paciente será desconectado de la sala.'}{' '}Esta acción no se puede deshacer.
            </p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="confirm-end" onClick={() => { setShowConfirm(false); onClose?.() }}>Terminar consulta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
