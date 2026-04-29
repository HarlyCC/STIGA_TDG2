import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/api'

const MUNICIPIOS_ANTIOQUIA = [
  'Abejorral','Abriaquí','Alejandría','Amagá','Amalfi','Andes','Angelópolis',
  'Angostura','Anorí','Anzá','Apartadó','Arboletes','Argelia','Armenia',
  'Barbosa','Bello','Belmira','Betania','Betulia','Briceño','Buriticá','Cáceres',
  'Caicedo','Caldas','Campamento','Cañasgordas','Caracolí','Caramanta',
  'Carepa','Carolina del Príncipe','Caucasia','Chigorodó','Cisneros',
  'Cocorná','Concepción','Concordia','Copacabana','Dabeiba','Don Matías',
  'Ebéjico','El Bagre','El Carmen de Viboral','El Peñol','El Retiro',
  'El Santuario','Entrerríos','Envigado','Fredonia','Frontino','Giraldo',
  'Girardota','Gómez Plata','Granada','Guadalupe','Guarne','Guatapé',
  'Heliconia','Hispania','Itagüí','Ituango','Jardín','Jericó','La Ceja',
  'Ciudad Bolívar',
  'La Estrella','La Pintada','La Unión','Liborina','Maceo','Marinilla',
  'Medellín','Montebello','Murindó','Mutatá','Nariño','Nechí','Necoclí',
  'Olaya','Peque','Pueblorrico','Puerto Berrío','Puerto Nare','Puerto Triunfo',
  'Remedios','Rionegro','Sabanalarga','Sabaneta','Salgar','San Andrés de Cuerquia',
  'San Carlos','San Francisco','San Jerónimo','San José de la Montaña',
  'San Juan de Urabá','San Luis','San Pedro de los Milagros','San Pedro de Urabá',
  'San Rafael','San Roque','San Vicente Ferrer','Santa Bárbara',
  'Santa Fe de Antioquia','Santa Rosa de Osos','Santo Domingo','Segovia',
  'Sonsón','Sopetrán','Támesis','Tarazá','Tarso','Titiribí','Toledo',
  'Turbo','Uramita','Urrao','Valdivia','Valparaíso','Vegachí','Venecia',
  'Vigía del Fuerte','Yalí','Yarumal','Yolombó','Yondó','Zaragoza',
].sort()

export default function PatientProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    eps: '',
    ciudad: '',
    fecha_nacimiento: '',
    gender: '',
  })
  const [email, setEmail] = useState('')

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    client.get('/auth/profile')
      .then(({ data }) => {
        setEmail(data.email || '')
        setForm({
          nombre:           data.nombre           || '',
          cedula:           data.cedula            || '',
          telefono:         data.telefono          || '',
          direccion:        data.direccion         || '',
          eps:              data.eps               || '',
          ciudad:           data.ciudad            || '',
          fecha_nacimiento: data.fecha_nacimiento  || '',
          gender:           data.gender !== null && data.gender !== undefined ? String(data.gender) : '',
        })
      })
      .catch(() => { setError('No se pudo cargar el perfil. Recargue la página.') })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = {
        nombre:           form.nombre.trim()           || undefined,
        cedula:           form.cedula.trim()            || undefined,
        telefono:         form.telefono.trim()          || undefined,
        direccion:        form.direccion.trim()         || undefined,
        eps:              form.eps.trim()               || undefined,
        ciudad:           form.ciudad                   || undefined,
        fecha_nacimiento: form.fecha_nacimiento         || undefined,
        gender:           form.gender !== '' ? Number(form.gender) : undefined,
      }
      await client.put('/auth/profile', payload)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const NAV_ITEM = ({ to, active, icon, label }) => (
    <div className={`nav-item${active ? ' active' : ''}`} onClick={() => !active && navigate(to)}>
      {icon}
      {label}
    </div>
  )

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
        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          cursor: pointer; color: rgba(255,255,255,0.5);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
        .nav-item.active { background: rgba(122,200,150,0.12); color: #7ac896; border-color: rgba(122,200,150,0.15); cursor: default; }
        .logout-btn {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
          background: none; border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4); font-size: 0.85rem; cursor: pointer;
          transition: all 0.18s ease;
        }
        .logout-btn:hover { background: rgba(220,50,50,0.1); border-color: rgba(220,50,50,0.2); color: #ff8080; }
        .field-label {
          display: block; margin-bottom: 0.4rem;
          font-size: 0.78rem; font-weight: 600;
          color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .field-input {
          width: 100%; padding: 0.65rem 0.85rem;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.9rem; color: #111827; background: white;
          transition: border-color 0.18s;
          outline: none;
        }
        .field-input:focus { border-color: #3d7a5a; }
        .field-input:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
        .field-select {
          width: 100%; padding: 0.65rem 0.85rem;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.9rem; color: #111827; background: white;
          transition: border-color 0.18s; outline: none; cursor: pointer;
        }
        .field-select:focus { border-color: #3d7a5a; }
        .btn-save {
          padding: 0.7rem 2rem; border-radius: 10px;
          background: linear-gradient(135deg, #1a3a2e, #2a5a44);
          color: white; border: none; font-size: 0.92rem; font-weight: 600;
          cursor: pointer; transition: opacity 0.18s;
        }
        .btn-save:hover { opacity: 0.88; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 50%, #0e2a40 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '1.75rem 1.25rem',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
      }}>
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
          <div className="nav-item" onClick={() => navigate('/paciente/chat')}>
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
          <div className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Mi perfil
          </div>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* ── Contenido ── */}
      <main style={{ marginLeft: '240px', flex: 1, padding: '2.5rem 2rem', maxWidth: '860px' }}>
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: '800', color: '#06111f' }}>Mi perfil</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Actualiza tu información personal</p>
          </div>

          {loading ? (
            <p style={{ color: '#6b7280' }}>Cargando datos…</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{
                background: 'white', borderRadius: '16px',
                border: '1px solid #e5e7eb', padding: '2rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', fontWeight: '700', color: '#374151' }}>
                  Información básica
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label">Nombre completo</label>
                    <input className="field-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Tu nombre completo" required />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label">Correo electrónico</label>
                    <input className="field-input" value={email} disabled placeholder="correo@ejemplo.com" />
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>El correo no se puede modificar.</p>
                  </div>

                  <div>
                    <label className="field-label">Cédula</label>
                    <input className="field-input" name="cedula" value={form.cedula} onChange={handleChange} placeholder="Número de cédula" />
                  </div>

                  <div>
                    <label className="field-label">Teléfono</label>
                    <input className="field-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="3XX XXX XXXX" />
                  </div>

                  <div>
                    <label className="field-label">Fecha de nacimiento</label>
                    <input className="field-input" type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} />
                  </div>

                  <div>
                    <label className="field-label">Sexo</label>
                    <select className="field-select" name="gender" value={form.gender} onChange={handleChange}>
                      <option value="">Sin especificar</option>
                      <option value="0">Femenino</option>
                      <option value="1">Masculino</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white', borderRadius: '16px',
                border: '1px solid #e5e7eb', padding: '2rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', fontWeight: '700', color: '#374151' }}>
                  Información de contacto y salud
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label">Dirección</label>
                    <input className="field-input" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle, carrera, barrio…" />
                  </div>

                  <div>
                    <label className="field-label">Municipio</label>
                    <select className="field-select" name="ciudad" value={form.ciudad} onChange={handleChange}>
                      <option value="">Selecciona tu municipio…</option>
                      {MUNICIPIOS_ANTIOQUIA.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">EPS</label>
                    <input className="field-input" name="eps" value={form.eps} onChange={handleChange} placeholder="Nombre de tu EPS" />
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '10px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '10px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#15803d', fontSize: '0.85rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Perfil actualizado correctamente.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-save" type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
