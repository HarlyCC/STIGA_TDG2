import { useState, useEffect } from 'react'

const STORAGE_KEY = 'stiga_meeting'

export function useTeleconsultation() {
  const [meeting, setMeeting] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    // Poll every 2 seconds — ensures sync even within the same tab
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        const parsed = saved ? JSON.parse(saved) : null
        setMeeting(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) return parsed
          return prev
        })
      } catch {
        // ignore parse errors
      }
    }, 2000)

    // Also listen to the storage event (for different tabs)
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

  const createRoom = (pacienteNombre, medicoNombre) => {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) {
      try {
        const parsed = JSON.parse(existing)
        if (parsed?.roomId) return parsed
      } catch { /* continue */ }
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

  const closeRoom = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMeeting(null)
  }

  return { meeting, createRoom, closeRoom }
}
