import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import SkillTrees from './SkillTrees'

const CATEGORY_LABELS = {
  strength: { label: 'Strength', color: 'bg-red-50 text-red-600 border-red-200' },
  endurance: { label: 'Endurance', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  skill: { label: 'Skill', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  hybrid: { label: 'Hybrid', color: 'bg-blue-50 text-blue-600 border-blue-200' },
}

const DIFF_COLORS = {
  beginner: 'bg-green-50 text-green-600',
  intermediate: 'bg-amber-50 text-amber-600',
  advanced: 'bg-red-50 text-red-600',
}

const GYM_CAT_ICONS = {
  push: '💪', pull: '🔽', legs: '🦵', core: '🔥', cardio: '❤️', flexibility: '🌀',
}

const CHALLENGE_CAT_EMOJIS = {
  strength: '💪', endurance: '❤️', skill: '🌳', hybrid: '⚡',
}

const BAR_COLORS = ['#22c55e', '#f97316', '#c2410c', '#ef4444']
const BAR_LABELS = ['', 'Easy', 'Medium', 'Hard', 'Extreme']

function DifficultyBars({ level }) {
  // level 1–4
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-[3px]">
        {[1,2,3,4].map(i => (
          <div key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: i <= level ? BAR_COLORS[i - 1] : '#e5e7eb',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium" style={{ color: level > 0 ? BAR_COLORS[level - 1] : '#9ca3af' }}>
        {BAR_LABELS[level] || ''}
      </span>
    </div>
  )
}

export default function ExploreTab({ initialSection, initialMethodId }) {
  const { user } = useAuth()

  // Two-level nav
  const [parentSection, setParentSection] = useState(
    initialSection === 'methods' ? 'calisthenics' :
    initialSection === 'gym' ? 'krafttraining' : 'calisthenics'
  )
  const [caliSection, setCaliSection] = useState(
    initialSection === 'methods' ? 'methods' :
    initialSection === 'challenges' ? 'challenges' : 'skilltrees'
  )
  const [gymCategory, setGymCategory] = useState(null)

  const [methods, setMethods] = useState([])
  const [gymExercises, setGymExercises] = useState([])
  const [challenges, setChallenges] = useState([])
  const [completedChallenges, setCompletedChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedMethod, setExpandedMethod] = useState(initialMethodId || null)
  const [methodFilter, setMethodFilter] = useState('all')
  const [challengeDiffFilter, setChallengeDiffFilter] = useState('all')
  const [showRequest, setShowRequest] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqCat, setReqCat] = useState('push')
  const [reqSent, setReqSent] = useState(false)

  useEffect(() => { loadData() }, [])

  // Deep-link: when a method ID is passed, navigate to that method
  useEffect(() => {
    if (initialMethodId) {
      setParentSection('calisthenics')
      setCaliSection('methods')
      setExpandedMethod(initialMethodId)
    }
  }, [initialMethodId])

  const loadData = async () => {
    const [{ data }, { data: gymData }, { data: challengeData }, { data: profileData }] = await Promise.all([
      supabase.from('training_methods').select('*').order('name'),
      supabase.from('exercises').select('*').not('equipment_required', 'eq', '{}').order('name'),
      supabase.from('workout_challenges')
        .select('id, name, short_description, difficulty_level, category, duration_min, duration_max')
        .order('difficulty_level'),
      supabase.from('profiles').select('completed_challenges').eq('id', user.id).single(),
    ])
    setMethods(data || [])
    setGymExercises(gymData?.filter(e => e.equipment_required?.length > 0) || [])
    setChallenges(challengeData || [])
    setCompletedChallenges(profileData?.completed_challenges || [])
    setLoading(false)
  }

  const toggleChallengeComplete = async (id) => {
    const isCompleted = completedChallenges.includes(id)
    const updated = isCompleted
      ? completedChallenges.filter(c => c !== id)
      : [...completedChallenges, id]
    setCompletedChallenges(updated)
    await supabase.from('profiles').update({ completed_challenges: updated }).eq('id', user.id)
  }

  const filteredMethods = methods.filter(m => methodFilter === 'all' || m.category === methodFilter)

  const handleRequest = async () => {
    if (!reqName.trim()) return
    await supabase.from('exercise_requests').insert({ user_id: user.id, exercise_name: reqName, description: reqDesc, category: reqCat })
    setReqSent(true)
    setTimeout(() => { setShowRequest(false); setReqSent(false); setReqName(''); setReqDesc('') }, 2000)
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const gymCategoryList = [...new Set(gymExercises.map(e => e.category).filter(Boolean))]
  const filteredGym = gymCategory ? gymExercises.filter(e => e.category === gymCategory) : []

  return (
    <div>
      {/* Parent Section Tiles */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { id: 'calisthenics', icon: '🤸', label: 'Calisthenics', desc: 'Skill Trees + Methods' },
          { id: 'krafttraining', icon: '🏋️', label: 'Krafttraining', desc: 'Equipment-based Exercises' },
        ].map(s => (
          <button key={s.id} onClick={() => setParentSection(s.id)}
            className={`p-5 rounded-2xl text-left transition-all ${parentSection === s.id ? 'bg-white border-2 border-red-400 shadow-lg' : 'bg-white border border-border hover:border-red-200 hover:shadow-sm'}`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-sm font-bold text-dark">{s.label}</div>
            <div className="text-[10px] text-muted mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* CALISTHENICS */}
      {parentSection === 'calisthenics' && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[
              { id: 'skilltrees', icon: '🌳', label: 'Skill Trees' },
              { id: 'methods', icon: '📖', label: 'Methods' },
              { id: 'challenges', icon: '⚡', label: 'Challenges' },
            ].map(t => (
              <button key={t.id} onClick={() => setCaliSection(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${caliSection === t.id ? 'bg-dark text-white' : 'bg-white border border-border text-muted hover:border-red-200'}`}>
                {t.icon} {t.label}
              </button>
            ))}
            {caliSection === 'skilltrees' && (
              <button onClick={() => setShowRequest(true)} className="ml-auto text-xs text-red-500 hover:text-red-600 font-medium self-center">
                Missing an exercise? &rarr;
              </button>
            )}
          </div>

          {caliSection === 'skilltrees' && <SkillTrees />}

          {caliSection === 'challenges' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-black text-dark">Challenges</h2>
                <p className="text-xs text-muted mt-0.5">Short, competitive mini-challenges. Attempt them at the end of any workout.</p>
              </div>

              {/* Difficulty filter */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {[
                  { id: 'all', label: 'All', color: '#1f2937' },
                  { id: 2, label: 'Easy',    color: BAR_COLORS[0] },
                  { id: 3, label: 'Medium',  color: BAR_COLORS[1] },
                  { id: 4, label: 'Hard',    color: BAR_COLORS[2] },
                  { id: 5, label: 'Extreme', color: BAR_COLORS[3] },
                ].map(f => (
                  <button key={f.id} onClick={() => setChallengeDiffFilter(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={challengeDiffFilter === f.id
                      ? { backgroundColor: f.color, color: '#fff' }
                      : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    }>
                    {f.id !== 'all' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                        style={{ backgroundColor: f.color }} />
                    )}
                    {f.label}
                  </button>
                ))}
              </div>

              {challenges.length === 0 && (
                <div className="text-center py-12 text-muted text-sm">No challenges found.</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {challenges.filter(ch => challengeDiffFilter === 'all' || ch.difficulty_level === challengeDiffFilter).map(ch => {
                  const isCompleted = completedChallenges.includes(ch.id)
                  const catEmoji = CHALLENGE_CAT_EMOJIS[ch.category] || '⚡'
                  const barLevel = Math.max(1, Math.min(4, (ch.difficulty_level || 3) - 1))
                  return (
                    <div key={ch.id} className="bg-white border border-border rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm flex-shrink-0">{catEmoji}</span>
                        {ch.duration_min && (
                          <span className="text-[9px] text-dim">~{ch.duration_min}–{ch.duration_max}m</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-dark leading-tight">{ch.name}</div>
                      <DifficultyBars level={barLevel} />
                      <button onClick={() => toggleChallengeComplete(ch.id)}
                        className={`w-full py-1 rounded-full text-[10px] font-bold transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-surface border border-border text-muted hover:border-green-400 hover:text-green-600'
                        }`}>
                        {isCompleted ? 'Completed ✓' : 'Mark'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {caliSection === 'methods' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-dark">Training Methods</h2>
                  <p className="text-xs text-muted mt-0.5">Proven protocols to level up your calisthenics</p>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-1.5 mb-5 flex-wrap">
                {['all', 'strength', 'endurance', 'skill', 'hybrid'].map(c => (
                  <button key={c} onClick={() => setMethodFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${methodFilter === c ? 'bg-dark text-white' : 'bg-surface text-muted border border-border'}`}>
                    {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>

              {/* Methods List */}
              <div className="space-y-3">
                {filteredMethods.map(method => {
                  const isExpanded = expandedMethod === method.id
                  const cat = CATEGORY_LABELS[method.category] || CATEGORY_LABELS.hybrid
                  const diff = DIFF_COLORS[method.difficulty] || DIFF_COLORS.intermediate

                  return (
                    <div key={method.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                      <button onClick={() => setExpandedMethod(isExpanded ? null : method.id)}
                        className="w-full text-left p-5 flex items-center justify-between hover:bg-red-50/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-lg font-black text-red-500">
                            {method.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-base font-bold text-dark">{method.name}</div>
                            <div className="text-xs text-muted mt-0.5">{method.short_description}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${cat.color}`}>{cat.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${diff}`}>{method.difficulty}</span>
                              {method.duration_min && <span className="text-[9px] text-dim">{method.duration_min}-{method.duration_max} min</span>}
                              {method.min_people > 1 && <span className="text-[9px] text-dim">{method.min_people}+ people</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`text-dim text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>&darr;</span>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-dark mb-1.5">What is it?</h4>
                            <p className="text-sm text-muted leading-relaxed">{method.full_description}</p>
                          </div>
                          <div className="bg-surface rounded-xl p-4">
                            <h4 className="text-xs font-bold text-dark mb-2">How it works</h4>
                            <div className="space-y-1.5">
                              {method.how_it_works.split(/\d+\.\s/).filter(Boolean).map((step, i) => {
                                const words = step.trim().split(' ')
                                const first = words[0]
                                const rest = words.slice(1).join(' ')
                                return (
                                  <div key={i} className="flex gap-2 text-sm text-muted">
                                    <span className="text-red-500 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                                    <span><strong className="text-dark">{first}</strong>{rest ? ' ' + rest : ''}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          {method.default_exercises?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-dark mb-2">Recommended exercises</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {method.default_exercises.map((e, i) => (
                                  <span key={i} className="text-[10px] bg-surface text-dark px-2.5 py-1 rounded-lg border border-border font-medium">{e}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KRAFTTRAINING */}
      {parentSection === 'krafttraining' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-black text-dark">Gym Exercises</h2>
            <p className="text-xs text-muted mt-0.5">Equipment-based training with 3D demos</p>
          </div>

          {gymCategory === null ? (
            /* Category tile grid */
            <div className="grid grid-cols-2 gap-3">
              {gymCategoryList.map(cat => {
                const count = gymExercises.filter(e => e.category === cat).length
                const icon = GYM_CAT_ICONS[cat] || '🏋️'
                return (
                  <button key={cat} onClick={() => setGymCategory(cat)}
                    className="bg-white border border-border rounded-2xl p-5 text-left hover:border-red-300 hover:shadow-md transition-all">
                    <div className="text-3xl mb-2">{icon}</div>
                    <div className="text-sm font-bold text-dark capitalize">{cat}</div>
                    <div className="text-[10px] text-muted mt-0.5">{count} exercise{count !== 1 ? 's' : ''}</div>
                  </button>
                )
              })}
              {gymCategoryList.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted text-sm">No gym exercises found.</div>
              )}
            </div>
          ) : (
            /* Exercise grid for selected category */
            <div>
              <button onClick={() => setGymCategory(null)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-dark mb-4 transition-colors">
                ← Back to categories
              </button>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{GYM_CAT_ICONS[gymCategory] || '🏋️'}</span>
                <h3 className="text-base font-bold text-dark capitalize">{gymCategory}</h3>
                <span className="text-xs text-muted">· {filteredGym.length} exercises</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredGym.map(ex => (
                  <div key={ex.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                    <div className="h-28 bg-surface flex items-center justify-center border-b border-border">
                      {ex.demo_3d_url ? (
                        <a href={ex.demo_3d_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
                          ▶ 3D Demo
                        </a>
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1 opacity-30">🎬</div>
                          <span className="text-[10px] text-dim font-medium">3D soon</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-bold text-dark leading-tight">{ex.name}</div>
                      {ex.primary_muscles?.length > 0 && (
                        <div className="text-[10px] text-muted mt-0.5">{ex.primary_muscles.join(', ')}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ex.equipment_required?.map((eq, i) => (
                          <span key={i} className="text-[9px] bg-surface border border-border text-dim px-1.5 py-0.5 rounded">{eq}</span>
                        ))}
                        {ex.difficulty && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${DIFF_COLORS[ex.difficulty] || DIFF_COLORS.intermediate}`}>{ex.difficulty}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredGym.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-muted text-sm">No exercises in this category.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRequest(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-dark">Request Exercise</h2>
              <button onClick={() => setShowRequest(false)} className="text-muted hover:text-dark text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {reqSent ? (
                <div className="text-center py-4"><div className="text-3xl mb-2">&#10004;</div><p className="text-sm text-green-600 font-medium">Request sent!</p></div>
              ) : (
                <>
                  <div><label className="block text-sm text-muted mb-1.5">Exercise Name *</label><input type="text" value={reqName} onChange={e => setReqName(e.target.value)} placeholder="e.g. Cable Fly" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /></div>
                  <div><label className="block text-sm text-muted mb-1.5">Category</label><select value={reqCat} onChange={e => setReqCat(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400">{['push', 'pull', 'legs', 'core', 'cardio', 'flexibility'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
                  <div><label className="block text-sm text-muted mb-1.5">Description</label><textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} rows={2} placeholder="Optional" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400 resize-none" /></div>
                  <button onClick={handleRequest} disabled={!reqName.trim()} className="w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">Submit Request</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
