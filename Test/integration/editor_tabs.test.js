// Integration test: editor.html tabbed editing — tabs, per-tab verification,
// flavor switching, dirty/save/color logic, and single-fetch folder expansion.
// Drives the real page in headless Chrome against the Dawn server
// (`node dawn.js server/main.dawn`, fixed port 3000 per httpServer:3000 in
// main.dawn). Any listener on 3000 is killed first — that includes a running
// dev server (`npm run dawn`).
//
// Skips (exit 0) when Chrome or puppeteer-core is unavailable: this is a
// browser-dependent test in an otherwise browser-free harness.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const PORT = 3000; // fixed: httpServer:3000 in server/main.dawn
const BASE = `http://127.0.0.1:${PORT}`;

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
        skip('editor tabs suite', (!chromePath ? 'no Chrome/Edge found' : '') + (!puppeteer ? ' puppeteer-core not installed' : ''));
        console.log(`${successes} passed, ${failures} failed, ${skipped} skipped (integration)`);
        process.exit(0);
    }

    // free the fixed port (a running dev server or a stale test server)
    try {
        const { execSync } = require('child_process');
        const conn = execSync('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ' + PORT + ' -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"', { encoding: 'utf8' }).trim();
        const pid = parseInt(conn);
        if (pid) { try { process.kill(pid); console.log('editor_tabs: killed pre-existing listener on ' + PORT + ' (pid ' + pid + ')'); } catch (e) {} }
    } catch (e) {}

    const server = spawn('node', ['dawn.js', 'server/main.dawn'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let browser = null;
    try {
        await waitFor(BASE + '/environment.json');
        browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        page.on('dialog', d => d.accept()); // unsaved-tab close confirmation

        await page.goto(BASE + '/editor.html', { waitUntil: 'networkidle0' });
        await page.waitForSelector('#project li');

        // wait until the flavor parsers/compilers finished initializing
        await page.waitForFunction(() => {
            try { return typeof convertFromFlavor === 'function' && convertFromFlavor('String:hi>>Console:\n', 'BasicPretty').indexOf('ERROR') !== 0; }
            catch (e) { return false; }
        }, { timeout: 20000 });

        const ev = (fn, ...args) => page.evaluate(fn, ...args);
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const tabState = () => ev(() => ({
            count: tabs.length,
            active: activeTab ? { path: activeTab.path, flavor: activeTab.flavor, syntaxOK: activeTab.syntaxOK, dirty: activeTab.dirty } : null,
            anyRed: anyRedTab(),
            saveDisabled: document.getElementById('saveBtn').disabled,
            selectDisabled: document.getElementById('flavorSelect').disabled,
            selectValue: document.getElementById('flavorSelect').value,
        }));

        // ── 1. startup: one untitled tab, green, everything enabled ──
        let s = await tabState();
        check('startup opens one untitled tab', [s.count, s.active.path, s.active.dirty, s.active.syntaxOK], [1, null, false, true]);

        // ── 2. opening a file creates a tab ──
        await ev(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'Clock.dawn').click());
        await sleep(1500);
        s = await tabState();
        check('opening a file creates a second tab', s.count, 2);
        check('file tab not dirty, compiling', [s.active.dirty, s.active.syntaxOK, s.selectDisabled, s.saveDisabled], [false, true, false, false]);
        check('tree row selected for active file', await ev(() => {
            const li = document.querySelector('#project li.selected');
            return li ? li.textContent.trim() : null;
        }), 'Clock.dawn');

        // ── 3. reopening the same file focuses, not duplicates ──
        await ev(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'Clock.dawn').click());
        await sleep(500);
        check('reopening same file does not duplicate the tab', (await tabState()).count, 2);

        // ── 3b. a file with mid-file blank lines (doc/native separator) opens clean:
        // blank lines are formatting, not content — the flavor round-trip drops
        // them and that must not read as an unsaved change
        await ev(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'Console.dawn').click());
        await sleep(1500);
        s = await tabState();
        check('blank-line file opens clean (not dirty)', [s.active.dirty, s.active.syntaxOK], [false, true]);
        await ev(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'Clock.dawn').click());
        await sleep(300);
        await ev(() => { // close the Console tab so downstream tab counts stay unchanged
            const tab = [...document.querySelectorAll('#tabbar .tab')].find(t => t.querySelector('.tablabel').textContent === 'Console.dawn');
            tab.querySelector('.tabclose').click();
        });
        await sleep(300);

        // ── 4. flavor switch keeps the same canonical content (stays green) ──
        const before = await ev(() => activeTab.session.getValue());
        await page.select('#flavorSelect', 'Pure');
        await sleep(800);
        s = await tabState();
        check('switch to Pure applied', [s.selectValue, s.active.flavor], ['Pure', 'Pure']);
        check('pill dropdown mirrors the flavor', await ev(() => document.querySelector('#flavorDropdown .dropdown-option.show').textContent), 'DAWN:Pure');
        const pureText = await ev(() => activeTab.session.getValue());
        check('Pure shows canonical content', pureText.startsWith('Meta.documentation:Clock'), true);
        check('flavor switch does not dirty the tab', s.active.dirty, false);

        await page.select('#flavorSelect', 'BasicPretty');
        await sleep(800);
        s = await tabState();
        check('switch back to BasicPretty applied', [s.selectValue, s.active.flavor], ['BasicPretty', 'BasicPretty']);
        check('round-trip restores the edited text', await ev(() => activeTab.session.getValue()), before);
        check('round-trip still not dirty', s.active.dirty, false);

        // ── 5. real content edits → yellow; reverting content → green ──
        await ev(v => activeTab.session.setValue(v + '\nString:Hello>>Console:\n', -1), before);
        await sleep(900);
        s = await tabState();
        check('content change marks tab dirty (yellow)', [s.active.dirty, s.active.syntaxOK], [true, true]);
        await ev(v => activeTab.session.setValue(v, -1), before);
        await sleep(900);
        s = await tabState();
        check('reverting content returns to saved (green) — dirty is content-compared, not a flag', [s.active.dirty, s.active.syntaxOK], [false, true]);

        // ── 6. broken buffer → red, save disabled, flavor select disabled ──
        await ev(() => activeTab.session.setValue('[[[ broken &&& >>>', -1));
        await sleep(900);
        s = await tabState();
        check('broken buffer marks tab red', s.active.syntaxOK, false);
        check('save suspended while active tab is red', s.saveDisabled, true);
        check('flavor select suspended while any tab is red', s.selectDisabled, true);

        // ── 7. a red tab suspends flavor switching even on a good tab ──
        await ev(() => newFile());
        await sleep(600);
        s = await tabState();
        check('new empty tab opens fine alongside red tab', [s.count, s.active.syntaxOK], [3, true]);
        check('flavor select stays suspended on the good tab too', s.selectDisabled, true);

        // ── 8. closing the red tab re-enables flavor switching ──
        await ev(() => document.querySelector('.tab.error .tabclose').click()); // dirty red tab -> confirm() auto-accepted
        await sleep(600);
        s = await tabState();
        check('closing the red tab removes it', s.count, 2);
        check('flavor select re-enabled once no tab is red', s.selectDisabled, false);

        // ── 9. folder expansion fetches once (no duplicate entries race) ──
        await ev(() => [...document.querySelectorAll('#project li')].find(x => x.textContent.trim() === 'Content-Type').click());
        for (let i = 0; i < 5; i++) { // rapid open/close/open racing the in-flight GET
            await ev(() => document.querySelector('#project li span.caret').click());
            await sleep(40);
        }
        await sleep(800);
        const dupes = await ev(() => {
            const d = [];
            document.querySelectorAll('#project ul.nested').forEach(ul => {
                const seen = new Set();
                for (const ch of ul.children) {
                    if (ch.tagName !== 'LI') continue;
                    const t = ch.textContent.trim();
                    if (seen.has(t)) d.push(t);
                    seen.add(t);
                }
            });
            return d;
        });
        check('no duplicate tree entries after rapid folder toggling', dupes, []);

        const labelColors = await ev(() => ({
            green: getComputedStyle(document.querySelector('.tab .tablabel')).color !== 'rgb(255, 85, 85)',
            cssLoaded: !!getComputedStyle(document.querySelector('.icon-folder')).backgroundImage.includes('folder.svg')
        }));
        check('theme css drives tab + icon styling', labelColors, { green: true, cssLoaded: true });
    } catch (e) {
        console.log('FAIL: harness error', e.message);
        failures++;
    } finally {
        if (browser) await browser.close();
        server.kill();
    }
    console.log(`${successes} passed, ${failures} failed, ${skipped} skipped (integration)`);
    process.exit(failures ? 1 : 0);
})();
