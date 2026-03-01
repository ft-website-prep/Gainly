import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

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
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-light flex">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-border flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}>
        {/* Logo + Collapse Toggle */}
        <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <NavLink to="/app" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              G
            </div>
            {!collapsed && <span className="font-black text-dark text-lg">Gainly</span>}
          </NavLink>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-7 h-7 rounded-lg bg-surface hover:bg-border flex items-center justify-center text-muted text-xs transition-all ${
              collapsed ? 'absolute -right-3.5 top-6 bg-white border border-border shadow-sm' : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-600 border border-sky-200 font-semibold'
                    : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
                }`
              }
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border space-y-1">
          {/* XP Badge */}
          {profile && (
            <div className={`flex items-center gap-2 px-3 py-2 bg-sky-50 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
              <span className="text-xs">⚡</span>
              {!collapsed && (
                <span className="text-sky-600 text-sm font-bold">
                  {profile.xp_total || 0} XP
                </span>
              )}
            </div>
          )}

          {/* Settings */}
          <NavLink
            to="/app/settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
              }`
            }
          >
            <span className="text-lg">⚙️</span>
            {!collapsed && 'Settings'}
          </NavLink>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-all`}
          >
            <span className="text-lg">🚪</span>
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  )
}