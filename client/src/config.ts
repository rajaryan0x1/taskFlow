const configuredGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
export const googleClientId = /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(configuredGoogleId) ? configuredGoogleId : "";
