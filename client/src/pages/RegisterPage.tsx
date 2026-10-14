import { AuthLayout } from "../components/layout/AuthLayout";
import { googleClientId } from "../config";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuthStore, notifyAuthChange } from "../stores/authStore";
import { GoogleLogin } from "@react-oauth/google";
import { getErrorMessage, getFieldErrors } from "../utils/apiError";

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

    const fieldErrors = getFieldErrors(registerMutation.error);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate({ firstName, lastName, username, email, password });
    };

    return (
        <AuthLayout>
            <div className="auth-form">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Create your account
                    </h2><p className="mt-3 text-xs text-slate-500">A calmer way to move work forward.</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {registerMutation.isError && (
                        <div role="alert" className="bg-rose-50 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(registerMutation.error, "Registration failed. Please try again.")}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
                                    First Name
                                </label>
                                <input
                                    id="firstName"
                                    aria-invalid={!!fieldErrors.firstName}
                                    maxLength={30}
                                    autoComplete="given-name"
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="John"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
                                    Last Name
                                </label>
                                <input
                                    id="lastName"
                                    aria-invalid={!!fieldErrors.lastName}
                                    maxLength={30}
                                    autoComplete="family-name"
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                                Username
                            </label>
                            <input
                                id="username"
                                    aria-invalid={!!fieldErrors.username}
                                minLength={3}
                                maxLength={20}
                                pattern="[a-zA-Z0-9_]+"
                                title="Use 3–20 letters, numbers, or underscores"
                                autoComplete="username"
                                aria-describedby="usernameHelp"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="johndoe"
                            />
                            <p id="usernameHelp" className="mt-1 text-xs text-slate-500">3–20 letters, numbers, or underscores. No spaces or dots.</p>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <input
                                id="email"
                                    aria-invalid={!!fieldErrors.email}
                                autoComplete="email"
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
                                    aria-invalid={!!fieldErrors.password}
                                autoComplete="new-password"
                                aria-describedby="passwordHelp"
                                type="password"
                                required
                                minLength={12}
                                maxLength={72}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); e.target.setCustomValidity(new TextEncoder().encode(e.target.value).length > 72 ? "Password is too long. Use at most 72 UTF-8 bytes; accented letters and emoji can use more than one byte." : ""); }}
                                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••••••"
                            />
                            <p id="passwordHelp" className="mt-1 text-xs text-slate-500">Use 12–72 characters (maximum 72 UTF-8 bytes)</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </button>

                    {googleClientId && <>
                    <div className="relative mt-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
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


                    <div className="text-center text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link to="/login" className="font-medium text-indigo-600 hover:text-blue-500">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
};

export default RegisterPage;
