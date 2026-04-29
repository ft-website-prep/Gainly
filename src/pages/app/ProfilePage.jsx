import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import MetricDetailPanel from '../../components/profile/MetricDetailPanel'

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

// =============================================
// BODY DATA CATEGORY CONFIGS
// =============================================
const BODY_DATA_CATEGORIES = [
  {
    id: 'nutrition', emoji: '🥗', title: 'Nutrition & Macros',
    description: 'Daily dietary targets and lifestyle',
    source: 'hp',
    fields: [
      { key: 'diet_type', label: 'Diet Type', type: 'diet', info: 'Your primary dietary pattern helps the coach tailor nutrition and recipe advice.' },
      { key: 'calories_target', label: 'Calories', unit: 'kcal/day', placeholder: '2200', info: 'Total daily energy target. Surplus = muscle gain, deficit = fat loss. Highly individual.' },
      { key: 'protein_g', label: 'Protein', unit: 'g/day', placeholder: '160', info: 'Target 1.6–2.2g per kg bodyweight for muscle growth and recovery.' },
      { key: 'carbs_g', label: 'Carbs', unit: 'g/day', placeholder: '250', info: 'Primary fuel for high-intensity training. Replenish glycogen post-workout.' },
      { key: 'fat_g', label: 'Fat', unit: 'g/day', placeholder: '65', info: 'Essential for hormone production (especially testosterone). Minimum ~0.5g/kg.' },
      { key: 'fiber_g', label: 'Fiber', unit: 'g/day', placeholder: '30', info: 'Supports gut health and steady energy. Target 25–35g/day.' },
      { key: 'water_l', label: 'Water', unit: 'L/day', placeholder: '3', step: 0.1, info: 'Even 2% dehydration measurably reduces strength and endurance output.' },
      { key: 'sleep_hours', label: 'Sleep', unit: 'h/night', placeholder: '8', step: 0.5, info: '7–9h is optimal for athletes. Growth hormone peaks during deep sleep.' },
      { key: 'supplements', label: 'Supplements', type: 'text', placeholder: 'e.g. Creatine, Whey, Omega-3', info: 'Currently taken supplements — helps avoid redundant recommendations.' },
      { key: 'injuries', label: 'Injuries / Conditions', type: 'textarea', placeholder: 'e.g. Left knee meniscus, lower back pain…', info: 'Active or chronic issues — the coach will avoid exercises that aggravate them.' },
      { key: 'allergies', label: 'Allergies / Intolerances', type: 'text', placeholder: 'e.g. Lactose, Gluten, Nuts', info: 'Dietary restrictions for safe nutrition recommendations.' },
      { key: 'notes', label: 'Coach Notes', type: 'textarea', placeholder: 'Anything else the coach should know…', info: 'Free-text context for the AI coach — goals, limitations, preferences.' },
    ],
  },
  {
    id: 'blood', emoji: '🩸', title: 'Blood Markers',
    description: 'Iron, vitamins and blood cell values from lab results',
    source: 'bm',
    fields: [
      { key: 'iron_ugdl', label: 'Iron', unit: 'µg/dL', placeholder: '100', info: 'Oxygen transport capacity. Low iron → fatigue, poor recovery, reduced VO2max.' },
      { key: 'ferritin_ugl', label: 'Ferritin', unit: 'µg/L', placeholder: '80', info: 'Iron storage protein. More sensitive than serum iron. Optimal for athletes: >50 µg/L.' },
      { key: 'hemoglobin_gdl', label: 'Hemoglobin', unit: 'g/dL', placeholder: '14.5', info: 'Oxygen carrier in red blood cells. Men: 13.5–17.5, Women: 12–15.5 g/dL.' },
      { key: 'vitamin_d_ngml', label: 'Vitamin D', unit: 'ng/mL', placeholder: '40', info: 'Affects testosterone levels, bone density, immune function and mood. Optimal: 40–60 ng/mL.' },
      { key: 'vitamin_b12_pmoll', label: 'Vitamin B12', unit: 'pmol/L', placeholder: '300', info: 'Nerve function and red blood cell formation. Vegans and endurance athletes often deficient.' },
      { key: 'folate_nmoll', label: 'Folate', unit: 'nmol/L', placeholder: '15', info: 'Cell growth and DNA synthesis. Important for recovery and red blood cell production.' },
    ],
  },
  {
    id: 'hormones', emoji: '⚗️', title: 'Hormones',
    description: 'Testosterone, cortisol, thyroid — from blood panel',
    source: 'bm',
    fields: [
      { key: 'testosterone_nmoll', label: 'Testosterone', unit: 'nmol/L', placeholder: '15', info: 'Primary anabolic hormone. Drives muscle growth, libido, and energy. Men: 10–35, Women: 0.3–2.4 nmol/L.' },
      { key: 'cortisol_nmoll', label: 'Cortisol', unit: 'nmol/L', placeholder: '400', info: 'Stress hormone. Chronically elevated cortisol breaks down muscle and impairs recovery.' },
      { key: 'tsh_miull', label: 'TSH', unit: 'mIU/L', placeholder: '1.5', step: 0.01, info: 'Thyroid stimulating hormone. Controls metabolism. Optimal for athletes: 0.5–2.0 mIU/L.' },
      { key: 'estradiol_pmoll', label: 'Estradiol', unit: 'pmol/L', placeholder: '80', info: 'Primary estrogen. Affects bone density, recovery, and mood. Present in all sexes.' },
      { key: 'dhea_umoll', label: 'DHEA-S', unit: 'µmol/L', placeholder: '6', info: 'Precursor to sex hormones. Naturally declines with age. Linked to energy and wellbeing.' },
      { key: 'insulin_miull', label: 'Insulin (fasting)', unit: 'mIU/L', placeholder: '5', step: 0.1, info: 'Regulates blood sugar. High fasting insulin signals insulin resistance and impaired fat burning.' },
    ],
  },
  {
    id: 'cardio', emoji: '❤️', title: 'Cardiovascular',
    description: 'Heart rate, blood pressure, cholesterol',
    source: 'bm',
    fields: [
      { key: 'resting_hr_bpm', label: 'Resting Heart Rate', unit: 'bpm', placeholder: '60', step: 1, info: 'Lower is better. Trained athletes: 40–60 bpm. High resting HR = poor fitness or overtraining.', description: 'Your resting heart rate is the number of times your heart beats per minute while fully at rest. It directly reflects how efficiently your heart works — the fitter you are, the fewer beats it needs to pump the same volume of blood. Normal range: 60–100 bpm. Endurance athletes often reach 40–60 bpm. Current research shows that a persistently elevated resting heart rate is an independent risk factor for heart disease, cancer, and all-cause mortality — regardless of blood pressure or cholesterol levels.', hasStudy: true },
      { key: 'bp_systolic', label: 'Blood Pressure (sys)', unit: 'mmHg', placeholder: '120', step: 1, info: 'Systolic pressure (peak during heartbeat). Normal: <120 mmHg.', description: 'Systolic blood pressure is the peak pressure in your arteries when your heart beats and pushes blood out. It is the top number in a blood pressure reading (e.g. 120/80). Normal: below 120 mmHg. Elevated systolic pressure (≥130) is a key risk factor for stroke, heart attack, and kidney disease. The good news: regular exercise acutely and chronically lowers systolic blood pressure, with effects observed in people of all fitness levels and health backgrounds.', hasStudy: true },
      { key: 'bp_diastolic', label: 'Blood Pressure (dia)', unit: 'mmHg', placeholder: '80', step: 1, info: 'Diastolic pressure (between beats). Normal: <80 mmHg.', description: 'Diastolic blood pressure is the pressure in your arteries between heartbeats, when your heart relaxes and refills. It is the bottom number in a blood pressure reading (e.g. 120/80). Normal: below 80 mmHg. Chronically elevated diastolic pressure indicates that your arteries are under constant stress, which accelerates arterial stiffening over time. Like systolic pressure, it responds well to regular aerobic and resistance exercise.', hasStudy: true },
      { key: 'cholesterol_total', label: 'Total Cholesterol', unit: 'mg/dL', placeholder: '180', step: 1, info: 'HDL + LDL combined. Optimal <200 mg/dL. Context matters — high HDL is beneficial.', description: 'Total cholesterol is the combined measure of all cholesterol in your blood, including HDL ("good"), LDL ("bad"), and VLDL. Optimal: below 200 mg/dL. However, the number alone is not the full story — a high total cholesterol driven by high HDL is very different from one driven by high LDL. The 2018 AHA/ACC guidelines emphasize that total cholesterol should always be interpreted alongside the individual components and your overall cardiovascular risk profile.', hasStudy: true },
      { key: 'cholesterol_hdl', label: 'HDL', unit: 'mg/dL', placeholder: '55', step: 1, info: '"Good" cholesterol. Removes cholesterol from arteries. Higher is better. <40 = risk factor.', description: 'HDL (high-density lipoprotein) is known as "good" cholesterol because it transports excess cholesterol from your arteries back to the liver for removal. Higher HDL is consistently associated with lower cardiovascular risk — even among people with already low LDL levels. Optimal: above 60 mg/dL for men, above 50 mg/dL for women. Values below 40 mg/dL in men or 50 mg/dL in women are considered an independent risk factor for heart disease. Regular exercise is one of the most effective ways to raise HDL.', hasStudy: true },
      { key: 'cholesterol_ldl', label: 'LDL', unit: 'mg/dL', placeholder: '110', step: 1, info: '"Bad" cholesterol. Builds up in arteries. Optimal for athletes: <100 mg/dL.', description: 'LDL (low-density lipoprotein) is the primary carrier of cholesterol in the blood and is the main driver of atherosclerosis — the buildup of plaques in artery walls that leads to heart attack and stroke. Unlike HDL, lower is better. Optimal: below 100 mg/dL, and below 70 mg/dL for high-risk individuals. A large body of genetic, epidemiological, and clinical trial evidence unequivocally establishes that LDL causes cardiovascular disease in a dose-dependent manner — the longer and higher your exposure, the greater your risk.', hasStudy: true },
      { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', placeholder: '100', step: 1, info: 'Blood fats. High levels linked to poor diet, excess carbs and insulin resistance. <150 = normal.', description: 'Triglycerides are the most common type of fat in your blood. After eating, your body converts unused calories into triglycerides and stores them in fat cells. Normal: below 150 mg/dL. Borderline high: 150–199. High: 200–499. Very high: ≥500 mg/dL (risk of pancreatitis). Elevated triglycerides are closely linked to excess refined carbohydrates, sugar, alcohol, obesity, and insulin resistance. They have been rising in the US population since 1976, mirroring the growth of obesity and type 2 diabetes.', hasStudy: true },
    ],
  },
  {
    id: 'metabolic', emoji: '🔬', title: 'Metabolic & Organ',
    description: 'Glucose, kidney and liver markers',
    source: 'bm',
    fields: [
      { key: 'glucose_mgdl', label: 'Fasting Glucose', unit: 'mg/dL', placeholder: '90', step: 1, info: 'Blood sugar after 8h fast. Normal: 70–99. Prediabetes: 100–125. Key for energy management.' },
      { key: 'hba1c_pct', label: 'HbA1c', unit: '%', placeholder: '5.2', step: 0.1, info: '3-month average blood sugar. <5.7% = normal. Key long-term metabolic marker.' },
      { key: 'creatinine_mgdl', label: 'Creatinine', unit: 'mg/dL', placeholder: '0.9', step: 0.01, info: 'Kidney function marker. Can be temporarily elevated after intense training — not necessarily a concern.' },
      { key: 'uric_acid_mgdl', label: 'Uric Acid', unit: 'mg/dL', placeholder: '5.5', step: 0.1, info: 'Elevated with high protein diets or gout risk. High values can affect joint health.' },
      { key: 'alt_ul', label: 'ALT', unit: 'U/L', placeholder: '25', step: 1, info: 'Liver enzyme. Often elevated after hard training in athletes — usually benign. Monitor trends.' },
      { key: 'ast_ul', label: 'AST', unit: 'U/L', placeholder: '22', step: 1, info: 'Liver and muscle enzyme. Regularly elevated post-workout in strength athletes. Context is key.' },
    ],
  },
  {
    id: 'composition', emoji: '📐', title: 'Body Composition',
    description: 'Circumference measurements',
    source: 'bm',
    fields: [
      { key: 'waist_cm', label: 'Waist', unit: 'cm', placeholder: '80', step: 0.5, info: 'Key health indicator. Men: <94cm optimal. Women: <80cm optimal. Waist-to-hip ratio predicts cardiovascular risk.' },
      { key: 'hip_cm', label: 'Hip', unit: 'cm', placeholder: '95', step: 0.5, info: 'Used for waist-to-hip ratio (WHR). WHR >0.9 (men) or >0.85 (women) = elevated cardiovascular risk.' },
      { key: 'neck_cm', label: 'Neck', unit: 'cm', placeholder: '38', step: 0.5, info: 'Used in the US Navy body fat estimation formula. Larger neck with smaller waist = leaner composition.' },
    ],
  },
]

// =============================================
// CATEGORY MODAL
// =============================================
function CategoryModal({ config, values, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const f = {}
    config.fields.forEach(field => { f[field.key] = values?.[field.key] ?? '' })
    return f
  })
  const [saving, setSaving] = useState(false)
  const [infoKey, setInfoKey] = useState(null)
  const [detailMetric, setDetailMetric] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    const updates = {}
    config.fields.forEach(field => {
      const v = form[field.key]
      if (field.type === 'text' || field.type === 'textarea' || field.type === 'diet') {
        updates[field.key] = v || null
      } else {
        updates[field.key] = v !== '' && v !== null && v !== undefined ? +v : null
      }
    })
    await onSave(updates)
    setSaving(false)
    onClose()
  }

  const inp = 'w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-dark text-sm focus:outline-none focus:border-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <h3 className="font-bold text-dark text-sm">{config.title}</h3>
              <p className="text-[11px] text-dim">{config.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-surface flex items-center justify-center text-xl text-dim hover:text-dark transition-colors leading-none">×</button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {config.fields.map(f => (
            <div key={f.key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs font-medium text-muted">{f.label}</span>
                {f.unit && <span className="text-[10px] text-dim">({f.unit})</span>}
                {f.info && (
                  <button
                    onClick={() => f.hasStudy
                      ? setDetailMetric(f)
                      : setInfoKey(infoKey === f.key ? null : f.key)
                    }
                    className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center flex-shrink-0 transition-colors font-bold ${
                      infoKey === f.key ? 'bg-surface border-muted text-dark' : 'border-dim/50 text-dim hover:border-muted hover:text-muted'
                    }`}
                  >i</button>
                )}
              </div>
              {infoKey === f.key && (
                <div className="mb-2 text-[11px] text-muted bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
                  {f.info}
                </div>
              )}
              {f.type === 'diet' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {DIET_TYPES.map(d => (
                    <button key={d.id} onClick={() => setForm(p => ({ ...p, [f.key]: p[f.key] === d.id ? '' : d.id }))}
                      className={`px-2 py-2 rounded-xl text-xs text-left transition-colors border ${form[f.key] === d.id ? 'border-red-300 bg-red-50 text-red-700 font-semibold' : 'border-border bg-surface text-muted hover:border-muted'}`}>
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              ) : f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  rows={2} placeholder={f.placeholder} className={`${inp} resize-none`} />
              ) : f.type === 'text' ? (
                <input type="text" value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className={inp} />
              ) : (
                <input type="number" step={f.step ?? 0.1} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className={inp} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Metric Detail Panel */}
      {detailMetric && (
        <MetricDetailPanel
          metric={detailMetric}
          categoryTitle={config.title}
          categoryEmoji={config.emoji}
          onClose={() => setDetailMetric(null)}
        />
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
  const [openCategoryId, setOpenCategoryId] = useState(null)
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
  const handleSaveBiomarkers = async (updates) => {
    const current = profile?.health_profile || {}
    const merged = { ...current, biomarkers: { ...(current.biomarkers || {}), ...updates } }
    await supabase.from('profiles').update({ health_profile: merged }).eq('id', user.id)
    await loadProfile()
  }
  const handleAddProgress = async (e) => { await supabase.from('progress_timeline').insert({ user_id: user.id, ...e }); await loadTimeline() }
  const handleDeleteProgress = async (id) => { await supabase.from('progress_timeline').delete().eq('id', id); await loadTimeline() }

  const league = useMemo(() => getLeague(profile?.xp_total || 0), [profile?.xp_total])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

  return (
    <div className="flex gap-8" style={{ minHeight: 'calc(100vh - 160px)' }}>

      {/* ── Left sidebar (Settings-style) ── */}
      <div className="w-52 flex-shrink-0">
        <div className="sticky top-0 pt-1">
          <h1 className="text-xl font-black text-dark mb-6 px-3">Profile</h1>

          <div className="mb-5">
            <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-1 px-3">Profile</p>
            {[
              { id: 'profile', label: 'Account' },
              { id: 'bodydata', label: 'Body Data' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeTab === item.id ? 'bg-surface border border-border text-dark font-semibold' : 'text-muted hover:text-dark hover:bg-surface'
                }`}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <p className="text-[10px] font-bold text-dim uppercase tracking-widest mb-1 px-3">Progress</p>
            <button onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                activeTab === 'stats' ? 'bg-surface border border-border text-dark font-semibold' : 'text-muted hover:text-dark hover:bg-surface'
              }`}>
              Stats & Progress
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {message && <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>{message}</div>}

      {/* ============ ACCOUNT TAB ============ */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-2xl">
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

          {/* Progress Timeline */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Progress Timeline</h2>
              <button onClick={() => setShowProgressModal(true)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">+ Add Photo</button>
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
              <button onClick={() => { setShowCalendarEdit(e => !e); setCalendarInput(calendarUrl) }}
                className="text-red-500 hover:text-red-600 text-xs font-semibold transition-colors">
                {calendarUrl ? 'Bearbeiten' : 'Verknüpfen'}
              </button>
            </div>
            {showCalendarEdit && (
              <div className="mb-5 space-y-3 bg-surface rounded-xl p-4 border border-border">
                <p className="text-xs text-muted leading-relaxed"><strong className="text-dark">So geht's:</strong> Google Calendar öffnen → Einstellungen → deinen Kalender auswählen → "In andere Apps einbetten" → die <code className="bg-white px-1 py-0.5 rounded text-[10px] border border-border">src</code>-URL aus dem iframe-Code kopieren.</p>
                <input type="url" value={calendarInput} onChange={e => setCalendarInput(e.target.value)} placeholder="https://calendar.google.com/calendar/embed?src=..." className="w-full bg-white border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" />
                <div className="flex gap-2">
                  <button onClick={() => { setCalendarUrl(calendarInput); localStorage.setItem('gainly_gcal_url', calendarInput); setShowCalendarEdit(false) }} disabled={!calendarInput.trim()} className="flex-1 py-2.5 bg-dark text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-30 transition-all">Speichern</button>
                  {calendarUrl && <button onClick={() => { setCalendarUrl(''); setCalendarInput(''); localStorage.removeItem('gainly_gcal_url'); setShowCalendarEdit(false) }} className="px-4 py-2.5 border border-border rounded-xl text-xs text-muted hover:text-red-500 hover:border-red-200 transition-all">Entfernen</button>}
                </div>
              </div>
            )}
            {calendarUrl ? (
              <div className="rounded-xl overflow-hidden border border-border">
                <iframe src={calendarUrl} style={{ border: 0 }} width="100%" height="600" frameBorder="0" scrolling="no" title="Google Calendar" />
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
      )}

      {/* ============ BODY DATA TAB ============ */}
      {activeTab === 'bodydata' && (() => {
        const hp = profile?.health_profile || {}
        const bm = hp.biomarkers || {}

        const openConfig = BODY_DATA_CATEGORIES.find(c => c.id === openCategoryId)
        const getValues = (cat) => cat.source === 'hp' ? hp : bm
        const getHandler = (cat) => cat.source === 'hp' ? handleSaveHealthProfile : handleSaveBiomarkers
        const filledCount = (cat) => cat.fields.filter(f => {
          const v = getValues(cat)[f.key]
          return v !== null && v !== undefined && v !== ''
        }).length

        return (
          <>
            {openConfig && (
              <CategoryModal
                config={openConfig}
                values={getValues(openConfig)}
                onSave={getHandler(openConfig)}
                onClose={() => setOpenCategoryId(null)}
              />
            )}

            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              {/* Basic metrics + gauges side by side */}
              <div className="p-6 border-b border-border">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
                  <BodyDataPanel profile={profile} onSave={handleSaveBodyData} />
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-dim uppercase tracking-widest mb-3">BMI</h3>
                      <BmiGauge weightKg={profile?.weight_kg} heightCm={profile?.height_cm} bmiValue={profile?.bmi_value} />
                    </div>
                    {profile?.body_fat_pct && (
                      <div>
                        <h3 className="text-xs font-bold text-dim uppercase tracking-widest mb-3">Body Fat %</h3>
                        <KfaGauge kfa={profile.body_fat_pct} gender={profile?.gender} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category tiles */}
              <div className="p-6">
                <p className="text-xs font-bold text-dim uppercase tracking-widest mb-4">Health & Lab Data</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BODY_DATA_CATEGORIES.map(cat => {
                    const filled = filledCount(cat)
                    const total = cat.fields.length
                    const hasSome = filled > 0
                    return (
                      <button key={cat.id} onClick={() => setOpenCategoryId(cat.id)}
                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:shadow-sm group ${
                          hasSome
                            ? 'border-border bg-surface hover:border-red-200 hover:bg-red-50/30'
                            : 'border-dashed border-border hover:border-red-200 hover:bg-red-50/20'
                        }`}>
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className="text-xl">{cat.emoji}</span>
                          {hasSome
                            ? <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5">{filled}/{total}</span>
                            : <span className="text-[10px] text-dim">+ Add</span>
                          }
                        </div>
                        <p className="text-xs font-semibold text-dark group-hover:text-accent leading-snug">{cat.title}</p>
                        <p className="text-[10px] text-dim mt-0.5 leading-snug">{cat.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )
      })()}

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
    </div>
  )
}