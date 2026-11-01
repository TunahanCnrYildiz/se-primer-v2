import { defineConfig } from 'cypress';
import base from './cypress.config.js';

// Demo videosu için ayrı ayar: Cypress 16 komut satırındaki --config video=true'yu yok sayıyor.
const WIDTH = 1920;
const HEIGHT = 1080;

export default defineConfig({
  e2e: {
    ...base.e2e,
    specPattern: 'cypress/e2e/demo.cy.js',
    video: true,
    // Normal test koşusu kendi çıktı klasörlerini her seferinde temizler; demo videosu ayrı tutulur.
    videosFolder: 'demo-video',
    // 18 CRF görsel olarak kayıpsıza yakın; varsayılan sıkıştırma küçük yazıları bulanıklaştırıyor.
    videoCompression: 18,
    setupNodeEvents(on) {
      // Varsayılan 1280×720 pencerede 844 px boyundaki telefon ekranı küçülüyor.
      // 1080p pencerede telefon yaklaşık gerçek boyutunda kaydedilir.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push(`--window-size=${WIDTH},${HEIGHT}`, '--force-device-scale-factor=1');
        }
        if (browser.name === 'electron') {
          launchOptions.preferences.width = WIDTH;
          launchOptions.preferences.height = HEIGHT;
        }
        return launchOptions;
      });
    },
  },
});
