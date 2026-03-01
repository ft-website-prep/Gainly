import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { WELCOME_SLIDES } from '../lib/content'

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const isLastSlide = currentSlide === WELCOME_SLIDES.length - 1
  const slide = WELCOME_SLIDES[currentSlide]

  // "Let's Go" – welcome_seen auf true setzen und ins Dashboard
  const handleComplete = async () => {
    setLoading(true)

    await supabase
      .from('profiles')
      .update({ welcome_seen: true })
      .eq('id', user.id)

    navigate('/')
  }

  // Nächster Slide oder abschließen
  const handleNext = () => {
    if (isLastSlide) {
      handleComplete()
    } else {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  // Vorheriger Slide
  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }
  }

  // Skip – direkt abschließen
  const handleSkip = () => {
    handleComplete()
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Skip Button oben rechts */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl">

          {/* Emoji groß zentriert */}
          <div className="text-center mb-6">
            <span className="text-7xl">{slide.emoji}</span>
          </div>

          {/* Titel */}
          <h1 className="text-3xl font-bold text-light text-center mb-4">
            {slide.title}
          </h1>

          {/* Beschreibung */}
          <p className="text-gray-400 text-center leading-relaxed mb-8">
            {slide.description}
          </p>

          {/* Dots – zeigen welcher Slide aktiv ist */}
          <div className="flex justify-center gap-2 mb-8">
            {WELCOME_SLIDES.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading
                ? '...'
                : isLastSlide
                ? "Let's Go! 🚀"
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}