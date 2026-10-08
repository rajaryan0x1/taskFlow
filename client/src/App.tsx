import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import api from "./api/axios";
import type { AuthUser } from "./stores/authStore";
import LoginPage from "./pages/Login";
import { Starfield } from "./components/Starfield";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashBoardPage";
import ProjectPage from "./pages/ProjectPage";

// Protected Route Component
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ user: AuthUser }>("/auth/me", { signal: controller.signal })
      .then((res) => setAuth(res.data.user))
      .catch(() => { /* Anonymous visitors can use the login and register routes. */ })
      .finally(() => { if (!controller.signal.aborted) setIsVerifying(false); });
    return () => controller.abort();
  }, [setAuth]);

  if (isVerifying) {
    return <div className="flex h-screen items-center justify-center text-slate-200 bg-black"><Starfield />Loading...</div>;
  }

  return (
    <div className="relative min-h-screen text-slate-200">
      <Starfield />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
      </Route>

      {/* Catch-all: redirect to dashboard or login */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
    </div>
  );
}

export default App;