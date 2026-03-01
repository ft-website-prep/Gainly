import { LANDING } from '../../lib/content'

export default function Footer() {
  return (
    <footer className="relative py-12 overflow-hidden">
      <div className="absolute inset-0 bg-light" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center font-black text-white text-xs">
              G
            </div>
            <span className="text-dark font-bold">{LANDING.footer.brand}</span>
            <span className="text-dim">·</span>
            <span className="text-dim text-sm">{LANDING.footer.tagline}</span>
          </div>
          <div className="text-dim text-sm">
            {LANDING.footer.copy}
          </div>
        </div>
      </div>
    </footer>
  )
}