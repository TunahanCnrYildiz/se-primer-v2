import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Uygulama ayrı çalışır: cd app && npm run dev
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    // Tasarımın hedef cihazı: 390 px genişliğinde telefon.
    viewportWidth: 390,
    viewportHeight: 844,
    defaultCommandTimeout: 8000,
    // Video yalnızca demo için açılır: npm run demo (cypress.demo.config.js)
    video: false,
    videoCompression: 32,
    screenshotOnRunFailure: true,
  },
});
