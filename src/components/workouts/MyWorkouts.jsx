import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// EXERCISE PICKER MODAL
// =============================================
function ExercisePicker({ onSelect, onClose, selected = [] }) {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [equipFilter, setEquipFilter] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadExercises() }, [])

  const loadExercises = async () => {
    const { data } = await supabase.from('exercises').select('*').order('name')
    setExercises(data || [])
    setLoading(false)
  }

  const allEquipment = [...new Set(exercises.flatMap(e => e.equipment_required || []).filter(Boolean))]
  const CATEGORIES = ['all', 'push', 'pull', 'legs', 'core', 'cardio', 'flexibility']

  const filtered = exercises.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (equipFilter.length > 0) {
      const req = e.equipment_required || []
      if (req.length > 0 && !req.every(r => equipFilter.includes(r))) return false
    }
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-dark">Add Exercise</h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button>
        </div>

        {/* Search + Filters */}
        <div className="p-4 border-b border-border space-y-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400" />
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${catFilter === c ? 'bg-sky-100 text-sky-600' : 'bg-surface text-muted'}`}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          {allEquipment.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {allEquipment.map(eq => (
                <button key={eq} onClick={() => setEquipFilter(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq])}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${equipFilter.includes(eq) ? 'bg-amber-100 text-amber-700' : 'bg-surface text-dim'}`}>
                  {eq.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {loading ? <div className="text-center py-8 text-muted text-sm">Loading...</div> : (
            filtered.length > 0 ? filtered.map(ex => {
              const isSelected = selected.includes(ex.id)
              return (
                <button key={ex.id} onClick={() => !isSelected && onSelect(ex)}
                  disabled={isSelected}
                  className={`w-full text-left p-3 rounded-xl transition-all ${isSelected ? 'bg-sky-50 border border-sky-200 opacity-60' : 'bg-surface hover:bg-sky-50 border border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-dark">{ex.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-dim px-1.5 py-0.5 bg-white rounded">{ex.category}</span>
                        <span className="text-[10px] text-dim">{ex.tracking_type === 'time' ? '⏱️ Time' : '🔢 Reps'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{ex.difficulty}</span>
                      </div>
                    </div>
                    {isSelected ? <span className="text-sky-500 text-xs">✓ Added</span> : <span className="text-dim text-lg">+</span>}
                  </div>
                </button>
              )
            }) : <div className="text-center py-8 text-muted text-sm">No exercises found</div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// WORKOUT BUILDER MODAL
// =============================================
function WorkoutBuilder({ workout, onClose, onSave }) {
  const [name, setName] = useState(workout?.name || '')
  const [description, setDescription] = useState(workout?.description || '')
  const [difficulty, setDifficulty] = useState(workout?.difficulty || 'intermediate')
  const [category, setCategory] = useState(workout?.category || 'full_body')
  const [duration, setDuration] = useState(workout?.estimated_duration || 45)
  const [exercises, setExercises] = useState(workout?.exercises || [])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const addExercise = (ex) => {
    setExercises(prev => [...prev, {
      exercise_id: ex.id, name: ex.name, tracking_type: ex.tracking_type,
      target_sets: 3, target_reps: ex.tracking_type === 'reps' ? 10 : null,
      target_time_seconds: ex.tracking_type === 'time' ? 30 : null, rest_seconds: 60,
    }])
  }

  const updateExercise = (idx, field, value) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const removeExercise = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx))

  const moveExercise = (idx, dir) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= exercises.length) return
    const arr = [...exercises]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setExercises(arr)
  }

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return
    setSaving(true)
    await onSave({ name, description, difficulty, category, estimated_duration: duration, exercises })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-dark">{workout ? 'Edit Workout' : 'Create Workout'}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-muted mb-1.5">Workout Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Upper Body Blast"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 cursor-pointer">
                {['push', 'pull', 'legs', 'core', 'full_body', 'cardio', 'flexibility', 'skill'].map(c =>
                  <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 cursor-pointer">
                {['beginner', 'intermediate', 'advanced'].map(d =>
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Est. Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-dark">Exercises ({exercises.length})</label>
              <button onClick={() => setShowPicker(true)}
                className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-100">+ Add Exercise</button>
            </div>

            {exercises.length > 0 ? (
              <div className="space-y-2">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dim font-mono w-5">{idx + 1}.</span>
                        <span className="text-sm font-semibold text-dark">{ex.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} className="text-dim hover:text-dark text-xs disabled:opacity-30 p-1">↑</button>
                        <button onClick={() => moveExercise(idx, 1)} disabled={idx === exercises.length - 1} className="text-dim hover:text-dark text-xs disabled:opacity-30 p-1">↓</button>
                        <button onClick={() => removeExercise(idx)} className="text-dim hover:text-red-500 text-xs p-1 ml-1">✕</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-dim mb-1">Sets</label>
                        <input type="number" value={ex.target_sets} onChange={e => updateExercise(idx, 'target_sets', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-lg px-3 py-2 text-dark text-sm focus:outline-none focus:border-sky-400" />
                      </div>
                      {ex.tracking_type === 'reps' ? (
                        <div>
                          <label className="block text-[10px] text-dim mb-1">Target Reps</label>
                          <input type="number" value={ex.target_reps || ''} onChange={e => updateExercise(idx, 'target_reps', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-dark text-sm focus:outline-none focus:border-sky-400" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] text-dim mb-1">Target (sec)</label>
                          <input type="number" value={ex.target_time_seconds || ''} onChange={e => updateExercise(idx, 'target_time_seconds', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-dark text-sm focus:outline-none focus:border-sky-400" />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] text-dim mb-1">Rest (sec)</label>
                        <input type="number" value={ex.rest_seconds} onChange={e => updateExercise(idx, 'rest_seconds', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-lg px-3 py-2 text-dark text-sm focus:outline-none focus:border-sky-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-surface rounded-xl border border-dashed border-border">
                <div className="text-2xl mb-2">💪</div>
                <p className="text-sm text-muted">No exercises yet – add some!</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || exercises.length === 0}
            className="flex-1 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Workout'}
          </button>
        </div>
      </div>

      {showPicker && (
        <ExercisePicker
          selected={exercises.map(e => e.exercise_id)}
          onSelect={(ex) => { addExercise(ex); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// =============================================
// MY WORKOUTS (main component)
// =============================================
export default function MyWorkouts({ onStartWorkout }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editWorkout, setEditWorkout] = useState(null)

  useEffect(() => { if (user) loadWorkouts() }, [user])

  const loadWorkouts = async () => {
    const { data } = await supabase.from('workouts').select('*, workout_exercises(*, exercises(*))').eq('created_by', user.id).order('created_at', { ascending: false })
    setWorkouts(data || [])
    setLoading(false)
  }

  const handleSave = async ({ name, description, difficulty, category, estimated_duration, exercises }) => {
    if (editWorkout) {
      // Update existing
      await supabase.from('workouts').update({ name, description, difficulty, category, estimated_duration }).eq('id', editWorkout.id)
      await supabase.from('workout_exercises').delete().eq('workout_id', editWorkout.id)
      const rows = exercises.map((e, i) => ({ workout_id: editWorkout.id, exercise_id: e.exercise_id, order_index: i, target_sets: e.target_sets, target_reps: e.target_reps, target_time_seconds: e.target_time_seconds, rest_seconds: e.rest_seconds }))
      await supabase.from('workout_exercises').insert(rows)
    } else {
      // Create new
      const { data: w } = await supabase.from('workouts').insert({ name, description, difficulty, category, estimated_duration, created_by: user.id }).select().single()
      if (w) {
        const rows = exercises.map((e, i) => ({ workout_id: w.id, exercise_id: e.exercise_id, order_index: i, target_sets: e.target_sets, target_reps: e.target_reps, target_time_seconds: e.target_time_seconds, rest_seconds: e.rest_seconds }))
        await supabase.from('workout_exercises').insert(rows)
      }
    }
    setShowBuilder(false); setEditWorkout(null); await loadWorkouts()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout?')) return
    await supabase.from('workouts').delete().eq('id', id)
    await loadWorkouts()
  }

  const handleEdit = (w) => {
    setEditWorkout({
      ...w,
      exercises: (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index).map(we => ({
        exercise_id: we.exercise_id, name: we.exercises?.name, tracking_type: we.exercises?.tracking_type,
        target_sets: we.target_sets, target_reps: we.target_reps,
        target_time_seconds: we.target_time_seconds, rest_seconds: we.rest_seconds,
      }))
    })
    setShowBuilder(true)
  }

  const handleStart = (w) => {
    const exercises = (w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index).map(we => ({
      exercise_id: we.exercise_id, name: we.exercises?.name, tracking_type: we.exercises?.tracking_type,
      is_static_hold: we.exercises?.is_static_hold, target_sets: we.target_sets,
      target_reps: we.target_reps, target_time_seconds: we.target_time_seconds, rest_seconds: we.rest_seconds,
    }))
    onStartWorkout({ workoutId: w.id, workoutName: w.name, exercises })
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{workouts.length} workout{workouts.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setEditWorkout(null); setShowBuilder(true) }}
          className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all">
          + New Workout
        </button>
      </div>

      {workouts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workouts.map(w => (
            <div key={w.id} className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-dark">{w.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {w.category && <span className="text-[10px] px-2 py-0.5 bg-surface rounded-md text-dim">{w.category.replace(/_/g, ' ')}</span>}
                    {w.difficulty && <span className={`text-[10px] px-2 py-0.5 rounded-md ${w.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : w.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{w.difficulty}</span>}
                    {w.estimated_duration && <span className="text-[10px] text-dim">⏱️ {w.estimated_duration}min</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(w)} className="text-muted hover:text-sky-500 text-xs p-1">✏️</button>
                  <button onClick={() => handleDelete(w.id)} className="text-muted hover:text-red-500 text-xs p-1">🗑️</button>
                </div>
              </div>

              {/* Exercise preview */}
              <div className="space-y-1 mb-4">
                {(w.workout_exercises || []).sort((a, b) => a.order_index - b.order_index).slice(0, 4).map((we, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted">
                    <span className="text-dim w-4">{i + 1}.</span>
                    <span>{we.exercises?.name}</span>
                    <span className="text-dim ml-auto">
                      {we.target_sets}×{we.target_reps || `${we.target_time_seconds}s`}
                    </span>
                  </div>
                ))}
                {(w.workout_exercises?.length || 0) > 4 && (
                  <div className="text-[10px] text-dim">+{w.workout_exercises.length - 4} more</div>
                )}
              </div>

              <button onClick={() => handleStart(w)}
                className="w-full py-2.5 bg-sky-50 text-sky-600 rounded-xl text-sm font-bold hover:bg-sky-100 transition-all">
                ▶ Start Workout
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-3">🏋️</div>
          <h3 className="text-lg font-bold text-dark mb-1">No workouts yet</h3>
          <p className="text-sm text-muted mb-4">Create your first workout to get started</p>
          <button onClick={() => setShowBuilder(true)}
            className="px-6 py-3 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 shadow-lg shadow-sky-200">
            Create Workout
          </button>
        </div>
      )}

      {showBuilder && (
        <WorkoutBuilder
          workout={editWorkout}
          onClose={() => { setShowBuilder(false); setEditWorkout(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}