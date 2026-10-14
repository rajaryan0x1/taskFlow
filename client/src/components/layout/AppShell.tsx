import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Brand, Icon } from "./Icon";
import { Modal } from "../Modal";
import NotificationBell from "../NotificationBell";
import { useAuthStore } from "../../stores/authStore";
import { signOut } from "../../api/axios";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = async () => {
    setPending(true); setError("");
    try { await signOut(); navigate("/login"); }
    catch { setError("Sign out failed. Please try again."); }
    finally { setPending(false); }
  };
  const navigation = <>
    <div className="sidebar-heading">YOUR SPACE</div>
    <nav aria-label="Main navigation" className="sidebar-nav">
      <NavLink to="/" end onClick={() => setOpen(false)}><Icon name="grid" />Overview</NavLink>
      <NavLink to="/my-tasks" onClick={() => setOpen(false)}><Icon name="check" />My tasks</NavLink>
      <NavLink to="/account" onClick={() => setOpen(false)}><Icon name="user" />Account</NavLink>
    </nav>
    <div className="sidebar-note"><span className="eyebrow">A little more focus.</span><p>One place for your projects, your people, and your next move.</p><span className="note-decoration" aria-hidden="true">↗</span></div>
    <div className="sidebar-bottom"><div className="account-summary"><span className="avatar">{user?.firstName[0]}{user?.lastName[0]}</span><span><strong>{user?.firstName} {user?.lastName}</strong><small>@{user?.username}</small></span></div><button className="sidebar-logout" disabled={pending} onClick={() => void logout()}><Icon name="logout" />{pending ? "Signing out…" : "Logout"}</button>{error && <p role="alert" className="error-message">{error}</p>}</div>
  </>;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="desktop-sidebar"><NavLink to="/" aria-label="TaskFlow home"><Brand /></NavLink>{navigation}</aside>
    <div className="app-workspace">
      <header className="topbar"><div className="topbar-location"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Icon name="menu" /></button><span className="text-slate-400">Your space</span><span className="text-slate-300">/</span><strong>{location.pathname === "/" ? "Overview" : location.pathname === "/account" ? "Account settings" : location.pathname === "/my-tasks" ? "My tasks" : "Projects"}</strong></div><div className="topbar-actions"><span className="today-label">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", weekday: "short" }).format(new Date())}</span><NotificationBell /><button className="avatar" aria-label="Account" onClick={() => navigate("/account")}>{user?.firstName[0]}{user?.lastName[0]}</button></div></header>
      <div id="main-content" tabIndex={-1}><Outlet /></div>
    </div>
    {open && <Modal title="Navigation" onClose={() => setOpen(false)}><div className="mobile-navigation"><div className="flex items-center justify-between"><Brand /><button className="icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><Icon name="close" /></button></div>{navigation}</div></Modal>}
  </div>;
}
