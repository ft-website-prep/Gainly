import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const QUICK_GOALS = [
  { title: '50 Push-Ups', type: 'reps', target: 50, unit: 'reps', icon: '💪' },
  { title: '100 Squats', type: 'reps', target: 100, unit: 'reps', icon: '🦵' },
  { title: '5 Min Plank', type: 'time', target: 300, unit: 'seconds', icon: '⏱️' },
  { title: '10 Min Stretch', type: 'time', target: 600, unit: 'seconds', icon: '🧘' },
  { title: '10,000 Steps', type: 'distance', target: 10000, unit: 'steps', icon: '🚶' },
  { title: '30 Burpees', type: 'reps', target: 30, unit: 'reps', icon: '🔥' },
  { title: '20 Pull-Ups', type: 'reps', target: 20, unit: 'reps', icon: '🫷' },
  { title: '200 Crunches', type: 'reps', target: 200, unit: 'reps', icon: '💎' },
]

export default function DailyGoal() {
  const { user } = useAuth()
  const [goal, setGoal] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [customType, setCustomType] = useState('reps')
  const [weekHistory, setWeekHistory] = useState([])

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0]

    // Today's goal
    const { data: g } = await supabase.from('daily_goals').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    setGoal(g)

    // Profile for streak
    const { data: p } = await supabase.from('profiles').select('current_streak, longest_streak, weekly_workout_goal, streak_type').eq('id', user.id).single()
    setProfile(p)

    // Week history (last 7 days)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const { data: dg } = await supabase.from('daily_goals').select('completed').eq('user_id', user.id).eq('date', ds).maybeSingle()
      const { count: wc } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', ds + 'T00:00:00').lt('started_at', ds + 'T23:59:59')
      days.push({
        date: ds, day: d.toLocaleDateString('en', { weekday: 'short' }),
        goalCompleted: dg?.completed || false,
        hadWorkout: (wc || 0) > 0,
        isToday: i === 0,
      })
    }
    setWeekHistory(days)
    setLoading(false)
  }

  const setQuickGoal = async (qg) => {
    const today = new Date().toISOString().split('T')[0]
    if (goal) {
      await supabase.from('daily_goals').update({ title: qg.title, goal_type: qg.type, target_value: qg.target, unit: qg.unit, current_value: 0, completed: false }).eq('id', goal.id)
    } else {
      await supabase.from('daily_goals').insert({ user_id: user.id, title: qg.title, goal_type: qg.type, target_value: qg.target, unit: qg.unit, date: today })
    }
    await loadData()
  }

  const setCustomGoal = async () => {
    if (!customTitle.trim() || !customTarget) return
    const today = new Date().toISOString().split('T')[0]
    const data = { title: customTitle, goal_type: customType, target_value: parseInt(customTarget), unit: customType === 'time' ? 'seconds' : customType === 'distance' ? 'steps' : 'reps' }
    if (goal) {
      await supabase.from('daily_goals').update({ ...data, current_value: 0, completed: false }).eq('id', goal.id)
    } else {
      await supabase.from('daily_goals').insert({ user_id: user.id, ...data, date: today })
    }
    setShowCreate(false); setCustomTitle(''); setCustomTarget('')
    await loadData()
  }

  const updateProgress = async (val) => {
    if (!goal) return
    const newVal = Math.max(0, Math.min(goal.target_value, val))
    const completed = newVal >= goal.target_value
    await supabase.from('daily_goals').update({ current_value: newVal, completed }).eq('id', goal.id)

    // If completed, update streak
    if (completed && !goal.completed) {
      await updateStreak()
    }
    await loadData()
  }

  const updateStreak = async () => {
    // Smart streak: count active days this week
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const ds = weekStart.toISOString().split('T')[0]

    // Count days with either a completed goal or a workout this week
    let activeDays = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(d.getDate() + i)
      if (d > new Date()) break
      const dStr = d.toISOString().split('T')[0]
      const { data: dg } = await supabase.from('daily_goals').select('completed').eq('user_id', user.id).eq('date', dStr).maybeSingle()
      const { count: wc } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', dStr + 'T00:00:00').lt('started_at', dStr + 'T23:59:59')
      if (dg?.completed || (wc || 0) > 0) activeDays++
    }

    const weeklyGoal = profile?.weekly_workout_goal || 3
    if (activeDays >= weeklyGoal) {
      const newStreak = (profile?.current_streak || 0) + 1
      await supabase.from('profiles').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, profile?.longest_streak || 0),
      }).eq('id', user.id)
    }
  }

  const updateWeeklyGoal = async (val) => {
    await supabase.from('profiles').update({ weekly_workout_goal: val }).eq('id', user.id)
    await loadData()
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const progressPct = goal ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0
  const weekActiveDays = weekHistory.filter(d => d.goalCompleted || d.hadWorkout).length

  return (
    <div>
      {/* Streak Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-black">{profile?.current_streak || 0} 🔥</div>
            <div className="text-orange-100 text-sm mt-1">Week Streak</div>
          </div>
          <div className="text-right">
            <div className="text-orange-100 text-xs">Weekly Goal</div>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button key={n} onClick={() => updateWeeklyGoal(n)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${n === (profile?.weekly_workout_goal || 3) ? 'bg-white text-orange-500' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="text-orange-100 text-[10px] mt-1">{profile?.weekly_workout_goal || 3} days/week to keep streak</div>
          </div>
        </div>

        {/* Week dots */}
        <div className="flex gap-2 mt-4">
          {weekHistory.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                d.goalCompleted || d.hadWorkout ? 'bg-white text-orange-500' :
                d.isToday ? 'bg-white/30 text-white ring-2 ring-white' : 'bg-white/10 text-white/50'
              }`}>
                {d.goalCompleted || d.hadWorkout ? '✓' : ''}
              </div>
              <div className={`text-[9px] ${d.isToday ? 'text-white font-bold' : 'text-orange-200'}`}>{d.day}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-orange-100 mt-2">{weekActiveDays}/{profile?.weekly_workout_goal || 3} days this week</div>
      </div>

      {/* Today's Goal */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-base font-bold text-dark mb-4">Today's Goal</h2>

        {goal ? (
          <div>
            <div className="text-center mb-6">
              <div className="text-3xl font-black text-dark">{goal.title}</div>
              <div className="text-muted text-sm mt-1">{goal.current_value} / {goal.target_value} {goal.unit}</div>
            </div>

            {/* Progress Ring */}
            <div className="flex justify-center mb-6">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f2f5" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={goal.completed ? '#22c55e' : '#38bdf8'} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={`${progressPct * 2.639} 263.9`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-black text-dark">{Math.round(progressPct)}%</div>
                    {goal.completed && <div className="text-green-500 text-xs font-bold">Done! ✓</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Buttons */}
            {!goal.completed && (
              <div className="space-y-3">
                {goal.goal_type === 'reps' && (
                  <div className="flex gap-2 justify-center">
                    {[1, 5, 10, 25].map(n => (
                      <button key={n} onClick={() => updateProgress(goal.current_value + n)}
                        className="px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-sm font-bold hover:bg-sky-100">+{n}</button>
                    ))}
                  </div>
                )}
                {goal.goal_type === 'time' && (
                  <div className="flex gap-2 justify-center">
                    {[10, 30, 60, 120].map(n => (
                      <button key={n} onClick={() => updateProgress(goal.current_value + n)}
                        className="px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-sm font-bold hover:bg-sky-100">+{n}s</button>
                    ))}
                  </div>
                )}
                {goal.goal_type === 'distance' && (
                  <div className="flex gap-2 justify-center">
                    {[100, 500, 1000, 2500].map(n => (
                      <button key={n} onClick={() => updateProgress(goal.current_value + n)}
                        className="px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-sm font-bold hover:bg-sky-100">+{n >= 1000 ? `${n / 1000}k` : n}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center justify-center">
                  <input type="number" placeholder="Custom value" onChange={e => updateProgress(parseInt(e.target.value) || 0)}
                    className="w-32 bg-surface border border-border rounded-xl px-3 py-2 text-dark text-sm text-center focus:outline-none focus:border-sky-400" />
                  <button onClick={() => updateProgress(goal.target_value)}
                    className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold hover:bg-green-100">Complete ✓</button>
                </div>
              </div>
            )}

            <button onClick={() => { setGoal(null); setShowCreate(false) }}
              className="w-full mt-4 py-2 text-muted text-xs hover:text-dark">Change today's goal</button>
          </div>
        ) : (
          <div>
            {/* Quick Goals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {QUICK_GOALS.map((qg, i) => (
                <button key={i} onClick={() => setQuickGoal(qg)}
                  className="p-3 bg-surface rounded-xl hover:bg-sky-50 hover:border-sky-200 border border-transparent transition-all text-center">
                  <div className="text-xl mb-1">{qg.icon}</div>
                  <div className="text-xs font-semibold text-dark">{qg.title}</div>
                </button>
              ))}
            </div>

            {/* Custom Goal */}
            <div className="border-t border-border pt-4">
              {showCreate ? (
                <div className="space-y-3">
                  <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Goal title"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
                  <div className="flex gap-3">
                    <select value={customType} onChange={e => setCustomType(e.target.value)}
                      className="bg-surface border border-border rounded-xl px-3 py-3 text-dark text-sm">
                      <option value="reps">Reps</option><option value="time">Seconds</option><option value="distance">Steps</option>
                    </select>
                    <input type="number" value={customTarget} onChange={e => setCustomTarget(e.target.value)} placeholder="Target"
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-xl text-muted text-sm">Cancel</button>
                    <button onClick={setCustomGoal} disabled={!customTitle.trim() || !customTarget}
                      className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">Set Goal</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCreate(true)}
                  className="w-full py-3 border border-dashed border-border rounded-xl text-muted text-sm hover:border-sky-300 hover:text-sky-500">
                  + Create Custom Goal
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}