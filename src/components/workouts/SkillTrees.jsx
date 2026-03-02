import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function SkillTrees() {
  const { user } = useAuth()
  const [skills, setSkills] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  const loadData = async () => {
    // Get exercises that have progressions
    const { data: progs } = await supabase.from('exercise_progressions').select('*, exercises(id, name, category, is_static_hold)').order('exercise_id').order('stage_order')

    // Group by exercise
    const grouped = {}
    ;(progs || []).forEach(p => {
      const eid = p.exercise_id
      if (!grouped[eid]) grouped[eid] = { exercise: p.exercises, stages: [] }
      grouped[eid].stages.push(p)
    })
    setSkills(Object.values(grouped))

    // Get user progress
    const { data: up } = await supabase.from('user_exercise_progress').select('*').eq('user_id', user.id)
    const pm = {}
    ;(up || []).forEach(u => { pm[u.exercise_id] = u })
    setProgress(pm)
    setLoading(false)
  }

  const setCurrentStage = async (exerciseId, stageId) => {
    setSaving(true)
    const existing = progress[exerciseId]
    if (existing) {
      await supabase.from('user_exercise_progress').update({ current_stage_id: stageId }).eq('id', existing.id)
    } else {
      await supabase.from('user_exercise_progress').insert({ user_id: user.id, exercise_id: exerciseId, current_stage_id: stageId })
    }
    await loadData()
    setSaving(false)
  }

  const getStageStatus = (skill, stageIdx) => {
    const userProgress = progress[skill.exercise.id]
    if (!userProgress?.current_stage_id) return stageIdx === 0 ? 'current' : 'locked'
    const currentIdx = skill.stages.findIndex(s => s.id === userProgress.current_stage_id)
    if (stageIdx < currentIdx) return 'completed'
    if (stageIdx === currentIdx) return 'current'
    return 'locked'
  }

  const SKILL_ICONS = {
    'Full Front Lever': '🏋️',
    'Full Planche': '🤸',
    'Muscle-Up': '💪',
    'Handstand Hold': '🤚',
    'Pistol Squat': '🦵',
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading skill trees...</div>

  return (
    <div>
      <p className="text-sm text-muted mb-6">Track your progression on advanced calisthenics skills. Select your current level to see what's next.</p>

      <div className="space-y-4">
        {skills.map(skill => {
          const isExpanded = expanded === skill.exercise.id
          const userProg = progress[skill.exercise.id]
          const currentStageIdx = userProg?.current_stage_id ? skill.stages.findIndex(s => s.id === userProg.current_stage_id) : -1
          const progressPct = currentStageIdx >= 0 ? ((currentStageIdx + 1) / skill.stages.length) * 100 : 0
          const icon = SKILL_ICONS[skill.exercise.name] || '⭐'

          return (
            <div key={skill.exercise.id} className="bg-white border border-border rounded-2xl overflow-hidden">
              {/* Header */}
              <button onClick={() => setExpanded(isExpanded ? null : skill.exercise.id)}
                className="w-full text-left p-5 flex items-center justify-between hover:bg-sky-50/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-2xl">{icon}</div>
                  <div>
                    <div className="text-base font-bold text-dark">{skill.exercise.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-dim">{skill.stages.length} stages</span>
                      <span className="text-[10px] text-dim">·</span>
                      <span className="text-[10px] text-dim">{skill.exercise.category}</span>
                      {currentStageIdx >= 0 && (
                        <>
                          <span className="text-[10px] text-dim">·</span>
                          <span className="text-[10px] text-sky-500 font-medium">{skill.stages[currentStageIdx].stage_name}</span>
                        </>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-32 h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
                <span className={`text-dim text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Expanded: Skill Tree */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <div className="relative">
                    {skill.stages.map((stage, idx) => {
                      const status = getStageStatus(skill, idx)
                      const isLast = idx === skill.stages.length - 1

                      return (
                        <div key={stage.id} className="flex gap-4 relative">
                          {/* Vertical line + node */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <button
                              onClick={() => !saving && setCurrentStage(skill.exercise.id, stage.id)}
                              disabled={saving}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                status === 'completed' ? 'bg-green-500 text-white shadow-green-200 shadow-md' :
                                status === 'current' ? 'bg-sky-500 text-white shadow-sky-200 shadow-md ring-4 ring-sky-100' :
                                'bg-surface text-dim border-2 border-border hover:border-sky-300'
                              }`}
                            >
                              {status === 'completed' ? '✓' : idx + 1}
                            </button>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 min-h-[32px] ${status === 'completed' ? 'bg-green-300' : 'bg-border'}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                            <div className={`p-3 rounded-xl transition-all ${status === 'current' ? 'bg-sky-50 border border-sky-200' : ''}`}>
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-dark">{stage.stage_name}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] bg-surface px-2 py-0.5 rounded text-dim">
                                    {stage.criteria_type === 'time' ? `${stage.criteria_value}s hold` : `${stage.criteria_value} reps`}
                                  </span>
                                  {status === 'current' && <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded font-medium">Current</span>}
                                </div>
                              </div>
                              {stage.description && <p className="text-xs text-muted mt-1">{stage.description}</p>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-dim mt-2">Click a stage to set it as your current level</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {skills.length === 0 && (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-3">🌳</div>
          <h3 className="text-lg font-bold text-dark mb-1">No skill trees yet</h3>
          <p className="text-sm text-muted">Skill progressions will appear here once configured</p>
        </div>
      )}
    </div>
  )
}