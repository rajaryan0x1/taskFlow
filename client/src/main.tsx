import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import './index.css'
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { ReactNode } from "react";
const GoogleProvider = ({ children }: { children: ReactNode }) => import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider> : children;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleProvider>
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />

      </BrowserRouter>
    </QueryClientProvider>
      </GoogleProvider>
      </ErrorBoundary>
  </StrictMode>,
)