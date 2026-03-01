import { Link } from 'react-router-dom'
import { LANDING } from '../../lib/content'

export default function CallToAction() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-surface" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-100/60 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black text-dark leading-tight mb-6">
          {LANDING.cta.title}
        </h2>
        <p className="text-muted text-lg mb-10">
          {LANDING.cta.subtitle}
        </p>
        <Link
          to="/register"
          className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-bold text-lg px-10 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-sky-500/20"
        >
          {LANDING.cta.button}
        </Link>
      </div>
    </section>
  )
}