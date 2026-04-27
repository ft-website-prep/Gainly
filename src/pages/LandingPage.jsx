import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import gainlyLogo from '../../logo_aligned_app_ready.png'
import './LandingPage.css'

const navItems = [
  { href: '#features', label: 'Features', id: 'features' },
  { href: '#coach', label: 'AI Coach', id: 'coach' },
  { href: '#leagues', label: 'Leagues', id: 'leagues' },
  { href: '#community', label: 'Community', id: 'community' },
]

const featureItems = [
  {
    icon: '\u26A1',
    title: 'Skill Trees',
    desc: 'Visual progression paths from beginner to advanced. See exactly what to train next.',
  },
  {
    icon: '\u{1F465}',
    title: 'Community & Crews',
    desc: 'Build your squad, challenge friends, share progress.',
  },
  {
    icon: '\u{1F3C6}',
    title: 'Gamified Progress',
    desc: 'Earn XP for every workout. Unlock achievements and climb leagues.',
  },
]

const leagues = [
  { name: 'Rookie', emoji: '\u{1F331}', xp: '0 XP' },
  { name: 'Grinder', emoji: '\u2699\uFE0F', xp: '1K XP' },
  { name: 'Athlete', emoji: '\u{1F4AA}', xp: '5K XP' },
  { name: 'Beast', emoji: '\u{1F525}', xp: '15K XP' },
  { name: 'Legend', emoji: '\u{1F451}', xp: '50K XP' },
]

const methods = ['EMOM', 'Pyramid', 'Tabata', 'AMRAP', 'Death By...', 'Grease the Groove']
const LANDING_ZOOM_STORAGE_KEY = 'gainly:landing-zoom'


export default function LandingPage() {
  const { user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [heroWordIndex, setHeroWordIndex] = useState(0)
  const [landingZoom, setLandingZoom] = useState(1)
  const [landingContentHeight, setLandingContentHeight] = useState('auto')
  const landingPageRef = useRef(null)
  const zoomFrameRef = useRef(null)
  const zoomShellRef = useRef(null)
  const navScrollAnimationRef = useRef(0)
  const wheelScrollAnimationRef = useRef(0)
  const smoothScrollCurrentRef = useRef(0)
  const smoothScrollTargetRef = useRef(0)
  const zoomTargetRef = useRef(1)
  const zoomAnimationRef = useRef(0)
  const hasLoadedStoredZoomRef = useRef(false)

  const clampZoom = (value) => Math.min(1.08, Math.max(0.84, value))
  const landingShellWidth = landingZoom < 1 ? `${100 / landingZoom}%` : '100%'

  const animateScrollTo = (targetY, onComplete) => {
    if (navScrollAnimationRef.current) {
      window.cancelAnimationFrame(navScrollAnimationRef.current)
    }
    if (wheelScrollAnimationRef.current) {
      window.cancelAnimationFrame(wheelScrollAnimationRef.current)
      wheelScrollAnimationRef.current = 0
    }

    const startY = window.scrollY
    const distance = targetY - startY
    const duration = 700
    let startTime = null
    smoothScrollTargetRef.current = targetY
    smoothScrollCurrentRef.current = startY

    const easeInOutCubic = (progress) => {
      if (progress < 0.5) {
        return 4 * progress * progress * progress
      }
      return 1 - Math.pow(-2 * progress + 2, 3) / 2
    }

    const step = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp
      }

      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeInOutCubic(progress)

      window.scrollTo(0, startY + distance * easedProgress)
      smoothScrollCurrentRef.current = startY + distance * easedProgress

      if (progress < 1) {
        navScrollAnimationRef.current = window.requestAnimationFrame(step)
      } else {
        navScrollAnimationRef.current = 0
        smoothScrollCurrentRef.current = targetY
        if (onComplete) {
          onComplete()
        }
      }
    }

    navScrollAnimationRef.current = window.requestAnimationFrame(step)
  }

  const handleNavClick = (event, item) => {
    event.preventDefault()

    const section = document.getElementById(item.id)
    if (!section) return

    const navOffset = 104
    const top = section.getBoundingClientRect().top + window.scrollY - navOffset

    setActiveSection(item.id)
    setMobileMenuOpen(false)
    animateScrollTo(top, () => {
      window.history.replaceState(null, '', item.href)
    })
  }

  const handleLogoClick = (event) => {
    event.preventDefault()
    setActiveSection('features')
    setMobileMenuOpen(false)
    animateScrollTo(0, () => {
      window.history.replaceState(null, '', '/')
    })
  }

  useEffect(() => {
    const onScroll = () => {
      if (!wheelScrollAnimationRef.current) {
        smoothScrollCurrentRef.current = window.scrollY
        smoothScrollTargetRef.current = window.scrollY
      }

      setIsScrolled(window.scrollY > 18)
      if (window.scrollY < 260) {
        setActiveSection('features')
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'))
    let rafId = 0

    const revealVisibleNodes = () => {
      revealNodes.forEach((node) => {
        const rect = node.getBoundingClientRect()
        if (rect.top <= window.innerHeight * 0.88) {
          node.classList.add('is-visible')
        }
      })
      rafId = 0
    }

    const queueRevealCheck = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(revealVisibleNodes)
    }

    revealVisibleNodes()
    window.addEventListener('scroll', queueRevealCheck, { passive: true })
    window.addEventListener('resize', queueRevealCheck)

    const sectionNodes = document.querySelectorAll('section[id]')
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        threshold: 0.45,
        rootMargin: '-20% 0px -35% 0px',
      },
    )

    sectionNodes.forEach((node) => sectionObserver.observe(node))

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', queueRevealCheck)
      window.removeEventListener('resize', queueRevealCheck)
      sectionObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroWordIndex((index) => (index + 1) % 2)
    }, 2800)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || window.innerWidth < 768) return

    const animateSmoothWheelScroll = () => {
      const maxScrollY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
      const clampedTarget = Math.min(maxScrollY, Math.max(0, smoothScrollTargetRef.current))
      smoothScrollTargetRef.current = clampedTarget

      const nextY = smoothScrollCurrentRef.current + (clampedTarget - smoothScrollCurrentRef.current) * 0.085
      smoothScrollCurrentRef.current = nextY

      if (Math.abs(clampedTarget - smoothScrollCurrentRef.current) < 0.25) {
        smoothScrollCurrentRef.current = clampedTarget
        window.scrollTo(0, clampedTarget)
        wheelScrollAnimationRef.current = 0
        return
      }

      window.scrollTo(0, nextY)
      wheelScrollAnimationRef.current = window.requestAnimationFrame(animateSmoothWheelScroll)
    }

    const handleWheelScroll = (event) => {
      if (event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey) return
      if (!landingPageRef.current?.contains(event.target)) return
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return

      event.preventDefault()

      const deltaMultiplier = event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? window.innerHeight : 1
      const clampedDelta = Math.max(-160, Math.min(160, event.deltaY * deltaMultiplier))
      const maxScrollY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)

      if (!wheelScrollAnimationRef.current) {
        smoothScrollCurrentRef.current = window.scrollY
        smoothScrollTargetRef.current = window.scrollY
      }

      smoothScrollTargetRef.current = Math.min(maxScrollY, Math.max(0, smoothScrollTargetRef.current + clampedDelta * 1.1))
      if (!wheelScrollAnimationRef.current) {
        wheelScrollAnimationRef.current = window.requestAnimationFrame(animateSmoothWheelScroll)
      }
    }

    smoothScrollCurrentRef.current = window.scrollY
    smoothScrollTargetRef.current = window.scrollY
    window.addEventListener('wheel', handleWheelScroll, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheelScroll)
      if (wheelScrollAnimationRef.current) {
        window.cancelAnimationFrame(wheelScrollAnimationRef.current)
        wheelScrollAnimationRef.current = 0
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (navScrollAnimationRef.current) {
        window.cancelAnimationFrame(navScrollAnimationRef.current)
      }
      if (wheelScrollAnimationRef.current) {
        window.cancelAnimationFrame(wheelScrollAnimationRef.current)
      }
      if (zoomAnimationRef.current) {
        window.cancelAnimationFrame(zoomAnimationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedZoom = window.localStorage.getItem(LANDING_ZOOM_STORAGE_KEY)
    if (!storedZoom) {
      hasLoadedStoredZoomRef.current = true
      return
    }

    const parsedZoom = Number.parseFloat(storedZoom)
    if (Number.isNaN(parsedZoom)) {
      window.localStorage.removeItem(LANDING_ZOOM_STORAGE_KEY)
      hasLoadedStoredZoomRef.current = true
      return
    }

    const nextZoom = clampZoom(parsedZoom)
    zoomTargetRef.current = nextZoom
    setLandingZoom(nextZoom)
    hasLoadedStoredZoomRef.current = true
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedStoredZoomRef.current) return
    window.localStorage.setItem(LANDING_ZOOM_STORAGE_KEY, String(landingZoom))
  }, [landingZoom])

  useEffect(() => {
    const minZoom = 0.84
    const maxZoom = 1.08

    const animateZoom = () => {
      setLandingZoom((currentZoom) => {
        const nextZoom = currentZoom + (zoomTargetRef.current - currentZoom) * 0.18

        if (Math.abs(zoomTargetRef.current - nextZoom) < 0.0015) {
          zoomAnimationRef.current = 0
          return zoomTargetRef.current
        }

        zoomAnimationRef.current = window.requestAnimationFrame(animateZoom)
        return nextZoom
      })
    }

    const handleWheelZoom = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (!landingPageRef.current?.contains(event.target)) return

      event.preventDefault()

      const nextTarget = zoomTargetRef.current - event.deltaY * 0.0009
      zoomTargetRef.current = Math.min(maxZoom, Math.max(minZoom, nextTarget))

      if (!zoomAnimationRef.current) {
        zoomAnimationRef.current = window.requestAnimationFrame(animateZoom)
      }
    }

    window.addEventListener('wheel', handleWheelZoom, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheelZoom)
      if (zoomAnimationRef.current) {
        window.cancelAnimationFrame(zoomAnimationRef.current)
        zoomAnimationRef.current = 0
      }
    }
  }, [])

  useEffect(() => {
    const syncZoomHeight = () => {
      if (!zoomShellRef.current) return
      setLandingContentHeight(`${zoomShellRef.current.scrollHeight * landingZoom}px`)
    }

    syncZoomHeight()

    const resizeObserver = new ResizeObserver(() => {
      syncZoomHeight()
    })

    if (zoomShellRef.current) {
      resizeObserver.observe(zoomShellRef.current)
    }

    window.addEventListener('resize', syncZoomHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncZoomHeight)
    }
  }, [landingZoom])

  return (
    <div
      ref={landingPageRef}
      className="landing-page min-h-screen bg-white relative overflow-hidden"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        '--landing-zoom': landingZoom,
        '--landing-content-height': landingContentHeight,
        '--landing-shell-width': landingShellWidth,
      }}
    >
      <div className="page-backdrop" aria-hidden="true" />

      <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 sm:px-6">
        <div className={`nav-shell max-w-6xl mx-auto ${isScrolled ? 'is-scrolled' : ''}`}>
          <div className="nav-inner">
            <Link to="/" className="nav-brand-link flex items-center gap-3" onClick={handleLogoClick}>
              <div className="landing-logo-badge" aria-hidden="true">
                <img src={gainlyLogo} alt="" className="landing-logo-image" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="nav-brand-text text-lg font-black tracking-tight text-gray-900">Gainly</span>
                <span className="nav-brand-chip">Beta</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1.5 nav-links-shell">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={`nav-link-pill ${activeSection === item.id ? 'is-active' : ''}`}
                  onClick={(event) => handleNavClick(event, item)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2.5">
              {user ? (
                <Link to="/app" className="nav-primary-btn">
                  Open App
                </Link>
              ) : (
                <>
                  <Link to="/login" className="nav-secondary-btn">
                    Login
                  </Link>
                  <Link to="/register" className="nav-primary-btn">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className={`mobile-nav-toggle md:hidden ${mobileMenuOpen ? 'is-open' : ''}`}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen mobile menu — outside nav so backdrop-filter doesn't break fixed positioning */}
      <div id="mobile-nav-panel" className={`mobile-nav-overlay md:hidden ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-nav-overlay-inner">
          <div className="mobile-nav-hero-links">
            {navItems.map((item, i) => (
              <a
                key={item.id}
                href={item.href}
                className={`mobile-nav-hero-link ${activeSection === item.id ? 'is-active' : ''}`}
                style={{ '--stagger': i }}
                onClick={(event) => handleNavClick(event, item)}
              >
                <span className="mobile-nav-hero-text">{item.label}</span>
                <span className="mobile-nav-hero-arrow" aria-hidden="true">&rarr;</span>
              </a>
            ))}
          </div>

          <div className="mobile-nav-overlay-actions" style={{ '--stagger': navItems.length }}>
            {user ? (
              <Link to="/app" className="mobile-nav-overlay-btn mobile-nav-overlay-btn-primary" onClick={() => setMobileMenuOpen(false)}>
                Open App
              </Link>
            ) : (
              <>
                <Link to="/register" className="mobile-nav-overlay-btn mobile-nav-overlay-btn-primary" onClick={() => setMobileMenuOpen(false)}>
                  Sign Up Free
                </Link>
                <Link to="/login" className="mobile-nav-overlay-btn mobile-nav-overlay-btn-ghost" onClick={() => setMobileMenuOpen(false)}>
                  Already have an account? Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={zoomFrameRef} className="landing-zoom-frame">
        <div ref={zoomShellRef} className="landing-zoom-shell">
      <section className="hero-section pt-36 pb-20 px-6">
        <div className="hero-grid-overlay" aria-hidden="true" />
        <div className="hero-spotlight" aria-hidden="true" />

        <div className="hero-content max-w-4xl mx-auto text-center">
          <div className="hero-kicker inline-flex items-center gap-2 border border-red-200 text-red-500 text-sm font-semibold px-5 py-2 rounded-full mb-8 bg-white/70 backdrop-blur-sm">
            FREE DURING BETA
          </div>

          <h1 className="hero-heading hero-title text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
            <span className="block">The Fitness Platform for</span>
            <span className="hero-word-line">
              <span className="word-scroll hero-word-slot">
                <span className="word-sizer" aria-hidden="true">Calisthenics</span>
                <span className={`word-item word-red word-cycle-a ${heroWordIndex === 0 ? 'is-active' : ''}`}>Calisthenics</span>
                <span className={`word-item word-blue word-cycle-b ${heroWordIndex === 1 ? 'is-active' : ''}`}>Lifting</span>
              </span>
            </span>
            <span className="block">Athletes.</span>
          </h1>

          <p className="hero-copy text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            Build routines, track your skills, compete with friends and level up with AI-powered coaching. All in one app.
          </p>

          <Link
            to="/register"
            className="hero-cta inline-block bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:-translate-y-[2px] mb-12"
          >
            Get Started Free
          </Link>

          <div className="hero-proof flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['from-red-400 to-red-500', 'from-gray-400 to-gray-500', 'from-red-300 to-red-400', 'from-gray-500 to-gray-600', 'from-red-500 to-red-600'].map((bg, i) => (
                <div key={i} className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-500">
              Join <strong className="text-gray-900">500+</strong> early athletes
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="reveal-fade-up text-center mb-16">
            <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Features</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">Everything you need to level up</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featureItems.map((feature, i) => (
              <div
                key={feature.title}
                data-reveal
                className="reveal-fade-up feature-surface bg-white rounded-2xl p-8 border border-gray-100 transform-gpu will-change-transform hover:border-red-200 hover:shadow-lg hover:-translate-y-1 transition-[transform,border-color,box-shadow] duration-300"
                style={{ '--reveal-delay': `${80 + i * 90}ms` }}
              >
                <div className="text-4xl mb-5">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coach" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div data-reveal className="reveal-fade-up">
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase">
                AI-Powered
              </span>

              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-6">
                Your personal AI Coach
              </h2>

              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Get workout suggestions based on your level, ask questions about form
                and technique, and let AI build custom routines tailored to your goals.
              </p>

              <div className="space-y-3">
                {[
                  'Personalized workout plans',
                  'Form and technique advice',
                  'Skill progression guidance',
                  'Adapts to your level',
                ].map((item, i) => (
                  <div key={item} className="flex items-center gap-3" style={{ transitionDelay: `${i * 40}ms` }}>
                    <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                    </div>

                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="reveal-fade-up coach-surface bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4" style={{ '--reveal-delay': '140ms' }}>
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="landing-logo-badge landing-logo-badge-compact" aria-hidden="true">
                  <img src={gainlyLogo} alt="" className="landing-logo-image" />
                </div>

                <div>
                  <div className="text-gray-900 font-bold text-sm">
                    Gainly Coach
                  </div>

                  <div className="text-red-500 text-xs">
                    Online
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-red-50 text-gray-700 rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                    I held a tuck planche for 15 seconds!
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-600 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[80%]">
                    Great! Time for Advanced Tuck. Start with 3x5s holds.
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-red-50 text-gray-700 rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                    Build me a workout for that?
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="leagues" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div data-reveal className="reveal-fade-up">
            <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Gamification</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-4">Climb the ranks</h2>
            <p className="text-gray-500 text-lg mb-12 max-w-xl mx-auto">
              Every workout earns XP. Progress through leagues and compete with athletes worldwide.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {leagues.map((tier, i) => (
              <div key={tier.name} data-reveal className="reveal-fade-up relative w-full sm:w-auto" style={{ '--reveal-delay': `${80 + i * 70}ms` }}>
                <div className={`bg-white border rounded-2xl px-6 py-5 transform-gpu will-change-transform hover:shadow-md hover:-translate-y-1 transition-[transform,border-color,box-shadow] duration-300 ${i === 4 ? 'legend-card border-red-300 shadow-md' : 'tier-surface border-gray-200 hover:border-red-200'}`}>
                  <div className="text-3xl mb-2">{tier.emoji}</div>
                  <div className={`font-bold text-sm ${i === 4 ? 'text-red-500' : 'text-gray-900'}`}>{tier.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{tier.xp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="reveal-fade-up text-center mb-16">
            <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Training Methods</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">15+ proven protocols</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              From EMOM to Pyramids, Tabata to Death By... discover methods that keep training fresh.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {methods.map((name, i) => (
              <div
                key={name}
                data-reveal
                className="reveal-fade-up method-surface bg-white border border-gray-100 rounded-xl p-5 transform-gpu will-change-transform hover:border-red-200 hover:shadow-md hover:-translate-y-1 transition-[transform,border-color,box-shadow] duration-300"
                style={{ '--reveal-delay': `${80 + i * 65}ms` }}
              >
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-black text-sm mb-3">
                  {name.charAt(0)}
                </div>
                <div className="text-sm font-bold text-gray-900">{name}</div>
                <div className="text-xs text-gray-400 mt-1">Explore in the app</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-end-section py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="reveal-fade-up cta-surface max-w-3xl mx-auto text-center" style={{ '--reveal-delay': '60ms' }}>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">Ready to start your journey?</h2>
            <p className="text-gray-400 text-lg mb-10">Join Gainly for free and start building your fitness legacy today.</p>
            <Link to="/register" className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-xl hover:-translate-y-[2px]">
              Create Free Account
            </Link>
          </div>

          <footer className="landing-footer max-w-3xl mx-auto mt-6 pt-5">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <div className="landing-footer-row flex flex-wrap items-center justify-center gap-3">
                <div className="landing-logo-badge landing-logo-badge-footer" aria-hidden="true">
                  <img src={gainlyLogo} alt="" className="landing-logo-image" />
                </div>
                <span className="landing-footer-brand font-bold">Gainly</span>
                <span className="landing-footer-divider">&middot;</span>
                <span className="landing-footer-copy landing-footer-tagline text-sm">Fitness, gamified.</span>
              </div>
              <div className="landing-footer-copy landing-footer-meta text-sm">&copy; 2025 Gainly. All rights reserved.</div>
            </div>
          </footer>
        </div>
      </section>
        </div>
      </div>
    </div>
  )
}
