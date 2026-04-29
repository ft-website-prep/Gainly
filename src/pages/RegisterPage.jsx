import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import gainlyLogo from '../../logo_aligned_app_ready.png'
import './LoginPage.css'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { signUp, signInWithGoogle } = useAuth()

  useEffect(() => {
    const blockZoom = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }
    window.addEventListener('wheel', blockZoom, { passive: false })
    return () => window.removeEventListener('wheel', blockZoom)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
    }
  }

  if (success) {
    return (
      <div className="login-page min-h-screen flex items-center justify-center p-4">
        <div className="login-noise" aria-hidden="true" />
        <div className="login-grid" aria-hidden="true" />
        <div className="login-glow" aria-hidden="true" />
        <div className="login-orb" aria-hidden="true" />

        <div className="w-full max-w-md relative z-10">
          <div className="login-card-wrap">
            <div className="login-card text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-white mb-2">Check deine Mails!</h2>
              <p className="text-gray-400 mb-6 text-sm">
                Wir haben dir eine Bestätigungs-Email geschickt.
                Klick auf den Link darin, um deinen Account zu aktivieren.
              </p>
              <Link
                to="/login"
                className="login-register-link text-red-400 font-medium"
              >
                Zurück zum Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center p-4">
      <div className="login-noise" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />
      <div className="login-glow" aria-hidden="true" />
      <div className="login-orb" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Title */}
        <div className="text-center mb-6">
          <Link to="/" className="login-brand-link inline-flex items-center justify-center gap-3 mb-6">
            <div className="login-logo-badge">
              <img src={gainlyLogo} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="login-brand-text text-3xl font-black tracking-tight text-white">Gainly</span>
          </Link>
          <p className="text-gray-400 text-sm">Account erstellen</p>
        </div>

        {/* Card with rotating border */}
        <div className="login-card-wrap">
          <div className="login-card">
            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                {error}
              </div>
            )}

            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              className="login-google-btn w-full flex items-center justify-center gap-3 font-medium py-3 px-4 rounded-xl transition-all mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Mit Google registrieren
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-gray-600 text-xs uppercase tracking-widest font-medium">oder</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  className="login-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  required
                  className="login-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  className="login-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn w-full font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Account erstellen...' : 'Account erstellen'}
              </button>
            </form>

            {/* Login link */}
            <p className="text-gray-400 text-sm text-center mt-6">
              Schon einen Account?{' '}
              <Link to="/login" className="login-register-link text-red-400 font-medium">
                Anmelden
              </Link>
            </p>
          </div>
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
            &larr; Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
