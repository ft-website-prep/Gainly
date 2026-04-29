import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getDailyQuote } from '../../lib/content'
import DailyGoalWidget from '../../components/workouts/DailyGoalWidget'

// =============================================
// XP PROGRESS CHART (SVG)
// =============================================
function XpChart({ data, color = '#e10600' }) {
  const [hovered, setHovered] = useState(null)

  if (!data || data.length === 0) return null

  const max = Math.max(...data.map((d) => d.value), 1)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const thisWeek = data[data.length - 1]?.value || 0
  const lastWeek = data.length >= 2 ? data[data.length - 2]?.value || 0 : 0
  const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0

  const W = 400
  const H = 160
  const PX = 40
  const PY = 20
  const chartW = W - PX * 2
  const chartH = H - PY * 2

  const points = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * chartW,
    y: PY + chartH - (d.value / max) * chartH,
    ...d,
  }))

  // Smooth cubic bezier path
  const smoothLine = (pts) => {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`
    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i]
      const next = pts[i + 1]
      const cpx = (curr.x + next.x) / 2
      path += ` C ${cpx} ${curr.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`
    }
    return path
  }

  const linePath = smoothLine(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`

  // Y-axis tick values (4 ticks)
  const yTicks = [0, Math.round(max * 0.33), Math.round(max * 0.66), max]

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xs font-semibold text-dim uppercase tracking-wide mb-1">XP Progress</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-dark">{total.toLocaleString()}</span>
            <span className="text-xs text-dim">XP earned (8 weeks)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-black text-dark">{thisWeek.toLocaleString()}</div>
            <div className="text-[10px] text-dim">this week</div>
          </div>
          {trend !== 0 && (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
          <defs>
            <linearGradient id="xp-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {yTicks.map((tick, i) => {
            const y = PY + chartH - (tick / max) * chartH
            return (
              <g key={i}>
                <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e5e5e5" strokeWidth="0.8" strokeDasharray={i === 0 ? 'none' : '4 3'} />
                <text x={PX - 8} y={y + 3.5} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>
                  {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#xp-area-grad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

          {/* Hover column targets + dots */}
          {points.map((p, i) => {
            const isActive = hovered === i
            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                style={{ cursor: 'pointer' }}
              >
                {/* Invisible hit area */}
                <rect x={p.x - chartW / data.length / 2} y={PY} width={chartW / data.length} height={chartH} fill="transparent" />

                {/* Vertical guide on hover */}
                {isActive && (
                  <line x1={p.x} y1={PY} x2={p.x} y2={PY + chartH} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
                )}

                {/* Dot */}
                <circle cx={p.x} cy={p.y} r={isActive ? 5 : 3} fill="white" stroke={color} strokeWidth={isActive ? 2.5 : 2}
                  style={{ transition: 'r 0.15s ease' }}
                />

                {/* Tooltip */}
                {isActive && (
                  <g>
                    <rect x={p.x - 28} y={p.y - 28} width={56} height={20} rx={6} fill="#1a1a1a" />
                    <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" style={{ fontSize: 10, fontWeight: 700 }}>
                      {p.value.toLocaleString()} XP
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Week labels */}
        <div className="flex justify-between px-[10%]">
          {data.map((d, i) => (
            <div
              key={i}
              className={`text-[11px] text-center font-medium transition-colors ${
                hovered === i ? 'text-dark' : 'text-dim'
              }`}
              style={{ width: `${100 / data.length}%` }}
            >
              {d.label}
            </div>
          ))}
        </div>
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
  { min: 5000, name: 'Athlete', emoji: 'muscle', color: 'text-red-500' },
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
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
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
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-red-500">{profile?.xp_total || 0}</div>
          <div className="text-xs text-muted mt-1">Total XP</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-dark">
            {profile?.current_streak || 0} <span>{EMOJI_MAP.fire}</span>
          </div>
          <div className="text-xs text-muted mt-1">Week Streak</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-dark">{weekWorkouts}</div>
          <div className="text-xs text-muted mt-1">This Week</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-center text-white">
          <div className="text-2xl font-black">{EMOJI_MAP[league.emoji]} {league.name}</div>
          <div className="text-xs text-red-100 mt-1">Current League</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Chart + Workouts */}
        <div className="lg:col-span-2 space-y-6">
          {/* XP Progress Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <XpChart data={xpWeekly} color="#e10600" />
          </div>

          {/* Saved Workouts */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Your Workouts</h2>
              <button onClick={() => navigate('/app/workouts')} className="text-red-500 hover:text-red-600 text-sm font-medium">
                {'View All ' + EMOJI_MAP.arrow}
              </button>
            </div>
            {savedWorkouts.length > 0 ? (
              <div className="space-y-2">
                {savedWorkouts.map((w) => (
                  <div key={w.id}
                    className="flex items-center justify-between p-3.5 bg-surface rounded-xl hover:bg-red-50 transition-colors cursor-pointer group"
                    onClick={() => navigate('/app/workouts')}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-surface border border-border rounded-lg flex items-center justify-center text-lg group-hover:border-red-200">
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
                    <span className="text-dim text-sm group-hover:text-red-500">{EMOJI_MAP.play}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">{EMOJI_MAP.gym}</div>
                <p className="text-sm text-muted mb-3">No saved workouts yet</p>
                <button onClick={() => navigate('/app/workouts')} className="text-sm font-semibold text-red-500 hover:text-red-600">
                  {'Create your first workout ' + EMOJI_MAP.arrow}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Community Feed Teaser */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Community</h2>
              <button onClick={() => navigate('/app/community')} className="text-red-500 hover:text-red-600 text-sm font-medium">
                {'Open ' + EMOJI_MAP.arrow}
              </button>
            </div>

            {recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div key={post.id} className="p-3.5 bg-surface rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-xs overflow-hidden">
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
                <button onClick={() => navigate('/app/community')} className="text-sm font-semibold text-red-500 hover:text-red-600">
                  {'Be the first to post ' + EMOJI_MAP.arrow}
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-6 text-white">
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