import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// TOGGLE COMPONENT
// =============================================
function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0 ${
        checked ? 'bg-sky-500 shadow-sky-200 shadow-md' : 'bg-gray-200'
      }`}>
      <div className={`w-5.5 h-5.5 bg-white rounded-full shadow-md absolute top-[3px] transition-all duration-200 ${
        checked ? 'left-[23px]' : 'left-[3px]'
      }`}
        style={{ width: '22px', height: '22px', left: checked ? '23px' : '3px' }}
      />
    </button>
  )
}

// =============================================
// SETTINGS ROW
// =============================================
function SettingRow({ icon, label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4 group">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-dark">{label}</div>
          {description && <div className="text-xs text-dim mt-0.5 leading-relaxed">{description}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

// =============================================
// SECTION COMPONENT
// =============================================
function Section({ title, icon, color, children }) {
  const colorClasses = {
    blue: 'from-sky-500 to-blue-500',
    purple: 'from-purple-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    red: 'from-rose-500 to-red-500',
    amber: 'from-amber-500 to-orange-500',
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {/* Colored Header */}
      <div className={`bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} px-6 py-4`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <h2 className="text-white font-bold text-base">{title}</h2>
        </div>
      </div>
      {/* Content */}
      <div className="px-6 divide-y divide-border/70">
        {children}
      </div>
    </div>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    let { data: s } = await supabase.from('user_settings').select('*').eq('id', user.id).single()
    if (!s) {
      const { data: ns } = await supabase.from('user_settings').insert({ id: user.id }).select().single()
      s = ns
    }
    setSettings(s)
    const { data: p } = await supabase.from('profiles').select('is_public, show_workout_history, show_achievements').eq('id', user.id).single()
    setProfile(p)
    setLoading(false)
  }

  const save = async (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }))
    await supabase.from('user_settings').update(updates).eq('id', user.id)
  }

  const savePrivacy = async (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }))
    await supabase.from('profiles').update(updates).eq('id', user.id)
  }

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000) }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { showMsg('Error: Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { showMsg('Error: Passwords do not match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) showMsg('Error: ' + error.message)
    else { showMsg('Password updated!'); setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }
    setSaving(false)
  }

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { showMsg('Error: Enter a valid email'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) showMsg('Error: ' + error.message)
    else { showMsg('Confirmation email sent!'); setShowEmailForm(false); setNewEmail('') }
    setSaving(false)
  }

  const handleExportData = async () => {
    setSaving(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: logs } = await supabase.from('workout_logs').select('*').eq('user_id', user.id)
    const { data: xp } = await supabase.from('xp_transactions').select('*').eq('user_id', user.id)
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile: prof, settings, workout_logs: logs || [], xp_transactions: xp || [] }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gainly-export-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
    showMsg('Data exported!'); setSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    showMsg('Account deletion requested. Contact support to complete.')
    setShowDeleteConfirm(false); setDeleteConfirmText('')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-dark">Settings</h1>
        <p className="text-muted mt-1">Make Gainly truly yours</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
        }`}>{message}</div>
      )}

      <div className="space-y-6">

        {/* ===== PRIVACY ===== */}
        <Section title="Privacy" icon="🔒" color="purple">
          <SettingRow icon="👁️" label="Public Profile" description="Others can find and view your profile">
            <Toggle checked={profile?.is_public ?? true} onChange={(val) => savePrivacy({ is_public: val })} />
          </SettingRow>
          <SettingRow icon="📋" label="Show Workout History" description="Your workouts visible on your profile">
            <Toggle checked={profile?.show_workout_history ?? true} onChange={(val) => savePrivacy({ show_workout_history: val })} />
          </SettingRow>
          <SettingRow icon="🏆" label="Show Achievements" description="Your achievements visible on your profile">
            <Toggle checked={profile?.show_achievements ?? true} onChange={(val) => savePrivacy({ show_achievements: val })} />
          </SettingRow>
        </Section>

        {/* ===== NOTIFICATIONS ===== */}
        <Section title="Notifications" icon="🔔" color="blue">
          <SettingRow icon="📱" label="Push Notifications" description="Receive push notifications on your device">
            <Toggle checked={settings?.push_notifications ?? true} onChange={(val) => save({ push_notifications: val })} />
          </SettingRow>
          <SettingRow icon="⏰" label="Workout Reminder" description="Daily reminder to get moving">
            <Toggle checked={settings?.notify_workout_reminder ?? true} onChange={(val) => save({ notify_workout_reminder: val })} />
          </SettingRow>
          {settings?.notify_workout_reminder && (
            <div className="py-3 pl-[52px]">
              <label className="block text-xs text-muted mb-1.5">Reminder Time</label>
              <input type="time" value={settings?.workout_reminder_time || '09:00'}
                onChange={(e) => save({ workout_reminder_time: e.target.value })}
                className="bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
            </div>
          )}
          <SettingRow icon="🔥" label="Streak Warning" description="Get alerted when your streak is at risk">
            <Toggle checked={settings?.notify_streak_warning ?? true} onChange={(val) => save({ notify_streak_warning: val })} />
          </SettingRow>
          <SettingRow icon="🤝" label="Friend Requests" description="Notify on new friend requests">
            <Toggle checked={settings?.notify_friend_requests ?? true} onChange={(val) => save({ notify_friend_requests: val })} />
          </SettingRow>
          <SettingRow icon="❤️" label="Likes & Comments" description="Notify on likes or comments">
            <Toggle checked={settings?.notify_likes_comments ?? true} onChange={(val) => save({ notify_likes_comments: val })} />
          </SettingRow>
          <SettingRow icon="⚔️" label="Challenge Invites" description="Notify when invited to a challenge">
            <Toggle checked={settings?.notify_challenges ?? true} onChange={(val) => save({ notify_challenges: val })} />
          </SettingRow>
        </Section>

        {/* ===== APP SETTINGS ===== */}
        <Section title="App Settings" icon="⚙️" color="green">
          <SettingRow icon="🌐" label="Language" description="Choose your preferred language">
            <select value={settings?.language || 'en'} onChange={(e) => save({ language: e.target.value })}
              className="bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer">
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </SettingRow>
          <SettingRow icon="🌙" label="Dark Mode" description="Switch between light and dark theme">
            <div className="flex items-center gap-2">
              <span className="text-xs text-dim bg-surface px-2 py-1 rounded-lg">Coming soon</span>
              <Toggle checked={settings?.dark_mode ?? false} onChange={(val) => save({ dark_mode: val })} />
            </div>
          </SettingRow>
          <SettingRow icon="📏" label="Units" description="Weight and distance units">
            <select value={settings?.units || 'metric'} onChange={(e) => save({ units: e.target.value })}
              className="bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer">
              <option value="metric">Metric (kg, km)</option>
              <option value="imperial">Imperial (lbs, mi)</option>
            </select>
          </SettingRow>
          <SettingRow icon="📐" label="Compact Mode" description="Less spacing, smaller elements">
            <Toggle checked={settings?.compact_mode ?? false} onChange={(val) => save({ compact_mode: val })} />
          </SettingRow>
          <SettingRow icon="🔊" label="Sound Effects" description="Sounds for achievements and events">
            <Toggle checked={settings?.sound_effects ?? true} onChange={(val) => save({ sound_effects: val })} />
          </SettingRow>
          <SettingRow icon="⏱️" label="Timer Sounds" description="Countdown sounds during workouts">
            <Toggle checked={settings?.timer_sounds ?? true} onChange={(val) => save({ timer_sounds: val })} />
          </SettingRow>
          <SettingRow icon="🎊" label="Confetti Effects" description="Celebrate achievements with confetti">
            <Toggle checked={settings?.confetti_effects ?? true} onChange={(val) => save({ confetti_effects: val })} />
          </SettingRow>
        </Section>

        {/* ===== WORKOUT SETTINGS ===== */}
        <Section title="Workout" icon="💪" color="amber">
          <SettingRow icon="⏸️" label="Auto-Pause" description="Pause timer when app goes to background">
            <Toggle checked={settings?.workout_auto_pause ?? true} onChange={(val) => save({ workout_auto_pause: val })} />
          </SettingRow>
          <SettingRow icon="🕐" label="Default Rest Timer" description="Rest duration between sets">
            <select value={settings?.rest_timer_duration || 60} onChange={(e) => save({ rest_timer_duration: parseInt(e.target.value) })}
              className="bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer">
              <option value={30}>30 sec</option>
              <option value={60}>60 sec</option>
              <option value={90}>90 sec</option>
              <option value={120}>120 sec</option>
            </select>
          </SettingRow>
        </Section>

        {/* ===== ACCOUNT & SECURITY ===== */}
        <Section title="Account & Security" icon="🛡️" color="red">
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
                  showPasswordForm
                    ? 'bg-gray-100 text-muted hover:bg-gray-200'
                    : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                }`}>
                {showPasswordForm ? 'Cancel' : 'Change'}
              </button>
            </div>
            {showPasswordForm && (
              <div className="mt-4 ml-[52px] space-y-3">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                <button onClick={handleChangePassword} disabled={saving}
                  className="w-full py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50 shadow-lg shadow-sky-200 transition-all">
                  {saving ? 'Updating...' : 'Update Password'}
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
                  showEmailForm ? 'bg-gray-100 text-muted hover:bg-gray-200' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                }`}>
                {showEmailForm ? 'Cancel' : 'Change'}
              </button>
            </div>
            {showEmailForm && (
              <div className="mt-4 ml-[52px] space-y-3">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                <button onClick={handleChangeEmail} disabled={saving}
                  className="w-full py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50 shadow-lg shadow-sky-200 transition-all">
                  {saving ? 'Sending...' : 'Send Confirmation Email'}
                </button>
              </div>
            )}
          </div>

          {/* Connected Accounts */}
          <SettingRow icon="🔗" label="Connected Accounts" description="Your login methods">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-surface rounded-xl text-xs font-medium text-muted border border-border">✉️ Email</span>
              {user?.app_metadata?.providers?.includes('google') && (
                <span className="px-3 py-1.5 bg-surface rounded-xl text-xs font-medium text-muted border border-border">🔵 Google</span>
              )}
            </div>
          </SettingRow>

          {/* Export */}
          <SettingRow icon="📦" label="Export Data" description="Download all your data (GDPR)">
            <button onClick={handleExportData} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all disabled:opacity-50">
              {saving ? 'Exporting...' : 'Export'}
            </button>
          </SettingRow>

          {/* Delete Account */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-lg">⚠️</div>
                <div>
                  <div className="text-sm font-semibold text-red-500">Delete Account</div>
                  <div className="text-xs text-dim">Permanently delete account and all data</div>
                </div>
              </div>
              <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  showDeleteConfirm ? 'bg-gray-100 text-muted hover:bg-gray-200' : 'bg-red-50 text-red-500 hover:bg-red-100'
                }`}>
                {showDeleteConfirm ? 'Cancel' : 'Delete'}
              </button>
            </div>
            {showDeleteConfirm && (
              <div className="mt-4 ml-[52px] p-5 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-sm text-red-600 mb-3 leading-relaxed">
                  This action is <strong>permanent</strong> and cannot be undone. All your workouts, achievements and data will be lost. Type <strong>DELETE</strong> to confirm.
                </p>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE"'
                  className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 mb-3" />
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'}
                  className="w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-30 shadow-lg shadow-red-200 transition-all">
                  Permanently Delete Account
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Version Info */}
        <div className="text-center py-4">
          <p className="text-xs text-dim">Gainly v0.1.0 · Made with 💪</p>
        </div>
      </div>
    </div>
  )
}