import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import Home from "./pages/Home"
import ProtectedRoutes from "./routes/ProtectedRoutes"
import VoiceCapture from "./pages/VoiceCapture"
import ManualAdd from "./pages/ManualAdd"
import Expenses from "./pages/Expenses"
import PendingExpenses from "./pages/PendingExpenses"
import Profile from "./pages/Profile"
import SettingsPage from "./pages/SettingsPage"
import Auth from "./pages/Auth"
import OnboardingGroups from "./pages/OnboardingGroups"
import AuthGuard from "./routes/AuthGuard"
import OnboardingGuard from "./routes/OnboardingGuard"
import { AuthProvider } from "./context/AuthContext"

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth screen */}
          <Route
            path="/auth"
            element={
              <AuthGuard>
                <Auth />
              </AuthGuard>
            }
          />

          {/* Group onboarding (authenticated, no active group) */}
          <Route
            path="/onboarding/groups"
            element={
              <OnboardingGuard>
                <OnboardingGroups />
              </OnboardingGuard>
            }
          />

          {/* Protected app */}
          <Route path="/" element={<ProtectedRoutes/>}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path='home' index element={<Home />} />
            <Route path="voice" element={<VoiceCapture />} />
            <Route path="manual" element={<ManualAdd />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="pending" element={<PendingExpenses />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
