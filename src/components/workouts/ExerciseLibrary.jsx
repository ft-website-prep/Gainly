import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🔥' },
  { id: 'push', label: 'Push', icon: '🫸' },
  { id: 'pull', label: 'Pull', icon: '🫷' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'core', label: 'Core', icon: '💎' },
  { id: 'cardio', label: 'Cardio', icon: '❤️' },
  { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
]

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [diffFilter, setDiffFilter] = useState('all')
  const [equipFilter, setEquipFilter] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showRequest, setShowRequest] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqCat, setReqCat] = useState('push')
  const [reqSent, setReqSent] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').order('category').order('difficulty').order('name')
      .then(({ data }) => { setExercises(data || []); setLoading(false) })
  }, [])

  const allEquipment = [...new Set(exercises.flatMap(e => e.equipment_required || []).filter(Boolean))].sort()

  const toggleEquip = (eq) => setEquipFilter(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq])

  const filtered = exercises.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false
    if (diffFilter !== 'all' && e.difficulty !== diffFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (equipFilter.length > 0) {
      const req = e.equipment_required || []
      if (req.length === 0) return true // bodyweight exercises always show
      if (!equipFilter.some(f => req.includes(f))) return false
    }
    return true
  })

  const handleRequest = async () => {
    if (!reqName.trim()) return
    await supabase.from('exercise_requests').insert({ user_id: user.id, exercise_name: reqName, description: reqDesc, category: reqCat })
    setReqSent(true); setTimeout(() => { setShowRequest(false); setReqSent(false); setReqName(''); setReqDesc('') }, 2000)
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading exercises...</div>

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" />
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCatFilter(c.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === c.id ? 'bg-sky-100 text-sky-600 border border-sky-200' : 'bg-surface text-muted border border-transparent'}`}>
            <span>{c.icon}</span>{c.label}
          </button>
        ))}
      </div>

      {/* Difficulty Filter */}
      <div className="flex gap-1.5 mb-3">
        {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
          <button key={d} onClick={() => setDiffFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${diffFilter === d
              ? d === 'beginner' ? 'bg-green-100 text-green-600' : d === 'intermediate' ? 'bg-amber-100 text-amber-600' : d === 'advanced' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'
              : 'bg-surface text-muted'}`}>
            {d === 'all' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* Equipment Multi-Filter */}
      {allEquipment.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-dim mb-1.5 font-medium">Equipment Filter (select what you have):</div>
          <div className="flex gap-1.5 flex-wrap">
            {allEquipment.map(eq => (
              <button key={eq} onClick={() => toggleEquip(eq)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${equipFilter.includes(eq) ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface text-dim border border-transparent'}`}>
                🔧 {eq.replace(/_/g, ' ')}
              </button>
            ))}
            {equipFilter.length > 0 && (
              <button onClick={() => setEquipFilter([])} className="px-2.5 py-1 rounded-lg text-[11px] text-red-400 hover:text-red-500">✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Results Count + Request */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-dim">{filtered.length} exercise{filtered.length !== 1 ? 's' : ''} found</p>
        <button onClick={() => setShowRequest(true)} className="text-xs text-sky-500 hover:text-sky-600 font-medium">Missing an exercise? Request it →</button>
      </div>

      {/* Exercise Grid */}
      <div className="space-y-2">
        {filtered.map(ex => (
          <div key={ex.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-sky-50/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-lg">
                  {ex.is_static_hold ? '⏱️' : ex.tracking_type === 'time' ? '⏱️' : '🔢'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-dark">{ex.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-dim">{ex.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{ex.difficulty}</span>
                    {ex.is_static_hold && <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">Hold</span>}
                  </div>
                </div>
              </div>
              <span className={`text-dim text-xs transition-transform ${expanded === ex.id ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expanded === ex.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                {ex.description && <p className="text-sm text-muted">{ex.description}</p>}
                {ex.primary_muscles?.length > 0 && (
                  <div><span className="text-xs text-dim">Primary: </span>{ex.primary_muscles.map(m => <span key={m} className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded mr-1">{m}</span>)}</div>
                )}
                {ex.secondary_muscles?.length > 0 && (
                  <div><span className="text-xs text-dim">Secondary: </span>{ex.secondary_muscles.map(m => <span key={m} className="text-xs bg-surface text-dim px-1.5 py-0.5 rounded mr-1">{m}</span>)}</div>
                )}
                {ex.equipment_required?.length > 0 && (
                  <div><span className="text-xs text-dim">Equipment: </span>{ex.equipment_required.map(eq => <span key={eq} className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded mr-1">🔧 {eq.replace(/_/g, ' ')}</span>)}</div>
                )}
                {(!ex.equipment_required || ex.equipment_required.length === 0) && <div className="text-xs text-green-500 font-medium">✓ No equipment needed</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-dark">Request Exercise</h2>
              <button onClick={() => setShowRequest(false)} className="text-muted hover:text-dark text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {reqSent ? (
                <div className="text-center py-4"><div className="text-3xl mb-2">✅</div><p className="text-sm text-green-600 font-medium">Request sent! We'll review it.</p></div>
              ) : (
                <>
                  <div><label className="block text-sm text-muted mb-1.5">Exercise Name *</label><input type="text" value={reqName} onChange={e => setReqName(e.target.value)} placeholder="e.g. One Arm Pull-Up" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400" /></div>
                  <div><label className="block text-sm text-muted mb-1.5">Category</label><select value={reqCat} onChange={e => setReqCat(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400">{['push', 'pull', 'legs', 'core', 'cardio', 'flexibility'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
                  <div><label className="block text-sm text-muted mb-1.5">Description</label><textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} rows={2} placeholder="Optional description" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-sky-400 resize-none" /></div>
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