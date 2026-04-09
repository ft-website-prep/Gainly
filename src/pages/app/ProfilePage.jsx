import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// =============================================
// CONSTANTS & HELPERS
// =============================================
const LEAGUES = [
  { name: 'Rookie', emoji: '🌱', min: 0, color: 'text-green-500', bg: 'bg-green-50' },
  { name: 'Grinder', emoji: '⚙️', min: 1000, color: 'text-gray-500', bg: 'bg-gray-50' },
  { name: 'Athlete', emoji: '💪', min: 5000, color: 'text-red-500', bg: 'bg-red-50' },
  { name: 'Beast', emoji: '🔥', min: 15000, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'Legend', emoji: '👑', min: 50000, color: 'text-amber-500', bg: 'bg-amber-50' },
]
function getLeague(xp) {
  for (let i = LEAGUES.length - 1; i >= 0; i--) if (xp >= LEAGUES[i].min) return { ...LEAGUES[i], next: LEAGUES[i + 1] || null }
  return { ...LEAGUES[0], next: LEAGUES[1] }
}
function calcAge(d) {
  if (!d) return null
  const t = new Date(), b = new Date(d)
  let a = t.getFullYear() - b.getFullYear()
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
  return a
}

// =============================================
// SVG CHARTS
// =============================================
function AreaChart({ data, label, color = '#e10600', unit = '' }) {
  if (!data?.length || data.every(d => !d.value)) return <div className="text-sm text-dim text-center py-8">No data yet</div>
  const vals = data.map(d => d.value)
  const max = Math.max(...vals, 1), min = Math.min(...vals.filter(v => v > 0), 0)
  const w = 200, h = 50, pad = 4, range = max - min || 1
  const pts = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
    y: h - pad - ((d.value - min) / range) * (h - pad * 2), ...d
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`
  const gid = `g-${label.replace(/\W/g, '')}`
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-dark">{label}</div>
        {data[data.length - 1]?.value > 0 && <div className="text-xs text-dim">{data[data.length - 1].value}{unit}</div>}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="white" stroke={color} strokeWidth="1.2" />)}
      </svg>
      <div className="flex justify-between mt-1">{data.map((d, i) => <div key={i} className="text-[9px] text-dim text-center flex-1">{d.label}</div>)}</div>
    </div>
  )
}

function BarChart({ data, label, color = '#e10600' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div className="text-sm font-semibold text-dark mb-3">{label}</div>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[9px] text-muted font-medium">{d.value || ''}</div>
            <div className="w-full rounded-t-md" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '3px' : '0', backgroundColor: color }} />
            <div className="text-[9px] text-dim">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadarChart({ data, size = 200 }) {
  if (!data?.length || data.every(d => !d.value)) return <div className="text-sm text-dim text-center py-8">No exercise data yet</div>
  const cx = size / 2, cy = size / 2, r = size * 0.36, max = Math.max(...data.map(d => d.value), 1), angle = (2 * Math.PI) / data.length
  const pt = (i, v) => ({ x: cx + r * (v / max) * Math.sin(i * angle), y: cy - r * (v / max) * Math.cos(i * angle) })
  const grid = [0.25, 0.5, 0.75, 1]
  const dp = data.map((d, i) => pt(i, d.value))
  return (
    <div>
      <div className="text-sm font-semibold text-dark mb-2">Muscle Balance</div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px] mx-auto">
        {grid.map((l, li) => { const ps = data.map((_, i) => pt(i, max * l)); return <polygon key={li} points={ps.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#e5e7eb" strokeWidth="0.5" /> })}
        {data.map((_, i) => { const p = pt(i, max); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="0.5" /> })}
        <polygon points={dp.map(p => `${p.x},${p.y}`).join(' ')} fill="#e10600" fillOpacity="0.2" stroke="#e10600" strokeWidth="1.5" />
        {dp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#e10600" strokeWidth="1.5" />)}
        {data.map((d, i) => { const p = pt(i, max * 1.28); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[7px] fill-gray-500 font-medium">{d.label}</text> })}
      </svg>
    </div>
  )
}

function ProgressBar({ label, value, max, color = 'bg-red-400' }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5"><span className="text-muted font-medium">{label}</span><span className="text-dark font-semibold">{value}/{max}</span></div>
      <div className="h-2.5 bg-surface rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

// =============================================
// BMI GAUGE
// =============================================
function BmiGauge({ weightKg, heightCm, bmiValue }) {
  const bmi = bmiValue
    ? parseFloat(bmiValue)
    : weightKg && heightCm
    ? +(weightKg / (heightCm / 100) ** 2).toFixed(1)
    : null

  if (!bmi) return <p className="text-xs text-dim text-center py-3">Add weight & height to calculate BMI</p>

  const cat = bmi < 18.5 ? { label: 'Underweight', color: 'text-blue-500' }
    : bmi < 25 ? { label: 'Normal weight', color: 'text-green-500' }
    : bmi < 30 ? { label: 'Overweight', color: 'text-amber-500' }
    : { label: 'Obese', color: 'text-red-500' }

  const pct = Math.min(Math.max((bmi - 14) / 26 * 100, 0), 100)

  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <span className="text-3xl font-black text-dark">{bmi}</span>
        <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
      </div>
      <div className="relative">
        <div className="h-3 rounded-full flex overflow-hidden">
          <div className="bg-blue-300" style={{ width: `${(18.5-14)/26*100}%` }} />
          <div className="bg-green-400" style={{ width: `${(25-18.5)/26*100}%` }} />
          <div className="bg-amber-400" style={{ width: `${(30-25)/26*100}%` }} />
          <div className="bg-red-400 flex-1" />
        </div>
        <div className="absolute top-0 h-3 w-0.5 bg-dark rounded-full shadow" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-dim">
        <span>14</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
      </div>
      <div className="flex mt-0.5 text-[8px] text-dim/60">
        <span style={{ width: `${(18.5-14)/26*100}%` }}>Under</span>
        <span style={{ width: `${(25-18.5)/26*100}%` }}>Normal</span>
        <span style={{ width: `${(30-25)/26*100}%` }}>Over</span>
        <span className="flex-1">Obese</span>
      </div>
    </div>
  )
}

// =============================================
// KFA GAUGE
// =============================================
function KfaGauge({ kfa, gender }) {
  const value = parseFloat(kfa)
  if (!value) return <p className="text-xs text-dim text-center py-3">No body fat % entered yet</p>

  const isMale = gender === 'male'
  const cat = isMale
    ? value < 6  ? { label: 'Essential fat', color: 'text-blue-500' }
    : value < 14 ? { label: 'Athletic', color: 'text-green-500' }
    : value < 18 ? { label: 'Fit', color: 'text-emerald-500' }
    : value < 25 ? { label: 'Average', color: 'text-amber-500' }
    :              { label: 'Above average', color: 'text-red-500' }
    : value < 14 ? { label: 'Essential fat', color: 'text-blue-500' }
    : value < 22 ? { label: 'Athletic', color: 'text-green-500' }
    : value < 25 ? { label: 'Fit', color: 'text-emerald-500' }
    : value < 32 ? { label: 'Average', color: 'text-amber-500' }
    :              { label: 'Above average', color: 'text-red-500' }

  const maxVal = isMale ? 35 : 45
  const pct = Math.min(Math.max(value / maxVal * 100, 0), 100)

  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <span className="text-3xl font-black text-dark">{value}%</span>
        <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
      </div>
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right,#93c5fd,#4ade80,#fbbf24,#f87171)' }} />
        <div className="absolute top-0 h-3 w-0.5 bg-dark rounded-full shadow" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-dim">
        <span>0%</span>
        <span>{isMale ? '6' : '14'}%</span>
        <span>{isMale ? '14' : '22'}%</span>
        <span>{isMale ? '25' : '32'}%</span>
        <span>{maxVal}%+</span>
      </div>
      {!gender && <p className="text-[9px] text-dim mt-1.5">Set gender for accurate categories</p>}
    </div>
  )
}

// =============================================
// BODY DATA PANEL (right column, inline edit)
// =============================================
const GENDERS_LIST = [
  { id: 'male', label: 'Male', icon: '♂️' },
  { id: 'female', label: 'Female', icon: '♀️' },
  { id: 'other', label: 'Other', icon: '⚧️' },
  { id: 'prefer_not_to_say', label: 'N/A', icon: '🤐' },
]

function BodyDataPanel({ profile, onSave }) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setWeight(profile?.weight_kg || '')
    setHeight(profile?.height_cm || '')
    setBirthDate(profile?.birth_date || '')
    setGender(profile?.gender || '')
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ weight_kg: weight || null, height_cm: height || null, birth_date: birthDate || null, gender: gender || null })
    setSaving(false)
    setEditing(false)
  }

  const inp = 'w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-dark text-xs focus:outline-none focus:border-red-400'

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-dark">Body Data</h3>
        <button onClick={() => setEditing(false)} className="text-xs text-dim hover:text-dark">Cancel</button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><label className="block text-[10px] text-dim mb-1">Weight (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75.5" className={inp} /></div>
          <div><label className="block text-[10px] text-dim mb-1">Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="180" className={inp} /></div>
        </div>
        <div><label className="block text-[10px] text-dim mb-1">Date of Birth</label><input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} /></div>
        <div>
          <label className="block text-[10px] text-dim mb-1">Gender</label>
          <div className="grid grid-cols-2 gap-1.5">
            {GENDERS_LIST.map(g => (
              <button key={g.id} onClick={() => setGender(g.id)}
                className={`py-2 px-2 rounded-xl border text-xs text-left transition-colors ${gender === g.id ? 'border-red-300 bg-red-50 text-red-700 font-semibold' : 'border-border bg-surface text-muted hover:border-muted'}`}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-dark">Body Data</h3>
        <button onClick={startEdit} className="text-xs text-red-500 font-medium hover:text-red-600">Edit</button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { l: 'Weight', v: profile?.weight_kg ? `${profile.weight_kg} kg` : '—', icon: '⚖️' },
          { l: 'Height', v: profile?.height_cm ? `${profile.height_cm} cm` : '—', icon: '📏' },
          { l: 'Age', v: calcAge(profile?.birth_date) ? `${calcAge(profile.birth_date)} y` : '—', icon: '🎂' },
          { l: 'Gender', v: profile?.gender && profile.gender !== 'prefer_not_to_say' ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—', icon: '👤' },
        ].map((d, i) => (
          <div key={i} onClick={startEdit}
            className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-accent-soft transition-colors group">
            <div className="text-lg mb-0.5">{d.icon}</div>
            <div className="text-sm font-bold text-dark group-hover:text-accent">{d.v}</div>
            <div className="text-[10px] text-dim">{d.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================
// NUTRITION & HEALTH PANEL
// =============================================
const DIET_TYPES = [
  { id: 'omnivore', label: 'Omnivore', emoji: '🍖' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'keto', label: 'Keto', emoji: '🥑' },
  { id: 'paleo', label: 'Paleo', emoji: '🦴' },
  { id: 'carnivore', label: 'Carnivore', emoji: '🥩' },
  { id: 'other', label: 'Other', emoji: '🍽️' },
]

function NutritionPanel({ profile, onSave }) {
  const hp = profile?.health_profile || {}
  const [editing, setEditing] = useState(false)
  const [dietType, setDietType] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [water, setWater] = useState('')
  const [sleep, setSleep] = useState('')
  const [vitaminD, setVitaminD] = useState('')
  const [omega3, setOmega3] = useState('')
  const [magnesium, setMagnesium] = useState('')
  const [supplements, setSupplements] = useState('')
  const [injuries, setInjuries] = useState('')
  const [allergies, setAllergies] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    const h = profile?.health_profile || {}
    setDietType(h.diet_type || '')
    setCalories(h.calories_target || '')
    setProtein(h.protein_g || '')
    setCarbs(h.carbs_g || '')
    setFat(h.fat_g || '')
    setFiber(h.fiber_g || '')
    setWater(h.water_l || '')
    setSleep(h.sleep_hours || '')
    setVitaminD(h.vitamin_d_iu || '')
    setOmega3(h.omega3_g || '')
    setMagnesium(h.magnesium_mg || '')
    setSupplements(h.supplements || '')
    setInjuries(h.injuries || '')
    setAllergies(h.allergies || '')
    setNotes(h.notes || '')
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      health_profile: {
        diet_type: dietType || null,
        calories_target: calories ? +calories : null,
        protein_g: protein ? +protein : null,
        carbs_g: carbs ? +carbs : null,
        fat_g: fat ? +fat : null,
        fiber_g: fiber ? +fiber : null,
        water_l: water ? +water : null,
        sleep_hours: sleep ? +sleep : null,
        vitamin_d_iu: vitaminD ? +vitaminD : null,
        omega3_g: omega3 ? +omega3 : null,
        magnesium_mg: magnesium ? +magnesium : null,
        supplements: supplements || null,
        injuries: injuries || null,
        allergies: allergies || null,
        notes: notes || null,
      }
    })
    setSaving(false)
    setEditing(false)
  }

  const dietInfo = DIET_TYPES.find(d => d.id === hp.diet_type)
  const hasData = hp.diet_type || hp.calories_target || hp.protein_g || hp.injuries || hp.allergies || hp.supplements

  const inp = 'w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-dark text-xs focus:outline-none focus:border-red-400'
  const lbl = 'block text-[10px] font-medium text-dim mb-1'
  const section = 'text-[10px] font-bold text-dim uppercase tracking-wider mb-2'

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-dark">Health & Nutrition</h3>
        <button onClick={() => setEditing(false)} className="text-xs text-dim hover:text-dark">Cancel</button>
      </div>
      <div className="space-y-5">

        {/* Diet type */}
        <div>
          <p className={section}>Diet Type</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DIET_TYPES.map(d => (
              <button key={d.id} onClick={() => setDietType(dietType === d.id ? '' : d.id)}
                className={`px-2 py-2 rounded-xl text-xs text-left transition-colors border ${dietType === d.id ? 'border-red-300 bg-red-50 text-red-700 font-semibold' : 'border-border bg-surface text-muted hover:border-muted'}`}>
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Makros */}
        <div>
          <p className={section}>Macros (daily target)</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Calories (kcal)</label><input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="2200" className={inp} /></div>
            <div><label className={lbl}>Protein (g)</label><input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="160" className={inp} /></div>
            <div><label className={lbl}>Carbs (g)</label><input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="250" className={inp} /></div>
            <div><label className={lbl}>Fat (g)</label><input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="65" className={inp} /></div>
            <div><label className={lbl}>Fiber (g)</label><input type="number" value={fiber} onChange={e => setFiber(e.target.value)} placeholder="30" className={inp} /></div>
          </div>
        </div>

        {/* Lifestyle */}
        <div>
          <p className={section}>Lifestyle</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Water (L/day)</label><input type="number" step="0.1" value={water} onChange={e => setWater(e.target.value)} placeholder="2.5" className={inp} /></div>
            <div><label className={lbl}>Sleep (h/night)</label><input type="number" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="7.5" className={inp} /></div>
          </div>
        </div>

        {/* Mikros */}
        <div>
          <p className={section}>Key Micronutrients</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Vitamin D (IU/day)</label><input type="number" value={vitaminD} onChange={e => setVitaminD(e.target.value)} placeholder="2000" className={inp} /></div>
            <div><label className={lbl}>Omega-3 (g/day)</label><input type="number" step="0.5" value={omega3} onChange={e => setOmega3(e.target.value)} placeholder="2" className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>Magnesium (mg/day)</label><input type="number" value={magnesium} onChange={e => setMagnesium(e.target.value)} placeholder="400" className={inp} /></div>
          </div>
        </div>

        {/* Supplements */}
        <div>
          <label className={lbl}>Supplements</label>
          <input type="text" value={supplements} onChange={e => setSupplements(e.target.value)} placeholder="e.g. Whey protein, Creatine, Vitamin C..." className={inp} />
        </div>

        {/* Gesundheit */}
        <div>
          <p className={section}>Health Info (for better coach advice)</p>
          <div className="space-y-2">
            <div><label className={lbl}>Injuries / Conditions</label><textarea value={injuries} onChange={e => setInjuries(e.target.value)} rows={2} placeholder="e.g. Left knee meniscus, lower back pain, shoulder impingement..." className={`${inp} resize-none`} /></div>
            <div><label className={lbl}>Allergies / Intolerances</label><input type="text" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Lactose, Gluten, Nuts..." className={inp} /></div>
            <div><label className={lbl}>Notes for Coach</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything else your coach should know..." className={`${inp} resize-none`} /></div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Health Profile'}
        </button>
      </div>
    </div>
  )

  // View mode
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-dark">Health & Nutrition</h3>
        <button onClick={startEdit} className={`text-xs font-medium ${hasData ? 'text-red-500 hover:text-red-600' : 'text-accent hover:text-accent-hover'}`}>
          {hasData ? 'Edit' : '+ Add'}
        </button>
      </div>
      {!hasData ? (
        <button onClick={startEdit}
          className="w-full border-2 border-dashed border-border rounded-xl py-6 text-center hover:border-accent/40 hover:bg-accent-soft/30 transition-colors">
          <div className="text-2xl mb-1.5">🥗</div>
          <p className="text-xs text-muted font-medium">Add nutrition & health data</p>
          <p className="text-[10px] text-dim mt-0.5">Helps the coach give better, personalized advice</p>
        </button>
      ) : (
        <div className="space-y-3">
          {dietInfo && (
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{dietInfo.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-dark">{dietInfo.label}</p>
                <p className="text-[10px] text-dim">Diet type</p>
              </div>
            </div>
          )}

          {/* Macro pills */}
          {(hp.calories_target || hp.protein_g || hp.carbs_g || hp.fat_g) && (
            <div className="grid grid-cols-2 gap-1.5">
              {hp.calories_target && <div className="bg-orange-50 rounded-xl p-2.5 text-center"><div className="text-sm font-black text-orange-600">{hp.calories_target}</div><div className="text-[9px] text-orange-400">kcal/day</div></div>}
              {hp.protein_g && <div className="bg-red-50 rounded-xl p-2.5 text-center"><div className="text-sm font-black text-red-600">{hp.protein_g}g</div><div className="text-[9px] text-red-400">Protein</div></div>}
              {hp.carbs_g && <div className="bg-amber-50 rounded-xl p-2.5 text-center"><div className="text-sm font-black text-amber-600">{hp.carbs_g}g</div><div className="text-[9px] text-amber-400">Carbs</div></div>}
              {hp.fat_g && <div className="bg-blue-50 rounded-xl p-2.5 text-center"><div className="text-sm font-black text-blue-600">{hp.fat_g}g</div><div className="text-[9px] text-blue-400">Fat</div></div>}
            </div>
          )}

          {/* Lifestyle badges */}
          {(hp.water_l || hp.sleep_hours) && (
            <div className="flex gap-3 flex-wrap">
              {hp.water_l && <div className="flex items-center gap-1.5 text-xs text-muted bg-surface rounded-lg px-2.5 py-1.5"><span>💧</span>{hp.water_l}L/day</div>}
              {hp.sleep_hours && <div className="flex items-center gap-1.5 text-xs text-muted bg-surface rounded-lg px-2.5 py-1.5"><span>😴</span>{hp.sleep_hours}h sleep</div>}
            </div>
          )}

          {/* Micros / Supplements */}
          {(hp.vitamin_d_iu || hp.omega3_g || hp.magnesium_mg || hp.supplements) && (
            <div>
              <p className="text-[10px] text-dim mb-1.5">Supplements & Micros</p>
              <div className="flex flex-wrap gap-1.5">
                {hp.vitamin_d_iu && <span className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg px-2 py-1">☀️ Vit D {hp.vitamin_d_iu}IU</span>}
                {hp.omega3_g && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1">🐟 Ω-3 {hp.omega3_g}g</span>}
                {hp.magnesium_mg && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2 py-1">🔮 Mg {hp.magnesium_mg}mg</span>}
                {hp.supplements && <span className="text-[10px] text-muted bg-surface border border-border rounded-lg px-2 py-1 truncate max-w-full">{hp.supplements}</span>}
              </div>
            </div>
          )}

          {/* Injuries warning */}
          {hp.injuries && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-amber-700 mb-1">⚠️ Injuries / Conditions</p>
              <p className="text-xs text-amber-700 leading-relaxed">{hp.injuries}</p>
            </div>
          )}

          {/* Allergies */}
          {hp.allergies && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-red-600 mb-1">🚫 Allergies</p>
              <p className="text-xs text-red-600">{hp.allergies}</p>
            </div>
          )}

          {/* Notes */}
          {hp.notes && (
            <div>
              <p className="text-[10px] text-dim mb-1">Coach Notes</p>
              <p className="text-xs text-muted italic">"{hp.notes}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// DATE RANGE PICKER
// =============================================
function DateRangePicker({ range, onChange }) {
  return (
    <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
      {[{ l: '7D', d: 7 }, { l: '14D', d: 14 }, { l: '30D', d: 30 }, { l: '90D', d: 90 }, { l: '6M', d: 180 }, { l: '1Y', d: 365 }].map(p => (
        <button key={p.d} onClick={() => onChange(p.d)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === p.d ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'}`}>{p.l}</button>
      ))}
    </div>
  )
}

// =============================================
// BMI / KFA INPUT MODAL
// =============================================
function BodyMetricsModal({ profile, onClose, onSave }) {
  const [bmi, setBmi] = useState(profile?.bmi_value || '')
  const [kfa, setKfa] = useState(profile?.body_fat_pct || '')
  const [saving, setSaving] = useState(false)

  // Auto-calculate BMI if weight + height available
  const autoBmi = profile?.weight_kg && profile?.height_cm
    ? (profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1)
    : null

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      bmi_value: bmi || autoBmi || null,
      body_fat_pct: kfa || null,
    })
    setSaving(false); onClose()
  }

  const getBmiCategory = (val) => {
    const v = parseFloat(val)
    if (!v) return null
    if (v < 18.5) return { label: 'Underweight', color: 'text-blue-500' }
    if (v < 25) return { label: 'Normal', color: 'text-green-500' }
    if (v < 30) return { label: 'Overweight', color: 'text-amber-500' }
    return { label: 'Obese', color: 'text-red-500' }
  }

  const getKfaCategory = (val, gender) => {
    const v = parseFloat(val)
    if (!v) return null
    if (gender === 'male') {
      if (v < 10) return { label: 'Essential', color: 'text-blue-500' }
      if (v < 14) return { label: 'Athletic', color: 'text-red-500' }
      if (v < 20) return { label: 'Fit', color: 'text-green-500' }
      if (v < 25) return { label: 'Average', color: 'text-amber-500' }
      return { label: 'Above Average', color: 'text-red-500' }
    } else {
      if (v < 18) return { label: 'Essential', color: 'text-blue-500' }
      if (v < 22) return { label: 'Athletic', color: 'text-red-500' }
      if (v < 28) return { label: 'Fit', color: 'text-green-500' }
      if (v < 32) return { label: 'Average', color: 'text-amber-500' }
      return { label: 'Above Average', color: 'text-red-500' }
    }
  }

  const bmiCat = getBmiCategory(bmi || autoBmi)
  const kfaCat = getKfaCategory(kfa, profile?.gender)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-dark">BMI & Body Fat</h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* BMI */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">BMI</label>
            {autoBmi && (
              <div className="text-xs text-dim mb-2">
                Auto-calculated from your weight & height: <strong>{autoBmi}</strong>
              </div>
            )}
            <input type="number" step="0.1" value={bmi} onChange={e => setBmi(e.target.value)}
              placeholder={autoBmi ? `Auto: ${autoBmi}` : 'e.g. 23.5'}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
            {bmiCat && (
              <div className={`text-xs mt-1.5 font-medium ${bmiCat.color}`}>→ {bmiCat.label}</div>
            )}
          </div>

          {/* KFA */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">Body Fat % (KFA)</label>
            <input type="number" step="0.1" value={kfa} onChange={e => setKfa(e.target.value)}
              placeholder="e.g. 15.0"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
            {kfaCat && (
              <div className={`text-xs mt-1.5 font-medium ${kfaCat.color}`}>→ {kfaCat.label}</div>
            )}
            <p className="text-[10px] text-dim mt-2 leading-relaxed">
              💡 You can measure body fat with calipers, a smart scale, or a DEXA scan for the most accurate results.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// BODY DATA MODAL (Weight, Height, DOB, Gender)
// =============================================
function BodyDataModal({ profile, onClose, onSave }) {
  const [weight, setWeight] = useState(profile?.weight_kg || '')
  const [height, setHeight] = useState(profile?.height_cm || '')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '')
  const [gender, setGender] = useState(profile?.gender || '')
  const [saving, setSaving] = useState(false)
  const GENDERS = [{ id: 'male', label: 'Male', icon: '♂️' }, { id: 'female', label: 'Female', icon: '♀️' }, { id: 'other', label: 'Other', icon: '⚧️' }, { id: 'prefer_not_to_say', label: 'Rather not say', icon: '🤐' }]
  const handleSave = async () => { setSaving(true); await onSave({ weight_kg: weight || null, height_cm: height || null, birth_date: birthDate || null, gender: gender || null }); setSaving(false); onClose() }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border"><h2 className="text-lg font-bold text-dark">Body Data</h2><button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-sm text-muted mb-1.5">Weight (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75.5" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /></div>
          <div><label className="block text-sm text-muted mb-1.5">Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="180" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /></div>
          <div><label className="block text-sm text-muted mb-1.5">Date of Birth</label><input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /></div>
          <div><label className="block text-sm text-muted mb-1.5">Gender</label><div className="grid grid-cols-2 gap-2">{GENDERS.map(g => <button key={g.id} onClick={() => setGender(g.id)} className={`p-2.5 rounded-xl border text-left text-sm ${gender === g.id ? 'border-red-400 bg-red-50 text-sky-700' : 'border-border bg-surface text-muted'}`}><span className="mr-1.5">{g.icon}</span>{g.label}</button>)}</div></div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// PROGRESS PHOTO/VIDEO ADD MODAL (drag & drop)
// =============================================
function ProgressAddModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  const handleFile = (file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image')
    const reader = new FileReader()
    reader.onload = () => setMediaUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!mediaUrl) return
    setSaving(true)
    await onSave({
      title: title || new Date().toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' }),
      description: description || null,
      media_url: mediaUrl, media_type: mediaType,
    })
    setSaving(false); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-dark">Add Progress Photo</h2>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Drag & Drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging ? 'border-red-400 bg-red-50' : mediaUrl ? 'border-green-300 bg-green-50' : 'border-border hover:border-red-300 hover:bg-red-50/30'
            }`}
          >
            {mediaUrl ? (
              <div>
                {mediaType === 'image'
                  ? <img src={mediaUrl} alt="" className="max-h-40 mx-auto rounded-lg mb-2" />
                  : <video src={mediaUrl} className="max-h-40 mx-auto rounded-lg mb-2" />
                }
                <p className="text-xs text-green-600 font-medium">✓ Click or drag to replace</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm text-muted font-medium">Drag & drop your progress photo</p>
                <p className="text-xs text-dim mt-1">or click to browse · JPG, PNG, MP4</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Title (optional)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`Default: ${new Date().toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Note (optional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Week 8, feeling stronger"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !mediaUrl}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving...' : 'Add to Timeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// HORIZONTAL PHOTO TIMELINE
// =============================================
function PhotoTimeline({ entries, onDelete }) {
  return entries.length > 0 ? (
    <div className="relative">
      {/* Horizontal line */}
      <div className="absolute top-[28px] left-0 right-0 h-0.5 bg-border" />
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        {entries.map((entry) => (
          <div key={entry.id} className="flex-shrink-0 w-56 relative">
            {/* Dot */}
            <div className="flex justify-center mb-2">
              <div className="w-4 h-4 bg-red-400 rounded-full border-[3px] border-white shadow-md z-10 relative" />
            </div>
            {/* Date */}
            <div className="text-center text-[10px] text-dim mb-2 font-medium">
              {new Date(entry.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {/* Card */}
            <div className="bg-surface rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
              {entry.media_url && entry.media_type === 'image' && (
                <img src={entry.media_url} alt="" className="w-full h-44 object-cover" />
              )}
              {entry.media_url && entry.media_type === 'video' && (
                <video src={entry.media_url} controls className="w-full h-44 object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-bold text-dark leading-tight">{entry.title}</div>
                  <button onClick={() => onDelete(entry.id)}
                    className="text-dim hover:text-red-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">✕</button>
                </div>
                {entry.description && <p className="text-[10px] text-muted mt-1 line-clamp-2">{entry.description}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">📸</div>
      <p className="text-sm text-muted mb-1">Track your body transformation</p>
      <p className="text-xs text-dim">Add photos or videos to see your progress over time</p>
    </div>
  )
}

// =============================================
// AVATAR UPLOAD COMPONENT
// =============================================
function AvatarUpload({ value, onChange, userId }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showUrl, setShowUrl] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [imgBroken, setImgBroken] = useState(false)
  const fileRef = useRef(null)

  const upload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return }
    setUploading(true); setUploadError('')
    try {
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setImgBroken(false)
      onChange(publicUrl + '?t=' + Date.now())
    } catch (err) {
      setUploadError(err.message?.includes('Bucket') ? 'Storage not configured. Use URL option below.' : (err.message || 'Upload failed.'))
    } finally { setUploading(false) }
  }

  const onFileChange = (e) => { const f = e.target.files?.[0]; if (f) upload(f) }
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f) }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle — click or drop */}
      <div
        className={`relative w-24 h-24 rounded-full cursor-pointer group transition-all ${dragOver ? 'ring-4 ring-accent ring-offset-2' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-surface flex items-center justify-center text-4xl select-none">
          {value && !imgBroken
            ? <img src={value} alt="avatar" className="w-full h-full object-cover" onError={() => setImgBroken(true)} />
            : <span>👤</span>
          }
        </div>
        {/* Hover / uploading overlay */}
        <div className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-1 transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {uploading
            ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><span className="text-white text-xl">📷</span><span className="text-white text-[10px] font-semibold">Change</span></>
          }
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      <div className="text-center space-y-0.5">
        <p className="text-xs text-muted">Click or drag & drop a photo</p>
        <p className="text-xs text-dim">JPG, PNG, GIF, WebP · max 5 MB</p>
      </div>

      {/* URL fallback */}
      <button type="button" onClick={() => { setShowUrl(v => !v); setUrlInput(value || '') }}
        className="text-xs text-dim hover:text-accent underline underline-offset-2 transition-colors">
        {showUrl ? 'Hide URL input' : 'Or paste an image URL'}
      </button>
      {showUrl && (
        <div className="w-full flex gap-2">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setImgBroken(false); onChange(urlInput); setShowUrl(false) } }}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-dark text-xs focus:outline-none focus:border-red-400" />
          <button type="button" onClick={() => { setImgBroken(false); onChange(urlInput); setShowUrl(false) }}
            className="px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors">
            Apply
          </button>
        </div>
      )}

      {uploadError && <p className="text-xs text-red-500 text-center">{uploadError}</p>}
    </div>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [editMode, setEditMode] = useState(false)
  const [showBodyModal, setShowBodyModal] = useState(false)
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)

  // Google Calendar
  const [calendarUrl, setCalendarUrl] = useState(() => localStorage.getItem('gainly_gcal_url') || '')
  const [calendarInput, setCalendarInput] = useState('')
  const [showCalendarEdit, setShowCalendarEdit] = useState(false)

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [bioPublic, setBioPublic] = useState(false)

  // Stats
  const [statsRange, setStatsRange] = useState(30)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [achievementCount, setAchievementCount] = useState(0)
  const [xpData, setXpData] = useState([])
  const [workoutData, setWorkoutData] = useState([])
  const [muscleData, setMuscleData] = useState([])
  const [timeline, setTimeline] = useState([])
  const [weightHistory, setWeightHistory] = useState([])

  useEffect(() => { if (user) { loadProfile(); loadTimeline(); loadWeightHistory() } }, [user])
  useEffect(() => { if (user) loadStats() }, [user, statsRange])

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) { setProfile(data); setUsername(data.username || ''); setAvatarUrl(data.avatar_url || ''); setBio(data.bio || ''); setBioPublic(data.bio_public ?? false); if (!data.username) setEditMode(true) }
    setLoading(false)
  }

  const loadWeightHistory = async () => {
    const { data } = await supabase.from('body_measurements').select('weight_kg, measured_at').eq('user_id', user.id).not('weight_kg', 'is', null).order('measured_at', { ascending: true }).limit(30)
    setWeightHistory((data || []).map(w => ({ label: new Date(w.measured_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: parseFloat(w.weight_kg) })))
  }

  const loadStats = async () => {
    const since = new Date(Date.now() - statsRange * 86400000)
    const { count } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', since.toISOString())
    setWorkoutCount(count || 0)
    const { count: ac } = await supabase.from('user_achievements').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setAchievementCount(ac || 0)

    const buckets = Math.min(statsRange <= 14 ? statsRange : 8, 12)
    const bDays = Math.ceil(statsRange / buckets)
    const xpB = [], wB = []
    for (let i = buckets - 1; i >= 0; i--) {
      const s = new Date(Date.now() - (i + 1) * bDays * 86400000), e = new Date(Date.now() - i * bDays * 86400000)
      const lbl = bDays <= 1 ? e.toLocaleDateString('en', { weekday: 'short' }) : s.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      const { data: xr } = await supabase.from('xp_transactions').select('amount').eq('user_id', user.id).gte('created_at', s.toISOString()).lt('created_at', e.toISOString())
      xpB.push({ label: lbl, value: (xr || []).reduce((sum, r) => sum + (r.amount || 0), 0) })
      const { count: wc } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', s.toISOString()).lt('started_at', e.toISOString())
      wB.push({ label: lbl, value: wc || 0 })
    }
    setXpData(xpB); setWorkoutData(wB)

    const { data: eL } = await supabase.from('exercise_logs').select('exercise_id, reps_completed').gte('created_at', since.toISOString())
    if (eL?.length) {
      const ids = [...new Set(eL.map(l => l.exercise_id))]
      const { data: exs } = await supabase.from('exercises').select('id, category').in('id', ids)
      const cm = Object.fromEntries((exs || []).map(e => [e.id, e.category]))
      const c = { push: 0, pull: 0, legs: 0, core: 0, cardio: 0, flexibility: 0 }
      eL.forEach(l => { const cat = cm[l.exercise_id]; if (cat && c[cat] !== undefined) c[cat] += (l.reps_completed || 1) })
      setMuscleData(Object.entries(c).map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v })))
    } else setMuscleData([{ label: 'Push', value: 0 }, { label: 'Pull', value: 0 }, { label: 'Legs', value: 0 }, { label: 'Core', value: 0 }, { label: 'Cardio', value: 0 }, { label: 'Flex', value: 0 }])
  }

  const loadTimeline = async () => {
    const { data } = await supabase.from('progress_timeline').select('*').eq('user_id', user.id).order('created_at', { ascending: true }).limit(100)
    setTimeline(data || [])
  }

  const handleSaveProfile = async () => {
    setSaving(true); setMessage('')
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setMessage('Error: 3-20 chars, letters, numbers, _ only'); setSaving(false); return }
    if (username && username !== profile?.username) {
      const { data: ex } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).neq('id', user.id).maybeSingle()
      if (ex) { setMessage('Error: Username taken'); setSaving(false); return }
    }
    const { error } = await supabase.from('profiles').update({ username: username.toLowerCase() || null, display_name: username || null, avatar_url: avatarUrl || null, bio: bio || null, bio_public: bioPublic }).eq('id', user.id)
    error ? setMessage('Error: ' + error.message) : (setMessage('Saved!'), setEditMode(false), await loadProfile(), setTimeout(() => setMessage(''), 3000))
    setSaving(false)
  }

  const handleSaveBodyData = async (d) => { await supabase.from('profiles').update(d).eq('id', user.id); await loadProfile() }
  const handleSaveMetrics = async (d) => { await supabase.from('profiles').update(d).eq('id', user.id); await loadProfile() }
  const handleSaveHealthProfile = async (d) => { await supabase.from('profiles').update(d).eq('id', user.id); await loadProfile() }
  const handleAddProgress = async (e) => { await supabase.from('progress_timeline').insert({ user_id: user.id, ...e }); await loadTimeline() }
  const handleDeleteProgress = async (id) => { await supabase.from('progress_timeline').delete().eq('id', id); await loadTimeline() }

  const league = useMemo(() => getLeague(profile?.xp_total || 0), [profile?.xp_total])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

  return (
    <div className="max-w-5xl">
      {/* Header with BMI/KFA button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-dark">Profile</h1>
        <button onClick={() => setShowMetricsModal(true)}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-2">
          📊 BMI / KFA
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        {['profile', 'stats'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-dark'}`}>
            {tab === 'profile' ? 'Profile' : 'Stats & Progress'}
          </button>
        ))}
      </div>

      {message && <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>{message}</div>}

      {/* ============ PROFILE TAB ============ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-dark">Personal Info</h2>
                {!editMode && profile?.username && <button onClick={() => setEditMode(true)} className="text-red-500 hover:text-red-600 text-sm font-medium">Edit</button>}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} userId={user?.id} />
                  <div><label className="block text-sm text-muted mb-2">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="fitnessbeast42" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /><p className="text-xs text-dim mt-1">3-20 chars, letters, numbers and _</p></div>
                  <div><label className="block text-sm text-muted mb-2">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Your fitness journey..." className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400 resize-none" /><label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={bioPublic} onChange={e => setBioPublic(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-xs text-muted">Show publicly in Community</span></label></div>
                  <div className="flex gap-3">
                    {profile?.username && <button onClick={() => { setEditMode(false); setUsername(profile.username || ''); setAvatarUrl(profile.avatar_url || ''); setBio(profile.bio || '') }} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>}
                    <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-5">
                  <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-4xl overflow-hidden border-2 border-border flex-shrink-0">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" /> : '👤'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-black text-dark">{profile?.username || 'No username'}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${league.bg} ${league.color}`}>{league.emoji} {league.name}</span>
                    </div>
                    <div className="text-sm text-muted mt-1">{[profile?.gender && profile.gender !== 'prefer_not_to_say' ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null, calcAge(profile?.birth_date) ? `${calcAge(profile.birth_date)} years` : null, profile?.fitness_level ? profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1) : null].filter(Boolean).join(' · ') || 'No info set'}</div>
                    {profile?.bio && <p className="text-sm text-muted mt-2 italic">"{profile.bio}"</p>}
                    {league.next && (
                      <div className="mt-3"><div className="flex justify-between text-xs mb-1"><span className="text-muted">{league.emoji} {league.name}</span><span className="text-muted">{league.next.emoji} {league.next.name}</span></div><div className="h-2 bg-surface rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(((profile?.xp_total || 0) - league.min) / (league.next.min - league.min) * 100, 100)}%` }} /></div><div className="text-xs text-dim mt-1">{profile?.xp_total || 0} / {league.next.min} XP</div></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Progress Timeline (Photos/Videos only) */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-dark">Progress Timeline</h2>
                <button onClick={() => setShowProgressModal(true)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">+ Add Photo</button>
              </div>
              <PhotoTimeline entries={timeline} onDelete={handleDeleteProgress} />
            </div>

            {/* Google Calendar */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-dark">📅 Google Calendar</h2>
                  <p className="text-xs text-muted mt-0.5">Dein Trainingsplan direkt im Profil</p>
                </div>
                <button
                  onClick={() => { setShowCalendarEdit(e => !e); setCalendarInput(calendarUrl) }}
                  className="text-red-500 hover:text-red-600 text-xs font-semibold transition-colors">
                  {calendarUrl ? 'Bearbeiten' : 'Verknüpfen'}
                </button>
              </div>

              {showCalendarEdit && (
                <div className="mb-5 space-y-3 bg-surface rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted leading-relaxed">
                    <strong className="text-dark">So geht's:</strong> Google Calendar öffnen → Einstellungen → deinen Kalender auswählen → "In andere Apps einbetten" → die <code className="bg-white px-1 py-0.5 rounded text-[10px] border border-border">src</code>-URL aus dem iframe-Code kopieren.
                  </p>
                  <input type="url" value={calendarInput} onChange={e => setCalendarInput(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/embed?src=..."
                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCalendarUrl(calendarInput); localStorage.setItem('gainly_gcal_url', calendarInput); setShowCalendarEdit(false) }}
                      disabled={!calendarInput.trim()}
                      className="flex-1 py-2.5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-30 transition-all">
                      Speichern
                    </button>
                    {calendarUrl && (
                      <button
                        onClick={() => { setCalendarUrl(''); setCalendarInput(''); localStorage.removeItem('gainly_gcal_url'); setShowCalendarEdit(false) }}
                        className="px-4 py-2.5 border border-border rounded-xl text-xs text-muted hover:text-red-500 hover:border-red-200 transition-all">
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {calendarUrl ? (
                <div className="rounded-xl overflow-hidden border border-border">
                  <iframe
                    src={calendarUrl}
                    style={{ border: 0 }}
                    width="100%"
                    height="600"
                    frameBorder="0"
                    scrolling="no"
                    title="Google Calendar"
                  />
                </div>
              ) : !showCalendarEdit && (
                <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-sm text-muted font-medium">Noch kein Kalender verknüpft</p>
                  <p className="text-xs text-dim mt-1">Klicke auf "Verknüpfen" um deinen Google Kalender einzubetten</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4 xl:sticky xl:top-6">
            {/* Body Data */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <BodyDataPanel profile={profile} onSave={handleSaveBodyData} />
            </div>

            {/* BMI */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-dark mb-3">BMI</h3>
              <BmiGauge weightKg={profile?.weight_kg} heightCm={profile?.height_cm} bmiValue={profile?.bmi_value} />
            </div>

            {/* KFA */}
            {profile?.body_fat_pct && (
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-dark mb-3">Body Fat %</h3>
                <KfaGauge kfa={profile.body_fat_pct} gender={profile?.gender} />
              </div>
            )}

            {/* Health & Nutrition */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <NutritionPanel profile={profile} onSave={handleSaveHealthProfile} />
            </div>
          </div>
        </div>
      )}

      {/* ============ STATS TAB ============ */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-dark">Your Progress</h2>
            <DateRangePicker range={statsRange} onChange={setStatsRange} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-red-200 rounded-xl p-4 text-center"><div className="text-2xl font-black text-red-500">{profile?.xp_total || 0}</div><div className="text-xs text-red-400 mt-1">Total XP</div></div>
            <div className="bg-white border border-border rounded-xl p-4 text-center"><div className="text-2xl font-black text-dark">{workoutCount}</div><div className="text-xs text-muted mt-1">Workouts</div></div>
            <div className="bg-white border border-border rounded-xl p-4 text-center"><div className="text-2xl font-black text-dark">{profile?.current_streak || 0} 🔥</div><div className="text-xs text-muted mt-1">Streak</div></div>
            <div className="bg-white border border-border rounded-xl p-4 text-center"><div className="text-2xl font-black text-dark">{achievementCount}</div><div className="text-xs text-muted mt-1">Achievements</div></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-2xl p-6"><AreaChart data={xpData} label="XP Earned" color="#e10600" /></div>
            <div className="bg-white border border-border rounded-2xl p-6"><AreaChart data={workoutData} label="Workouts" color="#34d399" /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-2xl p-6"><BarChart data={workoutData} label="Workout Frequency" /></div>
            <div className="bg-white border border-border rounded-2xl p-6"><RadarChart data={muscleData} /></div>
          </div>
          {weightHistory.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-6"><AreaChart data={weightHistory} label="Weight Trend" color="#8b5cf6" unit=" kg" /></div>
          )}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="text-sm font-semibold text-dark mb-4">Goals</div>
            <div className="space-y-4">
              <ProgressBar label="Weekly Workouts" value={workoutData[workoutData.length - 1]?.value || 0} max={7} />
              <ProgressBar label="Current Streak" value={profile?.current_streak || 0} max={Math.max(profile?.longest_streak || 7, 7)} />
              <ProgressBar label="Achievements" value={achievementCount} max={Math.max(achievementCount + 5, 10)} color="bg-amber-400" />
              {league.next && <ProgressBar label={`${league.name} → ${league.next.name}`} value={profile?.xp_total || 0} max={league.next.min} color="bg-purple-400" />}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBodyModal && <BodyDataModal profile={profile} onClose={() => setShowBodyModal(false)} onSave={handleSaveBodyData} />}
      {showMetricsModal && <BodyMetricsModal profile={profile} onClose={() => setShowMetricsModal(false)} onSave={handleSaveMetrics} />}
      {showProgressModal && <ProgressAddModal onClose={() => setShowProgressModal(false)} onSave={handleAddProgress} />}
    </div>
  )
}