import { LANDING } from '../../lib/content'

export default function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-light" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Tag */}
        <div className="text-center mb-16">
          <span className="text-red-500 text-xs font-bold tracking-widest uppercase">
            {LANDING.features.tag}
          </span>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {LANDING.features.items.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white border border-border rounded-2xl p-8 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/50 transition-all duration-300"
            >
              <div className="text-5xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-dark mb-3">{feature.title}</h3>
              <p className="text-muted leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}