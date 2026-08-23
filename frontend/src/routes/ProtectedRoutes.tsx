import { Navigate, Outlet, useLocation } from "react-router"
import BottomNav from "../layout/BottomNav"
import { useAuth } from "../context/AuthContext"

/**
 * Auth + group guard for the main app.
 *
 *  - unauthenticated            → /auth
 *  - authenticated, no group    → /onboarding/groups
 *  - otherwise                  → render the app (Outlet + BottomNav)
 *
 * While the initial session check is in flight, a lightweight splash avoids a
 * flash of the wrong screen.
 */
const ProtectedRoutes = () => {
  const { isAuthenticated, hasActiveGroup, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-svh w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  if (!hasActiveGroup) {
    return <Navigate to="/onboarding/groups" replace />
  }

  return (
    <div className="relative h-svh w-screen overflow-x-hidden overflow-y-auto">
      <Outlet/>
      {/* Immersive capture page — no bottom nav */}
      {!location.pathname.startsWith("/voice") && (
        <BottomNav />
      )}
    </div>
  )
}

export default ProtectedRoutes
