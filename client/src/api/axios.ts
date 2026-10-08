import axios from "axios";
import { useAuthStore, notifyAuthChange } from "../stores/authStore";

declare module "axios" {
  interface InternalAxiosRequestConfig { authGeneration?: number }
}
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json", "X-TaskFlow-Client": "web" },
});
api.interceptors.request.use((config) => {
  config.authGeneration = useAuthStore.getState().generation;
  return config;
});
api.interceptors.response.use((response) => {
  if (response.config.authGeneration !== useAuthStore.getState().generation) {
    throw new axios.CanceledError("Response belongs to a previous session");
  }
  return response;
}, (error) => {
  if (error.config?.authGeneration !== undefined && error.config.authGeneration !== useAuthStore.getState().generation) {
    return Promise.reject(new axios.CanceledError("Request belongs to a previous session"));
  }
  if (error.response?.status === 401 && useAuthStore.getState().user) {
    useAuthStore.getState().logout();
    notifyAuthChange();
  }
  return Promise.reject(error);
});
export async function signOut(all = false) {
  await api.post(all ? "/auth/logout-all" : "/auth/logout");
  useAuthStore.getState().logout();
  notifyAuthChange();
}
export default api;
