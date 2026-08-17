import { Outlet } from "react-router"
import BottomNav from "../layout/BottomNav"


const ProtectedRoutes = () => {
  return (
    <div className="relative h-svh w-screen overflow-y-auto">
      <Outlet/>
      <BottomNav 
      />
    </div>
  )
}

export default ProtectedRoutes
