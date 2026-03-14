import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const CATEGORIES = ['all', 'push', 'pull', 'legs', 'core', 'cardio', 'flexibility']

const CAT_ICONS = {
  all: '✦', push: '⬆️', pull: '⬇️', legs: '🦵', core: '💎', cardio: '❤️', flexibility: '🌀',
}

const DIFF_COLORS = {
  beginner:     { dot: 'bg-green-500', badge: 'bg-green-50 text-green-600' },
  intermediate: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600' },
  advanced:     { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-600' },
}

export default function BuildTab() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [links, setLinks] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [source, setSource] = useState('cali')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  // Builder
  const [selected, setSelected] = useState([])
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [workoutName, setWorkoutName] = useState('')
  const [configs, setConfigs] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)

  // Drag & drop
  const dragId = useRef(null)

  // Favorites
  const [favExercises, setFavExercises] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: ex }, { data: lk }, { data: mt }, { data: prof }] = await Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('exercise_links').select('*'),
      supabase.from('training_methods').select('*').order('name'),
      supabase.from('profiles').select('favorited_exercises').eq('id', user.id).single(),
    ])
    setExercises(ex || [])
    setLinks(lk || [])
    setMethods(mt || [])
    setFavExercises(prof?.favorited_exercises || [])
    setLoading(false)
  }

  const exMap = useMemo(() => Object.fromEntries(exercises.map(e => [e.id, e])), [exercises])

  const filtered = useMemo(() => {
    let result = exercises
    if (source === 'cali') result = result.filter(e => !e.equipment_required?.length)
    if (source === 'gym')  result = result.filter(e => e.equipment_required?.length > 0)
    if (catFilter !== 'all') result = result.filter(e => e.category === catFilter)
    if (search) result = result.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    if (showSaved) result = result.filter(e => favExercises.includes(e.id))
    return result
  }, [exercises, source, catFilter, search, showSaved, favExercises])

  const toggleSelect = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      const ex = exMap[id]
      if (ex && !configs[id]) {
        setConfigs(c => ({ ...c, [id]: { sets: 3, reps: ex.tracking_type === 'reps' ? 10 : null, time: ex.tracking_type === 'time' ? 30 : null, rest: 60, notes: '', warmup: false } }))
      }
      return [...prev, id]
    })
  }

  const updateConfig = (id, field, value) => setConfigs(c => ({ ...c, [id]: { ...c[id], [field]: value } }))

  const moveSelected = (id, dir) => {
    setSelected(prev => {
      const idx = prev.indexOf(id); const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]; [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]; return arr
    })
  }

  // DnD handlers
  const handleDragStart = (id) => { dragId.current = id }
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId.current || dragId.current === targetId) return
    setSelected(prev => {
      const arr = [...prev]
      const fromIdx = arr.indexOf(dragId.current)
      const toIdx = arr.indexOf(targetId)
      arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, dragId.current)
      return arr
    })
    dragId.current = null
  }

  const toggleFavExercise = async (exId) => {
    const isFav = favExercises.includes(exId)
    const newFavs = isFav ? favExercises.filter(id => id !== exId) : [...favExercises, exId]
    setFavExercises(newFavs)
    await supabase.from('profiles').update({ favorited_exercises: newFavs }).eq('id', user.id)
  }

  const handleSave = async () => {
    if (!workoutName.trim() || selected.length === 0) return
    setSaving(true)
    const { data: w } = await supabase.from('workouts').insert({
      name: workoutName, created_by: user.id, difficulty: 'intermediate',
      estimated_duration: selected.length * 5,
      tags: selectedMethod ? [selectedMethod.slug || selectedMethod.name] : [],
    }).select().single()
    if (w) {
      const rows = selected.map((id, i) => {
        const cfg = configs[id] || {}
        return { workout_id: w.id, exercise_id: id, order_index: i, target_sets: cfg.sets || 3, target_reps: cfg.reps || null, target_time_seconds: cfg.time || null, rest_seconds: cfg.rest || 60 }
      })
      await supabase.from('workout_exercises').insert(rows)
    }
    setSaving(false); setSaved(true); setShowDetailView(false)
    setTimeout(() => { setWorkoutName(''); setSelected([]); setConfigs({}); setSelectedMethod(null); setSaved(false) }, 2000)
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading...</div>

  const sourceConfig = {
    cali: { label: 'Calisthenics', icon: '🤸', desc: 'Bodyweight only', color: 'from-green-500 to-emerald-600' },
    gym:  { label: 'Gym',          icon: '🏋️', desc: 'Equipment-based', color: 'from-red-500 to-red-600' },
    mix:  { label: 'Mix',          icon: '🔀', desc: 'All exercises',   color: 'from-violet-500 to-purple-600' },
  }

  return (
    <div className="flex gap-6">
      {/* LEFT: Exercise Browser */}
      <div className="flex-1 min-w-0">
        {/* Source Toggle */}
        <div className="flex gap-2 mb-5">
          {Object.entries(sourceConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => { setSource(key); setCatFilter('all'); setSearch(''); setShowSaved(false) }}
              className={`flex-1 p-3.5 rounded-xl text-left transition-all ${source === key ? `bg-gradient-to-br ${cfg.color} text-white shadow-lg` : 'bg-white border border-border text-muted hover:border-red-200 hover:shadow-sm'}`}>
              <div className="text-xl mb-1">{cfg.icon}</div>
              <div className={`text-xs font-bold ${source === key ? 'text-white' : 'text-dark'}`}>{cfg.label}</div>
              <div className={`text-[9px] mt-0.5 ${source === key ? 'text-white/70' : 'text-dim'}`}>{cfg.desc}</div>
            </button>
          ))}
        </div>

        {/* Search + Category Filter */}
        <div className="mb-4 space-y-2.5">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => { setCatFilter(c); setShowSaved(false) }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === c && !showSaved ? 'bg-dark text-white' : 'bg-white border border-border text-muted hover:border-red-200'}`}>
                <span>{CAT_ICONS[c]}</span>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
            <button onClick={() => { setShowSaved(s => !s); setCatFilter('all') }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showSaved ? 'bg-red-500 text-white' : 'bg-white border border-border text-muted hover:border-red-200'}`}>
              ❤️ Saved
            </button>
            {favExercises.length > 0 && (
              <button onClick={() => setShowSavedModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-all ml-auto">
                ♥ Liste öffnen ({favExercises.length})
              </button>
            )}
          </div>
        </div>

        {/* Exercise Grid */}
        <ExGrid exercises={filtered} selected={selected} toggleSelect={toggleSelect} links={links}
          favExercises={favExercises} toggleFav={toggleFavExercise} />
      </div>

      {/* RIGHT: Workout Builder */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-4">
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-dark p-4">
              <div className="text-[10px] text-white/50 mb-1.5 font-semibold tracking-wider">NEW WORKOUT</div>
              <input type="text" value={workoutName} onChange={e => setWorkoutName(e.target.value)} placeholder="Name your workout..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50" />
            </div>

            {/* Method Picker */}
            <div className="p-3 border-b border-border">
              {selectedMethod ? (
                <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl p-3">
                  <div>
                    <div className="text-[9px] text-red-400 font-bold tracking-wider">METHOD</div>
                    <div className="text-xs font-bold text-dark mt-0.5">{selectedMethod.name}</div>
                  </div>
                  <button onClick={() => setSelectedMethod(null)} className="text-dim hover:text-red-500 text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100">&times;</button>
                </div>
              ) : (
                <button onClick={() => setShowMethodPicker(true)}
                  className="w-full py-2.5 border border-dashed border-border rounded-xl text-[10px] text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50/30 transition-all flex items-center justify-center gap-1.5">
                  <span className="text-sm">📖</span> Add training method (optional)
                </button>
              )}
            </div>

            {/* Selected Exercises */}
            <div className="p-3 max-h-[380px] overflow-y-auto">
              {selected.length > 0 ? (
                <div className="space-y-2">
                  {selected.map((id, idx) => {
                    const ex = exMap[id]; if (!ex) return null
                    const cfg = configs[id] || {}
                    return (
                      <div key={id}
                        draggable
                        onDragStart={() => handleDragStart(id)}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, id)}
                        className="bg-surface rounded-xl p-3 border border-border/50 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-dim text-base select-none flex-shrink-0" title="Drag to reorder">⠿</span>
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[9px] font-black">{idx + 1}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-dark truncate">{ex.name}</span>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button onClick={() => moveSelected(id, -1)} disabled={idx === 0} className="text-dim hover:text-dark text-[10px] disabled:opacity-20 p-0.5">&uarr;</button>
                            <button onClick={() => moveSelected(id, 1)} disabled={idx === selected.length - 1} className="text-dim hover:text-dark text-[10px] disabled:opacity-20 p-0.5">&darr;</button>
                            <button onClick={() => toggleSelect(id)} className="text-dim hover:text-red-500 text-[10px] p-0.5 ml-1">&times;</button>
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
                <div className="text-center py-8 space-y-1">
                  <div className="text-3xl opacity-30">+</div>
                  <p className="text-[11px] text-muted">Tap exercises to add them</p>
                  <p className="text-[10px] text-dim">{filtered.length} available</p>
                </div>
              )}
            </div>

            {/* Save */}
            {selected.length > 0 && (
              <div className="p-3 border-t border-border space-y-2">
                <div className="text-[10px] text-dim text-center">{selected.length} exercises · ~{selected.length * 5} min</div>
                <button onClick={() => setShowDetailView(true)}
                  className="w-full py-2.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50/30 transition-all">
                  ⚙ Details
                </button>
                {saved ? (
                  <div className="text-center py-2.5 text-green-500 font-bold text-sm">✓ Saved!</div>
                ) : (
                  <button onClick={handleSave} disabled={saving || !workoutName.trim()}
                    className="w-full py-3 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-30 transition-all">
                    {saving ? 'Saving...' : '✓ Save Workout'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Method Picker Modal */}
      {showMethodPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMethodPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-dark">Choose a Training Method</h2>
              <button onClick={() => setShowMethodPicker(false)} className="text-muted hover:text-dark text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {methods.map(m => (
                <button key={m.id} onClick={() => { setSelectedMethod(m); setShowMethodPicker(false) }}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-red-300 hover:bg-red-50/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base font-black text-red-500 flex-shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-dark">{m.name}</div>
                      <div className="text-[10px] text-muted mt-0.5">{m.short_description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {showDetailView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input type="text" value={workoutName} onChange={e => setWorkoutName(e.target.value)}
                  placeholder="Workout name..."
                  className="text-lg font-bold text-dark bg-transparent focus:outline-none focus:border-b-2 focus:border-red-400 w-full" />
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {selectedMethod && (
                  <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 rounded-full font-semibold">{selectedMethod.name}</span>
                )}
                <button onClick={() => setShowDetailView(false)} className="text-muted hover:text-dark text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface">&times;</button>
              </div>
            </div>

            {/* Exercise rows */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selected.map((id, idx) => {
                const ex = exMap[id]; if (!ex) return null
                const cfg = configs[id] || {}
                return (
                  <div key={id} className="bg-surface rounded-2xl p-4 border border-border/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-black">{idx + 1}</span>
                      </div>
                      <div className="font-bold text-dark">{ex.name}</div>
                      {cfg.warmup && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">Warm-up</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-muted mb-1.5 font-medium">Sets</label>
                        <input type="number" value={cfg.sets || 3} onChange={e => updateConfig(id, 'sets', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                      </div>
                      {ex.tracking_type === 'reps' ? (
                        <div>
                          <label className="block text-xs text-muted mb-1.5 font-medium">Reps</label>
                          <input type="number" value={cfg.reps || ''} onChange={e => updateConfig(id, 'reps', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-muted mb-1.5 font-medium">Seconds</label>
                          <input type="number" value={cfg.time || ''} onChange={e => updateConfig(id, 'time', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-muted mb-1.5 font-medium">Rest (s)</label>
                        <input type="number" value={cfg.rest || 60} onChange={e => updateConfig(id, 'rest', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 text-center" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-muted mb-1.5 font-medium">Notes</label>
                      <textarea value={cfg.notes || ''} onChange={e => updateConfig(id, 'notes', e.target.value)}
                        rows={2} placeholder="e.g. Focus on form, slow eccentric..."
                        className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400 resize-none" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={cfg.warmup || false} onChange={e => updateConfig(id, 'warmup', e.target.checked)}
                        className="w-4 h-4 rounded accent-red-500" />
                      <span className="text-xs text-muted font-medium">Mark as warm-up set</span>
                    </label>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border">
              {saved ? (
                <div className="text-center py-2 text-green-500 font-bold text-sm">✓ Saved!</div>
              ) : (
                <button onClick={handleSave} disabled={saving || !workoutName.trim()}
                  className="w-full py-3 bg-dark text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-30 transition-all">
                  {saving ? 'Saving...' : '✓ Save Workout'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Exercises Modal */}
      {showSavedModal && (
        <SavedExercisesModal
          exercises={exercises}
          favExercises={favExercises}
          toggleFav={toggleFavExercise}
          selected={selected}
          toggleSelect={toggleSelect}
          onClose={() => setShowSavedModal(false)}
        />
      )}

      {/* Mobile Bottom Tray */}
      {selected.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 z-40 shadow-lg">
          <div className="flex items-center gap-3">
            <input type="text" value={workoutName} onChange={e => setWorkoutName(e.target.value)} placeholder="Workout name..."
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-red-400" />
            <button onClick={handleSave} disabled={saving || !workoutName.trim()}
              className="py-2.5 px-5 bg-dark text-white rounded-xl text-xs font-bold flex-shrink-0 disabled:opacity-30">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExGrid({ exercises, selected, toggleSelect, links, favExercises, toggleFav }) {
  return (
    <div>
      <div className="text-[10px] text-dim mb-3">{exercises.length} exercises</div>
      <div className="grid grid-cols-2 gap-3">
        {exercises.map(ex => {
          const isSel = selected.includes(ex.id)
          const selIdx = selected.indexOf(ex.id)
          const hasTree = links.some(l => l.exercise_id === ex.id)
          const diff = DIFF_COLORS[ex.difficulty] || DIFF_COLORS.intermediate
          const isGym = ex.equipment_required?.length > 0
          const isFav = favExercises.includes(ex.id)
          return (
            <div key={ex.id} className="relative">
              <div onClick={() => toggleSelect(ex.id)}
                className={`rounded-2xl overflow-hidden transition-all cursor-pointer group ${isSel ? 'ring-2 ring-red-400 shadow-lg shadow-red-100' : 'bg-white border border-border hover:border-red-200 hover:shadow-md'}`}>
                <div className={`h-20 flex items-center justify-center relative ${isSel ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-surface to-white'}`}>
                  <span className={`text-4xl transition-transform ${isSel ? 'scale-110' : 'group-hover:scale-105 opacity-20'}`}>
                    {isGym ? '🏋️' : '🤸'}
                  </span>
                  {isSel && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-[10px] font-black">{selIdx + 1}</span>
                    </div>
                  )}
                  {hasTree && (
                    <span className="absolute top-2 right-2 text-[8px] bg-purple-100 text-purple-500 px-1.5 py-0.5 rounded-full font-bold">🌳</span>
                  )}
                </div>
                <div className={`p-3 ${isSel ? 'bg-red-50/40' : ''}`}>
                  <div className="text-xs font-bold text-dark leading-tight mb-1.5 pr-5">{ex.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${diff.badge}`}>{ex.difficulty}</span>
                    {isGym
                      ? <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">🔧 {ex.equipment_required[0]?.replace(/_/g, ' ')}</span>
                      : <span className="text-[8px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">✓ Bodyweight</span>
                    }
                  </div>
                </div>
              </div>
              {/* Favorite button */}
              <button
                onClick={e => { e.stopPropagation(); toggleFav(ex.id) }}
                className={`absolute bottom-3 right-3 text-base leading-none hover:scale-110 transition-transform ${isFav ? 'text-red-500' : 'text-muted'}`}
                title={isFav ? 'Remove from saved' : 'Save exercise'}>
                {isFav ? '♥' : '♡'}
              </button>
            </div>
          )
        })}
        {exercises.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted text-sm">
            <div className="text-3xl mb-2">🔍</div>
            No exercises found
          </div>
        )}
      </div>
    </div>
  )
}

function SavedExercisesModal({ exercises, favExercises, toggleFav, selected, toggleSelect, onClose }) {
  const savedExercises = exercises.filter(e => favExercises.includes(e.id))
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-bold text-dark">
            ♥ Gespeicherte Übungen <span className="text-muted font-normal">({savedExercises.length})</span>
          </h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {savedExercises.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3 text-muted">♡</div>
              <p className="text-sm text-muted">Noch keine gespeicherten Übungen</p>
              <p className="text-xs text-dim mt-1">Tippe auf ♡ bei einer Übung um sie zu speichern</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedExercises.map(ex => {
                const isSel = selected.includes(ex.id)
                const isGym = ex.equipment_required?.length > 0
                const diff = { beginner: 'bg-green-50 text-green-600', intermediate: 'bg-amber-50 text-amber-600', advanced: 'bg-red-50 text-red-600' }[ex.difficulty] || 'bg-amber-50 text-amber-600'
                return (
                  <div key={ex.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{isGym ? '🏋️' : '🤸'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-dark truncate">{ex.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${diff}`}>{ex.difficulty}</span>
                          <span className="text-[9px] text-dim capitalize">{ex.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <button onClick={() => toggleFav(ex.id)} className="text-red-400 hover:text-red-600 text-sm transition-colors" title="Aus Favoriten entfernen">♥</button>
                      <button onClick={() => toggleSelect(ex.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isSel ? 'bg-red-500 text-white' : 'bg-dark text-white hover:bg-red-600'}`}>
                        {isSel ? '✓ Hinzugefügt' : '+ Hinzufügen'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface transition-all">Schließen</button>
        </div>
      </div>
    </div>
  )
}
