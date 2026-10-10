const configuredGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
export const googleClientId = /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(configuredGoogleId) ? configuredGoogleId : "";

export const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api/v1" : "http://localhost:5000/api/v1");
export const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : "http://localhost:5000");
if (import.meta.env.PROD) {
  const safeUrl = (value: string) => (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("https://");
  if (!safeUrl(apiBaseUrl) || !socketUrl.startsWith("https://")) throw new Error("Production API and socket endpoints must use HTTPS");
}
