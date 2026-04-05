import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// ─── Nav structure ────────────────────────────────────────────
const NAV = [
  {
    group: 'CONFIGURATION',
    items: [
      { id: 'general',       label: 'General' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'privacy',       label: 'Privacy' },
      { id: 'workout',       label: 'Workout' },
    ],
  },
  {
    group: 'DATA',
    items: [
      { id: 'export', label: 'Reports & Export' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { id: 'account', label: 'Account & Security' },
    ],
  },
]

// ─── Shared sub-components ────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0 ${
        checked ? 'bg-red-500 shadow-red-200 shadow-md' : 'bg-gray-200'
      }`}
    >
      <div
        className="bg-white rounded-full shadow-md absolute top-[3px] transition-all duration-200"
        style={{ width: 22, height: 22, left: checked ? 23 : 3 }}
      />
    </button>
  )
}

function Row({ icon, label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-dark">{label}</div>
          {description && <div className="text-xs text-dim mt-0.5">{description}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div className="bg-white border border-border rounded-2xl px-6 divide-y divide-border">
      {children}
    </div>
  )
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-black text-dark">{title}</h2>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings]         = useState(null)
  const [profile, setProfile]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [message, setMessage]           = useState('')
  const [activeSection, setActiveSection] = useState('general')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [showEmailForm, setShowEmailForm]       = useState(false)
  const [newEmail, setNewEmail]                 = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    let { data: s } = await supabase.from('user_settings').select('*').eq('id', user.id).single()
    if (!s) { const { data: ns } = await supabase.from('user_settings').insert({ id: user.id }).select().single(); s = ns }
    setSettings(s)
    const { data: p } = await supabase.from('profiles').select('is_public, show_workout_history, show_achievements').eq('id', user.id).single()
    setProfile(p)
    setLoading(false)
  }

  const save = async (u) => {
    setSettings(prev => ({ ...prev, ...u }))
    await supabase.from('user_settings').update(u).eq('id', user.id)
    if ('dark_mode' in u) {
      document.documentElement.classList.toggle('dark', !!u.dark_mode)
      u.dark_mode ? localStorage.setItem('gainly_dark', '1') : localStorage.removeItem('gainly_dark')
    }
  }

  const savePrivacy = async (u) => {
    setProfile(prev => ({ ...prev, ...u }))
    await supabase.from('profiles').update(u).eq('id', user.id)
  }

  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 4000) }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { showMsg('Error: Min 6 characters'); return }
    if (newPassword !== confirmPassword) { showMsg('Error: Passwords don\'t match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    error ? showMsg('Error: ' + error.message) : (showMsg('Password updated!'), setShowPasswordForm(false), setNewPassword(''), setConfirmPassword(''))
    setSaving(false)
  }

  const handleChangeEmail = async () => {
    if (!newEmail?.includes('@')) { showMsg('Error: Valid email required'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    error ? showMsg('Error: ' + error.message) : (showMsg('Confirmation email sent!'), setShowEmailForm(false), setNewEmail(''))
    setSaving(false)
  }

  const handleExportJSON = async () => {
    setSaving(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: logs } = await supabase.from('workout_logs').select('*').eq('user_id', user.id)
    const { data: xp }   = await supabase.from('xp_transactions').select('*').eq('user_id', user.id)
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile: prof, settings, workout_logs: logs || [], xp_transactions: xp || [] }, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `gainly-export-${new Date().toISOString().split('T')[0]}.json`)
    showMsg('JSON exported!'); setSaving(false)
  }

  const handleExportCSV = async () => {
    setSaving(true)
    const { data: logs } = await supabase.from('workout_logs').select('id, started_at, completed_at, total_duration, xp_earned, notes').eq('user_id', user.id).order('started_at', { ascending: false })
    if (!logs?.length) { showMsg('No workout data to export'); setSaving(false); return }
    const headers = ['Date', 'Duration (min)', 'XP Earned', 'Notes']
    const rows = logs.map(l => [
      l.started_at ? new Date(l.started_at).toLocaleDateString() : '',
      l.total_duration ? Math.round(l.total_duration / 60) : '',
      l.xp_earned || 0,
      (l.notes || '').replace(/"/g, '""'),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `gainly-workouts-${new Date().toISOString().split('T')[0]}.csv`)
    showMsg('CSV exported!'); setSaving(false)
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    showMsg('Account deletion requested. Contact support.')
    setShowDeleteConfirm(false); setDeleteConfirmText('')
  }

  const inputCls = 'w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400'
  const selectCls = 'bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-red-400 cursor-pointer'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading…</div></div>

  return (
    <div className="flex gap-8" style={{ minHeight: 'calc(100vh - 160px)' }}>

      {/* ── Left Settings Sidebar ── */}
      <div className="w-52 flex-shrink-0">
        <div className="sticky top-0 pt-1">
          <h1 className="text-xl font-black text-dark mb-6 px-3">Settings</h1>
          {NAV.map(group => (
            <div key={group.group} className="mb-5">
              <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-1 px-3">
                {group.group}
              </p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    activeSection === item.id
                      ? 'bg-surface border border-border text-dark font-semibold'
                      : 'text-muted hover:text-dark hover:bg-surface'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          <div className="mt-8 px-3">
            <p className="text-xs text-dim">Gainly v0.1.0</p>
          </div>
        </div>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 max-w-2xl pb-16">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
          }`}>{message}</div>
        )}

        {/* ── GENERAL ── */}
        {activeSection === 'general' && (
          <div>
            <SectionHeading title="General" description="App preferences and personalization" />
            <SectionCard>
              {/* Coach name */}
              <div className="py-4">
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">🤖</div>
                  <div>
                    <div className="text-sm font-semibold text-dark">AI Coach Name</div>
                    <div className="text-xs text-dim mt-0.5">Give your personal AI coach a name</div>
                  </div>
                </div>
                <div className="ml-[52px]">
                  <input
                    type="text"
                    defaultValue={localStorage.getItem('gainly_coach_name') || ''}
                    placeholder="Gainly Coach"
                    maxLength={30}
                    onBlur={e => {
                      const val = e.target.value.trim()
                      val ? localStorage.setItem('gainly_coach_name', val) : localStorage.removeItem('gainly_coach_name')
                    }}
                    className={`${selectCls} w-full max-w-xs`}
                  />
                </div>
              </div>

              <Row icon="🌐" label="Language" description="Preferred language">
                <select value={settings?.language || 'en'} onChange={e => save({ language: e.target.value })} className={selectCls}>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </Row>

              <Row icon="🌙" label="Theme" description="Light, Dark, or Classic Dark">
                <select
                  value={localStorage.getItem('gainly_theme') || 'light'}
                  onChange={e => {
                    const t = e.target.value
                    localStorage.setItem('gainly_theme', t)
                    const html = document.documentElement
                    html.classList.remove('dark', 'classic-dark')
                    if (t === 'dark') html.classList.add('dark')
                    else if (t === 'classic-dark') html.classList.add('classic-dark')
                    save({ dark_mode: t !== 'light' })
                  }}
                  className={selectCls}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="classic-dark">Classic Dark</option>
                </select>
              </Row>

              <Row icon="📏" label="Units" description="Weight and distance">
                <select value={settings?.units || 'metric'} onChange={e => save({ units: e.target.value })} className={selectCls}>
                  <option value="metric">Metric (kg, km)</option>
                  <option value="imperial">Imperial (lbs, mi)</option>
                </select>
              </Row>

              <Row icon="📐" label="Compact Mode" description="Less spacing, smaller elements">
                <Toggle checked={settings?.compact_mode ?? false} onChange={val => save({ compact_mode: val })} />
              </Row>
              <Row icon="🔊" label="Sound Effects" description="Sounds for achievements">
                <Toggle checked={settings?.sound_effects ?? true} onChange={val => save({ sound_effects: val })} />
              </Row>
              <Row icon="⏱️" label="Timer Sounds" description="Countdown during workouts">
                <Toggle checked={settings?.timer_sounds ?? true} onChange={val => save({ timer_sounds: val })} />
              </Row>
              <Row icon="🎊" label="Confetti Effects" description="Celebrate achievements">
                <Toggle checked={settings?.confetti_effects ?? true} onChange={val => save({ confetti_effects: val })} />
              </Row>
            </SectionCard>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeSection === 'notifications' && (
          <div>
            <SectionHeading title="Notifications" description="Choose what you want to be notified about" />
            <SectionCard>
              <Row icon="📱" label="Push Notifications" description="Receive push notifications">
                <Toggle checked={settings?.push_notifications ?? true} onChange={val => save({ push_notifications: val })} />
              </Row>

              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg">⏰</div>
                    <div>
                      <div className="text-sm font-semibold text-dark">Workout Reminder</div>
                      <div className="text-xs text-dim">Daily reminder to get moving</div>
                    </div>
                  </div>
                  <Toggle checked={settings?.notify_workout_reminder ?? true} onChange={val => save({ notify_workout_reminder: val })} />
                </div>
                {settings?.notify_workout_reminder && (
                  <div className="mt-3 ml-[52px] flex items-center gap-3">
                    <span className="text-xs text-muted">Remind me at</span>
                    <input type="time" value={settings?.workout_reminder_time || '09:00'}
                      onChange={e => save({ workout_reminder_time: e.target.value })}
                      className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer" />
                    <span className="text-xs text-muted">every day</span>
                  </div>
                )}
              </div>

              <Row icon="🔥" label="Streak Warning" description="Alert when your streak is at risk">
                <Toggle checked={settings?.notify_streak_warning ?? true} onChange={val => save({ notify_streak_warning: val })} />
              </Row>
              <Row icon="🤝" label="Friend Requests" description="Notify on new friend requests">
                <Toggle checked={settings?.notify_friend_requests ?? true} onChange={val => save({ notify_friend_requests: val })} />
              </Row>
              <Row icon="❤️" label="Likes & Comments" description="Notify on likes or comments">
                <Toggle checked={settings?.notify_likes_comments ?? true} onChange={val => save({ notify_likes_comments: val })} />
              </Row>
              <Row icon="⚔️" label="Challenge Invites" description="Notify when invited to a challenge">
                <Toggle checked={settings?.notify_challenges ?? true} onChange={val => save({ notify_challenges: val })} />
              </Row>
            </SectionCard>
          </div>
        )}

        {/* ── PRIVACY ── */}
        {activeSection === 'privacy' && (
          <div>
            <SectionHeading title="Privacy" description="Control what others can see about you" />
            <SectionCard>
              <Row icon="👁️" label="Public Profile" description="Others can find and view your profile">
                <Toggle checked={profile?.is_public ?? true} onChange={val => savePrivacy({ is_public: val })} />
              </Row>
              <Row icon="📋" label="Show Workout History" description="Workouts visible on your profile">
                <Toggle checked={profile?.show_workout_history ?? true} onChange={val => savePrivacy({ show_workout_history: val })} />
              </Row>
              <Row icon="🏆" label="Show Achievements" description="Achievements visible on your profile">
                <Toggle checked={profile?.show_achievements ?? true} onChange={val => savePrivacy({ show_achievements: val })} />
              </Row>
            </SectionCard>
          </div>
        )}

        {/* ── WORKOUT ── */}
        {activeSection === 'workout' && (
          <div>
            <SectionHeading title="Workout" description="Training session preferences" />
            <SectionCard>
              <Row icon="⏸️" label="Auto-Pause" description="Pause timer when app goes to background">
                <Toggle checked={settings?.workout_auto_pause ?? true} onChange={val => save({ workout_auto_pause: val })} />
              </Row>
              <Row icon="🕐" label="Default Rest Timer" description="Rest duration between sets">
                <select value={settings?.rest_timer_duration || 60} onChange={e => save({ rest_timer_duration: parseInt(e.target.value) })} className={selectCls}>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                </select>
              </Row>
            </SectionCard>
          </div>
        )}

        {/* ── REPORTS & EXPORT ── */}
        {activeSection === 'export' && (
          <div>
            <SectionHeading title="Reports & Export" description="Download your data or set up email reports" />
            <SectionCard>
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg">📧</div>
                    <div>
                      <div className="text-sm font-semibold text-dark">Monthly Report</div>
                      <div className="text-xs text-dim">Receive a progress summary by email</div>
                    </div>
                  </div>
                  <Toggle checked={settings?.monthly_report_email ?? false} onChange={val => save({ monthly_report_email: val })} />
                </div>
                {settings?.monthly_report_email && (
                  <div className="mt-3 ml-[52px]">
                    <input type="email" value={settings?.report_email || user?.email || ''}
                      onChange={e => save({ report_email: e.target.value })}
                      placeholder="Email for reports"
                      className={`${inputCls} max-w-xs`} />
                  </div>
                )}
              </div>

              <div className="py-4">
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg">📦</div>
                  <div>
                    <div className="text-sm font-semibold text-dark">Export Data</div>
                    <div className="text-xs text-dim">Download your data (GDPR compliant)</div>
                  </div>
                </div>
                <div className="ml-[52px] flex gap-2 flex-wrap">
                  <button onClick={handleExportJSON} disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-2">
                    📄 JSON Export
                  </button>
                  <button onClick={handleExportCSV} disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50 flex items-center gap-2">
                    📊 CSV Workouts
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── ACCOUNT & SECURITY ── */}
        {activeSection === 'account' && (
          <div>
            <SectionHeading title="Account & Security" description="Manage your login credentials and account" />
            <SectionCard>
              {/* Password */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg">🔑</div>
                    <div>
                      <div className="text-sm font-semibold text-dark">Change Password</div>
                      <div className="text-xs text-dim">Update your login password</div>
                    </div>
                  </div>
                  <button onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      showPasswordForm ? 'bg-gray-100 text-muted' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}>
                    {showPasswordForm ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showPasswordForm && (
                  <div className="mt-4 ml-[52px] space-y-3">
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6)" className={inputCls} />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className={inputCls} />
                    <button onClick={handleChangePassword} disabled={saving}
                      className="w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">
                      {saving ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg">✉️</div>
                    <div>
                      <div className="text-sm font-semibold text-dark">Change Email</div>
                      <div className="text-xs text-dim">{user?.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setShowEmailForm(!showEmailForm)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      showEmailForm ? 'bg-gray-100 text-muted' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}>
                    {showEmailForm ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showEmailForm && (
                  <div className="mt-4 ml-[52px] space-y-3">
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email" className={inputCls} />
                    <button onClick={handleChangeEmail} disabled={saving}
                      className="w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">
                      {saving ? 'Sending…' : 'Send Confirmation'}
                    </button>
                  </div>
                )}
              </div>

              {/* Connected accounts */}
              <Row icon="🔗" label="Connected Accounts" description="Your active login methods">
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 bg-surface rounded-xl text-xs font-medium text-muted border border-border">✉️ Email</span>
                  {user?.app_metadata?.providers?.includes('google') && (
                    <span className="px-3 py-1.5 bg-surface rounded-xl text-xs font-medium text-muted border border-border">🔵 Google</span>
                  )}
                </div>
              </Row>

              {/* Delete account */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-lg">⚠️</div>
                    <div>
                      <div className="text-sm font-semibold text-red-500">Delete Account</div>
                      <div className="text-xs text-dim">Permanently delete all your data</div>
                    </div>
                  </div>
                  <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      showDeleteConfirm ? 'bg-gray-100 text-muted' : 'bg-red-50 text-red-500 hover:bg-red-100'
                    }`}>
                    {showDeleteConfirm ? 'Cancel' : 'Delete'}
                  </button>
                </div>
                {showDeleteConfirm && (
                  <div className="mt-4 ml-[52px] p-5 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600 mb-3">This is <strong>permanent</strong>. Type <strong>DELETE</strong> to confirm.</p>
                    <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder='Type "DELETE"'
                      className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400 mb-3" />
                    <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'}
                      className="w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-30">
                      Permanently Delete Account
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}
