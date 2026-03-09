import { LANDING } from '../../lib/content'

export default function Leagues() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-light" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <span className="text-red-500 text-xs font-bold tracking-widest uppercase">
          {LANDING.leagues.tag}
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-dark leading-tight mt-4 mb-4">
          {LANDING.leagues.title}
        </h2>
        <p className="text-muted text-lg mb-16 max-w-xl mx-auto">
          {LANDING.leagues.description}
        </p>

        {/* Tiers */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {LANDING.leagues.tiers.map((tier, index) => (
            <div key={index} className="relative group w-full sm:w-auto">
              <div
                className={`
                  relative bg-white border rounded-2xl px-6 py-5
                  hover:shadow-lg transition-all duration-300
                  ${index === 4
                    ? 'border-red-300 bg-red-50 hover:shadow-red-100/50'
                    : 'border-border hover:border-red-200 hover:shadow-sky-50/50'
                  }
                `}
              >
                <div className="text-3xl mb-2">{tier.emoji}</div>
                <div className={`font-bold text-sm ${index === 4 ? 'text-red-600' : 'text-dark'}`}>
                  {tier.name}
                </div>
                <div className="text-xs text-dim mt-1">{tier.xp}</div>
              </div>
              {index < 4 && (
                <div className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-dim z-10">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}