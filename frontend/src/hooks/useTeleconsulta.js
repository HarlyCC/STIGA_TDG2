import { useState, useEffect } from 'react'

const STORAGE_KEY = 'stiga_meeting'

export function useTeleconsulta() {
  const [meeting, setMeeting] = useState(() => {
    // Leer el estado inicial directamente desde localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    // Polling cada 2 segundos — garantiza sincronización incluso en la misma pestaña
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        const parsed = saved ? JSON.parse(saved) : null
        setMeeting(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) return parsed
          return prev
        })
      } catch {
        // ignorar errores de parseo
      }
    }, 2000)

    // También escuchar el evento storage (para pestañas distintas)
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          setMeeting(e.newValue ? JSON.parse(e.newValue) : null)
        } catch {
          setMeeting(null)
        }
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const crearSala = (pacienteNombre, medicoNombre) => {
    // Validar que no exista una sala activa antes de crear una nueva
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) {
      try {
        const parsed = JSON.parse(existing)
        if (parsed?.roomId) return parsed
      } catch { /* continuar */ }
    }
    const roomId = `stiga-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const data = {
      roomId,
      pacienteNombre,
      medicoNombre,
      createdAt: new Date().toISOString(),
      link: `https://meet.jit.si/${roomId}`
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setMeeting(data)
    return data
  }

  const cerrarSala = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMeeting(null)
  }

  return { meeting, crearSala, cerrarSala }
}