// 一体化驱动：搜索 → 影像页 → 识别黄色指令 → 定位目标图标 → 解锁 → 下载无水印原图
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jpeg = require('jpeg-js');
const { execFile } = require('child_process');
const { closeTabsByUrl } = require('./tab_hygiene');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_DIR = path.join(ROOT, 'downloads');
const SCRIPT_DIR = __dirname;
const CATALOG = '002-150101-00037-141';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exec = (cmd, args) => new Promise((resolve, reject) =>
  execFile(cmd, args, { maxBuffer: 8 * 1024 * 1024 }, (e, stdout, stderr) =>
    e ? reject(new Error(`${cmd}: ${e.message} ${stderr}`)) : resolve(stdout)));

// ---------- 绿色图标分类 ----------
function greenMask(w, h, data) {
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (g > 170 && r < 140 && b < 140) m[i] = 1;
  }
  return m;
}
function components(mask, w, h, minSize = 200) {
  const seen = new Uint8Array(w * h), out = [];
  const stack = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0; stack[sp++] = i; seen[i] = 1;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p / w) | 0;
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
  const out = new Uint8Array(S * S), bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const sx = x0 + Math.floor(i * bw / S), sy = y0 + Math.floor(j * bh / S);
      if (mask[sy * w + sx]) out[j * S + i] = 1;
    }
  return out;
}
function rotateMask(m, ang, S = 64) {
  const out = new Uint8Array(S * S), c = (S - 1) / 2;
  const rad = ang * Math.PI / 180, co = Math.cos(rad), si = Math.sin(rad);
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
function iou(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++;
    if (a[i] || b[i]) uni++;
  }
  return uni ? inter / uni : 0;
}
function tplFromPng(file) {
  const { PNG } = require('pngjs');
  const p = PNG.sync.read(fs.readFileSync(file));
  const m = greenMask(p.width, p.height, p.data);
  const cs = components(m, p.width, p.height);
  let X0 = p.width, Y0 = p.height, X1 = 0, Y1 = 0;
  for (const c of cs) {
    X0 = Math.min(X0, c.x0); Y0 = Math.min(Y0, c.y0);
    X1 = Math.max(X1, c.x1); Y1 = Math.max(Y1, c.y1);
  }
  return resizeMask(m, p.width, p.height, X0, Y0, X1, Y1);
}
const TPL = {
  earth: tplFromPng(path.join(LOG_DIR, 'templates/earth.png')),
  gear: tplFromPng(path.join(LOG_DIR, 'templates/c1.png')),
  yinyang: tplFromPng(path.join(LOG_DIR, 'templates/c2.png')),
  clock: tplFromPng(path.join(LOG_DIR, 'templates/c4.png')),
  mandala: tplFromPng(path.join(LOG_DIR, 'templates/iconA.png')),
  basketball: tplFromPng(path.join(LOG_DIR, 'templates/iconB.png')),
  gear2: tplFromPng(path.join(LOG_DIR, 'templates/iconD.png')),
};
const ANG = Array.from({ length: 24 }, (_, i) => i * 15);

function classifyIcons(jpgBuf) {
  const dec = jpeg.decode(jpgBuf, { maxMemoryUsageMB: 4096 });
  const mask = greenMask(dec.width, dec.height, dec.data);
  const raw = components(mask, dec.width, dec.height, 800);
  // 聚合邻近碎片
  const merged = [];
  for (const c of raw) {
    const g = merged.find((m) => Math.hypot(m.cx - c.cx, m.cy - c.cy) < 160);
    if (g) {
      g.x0 = Math.min(g.x0, c.x0); g.y0 = Math.min(g.y0, c.y0);
      g.x1 = Math.max(g.x1, c.x1); g.y1 = Math.max(g.y1, c.y1);
      g.cx = (g.x0 + g.x1) / 2; g.cy = (g.y0 + g.y1) / 2;
    } else merged.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, cx: c.cx, cy: c.cy });
  }
  return merged.map((m) => {
    const cm = resizeMask(mask, dec.width, dec.height, m.x0, m.y0, m.x1, m.y1);
    const scores = {};
    for (const [name, t] of Object.entries(TPL)) {
      let best = 0;
      for (const a of ANG) best = Math.max(best, iou(cm, rotateMask(t, a)));
      scores[name] = +best.toFixed(3);
    }
    return {
      px: Math.round(m.cx / dec.width * 100),
      py: Math.round(m.cy / dec.height * 100), scores
    };
  });
}

// ---------- 黄色指令 OCR ----------
const TARGET_MAP = [
  [/tai\s*ch|taich|taiji|太[極极]/i, 'yinyang'],
  [/earth|globe|地球/i, 'earth'],
  [/clock|時鐘|时钟/i, 'clock'],
  [/gear|齒輪|齿轮/i, 'gear'],
  [/basketball|籃球|篮球/i, 'basketball'],
  [/mandala|曼陀/i, 'mandala'],
];
async function readInstruction(lockedJpg, tag) {
  const prefix = path.join(LOG_DIR, `yellow-${tag}`);
  await exec('python3', [path.join(SCRIPT_DIR, 'prep_yellow.py'), lockedJpg, prefix]);
  let text = '';
  for (const cand of ['a', 'b']) {
    text += '\n' + await exec(path.join(SCRIPT_DIR, 'ocr_yellow'), [`${prefix}-${cand}.png`]);
  }
  for (const [re, key] of TARGET_MAP) if (re.test(text)) return { target: key, text };
  return { target: null, text };
}

// ---------- 主流程 ----------
const PRESS_LOCKED = path.join(SCRIPT_DIR, 'press_allow_locked.sh');

function captureFrontmost() {
  try {
    return require('child_process').execFileSync('osascript',
      ['-e', 'tell application "System Events" to name of first process whose frontmost is true'],
      { encoding: 'utf8' }).trim();
  } catch { return ''; }
}

// 串行授权点击循环（同一时刻最多一个 osascript；800ms 一次，AXPress sheet 上的「允许」）
function startPressLoop(restoreTo) {
  let stopped = false, inFlight = false, timer = null, child = null;
  const runOnce = () => new Promise((resolve) => {
    const t0 = Date.now();
    child = execFile('bash', [PRESS_LOCKED, restoreTo || ''], { timeout: 4000 },
      (err, stdout) => {
        child = null;
        resolve({ pressed: !err && /pressed=true/.test(stdout || ''), cost: Date.now() - t0 });
      });
  });
  async function tick() {
    if (stopped || inFlight) return schedule();
    inFlight = true;
    try {
      const r = await runOnce();
      if (process.env.DEBUG_CDP) console.log('[press]', r.pressed, r.cost);
    } finally { inFlight = false; schedule(); }
  }
  function schedule() { if (!stopped) timer = setTimeout(tick, 800); }
  tick();
  return function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (child) { try { child.kill(); } catch {} child = null; }
  };
}

function readWSEndpoint() {
  const f = path.join(os.homedir(),
    'Library/Application Support/Google/Chrome/DevToolsActivePort');
  const [port, ws] = fs.readFileSync(f, 'utf8').trim().split('\n');
  return `ws://127.0.0.1:${port}${ws}`;
}

async function connectWithConsent(retries = 5) {
  const restoreTo = captureFrontmost();
  const stopPress = startPressLoop(restoreTo);
  try {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: readWSEndpoint(), defaultViewport: null,
          targetFilter: () => true, handleDevToolsAsPage: true,
          protocolTimeout: 120000
        });
        console.log('[f] connected on attempt', attempt);
        return browser;
      } catch (e) {
        lastErr = e;
        console.log('[f] connect attempt', attempt, 'failed:', e.message);
        await sleep(1200);
      }
    }
    throw lastErr;
  } finally {
    stopPress();
  }
}

(async () => {
  const browser = await connectWithConsent();
  // 开新页前清理上轮残留（只关 URL 命中本流程特征的标签，用户原有标签不动）
  const stale = await closeTabsByUrl(browser, ['act=Display/image', 'act=Archive/search']);
  if (stale) console.log('[tabs] 关闭 %s 个上轮残留标签', stale);
  const mine = new Set();
  try {
  const netLog = path.join(LOG_DIR, 'network-full.jsonl');
  fs.writeFileSync(netLog, '');
  const write = (o) => fs.appendFileSync(netLog, JSON.stringify(o) + '\n');

  const bcdp = await browser.target().createCDPSession();
  await bcdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: DL_DIR, eventsEnabled: true
  });
  bcdp.on('Browser.downloadWillBegin', (e) =>
    write({ kind: 'downloadWillBegin', url: e.url, file: e.suggestedFilename }));
  bcdp.on('Browser.downloadProgress', (e) =>
    write({ kind: 'downloadProgress', state: e.state }));

  const wire = (page, tag) => {
    page.on('response', async (res) => {
      const ct = res.headers()['content-type'] || '';
      let body = null;
      if (/json/.test(ct) && /index\.php/.test(res.url()))
        try { body = (await res.text()).slice(0, 200000); } catch {}
      write({ tag, kind: 'response', status: res.status(), url: res.url(), body });
    });
  };

  const page = await browser.newPage();
  mine.add(page);
  wire(page, 'main');
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
  mine.add(viewer);
  await viewer.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  console.log('[f] viewer:', viewer.url());

  const builtState = async () => {
    const lines = fs.readFileSync(netLog, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      let o; try { o = JSON.parse(lines[i]); } catch { continue; }
      if (o.body && o.body.includes('page_access_lock'))
        try { return JSON.parse(o.body); } catch {}
    }
    return null;
  };

  let built = await builtState();
  console.log('[f] lock=%s pages=%s', built.data.page_access_lock, built.data.page_count);
  const report = [];

  for (const [label, code] of Object.entries(built.data.page_list)) {
    console.log('[f] ---- page', label, code);
    if (code !== built.data.page_code_now) {
      await viewer.evaluate((c) => { location.hash = '#' + c; Built_Image_Area(); }, code);
      await sleep(6000);
      built = await builtState();
    }
    let lock = parseInt(built.data.page_access_lock);

    if (lock) {
      const imgBytes = await viewer.evaluate(async (c) => {
        const r = await fetch('index.php?act=Display/loadimg/' + c);
        return Array.from(new Uint8Array(await r.arrayBuffer()));
      }, code);
      const lockedPath = path.join(LOG_DIR, `locked-${label}.jpg`);
      fs.writeFileSync(lockedPath, Buffer.from(imgBytes));

      const inst = await readInstruction(lockedPath, label);
      console.log('[f] instruction target:', inst.target);
      if (!inst.target) throw new Error('cannot read instruction: ' + inst.text.slice(0, 300));

      const icons = classifyIcons(Buffer.from(imgBytes));
      let pick;
      if (inst.target === 'earth') {
        pick = icons.find((ic) => Object.entries(ic.scores)
          .filter(([k]) => k !== 'earth').every(([, v]) => v < 0.6));
      } else {
        pick = icons.find((ic) => ic.scores[inst.target] >= 0.6);
      }
      console.log('[f] icons:', JSON.stringify(icons.map((i) => ({ px: i.px, py: i.py }))));
      if (!pick) throw new Error('target icon not found: ' + inst.target);
      console.log('[f] unlock target at', pick.px, pick.py);

      // 直接在页面内发送与点击完全相同的 unlock POST（更确定性，不依赖鼠标焦点）
      const unlockText = await viewer.evaluate(async (px, py) => {
        const body = new URLSearchParams({ act: 'Display/unlock/' + px + '/' + py });
        const r = await fetch('index.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        return await r.text();
      }, pick.px, pick.py);
      console.log('[f] unlock response:', unlockText.slice(0, 200));
      const unlocked = /"action"\s*:\s*(true|1)\b/.test(unlockText);
      if (unlocked) {
        await viewer.reload({ waitUntil: 'networkidle0' }).catch(() => {});
        await sleep(9000);
        built = await builtState();
        console.log('[f] lock after reload =', built.data.page_access_lock);
      }
      if (!unlocked) throw new Error('unlock failed: ' + unlockText.slice(0, 200));
    }

    // 下载无水印 original（CDP 下载会覆盖同名文件，故同时记录 mtime，不能只看新文件名）
    const stat0 = new Map(fs.readdirSync(DL_DIR).map((f) => {
      try { return [f, fs.statSync(path.join(DL_DIR, f)).mtimeMs]; } catch { return [f, 0]; }
    }));
    await viewer.click('#act_image_saved');
    let done = null;
    for (let w = 0; w < 90; w++) {
      await sleep(1000);
      const cur = fs.readdirSync(DL_DIR);
      if (cur.some((f) => f.endsWith('.crdownload'))) continue;
      const changed = cur.filter((f) => {
        let mt = 0;
        try { mt = fs.statSync(path.join(DL_DIR, f)).mtimeMs; } catch {}
        return !stat0.has(f) || mt > (stat0.get(f) || 0);
      });
      if (changed.length) { done = changed[0]; break; }
    }
    console.log('[f] downloaded:', done);
    report.push({ label, code, wasLocked: !!lock, file: done });
    await viewer.screenshot({ path: path.join(LOG_DIR, `full-page${label}.png`) });
  }

  fs.writeFileSync(path.join(LOG_DIR, 'full-report.json'), JSON.stringify(report, null, 2));
  } finally {
    // 收尾：关闭本轮打开的全部标签（archive + viewer），用户原有标签与窗口不动
    let n = 0;
    for (const p of mine) {
      try { if (!p.isClosed()) { await p.close(); n++; } } catch {}
    }
    console.log('[tabs] 已关闭本轮标签 %s 个', n);
    browser.disconnect();
    console.log('[f] disconnected');
  }
})().catch((e) => { console.error('FULL ERROR', e); process.exit(1); });
