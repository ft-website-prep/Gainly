import { useState } from 'react'
import TrainTab from '../../components/workouts/TrainTab'
import BuildTab from '../../components/workouts/BuildTab'
import ExploreTab from '../../components/workouts/ExploreTab'
import ActiveWorkout from '../../components/workouts/ActiveWorkout'

const NAV = [
  {
    group: 'MANAGE',
    items: [
      { id: 'train',   label: 'Train',   icon: '⚡' },
      { id: 'build',   label: 'Build',   icon: '🔨' },
      { id: 'explore', label: 'Explore', icon: '🌳' },
    ],
  },
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
    <div className="flex gap-8" style={{ minHeight: 'calc(100vh - 160px)' }}>

      {/* ── Left sidebar ── */}
      <div className="w-52 flex-shrink-0">
        <div className="sticky top-0 pt-1">
          <h1 className="text-xl font-black text-dark mb-6 px-3">Workouts</h1>
          {NAV.map(group => (
            <div key={group.group} className="mb-5">
              <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-1 px-3">{group.group}</p>
              {group.items.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 flex items-center gap-2.5 ${
                    activeTab === item.id
                      ? 'bg-surface border border-border text-dark font-semibold'
                      : 'text-muted hover:text-dark hover:bg-surface border border-transparent'
                  }`}>
                  <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {activeTab === 'train'   && <TrainTab onStartWorkout={setActiveWorkout} onGoToExplore={goToExplore} />}
        {activeTab === 'build'   && <BuildTab />}
        {activeTab === 'explore' && (
          <ExploreTab
            key={`${exploreSection}-${exploreMethodId}`}
            initialSection={exploreSection}
            initialMethodId={exploreMethodId}
          />
        )}
      </div>
    </div>
  )
}
