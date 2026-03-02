import { useState } from 'react'
import MyWorkouts from '../../components/workouts/MyWorkouts'
import ExerciseLibrary from '../../components/workouts/ExerciseLibrary'
import SkillTrees from '../../components/workouts/SkillTrees'
import RandomGenerator from '../../components/workouts/RandomGenerator'
import DailyGoal from '../../components/workouts/DailyGoal'
import ActiveWorkout from '../../components/workouts/ActiveWorkout'

const TABS = [
  { id: 'my', label: 'My Workouts', icon: '🏋️' },
  { id: 'library', label: 'Exercises', icon: '📚' },
  { id: 'skills', label: 'Skill Trees', icon: '🌳' },
  { id: 'random', label: 'Random', icon: '🎲' },
  { id: 'daily', label: 'Daily Goal', icon: '⭐' },
]

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState('my')
  const [activeWorkout, setActiveWorkout] = useState(null)

  if (activeWorkout) {
    return <ActiveWorkout workout={activeWorkout} onFinish={() => setActiveWorkout(null)} />
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-dark">Workouts</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'
            }`}>
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'my' && <MyWorkouts onStartWorkout={setActiveWorkout} />}
      {activeTab === 'library' && <ExerciseLibrary />}
      {activeTab === 'skills' && <SkillTrees />}
      {activeTab === 'random' && <RandomGenerator onStartWorkout={setActiveWorkout} />}
      {activeTab === 'daily' && <DailyGoal />}
    </div>
  )
}