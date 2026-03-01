import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// BODY DATA MODAL
// =============================================
function BodyDataModal({ profile, onClose, onSave }) {
  const [weight, setWeight] = useState(profile?.weight_kg || '')
  const [height, setHeight] = useState(profile?.height_cm || '')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '')
  const [gender, setGender] = useState(profile?.gender || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      weight_kg: weight || null,
      height_cm: height || null,
      birth_date: birthDate || null,
      gender: gender || null,
    })
    setSaving(false)
    onClose()
  }

  const GENDERS = [
    { id: 'male', label: 'Male', icon: '♂️' },
    { id: 'female', label: 'Female', icon: '♀️' },
    { id: 'other', label: 'Other', icon: '⚧️' },
    { id: 'prefer_not_to_say', label: 'Rather not say', icon: '🤐' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-dark">Body Data</h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-muted mb-2">Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 75.5" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark focus:outline-none focus:border-sky-400" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Height (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 180" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark focus:outline-none focus:border-sky-400" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Date of Birth</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark focus:outline-none focus:border-sky-400" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button key={g.id} onClick={() => setGender(g.id)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    gender === g.id ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-border bg-surface text-muted hover:border-sky-200'
                  }`}>
                  <span className="mr-2">{g.icon}</span>{g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted hover:bg-surface text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// ACTIVITY CALENDAR (GitHub-Style)
// Zeigt die letzten 12 Wochen als Grid
// =============================================
function ActivityCalendar({ workoutDates }) {
  // Letzte 84 Tage (12 Wochen) generieren
  const days = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const hasWorkout = workoutDates.includes(dateStr)
    days.push({ date: dateStr, hasWorkout, dayOfWeek: date.getDay() })
  }

  // In Wochen gruppieren (7 Tage pro Spalte)
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const monthLabels = []
  let lastMonth = ''
  weeks.forEach((week, i) => {
    const firstDay = new Date(week[0].date)
    const month = firstDay.toLocaleString('en', { month: 'short' })
    if (month !== lastMonth) {
      monthLabels.push({ index: i, label: month })
      lastMonth = month
    }
  })

  return (
    <div>
      <div className="text-sm font-medium text-dark mb-3">Activity (Last 12 Weeks)</div>
      {/* Monatslabels */}
      <div className="flex gap-[3px] mb-1 ml-0">
        {weeks.map((_, i) => {
          const label = monthLabels.find((m) => m.index === i)
          return (
            <div key={i} className="w-[14px] text-center">
              {label && <span className="text-[9px] text-dim">{label.label}</span>}
            </div>
          )
        })}
      </div>
      {/* Kalender Grid */}
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}${day.hasWorkout ? ' ✓' : ''}`}
                className={`w-[14px] h-[14px] rounded-sm transition-colors ${
                  day.hasWorkout
                    ? 'bg-sky-400'
                    : 'bg-surface border border-border/50'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-dim">Less</span>
        <div className="w-[10px] h-[10px] rounded-sm bg-surface border border-border/50" />
        <div className="w-[10px] h-[10px] rounded-sm bg-sky-200" />
        <div className="w-[10px] h-[10px] rounded-sm bg-sky-400" />
        <span className="text-[10px] text-dim">More</span>
      </div>
    </div>
  )
}

// =============================================
// MINI BAR CHART
// =============================================
function MiniBarChart({ data, label }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="text-sm font-medium text-dark mb-3">{label}</div>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[10px] text-muted">{d.value}</div>
            <div className="w-full bg-sky-400 rounded-t-md" style={{
              height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '0px',
            }} />
            <div className="text-[10px] text-dim">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================
// HELPER: Alter berechnen
// =============================================
function calculateAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// =============================================
// HAUPT-KOMPONENTE
// =============================================
export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'stats'
  const [editMode, setEditMode] = useState(false)
  const [showBodyModal, setShowBodyModal] = useState(false)

  // Editierbare Felder
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Stats
  const [workoutCount, setWorkoutCount] = useState(0)
  const [weeklyData, setWeeklyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [workoutDates, setWorkoutDates] = useState([])
  const [xpData, setXpData] = useState([])
  const [achievementCount, setAchievementCount] = useState(0)

  useEffect(() => {
    if (user) {
      loadProfile()
      loadStats()
    }
  }, [user])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setAvatarUrl(data.avatar_url || '')
      // Wenn noch kein Username → direkt Edit-Mode
      if (!data.username) setEditMode(true)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    // Total workouts
    const { count } = await supabase
      .from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setWorkoutCount(count || 0)

    // Workout-Daten für Kalender
    const { data: logs } = await supabase
      .from('workout_logs').select('started_at').eq('user_id', user.id)
      .gte('started_at', new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString())
    const dates = (logs || []).map((l) => l.started_at?.split('T')[0]).filter(Boolean)
    setWorkoutDates([...new Set(dates)])

    // Workouts pro Woche (letzte 8 Wochen)
    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date()
      start.setDate(start.getDate() - i * 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      const { count: wc } = await supabase
        .from('workout_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('started_at', start.toISOString())
        .lt('started_at', end.toISOString())
      weeks.push({ label: `W${8 - i}`, value: wc || 0 })
    }
    setWeeklyData(weeks)

    // Workouts pro Monat (letzte 6 Monate)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const { count: mc } = await supabase
        .from('workout_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('started_at', start.toISOString())
        .lt('started_at', end.toISOString())
      months.push({ label: start.toLocaleString('en', { month: 'short' }), value: mc || 0 })
    }
    setMonthlyData(months)

    // XP pro Woche (letzte 8 Wochen)
    const xpWeeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date()
      start.setDate(start.getDate() - i * 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      const { data: xpRows } = await supabase
        .from('xp_transactions').select('amount')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
      const total = (xpRows || []).reduce((sum, r) => sum + (r.amount || 0), 0)
      xpWeeks.push({ label: `W${8 - i}`, value: total })
    }
    setXpData(xpWeeks)

    // Achievements count
    const { count: ac } = await supabase
      .from('user_achievements').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setAchievementCount(ac || 0)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage('')

    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setMessage('Error: 3-20 chars, letters, numbers and _ only')
      setSaving(false)
      return
    }

    if (username && username !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles').select('username').eq('username', username.toLowerCase()).neq('id', user.id).maybeSingle()
      if (existing) {
        setMessage('Error: Username is already taken')
        setSaving(false)
        return
      }
    }

    const { error } = await supabase.from('profiles').update({
      username: username.toLowerCase() || null,
      display_name: username || null,
      avatar_url: avatarUrl || null,
    }).eq('id', user.id)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Profile saved!')
      setEditMode(false)
      await loadProfile()
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const handleSaveBodyData = async (bodyData) => {
    await supabase.from('profiles').update(bodyData).eq('id', user.id)
    await loadProfile()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>
  }

  const age = calculateAge(profile?.birth_date)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-dark">Profile</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'profile' ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'stats' ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'
          }`}
        >
          Stats & Progress
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
          message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
        }`}>{message}</div>
      )}

      {/* =============================================
          TAB: PROFILE
          ============================================= */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Links: Profil Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-border rounded-xl p-6">
              {/* Edit / View Toggle */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-dark">Personal Info</h2>
                {!editMode && profile?.username && (
                  <button onClick={() => setEditMode(true)}
                    className="text-sky-500 hover:text-sky-600 text-sm font-medium">
                    Edit
                  </button>
                )}
              </div>

              {editMode ? (
                /* ===== EDIT MODE ===== */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted mb-2">Avatar URL</label>
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-2xl overflow-hidden border border-border flex-shrink-0">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" /> : '👤'}
                      </div>
                      <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-2">Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. fitnessbeast42"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
                    <p className="text-xs text-dim mt-1">3-20 characters, letters, numbers and _</p>
                  </div>
                  <div className="flex gap-3">
                    {profile?.username && (
                      <button onClick={() => { setEditMode(false); setUsername(profile.username || ''); setAvatarUrl(profile.avatar_url || '') }}
                        className="flex-1 py-3 rounded-xl border border-border text-muted hover:bg-surface text-sm font-medium">
                        Cancel
                      </button>
                    )}
                    <button onClick={handleSaveProfile} disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ===== VIEW MODE ===== */
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-4xl overflow-hidden border-2 border-border flex-shrink-0">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" /> : '👤'}
                  </div>
                  <div>
                    <div className="text-xl font-black text-dark">
                      {profile?.username || 'No username'}
                    </div>
                    <div className="text-sm text-muted mt-0.5">
                      {[
                        profile?.gender && profile.gender !== 'prefer_not_to_say'
                          ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
                          : null,
                        age ? `${age} years` : null,
                      ].filter(Boolean).join(', ') || 'No info set yet'}
                    </div>
                    {profile?.fitness_level && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 rounded-full text-xs font-medium text-sky-600">
                        {profile.fitness_level === 'advanced' ? '🔥' : profile.fitness_level === 'intermediate' ? '💪' : '🌱'}
                        {profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Activity Calendar */}
            <div className="bg-white border border-border rounded-xl p-6">
              <ActivityCalendar workoutDates={workoutDates} />
            </div>
          </div>

          {/* Rechts: Body Data + Quick Stats */}
          <div className="space-y-6">
            {/* Body Data */}
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-dark">Body Data</h2>
                <button onClick={() => setShowBodyModal(true)}
                  className="text-sky-500 hover:text-sky-600 text-sm font-medium">Edit</button>
              </div>
              <div className="space-y-1">
                <DataRow label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : '—'} />
                <DataRow label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : '—'} />
                <DataRow label="Age" value={age ? `${age} years` : '—'} />
                <DataRow label="Gender" value={profile?.gender ? profile.gender.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'} />
                {profile?.weight_kg && profile?.height_cm && (
                  <DataRow label="BMI" value={(profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1)} />
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-dark mb-4">Quick Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sky-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-sky-600">{profile?.xp_total || 0}</div>
                  <div className="text-xs text-sky-500 mt-1">Total XP</div>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-dark">{workoutCount}</div>
                  <div className="text-xs text-muted mt-1">Workouts</div>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-dark">{profile?.current_streak || 0} 🔥</div>
                  <div className="text-xs text-muted mt-1">Streak</div>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-dark">{achievementCount}</div>
                  <div className="text-xs text-muted mt-1">Achievements</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================
          TAB: STATS & PROGRESS
          ============================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total XP" value={profile?.xp_total || 0} color="sky" />
            <StatCard label="Workouts" value={workoutCount} />
            <StatCard label="Current Streak" value={`${profile?.current_streak || 0} 🔥`} />
            <StatCard label="Best Streak" value={profile?.longest_streak || 0} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-xl p-6">
              <MiniBarChart data={weeklyData} label="Workouts per Week (Last 8 Weeks)" />
            </div>
            <div className="bg-white border border-border rounded-xl p-6">
              <MiniBarChart data={monthlyData} label="Workouts per Month (Last 6 Months)" />
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-xl p-6">
              <MiniBarChart data={xpData} label="XP Earned per Week" />
            </div>
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="text-sm font-medium text-dark mb-4">Overview</div>
              <div className="space-y-3">
                <ProgressBar label="Workouts this week" value={weeklyData[weeklyData.length - 1]?.value || 0} max={7} />
                <ProgressBar label="Current Streak" value={profile?.current_streak || 0} max={Math.max(profile?.longest_streak || 7, 7)} />
                <ProgressBar label="Achievements" value={achievementCount} max={Math.max(achievementCount, 10)} />
              </div>
            </div>
          </div>

          {/* Activity Calendar (auch im Stats Tab) */}
          <div className="bg-white border border-border rounded-xl p-6">
            <ActivityCalendar workoutDates={workoutDates} />
          </div>
        </div>
      )}

      {/* Body Data Modal */}
      {showBodyModal && (
        <BodyDataModal profile={profile} onClose={() => setShowBodyModal(false)} onSave={handleSaveBodyData} />
      )}
    </div>
  )
}

// =============================================
// HELPER COMPONENTS
// =============================================

function DataRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-dark">{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const isColored = color === 'sky'
  return (
    <div className={`rounded-xl p-5 text-center ${isColored ? 'bg-sky-50 border border-sky-200' : 'bg-white border border-border'}`}>
      <div className={`text-2xl font-black ${isColored ? 'text-sky-600' : 'text-dark'}`}>{value}</div>
      <div className={`text-xs mt-1 ${isColored ? 'text-sky-500' : 'text-muted'}`}>{label}</div>
    </div>
  )
}

function ProgressBar({ label, value, max }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-dark font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}