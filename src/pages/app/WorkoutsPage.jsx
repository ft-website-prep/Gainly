import { useState } from 'react'
import TrainTab from '../../components/workouts/TrainTab'
import BuildTab from '../../components/workouts/BuildTab'
import ExploreTab from '../../components/workouts/ExploreTab'
import ActiveWorkout from '../../components/workouts/ActiveWorkout'

const TABS = [
  { id: 'train',   label: 'Train',   icon: '⚡' },
  { id: 'build',   label: 'Build',   icon: '🔨' },
  { id: 'explore', label: 'Explore', icon: '🌳' },
]

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState('train')
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [exploreSection, setExploreSection] = useState(null)

  if (activeWorkout) {
    return <ActiveWorkout workout={activeWorkout} onFinish={() => setActiveWorkout(null)} />
  }

  const goToExplore = (section = null) => {
    setExploreSection(section)
    setActiveTab('explore')
  }

  return (
    <div className="max-w-6xl">
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-dark text-white shadow-lg'
                : 'bg-white border border-border text-muted hover:border-red-200 hover:text-dark'
            }`}>
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'train'   && <TrainTab onStartWorkout={setActiveWorkout} onGoToExplore={goToExplore} />}
      {activeTab === 'build'   && <BuildTab />}
      {activeTab === 'explore' && <ExploreTab initialSection={exploreSection} />}
    </div>
  )
}
