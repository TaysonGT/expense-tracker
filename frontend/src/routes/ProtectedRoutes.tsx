import { Outlet } from "react-router"
import BottomNav from "../layout/BottomNav"


const ProtectedRoutes = () => {
  return (
    <div className="h-full w-full flex flex-col">
      {/* <div className='flex grow'> */}
      {/* </div> */}
      <Outlet/>
      <BottomNav 
      />
    </div>
  )
}

export default ProtectedRoutes
