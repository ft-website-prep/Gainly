import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function TrainTab({ onStartWorkout }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weekHistory, setWeekHistory] = useState([])
  const [randomConfig, setRandomConfig] = useState(false)
  const [rndCategory, setRndCategory] = useState('all')
  const [rndDiff, setRndDiff] = useState('all')
  const [rndCount, setRndCount] = useState(5)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from('workouts').select('*, workout_exercises(*, exercises(*))').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('current_streak, longest_streak, weekly_workout_goal').eq('id', user.id).single(),
    ])
    setWorkouts(w || [])
    setProfile(p)

    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const { count: wc } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', ds + 'T00:00:00').lt('started_at', ds + 'T23:59:59')
      days.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), active: (wc || 0) > 0, isToday: i === 0 })
    }
    setWeekHistory(days)
    setLoading(false)
  }

  const handleStart = (w) => {
    const exercises = (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index).map(we => ({
      exercise_id: we.exercise_id, name: we.exercises?.name, tracking_type: we.exercises?.tracking_type,
      is_static_hold: we.exercises?.is_static_hold, target_sets: we.target_sets,
      target_reps: we.target_reps, target_time_seconds: we.target_time_seconds, rest_seconds: we.rest_seconds,
    }))
    onStartWorkout({ workoutId: w.id, workoutName: w.name, exercises })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout?')) return
    await supabase.from('workouts').delete().eq('id', id)
    await loadData()
  }

  const handleRandom = async () => {
    let query = supabase.from('exercises').select('*')
    if (rndCategory !== 'all') query = query.eq('category', rndCategory)
    if (rndDiff !== 'all') query = query.eq('difficulty', rndDiff)
    const { data: ex } = await query.limit(100)
    if (!ex || ex.length === 0) return

    const shuffled = ex.sort(() => Math.random() - 0.5).slice(0, Math.min(rndCount, ex.length))
    const exercises = shuffled.map(e => ({
      exercise_id: e.id, name: e.name, tracking_type: e.tracking_type, is_static_hold: e.is_static_hold,
      target_sets: 3, target_reps: e.tracking_type === 'reps' ? (e.difficulty === 'beginner' ? 12 : e.difficulty === 'intermediate' ? 10 : 8) : null,
      target_time_seconds: e.tracking_type === 'time' ? (e.difficulty === 'beginner' ? 30 : 20) : null, rest_seconds: 60,
    }))
    onStartWorkout({ workoutId: null, workoutName: 'Random Workout', exercises })
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const weekActive = weekHistory.filter(d => d.active).length

  return (
    <div className="space-y-6">
      {/* Streak Banner */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-3xl font-black">{profile?.current_streak || 0} 🔥</div>
            <div className="text-orange-100 text-xs mt-1">Week Streak</div>
          </div>
          <div className="text-right text-orange-100 text-xs">{profile?.weekly_workout_goal || 3} days/week goal</div>
        </div>
        <div className="flex gap-2">
          {weekHistory.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 ${d.active ? 'bg-white text-orange-500' : d.isToday ? 'bg-white/25 text-white ring-2 ring-white' : 'bg-white/10 text-white/40'}`}>
                {d.active ? '✓' : ''}
              </div>
              <div className={`text-[8px] ${d.isToday ? 'text-white font-bold' : 'text-orange-200'}`}>{d.day}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] text-orange-100 mt-2">{weekActive}/{profile?.weekly_workout_goal || 3} this week</div>
      </div>

      {/* Random Generator */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-dark flex items-center gap-2">🎲 Random Workout</h3>
          <button onClick={() => setRandomConfig(!randomConfig)} className="text-[10px] text-red-500 font-medium">
            {randomConfig ? 'Hide options' : 'Options'}
          </button>
        </div>

        {randomConfig && (
          <div className="flex gap-3 mb-3 flex-wrap">
            <select value={rndCategory} onChange={e => setRndCategory(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
              <option value="all">All categories</option>
              {['push', 'pull', 'legs', 'core', 'cardio', 'flexibility'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <select value={rndDiff} onChange={e => setRndDiff(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
              <option value="all">All levels</option>
              {['beginner', 'intermediate', 'advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
            <select value={rndCount} onChange={e => setRndCount(parseInt(e.target.value))}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
              {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} exercises</option>)}
            </select>
          </div>
        )}

        <button onClick={handleRandom}
          className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-bold hover:from-sky-600 hover:to-blue-600 shadow-lg shadow-red-200 transition-all">
          🎲 Generate & Start
        </button>
      </div>

      {/* My Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-dark">My Workouts</h2>
          <span className="text-xs text-muted">{workouts.length} workouts</span>
        </div>

        {workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map(w => (
              <div key={w.id} className="bg-white border border-border rounded-2xl p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-dark truncate">{w.name}</h3>
                      {w.difficulty && <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${w.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : w.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{w.difficulty}</span>}
                      {w.estimated_duration && <span className="text-[10px] text-dim flex-shrink-0">~{w.estimated_duration}min</span>}
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {(w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index).slice(0, 5).map((we, i) => (
                        <span key={i} className="text-[10px] bg-surface text-dim px-2 py-0.5 rounded-md">{we.exercises?.name}</span>
                      ))}
                      {(w.workout_exercises?.length || 0) > 5 && <span className="text-[10px] text-dim">+{w.workout_exercises.length - 5}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button onClick={() => handleDelete(w.id)} className="opacity-0 group-hover:opacity-100 text-dim hover:text-red-500 text-xs transition-all p-1">🗑️</button>
                    <button onClick={() => handleStart(w)}
                      className="py-2.5 px-5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-lg transition-all">
                      ▶ Start
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white border border-border rounded-2xl">
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-sm text-muted mb-1">No workouts yet</p>
            <p className="text-xs text-dim">Go to Build to create your first workout</p>
          </div>
        )}
      </div>
    </div>
  )
}