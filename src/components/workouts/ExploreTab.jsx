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

export default function ExploreTab() {
  const { user } = useAuth()
  const [section, setSection] = useState('calisthenics')
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedMethod, setExpandedMethod] = useState(null)
  const [methodFilter, setMethodFilter] = useState('all')
  const [showRequest, setShowRequest] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqCat, setReqCat] = useState('push')
  const [reqSent, setReqSent] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data } = await supabase.from('training_methods').select('*').order('name')
    setMethods(data || [])
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

  return (
    <div>
      {/* Section Toggle */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'calisthenics', label: 'Skill Trees', icon: '🌳', desc: 'Progressions' },
          { id: 'methods', label: 'Methods', icon: '📖', desc: 'Training protocols' },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex-1 p-4 rounded-xl text-left transition-all ${section === s.id ? 'bg-white border-2 border-red-400 shadow-lg' : 'bg-white border border-border hover:border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className="text-sm font-bold text-dark">{s.label}</div>
                <div className="text-[10px] text-muted">{s.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* SKILL TREES */}
      {section === 'calisthenics' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowRequest(true)} className="text-xs text-red-500 hover:text-red-600 font-medium">Missing an exercise? &rarr;</button>
          </div>
          <SkillTrees />
        </div>
      )}

      {/* TRAINING METHODS */}
      {section === 'methods' && (
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

          {/* Methods Grid */}
          <div className="space-y-3">
            {filteredMethods.map(method => {
              const isExpanded = expandedMethod === method.id
              const cat = CATEGORY_LABELS[method.category] || CATEGORY_LABELS.hybrid
              const diff = DIFF_COLORS[method.difficulty] || DIFF_COLORS.intermediate

              return (
                <div key={method.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                  {/* Header */}
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

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                      {/* Full Description */}
                      <div>
                        <h4 className="text-xs font-bold text-dark mb-1.5">What is it?</h4>
                        <p className="text-sm text-muted leading-relaxed">{method.full_description}</p>
                      </div>

                      {/* How it Works */}
                      <div className="bg-surface rounded-xl p-4">
                        <h4 className="text-xs font-bold text-dark mb-2">How it works</h4>
                        <div className="space-y-1.5">
                          {method.how_it_works.split(/\d+\.\s/).filter(Boolean).map((step, i) => (
                            <div key={i} className="flex gap-2 text-sm text-muted">
                              <span className="text-red-500 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                              <span>{step.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Benefits */}
                      {method.benefits?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-dark mb-2">Benefits</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {method.benefits.map((b, i) => (
                              <span key={i} className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Best For */}
                      {method.best_for?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-dark mb-2">Best for</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {method.best_for.map((b, i) => (
                              <span key={i} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-lg">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Default Exercises */}
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

                      {/* Parameters */}
                      {method.parameters && Object.keys(method.parameters).length > 0 && (
                        <div className="bg-surface rounded-xl p-4">
                          <h4 className="text-xs font-bold text-dark mb-2">Default parameters</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(method.parameters).map(([key, val]) => (
                              <div key={key} className="text-center">
                                <div className="text-lg font-black text-dark">{Array.isArray(val) ? val.join(',') : val}</div>
                                <div className="text-[9px] text-dim">{key.replace(/_/g, ' ')}</div>
                              </div>
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