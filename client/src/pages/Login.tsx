import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { getErrorMessage } from "../utils/apiError";
import { useAuthStore } from "../stores/authStore";

interface LoginResponse {
    token: string;
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
    const setAuth = useAuthStore((state) => state.setAuth);



    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const response = await api.post<LoginResponse>("/auth/login", credentials);
            return response.data;
        },
        onSuccess: (data) => {
            setAuth(data.token, data.user);
            navigate("/");
        },
    });

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-bold text-gray-900">
                        Sign in to TaskFlow
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {loginMutation.isError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(loginMutation.error, "Invalid email or password")}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </button>

                    <div className="text-center text-sm text-gray-600">
                        Don't have an account?{" "}
                        <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                            Register here
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;