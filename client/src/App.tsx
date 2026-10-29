import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import api from "./api/axios";
import type { AuthUser } from "./stores/authStore";
import LoginPage from "./pages/Login";
import { AppShell } from "./components/layout/AppShell";
import MyTasksPage from "./pages/MyTasksPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashBoardPage";
import AccountPage from "./pages/AccountPage";
import ProjectPage from "./pages/ProjectPage";
import AccountLinkPage from "./pages/AccountLinkPage";

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
    return <div className="app-loading" role="status"><span className="loading-mark" />Loading your space…</div>;
  }

  return (
    <div className="min-h-screen">
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<AccountLinkPage key="forgot" mode="forgot" />} />
      <Route path="/reset-password" element={<AccountLinkPage key="reset" mode="reset" />} />
      <Route path="/verify-email" element={<AccountLinkPage key="verify" mode="verify" />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
      </Route></Route>

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
