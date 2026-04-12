import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ── Persistence ───────────────────────────────────────────
const COMPLETED_KEY = 'gainly_skill_completed'
function loadCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')) }
  catch { return new Set() }
}
function saveCompleted(set) {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]))
}

// ── Skill catalogue ───────────────────────────────────────
const FEATURED_SKILLS = [
  { name: 'Full Planche',         icon: '🤸', gradient: 'from-purple-500 to-pink-500'   },
  { name: 'Full Front Lever',     icon: '🏋️', gradient: 'from-red-500 to-red-600'       },
  { name: 'Muscle-Up',            icon: '💪', gradient: 'from-orange-500 to-red-500'    },
  { name: 'Handstand Push-Up',    icon: '🤚', gradient: 'from-green-500 to-emerald-500' },
  { name: 'One Arm Push-Up',      icon: '🫸', gradient: 'from-amber-500 to-yellow-500'  },
  { name: 'One Arm Chin-Up',      icon: '🫷', gradient: 'from-indigo-500 to-violet-500' },
  { name: 'Pistol Squat',         icon: '🦵', gradient: 'from-teal-500 to-cyan-500'     },
  { name: 'Human Flag',           icon: '🚩', gradient: 'from-rose-500 to-pink-500'     },
  { name: 'Dragon Flag',          icon: '🐉', gradient: 'from-slate-600 to-gray-500'    },
  { name: 'V-Sit',                icon: '💎', gradient: 'from-cyan-500 to-blue-500'     },
]

// ── Progression criteria ──────────────────────────────────
const PROGRESSION_CRITERIA = {
  'Wall Push-Up':              { next: 'Incline Push-Up',          criteria: '3 × 20 reps',        detail: 'Control every rep. Full range, no momentum.' },
  'Incline Push-Up':           { next: 'Knee Push-Up',             criteria: '3 × 15 reps',        detail: 'Progress to knee push-ups once you hit 3×15 on a low incline.' },
  'Knee Push-Up':              { next: 'Push-Up',                  criteria: '3 × 15 reps',        detail: 'If you can do 3×15 clean knee push-ups, try full push-ups.' },
  'Push-Up':                   { next: 'Diamond Push-Up',          criteria: '3 × 20 reps',        detail: '3×20 clean push-ups with full ROM. Unlocks many paths.' },
  'Wide Push-Up':              { next: 'Archer Push-Up',           criteria: '3 × 15 reps',        detail: 'Build wide push-up volume before the one-arm shift.' },
  'Diamond Push-Up':           { next: 'Archer Push-Up',           criteria: '3 × 15 reps',        detail: 'Strong close grip is essential for single-arm work.' },
  'Archer Push-Up':            { next: 'One Arm Push-Up',          criteria: '3 × 8 each side',    detail: '8 clean reps per side with full lockout.' },
  'Decline Push-Up':           { next: 'Pike Push-Up',             criteria: '3 × 15 reps',        detail: 'Build overhead pressing strength on decline before pike.' },
  'Pike Push-Up':              { next: 'Wall Handstand Push-Up',   criteria: '3 × 12 reps',        detail: 'Deep pike push-ups with head touching ground.' },
  'Wall Handstand Push-Up':    { next: 'Handstand Push-Up',        criteria: '3 × 8 reps',         detail: '8 wall HSPU with full ROM. Then practice freestanding balance.' },
  'Handstand Push-Up':         { next: '90 Degree Push-Up',        criteria: '3 × 5 reps',         detail: 'Freestanding HSPU is already elite. 90° is the final boss.' },
  'Frog Stand':                { next: 'Tuck Planche',             criteria: '30 s hold',          detail: 'Hold a solid frog stand for 30 seconds before tucking.' },
  'Tuck Planche':              { next: 'Advanced Tuck Planche',    criteria: '15 s hold',          detail: '15 s tuck planche with hips level. Straighten back.' },
  'Advanced Tuck Planche':     { next: 'Straddle Planche',         criteria: '12 s hold',          detail: '12 s clean. Slowly extend legs to straddle.' },
  'Straddle Planche':          { next: 'Full Planche',             criteria: '10 s hold',          detail: '10 s straddle planche. Close legs gradually.' },
  'Pseudo Planche Push-Up':    { next: 'Tuck Planche',             criteria: '3 × 10 reps',        detail: 'Strong lean with hands by hips. Builds planche-specific strength.' },
  'Dips':                      { next: 'Ring Dips',                criteria: '3 × 15 reps',        detail: 'Solid parallel bar dips before moving to unstable rings.' },
  'Ring Push-Up':              { next: 'Ring Dips',                criteria: '3 × 12 reps',        detail: 'Build ring stability with push-ups first.' },
  'Dead Hang':                 { next: 'Scapular Pull-Up',         criteria: '45 s hold',          detail: 'Build grip and hang endurance. 45 seconds minimum.' },
  'Scapular Pull-Up':          { next: 'Band-Assisted Pull-Up',    criteria: '3 × 15 reps',        detail: 'Learn to activate lats with scapular pulls before full pull-ups.' },
  'Band-Assisted Pull-Up':     { next: 'Negative Pull-Up',         criteria: '3 × 10 (light)',     detail: 'Reduce band resistance over time. Move to negatives.' },
  'Negative Pull-Up':          { next: 'Pull-Up',                  criteria: '3 × 5 (5 s down)',   detail: '5 slow negatives with 5-second descent.' },
  'Australian Row':            { next: 'Ring Row',                 criteria: '3 × 15 reps',        detail: 'Horizontal pulling strength. Lower the bar to make harder.' },
  'Ring Row':                  { next: 'Pull-Up',                  criteria: '3 × 12 elevated',    detail: 'Feet elevated ring rows build pull-up strength.' },
  'Pull-Up':                   { next: 'Weighted Pull-Up',         criteria: '3 × 12 reps',        detail: '12 clean pull-ups unlocks many paths.' },
  'Wide Grip Pull-Up':         { next: 'Archer Pull-Up',           criteria: '3 × 10 reps',        detail: 'Wide grip with full ROM for one-arm work.' },
  'Archer Pull-Up':            { next: 'Typewriter Pull-Up',       criteria: '3 × 6 each side',    detail: '6 per side with control. Building one-arm strength.' },
  'Typewriter Pull-Up':        { next: 'One Arm Chin-Up',          criteria: '3 × 5 each side',    detail: 'Smooth side-to-side movement. Almost single-arm ready.' },
  'Explosive Pull-Up':         { next: 'Muscle-Up',                criteria: '3 × 5 chest-to-bar', detail: 'Pull explosively to chest. Transition practice separately.' },
  'Chin-Up':                   { next: 'L-Sit Pull-Up',            criteria: '3 × 12 reps',        detail: 'Strong chin-ups + L-sit hold = L-sit pull-up.' },
  'Tuck Front Lever Row':      { next: 'Tuck Front Lever',         criteria: '3 × 8 reps',         detail: 'Build horizontal pulling in tuck position.' },
  'Tuck Front Lever':          { next: 'Advanced Tuck Front Lever', criteria: '15 s hold',         detail: '15 s with flat back. Slowly extend hips.' },
  'Advanced Tuck Front Lever': { next: 'Straddle Front Lever',     criteria: '12 s hold',          detail: '12 s clean. Straddle legs to progress.' },
  'Straddle Front Lever':      { next: 'Full Front Lever',         criteria: '10 s hold',          detail: '10 s straddle. Close legs for full front lever.' },
  'Assisted Squat':            { next: 'Bodyweight Squat',         criteria: '3 × 20 reps',        detail: 'Use less assistance until freestanding.' },
  'Bodyweight Squat':          { next: 'Bulgarian Split Squat',    criteria: '3 × 20 reps',        detail: '20 deep squats. Ready for unilateral work.' },
  'Bulgarian Split Squat':     { next: 'Box Pistol Squat',         criteria: '3 × 12 each leg',    detail: '12 per leg with full depth.' },
  'Box Pistol Squat':          { next: 'Pistol Squat',             criteria: '3 × 8 each leg',     detail: 'Lower the box until full depth.' },
  'Pistol Squat':              { next: 'Dragon Squat',             criteria: '3 × 5 each leg',     detail: 'Clean pistol squats. Dragon squat adds rotation.' },
  'Glute Bridge':              { next: 'Single Leg Glute Bridge',  criteria: '3 × 20 reps',        detail: 'Build base hip extension strength.' },
  'Lunge':                     { next: 'Jumping Lunge',            criteria: '3 × 12 each leg',    detail: 'Stable lunges before explosive jumps.' },
  'Dead Bug':                  { next: 'Plank',                    criteria: '3 × 15 reps',        detail: 'Learn core bracing with dead bugs first.' },
  'Bird Dog':                  { next: 'Plank',                    criteria: '3 × 12 each side',   detail: 'Anti-rotation stability before static holds.' },
  'Plank':                     { next: 'Hollow Body Hold',         criteria: '60 s hold',          detail: '60 s plank with posterior pelvic tilt.' },
  'Hollow Body Hold':          { next: 'L-Sit',                    criteria: '30 s hold',          detail: '30 s hollow body. Add compression for L-sit.' },
  'L-Sit':                     { next: 'V-Sit',                    criteria: '15 s hold',          detail: '15 s parallel bar L-sit. Pike higher for V-sit.' },
  'Knee Raise (Hanging)':      { next: 'Hanging Leg Raise',        criteria: '3 × 15 reps',        detail: 'Control the swing. Straight legs next.' },
  'Hanging Leg Raise':         { next: 'Toes to Bar',              criteria: '3 × 10 reps',        detail: 'Full ROM leg raises with no kip.' },
  'Toes to Bar':               { next: 'Windshield Wiper',         criteria: '3 × 8 reps',         detail: 'Controlled toes to bar. Add rotation.' },
  'Dragon Flag':               { next: 'Human Flag',               criteria: '3 × 5 reps',         detail: 'Master the eccentric first.' },
  'Arch Body Hold':            { next: 'Back Lever Hold',          criteria: '30 s hold',          detail: 'Back extension endurance for back lever.' },
}

// ── Graph builder ─────────────────────────────────────────
function buildGraph(targetEx, exercises, links) {
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))
  const nodes = new Map(), edges = [], queue = [{ id: targetEx.id, level: 0 }], visited = new Set()
  while (queue.length > 0) {
    const { id, level } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    const ex = exMap[id]
    if (!ex) continue
    if (!nodes.has(id)) nodes.set(id, { exercise: ex, level })
    else nodes.get(id).level = Math.max(nodes.get(id).level, level)
    links
      .filter(l => l.exercise_id === id && l.link_type === 'prerequisite')
      .forEach(l => {
        const childEx = exMap[l.related_exercise_id]
        if (childEx && !visited.has(l.related_exercise_id)) {
          edges.push({ from: l.related_exercise_id, to: id })
          queue.push({ id: l.related_exercise_id, level: level + 1 })
        }
      })
  }
  if (nodes.size === 0) return { nodes: [], edges: [], maxLevel: 0 }
  const byLevel = {}
  nodes.forEach((n, id) => { if (!byLevel[n.level]) byLevel[n.level] = []; byLevel[n.level].push(id) })
  const maxLevel = Math.max(...Object.keys(byLevel).map(Number))
  const result = []
  Object.entries(byLevel).forEach(([lvl, ids]) => {
    ids.forEach(id => {
      result.push({ id, exercise: nodes.get(id).exercise, level: parseInt(lvl), isTarget: parseInt(lvl) === 0, isBase: parseInt(lvl) === maxLevel })
    })
  })
  return { nodes: result, edges, maxLevel }
}

// ── Unlock availability ───────────────────────────────────
function computeAvailable(graphNodes, graphEdges, completedSet) {
  const prereqsOf = {}
  for (const e of graphEdges) {
    if (!prereqsOf[e.to]) prereqsOf[e.to] = []
    prereqsOf[e.to].push(e.from)
  }
  const available = new Set()
  for (const node of graphNodes) {
    const prereqs = prereqsOf[node.id] || []
    if (prereqs.length === 0 || prereqs.every(pid => completedSet.has(pid))) available.add(node.id)
  }
  return available
}

// ── Layout constants (wide) ───────────────────────────────
const R            = 42     // node radius → 84 px diameter
const D            = R * 2
const ROW_H        = 200    // tall rows
const H_GAP        = 100    // wide horizontal spacing
const LABEL_W      = 110    // left label column
const H_PAD        = 64     // side padding
const V_PAD        = 60     // vertical padding
const MIN_CONTENT  = 720    // minimum content width

function buildLayout(graphNodes, maxLevel) {
  const byLevel = {}
  for (const n of graphNodes) {
    if (!byLevel[n.level]) byLevel[n.level] = []
    byLevel[n.level].push(n)
  }
  const maxInRow = Math.max(...Object.values(byLevel).map(r => r.length), 1)
  const contentW  = Math.max(maxInRow * (D + H_GAP) - H_GAP, D, MIN_CONTENT)
  const totalW    = LABEL_W + contentW + H_PAD * 2
  const totalH    = (maxLevel + 1) * ROW_H + V_PAD * 2

  const positioned = {}
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const row    = byLevel[lvl] || []
    const rowW   = row.length * (D + H_GAP) - H_GAP
    const startX = LABEL_W + H_PAD + (contentW - rowW) / 2 + R
    const cy     = V_PAD + lvl * ROW_H + ROW_H / 2
    row.forEach((node, idx) => {
      positioned[node.id] = { ...node, cx: startX + idx * (D + H_GAP), cy }
    })
  }
  return { positioned, totalW, totalH }
}

// ── Band config (stays within its own color family) ───────
function bandConfig(lvlIdx, maxLevel) {
  const f = maxLevel > 0 ? lvlIdx / maxLevel : 0
  if (f < 0.28) return { label: 'ADVANCED',     color: '#f87171', rgba: '244,63,94'   }
  if (f < 0.62) return { label: 'INTERMEDIATE', color: '#fbbf24', rgba: '245,158,11'  }
  return               { label: 'BEGINNER',      color: '#4ade80', rgba: '34,197,94'   }
}

// Group consecutive levels into bands
function buildBandGroups(maxLevel) {
  const groups = []
  let cur = null
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const cfg = bandConfig(lvl, maxLevel)
    if (!cur || cur.label !== cfg.label) {
      cur = { ...cfg, startLvl: lvl, endLvl: lvl }
      groups.push(cur)
    } else {
      cur.endLvl = lvl
    }
  }
  return groups
}

// ── Node detail modal ─────────────────────────────────────
function NodeModal({ node, isCompleted, isAvailable, onComplete, onUndo, onClose }) {
  const criteria = PROGRESSION_CRITERIA[node.exercise.name]
  const diff     = node.exercise.difficulty

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Dark header */}
        <div className="bg-gray-950 px-5 pt-6 pb-5">
          {/* 3D model placeholder */}
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="w-full h-full rounded-full bg-gray-800 border-2 border-gray-700 flex flex-col items-center justify-center overflow-hidden">
              <span className="text-3xl">{node.exercise.is_static_hold ? '⏱️' : '💪'}</span>
              <span className="text-[8px] text-gray-600 mt-0.5 font-medium tracking-wide">3D SOON</span>
            </div>
            {/* Dashed ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-700/50" />
          </div>
          <h3 className="text-white font-black text-center text-lg">{node.exercise.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              diff === 'beginner'     ? 'bg-green-500/20 text-green-400'  :
              diff === 'intermediate' ? 'bg-amber-500/20 text-amber-400'  :
                                        'bg-red-500/20   text-red-400'
            }`}>{diff}</span>
            {node.isTarget && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">GOAL</span>}
            {node.isBase   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold">START</span>}
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {node.exercise.description && (
            <p className="text-xs text-muted leading-relaxed">{node.exercise.description}</p>
          )}

          {criteria && !node.isTarget && (
            <div className={`rounded-xl p-3 border ${
              isCompleted ? 'bg-green-50 border-green-200' :
              isAvailable ? 'bg-amber-50 border-amber-200' :
                            'bg-gray-50  border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${
                  isCompleted ? 'text-green-700' :
                  isAvailable ? 'text-amber-700' : 'text-gray-500'
                }`}>
                  {isCompleted ? '✓ Completed' : isAvailable ? '🔓 Unlock criteria' : '🔒 Locked'}
                </span>
                <span className={`text-sm font-black ${isCompleted ? 'text-green-600' : isAvailable ? 'text-dark' : 'text-gray-400'}`}>
                  {criteria.criteria}
                </span>
              </div>
              <p className="text-[10px] text-muted leading-relaxed">{criteria.detail}</p>
              {criteria.next && <p className="text-[9px] text-dim mt-1.5">Unlocks → {criteria.next}</p>}
            </div>
          )}

          {node.isTarget && (
            <div className="rounded-xl p-3 bg-blue-50 border border-blue-200">
              <p className="text-[10px] font-bold text-blue-700 mb-1">🏆 Goal skill</p>
              <p className="text-[10px] text-blue-500 leading-relaxed">Complete all prerequisites, then mark this to finish your journey.</p>
            </div>
          )}

          {node.exercise.primary_muscles?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.exercise.primary_muscles.map(m => (
                <span key={m} className="text-[9px] bg-light text-muted px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          )}
          {node.exercise.equipment_required?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.exercise.equipment_required.map(eq => (
                <span key={eq} className="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{eq.replace(/_/g,' ')}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {isCompleted && (
            <button onClick={onUndo}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted hover:text-dark transition-colors">
              Undo
            </button>
          )}
          {isAvailable && !isCompleted && (
            <button onClick={onComplete}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors">
              Mark as Complete
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-light text-sm font-semibold text-muted hover:text-dark transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pyramid canvas ────────────────────────────────────────
function PyramidTree({ graph, completedSet, onToggle }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const { nodes, edges, maxLevel } = graph
  const { positioned, totalW, totalH } = buildLayout(nodes, maxLevel)
  const available  = computeAvailable(nodes, edges, completedSet)
  const bandGroups = buildBandGroups(maxLevel)

  return (
    <>
      <div className="relative select-none" style={{ width: totalW, height: totalH }}>

        {/* ── Band backgrounds — gradient stays within its OWN color ── */}
        {bandGroups.map((group, gi) => {
          const y = V_PAD + group.startLvl * ROW_H
          const h = (group.endLvl - group.startLvl + 1) * ROW_H
          // Gradient: stronger at top (where label is), fades down — pure single color, no bleed
          const bg = [
            `rgba(${group.rgba},0.15) 0%`,
            `rgba(${group.rgba},0.10) 25%`,
            `rgba(${group.rgba},0.06) 65%`,
            `rgba(${group.rgba},0.01) 100%`,
          ].join(', ')

          return (
            <div key={group.label + gi}
              className="absolute left-0 right-0"
              style={{ top: y, height: h, background: `linear-gradient(to bottom, ${bg})` }}>

              {/* Accent line at band top */}
              <div className="absolute left-0 right-0 top-0 h-[1.5px] opacity-30"
                style={{ background: `linear-gradient(to right, transparent, rgba(${group.rgba},1) 20%, rgba(${group.rgba},1) 80%, transparent)` }} />

              {/* Level label */}
              <div className="absolute top-4 left-5 flex items-center gap-2">
                <div className="w-1 h-8 rounded-full opacity-60"
                  style={{ background: `rgba(${group.rgba},1)` }} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]"
                  style={{ color: `rgba(${group.rgba},0.9)` }}>
                  {group.label}
                </span>
              </div>
            </div>
          )
        })}

        {/* ── SVG: lines + arrowheads ── */}
        <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
          {edges.map((edge, i) => {
            const from = positioned[edge.from]
            const to   = positioned[edge.to]
            if (!from || !to) return null

            const dx  = to.cx - from.cx
            const dy  = to.cy - from.cy
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len === 0) return null

            const fromR = from.isTarget ? R + 5 : R
            const toR   = to.isTarget   ? R + 5 : R
            const x1 = from.cx + (dx / len) * (fromR + 3)
            const y1 = from.cy + (dy / len) * (fromR + 3)
            const x2 = to.cx   - (dx / len) * (toR   + 3)
            const y2 = to.cy   - (dy / len) * (toR   + 3)
            const active = completedSet.has(edge.from)

            // Midpoint for arrowhead
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            const ang = Math.atan2(dy, dx) * 180 / Math.PI

            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={active ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray={active ? 'none' : '6 5'}
                  strokeLinecap="round"
                />
                {active && (
                  <g transform={`translate(${mx},${my}) rotate(${ang})`}>
                    <polygon points="-7,5 0,-5 7,5" fill="#f59e0b" opacity="0.75" />
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* ── Nodes ── */}
        {Object.values(positioned).map(node => {
          const isCompleted = completedSet.has(node.id)
          const isAvail     = available.has(node.id)
          const locked      = !isCompleted && !isAvail

          // State-based styles
          let ringColor = 'rgba(75,85,99,0.8)'   // locked gray
          let glowStyle = {}
          let innerBg   = 'rgba(17,24,39,0.5)'
          let opacity   = 0.38

          if (isCompleted) {
            ringColor = '#4ade80'
            innerBg   = 'rgba(21,128,61,0.20)'
            opacity   = 1
            glowStyle = { boxShadow: '0 0 28px 6px rgba(74,222,128,0.22), 0 0 8px 2px rgba(74,222,128,0.15)' }
          } else if (node.isTarget && isAvail) {
            ringColor = '#60a5fa'
            innerBg   = 'rgba(17,24,39,0.92)'
            opacity   = 1
            glowStyle = { boxShadow: '0 0 32px 10px rgba(96,165,250,0.30), 0 0 10px 3px rgba(96,165,250,0.20)' }
          } else if (isAvail) {
            ringColor = '#fbbf24'
            innerBg   = 'rgba(17,24,39,0.92)'
            opacity   = 1
            glowStyle = { boxShadow: '0 0 28px 6px rgba(251,191,36,0.25), 0 0 8px 2px rgba(251,191,36,0.15)' }
          }

          const nodeD = node.isTarget ? D + 10 : D
          const nodeR = nodeD / 2

          return (
            <div key={node.id} className="absolute" style={{ left: node.cx - nodeR, top: node.cy - nodeR }}>

              {/* Animated outer ring for available nodes */}
              {isAvail && !isCompleted && (
                <div className="absolute rounded-full animate-ping"
                  style={{ inset: -5, border: `2px solid ${ringColor}`, opacity: 0.18, borderRadius: '50%' }} />
              )}

              {/* Main circle */}
              <div
                onClick={() => setSelectedNode(node)}
                className="rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative"
                style={{ width: nodeD, height: nodeD, border: `2.5px solid ${ringColor}`, background: innerBg, opacity, ...glowStyle }}
              >
                {locked ? (
                  <div className="flex flex-col items-center gap-1 opacity-60">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(156,163,175,1)" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                ) : isCompleted ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                ) : (
                  // 3D model placeholder — inner circle ready for video swap
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-gray-800/80 border border-gray-700/60 flex items-center justify-center">
                      <span className="text-[22px]">{node.exercise.is_static_hold ? '⏱️' : '💪'}</span>
                    </div>
                  </div>
                )}

                {/* GOAL badge */}
                {node.isTarget && isAvail && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap shadow-lg">GOAL</span>
                  </div>
                )}
              </div>

              {/* Name label */}
              <div className="text-center mt-2" style={{ width: nodeD + 40, marginLeft: -20 }}>
                <span className={`text-[10px] font-semibold leading-tight block ${
                  locked ? 'text-gray-600' : isCompleted ? 'text-green-400' : node.isTarget ? 'text-blue-300' : 'text-gray-200'
                }`}>
                  {node.exercise.name.length > 16 ? node.exercise.name.slice(0, 15) + '…' : node.exercise.name}
                </span>
                {/* Criteria hint under available nodes */}
                {!locked && !isCompleted && PROGRESSION_CRITERIA[node.exercise.name] && (
                  <span className="text-[9px] text-amber-500/80 font-bold block mt-0.5 leading-tight">
                    {PROGRESSION_CRITERIA[node.exercise.name].criteria}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedNode && (
        <NodeModal
          node={selectedNode}
          isCompleted={completedSet.has(selectedNode.id)}
          isAvailable={available.has(selectedNode.id)}
          onComplete={() => { onToggle(selectedNode.id, true);  setSelectedNode(null) }}
          onUndo={() =>    { onToggle(selectedNode.id, false); setSelectedNode(null) }}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </>
  )
}

// ── Skill tree inline panel (NOT fixed — sidebar stays visible) ──
function SkillTreePanel({ skill, graph, completedSet, onToggle, onClose }) {
  const scrollRef = useRef(null)
  const [canUp,   setCanUp]   = useState(false)
  const [canDown, setCanDown] = useState(false)
  const [zoom,    setZoom]    = useState(1)

  const clampZoom = z => Math.min(2, Math.max(0.4, Math.round(z * 10) / 10))

  const completedHere = graph.nodes.filter(n => completedSet.has(n.id)).length
  const totalHere     = graph.nodes.length
  const pct           = totalHere > 0 ? Math.round(completedHere / totalHere * 100) : 0

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanUp(el.scrollTop > 12)
    setCanDown(el.scrollTop < el.scrollHeight - el.clientHeight - 12)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Center horizontally if content is wider than the panel
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
    requestAnimationFrame(checkScroll)
  }, [])

  // Ctrl+wheel / pinch-to-zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(z => clampZoom(z - e.deltaY * 0.002))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const circumference = 2 * Math.PI * 15   // r=15 circle
  const dashOffset    = circumference * (1 - pct / 100)

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-800 bg-gray-950"
      style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-800/80"
        style={{ background: 'linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(30,41,59,1) 100%)' }}>

        {/* Back button */}
        <button onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700/70 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 2L4 6l4 4"/>
            </svg>
          </div>
          <span className="text-xs font-semibold hidden sm:block">Back</span>
        </button>

        <div className="w-px h-5 bg-gray-700/60 flex-shrink-0" />

        {/* Skill icon */}
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-sm flex-shrink-0 shadow-md`}>
          {skill.icon}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] min-w-0 flex-1">
          <span className="text-gray-500 flex-shrink-0">Skill Trees</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 text-gray-600">
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-white font-bold truncate">{skill.name}</span>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative w-10 h-10">
            <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
              <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
              <circle cx="20" cy="20" r="15" fill="none" stroke="#e10600" strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-white">{pct}%</span>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-white font-bold text-sm leading-tight">{completedHere}/{totalHere}</div>
            <div className="text-gray-500 text-[10px] leading-tight">completed</div>
          </div>

          {/* ── Zoom controls ── */}
          <div className="flex items-center gap-1 ml-2 bg-gray-800/80 rounded-lg px-1.5 py-1 border border-gray-700/60">
            <button
              onClick={() => setZoom(z => clampZoom(z - 0.1))}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors text-base font-bold leading-none"
              title="Zoom out">
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors w-8 text-center tabular-nums"
              title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(z => clampZoom(z + 0.1))}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors text-base font-bold leading-none"
              title="Zoom in">
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable tree area ── */}
      <div className="flex-1 relative overflow-hidden">

        <div ref={scrollRef} onScroll={checkScroll}
          className="absolute inset-0 overflow-auto">
          <div className="flex justify-center items-start py-10 px-6" style={{ minHeight: '100%', zoom }}>
            <PyramidTree graph={graph} completedSet={completedSet} onToggle={onToggle} />
          </div>
        </div>

        {/* Scroll arrow — UP */}
        {canUp && (
          <button onClick={() => scrollRef.current?.scrollBy({ top: -ROW_H, behavior: 'smooth' })}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10
              w-9 h-9 rounded-full bg-gray-800/95 border border-gray-700
              flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700
              transition-all shadow-xl">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 9L6.5 4l4.5 5"/>
            </svg>
          </button>
        )}

        {/* Scroll arrow — DOWN */}
        {canDown && (
          <button onClick={() => scrollRef.current?.scrollBy({ top: ROW_H, behavior: 'smooth' })}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
              w-9 h-9 rounded-full bg-gray-800/95 border border-gray-700
              flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700
              transition-all shadow-xl">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 4l4.5 5L11 4"/>
            </svg>
          </button>
        )}

        {/* Top/bottom depth fades */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-[5]" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-[5]" />
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 px-5 py-2.5 border-t border-gray-800/40 flex items-center justify-center gap-5"
        style={{ background: 'rgba(15,23,42,0.8)' }}>
        {[
          { color: '#4ade80', label: 'Completed' },
          { color: '#fbbf24', label: 'Available'  },
          { color: '#4b5563', label: 'Locked'      },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
        <div className="w-px h-3 bg-gray-700" />
        <span className="text-[10px] text-gray-600">Tap a node for details</span>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────
export default function SkillTrees() {
  const [exercises, setExercises]    = useState([])
  const [links, setLinks]            = useState([])
  const [loading, setLoading]        = useState(true)
  const [openSkill, setOpenSkill]    = useState(null)
  const [completedSet, setCompleted] = useState(loadCompleted)

  useEffect(() => {
    Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('exercise_links').select('*'),
    ]).then(([{ data: ex }, { data: lk }]) => {
      setExercises(ex || [])
      setLinks(lk || [])
      setLoading(false)
    })
  }, [])

  const exByName = useMemo(() => Object.fromEntries(exercises.map(e => [e.name, e])), [exercises])

  const graph = useMemo(() => {
    if (!openSkill) return null
    const targetEx = exByName[openSkill.name]
    if (!targetEx) return null
    return buildGraph(targetEx, exercises, links)
  }, [openSkill, exercises, links, exByName])

  function handleToggle(exerciseId, markDone) {
    setCompleted(prev => {
      const next = new Set(prev)
      if (markDone) next.add(exerciseId)
      else next.delete(exerciseId)
      saveCompleted(next)
      return next
    })
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading skill trees…</div>

  // When a skill is open → show the panel (replaces grid within content column)
  if (openSkill && graph) {
    if (graph.nodes.length === 0) {
      return (
        <div className="text-center py-10 bg-white border border-border rounded-2xl">
          <p className="text-sm text-muted">No progression data found for {openSkill.name} yet.</p>
          <button onClick={() => setOpenSkill(null)} className="mt-3 text-sm text-accent hover:underline">← Back</button>
        </div>
      )
    }
    return (
      <SkillTreePanel
        skill={openSkill}
        graph={graph}
        completedSet={completedSet}
        onToggle={handleToggle}
        onClose={() => setOpenSkill(null)}
      />
    )
  }

  // Default: skill selector grid
  return (
    <div>
      <p className="text-sm text-muted mb-6">
        Select a goal skill and unlock each step — complete prerequisites to advance.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FEATURED_SKILLS.map(skill => {
          const ex            = exByName[skill.name]
          const g             = ex ? buildGraph(ex, exercises, links) : null
          const completedHere = g ? g.nodes.filter(n => completedSet.has(n.id)).length : 0
          const totalHere     = g ? g.nodes.length : 0
          const pctHere       = totalHere > 0 ? Math.round(completedHere / totalHere * 100) : 0

          return (
            <button key={skill.name} onClick={() => setOpenSkill(skill)}
              className="relative p-4 rounded-xl text-center transition-all bg-white border border-border hover:shadow-md hover:scale-[1.02] overflow-hidden group">
              {/* Gradient tint */}
              <div className={`absolute inset-0 bg-gradient-to-br ${skill.gradient} opacity-[0.04] group-hover:opacity-[0.07] transition-opacity`} />
              <div className={`relative w-10 h-10 mx-auto bg-gradient-to-br ${skill.gradient} rounded-xl flex items-center justify-center text-xl shadow-sm mb-2`}>
                {skill.icon}
              </div>
              <div className="relative text-xs font-bold text-dark leading-tight mb-2">{skill.name}</div>
              {ex && (
                <div className="relative flex items-center justify-center mb-2.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' :
                    ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>{ex.difficulty}</span>
                </div>
              )}
              {totalHere > 0 && (
                <div className="relative">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full bg-gradient-to-r ${skill.gradient} transition-all`}
                      style={{ width: `${pctHere}%` }} />
                  </div>
                  <span className="text-[9px] text-dim">{completedHere} / {totalHere} steps</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
