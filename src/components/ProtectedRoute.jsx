import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Solange wir prüfen ob User eingeloggt ist: Ladescreen zeigen
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-light text-lg">Laden...</div>
      </div>
    )
  }

  // Nicht eingeloggt? → Weiterleitung zum Login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Eingeloggt? → Seite normal anzeigen
  return children
}
//Wie funktioniert das? Wir wrappen damit geschützte Seiten. Wenn jemand z.B. /dashboard 
// aufruft ohne eingeloggt zu sein, wird er automatisch zu /login geschickt.