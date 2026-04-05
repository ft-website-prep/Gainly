import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
// Öffentliche Seiten
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WelcomePage from './pages/WelcomePage'

// App Layout (Sidebar)
import AppLayout from './components/app/AppLayout'

// App Seiten (innerhalb der Sidebar)
import Dashboard from './pages/app/Dashboard'
import WorkoutsPage from './pages/app/WorkoutsPage'
import CommunityPage from './pages/app/CommunityPage'
import ProgressPage from './pages/app/ProgressPage'
import CoachPage from './pages/app/CoachPage'
import ProfilePage from './pages/app/ProfilePage'
import SettingsPage from './pages/app/SettingsPage'
import LeaderboardsPage from './pages/app/LeaderboardsPage'


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* === Öffentliche Routen === */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* === Welcome (geschützt, aber ohne Sidebar) === */}
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <WelcomePage />
              </ProtectedRoute>
            }
          />

          {/* === App mit Sidebar (alle geschützt) === */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Nested Routes – werden in <Outlet /> gerendert */}
            <Route index element={<Dashboard />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="coach" element={<CoachPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="leaderboards" element={<LeaderboardsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App