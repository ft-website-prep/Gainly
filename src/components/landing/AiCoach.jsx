import { LANDING } from '../../lib/content'

export default function AiCoach() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-surface" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <span className="text-sky-500 text-xs font-bold tracking-widest uppercase">
              {LANDING.coach.tag}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-dark leading-tight mt-4 mb-6">
              {LANDING.coach.title}
            </h2>
            <p className="text-muted text-lg leading-relaxed mb-8">
              {LANDING.coach.description}
            </p>
            <div className="space-y-3">
              {LANDING.coach.highlights.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  </div>
                  <span className="text-dark/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock Chat */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
            {/* Chat header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">G</span>
              </div>
              <div>
                <div className="text-dark font-bold text-sm">Gainly Coach</div>
                <div className="text-sky-500 text-xs">Online</div>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="bg-sky-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                  I can hold a tuck planche for 15 seconds now. What's next?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-surface text-dark/80 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[80%]">
                  That's solid progress! 💪 At 15s tuck hold, you're ready to start working on the Advanced Tuck. Start with 3×5s holds and focus on extending your hips slightly. I've added it to your skill tree.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-sky-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                  Can you build me a workout for that?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}