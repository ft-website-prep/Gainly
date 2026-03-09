import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function ActiveWorkout({ workout, onFinish }) {
  const { user } = useAuth()
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState('exercise') // exercise | rest | complete
  const [timer, setTimer] = useState(0) // elapsed seconds
  const [restTimer, setRestTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [logs, setLogs] = useState({}) // { exerciseIdx: { setNum: { reps, time } } }
  const [startedAt] = useState(new Date().toISOString())
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)
  const timerRef = useRef(null)
  const restRef = useRef(null)

  const exercises = workout.exercises || []
  const currentEx = exercises[currentExIdx]

  // Main timer
  useEffect(() => {
    if (isRunning && phase === 'exercise') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, phase])

  // Rest timer
  useEffect(() => {
    if (phase === 'rest' && restTimer > 0) {
      restRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) { clearInterval(restRef.current); setPhase('exercise'); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(restRef.current)
  }, [phase, restTimer])

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const logSet = (value) => {
    const key = `${currentExIdx}-${currentSet}`
    setLogs(prev => ({
      ...prev,
      [key]: { exerciseIdx: currentExIdx, setNum: currentSet, value, target: currentEx.tracking_type === 'reps' ? currentEx.target_reps : currentEx.target_time_seconds }
    }))

    // Next set or next exercise
    if (currentSet < (currentEx.target_sets || 3)) {
      setCurrentSet(currentSet + 1)
      setPhase('rest')
      setRestTimer(currentEx.rest_seconds || 60)
    } else if (currentExIdx < exercises.length - 1) {
      setCurrentExIdx(currentExIdx + 1)
      setCurrentSet(1)
      setPhase('rest')
      setRestTimer(currentEx.rest_seconds || 60)
    } else {
      // Workout complete
      setPhase('complete')
      setIsRunning(false)
    }
  }

  const skipRest = () => { clearInterval(restRef.current); setRestTimer(0); setPhase('exercise') }

  const finishWorkout = async () => {
    setSaving(true)
    const completedAt = new Date().toISOString()
    const totalDuration = timer

    // Calculate XP: base 50 + 10 per exercise + 5 per set
    const totalSets = Object.keys(logs).length
    const xpEarned = 50 + exercises.length * 10 + totalSets * 5

    // Create workout log
    const { data: log } = await supabase.from('workout_logs').insert({
      user_id: user.id, workout_id: workout.workoutId,
      started_at: startedAt, completed_at: completedAt,
      total_duration: totalDuration, xp_earned: xpEarned,
    }).select().single()

    if (log) {
      // Create exercise logs
      const exerciseLogs = Object.values(logs).map(l => ({
        workout_log_id: log.id, exercise_id: exercises[l.exerciseIdx].exercise_id,
        set_number: l.setNum,
        reps_completed: exercises[l.exerciseIdx].tracking_type === 'reps' ? l.value : null,
        time_completed_seconds: exercises[l.exerciseIdx].tracking_type === 'time' ? l.value : null,
        target_reps: exercises[l.exerciseIdx].target_reps,
        target_time_seconds: exercises[l.exerciseIdx].target_time_seconds,
      }))
      await supabase.from('exercise_logs').insert(exerciseLogs)

      // Grant XP
      await supabase.rpc('grant_xp', { p_user_id: user.id, p_amount: xpEarned, p_source_type: 'workout', p_source_id: log.id, p_description: `Completed: ${workout.workoutName}` })
    }

    // Calculate performance
    let totalTarget = 0, totalActual = 0
    Object.values(logs).forEach(l => {
      totalTarget += l.target || 0
      totalActual += l.value || 0
    })

    setSummary({ xpEarned, totalDuration, totalSets, exercises: exercises.length, performance: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 100 })
    setSaving(false)
  }

  // ============ COMPLETE SCREEN ============
  if (summary) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-black text-dark mb-2">Workout Complete!</h1>
        <p className="text-muted mb-8">{workout.workoutName}</p>

        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-red-500">+{summary.xpEarned}</div>
              <div className="text-xs text-red-400">XP Earned</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-dark">{formatTime(summary.totalDuration)}</div>
              <div className="text-xs text-muted">Duration</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-dark">{summary.totalSets}</div>
              <div className="text-xs text-muted">Sets Completed</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className={`text-2xl font-black ${summary.performance >= 100 ? 'text-green-500' : summary.performance >= 80 ? 'text-amber-500' : 'text-red-500'}`}>{summary.performance}%</div>
              <div className="text-xs text-muted">Performance</div>
            </div>
          </div>
        </div>

        <button onClick={onFinish} className="px-8 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-200">
          Back to Workouts
        </button>
      </div>
    )
  }

  // ============ SAVING SCREEN ============
  if (phase === 'complete' && !summary) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-4xl mb-4">💪</div>
        <h2 className="text-xl font-bold text-dark mb-4">Great job! Save your workout?</h2>
        <div className="text-muted text-sm mb-6">{formatTime(timer)} · {Object.keys(logs).length} sets logged</div>
        <div className="flex gap-3 justify-center">
          <button onClick={onFinish} className="px-6 py-3 border border-border rounded-xl text-muted text-sm">Discard</button>
          <button onClick={finishWorkout} disabled={saving}
            className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-200 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Finish'}
          </button>
        </div>
      </div>
    )
  }

  // ============ REST SCREEN ============
  if (phase === 'rest') {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-lg text-muted mb-2">Rest</h2>
        <div className="text-6xl font-black text-dark mb-4">{restTimer}s</div>

        {/* Progress ring */}
        <div className="flex justify-center mb-6">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f2f5" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e10600" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${(restTimer / (currentEx.rest_seconds || 60)) * 263.9} 263.9`} />
            </svg>
          </div>
        </div>

        <p className="text-sm text-muted mb-2">
          Up next: <strong>{currentSet <= (currentEx.target_sets || 3)
            ? `${currentEx.name} – Set ${currentSet}`
            : exercises[currentExIdx + 1]?.name + ' – Set 1'
          }</strong>
        </p>
        <button onClick={skipRest} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100">Skip Rest →</button>
      </div>
    )
  }

  // ============ EXERCISE SCREEN ============
  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => { if (confirm('Quit workout?')) onFinish() }} className="text-muted hover:text-dark text-sm">✕ Quit</button>
        <div className="text-center">
          <div className="text-sm text-muted">{workout.workoutName}</div>
          <div className="text-lg font-black text-dark font-mono">{formatTime(timer)}</div>
        </div>
        <div className="text-xs text-dim">{currentExIdx + 1}/{exercises.length}</div>
      </div>

      {/* Exercise progress dots */}
      <div className="flex gap-1 mb-6 justify-center">
        {exercises.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${i < currentExIdx ? 'bg-green-400' : i === currentExIdx ? 'bg-red-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Current Exercise */}
      <div className="bg-white border border-border rounded-2xl p-6 mb-4">
        <div className="text-center mb-6">
          <div className="text-2xl font-black text-dark">{currentEx.name}</div>
          <div className="text-muted text-sm mt-1">
            Set {currentSet} of {currentEx.target_sets || 3} ·
            Target: {currentEx.tracking_type === 'reps' ? `${currentEx.target_reps} reps` : `${currentEx.target_time_seconds}s`}
          </div>
        </div>

        {/* Input */}
        {currentEx.tracking_type === 'reps' ? (
          <RepsInput target={currentEx.target_reps} onLog={logSet} />
        ) : (
          <TimeInput target={currentEx.target_time_seconds} onLog={logSet} />
        )}
      </div>

      {/* Set History for current exercise */}
      {Object.entries(logs).filter(([k]) => k.startsWith(`${currentExIdx}-`)).length > 0 && (
        <div className="bg-surface rounded-xl p-4">
          <div className="text-xs text-dim mb-2">Completed Sets</div>
          <div className="space-y-1">
            {Object.entries(logs).filter(([k]) => k.startsWith(`${currentExIdx}-`)).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted">Set {v.setNum}</span>
                <span className={`font-semibold ${v.value >= v.target ? 'text-green-500' : 'text-amber-500'}`}>
                  {v.value}{currentEx.tracking_type === 'reps' ? ' reps' : 's'} / {v.target}{currentEx.tracking_type === 'reps' ? '' : 's'}
                  {v.value >= v.target ? ' ✓' : ` (${v.value - v.target})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pause/Resume */}
      <div className="flex justify-center mt-4">
        <button onClick={() => setIsRunning(!isRunning)}
          className="px-6 py-2 text-muted text-xs hover:text-dark">
          {isRunning ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>
    </div>
  )
}

// =============================================
// REPS INPUT
// =============================================
function RepsInput({ target, onLog }) {
  const [value, setValue] = useState(target || 10)
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setValue(Math.max(0, value - 1))}
          className="w-12 h-12 bg-surface rounded-full text-xl font-bold text-muted hover:bg-red-50 hover:text-red-500 transition-all">−</button>
        <input type="number" value={value} onChange={e => setValue(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 text-center text-3xl font-black text-dark bg-transparent focus:outline-none" />
        <button onClick={() => setValue(value + 1)}
          className="w-12 h-12 bg-surface rounded-full text-xl font-bold text-muted hover:bg-red-50 hover:text-red-500 transition-all">+</button>
      </div>
      <div className="text-xs text-dim mb-4">Target: {target} reps</div>
      <button onClick={() => onLog(value)}
        className="w-full py-3.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-200">
        Log Set ✓
      </button>
    </div>
  )
}

// =============================================
// TIME INPUT (with countdown)
// =============================================
function TimeInput({ target, onLog }) {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(ref.current)
  }, [running])

  const stop = () => { clearInterval(ref.current); setRunning(false) }

  return (
    <div className="text-center">
      <div className="text-5xl font-black text-dark mb-2 font-mono">{seconds}s</div>
      <div className="text-xs text-dim mb-4">Target: {target}s</div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-surface rounded-full mb-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${seconds >= target ? 'bg-green-400' : 'bg-red-400'}`}
          style={{ width: `${Math.min((seconds / target) * 100, 100)}%` }} />
      </div>

      {!running && seconds === 0 && (
        <button onClick={() => setRunning(true)}
          className="w-full py-3.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-200">
          ▶ Start Timer
        </button>
      )}
      {running && (
        <button onClick={() => { stop(); onLog(seconds) }}
          className="w-full py-3.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-lg shadow-green-200">
          ⏹ Stop & Log ({seconds}s)
        </button>
      )}
      {!running && seconds > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setSeconds(0)} className="flex-1 py-3 border border-border rounded-xl text-muted text-sm">Reset</button>
          <button onClick={() => onLog(seconds)}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold">Log {seconds}s ✓</button>
        </div>
      )}
    </div>
  )
}