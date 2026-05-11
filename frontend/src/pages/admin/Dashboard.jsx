import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import client from '../../api/api'
import 'leaflet/dist/leaflet.css'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [activeTab, setActiveTab] = useState('metricas')

  /* ── Data como estado ── */
  const [alertas, setAlertas]         = useState([])
  const [usuarios, setUsuarios]       = useState([])
  const [triajes, setTriajes]         = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [loadingTriajes, setLoadingTriajes]   = useState(false)

  /* ── Solicitudes médico ── */
  const [solicitudes, setSolicitudes]             = useState([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [expandedSolicitud, setExpandedSolicitud] = useState(null)
  const [procesandoId, setProcesandoId]           = useState(null)

  /* ── Modales ── */
  const [showNuevoUsuario, setShowNuevoUsuario] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre: '', role: 'medico', ciudad: '', email: '', password: '' })
  const [nuevoError, setNuevoError]   = useState('')
  const [savingUsuario, setSavingUsuario] = useState(false)
  const [detalleTriaje, setDetalleTriaje] = useState(null)
  const [editUsuario, setEditUsuario] = useState(null)
  const [editRol, setEditRol]         = useState('')
  const [editError, setEditError]     = useState('')
  const [savingEdit, setSavingEdit]   = useState(false)

  /* ── Filtros ── */
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [busquedaTriajes, setBusquedaTriajes] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('todos')

  /* ── Horarios ── */
  const DIAS       = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const CAL_START  = 6
  const CAL_END    = 22
  const HOUR_H     = 54
  const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m }
  const toTop = (t) => ((toMin(t) - CAL_START*60) / 60) * HOUR_H
  const toDur = (s, e) => Math.max(((toMin(e) - toMin(s)) / 60) * HOUR_H, HOUR_H * 0.5)

  const [medicos, setMedicos]           = useState([])
  const [allHorarios, setAllHorarios]   = useState({})   // { email: horarios[] }
  const [medicoSel, setMedicoSel]       = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [slotForm, setSlotForm]         = useState(null)
  const [savingSlot, setSavingSlot]     = useState(false)
  const [conflictError, setConflictError] = useState('')

  /* ── Mapa ── */
  const mapContainerRef = useRef(null)
  const leafletMapRef   = useRef(null)

  /* ── Helpers de mapeo ── */
  const CAP_ROLE = { paciente: 'Paciente', medico: 'Médico', admin: 'Admin' }
  const NIVEL_CFG = {
    Verde:    { label: 'Verde',    color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
    Amarillo: { label: 'Amarillo', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    Naranja:  { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', dot: '#f97316' },
    Rojo:     { label: 'Rojo',     color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
  }
  const fmtFecha = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    const hoy  = new Date()
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
    const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === hoy.toDateString())  return `Hoy ${time}`
    if (d.toDateString() === ayer.toDateString()) return `Ayer ${time}`
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ` ${time}`
  }
  const mapUsuario = (u) => ({
    id:        u.id,
    nombre:    u.nombre,
    rol:       CAP_ROLE[u.role] || u.role,
    roleRaw:   u.role,
    municipio: u.ciudad || '—',
    correo:    u.email,
    estado:    u.is_verified ? 'activo' : 'pendiente',
    triajes:   0,
  })
  const mapTriaje = (t) => ({
    id:          t.id,
    paciente:    t.nombre || '—',
    municipio:   t.ciudad || '—',
    fecha:       fmtFecha(t.timestamp),
    nivel:       NIVEL_CFG[t.triage_color] || NIVEL_CFG.Verde,
    teleconsulta: false,
    edad:        t.age,
    sintomas:    t.symptoms || '',
  })

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    const h = new Date().getHours()
    if (h < 12) setGreeting('Buenos días')
    else if (h < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
    // Carga estadísticas y alertas al montar
    client.get('/admin/estadisticas').then(({ data }) => setEstadisticas(data)).catch((e) => { console.error('Error cargando estadísticas:', e) })
    client.get('/admin/alertas').then(({ data }) => setAlertas(data.map(mapAlerta))).catch((e) => { console.error('Error cargando alertas:', e) })
  }, [])

  useEffect(() => {
    if (activeTab !== 'alertas') return
    client.get('/admin/alertas').then(({ data }) => setAlertas(data.map(mapAlerta))).catch((e) => { console.error('Error cargando alertas:', e) })
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'usuarios') return
    setLoadingUsuarios(true)
    client.get('/admin/usuarios')
      .then(({ data }) => setUsuarios((data.items ?? data).map(mapUsuario)))
      .catch((e) => { console.error('Error cargando usuarios:', e) })
      .finally(() => setLoadingUsuarios(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'triajes') return
    setLoadingTriajes(true)
    client.get('/medico/pacientes')
      .then(({ data }) => setTriajes((data.items ?? data).map(mapTriaje)))
      .catch((e) => { console.error('Error cargando triajes:', e) })
      .finally(() => setLoadingTriajes(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'mapa') return
    client.get('/admin/estadisticas')
      .then(({ data }) => setEstadisticas(data))
      .catch((e) => { console.error('Error refrescando estadísticas del mapa:', e) })
  }, [activeTab])

  const handleLogout = () => { logout(); navigate('/login') }

  /* ── Alertas separadas ── */
  const alertasPendientes = alertas.filter(a => a.estado === 'pendiente')
  const alertasHistorial  = alertas.filter(a => a.estado === 'atendida')

  /* ── Stats dinámicos ── */
  const stats = [
    { label: 'Total triajes',    value: estadisticas?.triajes?.total     ?? '…', color: '#374151' },
    { label: 'Pacientes',        value: estadisticas?.usuarios?.paciente  ?? '…', color: '#1a5f8a' },
    { label: 'Médicos',          value: estadisticas?.usuarios?.medico    ?? '…', color: '#15803d' },
    { label: 'Alertas activas',  value: alertasPendientes.length,                 color: '#b91c1c' },
  ]

  /* ── Nav unificado ── */
  const navItems = [
    { key: 'metricas',    label: 'Métricas',            icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { key: 'alertas',     label: 'Alertas',             icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
    { key: 'usuarios',    label: 'Usuarios',            icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { key: 'solicitudes', label: 'Solicitudes médico',  icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6' },
    { key: 'triajes',     label: 'Historial triajes',   icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
    { key: 'mapa',        label: 'Mapa de pacientes',   icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0z' },
    { key: 'horarios',    label: 'Horarios médicos',    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  ]

  /* ── Helpers alertas ── */
  const ALERTA_CFG = {
    Naranja: { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
    Rojo:    { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  }
  const mapAlerta = (a) => {
    const cfg = ALERTA_CFG[a.triage_color] || ALERTA_CFG.Rojo
    return {
      id:     a.id,
      tipo:   'crítico',
      estado: a.estado || 'pendiente',
      titulo: `Triaje ${a.triage_color} — ${a.paciente_nombre || a.paciente_email}`,
      desc:   `Paciente: ${a.paciente_nombre || '—'} · Tel: ${a.paciente_telefono || '—'} · ${a.ciudad || '—'}. Requiere atención de emergencia.`,
      hora:   fmtFecha(a.created_at),
      color:  cfg.color,
      bg:     cfg.bg,
      border: cfg.border,
    }
  }

  /* ── Handlers alertas ── */
  const handleAtenderAlerta = async (id) => {
    try { await client.put(`/admin/alertas/${id}/atender`) } catch {}
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, estado: 'atendida' } : a))
  }
  const handleIgnorarAlerta = async (id) => {
    try { await client.delete(`/admin/alertas/${id}`) } catch {}
    setAlertas(prev => prev.filter(a => a.id !== id))
  }

  /* ── Handlers usuarios ── */
  const handleAccionEstado = (id) => {
    setUsuarios(prev => prev.map(u => {
      if (u.id !== id) return u
      const next = u.estado === 'activo' ? 'inactivo' : 'activo'
      return { ...u, estado: next }
    }))
  }
  const handleGuardarEdit = async () => {
    if (!editRol) return
    setSavingEdit(true)
    setEditError('')
    try {
      await client.put(`/admin/usuarios/${encodeURIComponent(editUsuario.correo)}/rol`, { role: editRol })
      const { data } = await client.get('/admin/usuarios')
      setUsuarios((data.items ?? data).map(mapUsuario))
      setEditUsuario(null)
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Error al guardar.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleEliminarUsuario = async (email) => {
    if (!window.confirm(`¿Eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) return
    try {
      await client.delete(`/admin/usuarios/${encodeURIComponent(email)}`)
      const { data } = await client.get('/admin/usuarios')
      setUsuarios((data.items ?? data).map(mapUsuario))
    } catch {}
  }

  const handleAgregarUsuario = async () => {
    if (!nuevoForm.nombre.trim() || !nuevoForm.email.trim() || !nuevoForm.password.trim()) return
    setNuevoError('')
    setSavingUsuario(true)
    try {
      await client.post('/admin/usuarios', {
        nombre:   nuevoForm.nombre.trim(),
        email:    nuevoForm.email.trim(),
        password: nuevoForm.password.trim(),
        role:     nuevoForm.role,
        ciudad:   nuevoForm.ciudad.trim() || undefined,
      })
      setNuevoForm({ nombre: '', role: 'medico', ciudad: '', email: '', password: '' })
      setShowNuevoUsuario(false)
      const { data } = await client.get('/admin/usuarios')
      setUsuarios((data.items ?? data).map(mapUsuario))
      const { data: est } = await client.get('/admin/estadisticas')
      setEstadisticas(est)
    } catch (err) {
      setNuevoError(err?.response?.data?.detail || 'Error al crear el usuario.')
    } finally {
      setSavingUsuario(false)
    }
  }

  /* ── Leaflet map: initialize/destroy when mapa tab is active ── */
  useEffect(() => {
    if (activeTab !== 'mapa') {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      return
    }
    const el = mapContainerRef.current
    if (!el) return

    Promise.all([
      import('leaflet'),
      fetch('/antioquia.geojson').then(r => r.json()),
    ]).then(([{ default: L }, geojson]) => {
      if (!mapContainerRef.current) return
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }

      const antioquiaCoords = geojson.geometry.coordinates[0]

      const borderLayer = L.geoJSON(geojson, {
        style: {
          fillColor: 'transparent',
          fillOpacity: 0,
          color: '#1a5f8a',
          weight: 2.5,
          opacity: 0.9,
        },
      })

      const BOUNDS = borderLayer.getBounds().pad(0.05)
      const map = L.map(mapContainerRef.current, {
        center: BOUNDS.getCenter(),
        zoom: 8,
        minZoom: 7,
        maxZoom: 13,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        attributionControl: true,
      })
      map.fitBounds(BOUNDS)

      map.getContainer().style.background = '#f1f5f9'

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        bounds: BOUNDS,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Máscara: cubre el mundo entero excepto Antioquia
      const worldRing = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]]
      L.geoJSON({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [worldRing, antioquiaCoords] },
      }, {
        style: {
          fillColor: '#f1f5f9',
          fillOpacity: 1,
          fillRule: 'evenodd',
          stroke: false,
          weight: 0,
        },
      }).addTo(map)

      borderLayer.addTo(map)

      mapaPoints.forEach(p => {
        const radius = Math.max(3000, Math.min(p.count * 5000, 18000))
        const color  = p.nivel
        L.circle([p.lat, p.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.30,
          weight: 2,
          opacity: 0.85,
        })
        .bindPopup(`
          <div style="font-family:'Segoe UI',sans-serif;min-width:160px;padding:2px 0">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2937;margin-bottom:5px">${p.nombre}</div>
            <div style="font-size:0.82rem;color:#6b7280;margin-bottom:6px">${p.count} caso${p.count > 1 ? 's' : ''} registrado${p.count > 1 ? 's' : ''}</div>
            <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.74rem;font-weight:700;
              background:${color}20;color:${color};border:1px solid ${color}40">
              ${p.nivelLabel}
            </span>
          </div>
        `)
        .addTo(map)

        L.circleMarker([p.lat, p.lng], {
          radius: 5,
          color: 'white',
          fillColor: color,
          fillOpacity: 1,
          weight: 2,
        }).addTo(map)
      })

      leafletMapRef.current = map
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [activeTab, estadisticas?.triajes?.total ?? 0])

  /* ── Solicitudes: carga al abrir la pestaña ── */
  useEffect(() => {
    if (activeTab !== 'solicitudes') return
    setLoadingSolicitudes(true)
    client.get('/admin/solicitudes')
      .then(({ data }) => setSolicitudes(data))
      .catch((e) => { console.error('Error cargando solicitudes:', e) })
      .finally(() => setLoadingSolicitudes(false))
  }, [activeTab])

  const handleAccionSolicitud = async (id, accion) => {
    setProcesandoId(id)
    try {
      await client.put(`/admin/solicitudes/${id}/accion`, { accion })
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: accion === 'aceptar' ? 'aceptada' : 'rechazada' } : s))
      setExpandedSolicitud(null)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al procesar la solicitud.')
    } finally {
      setProcesandoId(null)
    }
  }

  /* ── Horarios: carga médicos + todos sus horarios al abrir la pestaña ── */
  useEffect(() => {
    if (activeTab !== 'horarios') return
    client.get('/admin/usuarios?role=medico')
      .then(({ data }) => {
        const lista = data.items ?? data
        setMedicos(lista)
        lista.forEach(m => {
          client.get(`/admin/medicos/${encodeURIComponent(m.email)}/horarios`)
            .then(({ data: hs }) => setAllHorarios(prev => ({ ...prev, [m.email]: hs })))
            .catch(() => setAllHorarios(prev => ({ ...prev, [m.email]: [] })))
        })
      })
      .catch((e) => { console.error('Error cargando horarios:', e) })
  }, [activeTab])

  const seleccionarMedico = (m) => {
    setMedicoSel(m)
    setSlotForm(null)
    setConflictError('')
    setCalendarOpen(true)
  }

  const checkConflict = (dia, hi, hf) => {
    for (const [email, hs] of Object.entries(allHorarios)) {
      if (email === medicoSel?.email) continue
      const ex = (hs || []).find(h => h.dia_semana === dia)
      if (ex && toMin(hi) < toMin(ex.hora_fin) && toMin(ex.hora_inicio) < toMin(hf)) {
        const nombre = medicos.find(m => m.email === email)?.nombre || email
        return `Conflicto con ${nombre}: ya tiene ${ex.hora_inicio}–${ex.hora_fin} ese día`
      }
    }
    return ''
  }

  const guardarSlot = async () => {
    if (!medicoSel || !slotForm) return
    const conflict = checkConflict(slotForm.dia, slotForm.hora_inicio, slotForm.hora_fin)
    if (conflict) { setConflictError(conflict); return }
    setConflictError('')
    setSavingSlot(true)
    try {
      await client.put(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios`, {
        dia_semana: slotForm.dia, hora_inicio: slotForm.hora_inicio, hora_fin: slotForm.hora_fin,
      })
      const { data } = await client.get(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios`)
      setAllHorarios(prev => ({ ...prev, [medicoSel.email]: data }))
      setSlotForm(null)
    } catch {}
    finally { setSavingSlot(false) }
  }

  const eliminarHorario = async (dia) => {
    if (!medicoSel) return
    try {
      await client.delete(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios/${dia}`)
      setAllHorarios(prev => ({ ...prev, [medicoSel.email]: (prev[medicoSel.email] || []).filter(h => h.dia_semana !== dia) }))
      setSlotForm(null)
    } catch {}
  }

  /* ── Listas filtradas ── */
  const usuariosFiltrados = (() => {
    let list = usuarios
    if (filtroRol !== 'todos') list = list.filter(u => u.rol.toLowerCase() === filtroRol)
    if (busquedaUsuarios.trim()) {
      const q = busquedaUsuarios.toLowerCase()
      list = list.filter(u => u.nombre.toLowerCase().includes(q) || u.municipio.toLowerCase().includes(q))
    }
    return list
  })()

  const triajesFiltrados = (() => {
    let list = triajes
    if (filtroNivel !== 'todos') list = list.filter(t => t.nivel.label.toLowerCase() === filtroNivel)
    if (busquedaTriajes.trim()) {
      const q = busquedaTriajes.toLowerCase()
      list = list.filter(t => t.paciente.toLowerCase().includes(q) || t.municipio.toLowerCase().includes(q))
    }
    return list
  })()

  /* ── Mapa ── */
  const NIVEL_DOT = { Verde: '#22c55e', Amarillo: '#f59e0b', Naranja: '#f97316', Rojo: '#ef4444' }

  const MUNICIPIO_LATLNG = {
    // Valle de Aburrá
    'Medellín':                [6.252, -75.564],
    'Bello':                   [6.337, -75.558],
    'Itagüí':                  [6.184, -75.599],
    'Envigado':                [6.171, -75.591],
    'La Estrella':             [6.156, -75.641],
    'Caldas':                  [6.094, -75.635],
    'Sabaneta':                [6.150, -75.617],
    'Copacabana':              [6.350, -75.500],
    'Girardota':               [6.383, -75.450],
    'Barbosa':                 [6.433, -75.333],

    // Occidente
    'Buriticá':                [6.717, -75.917],
    'Liborina':                [6.683, -75.900],
    'Sabanalarga':             [6.883, -75.767],
    'Olaya':                   [6.617, -75.933],
    'Santa Fe de Antioquia':   [6.556, -75.826],
    'Sta. Fe Ant.':            [6.556, -75.826],
    'Sopetrán':                [6.500, -75.783],
    'San Jerónimo':            [6.483, -75.717],
    'Heliconia':               [6.217, -75.733],
    'Ebéjico':                 [6.317, -75.833],
    'Armenia':                 [6.283, -75.900],
    'Anzá':                    [6.317, -75.867],
    'Caicedo':                 [6.383, -75.983],
    'Cañasgordas':             [6.750, -76.017],
    'Dabeiba':                 [7.000, -76.267],
    'Giraldo':                 [6.783, -75.967],
    'Peque':                   [6.967, -75.983],
    'Urrao':                   [6.317, -76.133],

    // Suroeste
    'Támesis':                 [5.667, -75.717],
    'Jericó':                  [5.790, -75.783],
    'Andes':                   [5.656, -75.878],
    'Ciudad Bolívar':          [5.853, -75.917],
    'Jardín':                  [5.600, -75.817],
    'Valparaíso':              [5.733, -75.583],
    'Salgar':                  [5.959, -75.983],
    'Betania':                 [5.750, -75.967],
    'Betulia':                 [6.117, -75.983],
    'Concordia':               [6.050, -75.917],
    'Fredonia':                [5.933, -75.683],
    'La Pintada':              [5.749, -75.603],
    'Montebello':              [5.967, -75.517],
    'Pueblorrico':             [5.867, -76.033],
    'Santa Bárbara':           [5.867, -75.567],
    'Tarso':                   [5.817, -75.817],
    'Hispania':                [5.833, -75.933],

    // Oriente
    'Rionegro':                [6.154, -75.374],
    'El Retiro':               [6.050, -75.500],
    'El Santuario':            [6.133, -75.267],
    'Marinilla':               [6.178, -75.333],
    'El Carmen de Viboral':    [6.083, -75.342],
    'La Ceja':                 [6.017, -75.433],
    'La Unión':                [5.983, -75.367],
    'Sonsón':                  [5.717, -75.317],
    'Abejorral':               [5.800, -75.433],
    'Argelia':                 [5.717, -75.167],
    'Nariño':                  [5.817, -75.150],

    // Norte
    'Santa Rosa de Osos':      [6.617, -75.467],
    'Yarumal':                 [7.000, -75.417],
    'Ituango':                 [7.167, -75.767],
    'Valdivia':                [7.117, -75.433],
    'Angostura':               [6.883, -75.333],
    'Campamento':              [7.000, -75.283],
    'Don Matías':              [6.483, -75.400],
    'Entrerríos':              [6.567, -75.417],
    'Guadalupe':               [6.883, -75.233],
    'San Pedro de los Milagros': [6.467, -75.567],
    'Toledo':                  [7.317, -75.383],

    // Nordeste
    'Amalfi':                  [6.917, -75.083],
    'Anorí':                   [7.083, -75.133],
    'Segovia':                 [7.083, -74.700],
    'Remedios':                [6.983, -74.683],
    'Vegachí':                 [6.767, -74.800],
    'Cisneros':                [6.533, -74.983],
    'Yalí':                    [6.983, -75.017],
    'Yolombó':                 [6.600, -75.017],

    // Bajo Cauca
    'Caucasia':                [7.983, -75.200],
    'El Bagre':                [7.583, -74.817],
    'Zaragoza':                [7.483, -74.867],
    'Tarazá':                  [7.583, -75.400],
    'Cáceres':                 [7.583, -75.333],
    'Nechí':                   [8.100, -74.767],

    // Magdalena Medio
    'Puerto Berrío':           [6.483, -74.400],
    'Yondó':                   [6.817, -74.433],
    'Puerto Nare':             [6.200, -74.583],
    'Caracolí':                [6.433, -74.767],
    'Maceo':                   [6.550, -74.783],
    'Puerto Triunfo':          [5.883, -74.617],

    // Oriente adicionales
    'Cocorná':                 [6.067, -75.183],
    'Concepción':              [6.383, -75.267],
    'El Peñol':                [6.217, -75.233],
    'Granada':                 [6.150, -75.200],
    'Guarne':                  [6.283, -75.450],
    'Guatapé':                 [6.233, -75.167],
    'San Carlos':              [6.183, -74.983],
    'San Francisco':           [6.000, -75.100],
    'San Luis':                [6.033, -74.983],
    'San Rafael':              [6.283, -75.017],
    'San Vicente Ferrer':      [6.367, -75.333],
    'Alejandría':              [6.367, -75.083],

    // Occidente adicionales
    'Abriaquí':                [6.633, -76.100],
    'Frontino':                [6.783, -76.133],
    'Uramita':                 [6.883, -76.167],

    // Suroeste adicionales
    'Angelópolis':             [6.117, -75.717],
    'Venecia':                 [5.983, -75.767],

    // Norte adicionales
    'Belmira':                 [6.600, -75.667],
    'Briceño':                 [7.100, -75.583],
    'Carolina del Príncipe':   [6.750, -75.333],
    'Gómez Plata':             [6.717, -75.200],
    'San Andrés de Cuerquia':  [6.983, -75.817],
    'San José de la Montaña':  [6.817, -75.683],

    // Valle de Aburrá adicionales
    'Sabaneta':                [6.150, -75.617],
  }

  const mapaPoints = (() => {
    const porCiudad = estadisticas?.triajes?.por_ciudad || []
    return porCiudad
      .filter(d => MUNICIPIO_LATLNG[d.ciudad])
      .map((d, i) => {
        const [lat, lng] = MUNICIPIO_LATLNG[d.ciudad]
        return {
          id:        i + 1,
          nombre:    d.ciudad,
          lat,
          lng,
          nivel:     NIVEL_DOT[d.peor_nivel] || '#22c55e',
          nivelLabel: d.peor_nivel,
          count:     d.total,
        }
      })
  })()

  const rolColor = { Paciente: '#374151', Médico: '#1a5f8a' }
  const estadoBadge = {
    activo:    { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    pendiente: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    inactivo:  { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#f3f4f6'
    }}>

      <style>{`
        * { box-sizing: border-box; }

        /* Leaflet customization */
        .leaflet-container {
          background: #f1f5f9 !important;
          font-family: 'Segoe UI', sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.14) !important;
          border: 1px solid #e5e7eb;
          padding: 0;
        }
        .leaflet-popup-content { margin: 12px 14px !important; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-control-zoom {
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          color: #374151 !important;
          border-color: #e5e7eb !important;
        }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tabSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(185,28,28,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(185,28,28,0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }


        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          cursor: pointer; color: rgba(255,255,255,0.45);
          font-size: 0.88rem; font-weight: 500;
          transition: all 0.18s ease; border: 1px solid transparent;
        }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); }
        .nav-item.active { background: rgba(255,255,255,0.12); color: white; border-color: rgba(255,255,255,0.15); }
        .logout-btn {
          display: flex; align-items: center; gap: 0.6rem;
          width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
          background: none; border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35); font-size: 0.85rem; cursor: pointer;
          transition: all 0.18s ease;
        }
        .logout-btn:hover { background: rgba(220,50,50,0.1); border-color: rgba(220,50,50,0.2); color: #ff8080; }

        .stat-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1.1rem 1.4rem;
          transition: all 0.2s ease;
        }
        .stat-card:hover { border-color: #9ca3af; box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }

        .tab-btn {
          padding: 0.55rem 1.25rem; border-radius: 9px;
          border: 1.5px solid #d1d5db; background: white;
          font-size: 0.85rem; font-weight: 600; cursor: pointer; color: #374151;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .tab-btn:hover:not(.active) { background: #f9fafb; border-color: #6b7280; transform: translateY(-1px); }
        .tab-btn.active { background: #1f2937; color: white; border-color: #1f2937; box-shadow: 0 4px 14px rgba(31,41,55,0.3); }

        .alerta-card {
          background: white; border-radius: 14px; padding: 1.1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          border-left: 3px solid transparent;
        }
        .alerta-card:hover { transform: translateX(4px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }

        .usuario-row {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; gap: 1rem;
        }
        .usuario-row:hover { border-color: #9ca3af; box-shadow: 0 6px 20px rgba(0,0,0,0.07); transform: translateY(-2px); }

        .triaje-row {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 1rem 1.4rem;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
        }
        .triaje-row:hover { border-color: #9ca3af; box-shadow: 0 6px 20px rgba(0,0,0,0.07); transform: translateY(-2px); }

        .btn-admin {
          background: #1f2937; color: white; border: none; border-radius: 9px;
          padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-admin:hover { background: #111827; box-shadow: 0 4px 12px rgba(31,41,55,0.3); transform: translateY(-1px); }
        .btn-outline-admin {
          background: none; border: 1.5px solid #d1d5db; border-radius: 9px;
          padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600; color: #374151;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-outline-admin:hover { background: #f3f4f6; border-color: #6b7280; transform: translateY(-1px); }
        .btn-danger {
          background: none; border: 1.5px solid #fecaca; border-radius: 9px;
          padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600; color: #b91c1c;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-danger:hover { background: #fef2f2; border-color: #f87171; transform: translateY(-1px); }
        .btn-success {
          background: none; border: 1.5px solid #bbf7d0; border-radius: 9px;
          padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 600; color: #15803d;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-success:hover { background: #f0fdf4; border-color: #86efac; transform: translateY(-1px); }

        .fab-admin {
          position: fixed; bottom: 2.5rem; right: 2.5rem;
          background: linear-gradient(135deg, #1f2937, #374151);
          color: white; border: none; border-radius: 16px;
          padding: 0.9rem 1.6rem; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; z-index: 200;
          display: flex; align-items: center; gap: 0.65rem;
          box-shadow: 0 8px 28px rgba(31,41,55,0.35);
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fab-admin:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 36px rgba(31,41,55,0.45); }
        .fab-admin:active { transform: scale(0.97); }

        .alert-pulse { animation: pulse 2s ease-in-out infinite; }
        .live-dot { animation: blink 1.5s ease-in-out infinite; }

        .search-input {
          width: 100%; padding: 0.55rem 0.9rem 0.55rem 2.2rem;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.85rem; color: #374151; background: white;
          outline: none; transition: border-color 0.18s ease; font-family: inherit;
        }
        .search-input:focus { border-color: #6b7280; }
        .filter-select {
          padding: 0.55rem 0.85rem; border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.85rem; color: #374151; background: white;
          outline: none; cursor: pointer; transition: border-color 0.18s ease;
          font-family: inherit; white-space: nowrap;
        }
        .filter-select:focus { border-color: #6b7280; }

        .modal-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        }
        .modal-box {
          background: white; border-radius: 20px; padding: 2rem;
          width: 100%; max-width: 480px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          animation: modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-input {
          width: 100%; padding: 0.6rem 0.85rem;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.88rem; color: #374151; outline: none;
          transition: border-color 0.18s ease; font-family: inherit;
        }
        .modal-input:focus { border-color: #374151; }
        .modal-select {
          width: 100%; padding: 0.6rem 0.85rem;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 0.88rem; color: #374151; background: white;
          outline: none; cursor: pointer; font-family: inherit;
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'linear-gradient(175deg, #111827 0%, #1f2937 50%, #111827 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '1.75rem 1.25rem',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: 'auto',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '2.5rem', paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)'
        }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '2px' }}>STIGA</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>Panel administrador</p>
          </div>
        </div>

        {/* Usuario */}
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #374151, #6b7280)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.6rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '700' }}>
              {user?.name?.charAt(0)}
            </span>
          </div>
          <p style={{ margin: '0 0 0.1rem', color: 'white', fontSize: '0.88rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>Superadministrador</p>
        </div>

        {/* Nav unificado */}
        <nav style={{ flex: 1 }}>
          <p style={{
            margin: '0 0 0.5rem 0.5rem', color: 'rgba(255,255,255,0.2)',
            fontSize: '0.68rem', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>Menú</p>
          {navItems.map(item => (
            <div
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon}/>
              </svg>
              {item.label}
              {item.key === 'alertas' && alertasPendientes.length > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: '20px', height: '20px',
                  background: '#b91c1c', color: 'white', fontSize: '0.68rem', fontWeight: '700',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
                }}>{alertasPendientes.length}</span>
              )}
              {item.key === 'solicitudes' && solicitudes.filter(s => s.estado === 'pendiente').length > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: '20px', height: '20px',
                  background: '#1a5f8a', color: 'white', fontSize: '0.68rem', fontWeight: '700',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
                }}>{solicitudes.filter(s => s.estado === 'pendiente').length}</span>
              )}
            </div>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* ── Contenido ── */}
      <main style={{
        marginLeft: '240px', flex: 1,
        padding: '2.5rem 2.5rem 6rem',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s ease 0.15s',
        width: '100%', height: '100vh', overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: '2rem', animation: mounted ? 'fadeInUp 0.5s ease' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>{greeting}</p>
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '20px', padding: '0.15rem 0.6rem',
                fontSize: '0.72rem', fontWeight: '700', color: '#15803d'
              }}>
                <span className="live-dot" style={{
                  width: '6px', height: '6px', background: '#22c55e',
                  borderRadius: '50%', display: 'inline-block'
                }} />
                Sistema en línea
              </span>
            </div>
            <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.8rem', fontWeight: '700', color: '#06111f' }}>
              {user?.name}
            </h1>
            <p style={{ margin: 0, color: '#374151', fontSize: '0.88rem', fontWeight: '500' }}>
              Panel de control · STIGA Antioquia
            </p>
          </div>
          <AccessibilityMenu inline />
        </div>

        {/* Resumen del sistema */}
        <div style={{ marginBottom: '1.5rem', animation: mounted ? 'fadeInUp 0.5s ease 0.05s both' : 'none' }}>
          <div style={{
            background: 'white', border: '1px solid #e5e7eb',
            borderLeft: `3px solid ${alertasPendientes.length > 0 ? '#b91c1c' : '#374151'}`,
            borderRadius: '12px', padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={alertasPendientes.length > 0 ? '#b91c1c' : '#374151'} strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, color: '#06111f', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: alertasPendientes.length > 0 ? '#b91c1c' : '#374151' }}>Estado: </strong>
              {alertasPendientes.length > 0
                ? `${alertasPendientes.length} alerta${alertasPendientes.length > 1 ? 's' : ''} activa${alertasPendientes.length > 1 ? 's' : ''}.`
                : 'Sin alertas activas.'}
            </p>
          </div>
        </div>

        {/* Stats dinámicos */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', marginBottom: '2rem',
          animation: mounted ? 'fadeInUp 0.5s ease 0.15s both' : 'none'
        }}>
          {stats.map((s, i) => (
            <div key={s.label} className="stat-card" style={{
              animation: mounted ? `fadeInUp 0.5s ease ${0.15 + i * 0.07}s both` : 'none'
            }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {s.label}
              </p>
              <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: '700', color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs sincronizados con navItems */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap',
          animation: mounted ? 'fadeInUp 0.5s ease 0.25s both' : 'none'
        }}>
          {navItems.map(t => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}{t.key === 'alertas' && alertasPendientes.length > 0 ? ` (${alertasPendientes.length})` : ''}
            </button>
          ))}
        </div>

        {/* ── TAB Métricas ── */}
        {activeTab === 'metricas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <div style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem'
            }}>
              {(() => {
                const porDia = estadisticas?.triajes?.por_dia || []
                const totalSemana = estadisticas?.triajes?.total_semana ?? 0
                const cambio = estadisticas?.triajes?.cambio_semanal
                const maxVal = Math.max(...porDia.map(d => d.total), 1)
                const hoyISO = new Date().toISOString().split('T')[0]
                const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div>
                        <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                          Triajes por día — últimos 7 días
                        </p>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.82rem' }}>
                          Total: {totalSemana} triaje{totalSemana !== 1 ? 's' : ''} esta semana
                        </p>
                      </div>
                      {cambio !== null && cambio !== undefined ? (
                        <span style={{
                          background: cambio >= 0 ? '#f0fdf4' : '#fef2f2',
                          color: cambio >= 0 ? '#15803d' : '#dc2626',
                          fontSize: '0.78rem', fontWeight: '700',
                          padding: '0.3rem 0.8rem', borderRadius: '8px',
                          border: `1px solid ${cambio >= 0 ? '#bbf7d0' : '#fecaca'}`
                        }}>
                          {cambio >= 0 ? '↑' : '↓'} {Math.abs(cambio)}% vs semana anterior
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Sin datos anteriores</span>
                      )}
                    </div>
                    {porDia.map((b, i) => {
                      const esHoy = b.fecha === hoyISO
                      const label = esHoy ? 'Hoy' : DIAS[new Date(b.fecha + 'T12:00:00').getDay()]
                      return (
                        <div key={b.fecha} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 6 ? '0.75rem' : 0 }}>
                          <span style={{ minWidth: '30px', fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>{label}</span>
                          <div style={{ flex: 1, height: '28px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${(b.total / maxVal) * 100}%`,
                              background: esHoy ? 'linear-gradient(90deg, #1f2937, #374151)' : 'linear-gradient(90deg, #9ca3af, #d1d5db)',
                              borderRadius: '6px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                              display: 'flex', alignItems: 'center', paddingLeft: '0.6rem',
                              minWidth: b.total > 0 ? '28px' : '0'
                            }}>
                              {b.total > 0 && <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '700' }}>{b.total}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.25rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                Distribución por nivel de urgencia — histórico
              </p>
              {(() => {
                const pc = estadisticas?.triajes?.por_color || {}
                const total = Object.values(pc).reduce((a, b) => a + b, 0) || 1
                return [
                  { label: 'Rojo',     count: pc['Rojo']     || 0, color: '#ef4444' },
                  { label: 'Naranja',  count: pc['Naranja']  || 0, color: '#f97316' },
                  { label: 'Amarillo', count: pc['Amarillo'] || 0, color: '#f59e0b' },
                  { label: 'Verde',    count: pc['Verde']    || 0, color: '#22c55e' },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ width: '10px', height: '10px', background: n.color, borderRadius: '50%', flexShrink: 0, boxShadow: `0 0 6px ${n.color}60` }} />
                    <span style={{ minWidth: '65px', fontSize: '0.83rem', fontWeight: '600', color: '#374151' }}>{n.label}</span>
                    <div style={{ flex: 1, height: '22px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(n.count / total) * 100}%`, background: n.color, borderRadius: '6px', opacity: 0.75, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ minWidth: '36px', fontSize: '0.83rem', fontWeight: '700', color: '#374151', textAlign: 'right' }}>{n.count}</span>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* ── TAB Alertas ── */}
        {activeTab === 'alertas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>

            {/* Sección pendientes */}
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Activas · {alertasPendientes.length}
            </p>
            {alertasPendientes.length === 0 && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '0.6rem' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.88rem' }}>Sin alertas activas. El sistema opera con normalidad.</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {alertasPendientes.map((a, i) => (
                <div key={a.id} className="alerta-card" style={{
                  border: `1px solid ${a.border}`, borderLeft: `3px solid ${a.color}`,
                  animation: `slideIn 0.4s ease ${i * 0.08}s both`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0, background: a.bg, borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '1rem' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>{a.titulo}</p>
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem', flexShrink: 0 }}>{a.hora}</span>
                      </div>
                      <p style={{ margin: '0 0 0.75rem', color: '#374151', fontSize: '0.84rem', lineHeight: 1.5 }}>{a.desc}</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Chulito = atender */}
                        <button
                          title="Marcar como atendida"
                          onClick={() => handleAtenderAlerta(a.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #bbf7d0',
                            background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        {/* X = ignorar y eliminar */}
                        <button
                          title="Ignorar y eliminar"
                          onClick={() => handleIgnorarAlerta(a.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #fecaca',
                            background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sección historial atendidas */}
            {alertasHistorial.length > 0 && (
              <>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                  Historial atendidas · {alertasHistorial.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {alertasHistorial.map((a) => (
                    <div key={a.id} style={{
                      background: 'white', border: '1px solid #e5e7eb', borderLeft: '3px solid #d1d5db',
                      borderRadius: '12px', padding: '0.85rem 1.1rem',
                      display: 'flex', alignItems: 'center', gap: '0.85rem', opacity: 0.75
                    }}>
                      <div style={{
                        width: '28px', height: '28px', flexShrink: 0, background: '#f0fdf4', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', color: '#374151', fontSize: '0.86rem' }}>{a.titulo}</p>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.78rem' }}>{a.desc}</p>
                      </div>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '600', color: '#16a34a',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '6px', padding: '2px 8px', flexShrink: 0
                      }}>Atendida</span>
                      <span style={{ color: '#9ca3af', fontSize: '0.72rem', flexShrink: 0 }}>{a.hora}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB Usuarios ── */}
        {activeTab === 'usuarios' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            {/* Barra de búsqueda y filtros */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: '180px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                  style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="search-input"
                  placeholder="Buscar por nombre o municipio…"
                  value={busquedaUsuarios}
                  onChange={e => setBusquedaUsuarios(e.target.value)}
                />
              </div>
              <select className="filter-select" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="todos">Todos los roles</option>
                <option value="paciente">Paciente</option>
                <option value="médico">Médico</option>
              </select>
              <button className="btn-admin" onClick={() => setShowNuevoUsuario(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Nuevo usuario
              </button>
            </div>

            <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {loadingUsuarios ? 'Cargando…' : `${usuariosFiltrados.length} usuario${usuariosFiltrados.length !== 1 ? 's' : ''}${(busquedaUsuarios || filtroRol !== 'todos') ? ' encontrados' : ' registrados'}`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingUsuarios ? (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>Cargando usuarios…</p>
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>No se encontraron usuarios con esos criterios.</p>
                </div>
              ) : usuariosFiltrados.map((u, i) => (
                <div key={u.id} className="usuario-row" style={{ animation: `slideIn 0.4s ease ${i * 0.07}s both` }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: rolColor[u.rol] + '15', border: `1.5px solid ${rolColor[u.rol]}30`,
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: '800', color: rolColor[u.rol]
                  }}>
                    {u.nombre.split(' ').filter(n => !['Dra.', 'Dr.'].includes(n)).map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>{u.nombre}</p>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700', color: rolColor[u.rol],
                        background: rolColor[u.rol] + '12', padding: '0.15rem 0.55rem',
                        borderRadius: '20px', border: `1px solid ${rolColor[u.rol]}25`
                      }}>{u.rol}</span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '700',
                        color: estadoBadge[u.estado].color, background: estadoBadge[u.estado].bg,
                        padding: '0.15rem 0.55rem', borderRadius: '20px',
                        border: `1px solid ${estadoBadge[u.estado].border}`
                      }}>{u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}</span>
                    </div>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.8rem', fontWeight: '500' }}>
                      {u.municipio}{u.correo ? ` · ${u.correo}` : ''}{u.triajes > 0 ? ` · ${u.triajes} triajes` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn-outline-admin" onClick={() => { setEditUsuario(u); setEditRol(u.roleRaw); setEditError('') }}>Editar</button>
                    {u.estado === 'pendiente' ? (
                      <button className="btn-success" onClick={() => handleAccionEstado(u.id)}>Aprobar</button>
                    ) : u.estado === 'activo' ? (
                      <button className="btn-danger" onClick={() => handleAccionEstado(u.id)}>Desactivar</button>
                    ) : (
                      <button className="btn-outline-admin" onClick={() => handleAccionEstado(u.id)}>Activar</button>
                    )}
                    <button className="btn-danger" onClick={() => handleEliminarUsuario(u.correo)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Triajes ── */}
        {activeTab === 'triajes' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            {/* Barra de búsqueda y filtros */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: '180px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                  style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="search-input"
                  placeholder="Buscar por paciente o municipio…"
                  value={busquedaTriajes}
                  onChange={e => setBusquedaTriajes(e.target.value)}
                />
              </div>
              <select className="filter-select" value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
                <option value="todos">Todos los niveles</option>
                <option value="rojo">Rojo</option>
                <option value="naranja">Naranja</option>
                <option value="amarillo">Amarillo</option>
                <option value="verde">Verde</option>
              </select>
            </div>

            <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {loadingTriajes ? 'Cargando…' : `${triajesFiltrados.length} triaje${triajesFiltrados.length !== 1 ? 's' : ''}${(busquedaTriajes || filtroNivel !== 'todos') ? ' encontrados' : ' recientes'}`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingTriajes ? (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>Cargando historial de triajes…</p>
                </div>
              ) : triajesFiltrados.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>No se encontraron triajes con esos criterios.</p>
                </div>
              ) : triajesFiltrados.map((t, i) => (
                <div key={t.id} className="triaje-row" style={{
                  animation: `slideIn 0.4s ease ${i * 0.07}s both`,
                  borderLeft: `3px solid ${t.nivel.dot}`
                }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: t.nivel.bg, border: `1.5px solid ${t.nivel.dot}40`,
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: '12px', height: '12px', background: t.nivel.dot, borderRadius: '50%', boxShadow: `0 0 6px ${t.nivel.dot}80` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>{t.paciente}</p>
                      <span style={{
                        background: t.nivel.bg, color: t.nivel.color,
                        fontSize: '0.72rem', fontWeight: '700', padding: '0.18rem 0.6rem', borderRadius: '20px'
                      }}>{t.nivel.label}</span>
                      {t.teleconsulta && (
                        <span style={{
                          background: '#eff6ff', color: '#1a5f8a', fontSize: '0.7rem', fontWeight: '700',
                          padding: '0.18rem 0.6rem', borderRadius: '20px', border: '1px solid #bfdbfe'
                        }}>📹 Teleconsulta</span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.8rem', fontWeight: '500' }}>
                      {t.municipio} · {t.fecha}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn-outline-admin" onClick={() => setDetalleTriaje(t)}>Ver detalle</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Horarios ── */}
        {activeTab === 'horarios' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {medicos.length} médico{medicos.length !== 1 ? 's' : ''} — selecciona uno para gestionar su calendario
            </p>
            {medicos.length === 0 ? (
              <div style={{ background: 'white', border: '1.5px dashed #e5e7eb', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#9ca3af' }}>No hay médicos registrados en el sistema.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {medicos.map((m, i) => {
                  const hs = allHorarios[m.email] || []
                  return (
                    <div
                      key={m.email}
                      className="usuario-row"
                      onClick={() => seleccionarMedico(m)}
                      style={{ cursor: 'pointer', animation: `slideIn 0.4s ease ${i * 0.07}s both` }}
                    >
                      <div style={{
                        width: '40px', height: '40px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: '800', color: '#7ac896',
                      }}>
                        {m.nombre.split(' ').filter(n => !['Dr.','Dra.'].includes(n)).map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>{m.nombre}</p>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.78rem' }}>
                          {m.ciudad || m.email} · {hs.length} día{hs.length !== 1 ? 's' : ''} configurado{hs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        {DIAS.map((_, idx) => {
                          const tiene = hs.some(h => h.dia_semana === idx)
                          return (
                            <div key={idx} style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: tiene ? '#22c55e' : '#e5e7eb',
                              boxShadow: tiene ? '0 0 4px #22c55e60' : 'none',
                            }} />
                          )
                        })}
                      </div>
                      <button className="btn-outline-admin" style={{ flexShrink: 0 }}>
                        Ver calendario →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB Mapa ── */}
        {activeTab === 'mapa' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                  Ubicación de pacientes activos
                </p>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.82rem' }}>
                  Antioquia · {mapaPoints.length} municipios con actividad
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#9ca3af' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Clic en el círculo para ver detalles
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>

              {/* Leyenda de niveles */}
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nivel de triaje</span>
                {[
                  { color: '#22c55e', label: 'Verde' },
                  { color: '#f59e0b', label: 'Amarillo' },
                  { color: '#f97316', label: 'Naranja' },
                  { color: '#ef4444', label: 'Rojo' },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', background: n.color, borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '500' }}>{n.label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {mapaPoints.length} municipio{mapaPoints.length !== 1 ? 's' : ''} · tamaño proporcional al volumen
                </span>
              </div>

              {/* Contenedor Leaflet */}
              <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '460px' }}
              />

              {/* Lista de municipios */}
              {mapaPoints.length > 0 && (
                <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {mapaPoints.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div style={{ width: '8px', height: '8px', background: p.nivel, borderRadius: '50%', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>{p.nombre}</span>
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', background: '#f3f4f6', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                        {p.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {mapaPoints.length === 0 && (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
                  Sin triajes con ubicación registrada aún.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB Solicitudes médico ── */}
        {activeTab === 'solicitudes' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: '700', color: '#06111f' }}>
                  Solicitudes de acceso médico
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.83rem' }}>
                  {solicitudes.filter(s => s.estado === 'pendiente').length} pendiente{solicitudes.filter(s => s.estado === 'pendiente').length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                className="btn-outline-admin"
                onClick={() => {
                  setLoadingSolicitudes(true)
                  client.get('/admin/solicitudes')
                    .then(({ data }) => setSolicitudes(data))
                    .catch(() => {})
                    .finally(() => setLoadingSolicitudes(false))
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Actualizar
              </button>
            </div>

            {loadingSolicitudes ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
                Cargando solicitudes…
              </div>
            ) : solicitudes.length === 0 ? (
              <div style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px',
                padding: '3rem', textAlign: 'center'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '0.75rem' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6"/>
                </svg>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.88rem' }}>No hay solicitudes registradas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {solicitudes.map(sol => {
                  const isPendiente = sol.estado === 'pendiente'
                  const isExpanded  = expandedSolicitud === sol.id
                  const estadoCfg   = {
                    pendiente: { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Pendiente' },
                    aceptada:  { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Aceptada'  },
                    rechazada: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Rechazada' },
                  }[sol.estado] || { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: sol.estado }

                  return (
                    <div key={sol.id} style={{
                      background: 'white', border: '1px solid #e5e7eb',
                      borderRadius: '14px', overflow: 'hidden',
                      transition: 'box-shadow 0.2s ease',
                    }}>
                      {/* Cabecera de la card */}
                      <div
                        style={{
                          padding: '1rem 1.4rem', display: 'flex', alignItems: 'center',
                          gap: '1rem', cursor: 'pointer',
                        }}
                        onClick={() => setExpandedSolicitud(isExpanded ? null : sol.id)}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #1a3a2e, #2d6a4f)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem' }}>
                            {sol.nombre?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 0.15rem', fontWeight: '600', color: '#06111f', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sol.nombre}
                          </p>
                          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.79rem' }}>
                            {sol.centro_salud}{sol.especialidad ? ` · ${sol.especialidad}` : ''}
                          </p>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                          color: estadoCfg.color, background: estadoCfg.bg, border: `1px solid ${estadoCfg.border}`,
                          flexShrink: 0,
                        }}>
                          {estadoCfg.label}
                        </span>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="#9ca3af" strokeWidth="2.5"
                          style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>

                      {/* Detalle expandible */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #f3f4f6', padding: '1.25rem 1.4rem' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {[
                              ['Tipo de documento', sol.tipo_documento],
                              ['Número de documento', sol.numero_documento],
                              ['Centro de salud / IPS', sol.centro_salud],
                              ['Especialidad', sol.especialidad || '—'],
                              ['Teléfono', sol.telefono],
                              ['Correo electrónico', sol.email],
                              ['Fecha de solicitud', sol.created_at ? new Date(sol.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                            ].map(([label, value]) => (
                              <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '0.5rem 0', color: '#6b7280', width: '45%', verticalAlign: 'top' }}>{label}</td>
                                <td style={{ padding: '0.5rem 0', fontWeight: '600', color: '#06111f' }}>{value}</td>
                              </tr>
                            ))}
                          </table>

                          {isPendiente && (
                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn-danger"
                                disabled={procesandoId === sol.id}
                                onClick={() => handleAccionSolicitud(sol.id, 'rechazar')}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Rechazar
                              </button>
                              <button
                                className="btn-success"
                                disabled={procesandoId === sol.id}
                                onClick={() => handleAccionSolicitud(sol.id, 'aceptar')}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                {procesandoId === sol.id ? 'Procesando…' : 'Aceptar y crear cuenta'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── FAB dinámico ── */}
      <button className="fab-admin" onClick={() => setActiveTab('alertas')}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {alertasPendientes.length > 0
          ? `Ver alertas activas (${alertasPendientes.length})`
          : 'Sin alertas activas'}
      </button>

      {/* ── Modal: Calendario de disponibilidad ── */}
      {calendarOpen && medicoSel && (() => {
        const hs = allHorarios[medicoSel.email] || []
        return (
          <div
            className="modal-overlay"
            style={{ alignItems: 'center' }}
            onClick={e => e.target === e.currentTarget && (setCalendarOpen(false), setSlotForm(null), setConflictError(''))}
          >
            <div style={{
              background: 'white', width: '94vw', maxWidth: '980px',
              height: '88vh', maxHeight: '720px',
              borderRadius: '20px', display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
            }}>

              {/* Header STIGA oscuro */}
              <div style={{
                background: 'linear-gradient(135deg, #0f2318 0%, #1a3a2e 100%)',
                padding: '1.35rem 2rem', flexShrink: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ margin: '0 0 0.1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '1.8px', textTransform: 'uppercase' }}>
                    Disponibilidad semanal
                  </p>
                  <h2 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: '700' }}>{medicoSel.nombre}</h2>
                  <p style={{ margin: '0.15rem 0 0', color: 'rgba(255,255,255,0.38)', fontSize: '0.76rem' }}>
                    {hs.length} de 7 días configurados · clic en día vacío para agregar franja
                  </p>
                </div>
                <button
                  onClick={() => { setCalendarOpen(false); setSlotForm(null); setConflictError('') }}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', padding: '0.5rem', color: 'rgba(255,255,255,0.6)', display: 'flex' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Cabecera días */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
                <div style={{ width: '52px', flexShrink: 0 }} />
                {DIAS.map((dia, idx) => {
                  const tiene = hs.some(h => h.dia_semana === idx)
                  return (
                    <div key={dia} style={{ flex: 1, padding: '0.55rem 0.25rem', textAlign: 'center', borderLeft: '1px solid #f0f0f0' }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: tiene ? '#0f2318' : '#9ca3af', letterSpacing: '0.5px' }}>
                        {dia.slice(0,3).toUpperCase()}
                      </p>
                      {tiene && <div style={{ width: '5px', height: '5px', background: '#7ac896', borderRadius: '50%', margin: '0.2rem auto 0' }} />}
                    </div>
                  )
                })}
              </div>

              {/* Cuadrícula */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', height: `${(CAL_END - CAL_START) * HOUR_H}px` }}>

                  {/* Horas */}
                  <div style={{ width: '52px', flexShrink: 0, position: 'relative', background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
                    {Array.from({ length: CAL_END - CAL_START }, (_, i) => (
                      <div key={i} style={{ position: 'absolute', top: i * HOUR_H, width: '100%', height: HOUR_H, display: 'flex', alignItems: 'flex-start', padding: '3px 6px 0' }}>
                        <span style={{ fontSize: '0.63rem', color: '#b0bec5', fontWeight: '600' }}>
                          {String(CAL_START + i).padStart(2,'0')}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Columnas */}
                  {DIAS.map((dia, idx) => {
                    const slot    = hs.find(h => h.dia_semana === idx)
                    const picking = slotForm?.dia === idx && !slotForm?.isEdit
                    return (
                      <div
                        key={dia}
                        style={{ flex: 1, position: 'relative', borderLeft: '1px solid #f0f0f0', cursor: slot ? 'default' : 'pointer', background: picking ? 'rgba(26,58,46,0.04)' : 'transparent' }}
                        onClick={() => { if (slot) return; setConflictError(''); setSlotForm({ dia: idx, hora_inicio: '08:00', hora_fin: '17:00', isEdit: false }) }}
                      >
                        {/* Líneas */}
                        {Array.from({ length: CAL_END - CAL_START }, (_, i) => (
                          <div key={i} style={{ position: 'absolute', top: i * HOUR_H, width: '100%', borderTop: `1px solid ${i === 0 ? '#e5e7eb' : '#f5f5f5'}` }} />
                        ))}

                        {/* Turno asignado */}
                        {slot && (() => {
                          const top = toTop(slot.hora_inicio)
                          const h   = toDur(slot.hora_inicio, slot.hora_fin)
                          return (
                            <div
                              style={{
                                position: 'absolute', top: top + 2, height: h - 4,
                                left: 3, right: 3, zIndex: 2,
                                background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 60%, #2a5a44 100%)',
                                borderRadius: '10px', border: '1px solid rgba(122,200,150,0.25)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '0.4rem', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(15,35,24,0.35)',
                              }}
                              onClick={e => { e.stopPropagation(); setConflictError(''); setSlotForm({ dia: idx, hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin, isEdit: true }) }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(122,200,150,0.7)" strokeWidth="2" style={{ marginBottom: '0.25rem', flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <span style={{ color: '#7ac896', fontSize: '0.67rem', fontWeight: '800' }}>{slot.hora_inicio}</span>
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.58rem', margin: '1px 0' }}>—</span>
                              <span style={{ color: '#7ac896', fontSize: '0.67rem', fontWeight: '800' }}>{slot.hora_fin}</span>
                              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.56rem', marginTop: '0.25rem', letterSpacing: '0.5px' }}>OCUPADO</span>
                            </div>
                          )
                        })()}

                        {/* Icono + en vacíos */}
                        {!slot && !picking && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '1rem' }}>+</div>
                          </div>
                        )}
                        {picking && <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(26,58,46,0.25)', pointerEvents: 'none' }} />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.85rem 1.5rem', background: '#fafafa', flexShrink: 0 }}>
                {conflictError && (
                  <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.5rem 0.9rem', marginBottom: '0.6rem', color: '#b91c1c', fontSize: '0.82rem', fontWeight: '600' }}>
                    ⚠ {conflictError}
                  </div>
                )}
                {slotForm && !slotForm.isEdit ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '7px', height: '7px', background: '#1a3a2e', borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#06111f', minWidth: '82px' }}>{DIAS[slotForm.dia]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Inicio</label>
                      <input type="time" value={slotForm.hora_inicio}
                        onChange={e => { setConflictError(''); setSlotForm(f => ({ ...f, hora_inicio: e.target.value })) }}
                        style={{ border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '0.35rem 0.55rem', fontSize: '0.85rem', color: '#06111f', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Fin</label>
                      <input type="time" value={slotForm.hora_fin}
                        onChange={e => { setConflictError(''); setSlotForm(f => ({ ...f, hora_fin: e.target.value })) }}
                        style={{ border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '0.35rem 0.55rem', fontSize: '0.85rem', color: '#06111f', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                    <button onClick={guardarSlot} disabled={savingSlot} style={{ background: '#1a3a2e', color: 'white', border: 'none', borderRadius: '9px', padding: '0.48rem 1.2rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', opacity: savingSlot ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {savingSlot ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setSlotForm(null); setConflictError('') }} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '9px', padding: '0.48rem 0.9rem', fontSize: '0.85rem', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                  </div>
                ) : slotForm?.isEdit ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#06111f', minWidth: '82px' }}>{DIAS[slotForm.dia]}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: '#15803d', fontWeight: '600' }}>
                      Turno asignado: {slotForm.hora_inicio} – {slotForm.hora_fin}
                    </span>
                    <button onClick={() => eliminarHorario(slotForm.dia)} style={{ background: 'none', border: '1.5px solid #fecaca', borderRadius: '9px', padding: '0.48rem 0.9rem', fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Eliminar franja
                    </button>
                    <button onClick={() => setSlotForm(null)} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '9px', padding: '0.48rem 0.9rem', fontSize: '0.85rem', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div style={{ width: '12px', height: '12px', background: 'linear-gradient(135deg,#0f2318,#1a3a2e)', borderRadius: '3px' }} />
                      <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Turno asignado — clic para eliminar</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div style={{ width: '12px', height: '12px', border: '1.5px dashed #d1d5db', borderRadius: '3px' }} />
                      <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Día libre — clic para asignar turno</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      })()}

      {/* ── Modal: Editar usuario ── */}
      {editUsuario && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditUsuario(null)}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#06111f' }}>Editar usuario</h3>
              <button onClick={() => setEditUsuario(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</p>
              <p style={{ margin: 0, fontWeight: '600', color: '#06111f' }}>{editUsuario.nombre}</p>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo</p>
              <p style={{ margin: 0, color: '#374151' }}>{editUsuario.correo}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rol</label>
              <select
                className="modal-select"
                value={editRol}
                onChange={e => setEditRol(e.target.value)}
              >
                <option value="paciente">Paciente</option>
                <option value="medico">Médico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {editError && <p style={{ color: '#dc2626', fontSize: '0.83rem', marginBottom: '1rem' }}>{editError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-outline-admin" onClick={() => setEditUsuario(null)} disabled={savingEdit}>Cancelar</button>
              <button className="btn-primary-admin" onClick={handleGuardarEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo usuario ── */}
      {showNuevoUsuario && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNuevoUsuario(false)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.15rem', fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                  Administración
                </p>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#06111f' }}>Nuevo usuario</h2>
              </div>
              <button
                onClick={() => setShowNuevoUsuario(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Nombre completo *
                </label>
                <input
                  className="modal-input"
                  placeholder="Ej. Dr. Juan Pérez"
                  value={nuevoForm.nombre}
                  onChange={e => { setNuevoError(''); setNuevoForm(f => ({ ...f, nombre: e.target.value })) }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Rol *
                </label>
                <select
                  className="modal-select"
                  value={nuevoForm.role}
                  onChange={e => setNuevoForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="medico">Médico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Correo electrónico *
                </label>
                <input
                  className="modal-input"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={nuevoForm.email}
                  onChange={e => { setNuevoError(''); setNuevoForm(f => ({ ...f, email: e.target.value })) }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Contraseña temporal *
                </label>
                <input
                  className="modal-input"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevoForm.password}
                  onChange={e => { setNuevoError(''); setNuevoForm(f => ({ ...f, password: e.target.value })) }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Municipio
                </label>
                <input
                  className="modal-input"
                  placeholder="Ej. Buriticá"
                  value={nuevoForm.ciudad}
                  onChange={e => setNuevoForm(f => ({ ...f, ciudad: e.target.value }))}
                />
              </div>
              {nuevoError && (
                <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.82rem', fontWeight: '600', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                  {nuevoError}
                </p>
              )}
            </div>

            <div style={{
              display: 'flex', gap: '0.6rem', marginTop: '1.75rem',
              paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6'
            }}>
              <button
                onClick={() => { setShowNuevoUsuario(false); setNuevoError('') }}
                style={{
                  flex: 1, background: 'none', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', padding: '0.7rem', fontSize: '0.88rem',
                  fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              {(() => {
                const valid = nuevoForm.nombre.trim() && nuevoForm.email.trim() && nuevoForm.password.trim()
                return (
                  <button
                    className="btn-admin"
                    disabled={!valid || savingUsuario}
                    onClick={handleAgregarUsuario}
                    style={{
                      flex: 1, justifyContent: 'center', borderRadius: '10px',
                      padding: '0.7rem', fontSize: '0.88rem',
                      opacity: (!valid || savingUsuario) ? 0.4 : 1,
                      cursor: (!valid || savingUsuario) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingUsuario ? 'Creando…' : 'Crear usuario'}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle triaje ── */}
      {detalleTriaje && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalleTriaje(null)}>
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px', height: '44px', flexShrink: 0,
                  background: detalleTriaje.nivel.bg, borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: '14px', height: '14px', background: detalleTriaje.nivel.dot, borderRadius: '50%', boxShadow: `0 0 8px ${detalleTriaje.nivel.dot}80` }} />
                </div>
                <div>
                  <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: '700', color: '#06111f' }}>
                    {detalleTriaje.paciente}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{
                      background: detalleTriaje.nivel.bg, color: detalleTriaje.nivel.color,
                      fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px'
                    }}>{detalleTriaje.nivel.label}</span>
                    {detalleTriaje.teleconsulta && (
                      <span style={{
                        background: '#eff6ff', color: '#1a5f8a', fontSize: '0.7rem', fontWeight: '700',
                        padding: '0.15rem 0.55rem', borderRadius: '20px', border: '1px solid #bfdbfe'
                      }}>📹 Teleconsulta</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetalleTriaje(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Campos detalle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Fecha', value: detalleTriaje.fecha },
                { label: 'Municipio', value: detalleTriaje.municipio },
                { label: 'Edad', value: `${detalleTriaje.edad} años` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.65rem 0.9rem', background: '#f9fafb',
                  borderRadius: '9px', border: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color: '#06111f', fontWeight: '700' }}>{value}</span>
                </div>
              ))}

              <div style={{ padding: '0.9rem', background: '#f9fafb', borderRadius: '9px', border: '1px solid #f3f4f6' }}>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                  Síntomas reportados
                </p>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#06111f', lineHeight: 1.55 }}>
                  {detalleTriaje.sintomas}
                </p>
              </div>

            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => setDetalleTriaje(null)}
                style={{
                  flex: 1, background: 'none', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', padding: '0.7rem', fontSize: '0.88rem',
                  fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
