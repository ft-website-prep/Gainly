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

const CHALLENGES = [
  {
    id: 'c1', icon: '🔥', title: '30-Day Push-Up Challenge', category: 'Strength', difficulty: 'beginner',
    duration: '30 days', desc: 'Build your push foundation. Start at 10 reps and reach 100 consecutive push-ups by day 30.',
    weeks: ['Week 1: 10–25 reps/day', 'Week 2: 25–50 reps/day', 'Week 3: 50–75 reps/day', 'Week 4: 75–100 reps/day'],
    badge: '💪', reward: '+500 XP',
  },
  {
    id: 'c2', icon: '🏆', title: '100 Pull-Ups Challenge', category: 'Strength', difficulty: 'intermediate',
    duration: '4 weeks', desc: 'Complete 100 total pull-ups across multiple sets per day for 4 weeks. Track your PR.',
    weeks: ['Week 1: 5 sets × 5 reps daily', 'Week 2: 5 sets × 8 reps daily', 'Week 3: 6 sets × 8 reps daily', 'Week 4: Max effort — hit 100 reps/day'],
    badge: '🔝', reward: '+800 XP',
  },
  {
    id: 'c3', icon: '🌳', title: 'Handstand 30-Day Program', category: 'Skill', difficulty: 'intermediate',
    duration: '30 days', desc: 'Go from wall handstand to a 10-second freestanding hold. Daily practice of 15–20 minutes.',
    weeks: ['Week 1: Wall holds + shoulder prep', 'Week 2: Kick-up practice', 'Week 3: Balance drills', 'Week 4: Freestanding attempts'],
    badge: '🤸', reward: '+1000 XP',
  },
  {
    id: 'c4', icon: '⚡', title: '7-Day Streak Blitz', category: 'Endurance', difficulty: 'beginner',
    duration: '7 days', desc: 'Train every single day for 7 days straight. Any workout counts — just keep the streak alive.',
    weeks: ['Day 1–3: Full body sessions', 'Day 4–5: Upper focus', 'Day 6: Core & mobility', 'Day 7: Personal PR attempt'],
    badge: '🔥', reward: '+300 XP',
  },
  {
    id: 'c5', icon: '💎', title: 'Muscle-Up Mastery', category: 'Skill', difficulty: 'advanced',
    duration: '8 weeks', desc: 'Unlock your first strict muscle-up. Requires solid pull-up base (8+ reps). Progressive skill work.',
    weeks: ['Week 1–2: High pull-up negatives', 'Week 3–4: Transition drills', 'Week 5–6: Banded muscle-ups', 'Week 7–8: Full muscle-up attempts'],
    badge: '🏅', reward: '+1500 XP',
  },
  {
    id: 'c6', icon: '🦵', title: 'Pistol Squat Progression', category: 'Strength', difficulty: 'intermediate',
    duration: '6 weeks', desc: 'Develop the single-leg squat from scratch. Balance, strength, and mobility all in one.',
    weeks: ['Week 1–2: Assisted pistol squats', 'Week 3–4: Box pistols', 'Week 5: Partial pistols', 'Week 6: Full pistol squats'],
    badge: '🦵', reward: '+700 XP',
  },
]

const CHALLENGE_DIFF_COLORS = {
  beginner: 'bg-green-50 text-green-600 border-green-200',
  intermediate: 'bg-amber-50 text-amber-600 border-amber-200',
  advanced: 'bg-red-50 text-red-600 border-red-200',
}

const CHALLENGE_CAT_COLORS = {
  Strength: 'bg-red-50 text-red-600',
  Skill: 'bg-purple-50 text-purple-600',
  Endurance: 'bg-amber-50 text-amber-600',
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
  const [loading, setLoading] = useState(true)
  const [expandedMethod, setExpandedMethod] = useState(initialMethodId || null)
  const [expandedChallenge, setExpandedChallenge] = useState(null)
  const [methodFilter, setMethodFilter] = useState('all')
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
    const [{ data }, { data: gymData }] = await Promise.all([
      supabase.from('training_methods').select('*').order('name'),
      supabase.from('exercises').select('*').not('equipment_required', 'eq', '{}').order('name'),
    ])
    setMethods(data || [])
    setGymExercises(gymData?.filter(e => e.equipment_required?.length > 0) || [])
    setLoading(false)
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
                <p className="text-xs text-muted mt-0.5">Structured programs to level up specific skills. Complete them for XP rewards.</p>
              </div>
              <div className="space-y-3">
                {CHALLENGES.map(ch => {
                  const expanded = expandedChallenge === ch.id
                  const setExpanded = (v) => setExpandedChallenge(v ? ch.id : null)
                  const diffClass = CHALLENGE_DIFF_COLORS[ch.difficulty] || CHALLENGE_DIFF_COLORS.intermediate
                  const catClass = CHALLENGE_CAT_COLORS[ch.category] || 'bg-surface text-dark'
                  return (
                    <div key={ch.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                      <button onClick={() => setExpanded(!expanded)}
                        className="w-full text-left p-5 flex items-center justify-between hover:bg-red-50/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                            {ch.icon}
                          </div>
                          <div>
                            <div className="text-base font-bold text-dark">{ch.title}</div>
                            <div className="text-xs text-muted mt-0.5">{ch.desc.substring(0, 60)}...</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${diffClass}`}>{ch.difficulty}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catClass}`}>{ch.category}</span>
                              <span className="text-[9px] text-dim">⏱ {ch.duration}</span>
                              <span className="text-[9px] text-green-600 font-medium">{ch.reward}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-dim text-xs transition-transform flex-shrink-0 ml-2 ${expanded ? 'rotate-180' : ''}`}>&darr;</span>
                      </button>
                      {expanded && (
                        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                          <p className="text-sm text-muted leading-relaxed">{ch.desc}</p>
                          <div className="bg-surface rounded-xl p-4">
                            <h4 className="text-xs font-bold text-dark mb-3">Weekly Breakdown</h4>
                            <div className="space-y-2">
                              {ch.weeks.map((w, i) => (
                                <div key={i} className="flex gap-2 text-sm text-muted items-start">
                                  <span className="text-red-500 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{ch.badge}</span>
                              <div>
                                <div className="text-xs font-bold text-dark">Completion Badge</div>
                                <div className="text-[10px] text-muted">Finish to unlock</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-green-600">{ch.reward}</div>
                              <div className="text-[9px] text-dim">on completion</div>
                            </div>
                          </div>
                        </div>
                      )}
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
