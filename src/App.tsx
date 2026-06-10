import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import UserManagement from "./pages/UserManagement.tsx";
import Signup from "./pages/Signup.tsx";
import Logs from "./pages/Logs.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginAudit from "./pages/LoginAudit.tsx";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { Navigate } from "react-router-dom";

const AdminRoute = () => {
  const { role, loading } = useAuth();
  
  if (loading) return null;
  if (role !== "admin") return <Navigate to="/" replace />;
  
  return <UserManagement />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthProvider><Index /></AuthProvider>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/users" element={
            <AuthProvider>
              <AdminRoute />
            </AuthProvider>
          } />
          <Route path="/logs" element={
            <AuthProvider>
              <Logs />
            </AuthProvider>
          } />
          <Route path="/audit" element={
            <AuthProvider>
              <LoginAudit />
            </AuthProvider>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
