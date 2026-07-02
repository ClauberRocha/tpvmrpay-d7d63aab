import { Route, Routes } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import Dashboard from "@/pages/Dashboard/Dashboard";
import NotFound from "@/pages/NotFound";
import { AppProviders } from "@/providers/AppProviders";

const App = () => (
  <AppProviders>
    <Routes>
      <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  </AppProviders>
);

export default App;
