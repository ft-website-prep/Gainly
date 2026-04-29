import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ─── Inline Q&A ──────────────────────────────────────────────────────────────
function AskCoach({ study, metric }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const handleAsk = async () => {
    if (!question.trim() || loading) return
    setLoading(true)
    setAnswer(null)

    const context = `The user is asking about the health metric "${metric.label}" and a related study titled "${study.study_title}" (${study.year}).
Study abstract: ${study.abstract}
User question: ${question}`

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: context,
          category_hint: 'health',
        }),
      }
    )
    const data = await res.json()
    setAnswer(data.reply || data.response || data.message || 'No answer received.')
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">🤖 Ask the Coach</p>
      <p className="text-xs text-muted">Have a question about this metric or study? Ask directly.</p>

      {answer && (
        <div className="bg-white border border-border rounded-xl px-4 py-3 text-sm text-dark leading-relaxed">
          {answer}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`e.g. "What should I do if my ${metric.label} is too high?"`}
          className="flex-1 bg-white border border-border rounded-xl px-3 py-2 text-sm text-dark focus:outline-none focus:border-accent placeholder:text-dim"
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || loading}
          className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function MetricDetailPanel({ metric, categoryTitle, categoryEmoji, onClose }) {
  const [study, setStudy] = useState(null)
  const [loadingStudy, setLoadingStudy] = useState(true)
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [abstractExpanded, setAbstractExpanded] = useState(false)
  const [showAsk, setShowAsk] = useState(false)

  useEffect(() => {
    const fetchStudy = async () => {
      setLoadingStudy(true)
      const { data } = await supabase
        .from('metric_studies')
        .select('*')
        .eq('metric_key', metric.key)
        .limit(1)
        .maybeSingle()
      setStudy(data || null)
      if (data?.summary) setSummary(data.summary)
      setLoadingStudy(false)
    }
    fetchStudy()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [metric.key])

  const handleLoadSummary = async () => {
    if (!study || loadingSummary) return
    setLoadingSummary(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-study`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ study_id: study.id }),
      }
    )
    const data = await res.json()
    if (data.summary) setSummary(data.summary)
    setLoadingSummary(false)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-light flex flex-col">

      {/* ── Top bar ── */}
      <div className="h-[64px] bg-white border-b border-border flex items-center gap-4 px-6 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <span>{categoryEmoji}</span>
          <span>{categoryTitle}</span>
          <span className="text-dim">›</span>
          <span className="text-dark font-semibold">{metric.label}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Title */}
          <div>
            <h1 className="text-2xl font-black text-dark">
              {metric.label}
              {metric.unit && <span className="text-base font-normal text-dim ml-2">({metric.unit})</span>}
            </h1>
          </div>

          {/* Description */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">What does this value mean?</p>
            <p className="text-sm text-dark leading-relaxed">{metric.description}</p>
          </div>

          {/* Study */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">📚 Research Basis</p>

            {loadingStudy ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-light rounded w-3/4" />
                <div className="h-3 bg-light rounded w-1/2" />
              </div>
            ) : !study ? (
              <p className="text-sm text-dim">No study linked yet.</p>
            ) : (
              <>
                {/* Metadata */}
                <div>
                  <p className="text-sm font-semibold text-dark leading-snug">{study.study_title}</p>
                  <p className="text-xs text-muted mt-1">
                    {study.authors} · {study.year} · <span className="italic">{study.journal}</span>
                  </p>
                </div>

                {/* Plain language summary */}
                {summary ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 mb-2">✨ Plain Language Summary</p>
                    <p className="text-sm text-dark leading-relaxed">{summary}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleLoadSummary}
                    disabled={loadingSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted hover:text-dark hover:border-muted transition-all disabled:opacity-40"
                  >
                    <span>✨</span>
                    <span>{loadingSummary ? 'Generating summary…' : 'Explain this study in plain language'}</span>
                  </button>
                )}

                {/* Full abstract (collapsible) */}
                <div>
                  <button
                    onClick={() => setAbstractExpanded(v => !v)}
                    className="text-xs text-muted hover:text-dark transition-colors flex items-center gap-1"
                  >
                    <span>{abstractExpanded ? '▾' : '▸'}</span>
                    <span>{abstractExpanded ? 'Hide full abstract' : 'Read full abstract'}</span>
                  </button>
                  {abstractExpanded && (
                    <p className="text-xs text-muted leading-relaxed mt-2 border-t border-border pt-3">
                      {study.abstract}
                    </p>
                  )}
                </div>

                {/* DOI + Ask */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  {study.doi ? (
                    <a
                      href={`https://doi.org/${study.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      <span>↗</span>
                      <span>Open original study</span>
                    </a>
                  ) : <div />}
                  <button
                    onClick={() => setShowAsk(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-dark transition-colors"
                  >
                    <span>🤖</span>
                    <span>{showAsk ? 'Hide' : 'Ask Coach'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Inline Q&A */}
          {showAsk && study && (
            <AskCoach study={study} metric={metric} />
          )}

        </div>
      </div>
    </div>
  )
}
