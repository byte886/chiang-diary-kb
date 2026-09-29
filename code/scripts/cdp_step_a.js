// CDP-A：附加到已运行的日常 Chrome（WS 端点现读），搜索 → 线上阅览 → 进入 Display 影像页
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
  console.log('[a] connecting CDP', wsEndpoint.slice(0, 45), '...');
  const browser = await chromium.connectOverCDP(wsEndpoint);
  const ctx = browser.contexts()[0];
  console.log('[a] existing tabs:');
  for (const p of ctx.pages()) console.log('  -', p.url().slice(0, 100));

  const logFile = path.join(LOG_DIR, 'network-cdp-a.jsonl');
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
  let cdp = await ctx.newCDPSession(page);
  await cdp.send('Page.setDownloadBehavior', {
    behavior: 'allow', downloadPath: DL_DIR
  }).catch((e) => console.log('dl behavior err', e.message));

  page.on('popup', async (p) => {
    console.log('[a] popup opened, wire it');
    wire(p, 'popup');
    const c2 = await ctx.newCDPSession(p);
    await c2.send('Page.setDownloadBehavior', {
      behavior: 'allow', downloadPath: DL_DIR
    }).catch(() => {});
  });

  await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive', {
    waitUntil: 'load', timeout: 90000
  });
  await page.waitForTimeout(3000);

  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  const t = opts.find((o) => o.t === '典藏號');
  await page.selectOption('#search_field', t.v);
  await page.fill('#search_input', CATALOG);
  await page.click('#search_submit');
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const onlineEls = await page.$$eval('.online', (es) => es.map((e) => ({
    tag: e.tagName, cls: e.className,
    acckey: e.getAttribute('acckey'),
    text: e.textContent.trim().slice(0, 60),
    outer: e.outerHTML.slice(0, 300)
  })));
  fs.writeFileSync(path.join(LOG_DIR, 'cdp-a-online-els.json'),
    JSON.stringify(onlineEls, null, 2));
  console.log('[a] .online count:', onlineEls.length);

  const idx = onlineEls.findIndex((e) => e.acckey && e.acckey.length === 32);
  if (idx < 0) throw new Error('no valid .online acckey');

  const popupP = page.waitForEvent('popup', { timeout: 20000 });
  await page.locator('.online').nth(idx).click();
  const popup = await popupP;
  console.log('[a] viewer popup initial:', popup.url());
  await popup.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await popup.waitForTimeout(8000);
  console.log('[a] viewer final:', popup.url());

  await popup.screenshot({
    path: path.join(LOG_DIR, 'cdp-a-viewer.png')
  }).catch(() => {});

  const viewer = await popup.evaluate(() => {
    const pick = (s) => Array.from(document.querySelectorAll(s)).slice(0, 150)
      .map((e) => ({
        tag: e.tagName, id: e.id,
        cls: (e.className || '').toString(), type: e.type || '',
        text: (e.innerText || e.value || '').trim().slice(0, 80),
        onclick: e.getAttribute('onclick'), href: e.getAttribute('href')
      }));
    return {
      url: location.href, title: document.title,
      scripts: Array.from(document.scripts).map((s) => s.src).filter(Boolean),
      body: document.body.innerText.slice(0, 1500),
      clickables: pick('button,a,[role=button],[onclick],.btn,.online')
    };
  });
  fs.writeFileSync(path.join(LOG_DIR, 'cdp-a-viewer-dom.json'),
    JSON.stringify(viewer, null, 2));
  console.log('[a] viewer url:', viewer.url);
  console.log('[a] viewer scripts:');
  viewer.scripts.forEach((s) => console.log('  ', s));
  console.log(viewer.body.slice(0, 900));

  browser.disconnect();
  console.log('[a] disconnected, Chrome kept open');
})().catch((e) => { console.error(e); process.exit(1); });
