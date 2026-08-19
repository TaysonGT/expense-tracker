import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * Auth-only guard: requires the user to be signed in, but (unlike
 * ProtectedRoutes) does NOT require an active group. Used for routes that a
 * user without a group should still reach — e.g. the shareable group join
 * link. Unauthenticated visitors are sent to /auth with the target preserved
 * so they return here after signing in.
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-svh w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
