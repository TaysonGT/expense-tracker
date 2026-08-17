import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import Home from "./pages/Home"
import ProtectedRoutes from "./routes/ProtectedRoutes"
import VoiceCapture from "./pages/VoiceCapture"
import ManualAdd from "./pages/ManualAdd"
import Expenses from "./pages/Expenses"
import Profile from "./pages/Profile"
import SettingsPage from "./pages/SettingsPage"


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoutes/>}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path='home' index element={<Home />} />
          <Route path="voice" element={<VoiceCapture />} />
          <Route path="manual" element={<ManualAdd />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
