// Node 22+ and Chromium only; run against disposable Mantle flow data, never production.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.MRMARBLE_BASE_URL || 'http://127.0.0.1:18082';
const outputDir = process.env.MRMARBLE_OUTPUT_DIR || os.tmpdir();
const profile = await mkdtemp(path.join(os.tmpdir(), 'mrmarble-chrome-'));
const browser = spawn(process.env.MRMARBLE_CHROMIUM || '/usr/bin/chromium', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
try {
    const endpoint = await new Promise((resolve, reject) => {
        let text = '';
        const timer = setTimeout(() => reject(Error('Chromium startup timeout')), 30000);
        browser.stderr.on('data', chunk => {
            text += chunk;
            const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) { clearTimeout(timer); resolve(match[1]); }
        });
        browser.on('exit', code => { clearTimeout(timer); reject(Error('Chromium exit ' + code)); });
        browser.on('error', reject);
    });
    ws = new WebSocket(endpoint);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', reject, { once: true });
    });
    let seq = 0, session;
    const pending = new Map(), listeners = [], exceptions = [], failures = [], results = [];
    ws.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        if (msg.id) {
            const cb = pending.get(msg.id);
            if (cb) { pending.delete(msg.id); msg.error ? cb.reject(Error(JSON.stringify(msg.error))) : cb.resolve(msg.result); }
        } else {
            if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails);
            if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400)
                failures.push({ url: msg.params.response.url, status: msg.params.response.status });
            for (const fn of [...listeners]) fn(msg);
        }
    });
    const send = (method, params = {}, sid = session) => new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    });
    const wait = method => new Promise((resolve, reject) => {
        const timer = setTimeout(() => { listeners.splice(listeners.indexOf(fn), 1); reject(Error('Event timeout: ' + method)); }, 30000);
        const fn = msg => {
            if (msg.method === method && msg.sessionId === session) {
                clearTimeout(timer); listeners.splice(listeners.indexOf(fn), 1); resolve(msg.params);
            }
        };
        listeners.push(fn);
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, null);
    ({ sessionId: session } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    const evaluate = async expression => {
        const out = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (out.exceptionDetails) throw Error(JSON.stringify(out.exceptionDetails));
        return out.result.value;
    };
    const go = async url => {
        const loaded = wait('Page.loadEventFired');
        await send('Page.navigate', { url: base + url }); await loaded;
        return evaluate('document.body.innerText');
    };
    await go('/Login');
    let loaded = wait('Page.loadEventFired');
    await evaluate(`(() => {
        const form = document.getElementById('login_form');
        form.username.value = ${JSON.stringify(process.env.MRMARBLE_USERNAME || 'john.doe')};
        form.password.value = ${JSON.stringify(process.env.MRMARBLE_PASSWORD || 'moqui')};
        form.requestSubmit();
    })()`);
    await loaded;
    for (const [url, text] of [
        ['/apps/marble/dashboard', 'Customers'],
        ['/apps/marble/Customer/FindCustomer?pseudoId=CustJqp', 'Joe'],
        ['/apps/marble/Supplier/FindSupplier?pseudoId=ZiddlemanInc', 'Ziddleman'],
        ['/apps/marble/Order/OrderDetail?orderId=55401', 'Picker Bot 2000'],
        ['/apps/marble/Accounting/Invoice/EditInvoice?invoiceId=55400', 'Payment Sent'],
        ['/apps/marble/Accounting/Payment/EditPayment?paymentId=55400', 'Delivered'],
    ]) {
        const body = await go(url);
        assert.ok(body.includes(text), url + ': expected ' + text + '; got ' + body.slice(0, 500));
        assert.ok(!/Error rendering section|Exception in render/.test(body), url + ': render error');
        results.push({ url, passed: true });
    }
    await go('/apps/marble/dashboard');
    assert.ok(await evaluate(`document.querySelector('#navbar-buttons > #active-org-menu') !== null`), 'Chooser moves into navbar');
    await evaluate(`document.querySelector('#active-org-menu summary').click()`);
    assert.ok(await evaluate(`document.querySelector('#active-org-menu').open`), 'Native chooser opens without jQuery');
    loaded = wait('Page.loadEventFired');
    await evaluate(`document.querySelector('#active-org-menu a[href$="preferenceValue=ORG_ZIZI_RETAIL"]').click()`);
    await loaded;
    assert.ok(await evaluate(`document.querySelector('#active-org-menu summary').innerText.includes('ZIRET')`), 'Active organization changes');
    await evaluate(`document.querySelector('#active-org-menu summary').click()`);
    loaded = wait('Page.loadEventFired');
    await evaluate(`document.querySelector('#active-org-menu a[href$="preferenceValue="]').click()`);
    await loaded;
    assert.ok(await evaluate(`document.querySelector('#active-org-menu summary').innerText.includes('Organization')`), 'Active organization clears');
    assert.ok(await evaluate(`!document.querySelector('#active-org-menu a[href$="preferenceValue="]')`), 'Clear link disappears');
    results.push({ feature: 'organization select/clear through real preference transition', passed: true });
    const dashboard = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(path.join(outputDir, 'mrmarble-dashboard.png'), Buffer.from(dashboard.data, 'base64'));

    // QVT loads its content after the shell load event. Observe DOM changes instead of polling.
    for (const [url, text] of [
        ['/qapps/marble/dashboard', 'Customers'],
        ['/qapps/marble/Order/OrderDetail?orderId=55401', 'Picker Bot 2000'],
    ]) {
        await go(url);
        const body = await evaluate(`new Promise((resolve, reject) => {
            const check = () => {
                if (!document.body.innerText.includes(${JSON.stringify(text)})) return;
                observer.disconnect(); clearTimeout(timer); resolve(document.body.innerText);
            };
            const observer = new MutationObserver(check);
            const timer = setTimeout(() => { observer.disconnect(); reject(Error('QVT content timeout')); }, 30000);
            observer.observe(document.body, {childList: true, subtree: true, characterData: true});
            check();
        })`);
        assert.ok(!/Error rendering section|Exception in render/.test(body), url + ': render error');
        results.push({ url, passed: true });
    }
    const body = await go('/apps/marble/Order/PrintOrder.html-print?orderId=55400');
    assert.ok(body.includes('23,795.00'), body.slice(0, 500));
    assert.ok(await evaluate('document.querySelectorAll("svg rect").length > 0'), 'Real barcode SVG bars required');
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    await writeFile(path.join(outputDir, 'mrmarble-order.pdf'), Buffer.from(pdf.data, 'base64'));
    results.push({ feature: 'order print with barcode and PDF', passed: true });
    const report = { results, exceptions, failures };
    await writeFile(path.join(outputDir, 'mrmarble-browser-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(exceptions.length, 0, 'Browser JS exceptions');
    assert.equal(failures.length, 0, 'HTTP failures');
} finally {
    if (ws) ws.close();
    browser.kill('SIGTERM');
    await new Promise(resolve => browser.exitCode !== null || browser.signalCode !== null ? resolve() : browser.once('exit', resolve));
    await rm(profile, { recursive: true, force: true }).catch(error => console.warn('Chromium profile cleanup:', error.code));
}
