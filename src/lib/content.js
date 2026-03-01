// =============================================
// Zentrale Texte – später einfach durch i18n ersetzbar
// =============================================

export const WELCOME_SLIDES = [
  {
    id: 1,
    emoji: '🔥',
    title: 'Your Training. Your Rules.',
    description:
      'Workouts that adapt to your level. Skill trees that grow with you. Personal records waiting to be crushed. And your own AI coach available 24/7 – answering questions, guiding your form, and keeping you on track.',
  },
  {
    id: 2,
    emoji: '👊',
    title: 'Stronger Together.',
    description:
      'Build your crew. Challenge your friends. Climb the leaderboard from Rookie to Legend. Every rep counts – and your squad is watching.',
  },
  {
    id: 3,
    emoji: '⚡',
    title: 'Every Drop of Sweat Counts.',
    description:
      'Earn XP for every workout. Unlock achievements. Rise through the leagues. At Gainly, your grind gets rewarded. Ready?',
  },
]

// =============================================
// Tägliche Motivation Quotes
// Jeden Tag wird basierend auf dem Datum ein
// anderes Zitat angezeigt (200 Stück, rotierend)
// → Später mit eigenen 200 Zitaten ersetzen!
// =============================================
export const DAILY_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Unknown" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "What seems impossible today will one day become your warm-up.", author: "Unknown" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
  { text: "Champions aren't made in gyms. Champions are made from something deep inside them.", author: "Muhammad Ali" },
  { text: "The only way to define your limits is by going beyond them.", author: "Arthur C. Clarke" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  { text: "The harder you work, the luckier you get.", author: "Gary Player" },
  { text: "It never gets easier. You just get stronger.", author: "Unknown" },
  { text: "A one hour workout is 4% of your day. No excuses.", author: "Unknown" },
  { text: "Sweat is just fat crying.", author: "Unknown" },
  { text: "Motivation gets you going. Discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "Be stronger than your strongest excuse.", author: "Unknown" },
  { text: "Results happen over time, not overnight. Work hard, stay consistent, and be patient.", author: "Unknown" },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Today I will do what others won't, so tomorrow I can do what others can't.", author: "Jerry Rice" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "You are one workout away from a good mood.", author: "Unknown" },
  { text: "Don't wish for it. Work for it.", author: "Unknown" },
  { text: "The best project you'll ever work on is you.", author: "Unknown" },
]

// Helper: Gibt das Zitat des Tages zurück (basierend auf Datum)
export function getDailyQuote() {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  )
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
}

export const LANDING = {
  nav: {
    brand: 'Gainly',
    login: 'Log In',
    signup: 'Join Now',
  },
  hero: {
    tag: 'FITNESS REIMAGINED',
    title: 'Train. Compete. Rise.',
    subtitle:
      'The fitness app that turns every workout into progress. Track your gains, challenge your crew, and climb from Rookie to Legend.',
    cta: 'Get Started – It\'s Free',
    ctaSecondary: 'See How It Works',
  },
  features: {
    tag: 'WHAT MAKES GAINLY DIFFERENT',
    items: [
      {
        icon: '⚡',
        title: 'Adaptive Training',
        description:
          'Skill trees that evolve with you. From your first push-up to a full planche – Gainly maps your journey and pushes you forward.',
      },
      {
        icon: '👥',
        title: 'Your Squad',
        description:
          'Build crews, challenge friends, share progress. Fitness is better together – and your squad holds you accountable.',
      },
      {
        icon: '🏆',
        title: 'Gamified Progress',
        description:
          'XP for every rep. Achievements to unlock. A league system from Rookie to Legend. Your grind finally gets the recognition it deserves.',
      },
    ],
  },
  coach: {
    tag: 'YOUR PERSONAL AI COACH',
    title: 'Like Having a Trainer in Your Pocket.',
    description:
      'Questions about form? Need a workout plan? Unsure about your next progression? Your Gainly Coach knows your history, your level, and your goals – and is ready to help 24/7.',
    highlights: [
      'Personalized workout advice',
      'Form & technique guidance',
      'Smart progression suggestions',
      'Available anytime, anywhere',
    ],
  },
  leagues: {
    tag: 'THE LEAGUE SYSTEM',
    title: 'Where Do You Rank?',
    description: 'Every workout earns XP. Every XP moves you up. Five leagues. One goal: Legend.',
    tiers: [
      { name: 'Rookie', emoji: '🌱', xp: '0 XP' },
      { name: 'Grinder', emoji: '⚙️', xp: '1,000 XP' },
      { name: 'Athlete', emoji: '💪', xp: '5,000 XP' },
      { name: 'Beast', emoji: '🔥', xp: '15,000 XP' },
      { name: 'Legend', emoji: '👑', xp: '50,000 XP' },
    ],
  },
  cta: {
    title: 'Your Journey Starts Now.',
    subtitle: 'Join Gainly and turn every workout into progress.',
    button: 'Create Free Account',
  },
  footer: {
    brand: 'Gainly',
    tagline: 'Train. Compete. Rise.',
    copy: '© 2026 Gainly. All rights reserved.',
  },
}