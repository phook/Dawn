// Integration test: the localstorage: file repository end-to-end.
//
// Drives editor.html in headless Chrome against the Dawn server
// (`node dawn.js server/main.dawn`, fixed port 3000) with a SPOOFED hostname
// (Chrome --host-resolver-rules maps dawn.test -> 127.0.0.1), so the page runs
// exactly like a non-localhost deployment: environment.json answers the remote
// environment (dawnPath "dawn", storage "localstorage"), the dawn lib loads
// over normal http, and the editor saves/opens files through the browser's
// localStorage instead of the localhost-only file: routes.
//
// Skips (exit 0) when Chrome/Edge or puppeteer-core is unavailable.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const PORT = 3000; // fixed: httpServer:3000 in server/main.dawn
const FAKE_HOST = 'dawn.test'; // resolves to 127.0.0.1 via host-resolver-rules
const BASE = `http://${FAKE_HOST}:${PORT}`;
const SAVE_NAME = 'hello_ls.dawn';
const SOURCE = 'String:hello localstorage>>Console:\n';

let failures = 0, successes = 0, skipped = 0;
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log('PASS:', name); successes++; }
    else { console.log('FAIL:', name); console.log('  expected:', JSON.stringify(expected)); console.log('  actual:  ', JSON.stringify(actual)); failures++; }
}
function skip(name, why) { console.log('SKIP:', name, '-', why); skipped++; }

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].filter(Boolean);
    return candidates.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}

function waitFor(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    return (async () => {
        while (Date.now() < deadline) {
            try {
                await new Promise((resolve, reject) => {
                    http.get(url, res => { res.resume(); res.statusCode < 500 ? resolve() : reject(); }).on('error', reject);
                });
                return;
            } catch (e) { await new Promise(r => setTimeout(r, 150)); }
        }
        throw new Error('server did not become ready at ' + url);
    })();
}

(async () => {
    const chromePath = findChrome();
    let puppeteer = null;
    try { puppeteer = (await import('puppeteer-core')).default; } catch (e) {} // ESM-only package
    if (!chromePath || !puppeteer) {
        skip('localstorage scheme suite', (!chromePath ? 'no Chrome/Edge found' : '') + (!puppeteer ? ' puppeteer-core not installed' : ''));
        console.log(`${successes} passed, ${failures} failed, ${skipped} skipped (integration)`);
        process.exit(0);
    }

    // free the fixed port (a running dev server or a stale test server)
    try {
        const { execSync } = require('child_process');
        const conn = execSync('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ' + PORT + ' -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"', { encoding: 'utf8' }).trim();
        const pid = parseInt(conn);
        if (pid) { try { process.kill(pid); console.log('localstorage_scheme: killed pre-existing listener on ' + PORT + ' (pid ' + pid + ')'); } catch (e) {} }
    } catch (e) {}

    const server = spawn('node', ['dawn.js', 'server/main.dawn'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let browser = null;
    try {
        await waitFor('http://127.0.0.1:' + PORT + '/environment.json');
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: 'new',
            args: ['--host-resolver-rules=MAP ' + FAKE_HOST + ' 127.0.0.1'],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.on('dialog', d => d.accept(d.type() === 'prompt' ? SAVE_NAME : undefined));
        page.on('pageerror', e => console.log('  pageerror:', e.message));
        page.on('console', m => { if (m.text().indexOf('DEBUG') !== -1 || m.text().indexOf('Saved') !== -1 || m.text().indexOf('fail') !== -1 || m.text().indexOf('error') !== -1) console.log('  [page]', m.text()); });

        await page.goto(BASE + '/editor.html', { waitUntil: 'networkidle0', timeout: 30000 });
        await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
        await page.waitForSelector('#project li');

        // ── 1. the non-localhost environment: remote paths + the storage flag ──
        const env = await page.evaluate(async () => { const r = await fetch('/environment.json'); return r.json(); });
        check('environment.json answers the remote environment', env, { dawnPath: 'dawn', userPath: 'localstorage:', storage: 'localstorage' });

        // ── 2. the scheme module fetches over normal http ──
        const modStatus = await page.evaluate(async () => (await fetch('/dawn/Scheme/localstorage.dawn.js')).status);
        check('GET /dawn/Scheme/localstorage.dawn.js is served', modStatus, 200);

        // ── 3. the editor initializes fully from the remote environment
        //      (flavor parser + compiler load from /dawn/* over http) ──
        await page.waitForFunction(() => {
            try { return typeof convertFromFlavor === 'function' && convertFromFlavor('String:hi>>Console:\n', 'BasicPretty').indexOf('ERROR') !== 0; }
            catch (e) { return false; }
        }, { timeout: 30000 });
        check('editor initializes from the remote environment', true, true);

        // ── 4. the localstorage tree section is present ──
        const hasLsSection = await page.evaluate(() => [...document.querySelectorAll('#project li')].some(x => x.textContent.trim() === 'localstorage'));
        check('localstorage section in the project tree', hasLsSection, true);

        // ── 5. save an untitled tab: goes to the localstorage repository ──
        await page.evaluate((t) => { activeTab.session.setValue(t, -1); checkSyntax(); }, SOURCE);
        await page.evaluate(() => document.getElementById('saveBtn').click());
        await page.waitForFunction((name) => activeTab && activeTab.path === 'localstorage:/' + name && !activeTab.dirty, { timeout: 10000 }, SAVE_NAME);
        const saved = await page.evaluate(() => ({ path: activeTab.path, dirty: activeTab.dirty, syntaxOK: activeTab.syntaxOK }));
        check('save routes the untitled tab to localstorage:', saved, { path: 'localstorage:/' + SAVE_NAME, dirty: false, syntaxOK: true });

        // ── 6. the browser's localStorage really holds the file ──
        const stored = await page.evaluate((name) => {
            const keys = Object.keys(localStorage).filter(k => k.indexOf('localstorage:') === 0);
            const raw = localStorage.getItem('localstorage:' + name);
            return { keys: keys, envelope: raw ? JSON.parse(raw) : null };
        }, SAVE_NAME);
        check('localStorage holds the saved file', stored.keys, ['localstorage:' + SAVE_NAME]);
        check('stored envelope keeps the mime type', stored.envelope ? stored.envelope.mime : null, 'text/dawn');

        // ── 7. reload: the file reappears in the tree and reopens ──
        await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForFunction(() => typeof convertFromFlavor === 'function', { timeout: 30000 });
        await page.evaluate(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'localstorage').click());
        await page.waitForFunction((name) => [...document.querySelectorAll('#project li')].some(x => x.textContent.trim() === name), { timeout: 5000 }, SAVE_NAME);
        await page.evaluate((name) => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === name).click(), SAVE_NAME);
        await page.waitForFunction(() => activeTab && activeTab.path === 'localstorage:/' + 'hello_ls.dawn' && activeTab.canonical && activeTab.canonical.length > 0, { timeout: 10000 });
        const reopened = await page.evaluate(() => ({ path: activeTab.path, dirty: activeTab.dirty, hasSource: activeTab.canonical.indexOf('localstorage') !== -1 }));
        check('saved file reopens from the repository', reopened, { path: 'localstorage:/' + SAVE_NAME, dirty: false, hasSource: true });

    } catch (e) {
        failures++;
        console.log('FAIL: suite error -', e.message);
    } finally {
        if (browser) try { await browser.close(); } catch (e) {}
        try { server.kill(); } catch (e) {}
    }
    console.log(`${successes} passed, ${failures} failed, ${skipped} skipped (integration)`);
    process.exit(failures ? 1 : 0);
})();
