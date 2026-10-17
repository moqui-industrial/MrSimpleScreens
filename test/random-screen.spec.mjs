import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const component = fileURLToPath(new URL('../', import.meta.url));
// Find screens exercise real forms without needing record-specific fixtures.
// Include staged and unstaged migration edits; MRSS_DIFF_BASE supports committed migrations.
const changed = execFileSync('git', ['diff', '--name-only', process.env.MRSS_DIFF_BASE || 'HEAD', '--', 'screen/SimpleScreens'],
    { cwd: component, encoding: 'utf8' }).trim().split('\n');
const candidates = changed.filter(file => /\/Find[^/]+\.xml$/.test(file)).filter(file => {
    const xml = readFileSync(path.join(component, file), 'utf8');
    return /<form-list\b[^>]*header-dialog="true"/.test(xml) && !/<parameter\b[^>]*required="true"/.test(xml);
}).sort();
const selected = process.env.MRSS_SCREEN || (candidates.length ? candidates[randomInt(candidates.length)] : '');

test('random migrated find screen renders and fits the viewport', async ({ page }, testInfo) => {
    expect(candidates, 'No edited Find screens; set MRSS_DIFF_BASE to the pre-migration commit').not.toHaveLength(0);
    expect(candidates, 'MRSS_SCREEN must be an edited Find screen').toContain(selected);
    const xml = readFileSync(path.join(component, selected), 'utf8');
    const formName = xml.match(/<form-list\b[^>]*\bname="([^"]+)"/)[1];
    const screenURL = '/apps/' + selected.replace(/^screen\//, '').replace(/\.xml$/, '');
    console.log(`Selected ${selected}; replay with MRSS_SCREEN=${selected}`);
    await testInfo.attach('selection', { body: JSON.stringify({ selected, screenURL, candidates }, null, 2), contentType: 'application/json' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });

    await page.goto('/Login');
    await page.locator('#login_form [name=username]').fill(process.env.MRSS_USERNAME || 'john.doe');
    await page.locator('#login_form [name=password]').fill(process.env.MRSS_PASSWORD || 'moqui');
    await Promise.all([
        page.waitForURL(url => !url.pathname.endsWith('/Login')),
        page.locator('#login_form').evaluate(form => form.requestSubmit())
    ]);
    const response = await page.goto(screenURL);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(screenURL + '(?:[?#]|$)'));
    await expect(page.locator('body')).not.toContainText(/Error rendering|Exception in render|Internal Server Error|Maximum call stack|ReferenceError|TypeError/);
    const table = page.locator(`table[id^="${formName}"]`);
    await expect(table).toBeVisible();
    await expect(table.locator('th').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Find Options/ }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
    await testInfo.attach('desktop', { path: testInfo.outputPath('desktop.png'), contentType: 'image/png' });
    // Detect broken desktop layout without requiring pixel-identical migration output.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'Horizontal page overflow').toBeLessThanOrEqual(2);
    expect(await table.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(300);

    // Extra non-mutating interaction checks for the initially sampled screen.
    if (selected.endsWith('/Survey/FindSurvey.xml')) {
        await page.getByRole('button', { name: /New Survey/ }).click();
        const dialog = page.locator('#NewSurveyContainer');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('[name=description]')).toBeEditable();
        await expect(dialog.locator('[name=comments]')).toBeEditable();
        await expect(dialog.getByRole('button', { name: /Create/ })).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440);
        await page.screenshot({ path: testInfo.outputPath('dialog.png'), fullPage: true });
        await testInfo.attach('dialog', { path: testInfo.outputPath('dialog.png'), contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await page.getByRole('button', { name: /Find Options/ }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: /Find/, exact: false }).click();
        await expect(table).toBeVisible();
        await expect(page.locator('body')).not.toContainText(/Error rendering|Exception in render|Internal Server Error/);
    }
    expect(errors, 'Browser errors and failed HTTP responses').toEqual([]);
});
