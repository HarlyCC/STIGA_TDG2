import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('stiga_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {
      localStorage.removeItem('stiga_token')
      localStorage.removeItem('stiga_user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('stiga_token', token)
    localStorage.setItem('stiga_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('stiga_token')
    localStorage.removeItem('stiga_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// Hook para usar en cualquier componente
export function useAuth() {
  return useContext(AuthContext)
}