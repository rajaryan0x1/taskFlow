import { googleClientId } from "../config";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuthStore, notifyAuthChange } from "../stores/authStore";
import { GoogleLogin } from "@react-oauth/google";
import { getErrorMessage } from "../utils/apiError";

interface RegisterResponse {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        appRole: "app_admin" | "user";
    };
}

const RegisterPage = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    
    const googleLoginMutation = useMutation({
        mutationFn: async (credential: string) => {
            const response = await api.post<{ data: RegisterResponse }>("/auth/google", { credential });
            return response.data.data;
        },
        onSuccess: (data) => {
            setAuth(data.user);
            notifyAuthChange();
            navigate("/");
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (data: {
            firstName: string;
            lastName: string;
            username: string;
            email: string;
            password: string;
        }) => {
            const response = await api.post<RegisterResponse>("/auth/register", data);
            return response.data;
        },
        onSuccess: (data) => {
            setAuth(data.user);
            notifyAuthChange();
            navigate("/");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate({ firstName, lastName, username, email, password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent">
            <div className="max-w-md w-full space-y-8 p-8 bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-bold text-white">
                        Create your account
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {registerMutation.isError && (
                        <div className="bg-rose-900/20 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(registerMutation.error, "Registration failed. Please try again.")}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-200">
                                    First Name
                                </label>
                                <input
                                    id="firstName"
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="John"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-200">
                                    Last Name
                                </label>
                                <input
                                    id="lastName"
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-200">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="johndoe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={12}
                                maxLength={72}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-slate-400">Use 12–72 characters (maximum 72 UTF-8 bytes)</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </button>

                    {googleClientId && <>
                    <div className="relative mt-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                        <GoogleLogin
                            onSuccess={(credentialResponse) => {
                                if (credentialResponse.credential) {
                                    googleLoginMutation.mutate(credentialResponse.credential);
                                }
                            }}
                            onError={() => {
                                console.error('Google Login Failed');
                            }}
                            theme="filled_black"
                        />
                    </div>
                    </>}
                    {googleLoginMutation.isError && (
                        <div className="mt-2 text-sm text-red-500 text-center">
                            {getErrorMessage(googleLoginMutation.error, "Google Login failed")}
                        </div>
                    )}


                    <div className="text-center text-sm text-slate-300">
                        Already have an account?{" "}
                        <Link to="/login" className="font-medium text-indigo-400 hover:text-blue-500">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;