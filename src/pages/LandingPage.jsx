import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import AiCoach from '../components/landing/AiCoach'
import Leagues from '../components/landing/Leagues'
import CallToAction from '../components/landing/CallToAction'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="bg-light min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <AiCoach />
      <Leagues />
      <CallToAction />
      <Footer />
    </div>
  )
}