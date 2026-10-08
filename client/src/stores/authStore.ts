import { create } from "zustand";
import { queryClient } from "../api/queryClient";
import { disconnectSocket } from "../socket/socket";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  appRole: "app_admin" | "user";
}
interface AuthState {
  user: AuthUser | null;
  generation: number;
  setAuth: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}
function clearPrivateState() {
  void queryClient.cancelQueries();
  queryClient.clear();
  disconnectSocket();
}
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  generation: 0,
  setAuth: (user) => {
    if (get().user?.id !== user.id) {
      clearPrivateState();
      set({ user, generation: get().generation + 1 });
    } else set({ user });
  },
  logout: () => {
    clearPrivateState();
    set({ user: null, generation: get().generation + 1 });
  },
  isAuthenticated: () => !!get().user,
}));

// Remove credentials persisted by earlier versions. Only a non-secret event
// marker is stored now; the session cookie is never readable by JavaScript.
if (typeof window !== "undefined") {
  window.localStorage.removeItem("auth-storage");
  window.addEventListener("storage", (event) => {
    if (event.key === "taskflow-auth-event") {
      useAuthStore.getState().logout();
      window.location.reload();
    }
  });
}
export function notifyAuthChange() {
  window.localStorage.setItem("taskflow-auth-event", crypto.randomUUID());
}
