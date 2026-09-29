// Puppeteer 驱动（单 WebSocket 连接，只弹一次授权）
// 搜索 → 线上阅览 → Display 影像页 → 点击"下载影像" → 捕获文件
const puppeteer = require('puppeteer-core');
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
  console.log('[p] connecting', wsEndpoint.slice(30, 70));
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsEndpoint,
    defaultViewport: null,
    protocolTimeout: 120000,
  });

  const logFile = path.join(LOG_DIR, 'network-puppeteer.jsonl');
  const write = (o) => fs.appendFileSync(logFile, JSON.stringify(o) + '\n');

  // 浏览器级下载行为（经 browser-level CDP session）
  const bcdp = await browser.target().createCDPSession();
  await bcdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
  });
  bcdp.on('Browser.downloadWillBegin', (e) =>
    write({ t: new Date().toISOString(), kind: 'downloadWillBegin', ...e }));
  bcdp.on('Browser.downloadProgress', (e) =>
    write({ t: new Date().toISOString(), kind: 'downloadProgress', ...e }));

  const wire = async (page, tag) => {
    page.on('request', (r) => write({
      t: new Date().toISOString(), tag, kind: 'request',
      method: r.method(), url: r.url(), headers: r.headers(),
      postData: r.postData() || null, rtype: r.resourceType()
    }));
    page.on('requestfailed', (r) => write({
      t: new Date().toISOString(), tag, kind: 'failed',
      url: r.url(), failure: r.failure()
    }));
    page.on('response', async (res) => {
      const rec = {
        t: new Date().toISOString(), tag, kind: 'response',
        status: res.status(), url: res.url(), headers: res.headers()
      };
      try {
        const ct = (res.headers()['content-type'] || '').toLowerCase();
        if (/json/.test(ct)) {
          const b = await res.buffer();
          if (b.length <= 3e6) rec.body = b.toString('utf8');
        }
      } catch (e) { rec.bodyError = e.message; }
      write(rec);
    });
    // 该页的下载事件也注册一次（无害）
    const c = await page.target().createCDPSession().catch(() => null);
    if (c) {
      await c.send('Browser.setDownloadBehavior', {
        behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
      }).catch(() => {});
      c.on('Browser.downloadWillBegin', (e) =>
        write({ t: new Date().toISOString(), kind: 'downloadWillBegin', ...e }));
      c.on('Browser.downloadProgress', (e) =>
        write({ t: new Date().toISOString(), kind: 'downloadProgress', ...e }));
    }
  };

  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const p = await target.page().catch(() => null);
      if (p) {
        console.log('[p] targetcreated page:', p.url());
        await wire(p, 'popup');
      }
    }
  });

  const page = await browser.newPage();
  await wire(page, 'main');

  // ---- 搜索 ----
  await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive', {
    waitUntil: 'load', timeout: 90000
  });
  await new Promise((r) => setTimeout(r, 2500));
  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  const t = opts.find((o) => o.t === '典藏號');
  await page.select('#search_field', t.v);
  await page.type('#search_input', CATALOG);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {}),
    page.click('#search_submit'),
  ]);
  await new Promise((r) => setTimeout(r, 4000));

  const onlineEls = await page.$$eval('.online', (es) => es.map((e) => ({
    acckey: e.getAttribute('acckey'), text: e.textContent.trim().slice(0, 40)
  })));
  const idx = onlineEls.findIndex((e) => e.acckey && e.acckey.length === 32);
  if (idx < 0) throw new Error('no acckey');
  console.log('[p] click .online');

  const [viewer] = await Promise.all([
    new Promise((resolve) => {
      browser.on('targetcreated', async function h(target) {
        if (target.type() === 'page') {
          browser.off('targetcreated', h);
          resolve(await target.page());
        }
      });
    }),
    page.$$('.online').then((es) => es[idx].click()),
  ]);
  await viewer.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 8000));
  console.log('[p] viewer url:', viewer.url());
  await viewer.screenshot({ path: path.join(LOG_DIR, 'pupp-viewer.png') });

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
  fs.writeFileSync(path.join(LOG_DIR, 'pupp-viewer-dom.json'),
    JSON.stringify(viewerDom, null, 2));
  console.log('[p] viewer scripts:', viewerDom.scripts);

  const dlCandidates = viewerDom.clickables
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.text.includes('下載') || c.text.includes('下载'));
  console.log('[p] download candidates:', JSON.stringify(dlCandidates));

  if (dlCandidates.length) {
    const pick0 = dlCandidates.find(({ c }) => c.text.includes('影像')) || dlCandidates[0];
    console.log('[p] click download:', pick0.c.text, 'index', pick0.i);
    const handles = await viewer.$$('button,a,[role=button],[onclick],.btn,.online');
    await handles[pick0.i].click().catch((e) => console.log('click err', e.message));
    await new Promise((r) => setTimeout(r, 15000));
    await viewer.screenshot({ path: path.join(LOG_DIR, 'pupp-after-download.png') });
  } else {
    console.log('[p] NO download button found');
  }

  const states = [];
  for (const p of await browser.pages()) {
    states.push(await p.evaluate(() => ({
      url: location.href, title: document.title,
      body: document.body.innerText.slice(0, 600)
    })).catch((e) => ({ err: e.message })));
  }
  fs.writeFileSync(path.join(LOG_DIR, 'pupp-final-pages.json'),
    JSON.stringify(states, null, 2));

  browser.disconnect();
  console.log('[p] disconnected');
})().catch((e) => { console.error('PUPP ERROR', e); process.exit(1); });
