import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * Guards the /auth route. If already authenticated, skips the login screen:
 * sends the user to the app (which will bounce to onboarding if no active
 * group). Prevents showing the sign-in page to logged-in users.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasActiveGroup, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-svh w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={hasActiveGroup ? "/" : "/onboarding/groups"} replace />;
  }

  return <>{children}</>;
}
