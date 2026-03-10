import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const CATEGORY_LABELS = { strength: 'Strength', endurance: 'Endurance', skill: 'Skill', hybrid: 'Hybrid' }

export default function TrainTab({ onStartWorkout, onGoToExplore }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weekHistory, setWeekHistory] = useState([])

  // Generator
  const [methods, setMethods] = useState([])
  const [generatedMethod, setGeneratedMethod] = useState(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [genCategory, setGenCategory] = useState('all')

  // Save generated workout
  const [showSaveGen, setShowSaveGen] = useState(false)
  const [saveGenName, setSaveGenName] = useState('')
  const [savingGen, setSavingGen] = useState(false)
  const [savedGen, setSavedGen] = useState(false)

  // Edit workout
  const [editingId, setEditingId] = useState(null)
  const [editConfigs, setEditConfigs] = useState({})
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

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
      const { count: wc } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('started_at', ds + 'T00:00:00').lt('started_at', ds + 'T23:59:59')
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
    if (genCategory !== 'all') pool = pool.filter(m => m.category === genCategory)
    if (pool.length === 0) { setGeneratedMethod(null); return }
    setGeneratedMethod(pool[Math.floor(Math.random() * pool.length)])
    setSavedGen(false); setShowSaveGen(false); setSaveGenName('')
  }

  const handleSaveGenerated = async () => {
    if (!saveGenName.trim() || !generatedMethod) return
    setSavingGen(true)
    await supabase.from('workouts').insert({
      name: saveGenName,
      created_by: user.id,
      difficulty: 'intermediate',
      estimated_duration: generatedMethod.duration_min || 30,
      tags: [generatedMethod.name],
    })
    setSavingGen(false); setSavedGen(true)
    setTimeout(() => { setShowSaveGen(false); setSavedGen(false); setSaveGenName('') }, 1800)
    await loadData()
  }

  const startEdit = (w) => {
    setEditingId(w.id)
    setEditName(w.name)
    const cfg = {}
    ;(w.workout_exercises || []).forEach(we => {
      cfg[we.id] = { sets: we.target_sets, reps: we.target_reps, time: we.target_time_seconds, rest: we.rest_seconds }
    })
    setEditConfigs(cfg)
    setEditSaved(false)
  }

  const handleEditSave = async (w) => {
    setEditSaving(true)
    await supabase.from('workouts').update({ name: editName }).eq('id', w.id)
    await Promise.all(
      (w.workout_exercises || []).map(we => {
        const cfg = editConfigs[we.id] || {}
        return supabase.from('workout_exercises').update({
          target_sets: cfg.sets, target_reps: cfg.reps,
          target_time_seconds: cfg.time, rest_seconds: cfg.rest,
        }).eq('id', we.id)
      })
    )
    setEditSaving(false); setEditSaved(true)
    setTimeout(() => { setEditingId(null); setEditSaved(false); loadData() }, 1200)
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const weekActive = weekHistory.filter(d => d.active).length

  return (
    <div className="space-y-5">
      {/* Compact Streak Bar */}
      <div className="bg-white border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black text-dark">{profile?.current_streak || 0}</div>
            <div>
              <div className="text-xs font-bold text-dark leading-none">Week Streak 🔥</div>
              <div className="text-[10px] text-muted mt-0.5">Longest: {profile?.longest_streak || 0} wks</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-dark">{weekActive}<span className="text-muted font-normal">/7</span></div>
            <div className="text-[10px] text-muted">this week</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {weekHistory.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 ${d.active ? 'bg-red-500' : d.isToday ? 'bg-red-200' : 'bg-surface'}`} />
              <div className={`text-[8px] font-medium ${d.isToday ? 'text-red-500' : 'text-dim'}`}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Random Method Generator */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <button onClick={() => setShowGenerator(!showGenerator)}
          className="w-full p-4 flex items-center justify-between hover:bg-surface/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-xl shadow-sm">🎲</div>
            <div className="text-left">
              <div className="text-sm font-bold text-dark">Random Method Generator</div>
              <div className="text-[10px] text-muted">Not sure what to train? Let us pick for you</div>
            </div>
          </div>
          <span className={`text-dim text-xs transition-transform ${showGenerator ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showGenerator && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            {/* Category only filter */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {['all', 'strength', 'endurance', 'skill', 'hybrid'].map(c => (
                <button key={c} onClick={() => setGenCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${genCategory === c ? 'bg-dark text-white' : 'bg-surface text-muted border border-border hover:border-red-200'}`}>
                  {c === 'all' ? 'Any Focus' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>

            <button onClick={generateRandom}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-bold hover:from-red-600 hover:to-red-700 shadow-md shadow-red-100 transition-all mb-4">
              🎲 Generate Method
            </button>

            {/* Generated Result */}
            {generatedMethod && (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-sm">
                      {generatedMethod.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-bold text-dark">{generatedMethod.name}</div>
                      <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        {CATEGORY_LABELS[generatedMethod.category]}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3 leading-relaxed">{generatedMethod.short_description}</p>

                  {/* Steps preview */}
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <div className="text-[10px] font-bold text-dark mb-1.5">How it works</div>
                    <div className="space-y-1">
                      {generatedMethod.how_it_works.split(/\d+\.\s/).filter(Boolean).slice(0, 3).map((step, i) => {
                        const words = step.trim().split(' ')
                        return (
                          <div key={i} className="flex gap-2 text-[10px] text-muted">
                            <span className="text-red-500 font-bold flex-shrink-0">{i + 1}.</span>
                            <span><strong className="text-dark">{words[0]}</strong>{words.length > 1 ? ' ' + words.slice(1).join(' ') : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {generatedMethod.default_exercises?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {generatedMethod.default_exercises.map((e, i) => (
                        <span key={i} className="text-[9px] bg-white text-dark px-2 py-0.5 rounded border border-border">{e}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={generateRandom}
                      className="flex-1 py-2.5 border border-border rounded-xl text-muted text-xs font-medium hover:bg-white transition-all">
                      🎲 Reroll
                    </button>
                    <button onClick={() => onGoToExplore?.('methods')}
                      className="flex-1 py-2.5 border border-red-200 text-red-500 bg-red-50 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                      Explore in detail →
                    </button>
                  </div>
                </div>

                {/* Save to Workouts */}
                {!savedGen ? (
                  <div className="border-t border-border p-3">
                    {showSaveGen ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={saveGenName}
                          onChange={e => setSaveGenName(e.target.value)}
                          placeholder="Workout name..."
                          className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-xs text-dark focus:outline-none focus:border-red-400"
                          autoFocus
                        />
                        <button onClick={handleSaveGenerated} disabled={savingGen || !saveGenName.trim()}
                          className="px-4 py-2 bg-dark text-white rounded-lg text-xs font-bold disabled:opacity-30">
                          {savingGen ? '...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setShowSaveGen(true); setSaveGenName(generatedMethod.name) }}
                        className="w-full py-2.5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all">
                        + Save to My Workouts
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border p-3 text-center">
                    <span className="text-xs text-green-500 font-bold">✓ Saved to My Workouts!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* My Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-dark">My Workouts</h2>
          <span className="text-xs text-muted">{workouts.length}</span>
        </div>

        {workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map(w => {
              const isEditing = editingId === w.id
              const exList = (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index)

              return (
                <div key={w.id} className="bg-white border border-border rounded-2xl overflow-hidden transition-shadow hover:shadow-md">
                  {/* Header row */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="text-sm font-bold text-dark bg-surface border border-border rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-red-400" />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-dark">{w.name}</h3>
                          {w.estimated_duration && <span className="text-[9px] text-dim">~{w.estimated_duration}min</span>}
                        </div>
                      )}
                      {!isEditing && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {exList.slice(0, 4).map((we, i) => (
                            <span key={i} className="text-[9px] bg-surface text-dim px-2 py-0.5 rounded-md">{we.exercises?.name}</span>
                          ))}
                          {exList.length > 4 && <span className="text-[9px] text-dim">+{exList.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => setEditingId(null)} className="text-muted text-xs hover:text-dark p-1">Cancel</button>
                          {editSaved
                            ? <span className="text-green-500 text-xs font-bold">✓</span>
                            : <button onClick={() => handleEditSave(w)} disabled={editSaving}
                                className="py-2 px-4 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-40">
                                {editSaving ? '...' : 'Save'}
                              </button>
                          }
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleDelete(w.id)} className="text-dim hover:text-red-500 text-xs p-1 rounded-lg hover:bg-red-50 transition-all">🗑</button>
                          <button onClick={() => startEdit(w)} className="text-dim hover:text-dark text-xs p-1 rounded-lg hover:bg-surface transition-all">✏️</button>
                          <button onClick={() => handleStart(w)}
                            className="py-2.5 px-4 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-sm transition-all">
                            ▶ Start
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit Panel */}
                  {isEditing && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-2 max-h-72 overflow-y-auto">
                      {exList.map(we => {
                        const cfg = editConfigs[we.id] || {}
                        const isTime = we.exercises?.tracking_type === 'time'
                        return (
                          <div key={we.id} className="bg-surface rounded-xl p-3 flex items-center gap-3">
                            <span className="text-xs font-semibold text-dark flex-1 truncate">{we.exercises?.name}</span>
                            <div className="flex gap-2 flex-shrink-0">
                              <div className="text-center">
                                <div className="text-[8px] text-dim mb-0.5">Sets</div>
                                <input type="number" value={cfg.sets || 3}
                                  onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], sets: parseInt(e.target.value) || 0 } }))}
                                  className="w-12 bg-white border border-border rounded px-1 py-1 text-[10px] text-center focus:outline-none focus:border-red-400" />
                              </div>
                              <div className="text-center">
                                <div className="text-[8px] text-dim mb-0.5">{isTime ? 'Sec' : 'Reps'}</div>
                                <input type="number" value={isTime ? (cfg.time || '') : (cfg.reps || '')}
                                  onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], [isTime ? 'time' : 'reps']: parseInt(e.target.value) || 0 } }))}
                                  className="w-12 bg-white border border-border rounded px-1 py-1 text-[10px] text-center focus:outline-none focus:border-red-400" />
                              </div>
                              <div className="text-center">
                                <div className="text-[8px] text-dim mb-0.5">Rest</div>
                                <input type="number" value={cfg.rest || 60}
                                  onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], rest: parseInt(e.target.value) || 0 } }))}
                                  className="w-12 bg-white border border-border rounded px-1 py-1 text-[10px] text-center focus:outline-none focus:border-red-400" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
