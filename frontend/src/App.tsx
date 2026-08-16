import { BrowserRouter, Route, Routes } from "react-router"
import Home from "./pages/Home"
import ProtectedRoutes from "./routes/ProtectedRoutes"
import VoiceCapture from "./pages/VoiceCapture"
import ManualAdd from "./pages/ManualAdd"


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoutes/>}>
          <Route index element={<Home />} />
          <Route path="voice" element={<VoiceCapture />} />
          <Route path="manual" element={<ManualAdd />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
