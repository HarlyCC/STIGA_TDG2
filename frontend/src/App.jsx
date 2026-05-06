import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import PageTransition from './components/shared/PageTransition'
import AccessibilityMenu from './components/shared/AccessibilityMenu'
import TermsConditions from './components/shared/TermsConditions'

const TERMS_KEY = 'stiga_terms_accepted'

function TerminosWrapper({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showTerminos, setShowTerminos] = useState(false)

  useEffect(() => {
    if (!user) {
      setShowTerminos(false)
      return
    }
    const accepted = localStorage.getItem(TERMS_KEY)
    if (!accepted) setShowTerminos(true)
  }, [user?.name])

  const handleAceptar = () => {
    localStorage.setItem(TERMS_KEY, 'true')
    setShowTerminos(false)
  }

  const handleRechazar = () => {
    setShowTerminos(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {children}
      {showTerminos && (
        <TermsConditions onAceptar={handleAceptar} onRechazar={handleRechazar} />
      )}
    </>
  )
}

function LoginAccessibility() {
  const { pathname } = useLocation()
  if (pathname !== '/login' && pathname !== '/') return null
  return <AccessibilityMenu />
}

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import PatientDashboard from './pages/patient/Dashboard'
import PatientChat from './pages/patient/Chat'
import PatientResults from './pages/patient/Results'
import PatientTeleconsultation from './pages/patient/Teleconsultation'
import PatientProfile from './pages/patient/Profile'
import DoctorDashboard from './pages/doctor/Dashboard'
import DoctorTeleconsultations from './pages/doctor/Teleconsultations'
import DoctorProfile from './pages/doctor/Profile'
import AdminDashboard from './pages/admin/Dashboard'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/paciente" element={
          <ProtectedRoute role="paciente"><PatientDashboard /></ProtectedRoute>
        } />
        <Route path="/paciente/chat" element={
          <ProtectedRoute role="paciente"><PatientChat /></ProtectedRoute>
        } />
        <Route path="/paciente/resultados" element={
          <ProtectedRoute role="paciente"><PatientResults /></ProtectedRoute>
        } />
        <Route path="/paciente/teleconsulta" element={
          <ProtectedRoute role="paciente"><PatientTeleconsultation /></ProtectedRoute>
        } />
        <Route path="/paciente/perfil" element={
          <ProtectedRoute role="paciente"><PatientProfile /></ProtectedRoute>
        } />
        <Route path="/medico" element={
          <ProtectedRoute role="medico"><DoctorDashboard /></ProtectedRoute>
        } />
        <Route path="/medico/teleconsultas" element={
          <ProtectedRoute role="medico"><DoctorTeleconsultations /></ProtectedRoute>
        } />
        <Route path="/medico/perfil" element={
          <ProtectedRoute role="medico"><DoctorProfile /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </PageTransition>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TerminosWrapper>
          <AnimatedRoutes />
        </TerminosWrapper>
        <LoginAccessibility />
      </BrowserRouter>
    </AuthProvider>
  )
}
