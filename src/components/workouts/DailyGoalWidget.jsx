import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// Gainly-curated daily goals - rotates daily
const DAILY_GOALS = [
  { title: '30 Push-Ups', type: 'reps', target: 30, unit: 'reps', icon: '💪' },
  { title: '50 Squats', type: 'reps', target: 50, unit: 'reps', icon: '🦵' },
  { title: '2 Min Plank', type: 'time', target: 120, unit: 'seconds', icon: '⏱️' },
  { title: '20 Burpees', type: 'reps', target: 20, unit: 'reps', icon: '🔥' },
  { title: '5 Min Stretch', type: 'time', target: 300, unit: 'seconds', icon: '🧘' },
  { title: '40 Crunches', type: 'reps', target: 40, unit: 'reps', icon: '💎' },
  { title: '10 Pull-Ups', type: 'reps', target: 10, unit: 'reps', icon: '🫷' },
  { title: '30 Lunges', type: 'reps', target: 30, unit: 'reps', icon: '🚶' },
  { title: '1 Min Wall Sit', type: 'time', target: 60, unit: 'seconds', icon: '🧱' },
  { title: '15 Dips', type: 'reps', target: 15, unit: 'reps', icon: '💪' },
  { title: '3 Min Jump Rope', type: 'time', target: 180, unit: 'seconds', icon: '🏃' },
  { title: '25 Mountain Climbers', type: 'reps', target: 25, unit: 'reps', icon: '⛰️' },
  { title: '20 Leg Raises', type: 'reps', target: 20, unit: 'reps', icon: '🦵' },
  { title: '45s Hollow Hold', type: 'time', target: 45, unit: 'seconds', icon: '💎' },
  { title: '30 Jumping Jacks', type: 'reps', target: 30, unit: 'reps', icon: '⭐' },
  { title: '10 Pike Push-Ups', type: 'reps', target: 10, unit: 'reps', icon: '🤚' },
  { title: '40 High Knees', type: 'reps', target: 40, unit: 'reps', icon: '❤️' },
  { title: '20 Superman Holds', type: 'reps', target: 20, unit: 'reps', icon: '🦸' },
  { title: '1 Min Side Plank', type: 'time', target: 60, unit: 'seconds', icon: '💎' },
  { title: '15 Glute Bridges', type: 'reps', target: 15, unit: 'reps', icon: '🍑' },
  { title: '30 Bicycle Crunches', type: 'reps', target: 30, unit: 'reps', icon: '🚴' },
  { title: '50 Calf Raises', type: 'reps', target: 50, unit: 'reps', icon: '🦵' },
  { title: '20 Diamond Push-Ups', type: 'reps', target: 20, unit: 'reps', icon: '💎' },
  { title: '10 Chin-Ups', type: 'reps', target: 10, unit: 'reps', icon: '🫷' },
  { title: '2 Min Dead Hang', type: 'time', target: 120, unit: 'seconds', icon: '🤲' },
  { title: '30 Step-Ups', type: 'reps', target: 30, unit: 'reps', icon: '📦' },
  { title: '15 Decline Push-Ups', type: 'reps', target: 15, unit: 'reps', icon: '💪' },
  { title: '1 Min L-Sit', type: 'time', target: 60, unit: 'seconds', icon: '💎' },
  { title: '20 Jump Squats', type: 'reps', target: 20, unit: 'reps', icon: '🦵' },
  { title: '3 Min Yoga Flow', type: 'time', target: 180, unit: 'seconds', icon: '🧘' },
]

function getTodaysGoal() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return DAILY_GOALS[dayOfYear % DAILY_GOALS.length]
}

export default function DailyGoalWidget() {
  const { user } = useAuth()
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)

  const todaysGoal = getTodaysGoal()

  useEffect(() => { if (user) loadGoal() }, [user])

  const loadGoal = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_goals').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()

    if (data) {
      setGoal(data)
    } else {
      // Auto-create today's goal
      const { data: created } = await supabase.from('daily_goals').insert({
        user_id: user.id, title: todaysGoal.title, goal_type: todaysGoal.type,
        target_value: todaysGoal.target, unit: todaysGoal.unit, date: today,
      }).select().single()
      setGoal(created)
    }
    setLoading(false)
  }

  const markComplete = async () => {
    if (!goal || goal.completed) return
    await supabase.from('daily_goals').update({ current_value: goal.target_value, completed: true }).eq('id', goal.id)
    setGoal({ ...goal, current_value: goal.target_value, completed: true })
  }

  if (loading) return null // Don't show skeleton, just hide until loaded

  if (!goal) return null

  const pct = Math.min((goal.current_value / goal.target_value) * 100, 100)

  return (
    <div className={`rounded-xl p-4 border transition-all ${goal.completed ? 'bg-green-50 border-green-200' : 'bg-white border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl">{todaysGoal.icon}</div>
          <div>
            <div className="text-[10px] text-muted font-medium uppercase tracking-wider">Daily Challenge</div>
            <div className={`text-sm font-bold ${goal.completed ? 'text-green-600' : 'text-dark'}`}>{goal.title}</div>
          </div>
        </div>
        {goal.completed ? (
          <div className="text-green-500 text-sm font-bold">✓ Done</div>
        ) : (
          <button onClick={markComplete}
            className="px-4 py-2 bg-dark text-white rounded-lg text-[11px] font-bold hover:bg-red-600 transition-all">
            Complete
          </button>
        )}
      </div>
      {!goal.completed && (
        <div className="mt-3 w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}