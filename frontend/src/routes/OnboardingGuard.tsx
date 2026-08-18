import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * Guards the /onboarding/groups route. Requires authentication; if the user
 * already has an active group, sends them into the app. Otherwise renders the
 * onboarding children.
 */
export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, hasActiveGroup, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-svh w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (hasActiveGroup) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
