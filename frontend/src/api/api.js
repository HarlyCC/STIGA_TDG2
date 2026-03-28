import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Agrega el token JWT a cada petición automáticamente
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('stiga_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Triaje / Chat ─────────────────────────────────────────
export const startChat = (sessionId) =>
  client.post(`/chat/start/${sessionId}`)

export const sendMessage = (sessionId, message) =>
  client.post('/chat/message', { session_id: sessionId, message })

export const getTriageResult = (sessionId) =>
  client.get(`/triage/result/${sessionId}`)

export const syncForward = (sessionId, patientData, triageResult) =>
  client.post('/sync/forward', {
    session_id: sessionId,
    patient_data: patientData,
    triage_result: triageResult
  })

export const closeSession = (sessionId) =>
  client.delete(`/chat/session/${sessionId}`)

// ── Auth (preparado para cuando implementemos login) ──────
export const login = (email, password) =>
  client.post('/auth/login', { email, password })

export const register = (userData) =>
  client.post('/auth/register', userData)

export default client