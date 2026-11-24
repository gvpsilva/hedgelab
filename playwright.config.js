const { defineConfig, devices } = require('@playwright/test');

const PORTA = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node scripts/servidor.js',
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORTA) }
  }
});
