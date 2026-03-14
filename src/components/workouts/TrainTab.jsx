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

  // Workout detail modal
  const [detailWorkout, setDetailWorkout] = useState(null)
  const [editName, setEditName] = useState('')
  const [editConfigs, setEditConfigs] = useState({})
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

  const toggleFavoriteWorkout = async (w) => {
    const newVal = !w.is_favorited
    await supabase.from('workouts').update({ is_favorited: newVal }).eq('id', w.id)
    setWorkouts(prev => prev.map(wo => wo.id === w.id ? { ...wo, is_favorited: newVal } : wo))
  }

  const openDetail = (w) => {
    setDetailWorkout(w)
    setEditName(w.name)
    const cfg = {}
    ;(w.workout_exercises || []).forEach(we => {
      cfg[we.id] = { sets: we.target_sets, reps: we.target_reps, time: we.target_time_seconds, rest: we.rest_seconds, notes: '' }
    })
    setEditConfigs(cfg)
    setEditSaved(false)
  }

  const handleEditSave = async () => {
    if (!detailWorkout) return
    setEditSaving(true)
    await supabase.from('workouts').update({ name: editName }).eq('id', detailWorkout.id)
    await Promise.all(
      (detailWorkout.workout_exercises || []).map(we => {
        const cfg = editConfigs[we.id] || {}
        return supabase.from('workout_exercises').update({
          target_sets: cfg.sets, target_reps: cfg.reps,
          target_time_seconds: cfg.time, rest_seconds: cfg.rest,
        }).eq('id', we.id)
      })
    )
    setEditSaving(false); setEditSaved(true)
    setTimeout(() => { setDetailWorkout(null); setEditSaved(false); loadData() }, 1200)
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
      name: saveGenName, created_by: user.id, difficulty: 'intermediate',
      estimated_duration: generatedMethod.duration_min || 30, tags: [generatedMethod.name],
    })
    setSavingGen(false); setSavedGen(true)
    setTimeout(() => { setShowSaveGen(false); setSavedGen(false); setSaveGenName('') }, 1800)
    await loadData()
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const weekActive = weekHistory.filter(d => d.active).length
  const favoritedWorkouts = workouts.filter(w => w.is_favorited)

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
                    <button onClick={() => onGoToExplore?.('methods', generatedMethod.id)}
                      className="flex-1 py-2.5 border border-red-200 text-red-500 bg-red-50 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                      Explore in detail →
                    </button>
                  </div>
                </div>

                {!savedGen ? (
                  <div className="border-t border-border p-3">
                    {showSaveGen ? (
                      <div className="flex gap-2">
                        <input type="text" value={saveGenName} onChange={e => setSaveGenName(e.target.value)}
                          placeholder="Workout name..." autoFocus
                          className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-xs text-dark focus:outline-none focus:border-red-400" />
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

      {/* Favorited Workouts */}
      {favoritedWorkouts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-black text-dark">⭐ Favorited</h2>
            <span className="text-xs text-muted">{favoritedWorkouts.length}</span>
          </div>
          <div className="space-y-3">
            {favoritedWorkouts.map(w => (
              <WorkoutCard key={w.id} w={w} onDetail={openDetail} onDelete={handleDelete}
                onStart={handleStart} onToggleFav={toggleFavoriteWorkout} />
            ))}
          </div>
        </div>
      )}

      {/* My Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-dark">My Workouts</h2>
          <span className="text-xs text-muted">{workouts.length}</span>
        </div>

        {workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map(w => (
              <WorkoutCard key={w.id} w={w} onDetail={openDetail} onDelete={handleDelete}
                onStart={handleStart} onToggleFav={toggleFavoriteWorkout} />
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

      {/* Workout Detail Modal */}
      {detailWorkout && (
        <WorkoutDetailModal
          workout={detailWorkout}
          editName={editName} setEditName={setEditName}
          editConfigs={editConfigs} setEditConfigs={setEditConfigs}
          editSaving={editSaving} editSaved={editSaved}
          onSave={handleEditSave}
          onClose={() => setDetailWorkout(null)}
        />
      )}
    </div>
  )
}

function addToGoogleCalendar(w) {
  const now = new Date()
  // Default to tomorrow 8am
  const start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(8, 0, 0, 0)
  const end = new Date(start); end.setMinutes(end.getMinutes() + (w.estimated_duration || 45))
  const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0]
  const exList = (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index)
  const details = exList.map(we => {
    const name = we.exercises?.name || 'Exercise'
    const sets = we.target_sets ? `${we.target_sets} sets` : ''
    const reps = we.target_reps ? `× ${we.target_reps} reps` : ''
    return `• ${name} ${sets} ${reps}`.trim()
  }).join('\n')
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🏋️ ' + w.name)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Gainly Workout\n\n' + details)}`
  window.open(url, '_blank')
}

function WorkoutCard({ w, onDetail, onDelete, onStart, onToggleFav }) {
  const exList = (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index)
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 onClick={() => onDetail(w)} className="text-sm font-bold text-dark hover:underline cursor-pointer">{w.name}</h3>
            {w.estimated_duration && <span className="text-[9px] text-dim">~{w.estimated_duration}min</span>}
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {exList.slice(0, 4).map((we, i) => (
              <span key={i} className="text-[9px] bg-surface text-dim px-2 py-0.5 rounded-md">{we.exercises?.name}</span>
            ))}
            {exList.length > 4 && <span className="text-[9px] text-dim">+{exList.length - 4}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button onClick={() => onToggleFav(w)}
            className={`text-base leading-none hover:scale-110 transition-transform ${w.is_favorited ? 'text-red-500' : 'text-muted'}`}
            title={w.is_favorited ? 'Unfavorite' : 'Favorite'}>
            {w.is_favorited ? '♥' : '♡'}
          </button>
          <button onClick={() => addToGoogleCalendar(w)} className="text-dim hover:text-blue-500 text-xs p-1 rounded-lg hover:bg-blue-50 transition-all" title="Add to Google Calendar">📅</button>
          <button onClick={() => onDelete(w.id)} className="text-dim hover:text-red-500 text-xs p-1 rounded-lg hover:bg-red-50 transition-all">🗑</button>
          <button onClick={() => onDetail(w)} className="text-dim hover:text-dark text-xs p-1 rounded-lg hover:bg-surface transition-all">✏️</button>
          <button onClick={() => onStart(w)}
            className="py-2.5 px-4 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-sm transition-all">
            ▶ Start
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkoutDetailModal({ workout, editName, setEditName, editConfigs, setEditConfigs, editSaving, editSaved, onSave, onClose }) {
  const exList = (workout.workout_exercises || []).sort((a, b) => a.order_index - b.order_index)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-[10px] text-muted mb-1 font-semibold tracking-wider">WORKOUT DETAILS</div>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              className="text-lg font-bold text-dark bg-transparent focus:outline-none border-b-2 border-transparent focus:border-red-400 w-full transition-colors" />
          </div>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface flex-shrink-0">&times;</button>
        </div>

        {/* Exercise rows */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {exList.length === 0 && (
            <div className="text-center py-10 text-muted text-sm">No exercises in this workout yet.</div>
          )}
          {exList.map((we, idx) => {
            const cfg = editConfigs[we.id] || {}
            const isTime = we.exercises?.tracking_type === 'time'
            return (
              <div key={we.id} className="bg-surface rounded-2xl p-4 border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black">{idx + 1}</span>
                  </div>
                  <div className="font-bold text-dark">{we.exercises?.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">Sets</label>
                    <input type="number" value={cfg.sets || 3}
                      onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], sets: parseInt(e.target.value) || 0 } }))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">{isTime ? 'Seconds' : 'Reps'}</label>
                    <input type="number" value={isTime ? (cfg.time || '') : (cfg.reps || '')}
                      onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], [isTime ? 'time' : 'reps']: parseInt(e.target.value) || 0 } }))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 font-medium">Rest (s)</label>
                    <input type="number" value={cfg.rest || 60}
                      onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], rest: parseInt(e.target.value) || 0 } }))}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5 font-medium">Notes</label>
                  <textarea value={cfg.notes || ''}
                    onChange={e => setEditConfigs(c => ({ ...c, [we.id]: { ...c[we.id], notes: e.target.value } }))}
                    rows={2} placeholder="e.g. Focus on form, slow eccentric..."
                    className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 resize-none" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface transition-all">Cancel</button>
          {editSaved ? (
            <div className="flex-1 text-center py-3 text-green-500 font-bold text-sm">✓ Saved!</div>
          ) : (
            <button onClick={onSave} disabled={editSaving}
              className="flex-1 py-3 bg-dark text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-30 transition-all">
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
