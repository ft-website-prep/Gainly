import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import DailyGoalPopup from '../workouts/DailyGoalPopup'
import { useTheme } from '../../contexts/ThemeContext'
import gainlyLogo from '../../../logo_aligned_app_ready.png'

const MAIN_NAV = [
  { path: '/app',                label: 'Dashboard',    icon: '🏠', end: true },
  { path: '/app/workouts',       label: 'Workouts',     icon: '💪' },
  { path: '/app/leaderboards',   label: 'Leaderboards', icon: '🏆' },
  { path: '/app/community',      label: 'Community',    icon: '👥' },
  { path: '/app/coach',          label: 'AI Coach',     icon: '🤖' },
]

const BOTTOM_NAV = [
  { path: '/app/profile',  label: 'Profile',  icon: '👤' },
  { path: '/app/settings', label: 'Settings', icon: '⚙️' },
]

const LEAGUES = [
  { min: 50000, name: 'Legend', emoji: '👑' },
  { min: 15000, name: 'Beast', emoji: '🔥' },
  { min: 5000, name: 'Athlete', emoji: '💪' },
  { min: 1000, name: 'Grinder', emoji: '⚙️' },
  { min: 0, name: 'Rookie', emoji: '🌱' },
]

function getLeague(xp) {
  for (const l of LEAGUES) if (xp >= l.min) return l
  return LEAGUES[LEAGUES.length - 1]
}

function SidebarLink({ item, collapsed }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `w-full flex items-center justify-center rounded-lg text-xs whitespace-nowrap transition-all duration-300 ${
          collapsed ? 'px-0 py-2' : 'px-2.5 py-2 gap-2.5'
        } ${
          isActive
            ? 'bg-accent-soft text-red-500 font-semibold'
            : 'text-muted hover:bg-surface hover:text-dark'
        }`
      }
    >
      <span className={`text-base flex-shrink-0 ${collapsed ? '' : 'ml-0'}`}>{item.icon}</span>
      <span className={`transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto flex-1'}`}>
        {item.label}
      </span>
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { dark, toggle: toggleTheme } = useTheme()
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

  const league = getLeague(profile?.xp_total || 0)
  const nextLeague = LEAGUES.find((l) => l.min > (profile?.xp_total || 0))
  const currentMin = LEAGUES.find((l) => l.min <= (profile?.xp_total || 0))?.min || 0
  const progress = nextLeague ? ((profile?.xp_total || 0) - currentMin) / (nextLeague.min - currentMin) : 1

  return (
    <div className="min-h-screen bg-light flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-surface border-r border-border flex flex-col z-40 overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[64px]' : 'w-52'
        }`}
      >

        {/* Logo */}
        <div className="px-3 pt-4 pb-3 flex justify-center whitespace-nowrap">
          <NavLink to="/app" className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-2 w-full`}>
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
              <img
                src={gainlyLogo}
                alt="Gainly"
                className="w-6 h-6 object-contain flex-shrink-0 dark:invert"
              />
            </div>
            <span className={`font-black text-dark text-base tracking-tight transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              Gainly
            </span>
          </NavLink>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-border" />

        {/* Main nav */}
        <nav className="flex-1 px-2.5 pt-3 space-y-0.5 overflow-hidden">
          <div className={`px-2.5 mb-1.5 text-[9px] font-bold text-dim uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            Menu
          </div>
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-2.5 pb-2.5 space-y-0.5 overflow-hidden">
          {/* XP card */}
          {profile && (
            <div className="mb-1.5 rounded-lg overflow-hidden">
              {collapsed ? (
                <div className="flex justify-center py-2" title={`${(profile.xp_total || 0).toLocaleString()} XP — ${league.name}`}>
                  <div className="w-9 h-9 rounded-lg bg-accent-soft border border-red-500/20 flex items-center justify-center">
                    <span className="text-lg">{league.emoji}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-accent-soft border border-red-500/20 rounded-lg p-2.5 whitespace-nowrap">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs flex-shrink-0">{league.emoji}</span>
                      <span className="text-[11px] font-bold text-dark">{league.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-red-600">
                      {(profile.xp_total || 0).toLocaleString()} XP
                    </span>
                  </div>
                  {nextLeague && (
                    <>
                      <div className="h-1 bg-red-500/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-dim mt-1">
                        {(nextLeague.min - (profile.xp_total || 0)).toLocaleString()} XP to {nextLeague.name}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile & Settings links */}
          {BOTTOM_NAV.map((item) => (
            <SidebarLink key={item.path} item={item} collapsed={collapsed} />
          ))}

          {/* Divider */}
          <div className="mx-1 border-t border-border !mt-1.5 !mb-1.5" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={collapsed ? (dark ? 'Light mode' : 'Dark mode') : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted hover:text-dark transition-all whitespace-nowrap`}
          >
            <div className="relative w-4 h-4 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <span className={`absolute transition-all duration-300 text-base ${dark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}>☀️</span>
              <span className={`absolute transition-all duration-300 text-base ${dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}`}>🌙</span>
            </div>
            <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              {dark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted hover:bg-accent-soft hover:text-red-500 transition-all whitespace-nowrap`}
          >
            <span className="text-base flex-shrink-0">🚪</span>
            <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Collapse toggle — outside aside so overflow-hidden doesn't clip it */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`fixed top-6 z-50 w-5 h-5 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-muted hover:text-dark hover:border-red-500/30 transition-all duration-300 ease-in-out ${
          collapsed ? 'left-[55px]' : 'left-[199px]'
        }`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
          <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Main Content */}
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${collapsed ? 'ml-[64px]' : 'ml-52'}`}>
        <Outlet />
      </main>

      {/* Daily Goal Popup (shows once per session on login) */}
      <DailyGoalPopup />
    </div>
  )
}
