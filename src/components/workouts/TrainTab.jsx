import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function TrainTab({ onStartWorkout }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weekHistory, setWeekHistory] = useState([])

  // Random Method Generator
  const [methods, setMethods] = useState([])
  const [generatedMethod, setGeneratedMethod] = useState(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [genFilter, setGenFilter] = useState({ category: 'all', difficulty: 'all', duration: 'all' })

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    const [{ data: w }, { data: p }, { data: m }] = await Promise.all([
      supabase.from('workouts').select('*, workout_exercises(*, exercises(*))').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('current_streak, longest_streak, weekly_workout_goal').eq('id', user.id).single(),
      supabase.from('training_methods').select('*'),
    ])
    setWorkouts(w || [])
    setProfile(p)
    setMethods(m || [])

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

  const generateRandom = () => {
    let pool = [...methods]
    if (genFilter.category !== 'all') pool = pool.filter(m => m.category === genFilter.category)
    if (genFilter.difficulty !== 'all') pool = pool.filter(m => m.difficulty === genFilter.difficulty)
    if (genFilter.duration !== 'all') {
      const [min, max] = genFilter.duration === 'short' ? [0, 15] : genFilter.duration === 'medium' ? [10, 25] : [20, 60]
      pool = pool.filter(m => m.duration_min <= max && m.duration_max >= min)
    }
    if (pool.length === 0) { setGeneratedMethod(null); return }
    setGeneratedMethod(pool[Math.floor(Math.random() * pool.length)])
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const weekActive = weekHistory.filter(d => d.active).length
  const CATEGORY_LABELS = { strength: 'Strength', endurance: 'Endurance', skill: 'Skill', hybrid: 'Hybrid' }

  return (
    <div className="space-y-6">
      {/* Streak Banner */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-3xl font-black">{profile?.current_streak || 0} <span className="text-red-200">wks</span></div>
            <div className="text-red-100 text-xs mt-1">Week Streak</div>
          </div>
          <div className="text-right text-red-100 text-xs">{profile?.weekly_workout_goal || 3} days/week goal</div>
        </div>
        <div className="flex gap-2">
          {weekHistory.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 ${d.active ? 'bg-white text-red-500' : d.isToday ? 'bg-white/25 text-white ring-2 ring-white' : 'bg-white/10 text-white/40'}`}>
                {d.active ? '\u2713' : ''}
              </div>
              <div className={`text-[8px] ${d.isToday ? 'text-white font-bold' : 'text-red-200'}`}>{d.day}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] text-red-100 mt-2">{weekActive}/{profile?.weekly_workout_goal || 3} this week</div>
      </div>

      {/* Random Method Generator */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <button onClick={() => setShowGenerator(!showGenerator)}
          className="w-full p-5 flex items-center justify-between hover:bg-red-50/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">&#127922;</div>
            <div className="text-left">
              <div className="text-sm font-bold text-dark">Random Method Generator</div>
              <div className="text-[10px] text-muted">Not sure what to train? Let us pick a method for you</div>
            </div>
          </div>
          <span className={`text-dim text-xs transition-transform ${showGenerator ? 'rotate-180' : ''}`}>&darr;</span>
        </button>

        {showGenerator && (
          <div className="px-5 pb-5 border-t border-border pt-4">
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={genFilter.category} onChange={e => setGenFilter(p => ({ ...p, category: e.target.value }))}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
                <option value="all">Any focus</option>
                <option value="strength">Strength</option>
                <option value="endurance">Endurance</option>
                <option value="skill">Skill</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select value={genFilter.difficulty} onChange={e => setGenFilter(p => ({ ...p, difficulty: e.target.value }))}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
                <option value="all">Any level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <select value={genFilter.duration} onChange={e => setGenFilter(p => ({ ...p, duration: e.target.value }))}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-dark">
                <option value="all">Any duration</option>
                <option value="short">Quick (&lt;15 min)</option>
                <option value="medium">Medium (10-25 min)</option>
                <option value="long">Long (20+ min)</option>
              </select>
            </div>

            <button onClick={generateRandom}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-bold hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-200 transition-all mb-4">
              &#127922; Generate Random Method
            </button>

            {/* Generated Result */}
            {generatedMethod && (
              <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-lg font-black text-red-500">
                    {generatedMethod.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-base font-bold text-dark">{generatedMethod.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">{CATEGORY_LABELS[generatedMethod.category]}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${generatedMethod.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : generatedMethod.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{generatedMethod.difficulty}</span>
                      <span className="text-[9px] text-dim">{generatedMethod.duration_min}-{generatedMethod.duration_max} min</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted mb-3">{generatedMethod.short_description}</p>

                {/* How it works preview */}
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="text-[10px] font-bold text-dark mb-1.5">How it works:</div>
                  <div className="space-y-1">
                    {generatedMethod.how_it_works.split(/\d+\.\s/).filter(Boolean).slice(0, 4).map((step, i) => (
                      <div key={i} className="flex gap-2 text-[10px] text-muted">
                        <span className="text-red-500 font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{step.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended exercises */}
                {generatedMethod.default_exercises?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {generatedMethod.default_exercises.map((e, i) => (
                      <span key={i} className="text-[9px] bg-surface text-dark px-2 py-0.5 rounded border border-border">{e}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={generateRandom} className="flex-1 py-2.5 border border-border rounded-xl text-muted text-xs font-medium hover:bg-surface">&#127922; Reroll</button>
                  <button className="flex-1 py-2.5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600">Explore in detail &rarr;</button>
                </div>
              </div>
            )}
          </div>
        )}
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
                    <button onClick={() => handleDelete(w.id)} className="opacity-0 group-hover:opacity-100 text-dim hover:text-red-500 text-xs transition-all p-1">&#128465;</button>
                    <button onClick={() => handleStart(w)}
                      className="py-2.5 px-5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-lg transition-all">
                      &#9654; Start
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white border border-border rounded-2xl">
            <div className="text-3xl mb-2">&#127947;</div>
            <p className="text-sm text-muted mb-1">No workouts yet</p>
            <p className="text-xs text-dim">Go to Build to create your first workout</p>
          </div>
        )}
      </div>
    </div>
  )
}