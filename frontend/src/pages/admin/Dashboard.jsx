import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AccessibilityMenu from '../../components/shared/AccessibilityMenu'
import client from '../../api/api'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [activeTab, setActiveTab] = useState('metricas')
  const [tipCollapsed, setTipCollapsed] = useState(false)

  /* ── Data como estado ── */
  const [alertas, setAlertas] = useState([
    { id: 1, tipo: 'crítico',    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca',
      titulo: 'Triaje sin atender — Nivel Rojo',
      desc: 'Juan Pérez (Buriticá) lleva 2 horas sin respuesta médica.', hora: 'Hace 2 horas' },
    { id: 2, tipo: 'advertencia', color: '#b45309', bg: '#fffbeb', border: '#fde68a',
      titulo: 'Latencia elevada en el modelo IA',
      desc: 'El tiempo de respuesta de Gemma supera los 8 segundos.', hora: 'Hace 35 min' },
    { id: 3, tipo: 'info',        color: '#1a5f8a', bg: '#eff6ff', border: '#bfdbfe',
      titulo: 'Nuevo médico registrado',
      desc: 'Dr. Camilo Restrepo fue añadido al sistema — pendiente de aprobación.', hora: 'Hace 1 hora' },
  ])

  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Juan Pérez',          rol: 'Paciente', municipio: 'Buriticá',     correo: 'juan.perez@example.com',      estado: 'activo',    triajes: 3 },
    { id: 2, nombre: 'Dra. María López',    rol: 'Médico',   municipio: 'Sta. Fe Ant.', correo: 'maria.lopez@example.com',     estado: 'activo',    triajes: 0 },
    { id: 3, nombre: 'Rosa Cardona',        rol: 'Paciente', municipio: 'Liborina',     correo: 'rosa.cardona@example.com',    estado: 'activo',    triajes: 5 },
    { id: 4, nombre: 'Dr. Camilo Restrepo', rol: 'Médico',   municipio: 'Olaya',        correo: 'camilo.restrepo@example.com', estado: 'pendiente', triajes: 0 },
    { id: 5, nombre: 'Carlos Múnera',       rol: 'Paciente', municipio: 'Sabanalarga',  correo: 'carlos.munera@example.com',   estado: 'activo',    triajes: 1 },
    { id: 6, nombre: 'Amparo Gil',          rol: 'Paciente', municipio: 'Olaya',        correo: 'amparo.gil@example.com',      estado: 'inactivo',  triajes: 2 },
  ])

  const [triajes, setTriajes] = useState([
    { id: 1, paciente: 'Juan Pérez',    municipio: 'Buriticá',    fecha: 'Hoy 08:14',
      nivel: { label: 'Rojo',     color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' },
      medico: 'Sin asignar',      teleconsulta: true,  edad: 58,
      sintomas: 'Dolor en el pecho, dificultad para respirar, sudoración fría.',
      motivo: 'Consulta urgente por dolor torácico de 3 horas de evolución sin mejora.' },
    { id: 2, paciente: 'Rosa Cardona',  municipio: 'Liborina',    fecha: 'Hoy 09:30',
      nivel: { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', dot: '#f97316' },
      medico: 'Dra. María López', teleconsulta: true,  edad: 42,
      sintomas: 'Dolor abdominal severo en cuadrante inferior derecho, náuseas, vómito.',
      motivo: 'Dolor abdominal de inicio súbito hace 5 horas.' },
    { id: 3, paciente: 'Carlos Múnera', municipio: 'Sabanalarga', fecha: 'Hoy 11:05',
      nivel: { label: 'Amarillo', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
      medico: 'Dra. María López', teleconsulta: false, edad: 29,
      sintomas: 'Fiebre 38 °C, dolor de cabeza, malestar general, fatiga.',
      motivo: 'Síndrome gripal de 2 días de evolución.' },
    { id: 4, paciente: 'Amparo Gil',    municipio: 'Olaya',       fecha: 'Ayer 14:22',
      nivel: { label: 'Verde',    color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
      medico: 'Dra. María López', teleconsulta: false, edad: 67,
      sintomas: 'Tos leve, congestión nasal, malestar general.',
      motivo: 'Control de resfriado común, sin complicaciones.' },
    { id: 5, paciente: 'Luis Ríos',     municipio: 'Buriticá',    fecha: 'Ayer 16:47',
      nivel: { label: 'Naranja',  color: '#c2410c', bg: '#fff7ed', dot: '#f97316' },
      medico: 'Sin asignar',      teleconsulta: true,  edad: 45,
      sintomas: 'Mareo intenso, náuseas persistentes, visión borrosa.',
      motivo: 'Episodio vertiginoso con náuseas que no ceden en 4 horas.' },
  ])

  /* ── Modales ── */
  const [showNuevoUsuario, setShowNuevoUsuario] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre: '', rol: 'Paciente', municipio: '', correo: '' })
  const [detalleTriaje, setDetalleTriaje] = useState(null)

  /* ── Filtros ── */
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [busquedaTriajes, setBusquedaTriajes] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('todos')

  /* ── Horarios ── */
  const DIAS         = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const CAL_START    = 6
  const CAL_END      = 22
  const HOUR_H       = 56
  const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h * 60 + m }
  const toTop = (t) => ((toMin(t) - CAL_START * 60) / 60) * HOUR_H
  const toDur = (s, e) => Math.max(((toMin(e) - toMin(s)) / 60) * HOUR_H, HOUR_H * 0.5)

  const [medicos, setMedicos]                 = useState([])
  const [medicoSel, setMedicoSel]             = useState(null)
  const [horarios, setHorarios]               = useState([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [calendarOpen, setCalendarOpen]       = useState(false)
  const [slotForm, setSlotForm]               = useState(null)
  const [savingSlot, setSavingSlot]           = useState(false)

  /* ── Mapa ── */
  const [hoveredPoint, setHoveredPoint] = useState(null)

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
    const h = new Date().getHours()
    if (h < 12) setGreeting('Buenos días')
    else if (h < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')
    const t = setTimeout(() => setTipCollapsed(true), 3500)
    return () => clearTimeout(t)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  /* ── Stats dinámicos ── */
  const stats = [
    { label: 'Triajes hoy',      value: triajes.length,                                                      color: '#374151' },
    { label: 'Usuarios activos', value: usuarios.filter(u => u.estado === 'activo').length,                   color: '#1a5f8a' },
    { label: 'Médicos en línea', value: usuarios.filter(u => u.rol === 'Médico' && u.estado === 'activo').length, color: '#15803d' },
    { label: 'Alertas activas',  value: alertas.length,                                                       color: '#b91c1c' },
  ]

  /* ── Nav unificado ── */
  const navItems = [
    { key: 'metricas', label: 'Métricas',          icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { key: 'alertas',  label: 'Alertas',            icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
    { key: 'usuarios', label: 'Usuarios',           icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { key: 'triajes',  label: 'Historial triajes',  icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
    { key: 'mapa',     label: 'Mapa de pacientes',  icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0z' },
    { key: 'horarios', label: 'Horarios médicos',   icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  ]

  /* ── Handlers alertas ── */
  const handleAtenderAlerta = (id) => setAlertas(prev => prev.filter(a => a.id !== id))
  const handleIgnorarAlerta  = (id) => setAlertas(prev => prev.filter(a => a.id !== id))

  /* ── Handlers usuarios ── */
  const handleAccionEstado = (id) => {
    setUsuarios(prev => prev.map(u => {
      if (u.id !== id) return u
      const next = u.estado === 'activo' ? 'inactivo' : 'activo'
      return { ...u, estado: next }
    }))
  }
  const handleAgregarUsuario = () => {
    if (!nuevoForm.nombre.trim() || !nuevoForm.municipio.trim()) return
    setUsuarios(prev => [...prev, {
      id: Date.now(),
      nombre:    nuevoForm.nombre.trim(),
      rol:       nuevoForm.rol,
      municipio: nuevoForm.municipio.trim(),
      correo:    nuevoForm.correo.trim(),
      estado:    'pendiente',
      triajes:   0,
    }])
    setNuevoForm({ nombre: '', rol: 'Paciente', municipio: '', correo: '' })
    setShowNuevoUsuario(false)
  }

  /* ── Horarios: cargar médicos cuando se activa la pestaña ── */
  useEffect(() => {
    if (activeTab !== 'horarios') return
    client.get('/admin/usuarios?role=medico')
      .then(({ data }) => setMedicos(data))
      .catch(() => {})
  }, [activeTab])

  const seleccionarMedico = (m) => {
    setMedicoSel(m)
    setHorarios([])
    setSlotForm(null)
    setLoadingHorarios(true)
    client.get(`/admin/medicos/${encodeURIComponent(m.email)}/horarios`)
      .then(({ data }) => setHorarios(data))
      .catch(() => {})
      .finally(() => setLoadingHorarios(false))
    setCalendarOpen(true)
  }

  const guardarSlot = async () => {
    if (!medicoSel || !slotForm) return
    setSavingSlot(true)
    try {
      await client.put(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios`, {
        dia_semana:  slotForm.dia,
        hora_inicio: slotForm.hora_inicio,
        hora_fin:    slotForm.hora_fin,
      })
      const { data } = await client.get(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios`)
      setHorarios(data)
      setSlotForm(null)
    } catch {}
    finally { setSavingSlot(false) }
  }

  const eliminarHorario = async (dia) => {
    if (!medicoSel) return
    try {
      await client.delete(`/admin/medicos/${encodeURIComponent(medicoSel.email)}/horarios/${dia}`)
      setHorarios(prev => prev.filter(h => h.dia_semana !== dia))
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
  const mapaPoints = [
    { id: 1, nombre: 'Buriticá',     x: 38, y: 42, nivel: '#ef4444', nivelLabel: 'Rojo',     teleconsulta: true,  count: 2 },
    { id: 2, nombre: 'Liborina',     x: 32, y: 38, nivel: '#f97316', nivelLabel: 'Naranja',   teleconsulta: true,  count: 1 },
    { id: 3, nombre: 'Sabanalarga',  x: 48, y: 34, nivel: '#f59e0b', nivelLabel: 'Amarillo',  teleconsulta: false, count: 1 },
    { id: 4, nombre: 'Olaya',        x: 36, y: 50, nivel: '#22c55e', nivelLabel: 'Verde',     teleconsulta: false, count: 2 },
    { id: 5, nombre: 'Sta. Fe Ant.', x: 42, y: 57, nivel: '#f97316', nivelLabel: 'Naranja',   teleconsulta: true,  count: 1 },
  ]

  const getTooltipPos = (p) => {
    const tx = Math.max(2, Math.min(p.x - 15, 65))
    const ty = p.y > 28 ? p.y - 20 : p.y + 7
    return { tx, ty, above: p.y > 28 }
  }

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

        .tip-hero {
          overflow: hidden;
          transition: max-height 1s cubic-bezier(0.4,0,0.2,1),
                      opacity 0.8s ease, margin-bottom 0.8s ease, padding 0.8s ease;
        }
        .tip-hero.expanded { max-height: 200px; opacity: 1; margin-bottom: 2rem; }
        .tip-hero.collapsed {
          max-height: 0; opacity: 0; margin-bottom: 0;
          padding-top: 0 !important; padding-bottom: 0 !important;
        }
        .tip-small { transition: all 0.7s cubic-bezier(0.4,0,0.2,1); overflow: hidden; }
        .tip-small.hidden  { max-height: 0; opacity: 0; margin-bottom: 0; }
        .tip-small.visible { max-height: 80px; opacity: 1; margin-bottom: 1.5rem; }

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
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
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
              {item.key === 'alertas' && alertas.length > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: '20px', height: '20px',
                  background: '#b91c1c', color: 'white', fontSize: '0.68rem', fontWeight: '700',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
                }}>{alertas.length}</span>
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

        {/* Tip hero */}
        <div
          className={`tip-hero ${tipCollapsed ? 'collapsed' : 'expanded'}`}
          style={{
            background: 'linear-gradient(135deg, #111827, #1f2937)',
            borderRadius: '20px', padding: '1.8rem 2.2rem',
            animation: mounted ? 'fadeInUp 0.6s ease 0.05s both' : 'none'
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.73rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Resumen del sistema
          </p>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'white', lineHeight: 1.6 }}>
            {alertas.length > 0
              ? `Hay ${alertas.length} alerta${alertas.length > 1 ? 's' : ''} activa${alertas.length > 1 ? 's' : ''} hoy. ${alertas.find(a => a.tipo === 'crítico')?.desc ?? ''}`
              : 'Todo está en orden. No hay alertas activas en este momento.'}
          </p>
        </div>

        {/* Tip pequeño */}
        <div className={`tip-small ${tipCollapsed ? 'visible' : 'hidden'}`}>
          <div style={{
            background: 'white', border: '1px solid #e5e7eb',
            borderLeft: `3px solid ${alertas.length > 0 ? '#b91c1c' : '#374151'}`,
            borderRadius: '12px', padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ margin: 0, color: '#06111f', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#374151' }}>Estado: </strong>
              {alertas.length > 0
                ? `${alertas.length} alerta${alertas.length > 1 ? 's' : ''} activa${alertas.length > 1 ? 's' : ''}.`
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
              {t.label}{t.key === 'alertas' && alertas.length > 0 ? ` (${alertas.length})` : ''}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                    Triajes por día — últimos 7 días
                  </p>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.82rem' }}>
                    Total: 142 triajes esta semana
                  </p>
                </div>
                <span style={{
                  background: '#f0fdf4', color: '#15803d', fontSize: '0.78rem', fontWeight: '700',
                  padding: '0.3rem 0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0'
                }}>↑ 18% vs semana anterior</span>
              </div>
              {[
                { dia: 'Lun', valor: 16, max: 30 },
                { dia: 'Mar', valor: 22, max: 30 },
                { dia: 'Mié', valor: 18, max: 30 },
                { dia: 'Jue', valor: 28, max: 30 },
                { dia: 'Vie', valor: 24, max: 30 },
                { dia: 'Sáb', valor: 10, max: 30 },
                { dia: 'Hoy', valor: 24, max: 30 },
              ].map((b, i) => (
                <div key={b.dia} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 6 ? '0.75rem' : 0 }}>
                  <span style={{ minWidth: '30px', fontSize: '0.78rem', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>{b.dia}</span>
                  <div style={{ flex: 1, height: '28px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(b.valor / b.max) * 100}%`,
                      background: b.dia === 'Hoy' ? 'linear-gradient(90deg, #1f2937, #374151)' : 'linear-gradient(90deg, #9ca3af, #d1d5db)',
                      borderRadius: '6px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                      display: 'flex', alignItems: 'center', paddingLeft: '0.6rem'
                    }}>
                      <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '700' }}>{b.valor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.25rem', fontWeight: '700', color: '#06111f', fontSize: '0.97rem' }}>
                Distribución por nivel de urgencia — hoy
              </p>
              {[
                { label: 'Rojo',     count: 3,  total: 24, color: '#ef4444' },
                { label: 'Naranja',  count: 6,  total: 24, color: '#f97316' },
                { label: 'Amarillo', count: 9,  total: 24, color: '#f59e0b' },
                { label: 'Verde',    count: 6,  total: 24, color: '#22c55e' },
              ].map(n => (
                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: '10px', height: '10px', background: n.color, borderRadius: '50%', flexShrink: 0, boxShadow: `0 0 6px ${n.color}60` }} />
                  <span style={{ minWidth: '65px', fontSize: '0.83rem', fontWeight: '600', color: '#374151' }}>{n.label}</span>
                  <div style={{ flex: 1, height: '22px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(n.count / n.total) * 100}%`, background: n.color, borderRadius: '6px', opacity: 0.75 }} />
                  </div>
                  <span style={{ minWidth: '36px', fontSize: '0.83rem', fontWeight: '700', color: '#374151', textAlign: 'right' }}>{n.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Alertas ── */}
        {activeTab === 'alertas' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} activa{alertas.length !== 1 ? 's' : ''}
            </p>
            {alertas.length === 0 && (
              <div style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px',
                padding: '3rem', textAlign: 'center'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '0.75rem' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>Sin alertas activas. El sistema opera con normalidad.</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {alertas.map((a, i) => (
                <div key={a.id} className="alerta-card" style={{
                  border: `1px solid ${a.border}`, borderLeft: `3px solid ${a.color}`,
                  animation: `slideIn 0.4s ease ${i * 0.08}s both`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      background: a.bg, borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...(a.tipo === 'crítico' ? { animation: 'pulse 2s ease-in-out infinite' } : {})
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5">
                        {a.tipo === 'crítico'
                          ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                          : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '1rem' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#06111f', fontSize: '0.92rem' }}>{a.titulo}</p>
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem', flexShrink: 0 }}>{a.hora}</span>
                      </div>
                      <p style={{ margin: '0 0 0.85rem', color: '#374151', fontSize: '0.84rem', lineHeight: 1.5 }}>{a.desc}</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-admin" onClick={() => handleAtenderAlerta(a.id)}>Atender</button>
                        <button className="btn-outline-admin" onClick={() => handleIgnorarAlerta(a.id)}>Ignorar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}
              {(busquedaUsuarios || filtroRol !== 'todos') ? ' encontrados' : ' registrados'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {usuariosFiltrados.length === 0 ? (
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
                    <button className="btn-outline-admin">Editar</button>
                    {u.estado === 'pendiente' ? (
                      <button className="btn-success" onClick={() => handleAccionEstado(u.id)}>Aprobar</button>
                    ) : u.estado === 'activo' ? (
                      <button className="btn-danger" onClick={() => handleAccionEstado(u.id)}>Desactivar</button>
                    ) : (
                      <button className="btn-outline-admin" onClick={() => handleAccionEstado(u.id)}>Activar</button>
                    )}
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
              {triajesFiltrados.length} triaje{triajesFiltrados.length !== 1 ? 's' : ''}
              {(busquedaTriajes || filtroNivel !== 'todos') ? ' encontrados' : ' recientes'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {triajesFiltrados.length === 0 ? (
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
                      {t.municipio} · {t.fecha} · {t.medico}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn-outline-admin" onClick={() => setDetalleTriaje(t)}>Ver detalle</button>
                    {t.medico === 'Sin asignar' && (
                      <button className="btn-admin">Asignar médico</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB Horarios ── */}
        {activeTab === 'horarios' && (
          <div style={{ animation: 'tabSlide 0.35s ease' }}>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.73rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {medicos.length} médico{medicos.length !== 1 ? 's' : ''} registrado{medicos.length !== 1 ? 's' : ''} — selecciona uno para gestionar su calendario
            </p>
            {medicos.length === 0 ? (
              <div style={{ background: 'white', border: '1.5px dashed #e5e7eb', borderRadius: '16px', padding: '4rem', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#9ca3af' }}>No hay médicos registrados en el sistema.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.85rem' }}>
                {medicos.map((m, i) => (
                  <div
                    key={m.email}
                    onClick={() => seleccionarMedico(m)}
                    style={{
                      background: 'white', border: '1.5px solid #e5e7eb',
                      borderRadius: '16px', padding: '1.25rem',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      animation: `slideIn 0.4s ease ${i * 0.07}s both`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#1a3a2e'; e.currentTarget.style.boxShadow='0 6px 20px rgba(26,58,46,0.12)'; e.currentTarget.style.transform='translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e5e7eb'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '42px', height: '42px',
                        background: 'linear-gradient(135deg, #0f2318, #1a3a2e)',
                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.88rem', fontWeight: '800', color: '#7ac896', flexShrink: 0,
                      }}>
                        {m.nombre.split(' ').filter(n => !['Dr.','Dra.'].includes(n)).map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#06111f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nombre}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ciudad || 'Sin ciudad'}</p>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px',
                      padding: '0.55rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Ver disponibilidad
                    </div>
                  </div>
                ))}
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
                  Occidente Antioqueño · {mapaPoints.length} municipios con actividad
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[{ color: '#ef4444', label: 'Triaje' }, { color: '#1a5f8a', label: 'Teleconsulta' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '10px', height: '10px', background: l.color, borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '500' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
              <svg
                viewBox="0 0 100 100"
                style={{ width: '100%', height: '420px', display: 'block' }}
                preserveAspectRatio="xMidYMid meet"
              >
                <rect width="100" height="100" fill="#f8fafc"/>
                <path
                  d="M20 25 L45 18 L65 22 L72 35 L68 55 L58 68 L42 72 L28 65 L18 50 Z"
                  fill="#e8f4fb" stroke="#b8d8ee" strokeWidth="0.5"
                />
                <path d="M25 40 Q35 45 50 42 Q60 40 70 48" fill="none" stroke="#90c4e0" strokeWidth="0.8" opacity="0.6"/>
                <path d="M30 55 Q40 58 48 65" fill="none" stroke="#90c4e0" strokeWidth="0.6" opacity="0.5"/>
                {[20,30,40,50,60,70,80].map(v => (
                  <g key={v}>
                    <line x1={v} y1="10" x2={v} y2="90" stroke="#f0f4f8" strokeWidth="0.3"/>
                    <line x1="10" y1={v} x2="90" y2={v} stroke="#f0f4f8" strokeWidth="0.3"/>
                  </g>
                ))}

                {/* Puntos interactivos */}
                {mapaPoints.map(p => (
                  <g
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle cx={p.x} cy={p.y} r="6"
                      fill={p.teleconsulta ? 'rgba(26,95,138,0.08)' : 'rgba(239,68,68,0.08)'}
                      stroke="transparent"
                    />
                    <circle cx={p.x} cy={p.y} r="4.5"
                      fill={p.teleconsulta ? 'rgba(26,95,138,0.15)' : 'rgba(239,68,68,0.12)'}
                      stroke={p.teleconsulta ? '#1a5f8a' : p.nivel}
                      strokeWidth={hoveredPoint?.id === p.id ? 0.8 : 0.4}
                    />
                    <circle cx={p.x} cy={p.y} r={hoveredPoint?.id === p.id ? 3 : 2.5}
                      fill={p.teleconsulta ? '#1a5f8a' : p.nivel}
                      style={{ transition: 'r 0.15s ease' }}
                    />
                    {p.count > 1 && (
                      <text x={p.x + 3.5} y={p.y - 3} fontSize="3" fontWeight="700" fill="#374151">{p.count}</text>
                    )}
                    <text x={p.x} y={p.y + 7} fontSize="2.8" textAnchor="middle" fill="#374151" fontWeight="500">
                      {p.nombre}
                    </text>
                  </g>
                ))}

                {/* Tooltip SVG */}
                {hoveredPoint && (() => {
                  const { tx, ty, above } = getTooltipPos(hoveredPoint)
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={tx} y={ty} width="30" height="14" rx="2" fill="#1f2937" opacity="0.96"/>
                      <text x={tx + 15} y={ty + 5.5} fontSize="2.9" fontWeight="700" fill="white" textAnchor="middle">
                        {hoveredPoint.nombre}
                      </text>
                      <text x={tx + 15} y={ty + 10.5} fontSize="2.4" fill="#9ca3af" textAnchor="middle">
                        {hoveredPoint.count} caso{hoveredPoint.count > 1 ? 's' : ''} · {hoveredPoint.nivelLabel}
                      </text>
                      <path
                        d={above
                          ? `M${hoveredPoint.x - 2},${ty + 14} L${hoveredPoint.x},${ty + 17} L${hoveredPoint.x + 2},${ty + 14}`
                          : `M${hoveredPoint.x - 2},${ty} L${hoveredPoint.x},${ty - 3} L${hoveredPoint.x + 2},${ty}`}
                        fill="#1f2937" opacity="0.96"
                      />
                    </g>
                  )
                })()}

                {/* Brújula */}
                <g transform="translate(85, 15)">
                  <circle cx="0" cy="0" r="5" fill="white" stroke="#e5e7eb" strokeWidth="0.4"/>
                  <text x="0" y="-2" fontSize="3.5" textAnchor="middle" fill="#374151" fontWeight="700">N</text>
                  <line x1="0" y1="-4" x2="0" y2="0" stroke="#374151" strokeWidth="0.5"/>
                  <line x1="0" y1="0" x2="0" y2="4" stroke="#9ca3af" strokeWidth="0.5"/>
                </g>
              </svg>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {mapaPoints.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', background: p.teleconsulta ? '#1a5f8a' : p.nivel, borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>{p.nombre}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {p.count} {p.count === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FAB dinámico ── */}
      <button className="fab-admin" onClick={() => setActiveTab('alertas')}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {alertas.length > 0
          ? `Ver alertas activas (${alertas.length})`
          : 'Sin alertas activas'}
      </button>

      {/* ── Modal: Calendario de disponibilidad ── */}
      {calendarOpen && medicoSel && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'center' }}
          onClick={e => e.target === e.currentTarget && (setCalendarOpen(false), setSlotForm(null))}
        >
          <div style={{
            background: 'white',
            width: '94vw', maxWidth: '980px',
            height: '88vh', maxHeight: '720px',
            borderRadius: '20px', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
          }}>

            {/* Header oscuro STIGA */}
            <div style={{
              background: 'linear-gradient(135deg, #0f2318 0%, #1a3a2e 100%)',
              padding: '1.4rem 2rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div>
                <p style={{ margin: '0 0 0.1rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '1.8px', textTransform: 'uppercase' }}>
                  Disponibilidad semanal
                </p>
                <h2 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: '700' }}>{medicoSel.nombre}</h2>
                <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                  {horarios.length} de 7 días configurados · Haz clic en un día vacío para agregar franja
                </p>
              </div>
              <button
                onClick={() => { setCalendarOpen(false); setSlotForm(null) }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', padding: '0.5rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Cabecera de días */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
              <div style={{ width: '52px', flexShrink: 0 }} />
              {DIAS.map((dia, idx) => {
                const hasSlot = horarios.some(h => h.dia_semana === idx)
                return (
                  <div key={dia} style={{ flex: 1, padding: '0.6rem 0.25rem', textAlign: 'center', borderLeft: '1px solid #f0f0f0' }}>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '800', color: hasSlot ? '#0f2318' : '#9ca3af', letterSpacing: '0.5px' }}>
                      {dia.slice(0, 3).toUpperCase()}
                    </p>
                    {hasSlot && (
                      <div style={{ width: '5px', height: '5px', background: '#7ac896', borderRadius: '50%', margin: '0.25rem auto 0', boxShadow: '0 0 4px #7ac89660' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Cuerpo del calendario */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {loadingHorarios ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Cargando horarios...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', height: `${(CAL_END - CAL_START) * HOUR_H}px`, minHeight: '100%' }}>

                  {/* Etiquetas de hora */}
                  <div style={{ width: '52px', flexShrink: 0, position: 'relative', background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
                    {Array.from({ length: CAL_END - CAL_START }, (_, i) => (
                      <div key={i} style={{ position: 'absolute', top: i * HOUR_H, width: '100%', height: HOUR_H, display: 'flex', alignItems: 'flex-start', padding: '3px 6px 0' }}>
                        <span style={{ fontSize: '0.65rem', color: '#b0bec5', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                          {String(CAL_START + i).padStart(2,'0')}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Columnas por día */}
                  {DIAS.map((dia, idx) => {
                    const slot    = horarios.find(h => h.dia_semana === idx)
                    const picking = slotForm?.dia === idx && !slotForm?.isEdit

                    return (
                      <div
                        key={dia}
                        style={{ flex: 1, position: 'relative', borderLeft: '1px solid #f0f0f0', cursor: slot ? 'default' : 'pointer', background: picking ? 'rgba(26,58,46,0.03)' : 'transparent' }}
                        onClick={() => { if (slot) return; setSlotForm({ dia: idx, hora_inicio: '08:00', hora_fin: '17:00', isEdit: false }) }}
                      >
                        {/* Líneas de hora */}
                        {Array.from({ length: CAL_END - CAL_START }, (_, i) => (
                          <div key={i} style={{ position: 'absolute', top: i * HOUR_H, width: '100%', borderTop: `1px solid ${i === 0 ? '#e5e7eb' : '#f5f5f5'}` }} />
                        ))}

                        {/* Bloque ocupado */}
                        {slot && (() => {
                          const top = toTop(slot.hora_inicio)
                          const h   = toDur(slot.hora_inicio, slot.hora_fin)
                          return (
                            <div
                              style={{
                                position: 'absolute',
                                top: top + 2, height: h - 4,
                                left: 3, right: 3,
                                background: 'linear-gradient(175deg, #0f2318 0%, #1a3a2e 60%, #2a5a44 100%)',
                                borderRadius: '10px',
                                border: '1px solid rgba(122,200,150,0.25)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                zIndex: 2, padding: '0.4rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(15,35,24,0.35)',
                              }}
                              onClick={e => { e.stopPropagation(); setSlotForm({ dia: idx, hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin, isEdit: true }) }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(122,200,150,0.7)" strokeWidth="2" style={{ marginBottom: '0.3rem', flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <span style={{ color: '#7ac896', fontSize: '0.68rem', fontWeight: '800', lineHeight: 1.2 }}>{slot.hora_inicio}</span>
                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', margin: '1px 0' }}>—</span>
                              <span style={{ color: '#7ac896', fontSize: '0.68rem', fontWeight: '800', lineHeight: 1.2 }}>{slot.hora_fin}</span>
                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.58rem', marginTop: '0.3rem', letterSpacing: '0.5px' }}>OCUPADO</span>
                            </div>
                          )
                        })()}

                        {/* Día vacío — icono + */}
                        {!slot && !picking && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px dashed #1a3a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a3a2e', fontSize: '1.1rem', fontWeight: '300' }}>+</div>
                          </div>
                        )}
                        {!slot && !picking && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '1.1rem' }}>+</div>
                          </div>
                        )}

                        {/* Indicador de selección activa */}
                        {picking && (
                          <div style={{ position: 'absolute', inset: 0, border: '2px dashed #1a3a2e', borderRadius: '0', opacity: 0.3, pointerEvents: 'none' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer: formulario de franja o leyenda */}
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '0.9rem 1.5rem', background: '#fafafa', flexShrink: 0 }}>
              {slotForm && !slotForm.isEdit ? (
                /* ── Formulario agregar ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', background: '#1a3a2e', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#06111f', minWidth: '85px' }}>{DIAS[slotForm.dia]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Inicio</label>
                    <input type="time" value={slotForm.hora_inicio}
                      onChange={e => setSlotForm(f => ({ ...f, hora_inicio: e.target.value }))}
                      style={{ border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '0.38rem 0.6rem', fontSize: '0.85rem', color: '#06111f', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Fin</label>
                    <input type="time" value={slotForm.hora_fin}
                      onChange={e => setSlotForm(f => ({ ...f, hora_fin: e.target.value }))}
                      style={{ border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '0.38rem 0.6rem', fontSize: '0.85rem', color: '#06111f', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                  <button onClick={guardarSlot} disabled={savingSlot} style={{ background: '#1a3a2e', color: 'white', border: 'none', borderRadius: '9px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', opacity: savingSlot ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {savingSlot ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setSlotForm(null)} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '9px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                </div>
              ) : slotForm?.isEdit ? (
                /* ── Info de slot ocupado + eliminar ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#06111f', minWidth: '85px' }}>{DIAS[slotForm.dia]}</span>
                  </div>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: '#15803d', fontWeight: '600' }}>
                    Horario bloqueado: {slotForm.hora_inicio} – {slotForm.hora_fin}
                  </span>
                  <button onClick={() => eliminarHorario(slotForm.dia)} style={{ background: 'none', border: '1.5px solid #fecaca', borderRadius: '9px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Eliminar franja
                  </button>
                  <button onClick={() => setSlotForm(null)} style={{ background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '9px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                /* ── Leyenda ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '14px', height: '14px', background: 'linear-gradient(135deg,#0f2318,#1a3a2e)', borderRadius: '4px' }} />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Franja bloqueada — clic para ver opciones</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '14px', height: '14px', border: '1.5px dashed #cbd5e1', borderRadius: '4px' }} />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Día libre — clic para asignar franja</span>
                  </div>
                </div>
              )}
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
                  onChange={e => setNuevoForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Rol *
                </label>
                <select
                  className="modal-select"
                  value={nuevoForm.rol}
                  onChange={e => setNuevoForm(f => ({ ...f, rol: e.target.value }))}
                >
                  <option value="Paciente">Paciente</option>
                  <option value="Médico">Médico</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Municipio *
                </label>
                <input
                  className="modal-input"
                  placeholder="Ej. Buriticá"
                  value={nuevoForm.municipio}
                  onChange={e => setNuevoForm(f => ({ ...f, municipio: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.35rem' }}>
                  Correo electrónico
                </label>
                <input
                  className="modal-input"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={nuevoForm.correo}
                  onChange={e => setNuevoForm(f => ({ ...f, correo: e.target.value }))}
                />
              </div>
            </div>

            <div style={{
              display: 'flex', gap: '0.6rem', marginTop: '1.75rem',
              paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6'
            }}>
              <button
                onClick={() => setShowNuevoUsuario(false)}
                style={{
                  flex: 1, background: 'none', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', padding: '0.7rem', fontSize: '0.88rem',
                  fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-admin"
                disabled={!nuevoForm.nombre.trim() || !nuevoForm.municipio.trim()}
                onClick={handleAgregarUsuario}
                style={{
                  flex: 1, justifyContent: 'center', borderRadius: '10px',
                  padding: '0.7rem', fontSize: '0.88rem',
                  opacity: (!nuevoForm.nombre.trim() || !nuevoForm.municipio.trim()) ? 0.4 : 1,
                  cursor: (!nuevoForm.nombre.trim() || !nuevoForm.municipio.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                Crear usuario
              </button>
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
                { label: 'Médico asignado', value: detalleTriaje.medico },
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

              <div style={{ padding: '0.9rem', background: '#f9fafb', borderRadius: '9px', border: '1px solid #f3f4f6' }}>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                  Motivo de consulta
                </p>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#06111f', lineHeight: 1.55 }}>
                  {detalleTriaje.motivo}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.6rem' }}>
              {detalleTriaje.medico === 'Sin asignar' && (
                <button className="btn-admin" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', padding: '0.7rem', fontSize: '0.88rem' }}>
                  Asignar médico
                </button>
              )}
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
