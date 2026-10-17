import { defineConfig } from '@playwright/test';

export default defineConfig({
    testMatch: 'random-screen.spec.mjs',
    outputDir: process.env.MRSS_OUTPUT_DIR || 'test-results',
    workers: 1,
    retries: 0,
    timeout: 60_000,
    use: {
        baseURL: process.env.MRSS_BASE_URL || 'http://127.0.0.1:18081',
        viewport: { width: 1440, height: 1000 },
        headless: true,
        launchOptions: process.env.MRSS_CHROMIUM
            ? { executablePath: process.env.MRSS_CHROMIUM } : {},
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
    }
});
