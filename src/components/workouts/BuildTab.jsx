import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// HYBRID CATEGORY STRUCTURE
// =============================================
const MAIN_CATEGORIES = [
  {
    id: 'upper', label: 'Upper Body', icon: '💪', color: 'from-red-500 to-red-700',
    subs: [
      { id: 'chest', label: 'Chest', muscles: ['chest'] },
      { id: 'shoulders', label: 'Shoulders', muscles: ['shoulders', 'front_delts', 'rear_delts'] },
      { id: 'triceps', label: 'Triceps', muscles: ['triceps'] },
      { id: 'biceps', label: 'Biceps', muscles: ['biceps'] },
      { id: 'back', label: 'Back', muscles: ['lats', 'rhomboids', 'traps', 'upper_back'] },
      { id: 'forearms', label: 'Forearms', muscles: ['forearms'] },
    ]
  },
  {
    id: 'lower', label: 'Lower Body', icon: '🦵', color: 'from-green-500 to-red-600',
    subs: [
      { id: 'quads', label: 'Quads', muscles: ['quads'] },
      { id: 'hamstrings', label: 'Hamstrings', muscles: ['hamstrings'] },
      { id: 'glutes', label: 'Glutes', muscles: ['glutes'] },
      { id: 'calves', label: 'Calves', muscles: ['calves'] },
      { id: 'hip_flexors', label: 'Hip Flexors', muscles: ['hip_flexors', 'adductors'] },
    ]
  },
  {
    id: 'core', label: 'Core', icon: '💎', color: 'from-amber-500 to-orange-500',
    subs: [
      { id: 'abs', label: 'Abs', muscles: ['core', 'abs'] },
      { id: 'obliques', label: 'Obliques', muscles: ['obliques'] },
      { id: 'lower_back', label: 'Lower Back', muscles: ['lower_back'] },
    ]
  },
  {
    id: 'cardio', label: 'Cardio & Flex', icon: '❤️', color: 'from-red-500 to-pink-500',
    subs: [
      { id: 'cardio', label: 'Cardio', muscles: [] },
      { id: 'flexibility', label: 'Flexibility', muscles: [] },
    ]
  },
]

const DIFF_COLORS = {
  beginner: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-600' },
  intermediate: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600' },
  advanced: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' },
}

export default function BuildTab() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  // Navigation
  const [view, setView] = useState('categories') // categories | subcategory | list
  const [selectedMain, setSelectedMain] = useState(null)
  const [selectedSub, setSelectedSub] = useState(null)
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('all')

  // Selection (Variant B)
  const [selected, setSelected] = useState([]) // exercise IDs
  const [workoutName, setWorkoutName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Config for selected exercises
  const [configs, setConfigs] = useState({}) // { exId: { sets, reps, time, rest } }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: ex }, { data: lk }] = await Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('exercise_links').select('*'),
    ])
    setExercises(ex || [])
    setLinks(lk || [])
    setLoading(false)
  }

  const exMap = useMemo(() => Object.fromEntries(exercises.map(e => [e.id, e])), [exercises])

  // Filter exercises based on current view
  const filtered = useMemo(() => {
    let result = exercises

    if (selectedSub) {
      const sub = MAIN_CATEGORIES.flatMap(m => m.subs).find(s => s.id === selectedSub)
      if (sub) {
        if (sub.id === 'cardio') result = result.filter(e => e.category === 'cardio')
        else if (sub.id === 'flexibility') result = result.filter(e => e.category === 'flexibility')
        else result = result.filter(e => e.primary_muscles?.some(m => sub.muscles.includes(m)))
      }
    } else if (selectedMain) {
      const main = MAIN_CATEGORIES.find(m => m.id === selectedMain)
      if (main) {
        const allMuscles = main.subs.flatMap(s => s.muscles)
        if (selectedMain === 'cardio') result = result.filter(e => e.category === 'cardio' || e.category === 'flexibility')
        else result = result.filter(e => e.primary_muscles?.some(m => allMuscles.includes(m)))
      }
    }

    if (diffFilter !== 'all') result = result.filter(e => e.difficulty === diffFilter)
    if (search) result = result.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

    return result
  }, [exercises, selectedMain, selectedSub, diffFilter, search])

  const toggleSelect = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      // Set default config
      const ex = exMap[id]
      if (ex && !configs[id]) {
        setConfigs(c => ({ ...c, [id]: {
          sets: 3,
          reps: ex.tracking_type === 'reps' ? 10 : null,
          time: ex.tracking_type === 'time' ? 30 : null,
          rest: 60,
        }}))
      }
      return [...prev, id]
    })
  }

  const updateConfig = (id, field, value) => {
    setConfigs(c => ({ ...c, [id]: { ...c[id], [field]: value } }))
  }

  const moveSelected = (id, dir) => {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
  }

  const handleSave = async () => {
    if (!workoutName.trim() || selected.length === 0) return
    setSaving(true)

    const { data: w } = await supabase.from('workouts').insert({
      name: workoutName, created_by: user.id, difficulty: 'intermediate',
      estimated_duration: selected.length * 5,
    }).select().single()

    if (w) {
      const rows = selected.map((id, i) => {
        const cfg = configs[id] || {}
        return {
          workout_id: w.id, exercise_id: id, order_index: i,
          target_sets: cfg.sets || 3, target_reps: cfg.reps || null,
          target_time_seconds: cfg.time || null, rest_seconds: cfg.rest || 60,
        }
      })
      await supabase.from('workout_exercises').insert(rows)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      setWorkoutName(''); setSelected([]); setConfigs({}); setSaved(false)
    }, 2000)
  }

  const hasTree = (exId) => links.some(l => l.exercise_id === exId)

  const countForSub = (sub) => {
    if (sub.id === 'cardio') return exercises.filter(e => e.category === 'cardio').length
    if (sub.id === 'flexibility') return exercises.filter(e => e.category === 'flexibility').length
    return exercises.filter(e => e.primary_muscles?.some(m => sub.muscles.includes(m))).length
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  return (
    <div className="flex gap-6">
      {/* LEFT: Exercise Browser */}
      <div className="flex-1 min-w-0">
        {/* View Toggle: Categories vs. All List */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setView('categories'); setSelectedMain(null); setSelectedSub(null); setSearch(''); setDiffFilter('all') }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'categories' || view === 'subcategory' ? 'bg-dark text-white' : 'bg-white border border-border text-muted'}`}>
            📂 By Category
          </button>
          <button onClick={() => { setView('list'); setSelectedMain(null); setSelectedSub(null) }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-dark text-white' : 'bg-white border border-border text-muted'}`}>
            📋 All Exercises
          </button>
        </div>

        {/* ============ CATEGORIES VIEW ============ */}
        {view === 'categories' && !selectedMain && (
          <div>
            <h2 className="text-lg font-black text-dark mb-4">Choose a muscle group</h2>
            <div className="grid grid-cols-2 gap-3">
              {MAIN_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setSelectedMain(cat.id); setView('subcategory') }}
                  className="bg-white border border-border rounded-2xl p-5 text-left hover:shadow-md hover:border-red-200 transition-all group">
                  <div className={`w-11 h-11 bg-gradient-to-br ${cat.color} rounded-xl flex items-center justify-center text-xl mb-3 shadow-sm group-hover:scale-105 transition-transform`}>
                    {cat.icon}
                  </div>
                  <div className="text-sm font-bold text-dark">{cat.label}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cat.subs.map(s => (
                      <span key={s.id} className="text-[9px] bg-surface text-dim px-1.5 py-0.5 rounded">{s.label}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ SUBCATEGORY VIEW ============ */}
        {view === 'subcategory' && selectedMain && !selectedSub && (
          <div>
            <button onClick={() => { setSelectedMain(null); setView('categories') }}
              className="text-muted hover:text-dark text-xs font-medium mb-3 flex items-center gap-1">← Back</button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${MAIN_CATEGORIES.find(m => m.id === selectedMain)?.color} rounded-xl flex items-center justify-center text-lg shadow-sm`}>
                {MAIN_CATEGORIES.find(m => m.id === selectedMain)?.icon}
              </div>
              <h2 className="text-lg font-black text-dark">{MAIN_CATEGORIES.find(m => m.id === selectedMain)?.label}</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {MAIN_CATEGORIES.find(m => m.id === selectedMain)?.subs.map(sub => (
                <button key={sub.id} onClick={() => setSelectedSub(sub.id)}
                  className="bg-white border border-border rounded-xl p-4 text-left hover:shadow-sm hover:border-red-200 transition-all">
                  <div className="text-sm font-bold text-dark">{sub.label}</div>
                  <div className="text-[10px] text-muted mt-1">{countForSub(sub)} exercises</div>
                </button>
              ))}
              {/* Show All in this main category */}
              <button onClick={() => setSelectedSub('__all__')}
                className="bg-red-50 border border-red-200 rounded-xl p-4 text-left hover:shadow-sm transition-all">
                <div className="text-sm font-bold text-red-600">All</div>
                <div className="text-[10px] text-red-400 mt-1">Show everything</div>
              </button>
            </div>
          </div>
        )}

        {/* ============ EXERCISE LIST (after subcategory or "All" view) ============ */}
        {(selectedSub || view === 'list') && (
          <div>
            {selectedSub && (
              <button onClick={() => { setSelectedSub(null); setSearch(''); setDiffFilter('all') }}
                className="text-muted hover:text-dark text-xs font-medium mb-3 flex items-center gap-1">← Back</button>
            )}

            {/* Search + Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
                className="flex-1 min-w-[180px] bg-white border border-border rounded-lg px-3 py-2.5 text-dark text-xs focus:outline-none focus:border-red-400" />
              <div className="flex gap-1">
                {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
                  <button key={d} onClick={() => setDiffFilter(d)}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all ${diffFilter === d
                      ? d === 'beginner' ? 'bg-green-100 text-green-600' : d === 'intermediate' ? 'bg-amber-100 text-amber-600' : d === 'advanced' ? 'bg-red-100 text-red-600' : 'bg-dark text-white'
                      : 'bg-surface text-muted hover:bg-white'}`}>
                    {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-dim mb-3">{filtered.length} exercises</div>

            {/* Exercise Grid - Variant B (click to select blue) */}
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(ex => {
                const isSel = selected.includes(ex.id)
                const selIdx = selected.indexOf(ex.id)
                const diff = DIFF_COLORS[ex.difficulty] || DIFF_COLORS.intermediate
                const tree = hasTree(ex.id)
                const prereqs = links.filter(l => l.exercise_id === ex.id && l.link_type === 'prerequisite').map(l => exMap[l.related_exercise_id]).filter(Boolean)
                const progs = links.filter(l => l.exercise_id === ex.id && l.link_type === 'progression').map(l => exMap[l.related_exercise_id]).filter(Boolean)

                return (
                  <div key={ex.id} onClick={() => toggleSelect(ex.id)}
                    className={`rounded-xl overflow-hidden transition-all cursor-pointer ${isSel ? 'ring-2 ring-sky-400 bg-red-50/50 shadow-md' : 'bg-white border border-border hover:border-red-200 hover:shadow-sm'}`}>
                    {/* 3D Placeholder */}
                    <div className={`h-20 flex items-center justify-center relative ${isSel ? 'bg-gradient-to-br from-sky-50 to-sky-100' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
                      <span className="text-3xl opacity-20">🏋️</span>
                      <span className="absolute bottom-1.5 right-2 text-[8px] text-dim bg-white/80 px-1.5 py-0.5 rounded">3D</span>
                      {isSel && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-[10px] font-black">{selIdx + 1}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-dark truncate">{ex.name}</span>
                        {tree && <span className="text-[8px] bg-purple-50 text-purple-500 px-1 py-0.5 rounded flex-shrink-0">🌳</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                        <span className="text-[9px] text-dim">{ex.difficulty}</span>
                        {ex.is_static_hold && <span className="text-[9px] text-dim">· hold</span>}
                      </div>
                      <div className="text-[9px] text-dim mt-1">{ex.primary_muscles?.join(', ')}</div>
                      {ex.equipment_required?.length > 0
                        ? <div className="text-[9px] text-amber-600 mt-1">🔧 {ex.equipment_required.map(e => e.replace(/_/g, ' ')).join(', ')}</div>
                        : <div className="text-[9px] text-green-500 mt-1">✓ Bodyweight</div>
                      }

                      {/* Mini progression preview */}
                      {tree && (prereqs.length > 0 || progs.length > 0) && (
                        <div className="bg-surface rounded-lg p-1.5 mt-2 space-y-0.5">
                          {prereqs.length > 0 && <div className="text-[8px] text-amber-600">↓ {prereqs.slice(0, 2).map(p => p.name).join(', ')}</div>}
                          {progs.length > 0 && <div className="text-[8px] text-green-600">↑ {progs.slice(0, 2).map(p => p.name).join(', ')}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Selection Sidebar (Variant B) */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-4">
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="bg-dark text-white p-4">
              <div className="text-[10px] text-white/50 mb-1.5">New Workout</div>
              <input type="text" value={workoutName} onChange={e => setWorkoutName(e.target.value)}
                placeholder="Workout name..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40" />
              <div className="text-[10px] text-white/40 mt-2">{selected.length} exercises selected</div>
            </div>

            <div className="p-3 max-h-[450px] overflow-y-auto">
              {selected.length > 0 ? (
                <div className="space-y-2">
                  {selected.map((id, idx) => {
                    const ex = exMap[id]
                    if (!ex) return null
                    const cfg = configs[id] || {}
                    return (
                      <div key={id} className="bg-surface rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[9px] font-black">{idx + 1}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-dark truncate">{ex.name}</span>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button onClick={() => moveSelected(id, -1)} disabled={idx === 0} className="text-dim hover:text-dark text-[10px] disabled:opacity-20 p-0.5">↑</button>
                            <button onClick={() => moveSelected(id, 1)} disabled={idx === selected.length - 1} className="text-dim hover:text-dark text-[10px] disabled:opacity-20 p-0.5">↓</button>
                            <button onClick={() => toggleSelect(id)} className="text-dim hover:text-red-500 text-[10px] p-0.5 ml-1">✕</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <div className="text-[8px] text-dim mb-0.5">Sets</div>
                            <input type="number" value={cfg.sets || 3} onChange={e => updateConfig(id, 'sets', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-border rounded px-2 py-1 text-[10px] text-dark focus:outline-none focus:border-red-400 text-center" />
                          </div>
                          {ex.tracking_type === 'reps' ? (
                            <div>
                              <div className="text-[8px] text-dim mb-0.5">Reps</div>
                              <input type="number" value={cfg.reps || ''} onChange={e => updateConfig(id, 'reps', parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-border rounded px-2 py-1 text-[10px] text-dark focus:outline-none focus:border-red-400 text-center" />
                            </div>
                          ) : (
                            <div>
                              <div className="text-[8px] text-dim mb-0.5">Sec</div>
                              <input type="number" value={cfg.time || ''} onChange={e => updateConfig(id, 'time', parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-border rounded px-2 py-1 text-[10px] text-dark focus:outline-none focus:border-red-400 text-center" />
                            </div>
                          )}
                          <div>
                            <div className="text-[8px] text-dim mb-0.5">Rest</div>
                            <input type="number" value={cfg.rest || 60} onChange={e => updateConfig(id, 'rest', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-border rounded px-2 py-1 text-[10px] text-dark focus:outline-none focus:border-red-400 text-center" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">🏗️</div>
                  <p className="text-[11px] text-muted">Click exercises to select them</p>
                  <p className="text-[9px] text-dim mt-1">They will appear here with config options</p>
                </div>
              )}
            </div>

            {selected.length > 0 && (
              <div className="p-3 border-t border-border">
                <div className="text-[10px] text-dim mb-2 text-center">~{selected.length * 5} min estimated</div>
                {saved ? (
                  <div className="text-center py-2 text-green-500 font-bold text-sm">✓ Saved!</div>
                ) : (
                  <button onClick={handleSave} disabled={saving || !workoutName.trim()}
                    className="w-full py-3 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-30 transition-all">
                    {saving ? 'Saving...' : 'Save Workout'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tray */}
      {selected.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 z-40 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto flex-1 mr-3">
              <span className="text-xs font-bold text-dark whitespace-nowrap">{selected.length} exercises</span>
              {selected.slice(0, 3).map(id => {
                const ex = exMap[id]
                return ex ? <span key={id} className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded whitespace-nowrap">{ex.name}</span> : null
              })}
              {selected.length > 3 && <span className="text-[9px] text-dim">+{selected.length - 3}</span>}
            </div>
            <button onClick={handleSave} disabled={saving || !workoutName.trim()}
              className="py-2.5 px-5 bg-dark text-white rounded-xl text-xs font-bold flex-shrink-0">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}