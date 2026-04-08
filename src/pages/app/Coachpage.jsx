import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DISCLAIMER_KEY = 'gainly_coach_disclaimer_seen'
const COACH_NAME_KEY = 'gainly_coach_name'

// --- Markdown renderer (no external lib) ---
function renderMarkdown(text) {
  const boldParts = (str) => {
    const parts = str.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
    )
  }

  const lines = text.split('\n')
  const elements = []
  let listItems = []
  let listType = null

  const flushList = (key) => {
    if (!listItems.length) return
    if (listType === 'ol') {
      elements.push(
        <ol key={`ol-${key}`} className="list-decimal ml-5 space-y-0.5 my-1">
          {listItems}
        </ol>
      )
    } else {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc ml-5 space-y-0.5 my-1">
          {listItems}
        </ul>
      )
    }
    listItems = []
    listType = null
  }

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^[-•]\s(.*)/)
    const numberedMatch = line.match(/^\d+\.\s(.*)/)
    const headingMatch = line.match(/^###?\s(.*)/)

    if (bulletMatch) {
      if (listType === 'ol') flushList(i)
      listType = 'ul'
      listItems.push(<li key={i}>{boldParts(bulletMatch[1])}</li>)
    } else if (numberedMatch) {
      if (listType === 'ul') flushList(i)
      listType = 'ol'
      listItems.push(<li key={i}>{boldParts(numberedMatch[1])}</li>)
    } else if (headingMatch) {
      flushList(i)
      elements.push(
        <p key={i} className="font-bold text-dark mt-2 mb-0.5">{boldParts(headingMatch[1])}</p>
      )
    } else if (!line.trim()) {
      flushList(i)
      elements.push(<br key={i} />)
    } else {
      flushList(i)
      elements.push(<p key={i}>{boldParts(line)}</p>)
    }
  })

  flushList('final')
  return elements
}

// --- Off-topic detection ---
const OFF_TOPIC_PREFIX = '[OFF_TOPIC]'

function parseMessage(content) {
  if (content.startsWith(OFF_TOPIC_PREFIX)) {
    return { isOffTopic: true, text: content.slice(OFF_TOPIC_PREFIX.length) }
  }
  return { isOffTopic: false, text: content }
}

// --- Suggestion cards config ---
const SUGGESTIONS = [
  {
    icon: '🗓️',
    label: 'Plan my workout',
    prompt: 'Can you plan a workout for me today based on my level and equipment?',
  },
  {
    icon: '📊',
    label: 'Analyze my progress',
    prompt: 'How am I progressing based on my recent workouts? What should I focus on?',
  },
  {
    icon: '🥗',
    label: 'Nutrition advice',
    prompt: 'What should I eat before and after training to maximize my results?',
  },
  {
    icon: '💪',
    label: 'Technique help',
    prompt: 'Can you explain the proper form and common mistakes for pull-ups?',
  },
]

// --- Disclaimer Modal ---
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
                ['🥗', 'Nutrition guidance for athletes'],
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

// --- Message bubble ---
function MessageBubble({ msg }) {
  const { isOffTopic, text } = parseMessage(msg.content)

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-none px-4 py-2.5 text-sm leading-relaxed bg-accent text-white">
          {text}
        </div>
      </div>
    )
  }

  if (isOffTopic) {
    return (
      <div className="flex justify-start items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          ⚠️
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-bl-none px-4 py-2.5 text-sm leading-relaxed bg-amber-50 border border-amber-200 text-amber-800">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
        🤖
      </div>
      <div className="max-w-[75%] rounded-2xl rounded-bl-none px-4 py-2.5 text-sm leading-relaxed bg-light text-dark space-y-0.5">
        {renderMarkdown(text)}
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

  const [showInfo, setShowInfo] = useState(false)
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
    e?.preventDefault()
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

  function handleSuggestion(prompt) {
    setInput(prompt)
    // auto-send
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: prompt }])
    setLoading(true)

    supabase.functions.invoke('ai-chat', {
      body: { message: prompt, conversation_id: conversationId },
    }).then(({ data, error: fnError }) => {
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      setConversationId(data.conversation_id)
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    }).catch(err => {
      setError(err.message || 'Something went wrong.')
      setMessages(prev => prev.slice(0, -1))
    }).finally(() => {
      setLoading(false)
      setInput('')
    })
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
          <p className="text-muted mt-1">Your personal training assistant — fitness & health only</p>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white border border-border rounded-xl flex flex-col overflow-hidden min-h-0 relative">

          {/* Info button + disclaimer popover */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setShowInfo(v => !v)}
              title="AI disclaimer"
              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${
                showInfo ? 'bg-surface border-muted text-dark' : 'border-border text-dim hover:text-muted hover:border-muted'
              }`}
            >
              i
            </button>
            {showInfo && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-xl shadow-xl p-3 text-xs text-dim leading-relaxed">
                <strong className="font-medium text-muted">{coachName}</strong> is an AI assistant focused exclusively
                on fitness, training, and health. Not a licensed doctor — always consult a professional for medical concerns.
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="text-5xl">🤖</div>
                <div className="text-center">
                  <p className="font-bold text-dark text-lg">{coachName}</p>
                  <p className="text-muted text-sm mt-1">
                    Specialized in fitness, gym, calisthenics & health.<br />
                    Off-topic questions will be blocked.
                  </p>
                </div>

                {/* Suggestion Cards */}
                <div className="mt-2 grid grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => handleSuggestion(s.prompt)}
                      disabled={loading}
                      className="flex items-start gap-2.5 text-left bg-light hover:bg-accent-soft hover:border-accent/30 border border-border rounded-xl p-3 transition-colors group disabled:opacity-40"
                    >
                      <span className="text-xl leading-none mt-0.5">{s.icon}</span>
                      <span className="text-xs font-semibold text-dark group-hover:text-accent leading-snug">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
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
