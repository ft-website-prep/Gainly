import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function upperBound(reps) {
  if (!reps || reps === 'max') return null
  if (reps.includes('-')) {
    const val = parseInt(reps.split('-')[1], 10)
    return isNaN(val) ? null : val
  }
  const val = parseInt(reps, 10)
  return isNaN(val) ? null : val
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function GymMethods({ gymExercises = [] }) {
  const { user } = useAuth()

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [swapTarget, setSwapTarget] = useState(null)
  const [sessionExercises, setSessionExercises] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [variantExpanded, setVariantExpanded] = useState(false)
  const [variantApplied, setVariantApplied] = useState(false)

  useEffect(() => {
    supabase.from('gym_methods').select('*').order('sort_order').then(({ data }) => {
      setMethods(data || [])
      setLoading(false)
    })
  }, [])

  const openMethod = (method) => {
    const copy = {}
    for (const session of method.sessions || []) {
      copy[session.id] = session.exercises.map(ex => ({ ...ex }))
    }
    setSessionExercises(copy)
    setSelected(method)
    setActiveTab('overview')
    setSwapTarget(null)
    setSaved(false)
    setVariantExpanded(false)
    setVariantApplied(false)
  }

  const closeModal = () => {
    setSelected(null)
    setSwapTarget(null)
    setSaved(false)
  }

  const toggleSwap = (sessionId, exIndex) => {
    if (swapTarget?.sessionId === sessionId && swapTarget?.exIndex === exIndex) {
      setSwapTarget(null)
    } else {
      setSwapTarget({ sessionId, exIndex })
    }
  }

  const swapExercise = (sessionId, exIndex, altName) => {
    setSessionExercises(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map((ex, i) =>
        i === exIndex ? { ...ex, display: altName, db_name: altName } : ex
      ),
    }))
    setSwapTarget(null)
  }

  const getExtraAlternatives = (sessionId, exIndex) => {
    const ex = sessionExercises[sessionId]?.[exIndex]
    if (!ex) return []
    const listed = new Set([ex.db_name, ...(ex.alternatives || [])])
    return gymExercises
      .filter(e => e.category === ex.category && !listed.has(e.name))
      .slice(0, 5)
      .map(e => e.name)
  }

  const saveAsPlan = async () => {
    if (!selected || !user) return
    setSaving(true)

    const allDbNames = []
    for (const session of selected.sessions || []) {
      for (const ex of sessionExercises[session.id] || session.exercises) {
        if (ex.db_name && !allDbNames.includes(ex.db_name)) allDbNames.push(ex.db_name)
      }
    }

    const { data: exerciseRows } = await supabase
      .from('exercises')
      .select('id, name')
      .in('name', allDbNames)

    const exMap = {}
    for (const row of exerciseRows || []) exMap[row.name] = row.id

    const methodSlug = slugify(selected.name)
    const variantTag = variantApplied ? ['variant'] : []

    for (const session of selected.sessions || []) {
      const exList = sessionExercises[session.id] || session.exercises
      const workoutName = variantApplied
        ? `${selected.name} – ${session.name} (Variant)`
        : `${selected.name} – ${session.name}`

      const { data: workout } = await supabase
        .from('workouts')
        .insert({
          name: workoutName,
          created_by: user.id,
          difficulty: 'intermediate',
          tags: ['gym_plan', methodSlug, ...variantTag],
        })
        .select('id')
        .single()

      if (!workout) continue

      const inserts = exList
        .map((ex, i) => ({
          workout_id: workout.id,
          exercise_id: exMap[ex.db_name] || null,
          order_index: i,
          target_sets: ex.sets,
          target_reps: upperBound(ex.reps),
          rest_seconds: 90,
        }))
        .filter(we => we.exercise_id)

      if (inserts.length > 0) {
        await supabase.from('workout_exercises').insert(inserts)
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const totalSessions = selected?.sessions?.length || 0

  if (loading) return <div className="text-center py-12 text-muted text-sm">Loading methods...</div>

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-black text-dark">Gym Training Methods</h2>
        <p className="text-xs text-muted mt-0.5">Proven training programs for every level</p>
      </div>

      {/* Method List */}
      <div className="space-y-3">
        {methods.map(method => (
          <button
            key={method.id}
            onClick={() => openMethod(method)}
            className="w-full bg-white border border-border rounded-2xl p-4 text-left hover:border-red-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center bg-surface rounded-xl">
              {method.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-dark">{method.name}</div>
              <div className="text-[10px] text-muted mt-0.5">
                {method.frequency_min === method.frequency_max
                  ? `${method.frequency_min}×`
                  : `${method.frequency_min}–${method.frequency_max}×`} / week · {method.split_type}
              </div>
            </div>
            <span className="text-muted text-sm flex-shrink-0">→</span>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selected.emoji}</div>
                <div>
                  <div className="text-base font-black text-dark">{selected.name}</div>
                  <div className="text-[10px] text-dim mt-0.5">
                    {selected.frequency_min === selected.frequency_max
                      ? `${selected.frequency_min}×`
                      : `${selected.frequency_min}–${selected.frequency_max}×`} / week · {selected.split_type}
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="text-muted hover:text-dark text-xl leading-none ml-2 flex-shrink-0">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pt-3 flex-shrink-0">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'workouts', label: 'Workouts' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === t.id ? 'bg-dark text-white' : 'bg-surface border border-border text-muted hover:border-red-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {activeTab === 'overview' && (
                <>
                  <p className="text-sm text-muted leading-relaxed">{selected.description}</p>

                  {/* Weekly Schedule */}
                  {selected.weekly_schedule?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-dark mb-2">Weekly Schedule</h4>
                      <div className="bg-surface rounded-xl overflow-hidden border border-border">
                        <table className="w-full text-xs">
                          <tbody>
                            {DAYS.map(day => {
                              const entry = selected.weekly_schedule.find(e => e.day === day)
                              const label = entry?.label
                              const isPause = !label || label === 'Pause'
                              return (
                                <tr key={day} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 font-bold text-dark w-10">{day}</td>
                                  <td className={`px-3 py-2 ${isPause ? 'text-muted italic' : 'text-dark'}`}>
                                    {isPause ? 'Rest' : label}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: 'Days/Week',
                        value: selected.frequency_min === selected.frequency_max
                          ? `${selected.frequency_min}`
                          : `${selected.frequency_min}–${selected.frequency_max}`,
                      },
                      { label: 'Split', value: selected.split_type },
                      { label: 'Sessions', value: totalSessions },
                    ].map(stat => (
                      <div key={stat.label} className="bg-surface rounded-xl p-3 text-center border border-border">
                        <div className="text-base font-black text-dark">{stat.value}</div>
                        <div className="text-[10px] text-muted mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Variant */}
                  {selected.variants && (
                    <div className={`border rounded-xl overflow-hidden transition-all ${variantApplied ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{variantApplied ? '✅' : '🔁'}</span>
                          <span className={`text-[10px] font-bold ${variantApplied ? 'text-green-700' : 'text-amber-700'}`}>
                            {variantApplied ? 'Variant applied' : 'Variant available'}
                          </span>
                        </div>
                        {!variantApplied && (
                          <button
                            onClick={() => setVariantExpanded(v => !v)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 hover:bg-amber-200 transition-all font-semibold"
                          >
                            {variantExpanded ? 'Hide ▲' : 'View ▼'}
                          </button>
                        )}
                      </div>
                      {(variantExpanded || variantApplied) && (
                        <div className="px-3 pb-3 border-t border-amber-200">
                          <p className={`text-xs mt-2 leading-relaxed ${variantApplied ? 'text-green-700' : 'text-amber-800'}`}>
                            {selected.variants}
                          </p>
                          {!variantApplied && (
                            <button
                              onClick={() => { setVariantApplied(true); setVariantExpanded(false) }}
                              className="mt-2.5 w-full py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all"
                            >
                              Use this variant
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'workouts' && (
                <div className="space-y-6">
                  {selected.sessions?.map(session => {
                    const exList = sessionExercises[session.id] || session.exercises
                    return (
                      <div key={session.id}>
                        <h4 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-red-500 rounded-full inline-block" />
                          {session.name}
                        </h4>
                        <div className="space-y-2">
                          {exList.map((ex, exIndex) => {
                            const isSwapping = swapTarget?.sessionId === session.id && swapTarget?.exIndex === exIndex
                            const allAlts = session.exercises[exIndex]?.alternatives || []
                            const extraAlts = isSwapping ? getExtraAlternatives(session.id, exIndex) : []
                            return (
                              <div key={exIndex} className="bg-surface rounded-xl border border-border overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2.5">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-dark truncate">{ex.display}</div>
                                    <div className="text-[10px] text-muted mt-0.5">
                                      {ex.sets} × {ex.reps === 'max' ? 'max reps' : ex.reps}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleSwap(session.id, exIndex)}
                                    className={`ml-2 flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-all border ${
                                      isSwapping
                                        ? 'bg-dark text-white border-dark'
                                        : 'bg-white border-border text-muted hover:border-red-300 hover:text-dark'
                                    }`}
                                  >
                                    ⇄ Swap
                                  </button>
                                </div>
                                {isSwapping && (
                                  <div className="px-3 pb-3 border-t border-border pt-2.5">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2">Alternatives</div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {allAlts.map(alt => (
                                        <button key={alt} onClick={() => swapExercise(session.id, exIndex, alt)}
                                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white border border-border text-dark hover:border-red-400 hover:bg-red-50 transition-all font-medium">
                                          {alt}
                                        </button>
                                      ))}
                                      {extraAlts.map(alt => (
                                        <button key={alt} onClick={() => swapExercise(session.id, exIndex, alt)}
                                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white border border-dashed border-border text-muted hover:border-red-400 hover:text-dark hover:bg-red-50 transition-all font-medium">
                                          {alt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border">
              {saved ? (
                <div className="w-full py-3 rounded-xl bg-green-500 text-white text-sm font-bold text-center">
                  ✓ Plan saved — find it in your Workouts
                </div>
              ) : (
                <button
                  onClick={saveAsPlan}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-dark text-white text-sm font-bold hover:bg-red-500 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `💾 Save as Plan${variantApplied ? ' (Variant)' : ''}`}
                </button>
              )}
              <div className="text-[10px] text-muted text-center mt-1.5">
                Creates {totalSessions} workout{totalSessions !== 1 ? 's' : ''} in your workout list
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
