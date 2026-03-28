import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import PageTransition from './components/shared/PageTransition'
import AccessibilityMenu from './components/shared/AccessibilityMenu'

import Login from './pages/Login'
import PacienteDashboard from './pages/paciente/Dashboard'
import PacienteChat from './pages/paciente/Chat'
import PacienteResultados from './pages/paciente/Resultados'
import MedicoDashboard from './pages/medico/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/paciente" element={
          <ProtectedRoute role="paciente"><PacienteDashboard /></ProtectedRoute>
        } />
        <Route path="/paciente/chat" element={
          <ProtectedRoute role="paciente"><PacienteChat /></ProtectedRoute>
        } />
        <Route path="/paciente/resultados" element={
          <ProtectedRoute role="paciente"><PacienteResultados /></ProtectedRoute>
        } />
        <Route path="/medico" element={
          <ProtectedRoute role="medico"><MedicoDashboard /></ProtectedRoute>
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
        <AnimatedRoutes />
        <AccessibilityMenu />
      </BrowserRouter>
    </AuthProvider>
  )
}
