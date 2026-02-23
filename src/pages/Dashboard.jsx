import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-3xl font-bold text-light mb-2">
          Willkommen bei Gainly! 💪
        </h1>
        <p className="text-gray-400 mb-6">
          Du bist eingeloggt als:
        </p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-primary font-mono text-sm break-all">
            {user?.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors"
        >
          Ausloggen
        </button>
      </div>
    </div>
  )
}