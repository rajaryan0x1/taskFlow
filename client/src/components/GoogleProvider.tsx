import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";
import { googleClientId } from "../config";
export function GoogleProvider({ children }: { children: ReactNode }) {
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider> : children;
}
