import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import SkillTrees from './SkillTrees'

export default function ExploreTab() {
  const { user } = useAuth()
  const [section, setSection] = useState('calisthenics') // calisthenics | gym
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showRequest, setShowRequest] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqCat, setReqCat] = useState('push')
  const [reqSent, setReqSent] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data } = await supabase.from('exercises').select('*').order('name')
    setExercises(data || [])
    setLoading(false)
  }

  // Split: Calisthenics = no equipment OR bodyweight-focused
  // Gym = has equipment requirements
  const calisthenicsExercises = exercises.filter(e => !e.equipment_required || e.equipment_required.length === 0 || e.equipment_required.every(eq => ['pull_up_bar', 'dip_bars', 'wall', 'rings'].includes(eq)))
  const gymExercises = exercises.filter(e => e.equipment_required?.some(eq => !['pull_up_bar', 'dip_bars', 'wall', 'rings'].includes(eq)))

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
        <button onClick={() => setSection('calisthenics')}
          className={`flex-1 p-4 rounded-xl text-left transition-all ${section === 'calisthenics' ? 'bg-white border-2 border-sky-400 shadow-lg' : 'bg-white border border-border hover:border-sky-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-lg shadow-sm">🤸</div>
            <div>
              <div className="text-sm font-bold text-dark">Calisthenics</div>
              <div className="text-[10px] text-muted">{calisthenicsExercises.length} exercises · Skill Trees · Progressions</div>
            </div>
          </div>
        </button>
        <button onClick={() => setSection('gym')}
          className={`flex-1 p-4 rounded-xl text-left transition-all ${section === 'gym' ? 'bg-white border-2 border-sky-400 shadow-lg' : 'bg-white border border-border hover:border-sky-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-lg shadow-sm">🏋️</div>
            <div>
              <div className="text-sm font-bold text-dark">Gym & Equipment</div>
              <div className="text-[10px] text-muted">{gymExercises.length} exercises · Equipment-based</div>
            </div>
          </div>
        </button>
      </div>

      {/* Request Link */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowRequest(true)} className="text-xs text-sky-500 hover:text-sky-600 font-medium">Missing an exercise? →</button>
      </div>

      {/* ============ CALISTHENICS SECTION ============ */}
      {section === 'calisthenics' && (
        <div>
          {/* Skill Trees */}
          <SkillTrees />

          {/* All Calisthenics Exercises */}
          <div className="mt-8">
            <h3 className="text-base font-bold text-dark mb-3">All Calisthenics Exercises</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {calisthenicsExercises.map(ex => (
                <div key={ex.id} onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                  className="bg-white border border-border rounded-xl p-3 hover:border-sky-200 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-dark">{ex.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${ex.difficulty === 'beginner' ? 'bg-green-500' : ex.difficulty === 'intermediate' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="text-[9px] text-dim">{ex.difficulty}</span>
                    <span className="text-[9px] text-dim">· {ex.category}</span>
                    {ex.is_static_hold && <span className="text-[9px] text-purple-500">⏱️</span>}
                  </div>
                  {expanded === ex.id && (
                    <div className="mt-2 pt-2 border-t border-border">
                      {ex.description && <p className="text-[10px] text-muted mb-1">{ex.description}</p>}
                      {ex.primary_muscles?.length > 0 && <div className="text-[9px] text-sky-600">{ex.primary_muscles.join(', ')}</div>}
                      {ex.equipment_required?.length > 0 && <div className="text-[9px] text-amber-600 mt-0.5">🔧 {ex.equipment_required.join(', ').replace(/_/g, ' ')}</div>}
                      {(!ex.equipment_required || ex.equipment_required.length === 0) && <div className="text-[9px] text-green-500 mt-0.5">✓ No equipment</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ GYM SECTION ============ */}
      {section === 'gym' && (
        <div>
          <div className="bg-surface rounded-2xl p-6 text-center mb-6">
            <div className="text-3xl mb-3">🏋️</div>
            <h3 className="text-lg font-bold text-dark mb-2">Gym & Equipment Exercises</h3>
            <p className="text-sm text-muted">Exercises that require specific equipment like benches, weight vests, cables, etc.</p>
          </div>

          {/* Group by equipment */}
          {(() => {
            const byEquip = {}
            gymExercises.forEach(ex => {
              (ex.equipment_required || []).forEach(eq => {
                if (!['pull_up_bar', 'dip_bars', 'wall', 'rings'].includes(eq)) {
                  if (!byEquip[eq]) byEquip[eq] = []
                  if (!byEquip[eq].find(e => e.id === ex.id)) byEquip[eq].push(ex)
                }
              })
            })
            return Object.entries(byEquip).sort((a, b) => b[1].length - a[1].length).map(([equip, exs]) => (
              <div key={equip} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🔧</span>
                  <h3 className="text-sm font-bold text-dark">{equip.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                  <span className="text-[10px] text-dim">{exs.length} exercises</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {exs.map(ex => (
                    <div key={ex.id} onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                      className="bg-white border border-border rounded-xl p-3 hover:border-amber-200 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-dark">{ex.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${ex.difficulty === 'beginner' ? 'bg-green-500' : ex.difficulty === 'intermediate' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className="text-[9px] text-dim">{ex.difficulty}</span>
                      </div>
                      {expanded === ex.id && (
                        <div className="mt-2 pt-2 border-t border-border">
                          {ex.description && <p className="text-[10px] text-muted mb-1">{ex.description}</p>}
                          {ex.primary_muscles?.length > 0 && <div className="text-[9px] text-sky-600">{ex.primary_muscles.join(', ')}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRequest(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-dark">Request Exercise</h2>
              <button onClick={() => setShowRequest(false)} className="text-muted hover:text-dark text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {reqSent ? (
                <div className="text-center py-4"><div className="text-3xl mb-2">✅</div><p className="text-sm text-green-600 font-medium">Request sent!</p></div>
              ) : (
                <>
                  <div><label className="block text-sm text-muted mb-1.5">Exercise Name *</label><input type="text" value={reqName} onChange={e => setReqName(e.target.value)} placeholder="e.g. Cable Fly" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" /></div>
                  <div><label className="block text-sm text-muted mb-1.5">Category</label><select value={reqCat} onChange={e => setReqCat(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400">{['push', 'pull', 'legs', 'core', 'cardio', 'flexibility'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
                  <div><label className="block text-sm text-muted mb-1.5">Description</label><textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} rows={2} placeholder="Optional" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 resize-none" /></div>
                  <button onClick={handleRequest} disabled={!reqName.trim()} className="w-full py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-sm font-bold disabled:opacity-50">Submit Request</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}