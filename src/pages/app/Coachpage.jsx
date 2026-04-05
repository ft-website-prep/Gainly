import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DISCLAIMER_KEY = 'gainly_coach_disclaimer_seen'
const COACH_NAME_KEY = 'gainly_coach_name'

function DisclaimerModal({ coachName, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-white font-black text-lg">Welcome to {coachName}</h2>
              <p className="text-red-100 text-xs mt-0.5">Your AI training assistant</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-dark mb-2">What can {coachName} do?</p>
            <ul className="space-y-1.5">
              {[
                ['💪', 'Training recommendations & program planning'],
                ['📈', 'Progress analysis & progression advice'],
                ['🧘', 'Technique tips & exercise guidance'],
                ['🥗', 'General nutrition pointers'],
                ['🔥', 'Motivation & workout ideas'],
              ].map(([icon, text]) => (
                <li key={text} className="text-xs text-muted flex items-start gap-2">
                  <span className="flex-shrink-0">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 mb-1.5">⚠️ Important Notice</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              {coachName} is an AI language model and <strong>not a medical professional</strong>.
              Any statements about injuries, pain, or health conditions are <strong>not medical diagnoses</strong> and
              do not replace a visit to a doctor. For health concerns, always consult a qualified
              physician or physiotherapist.
            </p>
          </div>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors"
          >
            Got it – Let's go!
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoachPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [error, setError] = useState(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const bottomRef = useRef(null)

  const coachName = localStorage.getItem(COACH_NAME_KEY) || 'Gainly Coach'

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setShowDisclaimer(true)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleDisclaimerClose() {
    localStorage.setItem(DISCLAIMER_KEY, '1')
    setShowDisclaimer(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body: { message: text, conversation_id: conversationId },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      setConversationId(data.conversation_id)
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  return (
    <>
      {showDisclaimer && (
        <DisclaimerModal coachName={coachName} onClose={handleDisclaimerClose} />
      )}

      <div className="max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
        {/* Header */}
        <div className="mb-5 flex-shrink-0">
          <h1 className="text-3xl font-black text-dark">{coachName}</h1>
          <p className="text-muted mt-1">Your personal training assistant</p>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white border border-border rounded-xl flex flex-col overflow-hidden min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <div className="text-5xl">🤖</div>
                <p className="font-bold text-dark text-lg">{coachName}</p>
                <p className="text-muted text-sm">Ask me anything about your training, form, or programming.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    'What should I train today?',
                    'How do I progress on pull-ups?',
                    'Best warm-up for leg day?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs bg-light text-muted px-3 py-1.5 rounded-full hover:bg-accent-soft hover:text-accent transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0">
                    🤖
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-none'
                    : 'bg-light text-dark rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="bg-light rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-4 mb-2 px-4 py-2 text-sm text-accent bg-accent-soft rounded-lg border border-accent/20">
              {error}
            </div>
          )}

          {/* AI disclaimer reminder */}
          <div className="mx-4 mb-2 px-3 py-2 flex items-start gap-2 bg-light rounded-lg border border-border">
            <span className="text-dim text-sm flex-shrink-0 mt-px">ℹ️</span>
            <p className="text-xs text-dim leading-relaxed">
              {coachName} is an AI assistant, not a licensed doctor. Responses about injuries or health conditions
              are <strong className="font-medium text-muted">not medical advice</strong> — always consult a professional for health concerns.
            </p>
          </div>

          {/* Input bar */}
          <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3 flex-shrink-0">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${coachName}… (Enter to send)`}
              disabled={loading}
              className="flex-1 bg-light rounded-xl px-4 py-2.5 text-sm text-dark placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 resize-none leading-relaxed"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-accent text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
