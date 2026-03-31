import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function CoachPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    <div className="max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Header */}
      <div className="mb-5 flex-shrink-0">
        <h1 className="text-3xl font-black text-dark">AI Coach</h1>
        <p className="text-muted mt-1">Your personal training assistant</p>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white border border-border rounded-xl flex flex-col overflow-hidden min-h-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <div className="text-5xl">🤖</div>
              <p className="font-bold text-dark text-lg">Gainly Coach</p>
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

        {/* Input bar */}
        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3 flex-shrink-0">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach… (Enter to send)"
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
  )
}
