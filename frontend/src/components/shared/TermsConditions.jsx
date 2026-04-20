import { useState, useRef, useEffect } from 'react'

const SECCIONES = [
  {
    titulo: '1. Propósito del Sistema STIGA',
    contenido: [
      'STIGA (Sistema de Triaje Inteligente Guiado por Inteligencia Artificial) es una plataforma digital de orientación médica diseñada para apoyar la atención en salud en municipios rurales y de difícil acceso en Colombia. Su objetivo es facilitar la evaluación preliminar de síntomas, orientar al usuario sobre el nivel de urgencia de su condición y conectarlo con profesionales de la salud a través de teleconsultas.',
      'IMPORTANTE: STIGA es una herramienta de apoyo clínico complementaria. Los resultados del triaje generados por el sistema son de carácter orientativo y NO constituyen un diagnóstico médico. En ningún caso reemplazan la valoración presencial, el criterio clínico o las indicaciones de un profesional de la salud debidamente habilitado.',
      'En situaciones de emergencia (dificultad respiratoria severa, dolor de pecho intenso, pérdida de conciencia, convulsiones, sangrado incontrolable), llame inmediatamente a la línea de emergencias 123 o acuda al servicio de urgencias más cercano sin esperar el resultado del triaje.',
    ],
  },
  {
    titulo: '2. Tratamiento de Datos Personales – Ley 1581 de 2012',
    contenido: [
      'De conformidad con la Ley Estatutaria 1581 de 2012 y el Decreto Reglamentario 1377 de 2013, STIGA le informa que los datos personales y de salud recopilados a través de la plataforma serán tratados de manera responsable, segura y confidencial para las siguientes finalidades: (a) realizar el triaje de síntomas y orientación médica personalizada; (b) gestionar y coordinar teleconsultas con médicos registrados; (c) generar y mantener el historial clínico de referencia del usuario; (d) mejorar continuamente los modelos de inteligencia artificial del sistema; (e) cumplir con las obligaciones legales en materia de salud pública.',
      'Los datos sensibles de salud serán tratados con las más estrictas medidas de seguridad técnica y administrativa, conforme a lo exigido por la normatividad colombiana vigente. No serán compartidos con terceros sin su consentimiento expreso, salvo en los casos previstos por la ley (emergencias de salud pública, orden judicial, obligaciones legales de reporte).',
      'Derechos del titular: Usted tiene derecho a conocer, actualizar, rectificar, suprimir y revocar el consentimiento sobre el tratamiento de sus datos personales. Para ejercer estos derechos, puede contactar al responsable del tratamiento a través de los canales oficiales de STIGA. La consulta o reclamación será atendida en los términos establecidos por la Ley 1581 de 2012.',
    ],
  },
  {
    titulo: '3. Confidencialidad de la Información Médica',
    contenido: [
      'Toda la información médica y personal ingresada en STIGA es tratada con carácter estrictamente confidencial, en cumplimiento de la Resolución 1995 de 1999 del Ministerio de Salud (Historia Clínica), la Ley 23 de 1981 sobre Ética Médica y las disposiciones del Código Deontológico de Medicina en Colombia.',
      'Los datos de salud son considerados datos sensibles conforme al artículo 5 de la Ley 1581 de 2012 y reciben las máximas garantías de protección disponibles. El acceso a su información clínica está restringido únicamente al personal médico y administrativo directamente involucrado en su atención, bajo estrictos protocolos de confidencialidad.',
      'STIGA implementa medidas de seguridad técnicas y organizacionales apropiadas para proteger sus datos contra accesos no autorizados, pérdida, alteración o divulgación indebida. Sin embargo, el usuario reconoce que ningún sistema de transmisión de datos por internet puede garantizar una seguridad absoluta.',
    ],
  },
  {
    titulo: '4. Limitaciones del Sistema de Triaje con Inteligencia Artificial',
    contenido: [
      'El modelo de triaje de STIGA utiliza inteligencia artificial para clasificar la urgencia de los síntomas reportados en niveles (Verde, Amarillo, Naranja, Rojo). Esta clasificación tiene las siguientes limitaciones que el usuario debe conocer y aceptar expresamente:',
      '(a) La precisión del resultado depende directamente de la veracidad, completitud y claridad de la información que usted proporcione durante el triaje. Información incompleta o inexacta puede generar clasificaciones incorrectas. (b) El sistema puede no detectar condiciones médicas complejas, atípicas o de baja prevalencia. (c) El triaje no evalúa signos físicos directos. No realiza auscultación, palpación, exploración oftalmológica ni ningún otro procedimiento clínico presencial. (d) El modelo fue entrenado con datos poblacionales y puede no reflejar con precisión la variabilidad individual de presentación de enfermedades.',
      'El resultado del triaje debe interpretarse siempre como una orientación preliminar y nunca como un diagnóstico definitivo. STIGA recomienda siempre contrastar el resultado con la evaluación de un profesional de la salud, especialmente cuando los síntomas sean intensos, persistentes o inusuales.',
    ],
  },
  {
    titulo: '5. Responsabilidades del Usuario',
    contenido: [
      'Al registrarse y utilizar la plataforma STIGA, usted asume las siguientes responsabilidades: (a) Proporcionar información veraz, completa y actualizada durante cada sesión de triaje. (b) No utilizar STIGA como sustituto de atención médica de urgencia cuando las circunstancias lo requieran. (c) Mantener la confidencialidad de sus credenciales de acceso (usuario y contraseña) y no compartirlas con terceras personas. (d) Acceder a la plataforma únicamente con fines legítimos de atención médica propia. (e) Reportar de inmediato cualquier anomalía, uso indebido o acceso no autorizado a su cuenta a través de los canales oficiales de STIGA. (f) Cumplir con las indicaciones de los profesionales de la salud que lo atiendan a través de la plataforma.',
      'STIGA no se responsabiliza por las consecuencias derivadas del uso indebido de la plataforma, de la provisión de información falsa o incompleta durante el triaje, ni de las decisiones médicas que el usuario tome en contravención de las orientaciones recibidas.',
    ],
  },
  {
    titulo: '6. Política de Teleconsultas',
    contenido: [
      'Las teleconsultas realizadas a través de STIGA se rigen por las disposiciones de la Resolución 2654 de 2019 del Ministerio de Salud y Protección Social de Colombia sobre habilitación de servicios de telemedicina y prestación de servicios de salud en modalidad no presencial.',
      'Al agendar o participar en una teleconsulta a través de STIGA, usted autoriza: (a) El acceso del médico asignado a su historial de triajes registrado en la plataforma durante la sesión. (b) El procesamiento de los datos de la sesión con fines médicos, de control de calidad y mejora del servicio. (c) La emisión, cuando corresponda, de formulación médica, incapacidades y remisiones en formato electrónico conforme a la normativa vigente.',
      'Las teleconsultas en STIGA son atendidas exclusivamente por médicos registrados, verificados y habilitados ante el Ministerio de Salud y Protección Social de Colombia. La plataforma no garantiza la disponibilidad inmediata de un médico y los tiempos de atención pueden variar según la demanda del servicio y el nivel de urgencia del triaje.',
      'Al usar los servicios de teleconsulta, usted acepta que la calidad de la atención puede verse afectada por condiciones de conectividad a internet fuera del control de STIGA, y que en dichos casos el médico podrá reprogramar la sesión sin que esto genere responsabilidad para la plataforma.',
    ],
  },
]

export default function TermsConditions({ onAceptar, onRechazar }) {
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const canContinue = check1 && check2

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(4,10,6,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
    }}>
      <style>{`
        @keyframes termFadeInUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes termCheckPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.22); }
          100% { transform: scale(1); }
        }
        .term-section { margin-bottom: 1.75rem; }
        .term-section:last-child { margin-bottom: 0; }
        .term-title {
          font-size: 0.82rem; font-weight: 800; color: #0f2318;
          text-transform: uppercase; letter-spacing: 0.8px;
          margin: 0 0 0.65rem; padding-bottom: 0.5rem;
          border-bottom: 1.5px solid #e8f0ec;
        }
        .term-p {
          font-size: 0.87rem; color: #3a4a3e; line-height: 1.7;
          margin: 0 0 0.65rem;
        }
        .term-p:last-child { margin-bottom: 0; }
        .term-scroll::-webkit-scrollbar { width: 5px; }
        .term-scroll::-webkit-scrollbar-track { background: transparent; }
        .term-scroll::-webkit-scrollbar-thumb { background: #c8ddd0; border-radius: 4px; }
        .term-scroll::-webkit-scrollbar-thumb:hover { background: #3d7a5a; }
        .check-row {
          display: flex; align-items: flex-start; gap: 0.85rem;
          padding: 0.9rem 1rem; border-radius: 12px;
          border: 1.5px solid #e2e8ee; cursor: pointer;
          transition: all 0.18s ease; user-select: none;
        }
        .check-row:hover { border-color: #3d7a5a; background: #f4fbf7; }
        .check-row.checked { border-color: #3d7a5a; background: #f0faf5; }
        .check-box {
          width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
          border: 2px solid #c8ddd0; background: white;
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px; transition: all 0.18s ease;
        }
        .check-box.checked {
          background: #1a3a2e; border-color: #1a3a2e;
          animation: termCheckPop 0.28s ease;
        }
        .btn-continuar {
          width: 100%; padding: 0.85rem; border: none; border-radius: 12px;
          font-size: 0.95rem; font-weight: 800; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-family: inherit;
        }
        .btn-continuar.enabled {
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          color: white; box-shadow: 0 6px 20px rgba(26,58,46,0.35);
        }
        .btn-continuar.enabled:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(26,58,46,0.45);
        }
        .btn-continuar.disabled {
          background: #e8ecea; color: #aabcb0; cursor: not-allowed;
        }
        .btn-salir {
          width: 100%; padding: 0.7rem; border-radius: 12px;
          border: 1.5px solid #e2e8ee; background: none;
          font-size: 0.88rem; font-weight: 600; color: #6a8070;
          cursor: pointer; transition: all 0.18s ease; font-family: inherit;
        }
        .btn-salir:hover { border-color: #fca5a5; color: #dc2626; background: #fff5f5; }
      `}</style>

      {/* Tarjeta modal */}
      <div style={{
        width: '100%', maxWidth: '660px',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        background: 'white',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(28px) scale(0.97)',
        transition: 'opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #060f09, #0f2318, #091520)',
          padding: '1.75rem 2rem',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '42px', height: '42px', flexShrink: 0,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" fill="none"/>
                <path d="M12 8v8M8 12h8" stroke="#7ac896" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, color: 'white', fontWeight: '900', fontSize: '1rem', letterSpacing: '2.5px' }}>STIGA</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Sistema de Triaje Inteligente</p>
            </div>
          </div>
          <h2 style={{
            margin: '0 0 0.3rem', color: 'white',
            fontSize: '1.18rem', fontWeight: '800', lineHeight: 1.3
          }}>
            Términos y Condiciones de Uso
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            Lea detenidamente antes de continuar. Última actualización: enero 2025.
          </p>
        </div>

        {/* ── Cuerpo con scroll ── */}
        <div
          ref={bodyRef}
          className="term-scroll"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '1.75rem 2rem',
          }}
        >
          {/* Aviso destacado */}
          <div style={{
            background: '#fefce8', border: '1px solid #fde68a',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '12px', padding: '0.9rem 1.1rem',
            marginBottom: '1.75rem',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#78350f', lineHeight: 1.55, fontWeight: '500' }}>
              STIGA es una herramienta de orientación médica. No reemplaza el diagnóstico médico ni la atención de urgencias.
              En caso de emergencia, llame al <strong>123</strong>.
            </p>
          </div>

          {/* Secciones */}
          {SECCIONES.map((s, i) => (
            <div key={i} className="term-section">
              <p className="term-title">{s.titulo}</p>
              {s.contenido.map((p, j) => (
                <p key={j} className="term-p">{p}</p>
              ))}
            </div>
          ))}

          {/* Pie de secciones */}
          <div style={{
            marginTop: '1.5rem', padding: '1rem 1.1rem',
            background: '#f4f6f8', borderRadius: '12px',
            border: '1px solid #e2e8ee'
          }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6a8070', lineHeight: 1.6 }}>
              Al continuar usando STIGA, usted confirma haber leído, comprendido y aceptado en su totalidad los presentes
              Términos y Condiciones, así como la Política de Tratamiento de Datos Personales, de conformidad con la
              normativa colombiana vigente (Ley 1581 de 2012, Resolución 2654 de 2019).
            </p>
          </div>
        </div>

        {/* ── Footer: checkboxes + botones ── */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid #edf0ec',
          flexShrink: 0,
          background: '#fafbfa'
        }}>
          {/* Checkbox 1 */}
          <div
            className={`check-row${check1 ? ' checked' : ''}`}
            onClick={() => setCheck1(v => !v)}
            style={{ marginBottom: '0.65rem' }}
          >
            <div className={`check-box${check1 ? ' checked' : ''}`}>
              {check1 && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#1a2e1a', lineHeight: 1.45, fontWeight: check1 ? '600' : '400' }}>
              He leído y acepto los Términos y Condiciones de Uso de la plataforma STIGA.
            </p>
          </div>

          {/* Checkbox 2 */}
          <div
            className={`check-row${check2 ? ' checked' : ''}`}
            onClick={() => setCheck2(v => !v)}
            style={{ marginBottom: '1.25rem' }}
          >
            <div className={`check-box${check2 ? ' checked' : ''}`}>
              {check2 && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#1a2e1a', lineHeight: 1.45, fontWeight: check2 ? '600' : '400' }}>
              Autorizo el tratamiento de mis datos personales y de salud según lo establecido en la{' '}
              <strong style={{ color: '#1a3a2e' }}>Ley 1581 de 2012</strong> y la Política de Privacidad de STIGA.
            </p>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              className={`btn-continuar ${canContinue ? 'enabled' : 'disabled'}`}
              onClick={canContinue ? onAceptar : undefined}
              disabled={!canContinue}
            >
              {canContinue ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Continuar
                </>
              ) : (
                'Marque ambas casillas para continuar'
              )}
            </button>
            <button className="btn-salir" onClick={onRechazar}>
              No acepto — Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
