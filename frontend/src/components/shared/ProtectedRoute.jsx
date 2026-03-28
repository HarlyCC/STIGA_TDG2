import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (role && user.role !== role) {
    const redirects = {
      paciente: '/paciente',
      medico: '/medico',
      admin: '/admin'
    }
    return <Navigate to={redirects[user.role] || '/login'} replace />
  }

  return children
}