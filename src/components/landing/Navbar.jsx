import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LANDING } from '../../lib/content'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-light/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center font-black text-white text-sm">
            G
          </div>
          <span className="text-xl font-black tracking-tight text-dark">
            {LANDING.nav.brand}
          </span>
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/app"
              className="bg-red-500 hover:bg-red-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-all"
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-muted hover:text-dark text-sm font-medium transition-colors"
              >
                {LANDING.nav.login}
              </Link>
              <Link
                to="/register"
                className="bg-red-500 hover:bg-red-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-all"
              >
                {LANDING.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}