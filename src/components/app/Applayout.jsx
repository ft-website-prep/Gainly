import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import DailyGoalPopup from '../workouts/DailyGoalPopup'

const NAV_ITEMS = [
  { path: '/app',              label: 'Dashboard',    icon: '🏠', end: true },
  { path: '/app/workouts',     label: 'Workouts',     icon: '💪' },
  { path: '/app/leaderboards', label: 'Leaderboards', icon: '🏆' },
  { path: '/app/community',    label: 'Community',    icon: '👥' },
  { path: '/app/coach',        label: 'Coach',        icon: '🤖' },
  { path: '/app/profile',      label: 'Profile',      icon: '👤' },
]

function getInitials(user, profile) {
  if (profile?.full_name) return profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (user?.email) return user.email[0].toUpperCase()
  return '?'
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('gainly_dark', '1')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('gainly_dark')
  }
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => !!localStorage.getItem('gainly_dark'))
  const profileRef = useRef(null)

  // Apply dark mode on mount and sync from Supabase
  useEffect(() => {
    applyTheme(darkMode)
    if (user) {
      supabase.from('user_settings').select('dark_mode').eq('id', user.id).single()
        .then(({ data }) => {
          const serverDark = !!data?.dark_mode
          setDarkMode(serverDark)
          applyTheme(serverDark)
        })
    }
  }, [user])

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleThemeToggle = async (dark) => {
    setDarkMode(dark)
    applyTheme(dark)
    setProfileOpen(false)
    if (user) {
      await supabase.from('user_settings').update({ dark_mode: dark }).eq('id', user.id)
    }
  }

  const expanded = sidebarHovered

  return (
    <div className="min-h-screen bg-light flex">
      {/* Sidebar — always 72px, expands to 256px on hover (overlay) */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed top-0 left-0 h-full bg-white border-r border-border flex flex-col z-40 transition-all duration-200 overflow-hidden ${
          expanded ? 'w-64 shadow-xl' : 'w-[72px]'
        }`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-2 h-[64px] flex-shrink-0">
          <NavLink to="/app" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              G
            </div>
            <span className={`font-black text-dark text-lg whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
              Gainly
            </span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={!expanded ? item.label : undefined}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-red-600 border border-red-200 font-semibold'
                    : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
                }`
              }
            >
              <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>
              <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border space-y-1">
          {/* XP Badge */}
          {profile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg overflow-hidden">
              <span className="text-xs flex-shrink-0">⚡</span>
              <span className={`text-red-600 text-sm font-bold whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {profile.xp_total || 0} XP
              </span>
            </div>
          )}

          {/* Settings */}
          <NavLink
            to="/app/settings"
            title={!expanded ? 'Settings' : undefined}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
              }`
            }
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">⚙️</span>
            <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              Settings
            </span>
          </NavLink>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={!expanded ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">🚪</span>
            <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content — always offset by 72px (sidebar never pushes) */}
      <main className="flex-1 ml-[72px] min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-[64px] flex items-center justify-end px-8 flex-shrink-0">
          {/* Profile button + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-red-300 transition-all"
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                : getInitials(user, profile)
              }
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-dark truncate">
                    {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-dim truncate">{user?.email}</p>
                </div>

                {/* Profile link */}
                <NavLink
                  to="/app/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-light hover:text-dark transition-colors"
                >
                  <span>👤</span> Profile Settings
                </NavLink>

                {/* Theme */}
                <div className="px-4 py-2 border-t border-border">
                  <p className="text-xs font-semibold text-dim mb-2">Theme</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleThemeToggle(false)}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        !darkMode ? 'text-dark font-semibold' : 'text-muted hover:bg-light'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${!darkMode ? 'bg-dark' : 'bg-border'}`} />
                      Light
                    </button>
                    <button
                      onClick={() => handleThemeToggle(true)}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        darkMode ? 'text-dark font-semibold' : 'text-muted hover:bg-light'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${darkMode ? 'bg-dark' : 'bg-border'}`} />
                      Dark
                    </button>
                  </div>
                </div>

                {/* Sign out */}
                <div className="border-t border-border">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-8 pb-8">
          <Outlet />
        </div>
      </main>

      <DailyGoalPopup />
    </div>
  )
}
