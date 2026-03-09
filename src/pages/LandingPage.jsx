import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center font-black text-white text-sm">G</div>
            <span className="text-lg font-black tracking-tight text-gray-900">Gainly</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Features</a>
            <a href="#coach" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">AI Coach</a>
            <a href="#leagues" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Leagues</a>
            <a href="#community" className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors">Community</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app" className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-all">Open App</Link>
            ) : (
              <>
                <Link to="/login" className="text-red-500 border border-red-200 hover:border-red-400 font-semibold text-sm px-5 py-2 rounded-lg transition-all">Login</Link>
                <Link to="/register" className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-red-200">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-red-200 text-red-500 text-sm font-semibold px-5 py-2 rounded-full mb-8">FREE DURING BETA</div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
            The Fitness Platform<br className="hidden sm:block" /> for <span className="text-red-500">Calisthenics</span><br className="hidden sm:block" /> Athletes.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">Build routines, track your skills, compete with friends and level up with AI-powered coaching. All in one app.</p>
          <Link to="/register" className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 mb-12">Get Started Free</Link>
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['from-red-400 to-red-500','from-gray-400 to-gray-500','from-red-300 to-red-400','from-gray-500 to-gray-600','from-red-500 to-red-600'].map((bg, i) => (
                <div key={i} className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>{String.fromCharCode(65+i)}</div>
              ))}
            </div>
            <span className="text-sm text-gray-500">Join <strong className="text-gray-900">500+</strong> early athletes</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Features</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">Everything you need to level up</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '\u26A1', title: 'Skill Trees', desc: 'Visual progression paths from beginner to advanced. See exactly what to train next for Front Lever, Planche, Muscle-Up and more.' },
              { icon: '\uD83D\uDC65', title: 'Community & Crews', desc: 'Build your squad, challenge friends, share progress. Compete on leaderboards and push each other to new heights.' },
              { icon: '\uD83C\uDFC6', title: 'Gamified Progress', desc: 'Earn XP for every workout. Unlock achievements, climb leagues from Rookie to Legend. Stay motivated every single day.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
                <div className="text-4xl mb-5">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI COACH */}
      <section id="coach" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase">AI-Powered</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-6">Your personal AI Coach</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">Get workout suggestions based on your level, ask questions about form and technique, and let AI build custom routines tailored to your goals.</p>
              <div className="space-y-3">
                {['Personalized workout plans', 'Form and technique advice', 'Skill progression guidance', 'Adapts to your level'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 bg-red-400 rounded-full" /></div>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center"><span className="text-white font-black text-sm">G</span></div>
                <div><div className="text-gray-900 font-bold text-sm">Gainly Coach</div><div className="text-red-500 text-xs">Online</div></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-end"><div className="bg-red-50 text-gray-700 rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">I held a tuck planche for 15 seconds!</div></div>
                <div className="flex justify-start"><div className="bg-white border border-gray-200 text-gray-600 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[80%]">Great! Time for Advanced Tuck. Start with 3x5s holds.</div></div>
                <div className="flex justify-end"><div className="bg-red-50 text-gray-700 rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">Build me a workout for that?</div></div>
                <div className="flex justify-start"><div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1"><div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{animationDelay:'0ms'}} /><div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{animationDelay:'150ms'}} /><div className="w-2 h-2 bg-red-300 rounded-full animate-bounce" style={{animationDelay:'300ms'}} /></div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAGUES */}
      <section id="leagues" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Gamification</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-4">Climb the ranks</h2>
          <p className="text-gray-500 text-lg mb-12 max-w-xl mx-auto">Every workout earns XP. Progress through leagues and compete with athletes worldwide.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {[{name:'Rookie',emoji:'\uD83C\uDF31',xp:'0 XP'},{name:'Grinder',emoji:'\u2699\uFE0F',xp:'1K XP'},{name:'Athlete',emoji:'\uD83D\uDCAA',xp:'5K XP'},{name:'Beast',emoji:'\uD83D\uDD25',xp:'15K XP'},{name:'Legend',emoji:'\uD83D\uDC51',xp:'50K XP'}].map((t,i) => (
              <div key={i} className="relative w-full sm:w-auto">
                <div className={`bg-white border rounded-2xl px-6 py-5 transition-all hover:shadow-lg ${i===4?'border-red-300 shadow-md':'border-gray-200 hover:border-red-200'}`}>
                  <div className="text-3xl mb-2">{t.emoji}</div>
                  <div className={`font-bold text-sm ${i===4?'text-red-500':'text-gray-900'}`}>{t.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{t.xp}</div>
                </div>
                {i<4 && <div className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300 z-10">&rarr;</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHODS */}
      <section id="community" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Training Methods</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">15+ proven protocols</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">From EMOM to Pyramids, Tabata to Death By... discover methods that keep training fresh.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {['EMOM','Pyramid','Tabata','AMRAP','Death By...','Grease the Groove'].map((name,i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-red-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-black text-sm mb-3">{name.charAt(0)}</div>
                <div className="text-sm font-bold text-gray-900">{name}</div>
                <div className="text-xs text-gray-400 mt-1">Explore in the app</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">Ready to start your journey?</h2>
          <p className="text-gray-400 text-lg mb-10">Join Gainly for free and start building your fitness legacy today.</p>
          <Link to="/register" className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-xl">Create Free Account</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center font-black text-white text-xs">G</div>
            <span className="text-gray-900 font-bold">Gainly</span>
            <span className="text-gray-300">&middot;</span>
            <span className="text-gray-400 text-sm">Fitness, gamified.</span>
          </div>
          <div className="text-gray-400 text-sm">&copy; 2025 Gainly. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}