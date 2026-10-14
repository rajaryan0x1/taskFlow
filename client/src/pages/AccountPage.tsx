import { googleClientId } from "../config";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { GoogleLogin } from "@react-oauth/google";
import api, { signOut } from "../api/axios";
import { useAuthStore, notifyAuthChange, type AuthUser } from "../stores/authStore";
import { getErrorMessage } from "../utils/apiError";

export default function AccountPage() {
  const user = useAuthStore(state => state.user);
  const setAuth = useAuthStore(state => state.setAuth);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [password, setPassword] = useState("");
  const signOutAll = useMutation({ mutationFn: () => signOut(true) });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => api.post("/auth/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      useAuthStore.getState().logout();
      notifyAuthChange();
      // Rebootstrap after credentials change; avoid competing with the
      // protected-route redirect triggered by clearing the auth store.
      window.location.replace("/login?passwordChanged=1");
    },
  });
  const profile = useMutation({
    mutationFn: async () => (await api.patch<{ user: AuthUser }>("/auth/profile", { firstName, lastName })).data,
    onSuccess: data => setAuth(data.user),
  });
  const google = useMutation({
    mutationFn: async (credential: string) => (await api.post("/auth/google/link", { credential, password })).data,
    onSuccess: () => setPassword(""),
  });
  const inputClass = "block w-full mt-2 mb-4 rounded border border-slate-200 bg-white px-3 py-2";
  return <main className="page settings-page">
    <Link to="/" className="text-indigo-600">Back to projects</Link>
    <div className="page-heading mt-5"><div><h1>Account settings</h1><p>Your profile, sign-in methods, and security. All in one place.</p></div></div>
    {user?.needsProfileCompletion && <p className="mb-4">Please confirm your name to finish setting up your account.</p>}
    <form onSubmit={event => { event.preventDefault(); profile.mutate(); }} className="rounded-xl border border-slate-200 bg-white p-6">
      <label htmlFor="firstName">First name</label>
      <input id="firstName" required maxLength={30} value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
      <label htmlFor="lastName">Last name</label>
      <input id="lastName" required maxLength={30} value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} />
      <p className="mb-4 text-slate-600">{user?.email} · @{user?.username}</p>
      <button disabled={profile.isPending} className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">{profile.isPending ? "Saving…" : "Save profile"}</button>
      {profile.isSuccess && <p role="status" className="mt-3 text-emerald-700">Profile saved.</p>}
      {profile.isError && <p role="alert" className="mt-3 text-rose-700">{getErrorMessage(profile.error)}</p>}
    </form>
    {user?.authProvider === "local" ? <form className="mt-6 rounded-xl border border-slate-200 bg-white p-6" onSubmit={event => {
      event.preventDefault();
      setPasswordError("");
      if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match."); return; }
      if (new TextEncoder().encode(newPassword).length > 72) { setPasswordError("Choose a password no longer than 72 UTF-8 bytes."); return; }
      changePassword.mutate();
    }}>
      <h2 className="mb-3 text-lg font-semibold">Change password</h2>
      <p id="passwordHelp" className="mb-4 text-slate-600">Use 12–72 characters. Changing your password signs you out on all devices.</p>
      <label htmlFor="currentPassword">Current password</label>
      <input id="currentPassword" type="password" autoComplete="current-password" required maxLength={1024} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
      <label htmlFor="newPassword">New password</label>
      <input id="newPassword" type="password" autoComplete="new-password" aria-describedby="passwordHelp" required minLength={12} maxLength={72} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
      <label htmlFor="confirmPassword">Confirm new password</label>
      <input id="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
      <button disabled={changePassword.isPending} className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">{changePassword.isPending ? "Changing password…" : "Change password"}</button>
      {(passwordError || changePassword.isError) && <p role="alert" className="mt-3 text-rose-700">{passwordError || getErrorMessage(changePassword.error)}</p>}
    </form> : <p className="mt-6 text-slate-600">Manage your password in your Google account.</p>}
    <section className="surface mt-6 p-6"><h2 className="mb-2 text-lg font-semibold">Your sessions</h2><p className="mb-4 text-sm text-slate-500">Signed in on a shared device? End all active sessions, including this one.</p><button className="btn-secondary" disabled={signOutAll.isPending} onClick={() => signOutAll.mutate()}>Sign out all devices</button>{signOutAll.isError && <p role="alert" className="error-message">{getErrorMessage(signOutAll.error)}</p>}</section>
    {googleClientId && user?.authProvider === "local" && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-lg font-semibold">Link Google sign-in</h2>
      <p className="mb-4 text-slate-600">For password accounts, confirm your current password and choose the Google account with the same email.</p>
      <label htmlFor="linkPassword">Current password</label>
      <input id="linkPassword" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
      {password && !google.isPending && <GoogleLogin onSuccess={result => { if (result.credential) google.mutate(result.credential); }} onError={() => setPassword("")} />}
      {google.isSuccess && <p role="status" className="mt-3 text-emerald-700">Google sign-in linked.</p>}
      {google.isError && <p role="alert" className="mt-3 text-rose-700">{getErrorMessage(google.error)}</p>}
    </section>}
  </main>;
}
