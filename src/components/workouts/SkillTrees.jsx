import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ── Storage ──────────────────────────────────────────────
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

// ── Progression criteria (name → { criteria, detail, next }) ──
const PROGRESSION_CRITERIA = {
  'Wall Push-Up':              { next: 'Incline Push-Up',         criteria: '3 × 20 reps',       detail: 'Control every rep. Full range, no momentum.' },
  'Incline Push-Up':           { next: 'Knee Push-Up',            criteria: '3 × 15 reps',       detail: 'Progress to knee push-ups once you hit 3×15 on a low incline.' },
  'Knee Push-Up':              { next: 'Push-Up',                 criteria: '3 × 15 reps',       detail: 'If you can do 3×15 clean knee push-ups, try full push-ups.' },
  'Push-Up':                   { next: 'Diamond Push-Up',         criteria: '3 × 20 reps',       detail: '3×20 clean push-ups with full ROM. Unlocks many paths.' },
  'Wide Push-Up':              { next: 'Archer Push-Up',          criteria: '3 × 15 reps',       detail: 'Build wide push-up volume before the one-arm shift.' },
  'Diamond Push-Up':           { next: 'Archer Push-Up',          criteria: '3 × 15 reps',       detail: 'Strong close grip is essential for single-arm work.' },
  'Archer Push-Up':            { next: 'One Arm Push-Up',         criteria: '3 × 8 each side',   detail: '8 clean reps per side with full lockout.' },
  'Decline Push-Up':           { next: 'Pike Push-Up',            criteria: '3 × 15 reps',       detail: 'Build overhead pressing strength on decline before pike.' },
  'Pike Push-Up':              { next: 'Wall Handstand Push-Up',  criteria: '3 × 12 reps',       detail: 'Deep pike push-ups with head touching ground.' },
  'Wall Handstand Push-Up':    { next: 'Handstand Push-Up',       criteria: '3 × 8 reps',        detail: '8 wall HSPU with full ROM. Then practice freestanding balance.' },
  'Handstand Push-Up':         { next: '90 Degree Push-Up',       criteria: '3 × 5 reps',        detail: 'Freestanding HSPU is already elite. 90° is the final boss.' },
  'Frog Stand':                { next: 'Tuck Planche',            criteria: '30 s hold',         detail: 'Hold a solid frog stand for 30 seconds before tucking into planche.' },
  'Tuck Planche':              { next: 'Advanced Tuck Planche',   criteria: '15 s hold',         detail: '15 second tuck planche with hips level. Straighten back.' },
  'Advanced Tuck Planche':     { next: 'Straddle Planche',        criteria: '12 s hold',         detail: '12 seconds clean. Slowly extend legs to straddle.' },
  'Straddle Planche':          { next: 'Full Planche',            criteria: '10 s hold',         detail: '10 second straddle planche. Close legs gradually.' },
  'Pseudo Planche Push-Up':    { next: 'Tuck Planche',            criteria: '3 × 10 reps',       detail: 'Strong lean with hands by hips. Builds planche-specific strength.' },
  'Dips':                      { next: 'Ring Dips',               criteria: '3 × 15 reps',       detail: 'Solid parallel bar dips before moving to unstable rings.' },
  'Ring Push-Up':              { next: 'Ring Dips',               criteria: '3 × 12 reps',       detail: 'Build ring stability with push-ups first.' },
  'Dead Hang':                 { next: 'Scapular Pull-Up',        criteria: '45 s hold',         detail: 'Build grip and hang endurance. 45 seconds minimum.' },
  'Scapular Pull-Up':          { next: 'Band-Assisted Pull-Up',   criteria: '3 × 15 reps',       detail: 'Learn to activate lats with scapular pulls before full pull-ups.' },
  'Band-Assisted Pull-Up':     { next: 'Negative Pull-Up',        criteria: '3 × 10 (light)',    detail: 'Reduce band resistance over time. Move to negatives.' },
  'Negative Pull-Up':          { next: 'Pull-Up',                 criteria: '3 × 5 (5 s down)',  detail: '5 slow negatives with 5-second descent. Almost a full pull-up!' },
  'Australian Row':            { next: 'Ring Row',                criteria: '3 × 15 reps',       detail: 'Horizontal pulling strength. Lower the bar to make harder.' },
  'Ring Row':                  { next: 'Pull-Up',                 criteria: '3 × 12 elevated',   detail: 'Feet elevated ring rows build pull-up strength.' },
  'Pull-Up':                   { next: 'Weighted Pull-Up',        criteria: '3 × 12 reps',       detail: '12 clean pull-ups unlocks many paths.' },
  'Wide Grip Pull-Up':         { next: 'Archer Pull-Up',          criteria: '3 × 10 reps',       detail: 'Wide grip with full ROM for one-arm work.' },
  'Archer Pull-Up':            { next: 'Typewriter Pull-Up',      criteria: '3 × 6 each side',   detail: '6 per side with control. Building one-arm strength.' },
  'Typewriter Pull-Up':        { next: 'One Arm Chin-Up',         criteria: '3 × 5 each side',   detail: 'Smooth side-to-side movement. Almost single-arm ready.' },
  'Explosive Pull-Up':         { next: 'Muscle-Up',               criteria: '3 × 5 chest-to-bar', detail: 'Pull explosively to chest level. Transition practice separately.' },
  'Chin-Up':                   { next: 'L-Sit Pull-Up',           criteria: '3 × 12 reps',       detail: 'Strong chin-ups plus L-sit hold = L-sit pull-up.' },
  'Tuck Front Lever Row':      { next: 'Tuck Front Lever',        criteria: '3 × 8 reps',        detail: 'Build horizontal pulling strength in tuck position.' },
  'Tuck Front Lever':          { next: 'Advanced Tuck Front Lever', criteria: '15 s hold',       detail: '15 seconds with flat back. Slowly extend hips.' },
  'Advanced Tuck Front Lever': { next: 'Straddle Front Lever',    criteria: '12 s hold',         detail: '12 seconds clean. Straddle legs to progress.' },
  'Straddle Front Lever':      { next: 'Full Front Lever',        criteria: '10 s hold',         detail: '10 seconds straddle. Close legs for full front lever.' },
  'Assisted Squat':            { next: 'Bodyweight Squat',        criteria: '3 × 20 reps',       detail: 'Use less assistance until freestanding.' },
  'Bodyweight Squat':          { next: 'Bulgarian Split Squat',   criteria: '3 × 20 reps',       detail: '20 deep squats. Ready for unilateral work.' },
  'Bulgarian Split Squat':     { next: 'Box Pistol Squat',        criteria: '3 × 12 each leg',   detail: '12 per leg with full depth.' },
  'Box Pistol Squat':          { next: 'Pistol Squat',            criteria: '3 × 8 each leg',    detail: 'Lower the box until full depth.' },
  'Pistol Squat':              { next: 'Dragon Squat',            criteria: '3 × 5 each leg',    detail: 'Clean pistol squats. Dragon squat adds rotation.' },
  'Glute Bridge':              { next: 'Single Leg Glute Bridge', criteria: '3 × 20 reps',       detail: 'Build base hip extension strength.' },
  'Lunge':                     { next: 'Jumping Lunge',           criteria: '3 × 12 each leg',   detail: 'Stable lunges before explosive jumps.' },
  'Dead Bug':                  { next: 'Plank',                   criteria: '3 × 15 reps',       detail: 'Learn core bracing with dead bugs first.' },
  'Bird Dog':                  { next: 'Plank',                   criteria: '3 × 12 each side',  detail: 'Anti-rotation stability before static holds.' },
  'Plank':                     { next: 'Hollow Body Hold',        criteria: '60 s hold',         detail: '60 second plank with posterior pelvic tilt.' },
  'Hollow Body Hold':          { next: 'L-Sit',                   criteria: '30 s hold',         detail: '30 second hollow body. Add compression for L-sit.' },
  'L-Sit':                     { next: 'V-Sit',                   criteria: '15 s hold',         detail: '15 seconds parallel bar L-sit. Pike higher for V-sit.' },
  'Knee Raise (Hanging)':      { next: 'Hanging Leg Raise',       criteria: '3 × 15 reps',       detail: 'Control the swing. Straight legs next.' },
  'Hanging Leg Raise':         { next: 'Toes to Bar',             criteria: '3 × 10 reps',       detail: 'Full ROM leg raises with no kip.' },
  'Toes to Bar':               { next: 'Windshield Wiper',        criteria: '3 × 8 reps',        detail: 'Controlled toes to bar. Add rotation.' },
  'Dragon Flag':               { next: 'Human Flag',              criteria: '3 × 5 reps',        detail: 'Master the eccentric. Human flag requires oblique strength too.' },
  'Arch Body Hold':            { next: 'Back Lever Hold',         criteria: '30 s hold',         detail: 'Back extension endurance for back lever.' },
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
    links.filter(l => l.exercise_id === id && l.link_type === 'prerequisite').forEach(l => {
      const childEx = exMap[l.related_exercise_id]
      if (childEx && !visited.has(l.related_exercise_id)) {
        edges.push({ from: l.related_exercise_id, to: id })
        queue.push({ id: l.related_exercise_id, level: level + 1 })
      }
    })
  }
  if (nodes.size === 0) return { nodes: [], edges: [] }
  const levels = {}
  nodes.forEach((n, id) => { if (!levels[n.level]) levels[n.level] = []; levels[n.level].push(id) })
  const maxLevel = Math.max(...Object.keys(levels).map(Number))
  const result = []
  Object.entries(levels).forEach(([lvl, ids]) => {
    ids.forEach(id => {
      result.push({ id, exercise: nodes.get(id).exercise, level: parseInt(lvl), isTarget: parseInt(lvl) === 0, isBase: parseInt(lvl) === maxLevel })
    })
  })
  return { nodes: result, edges, maxLevel }
}

// ── Unlock logic ──────────────────────────────────────────
function computeAvailable(graphNodes, graphEdges, completedSet) {
  const prereqsOf = {}
  for (const e of graphEdges) {
    if (!prereqsOf[e.to]) prereqsOf[e.to] = []
    prereqsOf[e.to].push(e.from)
  }
  const available = new Set()
  for (const node of graphNodes) {
    const prereqs = prereqsOf[node.id] || []
    if (prereqs.length === 0 || prereqs.every(pid => completedSet.has(pid))) {
      available.add(node.id)
    }
  }
  return available
}

// ── Layout constants ──────────────────────────────────────
const R = 36            // node radius
const D = R * 2         // node diameter
const ROW_H = 170       // height per tree level
const H_GAP = 32        // horizontal gap between sibling nodes
const LABEL_W = 96      // left zone for level labels
const V_PAD = 40        // top/bottom padding
const H_PAD = 24        // extra horizontal padding on right

function buildLayout(graphNodes, maxLevel) {
  const byLevel = {}
  for (const n of graphNodes) {
    if (!byLevel[n.level]) byLevel[n.level] = []
    byLevel[n.level].push(n)
  }
  const maxInRow = Math.max(...Object.values(byLevel).map(r => r.length))
  const contentW = Math.max(maxInRow * (D + H_GAP) - H_GAP, D)
  const totalW = LABEL_W + contentW + H_PAD * 2
  const totalH = (maxLevel + 1) * ROW_H + V_PAD * 2

  const positioned = {}
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const row = byLevel[lvl] || []
    const rowW = row.length * (D + H_GAP) - H_GAP
    const startX = LABEL_W + H_PAD + (contentW - rowW) / 2 + R
    const cy = V_PAD + lvl * ROW_H + ROW_H / 2
    row.forEach((node, idx) => {
      positioned[node.id] = { ...node, cx: startX + idx * (D + H_GAP), cy }
    })
  }
  return { positioned, totalW, totalH, contentW }
}

// ── Level band config ─────────────────────────────────────
function bandConfig(levelIdx, maxLevel) {
  const f = maxLevel > 0 ? levelIdx / maxLevel : 0
  if (f <= 0.25) return { label: 'ADVANCED',     color: '#f43f5e', bg: 'rgba(244,63,94,0.07)' }
  if (f <= 0.55) return { label: 'INTERMEDIATE', color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' }
  return                 { label: 'BEGINNER',     color: '#22c55e', bg: 'rgba(34,197,94,0.07)' }
}

// ── Node detail modal ─────────────────────────────────────
function NodeModal({ node, isCompleted, isAvailable, onComplete, onUndo, onClose }) {
  const criteria = PROGRESSION_CRITERIA[node.exercise.name]
  const diff = node.exercise.difficulty

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Dark header with 3D placeholder */}
        <div className="bg-gray-950 px-5 pt-6 pb-5">
          {/* 3D model placeholder — ready for video/model swap */}
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 border-2 border-gray-600 flex flex-col items-center justify-center mb-3 relative overflow-hidden">
            <span className="text-3xl">{node.exercise.is_static_hold ? '⏱️' : '💪'}</span>
            <span className="text-[8px] text-gray-500 mt-0.5 font-medium tracking-wide">3D SOON</span>
            {/* Video placeholder overlay */}
            <div className="absolute inset-0 border-2 border-dashed border-gray-700 rounded-full opacity-40" />
          </div>
          <h3 className="text-white font-black text-center text-lg leading-tight">{node.exercise.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              diff === 'beginner'     ? 'bg-green-500/20 text-green-400' :
              diff === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
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

          {/* Unlock criteria */}
          {criteria && !node.isTarget && (
            <div className={`rounded-xl p-3 border ${
              isCompleted ? 'bg-green-50 border-green-200' :
              isAvailable ? 'bg-amber-50 border-amber-200' :
                            'bg-gray-50  border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold ${
                  isCompleted ? 'text-green-700' :
                  isAvailable ? 'text-amber-700' :
                                'text-gray-500'
                }`}>
                  {isCompleted ? '✓ Completed' : isAvailable ? '🔓 Unlock criteria' : '🔒 Complete prerequisites first'}
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
            <div className="rounded-xl p-3 border bg-blue-50 border-blue-200">
              <p className="text-[10px] font-bold text-blue-700 mb-1">🏆 Goal skill</p>
              <p className="text-[10px] text-blue-500">Complete all prerequisites to unlock this. Once achieved, mark it to finish your journey.</p>
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

// ── Pyramid tree canvas ───────────────────────────────────
function PyramidTree({ graph, completedSet, onToggle }) {
  const [selected, setSelected] = useState(null)
  const { nodes, edges, maxLevel } = graph
  const { positioned, totalW, totalH } = buildLayout(nodes, maxLevel)
  const available = computeAvailable(nodes, edges, completedSet)

  // Determine which bands changed label (for side labels)
  const bandLabels = []
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const cfg = bandConfig(lvl, maxLevel)
    const prev = lvl > 0 ? bandConfig(lvl - 1, maxLevel) : null
    bandLabels.push({ lvl, cfg, showLabel: !prev || prev.label !== cfg.label })
  }

  const posArr = Object.values(positioned)

  return (
    <>
      <div className="overflow-auto rounded-2xl border border-gray-800 bg-gray-950" style={{ maxHeight: 640 }}>
        <div className="relative" style={{ width: totalW, height: totalH, minWidth: '100%' }}>

          {/* ── Row bands + level labels ── */}
          {bandLabels.map(({ lvl, cfg, showLabel }) => (
            <div key={lvl} className="absolute left-0 right-0"
              style={{ top: V_PAD + lvl * ROW_H, height: ROW_H, background: cfg.bg, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              {showLabel && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4" style={{ width: LABEL_W }}>
                  <span className="text-[9px] font-black tracking-[0.18em] uppercase select-none"
                    style={{ color: cfg.color, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {cfg.label}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* ── SVG: connecting lines ── */}
          <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
            <defs>
              <radialGradient id="glow-amber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
              </radialGradient>
            </defs>
            {edges.map((edge, i) => {
              const from = positioned[edge.from]
              const to   = positioned[edge.to]
              if (!from || !to) return null
              const active = completedSet.has(edge.from)
              const x1 = from.cx, y1 = from.cy
              const x2 = to.cx,   y2 = to.cy
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={active ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray={active ? 'none' : '5 4'}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          {/* ── Nodes ── */}
          {posArr.map(node => {
            const isCompleted = completedSet.has(node.id)
            const isAvail     = available.has(node.id)
            const locked      = !isCompleted && !isAvail

            // Visual state
            let ringColor   = '#374151'   // locked: gray
            let bgColor     = 'rgba(17,24,39,0.6)'
            let opacity     = 0.38
            let shadowStyle = {}

            if (isCompleted) {
              ringColor   = '#4ade80'
              bgColor     = 'rgba(21,128,61,0.25)'
              opacity     = 1
              shadowStyle = { boxShadow: '0 0 18px 4px rgba(74,222,128,0.25)' }
            } else if (isAvail) {
              ringColor   = node.isTarget ? '#60a5fa' : '#fbbf24'
              bgColor     = 'rgba(17,24,39,0.85)'
              opacity     = 1
              shadowStyle = node.isTarget
                ? { boxShadow: '0 0 22px 6px rgba(96,165,250,0.30)' }
                : { boxShadow: '0 0 18px 4px rgba(251,191,36,0.28)' }
            }

            const nodeSize = node.isTarget ? D + 8 : D
            const nodeR    = nodeSize / 2

            return (
              <div key={node.id} className="absolute" style={{ left: node.cx - nodeR, top: node.cy - nodeR }}>
                {/* Pulse ring for available non-completed */}
                {isAvail && !isCompleted && (
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ border: `2px solid ${ringColor}`, opacity: 0.25, borderRadius: '50%' }} />
                )}

                {/* Main node circle */}
                <div
                  onClick={() => setSelected(node)}
                  className="rounded-full flex flex-col items-center justify-center cursor-pointer relative transition-all duration-200 select-none"
                  style={{
                    width: nodeSize, height: nodeSize,
                    border: `2.5px solid ${ringColor}`,
                    background: bgColor,
                    opacity,
                    ...shadowStyle,
                  }}
                >
                  {/* 3D model zone — placeholder until 3D models are ready */}
                  {locked ? (
                    <span className="text-lg select-none">🔒</span>
                  ) : isCompleted ? (
                    <span className="text-2xl select-none">✓</span>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      {/* Placeholder circle for 3D model video */}
                      <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center">
                        <span className="text-base select-none">{node.exercise.is_static_hold ? '⏱️' : '💪'}</span>
                      </div>
                    </div>
                  )}

                  {/* GOAL badge */}
                  {node.isTarget && isAvail && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full tracking-wide">GOAL</span>
                    </div>
                  )}
                </div>

                {/* Label below node */}
                <div className="text-center mt-2" style={{ width: nodeSize + 20, marginLeft: -10 }}>
                  <span className={`text-[9px] font-semibold leading-tight block ${
                    locked ? 'text-gray-600' : isCompleted ? 'text-green-400' : node.isTarget ? 'text-blue-300' : 'text-gray-200'
                  }`}>
                    {node.exercise.name.length > 15 ? node.exercise.name.slice(0, 14) + '…' : node.exercise.name}
                  </span>
                  {!locked && !isCompleted && PROGRESSION_CRITERIA[node.exercise.name] && (
                    <span className="text-[8px] text-amber-500 font-bold block mt-0.5">
                      {PROGRESSION_CRITERIA[node.exercise.name].criteria}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <NodeModal
          node={selected}
          isCompleted={completedSet.has(selected.id)}
          isAvailable={available.has(selected.id)}
          onComplete={() => { onToggle(selected.id, true);  setSelected(null) }}
          onUndo={() =>    { onToggle(selected.id, false); setSelected(null) }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────
export default function SkillTrees() {
  const [exercises, setExercises]   = useState([])
  const [links, setLinks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
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
    if (!selected) return null
    const targetEx = exByName[selected]
    if (!targetEx) return null
    return buildGraph(targetEx, exercises, links)
  }, [selected, exercises, links, exByName])

  function handleToggle(exerciseId, markDone) {
    setCompleted(prev => {
      const next = new Set(prev)
      if (markDone) next.add(exerciseId)
      else next.delete(exerciseId)
      saveCompleted(next)
      return next
    })
  }

  const completedCount = graph ? graph.nodes.filter(n => completedSet.has(n.id)).length : 0
  const totalCount     = graph ? graph.nodes.length : 0

  if (loading) return <div className="text-center py-12 text-muted">Loading skill trees…</div>

  return (
    <div>
      <p className="text-sm text-muted mb-6">
        Select a goal skill. Unlock each step by hitting the rep or hold target — complete prerequisites to advance.
      </p>

      {/* ── Skill selector grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {FEATURED_SKILLS.map(skill => {
          const ex    = exByName[skill.name]
          const isSel = selected === skill.name
          return (
            <button key={skill.name} onClick={() => setSelected(isSel ? null : skill.name)}
              className={`p-4 rounded-xl text-center transition-all ${
                isSel
                  ? 'bg-white border-2 border-red-400 shadow-lg shadow-red-100 scale-[1.02]'
                  : 'bg-white border border-border hover:shadow-md hover:border-red-200'
              }`}>
              <div className={`w-10 h-10 mx-auto bg-gradient-to-br ${skill.gradient} rounded-xl flex items-center justify-center text-xl shadow-sm mb-2`}>
                {skill.icon}
              </div>
              <div className="text-xs font-bold text-dark leading-tight">{skill.name}</div>
              {ex && (
                <div className="flex items-center justify-center mt-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' :
                    ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>{ex.difficulty}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Pyramid tree ── */}
      {graph && graph.nodes.length > 0 && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-dark">{selected}</h2>
              <p className="text-[11px] text-muted mt-0.5">
                {completedCount} / {totalCount} steps completed
                {totalCount > 0 && (
                  <span className="ml-2 font-semibold text-accent">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                )}
              </p>
            </div>
            {/* Progress bar */}
            <div className="flex-1 max-w-xs ml-4">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-dim">Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-[10px] text-dim">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                <span className="text-[10px] text-dim">Locked</span>
              </div>
            </div>
          </div>

          <PyramidTree graph={graph} completedSet={completedSet} onToggle={handleToggle} />

          <p className="text-[10px] text-dim text-center mt-3">
            Click any node to view details and mark as complete · Progress saved locally
          </p>
        </div>
      )}

      {graph && graph.nodes.length === 0 && (
        <div className="text-center py-10 bg-white border border-border rounded-2xl">
          <p className="text-sm text-muted">No progression data found for this skill yet.</p>
        </div>
      )}

      {!selected && (
        <div className="text-center py-12 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-3">🌳</div>
          <h3 className="text-lg font-bold text-dark mb-1">Select a skill above</h3>
          <p className="text-sm text-muted">Choose your goal — then unlock each step one by one</p>
        </div>
      )}
    </div>
  )
}
