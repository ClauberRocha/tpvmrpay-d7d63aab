import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import UserManagement from "./pages/UserManagement.tsx";
import Logs from "./pages/Logs.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginAudit from "./pages/LoginAudit.tsx";

const queryClient = new QueryClient();

// NOTE: Authentication has been removed. All routes are public.
// TODO: Remove the AuthProvider stub and useAuth calls across pages once
// the internal role-based UI gates are cleaned up.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/audit" element={<LoginAudit />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
