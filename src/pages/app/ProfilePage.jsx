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
// ACTIVITY CALENDAR (with weekday + month labels)
// =============================================
function ActivityCalendar({ workoutDates, days = 84 }) {
  const allDays = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    allDays.push({ date: d.toISOString().split('T')[0], count: workoutDates.filter(wd => wd === d.toISOString().split('T')[0]).length, month: d.getMonth() })
  }
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))
  const monthLabels = []; let lastM = -1
  weeks.forEach((w, wi) => { const m = w[0].month; if (m !== lastM) { monthLabels.push({ idx: wi, label: new Date(2024, m).toLocaleString('en', { month: 'short' }) }); lastM = m } })
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0">
        <div className="flex flex-col gap-[3px] mr-2 mt-5">
          {dayLabels.map((l, i) => <div key={i} className="h-[13px] text-[9px] text-dim leading-[13px]">{l}</div>)}
        </div>
        <div>
          <div className="flex gap-[3px] mb-1">
            {weeks.map((_, wi) => { const ml = monthLabels.find(m => m.idx === wi); return <div key={wi} className="w-[13px] text-center"><span className="text-[8px] text-dim">{ml?.label || ''}</span></div> })}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div key={di} title={`${day.date} – ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                    className={`w-[13px] h-[13px] rounded-sm ${day.count >= 2 ? 'bg-red-500' : day.count === 1 ? 'bg-sky-300' : 'bg-gray-100'}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[9px] text-dim">Less</span>
        <div className="w-[9px] h-[9px] rounded-sm bg-gray-100" /><div className="w-[9px] h-[9px] rounded-sm bg-sky-300" /><div className="w-[9px] h-[9px] rounded-sm bg-red-500" />
        <span className="text-[9px] text-dim">More</span>
      </div>
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

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [bioPublic, setBioPublic] = useState(false)

  // Stats
  const [statsRange, setStatsRange] = useState(30)
  const [calendarRange, setCalendarRange] = useState(84)
  const [workoutDates, setWorkoutDates] = useState([])
  const [workoutCount, setWorkoutCount] = useState(0)
  const [achievementCount, setAchievementCount] = useState(0)
  const [xpData, setXpData] = useState([])
  const [workoutData, setWorkoutData] = useState([])
  const [muscleData, setMuscleData] = useState([])
  const [timeline, setTimeline] = useState([])
  const [weightHistory, setWeightHistory] = useState([])

  useEffect(() => { if (user) { loadProfile(); loadTimeline(); loadWeightHistory() } }, [user])
  useEffect(() => { if (user) loadStats() }, [user, statsRange])
  useEffect(() => { if (user) loadCalendar() }, [user, calendarRange])

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) { setProfile(data); setUsername(data.username || ''); setAvatarUrl(data.avatar_url || ''); setBio(data.bio || ''); setBioPublic(data.bio_public ?? false); if (!data.username) setEditMode(true) }
    setLoading(false)
  }

  const loadCalendar = async () => {
    const { data } = await supabase.from('workout_logs').select('started_at').eq('user_id', user.id).gte('started_at', new Date(Date.now() - calendarRange * 86400000).toISOString())
    setWorkoutDates((data || []).map(l => l.started_at?.split('T')[0]).filter(Boolean))
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
        <div className="space-y-6">
          {/* Personal Info + Body Data */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-dark">Personal Info</h2>
              {!editMode && profile?.username && <button onClick={() => setEditMode(true)} className="text-red-500 hover:text-red-600 text-sm font-medium">Edit</button>}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div><label className="block text-sm text-muted mb-2">Avatar URL</label><div className="flex gap-3 items-center"><div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center text-3xl overflow-hidden border-2 border-border flex-shrink-0">{avatarUrl ? <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" /> : '👤'}</div><input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /></div></div>
                <div><label className="block text-sm text-muted mb-2">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="fitnessbeast42" className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400" /><p className="text-xs text-dim mt-1">3-20 chars, letters, numbers and _</p></div>
                <div><label className="block text-sm text-muted mb-2">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Your fitness journey..." className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:border-red-400 resize-none" /><label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={bioPublic} onChange={e => setBioPublic(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-xs text-muted">Show publicly in Community</span></label></div>
                <div className="flex gap-3">
                  {profile?.username && <button onClick={() => { setEditMode(false); setUsername(profile.username || ''); setAvatarUrl(profile.avatar_url || ''); setBio(profile.bio || '') }} className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium">Cancel</button>}
                  <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-5 mb-6">
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
                {/* Body Data */}
                <div className="border-t border-border pt-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-dark">Body Data</h3><button onClick={() => setShowBodyModal(true)} className="text-red-500 text-xs font-medium">Edit</button></div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { l: 'Weight', v: profile?.weight_kg ? `${profile.weight_kg} kg` : '—' },
                      { l: 'Height', v: profile?.height_cm ? `${profile.height_cm} cm` : '—' },
                      { l: 'Age', v: calcAge(profile?.birth_date) ? `${calcAge(profile.birth_date)}y` : '—' },
                      { l: 'BMI', v: profile?.bmi_value || (profile?.weight_kg && profile?.height_cm ? (profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1) : '—') },
                      { l: 'Body Fat', v: profile?.body_fat_pct ? `${profile.body_fat_pct}%` : '—' },
                    ].map((d, i) => (
                      <div key={i} className="bg-surface rounded-xl p-3 text-center"><div className="text-base font-bold text-dark">{d.v}</div><div className="text-[10px] text-dim mt-0.5">{d.l}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Calendar */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-dark">Activity Calendar</h2>
              <div className="flex gap-1 bg-surface rounded-lg p-0.5">
                {[{ l: '3M', d: 84 }, { l: '6M', d: 168 }, { l: '1Y', d: 365 }].map(p => (
                  <button key={p.d} onClick={() => setCalendarRange(p.d)} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${calendarRange === p.d ? 'bg-white text-dark shadow-sm' : 'text-muted'}`}>{p.l}</button>
                ))}
              </div>
            </div>
            <ActivityCalendar workoutDates={workoutDates} days={calendarRange} />
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