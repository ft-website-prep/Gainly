import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getDailyQuote } from '../../lib/content'
import DailyGoalWidget from '../../components/workouts/DailyGoalWidget'

// =============================================
// MINI LINE CHART (SVG)
// =============================================
function LineChart({ data, label, color = '#38bdf8' }) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data.map((d) => d.value), 1)
  const width = 100
  const height = 40
  const padding = 2

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: height - padding - (d.value / max) * (height - padding * 2),
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-dark">{label}</div>
        <div className="text-xs text-dim">{data[data.length - 1]?.value || 0} this week</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="white" stroke={color} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <div key={i} className="text-[10px] text-dim text-center" style={{ width: `${100 / data.length}%` }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================
// LEAGUE HELPER
// =============================================
const LEAGUES = [
  { min: 50000, name: 'Legend', emoji: 'crown', color: 'text-amber-500' },
  { min: 15000, name: 'Beast', emoji: 'fire', color: 'text-red-500' },
  { min: 5000, name: 'Athlete', emoji: 'muscle', color: 'text-sky-500' },
  { min: 1000, name: 'Grinder', emoji: 'gear', color: 'text-gray-500' },
  { min: 0, name: 'Rookie', emoji: 'seedling', color: 'text-green-500' },
]

const EMOJI_MAP = {
  crown: String.fromCodePoint(0x1F451),
  fire: String.fromCodePoint(0x1F525),
  muscle: String.fromCodePoint(0x1F4AA),
  gear: String.fromCodePoint(0x2699, 0xFE0F),
  seedling: String.fromCodePoint(0x1F331),
  person: String.fromCodePoint(0x1F464),
  people: String.fromCodePoint(0x1F465),
  gym: String.fromCodePoint(0x1F3CB, 0xFE0F),
  robot: String.fromCodePoint(0x1F916),
  chart: String.fromCodePoint(0x1F4C8),
  heart: String.fromCodePoint(0x2764, 0xFE0F),
  speech: String.fromCodePoint(0x1F4AC),
  play: String.fromCodePoint(0x25B6),
  arrow: String.fromCodePoint(0x2192),
  dot: String.fromCodePoint(0x00B7),
}

function getLeague(xp) {
  for (const l of LEAGUES) {
    if (xp >= l.min) return l
  }
  return LEAGUES[LEAGUES.length - 1]
}

// =============================================
// DASHBOARD
// =============================================
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quote] = useState(() => getDailyQuote())

  const [weekWorkouts, setWeekWorkouts] = useState(0)
  const [xpWeekly, setXpWeekly] = useState([])
  const [savedWorkouts, setSavedWorkouts] = useState([])
  const [recentPosts, setRecentPosts] = useState([])

  useEffect(() => {
    if (user) {
      loadProfile()
      loadDashboardData()
    }
  }, [user])

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data && !data.welcome_seen) { navigate('/welcome'); return }
    setProfile(data)
    setLoading(false)
  }

  const loadDashboardData = async () => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const { count } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', weekStart.toISOString())
    setWeekWorkouts(count || 0)

    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date()
      start.setDate(start.getDate() - i * 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      const { data: xpRows } = await supabase.from('xp_transactions').select('amount').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      const total = (xpRows || []).reduce((sum, r) => sum + (r.amount || 0), 0)
      weeks.push({ label: `W${8 - i}`, value: total })
    }
    setXpWeekly(weeks)

    const { data: workouts } = await supabase.from('workouts').select('id, name, estimated_duration, difficulty').eq('created_by', user.id).order('created_at', { ascending: false }).limit(3)
    setSavedWorkouts(workouts || [])

    const { data: posts } = await supabase.from('posts').select(`
      id, content, post_type, like_count, comment_count, created_at,
      profiles:user_id ( username, avatar_url )
    `).is('group_id', null).order('created_at', { ascending: false }).limit(3)
    setRecentPosts(posts || [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  const league = getLeague(profile?.xp_total || 0)

  return (
    <div className="max-w-4xl">

      {/* Profile Header + Quote */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-3xl overflow-hidden border-2 border-border flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span>{EMOJI_MAP.person}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-dark truncate">
                {profile?.display_name || profile?.username || 'Welcome'}
              </h1>
              <span className={`text-lg ${league.color}`} title={league.name}>
                {EMOJI_MAP[league.emoji]}
              </span>
            </div>
            <p className="text-muted text-sm mt-1 italic leading-relaxed">
              &ldquo;{quote.text}&rdquo;
              <span className="text-dim not-italic"> &mdash; {quote.author}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Daily Goal Widget */}
      <div className="mb-6">
        <DailyGoalWidget />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-sky-500">{profile?.xp_total || 0}</div>
          <div className="text-xs text-muted mt-1">Total XP</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-dark">
            {profile?.current_streak || 0} <span>{EMOJI_MAP.fire}</span>
          </div>
          <div className="text-xs text-muted mt-1">Week Streak</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-dark">{weekWorkouts}</div>
          <div className="text-xs text-muted mt-1">This Week</div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl p-4 text-center text-white">
          <div className="text-2xl font-black">{EMOJI_MAP[league.emoji]} {league.name}</div>
          <div className="text-xs text-sky-100 mt-1">Current League</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Chart + Workouts */}
        <div className="lg:col-span-2 space-y-6">
          {/* XP Line Chart */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <LineChart data={xpWeekly} label="XP Progress" color="#38bdf8" />
          </div>

          {/* Saved Workouts */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Your Workouts</h2>
              <button onClick={() => navigate('/app/workouts')} className="text-sky-500 hover:text-sky-600 text-sm font-medium">
                {'View All ' + EMOJI_MAP.arrow}
              </button>
            </div>
            {savedWorkouts.length > 0 ? (
              <div className="space-y-2">
                {savedWorkouts.map((w) => (
                  <div key={w.id}
                    className="flex items-center justify-between p-3.5 bg-surface rounded-xl hover:bg-sky-50 transition-colors cursor-pointer group"
                    onClick={() => navigate('/app/workouts')}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white border border-border rounded-lg flex items-center justify-center text-lg group-hover:border-sky-200">
                        {EMOJI_MAP.muscle}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-dark">{w.name}</div>
                        <div className="text-xs text-dim">
                          {w.estimated_duration ? `${w.estimated_duration} min` : 'No duration'}
                          {w.difficulty && ` ${EMOJI_MAP.dot} ${w.difficulty}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-dim text-sm group-hover:text-sky-500">{EMOJI_MAP.play}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">{EMOJI_MAP.gym}</div>
                <p className="text-sm text-muted mb-3">No saved workouts yet</p>
                <button onClick={() => navigate('/app/workouts')} className="text-sm font-semibold text-sky-500 hover:text-sky-600">
                  {'Create your first workout ' + EMOJI_MAP.arrow}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Community Feed Teaser */}
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Community</h2>
              <button onClick={() => navigate('/app/community')} className="text-sky-500 hover:text-sky-600 text-sm font-medium">
                {'Open ' + EMOJI_MAP.arrow}
              </button>
            </div>

            {recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div key={post.id} className="p-3.5 bg-surface rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center text-xs overflow-hidden">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span>{EMOJI_MAP.person}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-dark">
                        {post.profiles?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-dim">
                        {EMOJI_MAP.dot} {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-dim">{EMOJI_MAP.heart} {post.like_count || 0}</span>
                      <span className="text-xs text-dim">{EMOJI_MAP.speech} {post.comment_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">{EMOJI_MAP.people}</div>
                <p className="text-sm text-muted mb-3">No posts yet</p>
                <button onClick={() => navigate('/app/community')} className="text-sm font-semibold text-sky-500 hover:text-sky-600">
                  {'Be the first to post ' + EMOJI_MAP.arrow}
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
            <h2 className="font-bold text-base mb-3">Quick Start</h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/app/workouts')} className="w-full flex items-center gap-3 p-3 bg-white/15 rounded-xl hover:bg-white/25 transition-colors text-left">
                <span className="text-lg">{EMOJI_MAP.muscle}</span>
                <span className="text-sm font-semibold">Start Workout</span>
              </button>
              <button onClick={() => navigate('/app/coach')} className="w-full flex items-center gap-3 p-3 bg-white/15 rounded-xl hover:bg-white/25 transition-colors text-left">
                <span className="text-lg">{EMOJI_MAP.robot}</span>
                <span className="text-sm font-semibold">Ask AI Coach</span>
              </button>
              <button onClick={() => navigate('/app/profile')} className="w-full flex items-center gap-3 p-3 bg-white/15 rounded-xl hover:bg-white/25 transition-colors text-left">
                <span className="text-lg">{EMOJI_MAP.chart}</span>
                <span className="text-sm font-semibold">View Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// HELPER: Time Ago
// =============================================
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}