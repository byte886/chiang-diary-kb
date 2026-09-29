// CDP 驱动：一次连接内完成 搜索 → 线上阅览 → Display 影像页 → 点击"下载影像" → 捕获文件
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_DIR = path.join(ROOT, 'downloads');
const CATALOG = '002-150101-00037-141';

function readWSEndpoint() {
  const f = path.join(os.homedir(),
    'Library/Application Support/Google/Chrome/DevToolsActivePort');
  const [port, ws] = fs.readFileSync(f, 'utf8').trim().split('\n');
  return `ws://127.0.0.1:${port}${ws}`;
}

(async () => {
  const wsEndpoint = readWSEndpoint();
  console.log('[d] connecting', wsEndpoint.slice(30, 70));
  const browser = await chromium.connectOverCDP(wsEndpoint, { timeout: 120000 });
  const ctx = browser.contexts()[0];

  const logFile = path.join(LOG_DIR, 'network-cdp-driver.jsonl');
  const write = (o) => fs.appendFileSync(logFile, JSON.stringify(o) + '\n');

  const wire = (page, tag) => {
    page.on('request', (r) => write({
      t: new Date().toISOString(), tag, kind: 'request',
      method: r.method(), url: r.url(), headers: r.headers(),
      postData: r.postData() || null, rtype: r.resourceType()
    }));
    page.on('response', async (res) => {
      const rec = {
        t: new Date().toISOString(), tag, kind: 'response',
        status: res.status(), url: res.url(), headers: res.headers()
      };
      try {
        const ct = (res.headers()['content-type'] || '').toLowerCase();
        if (/json/.test(ct)) {
          const b = await res.body();
          if (b.length <= 3e6) rec.body = b.toString('utf8');
        }
      } catch (e) { rec.bodyError = e.message; }
      write(rec);
    });
    page.on('requestfailed', (r) => write({
      t: new Date().toISOString(), tag, kind: 'failed',
      url: r.url(), failure: r.failure()
    }));
  };

  const page = await ctx.newPage();
  wire(page, 'main');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
  }).catch((e) => console.log('dl behavior:', e.message));
  cdp.on('Browser.downloadWillBegin', (e) =>
    write({ t: new Date().toISOString(), kind: 'downloadWillBegin', ...e }));
  cdp.on('Browser.downloadProgress', (e) =>
    write({ t: new Date().toISOString(), kind: 'downloadProgress', ...e }));

  ctx.on('page', async (p) => {
    console.log('[d] new page (popup):', p.url());
    wire(p, 'popup');
    const c2 = await ctx.newCDPSession(p);
    await c2.send('Browser.setDownloadBehavior', {
      behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
    }).catch(() => {});
    c2.on('Browser.downloadWillBegin', (e) =>
      write({ t: new Date().toISOString(), kind: 'downloadWillBegin', ...e }));
    c2.on('Browser.downloadProgress', (e) =>
      write({ t: new Date().toISOString(), kind: 'downloadProgress', ...e }));
  });

  // ---- 搜索 ----
  await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive', {
    waitUntil: 'load', timeout: 90000
  });
  await page.waitForTimeout(2500);
  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  const t = opts.find((o) => o.t === '典藏號');
  await page.selectOption('#search_field', t.v);
  await page.fill('#search_input', CATALOG);
  await page.click('#search_submit');
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const onlineEls = await page.$$eval('.online', (es) => es.map((e) => ({
    acckey: e.getAttribute('acckey'), text: e.textContent.trim().slice(0, 40)
  })));
  const idx = onlineEls.findIndex((e) => e.acckey && e.acckey.length === 32);
  if (idx < 0) throw new Error('no acckey');
  console.log('[d] click .online, acckey len 32');

  const popupP = page.waitForEvent('popup', { timeout: 20000 });
  await page.locator('.online').nth(idx).click();
  const viewer = await popupP;
  await viewer.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await viewer.waitForTimeout(8000);
  console.log('[d] viewer url:', viewer.url());
  await viewer.screenshot({ path: path.join(LOG_DIR, 'driver-viewer.png') });

  const viewerDom = await viewer.evaluate(() => {
    const pick = (s) => Array.from(document.querySelectorAll(s)).slice(0, 200)
      .map((e) => ({
        tag: e.tagName, id: e.id,
        cls: (e.className || '').toString(), type: e.type || '',
        text: (e.innerText || e.value || '').trim().slice(0, 80),
        onclick: e.getAttribute('onclick'), href: e.getAttribute('href'),
        download: e.getAttribute('download')
      }));
    return {
      url: location.href, title: document.title,
      scripts: Array.from(document.scripts).map((s) => s.src).filter(Boolean),
      body: document.body.innerText.slice(0, 1200),
      clickables: pick('button,a,[role=button],[onclick],.btn,.online')
    };
  });
  fs.writeFileSync(path.join(LOG_DIR, 'driver-viewer-dom.json'),
    JSON.stringify(viewerDom, null, 2));
  console.log('[d] viewer scripts:', viewerDom.scripts);

  // ---- 找"下载影像"按钮 ----
  const dlCandidates = viewerDom.clickables
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.text.includes('下載') || c.text.includes('下载'));
  console.log('[d] download candidates:', JSON.stringify(dlCandidates));

  if (dlCandidates.length) {
    // 优先含"影像"的
    const pick0 = dlCandidates.find(({ c }) => c.text.includes('影像')) || dlCandidates[0];
    console.log('[d] click download button:', pick0.c.text, 'index', pick0.i);
    await viewer.locator('button,a,[role=button],[onclick],.btn,.online')
      .nth(pick0.i).click().catch((e) => console.log('click err', e.message));
    await viewer.waitForTimeout(15000);
    await viewer.screenshot({ path: path.join(LOG_DIR, 'driver-after-download.png') });
  } else {
    console.log('[d] NO download button found in viewer DOM');
  }

  // 汇总所有页面状态
  const states = [];
  for (const p of ctx.pages()) {
    states.push(await p.evaluate(() => ({
      url: location.href, title: document.title,
      body: document.body.innerText.slice(0, 600)
    })).catch((e) => ({ err: e.message })));
  }
  fs.writeFileSync(path.join(LOG_DIR, 'driver-final-pages.json'),
    JSON.stringify(states, null, 2));

  browser.disconnect();
  console.log('[d] disconnected');
})().catch((e) => { console.error('DRIVER ERROR', e); process.exit(1); });
