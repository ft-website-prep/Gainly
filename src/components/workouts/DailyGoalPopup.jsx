import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

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

export default function DailyGoalPopup() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [goal, setGoal] = useState(null)
  const [completing, setCompleting] = useState(false)

  const todaysGoal = getTodaysGoal()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    // Check if popup was already shown today
    const lastShown = window.sessionStorage?.getItem('gainly_daily_goal_shown')
    if (lastShown === today) return

    loadAndShow()
  }, [user])

  const loadAndShow = async () => {
    const { data } = await supabase.from('daily_goals').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()

    if (data) {
      setGoal(data)
      // Only show popup if not completed yet
      if (!data.completed) {
        setShow(true)
        try { window.sessionStorage?.setItem('gainly_daily_goal_shown', today) } catch {}
      }
    } else {
      // Create today's goal
      const { data: created } = await supabase.from('daily_goals').insert({
        user_id: user.id, title: todaysGoal.title, goal_type: todaysGoal.type,
        target_value: todaysGoal.target, unit: todaysGoal.unit, date: today,
      }).select().single()
      setGoal(created)
      setShow(true)
      try { window.sessionStorage?.setItem('gainly_daily_goal_shown', today) } catch {}
    }
  }

  const handleComplete = async () => {
    if (!goal) return
    setCompleting(true)
    await supabase.from('daily_goals').update({ current_value: goal.target_value, completed: true }).eq('id', goal.id)
    setGoal({ ...goal, completed: true })
    setTimeout(() => setShow(false), 1500)
  }

  const dismiss = () => setShow(false)

  if (!show || !goal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={dismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Popup */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600" />

        <div className="p-6 text-center">
          <div className="text-4xl mb-3">{todaysGoal.icon}</div>
          <div className="text-[10px] text-muted font-semibold uppercase tracking-widest mb-1">Today's Challenge</div>
          <div className="text-xl font-black text-dark mb-1">{todaysGoal.title}</div>
          <div className="text-xs text-muted mb-5">A small goal to keep you moving</div>

          {goal.completed ? (
            <div className="py-3">
              <div className="text-3xl mb-1">✅</div>
              <div className="text-green-600 font-bold text-sm">Completed!</div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={dismiss}
                className="flex-1 py-3 border border-border rounded-xl text-muted text-xs font-medium hover:bg-surface transition-all">
                Later
              </button>
              <button onClick={handleComplete} disabled={completing}
                className="flex-1 py-3 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50">
                {completing ? 'Saving...' : 'Done ✓'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}