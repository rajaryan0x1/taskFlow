import { AuthLayout } from "../components/layout/AuthLayout";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { getErrorMessage } from "../utils/apiError";
import { useAuthStore, notifyAuthChange } from "../stores/authStore";

interface LoginResponse {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        appRole: "app_admin" | "user";
    };
}


const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const notice = new URLSearchParams(location.search).get("passwordChanged") === "1"
        ? "Password changed. Sign in with your new password." : "";
    const setAuth = useAuthStore((state) => state.setAuth);



    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const response = await api.post<LoginResponse>("/auth/login", credentials);
            return response.data;
        },
        onSuccess: (data) => {
            setAuth(data.user);
            notifyAuthChange();
            navigate("/");
        },
    });

    


    const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    const needsProfileCompletion = useAuthStore((state) => state.user?.needsProfileCompletion);

    useEffect(() => {
        if (isAuthenticated) {
            navigate(needsProfileCompletion ? "/account" : "/", { replace: true });
        }
    }, [isAuthenticated, needsProfileCompletion, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    if (isAuthenticated) {
        return null;
    }

    return (
        <AuthLayout>
            <div className="auth-form">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Sign in to TaskFlow
                    </h2><p className="mt-3 text-xs text-slate-500">A calmer way to move work forward.</p>
                </div>

                {notice && <p role="status" className="text-emerald-700">{notice}</p>}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {loginMutation.isError && (
                        <div className="bg-rose-50 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(loginMutation.error, "Invalid email or password")}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </button>

                    <GoogleSignIn mode="login" />
                    <p className="text-center text-sm"><Link to="/forgot-password" className="text-indigo-700">Forgot password?</Link></p>


                    <div className="text-center text-sm text-slate-600">
                        Don't have an account?{" "}
                        <Link to="/register" className="font-medium text-indigo-600 hover:text-blue-500">
                            Register here
                        </Link>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;
