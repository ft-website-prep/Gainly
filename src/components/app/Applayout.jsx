import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// Sidebar Navigation Items
// Hier werden neue Seiten einfach hinzugefügt
// =============================================
const NAV_ITEMS = [
  { path: '/app',           label: 'Dashboard',  icon: '🏠', end: true },
  { path: '/app/workouts',  label: 'Workouts',   icon: '💪' },
  { path: '/app/community', label: 'Community',  icon: '👥' },
  { path: '/app/progress',  label: 'Progress',   icon: '📈' },
  { path: '/app/coach',     label: 'AI Coach',   icon: '🤖' },
  { path: '/app/profile',   label: 'Profile',    icon: '👤' },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  // Profil laden für Sidebar-Anzeige
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, xp_total')
        .eq('id', user.id)
        .single()

      setProfile(data)
    }

    if (user) loadProfile()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-light flex">

      {/* ========== SIDEBAR ========== */}
      <aside className="w-64 bg-white border-r border-border flex flex-col fixed h-full">

        {/* Logo */}
        <div className="p-6 border-b border-border">
          <NavLink to="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center font-black text-white text-sm">
              G
            </div>
            <span className="text-lg font-black tracking-tight text-dark">
              Gainly
            </span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-600 border border-sky-200'
                    : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border">
          {/* XP Badge */}
          {profile && (
            <div className="flex items-center gap-2 px-4 py-2 mb-3 bg-sky-50 rounded-lg">
              <span className="text-xs">⚡</span>
              <span className="text-sky-600 text-sm font-bold">
                {profile.xp_total || 0} XP
              </span>
            </div>
          )}

          {/* Settings */}
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
              }`
            }
          >
            <span className="text-lg">⚙️</span>
            Settings
          </NavLink>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full mt-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <span className="text-lg">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  )
}