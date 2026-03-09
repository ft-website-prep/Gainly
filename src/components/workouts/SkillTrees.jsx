import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const FEATURED_SKILLS = [
  { name: 'Full Planche', icon: '🤸', gradient: 'from-purple-500 to-pink-500' },
  { name: 'Full Front Lever', icon: '🏋️', gradient: 'from-red-500 to-red-600' },
  { name: 'Muscle-Up', icon: '💪', gradient: 'from-orange-500 to-red-500' },
  { name: 'Handstand Push-Up', icon: '🤚', gradient: 'from-green-500 to-emerald-500' },
  { name: 'One Arm Push-Up', icon: '🫸', gradient: 'from-amber-500 to-yellow-500' },
  { name: 'One Arm Chin-Up', icon: '🫷', gradient: 'from-indigo-500 to-violet-500' },
  { name: 'Pistol Squat', icon: '🦵', gradient: 'from-teal-500 to-cyan-500' },
  { name: 'Human Flag', icon: '🚩', gradient: 'from-rose-500 to-pink-500' },
  { name: 'Dragon Flag', icon: '🐉', gradient: 'from-slate-600 to-gray-500' },
  { name: 'V-Sit', icon: '💎', gradient: 'from-cyan-500 to-blue-500' },
]

const PROGRESSION_CRITERIA = {
  'Wall Push-Up': { next: 'Incline Push-Up', criteria: '3x20 reps', detail: 'When you can do 3 sets of 20 wall push-ups with controlled form, move on.' },
  'Incline Push-Up': { next: 'Knee Push-Up', criteria: '3x15 reps', detail: 'Progress to knee push-ups once you hit 3x15 on a low incline.' },
  'Knee Push-Up': { next: 'Push-Up', criteria: '3x15 reps', detail: 'If you can do 3x15 clean knee push-ups, try full push-ups.' },
  'Push-Up': { next: 'Diamond Push-Up', criteria: '3x20 reps', detail: '3x20 clean push-ups with full ROM. Unlocks many paths.' },
  'Wide Push-Up': { next: 'Archer Push-Up', criteria: '3x15 reps', detail: 'Build wide push-up volume before the one-arm shift.' },
  'Diamond Push-Up': { next: 'Archer Push-Up', criteria: '3x15 reps', detail: 'Strong close grip is essential for single-arm work.' },
  'Archer Push-Up': { next: 'One Arm Push-Up', criteria: '3x8 each side', detail: '8 clean reps per side with full lockout.' },
  'Decline Push-Up': { next: 'Pike Push-Up', criteria: '3x15 reps', detail: 'Build overhead pressing strength on decline before pike.' },
  'Pike Push-Up': { next: 'Wall Handstand Push-Up', criteria: '3x12 reps', detail: 'Deep pike push-ups with head touching ground.' },
  'Wall Handstand Push-Up': { next: 'Handstand Push-Up', criteria: '3x8 reps', detail: '8 wall HSPU with full ROM. Then practice freestanding balance.' },
  'Handstand Push-Up': { next: '90 Degree Push-Up', criteria: '3x5 reps', detail: 'Freestanding HSPU is already elite. 90 degree is the final boss.' },
  'Frog Stand': { next: 'Tuck Planche', criteria: '30s hold', detail: 'Hold a solid frog stand for 30 seconds before tucking into planche.' },
  'Tuck Planche': { next: 'Advanced Tuck Planche', criteria: '15s hold', detail: '15 second tuck planche with hips level. Straighten back.' },
  'Advanced Tuck Planche': { next: 'Straddle Planche', criteria: '12s hold', detail: '12 seconds clean. Slowly extend legs to straddle.' },
  'Straddle Planche': { next: 'Full Planche', criteria: '10s hold', detail: '10 second straddle planche. Close legs gradually.' },
  'Pseudo Planche Push-Up': { next: 'Tuck Planche', criteria: '3x10 reps', detail: 'Strong lean with hands by hips. Builds planche-specific strength.' },
  'Dips': { next: 'Ring Dips', criteria: '3x15 reps', detail: 'Solid parallel bar dips before moving to unstable rings.' },
  'Ring Push-Up': { next: 'Ring Dips', criteria: '3x12 reps', detail: 'Build ring stability with push-ups first.' },
  'Dead Hang': { next: 'Scapular Pull-Up', criteria: '45s hold', detail: 'Build grip and hang endurance. 45 seconds minimum.' },
  'Scapular Pull-Up': { next: 'Band-Assisted Pull-Up', criteria: '3x15 reps', detail: 'Learn to activate lats with scapular pulls before full pull-ups.' },
  'Band-Assisted Pull-Up': { next: 'Negative Pull-Up', criteria: '3x10 (light band)', detail: 'Reduce band resistance over time. Move to negatives.' },
  'Negative Pull-Up': { next: 'Pull-Up', criteria: '3x5 (5s descent)', detail: '5 slow negatives with 5 second descent. Almost a full pull-up!' },
  'Australian Row': { next: 'Ring Row', criteria: '3x15 reps', detail: 'Horizontal pulling strength. Lower the bar to make harder.' },
  'Ring Row': { next: 'Pull-Up', criteria: '3x12 (feet elevated)', detail: 'Feet elevated ring rows build pull-up strength.' },
  'Pull-Up': { next: 'Weighted Pull-Up', criteria: '3x12 reps', detail: '12 clean pull-ups unlocks many paths.' },
  'Wide Grip Pull-Up': { next: 'Archer Pull-Up', criteria: '3x10 reps', detail: 'Wide grip with full ROM for one-arm work.' },
  'Archer Pull-Up': { next: 'Typewriter Pull-Up', criteria: '3x6 each side', detail: '6 per side with control. Building one-arm strength.' },
  'Typewriter Pull-Up': { next: 'One Arm Chin-Up', criteria: '3x5 each side', detail: 'Smooth side-to-side movement. Almost single-arm ready.' },
  'Explosive Pull-Up': { next: 'Muscle-Up', criteria: '3x5 (chest to bar)', detail: 'Pull explosively to chest level. Transition practice separately.' },
  'Chin-Up': { next: 'L-Sit Pull-Up', criteria: '3x12 reps', detail: 'Strong chin-ups plus L-sit hold = L-sit pull-up.' },
  'Tuck Front Lever Row': { next: 'Tuck Front Lever', criteria: '3x8 reps', detail: 'Build horizontal pulling strength in tuck position.' },
  'Tuck Front Lever': { next: 'Advanced Tuck Front Lever', criteria: '15s hold', detail: '15 seconds with flat back. Slowly extend hips.' },
  'Advanced Tuck Front Lever': { next: 'Straddle Front Lever', criteria: '12s hold', detail: '12 seconds clean. Straddle legs to progress.' },
  'Straddle Front Lever': { next: 'Full Front Lever', criteria: '10s hold', detail: '10 seconds straddle. Close legs for full front lever.' },
  'Assisted Squat': { next: 'Bodyweight Squat', criteria: '3x20 reps', detail: 'Use less assistance until freestanding.' },
  'Bodyweight Squat': { next: 'Bulgarian Split Squat', criteria: '3x20 reps', detail: '20 deep squats. Ready for unilateral work.' },
  'Bulgarian Split Squat': { next: 'Box Pistol Squat', criteria: '3x12 each leg', detail: '12 per leg with full depth.' },
  'Box Pistol Squat': { next: 'Pistol Squat', criteria: '3x8 each leg', detail: 'Lower the box until full depth.' },
  'Pistol Squat': { next: 'Dragon Squat', criteria: '3x5 each leg', detail: 'Clean pistol squats. Dragon squat adds rotation.' },
  'Glute Bridge': { next: 'Single Leg Glute Bridge', criteria: '3x20 reps', detail: 'Build base hip extension strength.' },
  'Lunge': { next: 'Jumping Lunge', criteria: '3x12 each leg', detail: 'Stable lunges before explosive jumps.' },
  'Dead Bug': { next: 'Plank', criteria: '3x15 reps', detail: 'Learn core bracing with dead bugs first.' },
  'Bird Dog': { next: 'Plank', criteria: '3x12 each side', detail: 'Anti-rotation stability before static holds.' },
  'Plank': { next: 'Hollow Body Hold', criteria: '60s hold', detail: '60 second plank with posterior pelvic tilt.' },
  'Hollow Body Hold': { next: 'L-Sit', criteria: '30s hold', detail: '30 second hollow body. Add compression for L-sit.' },
  'L-Sit': { next: 'V-Sit', criteria: '15s hold', detail: '15 seconds parallel bar L-sit. Pike higher for V-sit.' },
  'Knee Raise (Hanging)': { next: 'Hanging Leg Raise', criteria: '3x15 reps', detail: 'Control the swing. Straight legs next.' },
  'Hanging Leg Raise': { next: 'Toes to Bar', criteria: '3x10 reps', detail: 'Full ROM leg raises with no kip.' },
  'Toes to Bar': { next: 'Windshield Wiper', criteria: '3x8 reps', detail: 'Controlled toes to bar. Add rotation.' },
  'Dragon Flag': { next: 'Human Flag', criteria: '3x5 reps', detail: 'Master the eccentric. Human flag requires oblique strength too.' },
  'Arch Body Hold': { next: 'Back Lever Hold', criteria: '30s hold', detail: 'Back extension endurance for back lever.' },
}

const NODE_W = 150, NODE_H = 52, GAP_X = 70, GAP_Y = 36

const DIFF_COLORS = {
  beginner: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', dot: '#22c55e' },
  intermediate: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', dot: '#f59e0b' },
  advanced: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', dot: '#ef4444' },
}

function buildGraph(targetEx, exercises, links) {
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))
  const nodes = new Map(), edges = [], queue = [{ id: targetEx.id, level: 0 }], visited = new Set()
  while (queue.length > 0) {
    const { id, level } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    const ex = exMap[id]
    if (!ex) continue
    if (!nodes.has(id)) nodes.set(id, { exercise: ex, children: [], level })
    else nodes.get(id).level = Math.max(nodes.get(id).level, level)
    links.filter(l => l.exercise_id === id && l.link_type === 'prerequisite').forEach(l => {
      const childEx = exMap[l.related_exercise_id]
      if (childEx && !visited.has(l.related_exercise_id)) {
        nodes.get(id).children.push(l.related_exercise_id)
        edges.push({ from: l.related_exercise_id, to: id })
        queue.push({ id: l.related_exercise_id, level: level + 1 })
      }
    })
  }
  if (nodes.size === 0) return { nodes: [], edges: [], width: 0, height: 0, offsetX: 0, offsetY: 0 }
  const levels = {}
  nodes.forEach((n, id) => { if (!levels[n.level]) levels[n.level] = []; levels[n.level].push(id) })
  const maxLevel = Math.max(...Object.keys(levels).map(Number))
  const positioned = []
  Object.entries(levels).forEach(([lvl, ids]) => {
    const level = parseInt(lvl), count = ids.length
    const totalH = count * NODE_H + (count - 1) * GAP_Y, startY = -totalH / 2
    ids.forEach((id, idx) => {
      positioned.push({ id, exercise: nodes.get(id).exercise,
        x: (maxLevel - level) * (NODE_W + GAP_X) + NODE_W / 2,
        y: startY + idx * (NODE_H + GAP_Y) + NODE_H / 2,
        isTarget: level === 0, isBase: level === maxLevel })
    })
  })
  const xs = positioned.map(n => n.x), ys = positioned.map(n => n.y), pad = 30
  const minX = Math.min(...xs) - NODE_W/2 - pad, maxX = Math.max(...xs) + NODE_W/2 + pad
  const minY = Math.min(...ys) - NODE_H/2 - pad, maxY = Math.max(...ys) + NODE_H/2 + pad
  return { nodes: positioned, edges, width: maxX - minX, height: maxY - minY, offsetX: -minX, offsetY: -minY }
}

function NodePopup({ exercise, position, onClose }) {
  const criteria = PROGRESSION_CRITERIA[exercise.name]
  const diff = DIFF_COLORS[exercise.difficulty] || DIFF_COLORS.intermediate
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute bg-white rounded-xl shadow-2xl border border-border p-4 w-72"
        style={{ left: Math.min(position.x, window.innerWidth - 300), top: Math.min(position.y - 10, window.innerHeight - 280) }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: diff.bg, border: '1.5px solid ' + diff.border }}>
            {exercise.is_static_hold ? '⏱️' : '🔢'}
          </div>
          <div>
            <div className="text-sm font-bold text-dark">{exercise.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: diff.bg, color: diff.text }}>{exercise.difficulty}</span>
              <span className="text-[10px] text-dim">{exercise.category}</span>
            </div>
          </div>
        </div>
        {exercise.description && <p className="text-xs text-muted mb-3">{exercise.description}</p>}
        {exercise.primary_muscles?.length > 0 && <div className="mb-2"><span className="text-[10px] text-dim">Muscles: </span><span className="text-[10px] text-dark font-medium">{exercise.primary_muscles.join(', ')}</span></div>}
        {exercise.equipment_required?.length > 0
          ? <div className="mb-3"><span className="text-[10px] text-dim">Equipment: </span>{exercise.equipment_required.map(eq => <span key={eq} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded mr-1">{eq.replace(/_/g, ' ')}</span>)}</div>
          : <div className="text-[10px] text-green-500 font-medium mb-3">No equipment needed</div>}
        {criteria && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-red-600 font-bold">To unlock next</span>
              <span className="text-xs font-bold text-sky-700">{criteria.criteria}</span>
            </div>
            <p className="text-[10px] text-red-600 leading-relaxed">{criteria.detail}</p>
            <div className="text-[9px] text-red-400 mt-1.5">Next: {criteria.next}</div>
          </div>
        )}
        {!criteria && exercise.difficulty === 'advanced' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <span className="text-[10px] text-purple-600 font-bold">Target skill</span>
            <p className="text-[10px] text-purple-500 mt-1">Master the prerequisites to get here!</p>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-3 py-1.5 text-[10px] text-muted hover:text-dark text-center">Close</button>
      </div>
    </div>
  )
}

function SkillGraph({ graph }) {
  const containerRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [popupPos, setPopupPos] = useState(null)
  const { nodes, edges, width, height, offsetX, offsetY } = graph
  if (nodes.length === 0) return <div className="text-center py-8 text-sm text-muted">No progression data available</div>
  const posMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  return (
    <div ref={containerRef} className="overflow-auto rounded-xl bg-surface border border-border relative" style={{ maxHeight: '520px' }}>
      <svg width={width} height={height} className="block">
        <defs>
          <marker id="arrow-r" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" fill="#94a3b8"><polygon points="0 0, 8 3, 0 6" /></marker>
          <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.06" /></filter>
        </defs>
        {edges.map((edge, i) => {
          const from = posMap[edge.from], to = posMap[edge.to]
          if (!from || !to) return null
          const x1 = from.x + offsetX + NODE_W/2, y1 = from.y + offsetY
          const x2 = to.x + offsetX - NODE_W/2, y2 = to.y + offsetY
          return <path key={i} d={`M ${x1} ${y1} C ${x1 + GAP_X*0.45} ${y1}, ${x2 - GAP_X*0.45} ${y2}, ${x2} ${y2}`} fill="none" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow-r)" />
        })}
        {nodes.map(node => {
          const cx = node.x + offsetX, cy = node.y + offsetY
          const diff = DIFF_COLORS[node.exercise.difficulty] || DIFF_COLORS.intermediate
          const hasCriteria = !!PROGRESSION_CRITERIA[node.exercise.name]
          return (
            <g key={node.id} className="cursor-pointer" onClick={(e) => { setSelectedNode(node.exercise); setPopupPos({ x: e.clientX, y: e.clientY }) }}>
              <rect x={cx - NODE_W/2} y={cy - NODE_H/2} width={NODE_W} height={NODE_H} rx="12" ry="12"
                fill={node.isTarget ? '#eff6ff' : 'white'} stroke={node.isTarget ? '#60a5fa' : diff.border}
                strokeWidth={node.isTarget ? 2.5 : 1.5} filter="url(#node-shadow)" className="transition-all hover:stroke-red-400" />
              <circle cx={cx - NODE_W/2 + 14} cy={cy - 7} r="4" fill={diff.dot} />
              <text x={cx - NODE_W/2 + 24} y={cy - 5} className="text-[10px] font-semibold" fill="#1e293b" dominantBaseline="middle">
                {node.exercise.name.length > 17 ? node.exercise.name.slice(0, 16) + '...' : node.exercise.name}
              </text>
              {hasCriteria
                ? <text x={cx - NODE_W/2 + 24} y={cy + 11} className="text-[8px]" fill="#64748b" dominantBaseline="middle">{PROGRESSION_CRITERIA[node.exercise.name].criteria}</text>
                : <text x={cx - NODE_W/2 + 24} y={cy + 11} className="text-[8px]" fill="#94a3b8" dominantBaseline="middle">{node.exercise.difficulty}</text>}
              {node.isTarget && <><rect x={cx + NODE_W/2 - 40} y={cy - NODE_H/2 - 10} width="38" height="18" rx="9" fill="#3b82f6" /><text x={cx + NODE_W/2 - 21} y={cy - NODE_H/2} textAnchor="middle" className="text-[8px] font-bold" fill="white" dominantBaseline="middle">GOAL</text></>}
              {node.isBase && !node.isTarget && <><rect x={cx - NODE_W/2} y={cy + NODE_H/2 - 2} width="42" height="16" rx="8" fill="#22c55e" /><text x={cx - NODE_W/2 + 21} y={cy + NODE_H/2 + 7} textAnchor="middle" className="text-[7px] font-bold" fill="white" dominantBaseline="middle">START</text></>}
              <circle cx={cx + NODE_W/2 - 10} cy={cy} r="6" fill="transparent" stroke="#e2e8f0" strokeWidth="1" />
              <text x={cx + NODE_W/2 - 10} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="text-[7px]" fill="#94a3b8">i</text>
            </g>
          )
        })}
      </svg>
      {selectedNode && popupPos && <NodePopup exercise={selectedNode} position={popupPos} onClose={() => setSelectedNode(null)} />}
    </div>
  )
}

export default function SkillTrees() {
  const [exercises, setExercises] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('exercise_links').select('*'),
    ]).then(([{ data: ex }, { data: lk }]) => { setExercises(ex || []); setLinks(lk || []); setLoading(false) })
  }, [])

  const exByName = useMemo(() => Object.fromEntries(exercises.map(e => [e.name, e])), [exercises])
  const selectedGraph = useMemo(() => {
    if (!selected) return null
    const targetEx = exByName[selected]
    if (!targetEx) return null
    return buildGraph(targetEx, exercises, links)
  }, [selected, exercises, links, exByName])

  if (loading) return <div className="text-center py-12 text-muted">Loading skill trees...</div>

  return (
    <div>
      <p className="text-sm text-muted mb-6">Explore progression paths for advanced skills. Click any node to see what you need to progress.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {FEATURED_SKILLS.map(skill => {
          const ex = exByName[skill.name]
          const isSel = selected === skill.name
          return (
            <button key={skill.name} onClick={() => setSelected(isSel ? null : skill.name)}
              className={`p-4 rounded-xl text-center transition-all ${isSel ? 'bg-white border-2 border-red-400 shadow-lg shadow-red-100 scale-[1.02]' : 'bg-white border border-border hover:shadow-md hover:border-red-200'}`}>
              <div className={`w-10 h-10 mx-auto bg-gradient-to-br ${skill.gradient} rounded-xl flex items-center justify-center text-xl shadow-sm mb-2`}>{skill.icon}</div>
              <div className="text-xs font-bold text-dark leading-tight">{skill.name}</div>
              {ex && <div className="flex items-center justify-center mt-1.5"><span className={`text-[9px] px-1.5 py-0.5 rounded ${ex.difficulty === 'beginner' ? 'bg-green-50 text-green-600' : ex.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{ex.difficulty}</span></div>}
            </button>
          )
        })}
      </div>
      {selectedGraph && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-bold text-dark">{selected}</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-[10px] text-dim">Beginner</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-[10px] text-dim">Intermediate</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-[10px] text-dim">Advanced</span></div>
              <span className="text-[10px] text-dim">Click nodes for details</span>
            </div>
          </div>
          <SkillGraph graph={selectedGraph} />
          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="text-[10px] text-green-500 font-bold">START (easier)</span>
            <span className="text-dim text-xs">---&gt;</span>
            <span className="text-[10px] text-red-500 font-bold">GOAL (harder)</span>
          </div>
        </div>
      )}
      {!selected && (
        <div className="text-center py-12 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-3">🌳</div>
          <h3 className="text-lg font-bold text-dark mb-1">Select a skill above</h3>
          <p className="text-sm text-muted">Click on any skill to see its full progression path</p>
        </div>
      )}
    </div>
  )
}