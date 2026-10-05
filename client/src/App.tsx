import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import api from "./api/axios";
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
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (token) {
      api.get("/auth/me")
        .then((res) => {
          if (res.data.user) {
            setAuth(token, res.data.user);
          }
        })
        .catch(() => {
          // 401 will be handled by interceptor
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
    }
  }, []);

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