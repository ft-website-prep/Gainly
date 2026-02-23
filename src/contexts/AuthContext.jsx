import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// 1. Context erstellen – wie ein "globaler Speicher" für Auth-Daten
const AuthContext = createContext({})

// 2. Custom Hook – damit andere Komponenten einfach auf Auth zugreifen können
//    Statt überall useContext(AuthContext) zu schreiben, reicht useAuth()
export const useAuth = () => useContext(AuthContext)

// 3. Provider-Komponente – "umhüllt" die ganze App und stellt Auth-Daten bereit
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // Der eingeloggte User (oder null)
  const [loading, setLoading] = useState(true)   // true solange wir prüfen ob User eingeloggt ist

  useEffect(() => {
    // Beim App-Start: Prüfen ob bereits eine aktive Session existiert
    // (z.B. wenn der User die Seite neu lädt, bleibt er eingeloggt)
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listener: Reagiert auf Auth-Änderungen (Login, Logout, Token-Refresh)
    // Damit wird der User-State IMMER aktuell gehalten
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Cleanup: Listener entfernen wenn die Komponente unmountet
    return () => subscription.unsubscribe()
  }, [])

  // === AUTH FUNKTIONEN ===

  // Email + Passwort Registrierung
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  // Email + Passwort Login
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  // Google OAuth Login
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Nach Login zurück zur App
      },
    })
    return { data, error }
  }

  // Logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Alle Werte die in der App verfügbar sein sollen
  const value = {
    user,       // Der aktuelle User (oder null wenn ausgeloggt)
    loading,    // true während wir prüfen ob User eingeloggt
    signUp,     // Registrierungs-Funktion
    signIn,     // Login-Funktion
    signInWithGoogle,  // Google Login
    signOut,    // Logout-Funktion
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

//Warum ein Context? Ohne Context müsstet ihr den User-Status als Props durch jede 
//Komponente durchreichen. Mit Context kann jede Komponente einfach useAuth() aufrufen 
// und hat sofort Zugriff auf den User und alle Auth-Funktionen.