import { DashboardSkeleton } from "@/components/skeleton-loaders/dashboard-skeleton";
import useAuth from "@/hooks/api/use-auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthRoute } from "./common/routePaths";

const AuthRoute = () => {
  const location = useLocation();
  const { data: authData, isLoading } = useAuth();
  const user = authData?.user;

  const _isAuthRoute = isAuthRoute(location.pathname);

  if (isLoading && !_isAuthRoute) return <DashboardSkeleton />;

  if (!user) return <Outlet />;

  if (!_isAuthRoute) return <Outlet />;

  const currentWorkspaceId =
    typeof user.currentWorkspace === "string"
      ? user.currentWorkspace
      : user.currentWorkspace?._id;

  if (!currentWorkspaceId) {
    return <Outlet />;
  }

  const urlParams = new URLSearchParams(location.search);
  const returnUrl = urlParams.get("returnUrl");

  return <Navigate to={returnUrl || `/workspace/${currentWorkspaceId}`} replace />;
};

export default AuthRoute;