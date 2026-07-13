import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/Dashboard/Dashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const SetPassword = lazy(() => import("@/pages/auth/SetPassword"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const AuditPage = lazy(() => import("@/pages/admin/AuditPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background text-primary">
    <Loader2 className="h-10 w-10 animate-spin" />
  </div>
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.SET_PASSWORD} element={<SetPassword />} />
        <Route path="/reset-password" element={<SetPassword />} />
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path={ROUTES.PROFILE} element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path={ROUTES.ADMIN_USERS} element={<ProtectedRoute requireRole="admin"><UsersPage /></ProtectedRoute>} />
        <Route path={ROUTES.ADMIN_AUDIT} element={<ProtectedRoute requireRole="admin"><AuditPage /></ProtectedRoute>} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
