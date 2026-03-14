import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const TIERS = [
  { name: 'Bronze',   min: 0,      max: 999,    color: 'from-amber-700 to-amber-600',    text: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  icon: '🥉', desc: 'Just getting started' },
  { name: 'Silver',   min: 1000,   max: 2499,   color: 'from-slate-400 to-slate-500',    text: 'text-slate-500',  bg: 'bg-slate-50',   border: 'border-slate-200',  icon: '🥈', desc: 'Building consistency' },
  { name: 'Gold',     min: 2500,   max: 4999,   color: 'from-yellow-500 to-amber-400',   text: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: '🥇', desc: 'Rising athlete' },
  { name: 'Platinum', min: 5000,   max: 9999,   color: 'from-cyan-500 to-sky-500',       text: 'text-cyan-600',   bg: 'bg-cyan-50',    border: 'border-cyan-200',   icon: '💠', desc: 'Serious competitor' },
  { name: 'Diamond',  min: 10000,  max: 24999,  color: 'from-violet-500 to-purple-600',  text: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-200', icon: '💎', desc: 'Elite level' },
  { name: 'Obsidian', min: 25000,  max: 74999,  color: 'from-gray-800 to-gray-900',      text: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-300',   icon: '🖤', desc: 'Dedicated warrior' },
  { name: 'Mythic',   min: 75000,  max: 199999, color: 'from-fuchsia-500 to-purple-700', text: 'text-fuchsia-600',bg: 'bg-fuchsia-50', border: 'border-fuchsia-200',icon: '🔮', desc: 'Living legend' },
  { name: 'Ascended', min: 200000, max: Infinity,color: 'from-red-500 via-amber-400 to-red-600', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '⭐', desc: 'Beyond human limits' },
]

const EXERCISE_BOARDS = [
  { id: 'pullups',    label: 'Pull-Ups',    icon: '🔝', unit: 'reps' },
  { id: 'muscleup',   label: 'Muscle-Up',   icon: '💪', unit: 'reps' },
  { id: 'pushups',    label: 'Push-Ups',    icon: '⬆️', unit: 'reps' },
  { id: 'pistolsquat',label: 'Pistol Squat',icon: '🦵', unit: 'reps' },
]

function getTier(xp) {
  return TIERS.findLast(t => xp >= t.min) || TIERS[0]
}

function TierBadge({ xp, size = 'sm' }) {
  const tier = getTier(xp)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tier.bg} ${tier.text} border ${tier.border}`}>
      {tier.icon} {tier.name}
    </span>
  )
}

function RankRow({ rank, entry, isMe }) {
  const tier = getTier(entry.xp_total || 0)
  const isTop3 = rank <= 3
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isMe ? 'bg-red-50 border border-red-200' : isTop3 ? 'bg-surface' : 'hover:bg-surface/60'}`}>
      <div className={`w-8 text-center flex-shrink-0 ${isTop3 ? 'text-lg' : 'text-xs font-bold text-dim'}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white bg-gradient-to-br ${tier.color}`}>
        {(entry.username || entry.full_name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-dark truncate">
          {entry.username || entry.full_name || 'Anonymous'}
          {isMe && <span className="ml-2 text-[10px] text-red-500 font-semibold">You</span>}
        </div>
        <TierBadge xp={entry.xp_total || 0} />
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-base font-black text-dark">{(entry.xp_total || 0).toLocaleString()}</div>
        <div className="text-[9px] text-dim">XP</div>
      </div>
    </div>
  )
}

export default function LeaderboardsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('global')
  const [period, setPeriod] = useState('alltime')
  const [exerciseTab, setExerciseTab] = useState('pullups')
  const [entries, setEntries] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [tab, period])

  const loadData = async () => {
    setLoading(true)
    const [{ data: all }, { data: me }] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, xp_total, preferred_training').order('xp_total', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    let filtered = all || []
    if (tab === 'calisthenics') filtered = filtered.filter(p => p.preferred_training === 'calisthenics' || !p.preferred_training)
    if (tab === 'gym') filtered = filtered.filter(p => p.preferred_training === 'gym')

    setEntries(filtered)
    setMyProfile(me)
    setLoading(false)
  }

  const myRank = entries.findIndex(e => e.id === user.id) + 1
  const myXP = myProfile?.xp_total || 0
  const myTier = getTier(myXP)
  const nextTier = TIERS[TIERS.findIndex(t => t.name === myTier.name) + 1]
  const progressToNext = nextTier ? Math.min(((myXP - myTier.min) / (nextTier.min - myTier.min)) * 100, 100) : 100

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-dark">Leaderboards</h1>
        <p className="text-sm text-muted mt-0.5">Compete. Rank up. Dominate.</p>
      </div>

      {/* My Rank Card */}
      {myProfile && (
        <div className={`bg-gradient-to-br ${myTier.color} rounded-2xl p-5 text-white relative overflow-hidden`}>
          {/* Decorative glow */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] text-white/60 mb-0.5 uppercase tracking-wider">Your Global Rank</div>
              <div className="text-5xl font-black leading-none">#{myRank || '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-0.5">{myTier.icon}</div>
              <div className="text-sm font-black">{myTier.name}</div>
              <div className="text-[9px] text-white/60">{myTier.desc}</div>
            </div>
          </div>
          <div className="mb-1.5 flex justify-between text-[10px] text-white/70">
            <span>{myXP.toLocaleString()} XP</span>
            {nextTier ? <span>{nextTier.min.toLocaleString()} XP → {nextTier.icon} {nextTier.name}</span> : <span>Max tier reached ⭐</span>}
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all shadow-sm" style={{ width: `${progressToNext}%` }} />
          </div>
          {nextTier && (
            <div className="mt-2 text-[9px] text-white/50">
              {(nextTier.min - myXP).toLocaleString()} XP to {nextTier.name}
            </div>
          )}
        </div>
      )}

      {/* Tier Legend */}
      <div className="bg-white border border-border rounded-2xl p-4">
        <div className="text-xs font-bold text-dark mb-3">All Tiers — How far can you climb?</div>
        <div className="space-y-2">
          {TIERS.map((t, i) => {
            const isMe = myTier.name === t.name
            const isUnlocked = myXP >= t.min
            return (
              <div key={t.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isMe ? `${t.bg} ${t.border} ring-2 ring-offset-1 ring-red-400` : isUnlocked ? `${t.bg} ${t.border}` : 'bg-surface border-border opacity-50'}`}>
                <span className="text-lg w-7 text-center">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isUnlocked ? t.text : 'text-dim'}`}>{t.name}</span>
                    {isMe && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                    {isUnlocked && !isMe && <span className="text-[9px] text-green-500 font-bold">✓</span>}
                  </div>
                  <div className="text-[9px] text-dim">{t.desc}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[9px] text-dim font-medium">
                    {t.min >= 1000 ? `${t.min/1000}k` : t.min} XP
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Board Type Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'global',       label: 'Global',    icon: '🌍' },
          { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
          { id: 'gym',          label: 'Gym',        icon: '🏋️' },
          { id: 'exercise',     label: 'Exercise',   icon: '📊' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === t.id ? 'bg-dark text-white' : 'bg-white border border-border text-muted hover:border-red-200'}`}>
            <div>{t.icon}</div>
            <div className="mt-0.5">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Period Filter (non-exercise boards) */}
      {tab !== 'exercise' && (
        <div className="flex gap-1.5">
          {[
            { id: 'weekly',  label: 'This Week' },
            { id: 'monthly', label: 'This Month' },
            { id: 'alltime', label: 'All Time' },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p.id ? 'bg-dark text-white' : 'bg-surface text-muted border border-border'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Exercise Leaderboard Selector */}
      {tab === 'exercise' && (
        <div className="flex gap-2 flex-wrap">
          {EXERCISE_BOARDS.map(e => (
            <button key={e.id} onClick={() => setExerciseTab(e.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${exerciseTab === e.id ? 'bg-dark text-white' : 'bg-white border border-border text-muted hover:border-red-200'}`}>
              <span>{e.icon}</span> {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-bold text-dark">
            {tab === 'exercise' ? EXERCISE_BOARDS.find(e => e.id === exerciseTab)?.label + ' Rankings' : tab.charAt(0).toUpperCase() + tab.slice(1) + ' Rankings'}
          </div>
          <div className="text-[10px] text-dim">{entries.length} athletes</div>
        </div>

        {tab === 'exercise' ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm font-bold text-dark mb-1">Exercise Leaderboards</div>
            <div className="text-xs text-muted">Track personal records in workouts to appear here.</div>
            <div className="text-[10px] text-dim mt-4">Coming soon — start logging workouts to set your PR!</div>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-muted text-sm">Loading...</div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((entry, i) => (
              <RankRow key={entry.id} rank={i + 1} entry={entry} isMe={entry.id === user.id} />
            ))}
            {entries.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm text-muted">No athletes in this category yet.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Challenges Teaser */}
      <div className="bg-gradient-to-br from-dark to-gray-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-sm font-bold">Challenges & Badges</div>
            <div className="text-[10px] text-white/50">Weekly challenges, streaks & achievement badges</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {['🔥 7-Day Streak', '💪 100 Push-Ups', '🌳 Skill Unlock', '⭐ First PR'].map((c, i) => (
            <div key={i} className="bg-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white/70">{c}</div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-white/40">Full challenges system launching soon</div>
      </div>
    </div>
  )
}
