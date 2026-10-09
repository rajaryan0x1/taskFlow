import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node scripts/e2e-server.mjs', url: 'http://127.0.0.1:5100/health', timeout: 180000, reuseExistingServer: false, env: { NODE_ENV: 'test', CORS_ORIGINS: 'http://127.0.0.1:5178', GOOGLE_CLIENT_ID: '' } },
    { command: 'npm run dev --workspace=client -- --host 127.0.0.1 --port 5178 --strictPort', url: 'http://127.0.0.1:5178', reuseExistingServer: false, env: { VITE_API_URL: 'http://127.0.0.1:5100/api/v1', VITE_SOCKET_URL: 'http://127.0.0.1:5100', VITE_GOOGLE_CLIENT_ID: '' } },
  ],
});
