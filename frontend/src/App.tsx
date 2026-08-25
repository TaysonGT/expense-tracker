import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import Home from "./pages/Home"
import ProtectedRoutes from "./routes/ProtectedRoutes"
import VoiceCapture from "./pages/VoiceCapture"
import VoiceTest from "./pages/VoiceTest"
import ManualAdd from "./pages/ManualAdd"
import Expenses from "./pages/Expenses"
import PendingExpenses from "./pages/PendingExpenses"
import Profile from "./pages/Profile"
import SettingsPage from "./pages/SettingsPage"
import Auth from "./pages/Auth"
import OnboardingGroups from "./pages/OnboardingGroups"
import GroupManagement from "./pages/GroupManagement"
import GroupJoin from "./pages/GroupJoin"
import AuthGuard from "./routes/AuthGuard"
import OnboardingGuard from "./routes/OnboardingGuard"
import RequireAuth from "./routes/RequireAuth"
import { AuthProvider } from "./context/AuthContext"
import { GroupSwitchProvider } from "./context/GroupSwitchContext"
import { ActionOverlayProvider } from "./components/ActionOverlay"
import { VolumeMeter } from "./pages/Test"
import { ThemeProvider } from "./context/ThemeContext"

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GroupSwitchProvider>
            <ActionOverlayProvider>
              <Routes>            {/* Public auth screen */}
              <Route
                path="/auth"
                element={
                  <AuthGuard>
                    <Auth />
                  </AuthGuard>
                }
              />
              <Route
                path="/test"
                element={
                  <VolumeMeter/>              
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

              {/* Shareable group join link — reachable without an active group
                    (auth required). Lets an invited user preview + join. */}
              <Route
                path="/join/:code"
                element={
                  <RequireAuth>
                    <GroupJoin />
                  </RequireAuth>
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
                <Route path="group" element={<GroupManagement />} />
              </Route>
              <Route path="/test-voice" element={<VoiceTest />} />
            </Routes>
          </ActionOverlayProvider>
          </GroupSwitchProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
