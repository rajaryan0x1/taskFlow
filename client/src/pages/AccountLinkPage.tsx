import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "../components/layout/AuthLayout";
import api from "../api/axios";
import { getErrorMessage } from "../utils/apiError";
import { notifyAuthChange, useAuthStore, type AuthUser } from "../stores/authStore";

export default function AccountLinkPage({ mode }: { mode: "forgot" | "reset" | "verify" }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    // Keep the credential in memory only, out of history and subsequent URLs.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const mutation = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>(`/auth/${mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : "verify-email"}`, mode === "forgot" ? { email } : mode === "reset" ? { token, password } : { token })).data,
    onSuccess: () => {
      if (mode === "reset") { useAuthStore.getState().logout(); notifyAuthChange(); setPassword(""); setConfirmation(""); }
      if (mode === "verify" && useAuthStore.getState().user) {
        void api.get<{ user: AuthUser }>("/auth/me").then(response => useAuthStore.getState().setAuth(response.data.user)).catch(() => {});
      }
    },
  });
  const heading = mode === "forgot" ? "Forgot your password?" : mode === "reset" ? "Choose a new password" : "Verify your email";
  const invalidLink = mode !== "forgot" && !/^[a-f0-9]{64}$/.test(token);
  return <AuthLayout><div className="auth-form">
    <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h2>
    <p className="mt-3 text-sm text-slate-600">{mode === "forgot" ? "Enter your account email and we’ll send a password reset link. Google-only accounts sign in with Google." : mode === "reset" ? "Use 12–72 characters. Resetting your password signs out all previous sessions." : "Confirm that this email address belongs to you."}</p>
    {mutation.isSuccess ? <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-800">{mutation.data.message}</p> : invalidLink ? <p role="alert" className="mt-6 text-rose-700">This link is missing or invalid. Open the full link from your email, or request a new one.</p> : <form className="mt-6 space-y-4" onSubmit={event => {
      event.preventDefault(); setFormError("");
      if (mode === "reset" && password !== confirmation) { setFormError("Passwords do not match."); return; }
      if (mode === "reset" && new TextEncoder().encode(password).length > 72) { setFormError("Use at most 72 UTF-8 bytes for your password."); return; }
      mutation.mutate();
    }}>
      {mode === "forgot" && <div><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></div>}
      {mode === "reset" && <><div><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></div><div><label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></div></>}
      {(formError || mutation.isError) && <p role="alert" className="text-sm text-rose-700">{formError || getErrorMessage(mutation.error)}</p>}
      <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? "Please wait…" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Reset password" : "Verify email"}</button>
    </form>}
    <div className="mt-6 flex flex-wrap gap-4 text-sm text-indigo-700"><Link to="/login">Back to sign in</Link>{mode === "reset" && <Link to="/forgot-password">Request a new reset link</Link>}{mode === "verify" && <Link to="/account">Account settings</Link>}</div>
  </div></AuthLayout>;
}
