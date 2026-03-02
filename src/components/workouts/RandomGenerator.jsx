import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function RandomGenerator({ onStartWorkout }) {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(null)

  // Settings
  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [equipment, setEquipment] = useState([])
  const [exerciseCount, setExerciseCount] = useState(5)
  const [setsPerExercise, setSetsPerExercise] = useState(3)

  useEffect(() => {
    supabase.from('exercises').select('*').eq('is_approved', true).order('name')
      .then(({ data }) => { setExercises(data || []); setLoading(false) })
  }, [])

  const allEquipment = [...new Set(exercises.flatMap(e => e.equipment_required || []).filter(Boolean))].sort()

  const generate = () => {
    setGenerating(true)

    let pool = exercises.filter(e => {
      if (category !== 'all' && e.category !== category) return false
      if (difficulty !== 'all' && e.difficulty !== difficulty) return false
      if (equipment.length > 0) {
        const req = e.equipment_required || []
        if (req.length > 0 && !req.every(r => equipment.includes(r))) return false
      }
      return true
    })

    // Shuffle and pick
    const shuffled = pool.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(exerciseCount, shuffled.length))

    const workout = selected.map(ex => ({
      exercise_id: ex.id, name: ex.name, tracking_type: ex.tracking_type,
      is_static_hold: ex.is_static_hold, category: ex.category, difficulty: ex.difficulty,
      target_sets: setsPerExercise,
      target_reps: ex.tracking_type === 'reps' ? (ex.difficulty === 'beginner' ? 12 : ex.difficulty === 'intermediate' ? 10 : 8) : null,
      target_time_seconds: ex.tracking_type === 'time' ? (ex.difficulty === 'beginner' ? 30 : ex.difficulty === 'intermediate' ? 20 : 15) : null,
      rest_seconds: 60,
    }))

    setGenerated({ name: `Random ${category !== 'all' ? category.charAt(0).toUpperCase() + category.slice(1) + ' ' : ''}Workout`, exercises: workout })
    setTimeout(() => setGenerating(false), 500)
  }

  const handleSave = async () => {
    if (!generated) return
    const { data: w } = await supabase.from('workouts').insert({
      name: generated.name, description: 'Generated randomly', created_by: user.id,
      difficulty: difficulty !== 'all' ? difficulty : 'intermediate',
      estimated_duration: generated.exercises.length * 5, category: category !== 'all' ? category : 'full_body',
    }).select().single()
    if (w) {
      const rows = generated.exercises.map((e, i) => ({
        workout_id: w.id, exercise_id: e.exercise_id, order_index: i,
        target_sets: e.target_sets, target_reps: e.target_reps,
        target_time_seconds: e.target_time_seconds, rest_seconds: e.rest_seconds,
      }))
      await supabase.from('workout_exercises').insert(rows)
    }
    alert('Saved to My Workouts!')
  }

  const handleStart = () => {
    if (!generated) return
    onStartWorkout({ workoutId: null, workoutName: generated.name, exercises: generated.exercises })
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  return (
    <div>
      <p className="text-sm text-muted mb-6">Generate a random workout from the exercise pool. Configure your preferences and hit generate!</p>

      {/* Settings */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-base font-bold text-dark mb-4">⚙️ Configure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 cursor-pointer">
              <option value="all">All Categories</option>
              {['push', 'pull', 'legs', 'core', 'cardio', 'flexibility'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400 cursor-pointer">
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Exercises</label>
            <input type="number" value={exerciseCount} onChange={e => setExerciseCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))} min={1} max={10}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Sets per Exercise</label>
            <input type="number" value={setsPerExercise} onChange={e => setSetsPerExercise(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))} min={1} max={6}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-dark text-sm focus:outline-none focus:border-sky-400" />
          </div>
        </div>

        {allEquipment.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm text-muted mb-1.5">Available Equipment</label>
            <div className="flex gap-1.5 flex-wrap">
              {allEquipment.map(eq => (
                <button key={eq} onClick={() => setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq])}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${equipment.includes(eq) ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface text-dim border border-transparent'}`}>
                  🔧 {eq.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={generate} disabled={generating}
          className="w-full mt-5 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl text-sm font-bold hover:from-sky-600 hover:to-blue-600 shadow-lg shadow-sky-200 transition-all disabled:opacity-50">
          {generating ? '🎲 Generating...' : '🎲 Generate Random Workout'}
        </button>
      </div>

      {/* Generated Workout Card */}
      {generated && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg">{generated.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sky-100 text-xs">{generated.exercises.length} exercises</span>
              <span className="text-sky-100 text-xs">·</span>
              <span className="text-sky-100 text-xs">~{generated.exercises.length * 5} min</span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2 mb-6">
              {generated.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dim font-mono w-5">{i + 1}.</span>
                    <div>
                      <div className="text-sm font-semibold text-dark">{ex.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-dim">{ex.category}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{ex.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted font-medium">
                    {ex.target_sets}×{ex.target_reps || `${ex.target_time_seconds}s`}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={generate} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm font-medium hover:bg-surface">🔄 Reroll</button>
              <button onClick={handleSave} className="flex-1 py-3 border border-sky-200 bg-sky-50 rounded-xl text-sky-600 text-sm font-medium hover:bg-sky-100">💾 Save</button>
              <button onClick={handleStart} className="flex-1 py-3 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 shadow-lg shadow-sky-200">▶ Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}