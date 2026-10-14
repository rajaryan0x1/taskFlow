import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { googleClientId } from "../config";
import { getErrorMessage } from "../utils/apiError";
import { notifyAuthChange, useAuthStore, type AuthUser } from "../stores/authStore";

/** Both entry points use the same verified identity exchange and cookie session. */
export function GoogleSignIn({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [providerError, setProviderError] = useState("");
  const exchanging = useRef(false);
  const mutation = useMutation({
    mutationFn: async (credential: string) => (await api.post<{ data: { user: AuthUser } }>("/auth/google", { credential })).data.data,
    onSuccess: ({ user }) => {
      useAuthStore.getState().setAuth(user);
      notifyAuthChange();
      navigate(user.needsProfileCompletion ? "/account" : "/", { replace: true });
    },
    onSettled: () => { exchanging.current = false; },
  });
  if (!googleClientId) return null;
  return <section aria-label={mode === "signup" ? "Sign up with Google" : "Sign in with Google"}>
    <div className="relative my-5 flex items-center justify-center"><span className="absolute inset-x-0 border-t border-slate-200" /><span className="relative bg-white px-3 text-xs text-slate-500">Or continue with</span></div>
    <div className="flex min-h-11 justify-center" aria-busy={mutation.isPending}>
      {mutation.isPending ? <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><span className="loading-mark" />Signing in with Google…</p> : <GoogleLogin
        theme="outline" size="large" shape="rectangular"
        text={mode === "signup" ? "signup_with" : "signin_with"}
        onSuccess={({ credential }) => {
          if (exchanging.current) return;
          setProviderError("");
          if (!credential) { setProviderError("Google did not return a sign-in credential. Please try again."); return; }
          exchanging.current = true;
          mutation.mutate(credential);
        }}
        onError={() => setProviderError("Google sign-in couldn’t be completed. Please try again or use your email and password.")}
      />}
    </div>
    {(providerError || mutation.isError) && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{providerError || getErrorMessage(mutation.error, "Google sign-in failed. Please try again.")}</p>}
  </section>;
}
