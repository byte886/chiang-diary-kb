// 解锁驱动：进入影像页 → 识别锁定图中的地球 → 点击解锁 → 下载无水印原图
// 并遍历该件全部页，判定解锁粒度（session/object/page）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_DIR = path.join(ROOT, 'downloads');
const CATALOG = '002-150101-00037-141';

// ---------- 图像匹配（模板库分类法）----------
function greenMaskFromRGBA(w, h, data) {
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (g > 170 && r < 140 && b < 140) m[i] = 1;
  }
  return m;
}

function components(mask, w, h, minSize = 200) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0; stack[sp++] = i; seen[i] = 1;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    while (sp) {
      const p = stack[--sp];
      const x = p % w, y = (p / w) | 0;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np2 = ny * w + nx;
          if (mask[np2] && !seen[np2]) { seen[np2] = 1; stack[sp++] = np2; }
        }
    }
    if (n >= minSize)
      out.push({ n, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, x0, y0, x1, y1 });
  }
  return out;
}

function resizeMask(mask, w, h, x0, y0, x1, y1, S = 64) {
  const out = new Uint8Array(S * S);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const sx = x0 + Math.floor(i * bw / S), sy = y0 + Math.floor(j * bh / S);
      if (mask[sy * w + sx]) out[j * S + i] = 1;
    }
  return out;
}

function rotateMask(m, ang, S = 64) {
  const out = new Uint8Array(S * S);
  const c = (S - 1) / 2, rad = ang * Math.PI / 180;
  const co = Math.cos(rad), si = Math.sin(rad);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const dx = i - c, dy = j - c;
      const sx = Math.round(c + dx * co + dy * si);
      const sy = Math.round(c - dx * si + dy * co);
      if (sx >= 0 && sy >= 0 && sx < S && sy < S && m[sy * S + sx])
        out[j * S + i] = 1;
    }
  return out;
}

function maskIoU(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++;
    if (a[i] || b[i]) uni++;
  }
  return uni ? inter / uni : 0;
}

function tplFromPng(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const m = greenMaskFromRGBA(p.width, p.height, p.data);
  const cs = components(m, p.width, p.height);
  let X0 = p.width, Y0 = p.height, X1 = 0, Y1 = 0;
  for (const c of cs) {
    X0 = Math.min(X0, c.x0); Y0 = Math.min(Y0, c.y0);
    X1 = Math.max(X1, c.x1); Y1 = Math.max(Y1, c.y1);
  }
  return resizeMask(m, p.width, p.height, X0, Y0, X1, Y1);
}

// 模板库：earth + 已收集诱饵
const TPL_DIR = path.join(LOG_DIR, 'templates');
const TPL_BANK = {
  earth: tplFromPng(path.join(TPL_DIR, 'earth.png')),
  gear: tplFromPng(path.join(TPL_DIR, 'c1.png')),
  yinyang: tplFromPng(path.join(TPL_DIR, 'c2.png')),
  clock: tplFromPng(path.join(TPL_DIR, 'c4.png')),
  mandala: tplFromPng(path.join(TPL_DIR, 'iconA.png')),
  basketball: tplFromPng(path.join(TPL_DIR, 'iconB.png')),
  gear2: tplFromPng(path.join(TPL_DIR, 'iconD.png')),
};
const ANGLES = Array.from({ length: 24 }, (_, i) => i * 15);

function bestIoUAgainstBank(cm) {
  const scores = {};
  for (const [name, t] of Object.entries(TPL_BANK)) {
    let best = 0;
    for (const a of ANGLES) best = Math.max(best, maskIoU(cm, rotateMask(t, a)));
    scores[name] = best;
  }
  return scores;
}

function locateEarth(jpgBuf) {
  const dec = jpeg.decode(jpgBuf, { maxMemoryUsageMB: 4096 });
  const mask = greenMaskFromRGBA(dec.width, dec.height, dec.data);
  const raw = components(mask, dec.width, dec.height, 800);
  // 聚合邻近碎片（同一图标的环/芯）
  const merged = [];
  for (const c of raw) {
    const g = merged.find((m) => Math.hypot(m.cx - c.cx, m.cy - c.cy) < 160);
    if (g) {
      g.x0 = Math.min(g.x0, c.x0); g.y0 = Math.min(g.y0, c.y0);
      g.x1 = Math.max(g.x1, c.x1); g.y1 = Math.max(g.y1, c.y1);
      g.cx = (g.x0 + g.x1) / 2; g.cy = (g.y0 + g.y1) / 2;
    } else merged.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, cx: c.cx, cy: c.cy });
  }
  const unmatched = [];
  for (const m of merged) {
    const cm = resizeMask(mask, dec.width, dec.height, m.x0, m.y0, m.x1, m.y1);
    const scores = bestIoUAgainstBank(cm);
    const decoyBest = Math.max(...Object.entries(scores)
      .filter(([k]) => k !== 'earth').map(([, v]) => v));
    const overall = Math.max(...Object.values(scores));
    if (overall < 0.65) unmatched.push({ m, scores });
  }
  if (unmatched.length !== 1)
    return { error: `unmatched=${unmatched.length}`, unmatched: unmatched.map((u) => ({
      cx: Math.round(u.m.cx), cy: Math.round(u.m.cy),
      scores: Object.fromEntries(Object.entries(u.scores).map(([k, v]) => [k, +v.toFixed(2)]))
    })) };
  const { m } = unmatched[0];
  return {
    px: Math.round(m.cx / dec.width * 100),
    py: Math.round(m.cy / dec.height * 100),
  };
}

// ---------- 主流程 ----------
function readWSEndpoint() {
  const f = path.join(os.homedir(),
    'Library/Application Support/Google/Chrome/DevToolsActivePort');
  const [port, ws] = fs.readFileSync(f, 'utf8').trim().split('\n');
  return `ws://127.0.0.1:${port}${ws}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: readWSEndpoint(), defaultViewport: null, protocolTimeout: 120000
  });
  const ctx = browser;
  const netLog = path.join(LOG_DIR, 'network-unlock.jsonl');
  fs.writeFileSync(netLog, '');
  const write = (o) => fs.appendFileSync(netLog, JSON.stringify(o) + '\n');

  const bcdp = await browser.target().createCDPSession();
  await bcdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
  });
  const downloads = new Map();
  let dlSeq = 0;
  const dlWaiters = [];
  bcdp.on('Browser.downloadWillBegin', (e) => {
    downloads.set(e.guid, { state: 'inProgress', file: e.suggestedFilename });
    write({ kind: 'downloadWillBegin', url: e.url, file: e.suggestedFilename });
  });
  bcdp.on('Browser.downloadProgress', (e) => {
    const d = downloads.get(e.guid);
    if (d) { d.state = e.state; }
    if (e.state === 'completed' || e.state === 'cancelled')
      write({ kind: 'downloadProgress', state: e.state, file: d && d.file });
  });

  const wire = (page, tag) => {
    page.on('response', async (res) => {
      const url = res.url();
      let body = null;
      const ct = (res.headers()['content-type'] || '');
      if (/json/.test(ct) && /index\.php/.test(url)) {
        try { body = (await res.text()).slice(0, 200000); } catch {}
      }
      write({ tag, kind: 'response', status: res.status(), url, body });
    });
    page.on('requestfailed', (r) =>
      write({ tag, kind: 'failed', url: r.url(), failure: r.failure() }));
  };

  const page = await browser.newPage();
  wire(page, 'main');

  // ---- 搜索 ----
  await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive',
    { waitUntil: 'load', timeout: 90000 });
  await sleep(2500);
  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  await page.select('#search_field', opts.find((o) => o.t === '典藏號').v);
  await page.type('#search_input', CATALOG);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {}),
    page.click('#search_submit'),
  ]);
  await sleep(4000);
  const idx = (await page.$$eval('.online', (es) =>
    es.map((e) => (e.getAttribute('acckey') || '').length))).findIndex((l) => l === 32);
  if (idx < 0) throw new Error('no acckey');

  const [viewer] = await Promise.all([
    new Promise((resolve) => {
      browser.on('targetcreated', async function h(t) {
        if (t.type() === 'page') { browser.off('targetcreated', h); resolve(await t.page()); }
      });
    }),
    page.$$('.online').then((es) => es[idx].click()),
  ]);
  wire(viewer, 'viewer');
  await viewer.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  console.log('[u] viewer:', viewer.url());

  // 等待并抓取最近一次 built 响应
  async function lastBuilt() {
    // 直接在网络日志里找最新 built body
    const lines = fs.readFileSync(netLog, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const o = JSON.parse(lines[i]);
      if (o.body && o.body.includes('Display/built') === false && o.body.includes('page_access_lock'))
        return JSON.parse(o.body);
    }
    return null;
  }

  async function builtState() {
    // built 响应体里 data 即 object_built
    const lines = fs.readFileSync(netLog, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      let o; try { o = JSON.parse(lines[i]); } catch { continue; }
      if (o.body && o.body.includes('page_access_lock')) {
        try { return JSON.parse(o.body); } catch {}
      }
    }
    return null;
  }

  let built = await builtState();
  console.log('[u] initial built: action=%s lock=%s page_count=%s',
    built && built.action,
    built && built.data && built.data.page_access_lock,
    built && built.data && built.data.page_count);

  // 对每一页：若锁定则解锁，然后下载 original
  const pageList = built.data.page_list; // { "1": code, ... }
  const report = [];
  let pageNum = 0;
  for (const [label, code] of Object.entries(pageList)) {
    pageNum++;
    console.log('[u] ---- page', label, code);
    if (code !== built.data.page_code_now) {
      // 切换页：模拟 UI
      await viewer.evaluate((c) => { location.hash = '#' + c; Built_Image_Area(); }, code);
      await sleep(5000);
      built = await builtState();
    }
    let lock = parseInt(built.data.page_access_lock);
    const initiallyLocked = !!lock;

    if (lock) {
      // 抓取锁定显示图
      const imgBuf = await viewer.evaluate(async (c) => {
        const r = await fetch('index.php?act=Display/loadimg/' + c);
        return Array.from(new Uint8Array(await r.arrayBuffer()));
      }, code);
      fs.writeFileSync(path.join(LOG_DIR, `locked-page${label}.jpg`), Buffer.from(imgBuf));
      const loc = locateEarth(Buffer.from(imgBuf));
      console.log('[u] earth locate:', JSON.stringify(loc));
      if (!loc) throw new Error('earth not found page ' + label);

      const box = await viewer.$eval('#ImageObject', (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const before = fs.statSync(netLog).size;
      await viewer.mouse.click(
        box.x + box.w * loc.px / 100, box.y + box.h * loc.py / 100);
      // 等 unlock 响应
      let unlocked = false;
      for (let w = 0; w < 40; w++) {
        await sleep(500);
        const txt = fs.readFileSync(netLog, 'utf8').slice(before);
        if (txt.includes('"action":true') || txt.includes('"action": true')) { unlocked = true; break; }
        if (txt.includes('"action":false')) break;
      }
      console.log('[u] unlock post success:', unlocked);
      // JS reload：轮询等待新的 built 响应
      await sleep(8000);
      built = await builtState();
      lock = parseInt(built.data.page_access_lock);
      console.log('[u] after unlock lock =', lock);
    }

    // 下载 original
    const filesBefore = new Set(fs.readdirSync(DL_DIR));
    await viewer.click('#act_image_saved');
    // 等待新文件完成
    let doneFile = null;
    for (let w = 0; w < 60; w++) {
      await sleep(1000);
      const cur = fs.readdirSync(DL_DIR);
      const finished = cur.filter((f) => !f.endsWith('.crdownload') && !filesBefore.has(f));
      const inprog = cur.some((f) => f.endsWith('.crdownload'));
      if (finished.length && !inprog) { doneFile = finished[0]; break; }
    }
    console.log('[u] page', label, 'downloaded:', doneFile);
    report.push({ label, code, initiallyLocked, file: doneFile });
    await viewer.screenshot({ path: path.join(LOG_DIR, `unlock-page${label}.png`) });
  }

  fs.writeFileSync(path.join(LOG_DIR, 'unlock-report.json'), JSON.stringify(report, null, 2));
  browser.disconnect();
  console.log('[u] disconnected');
})().catch((e) => { console.error('UNLOCK ERROR', e); process.exit(1); });
