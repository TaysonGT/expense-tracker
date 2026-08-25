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
      <div className="flex h-svh w-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-skeleton border-t-primary" />
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
