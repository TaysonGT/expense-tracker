import { BrowserRouter, Route, Routes } from "react-router"
import Home from "./pages/Home"
import ProtectedRoutes from "./routes/ProtectedRoutes"


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoutes/>}>
          <Route index path="/" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
