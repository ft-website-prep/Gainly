import { Link } from 'react-router-dom'
import { LANDING } from '../../lib/content'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-light" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24">
        {/* Tag */}
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold tracking-widest px-4 py-2 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          {LANDING.hero.tag}
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-dark leading-[0.9] tracking-tight mb-6">
          Train.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-sky-400">
            Compete.
          </span>{' '}
          Rise.
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-10">
          {LANDING.hero.subtitle}
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-red-500 hover:bg-red-400 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-sky-500/20"
          >
            {LANDING.hero.cta}
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto text-muted hover:text-dark font-medium text-lg px-8 py-4 rounded-xl border border-border hover:border-dark/20 transition-all"
          >
            {LANDING.hero.ctaSecondary}
          </a>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-16 pt-8 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-black text-dark">5</div>
            <div className="text-xs text-dim uppercase tracking-wider">Leagues</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-black text-dark">100+</div>
            <div className="text-xs text-dim uppercase tracking-wider">Exercises</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-black text-dark">24/7</div>
            <div className="text-xs text-dim uppercase tracking-wider">AI Coach</div>
          </div>
        </div>
      </div>
    </section>
  )
}