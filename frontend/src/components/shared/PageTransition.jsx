import { useEffect, useState } from 'react'

export default function PageTransition({ children }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    setPhase('enter')
    const t = setTimeout(() => setPhase('visible'), 20)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      opacity: phase === 'visible' ? 1 : 0,
      transform: phase === 'visible' ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      minHeight: '100vh'
    }}>
      {children}
    </div>
  )
}