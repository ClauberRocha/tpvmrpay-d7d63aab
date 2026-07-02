import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

const Dashboard = lazy(() => import("@/pages/Dashboard/Dashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background text-primary">
    <Loader2 className="h-10 w-10 animate-spin" />
  </div>
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
