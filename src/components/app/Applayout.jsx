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

const THEMES = [
  { id: 'dark',         label: 'Dark' },
  { id: 'light',        label: 'Light' },
  { id: 'classic-dark', label: 'Classic Dark' },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/ month',
    current: true,
    cta: 'Current plan',
    features: [
      'Workout tracking & logging',
      'Basic XP & leaderboards',
      '3 custom workouts',
      'Community access',
      'AI Coach (10 messages/day)',
      '1 GB file storage',
    ],
    note: 'Free forever',
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/ month',
    highlight: true,
    cta: 'Upgrade to Pro',
    features: [
      'Everything in Free',
      'Unlimited custom workouts',
      'Unlimited AI Coach',
      'Progress photos & timeline',
      'Advanced analytics',
      'Data export (JSON & CSV)',
      '10 GB file storage',
      'Priority support',
    ],
    note: 'Coming soon',
  },
  {
    name: 'Team',
    price: '$24.99',
    period: '/ month',
    cta: 'Upgrade to Team',
    features: [
      'Everything in Pro',
      'Team challenges',
      'Group leaderboards',
      'Coach dashboard',
      'Shared workout library',
      'Advanced team analytics',
      'SSO support',
      '24/7 priority support',
    ],
    note: 'Coming soon',
  },
]

// ─── Upgrade Modal ────────────────────────────────────────────
function UpgradeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-black text-dark">Upgrade Gainly</h2>
            <p className="text-sm text-muted mt-0.5">Unlock the full potential of your training</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-light hover:text-dark transition-colors text-lg">✕</button>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-3 gap-0 divide-x divide-border">
          {PLANS.map(plan => (
            <div key={plan.name} className={`p-6 flex flex-col ${plan.highlight ? 'bg-light' : ''}`}>
              <div className="mb-4">
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-black text-dark">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                {plan.current && (
                  <span className="text-xs text-dim border border-border rounded-full px-2 py-0.5">Current plan</span>
                )}
              </div>

              <button
                disabled={plan.current}
                className={`w-full py-2.5 rounded-xl text-sm font-bold mb-5 transition-all ${
                  plan.highlight
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : plan.current
                      ? 'bg-surface border border-border text-muted cursor-default'
                      : 'border border-border text-dark hover:bg-light'
                }`}
              >
                {plan.cta}
              </button>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted">
                    <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.note && (
                <p className="text-xs text-dim mt-4 pt-4 border-t border-border">{plan.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Search Overlay ───────────────────────────────────────────
function SearchOverlay({ onClose }) {
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-muted text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search workouts, exercises, settings…"
            className="flex-1 bg-transparent text-dark text-sm focus:outline-none placeholder:text-dim"
          />
          <kbd className="text-[10px] text-dim border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-dim">Start typing to search…</p>
        </div>
      </div>
    </div>
  )
}

// ─── Feedback Popover ─────────────────────────────────────────
const HELP_LINKS = [
  { icon: '📖', label: 'Docs',            href: '#', desc: 'Browse the Gainly documentation' },
  { icon: '🔧', label: 'Troubleshooting', href: '#', desc: 'Common issues and fixes' },
  { icon: '💬', label: 'Ask on Discord',  href: '#', desc: 'Get help from the community' },
  { icon: '📊', label: 'Gainly Status',   href: '#', desc: 'Check service uptime' },
  { icon: '✉️', label: 'Contact Support', href: '#', desc: 'Send us a message' },
]

function FeedbackPopover({ initialView = 'choose', onClose }) {
  const [view, setView]           = useState(initialView)
  const [text, setText]           = useState('')
  const [screenshot, setScreenshot] = useState(null) // { dataUrl, name }
  const [imgMenuOpen, setImgMenuOpen] = useState(false)
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)
  const imgMenuRef   = useRef(null)

  useEffect(() => {
    if ((view === 'issue' || view === 'idea') && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [view])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close img menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (imgMenuRef.current && !imgMenuRef.current.contains(e.target)) setImgMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setScreenshot({ dataUrl: ev.target.result, name: file.name })
    reader.readAsDataURL(file)
    setImgMenuOpen(false)
    e.target.value = ''
  }

  const handleCapture = async () => {
    setImgMenuOpen(false)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      stream.getTracks().forEach(t => t.stop())
      setScreenshot({ dataUrl: canvas.toDataURL('image/png'), name: 'screenshot.png' })
    } catch {
      // user cancelled or permission denied — silently ignore
    }
  }

  const handleSend = () => {
    setText('')
    setScreenshot(null)
    setView('sent')
    setTimeout(onClose, 1800)
  }

  const typeLabel = view === 'issue' ? 'Issue' : 'Idea'
  const typePlaceholder = view === 'issue'
    ? 'Describe the issue you encountered…'
    : 'My idea for improving Gainly is…'

  return (
    <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">

      {/* ── Choose type ── */}
      {view === 'choose' && (
        <div className="p-5">
          <h2 className="text-base font-black text-dark mb-4">What would you like to share?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView('issue')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-accent bg-light hover:bg-surface transition-all"
            >
              <span className="text-3xl">⚠️</span>
              <div className="text-center">
                <div className="font-bold text-dark text-sm">Issue</div>
                <div className="text-xs text-muted mt-0.5">with the app</div>
              </div>
            </button>
            <button
              onClick={() => setView('idea')}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-accent bg-light hover:bg-surface transition-all"
            >
              <span className="text-3xl">💡</span>
              <div className="text-center">
                <div className="font-bold text-dark text-sm">Idea</div>
                <div className="text-xs text-muted mt-0.5">to improve Gainly</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Write feedback ── */}
      {(view === 'issue' || view === 'idea') && (
        <>
          <div className="p-4 pb-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={typePlaceholder}
              rows={5}
              className="w-full bg-light border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-accent resize-none placeholder:text-dim leading-relaxed"
            />

            {/* Screenshot preview */}
            {screenshot && (
              <div className="mt-2 relative group w-fit">
                <img
                  src={screenshot.dataUrl}
                  alt="screenshot"
                  className="h-16 rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => setScreenshot(null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-dark text-surface text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 pb-4">
            <button
              onClick={() => setView('help')}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-dark hover:bg-light transition-colors"
            >
              Get help instead
            </button>
            <div className="flex items-center gap-2">
              {/* Screenshot button + dropdown */}
              <div className="relative" ref={imgMenuRef}>
                <button
                  title="Attach screenshot"
                  onClick={() => setImgMenuOpen(v => !v)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors text-sm ${
                    screenshot
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-muted hover:text-dark hover:bg-light'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>

                {imgMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-10">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark hover:bg-light transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Upload screenshot
                    </button>
                    <button
                      onClick={handleCapture}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark hover:bg-light transition-colors border-t border-border"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                      Capture screenshot
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send {typeLabel}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Help ── */}
      {view === 'help' && (
        <div className="p-4">
          <div className="mb-3">
            <h2 className="text-sm font-black text-dark">Need help with Gainly?</h2>
            <p className="text-xs text-muted mt-0.5">Start with our docs or community.</p>
          </div>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border mb-3">
            {HELP_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-dark hover:bg-light transition-colors"
              >
                <span className="text-sm w-5 text-center flex-shrink-0">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </a>
            ))}
          </div>
          <button
            onClick={() => setView('choose')}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-dark hover:bg-light transition-colors"
          >
            Leave feedback instead
          </button>
        </div>
      )}

      {/* ── Sent confirmation ── */}
      {view === 'sent' && (
        <div className="p-8 flex flex-col items-center text-center gap-3">
          <span className="text-4xl">🙏</span>
          <p className="font-black text-dark text-lg">Thanks for the feedback!</p>
          <p className="text-sm text-muted">We'll use it to make Gainly better.</p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(user, profile) {
  if (profile?.full_name) return profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (user?.email) return user.email[0].toUpperCase()
  return '?'
}

function applyTheme(theme) {
  const html = document.documentElement
  html.classList.remove('dark', 'classic-dark')
  if (theme === 'dark') html.classList.add('dark')
  else if (theme === 'classic-dark') html.classList.add('classic-dark')
  localStorage.setItem('gainly_theme', theme)
  if (theme !== 'light') localStorage.setItem('gainly_dark', '1')
  else localStorage.removeItem('gainly_dark')
}

function getStoredTheme() {
  return localStorage.getItem('gainly_theme') || 'light'
}

// ─── Main Layout ──────────────────────────────────────────────
export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile]           = useState(null)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [profileOpen, setProfileOpen]   = useState(false)
  const [theme, setTheme]               = useState(getStoredTheme)
  const [showSearch, setShowSearch]     = useState(false)
  const [feedbackView, setFeedbackView] = useState(null) // null | 'choose' | 'help'
  const profileRef  = useRef(null)
  const feedbackRef = useRef(null)

  // Apply theme on mount + sync from Supabase
  useEffect(() => {
    applyTheme(theme)
    if (user) {
      supabase.from('user_settings').select('dark_mode').eq('id', user.id).single()
        .then(({ data }) => {
          if (!localStorage.getItem('gainly_theme')) {
            const t = data?.dark_mode ? 'dark' : 'light'
            setTheme(t); applyTheme(t)
          }
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
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (feedbackRef.current && !feedbackRef.current.contains(e.target)) setFeedbackView(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const handleThemeSelect = async (t) => {
    setTheme(t); applyTheme(t); setProfileOpen(false)
    if (user) await supabase.from('user_settings').update({ dark_mode: t !== 'light' }).eq('id', user.id)
  }

  const expanded = sidebarHovered

  return (
    <div className="min-h-screen bg-light flex">

      {/* ── Sidebar ── */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed top-0 left-0 h-full bg-white border-r border-border flex flex-col z-40 transition-all duration-200 overflow-hidden ${
          expanded ? 'w-64 shadow-xl' : 'w-[72px]'
        }`}
      >
        <div className="p-4 flex items-center gap-2 h-[64px] flex-shrink-0">
          <NavLink to="/app" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">G</div>
            <span className={`font-black text-dark text-lg whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Gainly</span>
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} to={item.path} end={item.end} title={!expanded ? item.label : undefined}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-surface border border-border text-dark font-semibold'
                    : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
                }`
              }
            >
              <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>
              <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {profile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg overflow-hidden border border-border">
              <span className="text-xs flex-shrink-0">⚡</span>
              <span className={`text-dark text-sm font-bold whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {profile.xp_total || 0} XP
              </span>
            </div>
          )}
          <NavLink to="/app/settings" title={!expanded ? 'Settings' : undefined}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive ? 'bg-surface border border-border text-dark font-semibold' : 'text-muted hover:bg-surface hover:text-dark border border-transparent'
              }`
            }
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">⚙️</span>
            <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Settings</span>
          </NavLink>
          <button onClick={handleSignOut} title={!expanded ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">🚪</span>
            <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 ml-[72px] min-h-screen flex flex-col">

        {/* Top bar */}
        <header className="h-[64px] flex items-center justify-end gap-2 px-6 flex-shrink-0 border-b border-border">

          {/* Feedback + Help (shared popover anchor) */}
          <div className="relative flex items-center gap-2" ref={feedbackRef}>
            <button
              onClick={() => setFeedbackView(v => v === 'choose' || v === 'issue' || v === 'idea' || v === 'sent' ? null : 'choose')}
              className="text-sm text-muted hover:text-dark transition-colors px-2 py-1 rounded-lg hover:bg-surface"
            >
              Feedback
            </button>

            {/* Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-dark hover:border-muted transition-all text-sm"
            >
              <span className="text-base leading-none">🔍</span>
              <span className="text-sm hidden sm:inline">Search…</span>
              <kbd className="hidden sm:inline text-[10px] border border-border rounded px-1 py-0.5 leading-none">⌘K</kbd>
            </button>

            <button
              title="Help"
              onClick={() => setFeedbackView(v => v === 'help' ? null : 'help')}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-dark hover:border-muted transition-all text-sm font-bold"
            >
              ?
            </button>

            {feedbackView && (
              <FeedbackPopover key={feedbackView} initialView={feedbackView} onClose={() => setFeedbackView(null)} />
            )}
          </div>

          {/* Tips */}
          <button
            title="Tips & tricks"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-dark hover:border-muted transition-all text-base"
          >
            💡
          </button>

          {/* Upgrade to Pro */}
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors"
          >
            Upgrade to Pro
          </button>

          {/* Profile */}
          <div className="relative ml-1" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-red-300 transition-all overflow-hidden"
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-9 h-9 object-cover" />
                : getInitials(user, profile)
              }
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-60 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-dark truncate">
                    {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-dim truncate">{user?.email}</p>
                </div>
                <NavLink to="/app/profile" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-light hover:text-dark transition-colors">
                  <span>👤</span> Profile Settings
                </NavLink>
                <div className="px-4 pt-2 pb-3 border-t border-border">
                  <p className="text-xs font-semibold text-dim mb-1.5">Theme</p>
                  <div className="space-y-0.5">
                    {THEMES.map(({ id, label }) => (
                      <button key={id} onClick={() => handleThemeSelect(id)}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                          theme === id ? 'text-dark font-semibold' : 'text-muted hover:bg-light'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 border ${
                          theme === id ? 'bg-dark border-dark' : 'bg-transparent border-border'
                        }`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border">
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-red-50 hover:text-red-500 transition-colors">
                    <span>🚪</span> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-8 pb-8 pt-8">
          <Outlet />
        </div>
      </main>

      {/* ── Modals ── */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}

      <DailyGoalPopup />
    </div>
  )
}
