// batch_download.js — 批量下载器（PHASE 5）
// 把 http_replay 的单对象链路工程化：独立会话/对象、并发 2、请求间隔 1-3s、
// 断点续传(download_status.jsonl + progress.json)、429/5xx 指数退避、校验门。
//
// 用法:
//   node batch_download.js --manifest <manifest.json|.jsonl> [--limit N] [--concurrency 2]
//   node batch_download.js --ids 002-150101-00037-141 [--limit N]
// manifest: JSON 数组 或 JSONL，每行/每项为 "典藏号" 或 {"store_no":"..."}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');
const { readInstruction, pickTarget } = require('./lib_unlock');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_ROOT = path.join(ROOT, 'downloads');
const SCRIPT_DIR = __dirname;
const STATE_DIR = path.join(ROOT, 'logs', 'batch');

const BASE = 'https://ahonline.drnh.gov.tw/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const PROXY = process.env.PROXY || 'http://127.0.0.1:7890';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------- HTTP client（每对象一个独立实例，会话隔离） ----------
function makeClient() {
  const dispatcher = new ProxyAgent(PROXY);
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
  function storeCookies(res) {
    let sc; try { sc = res.headers.getSetCookie(); } catch { sc = []; }
    for (const s of sc) {
      const part = s.split(';')[0], eq = part.indexOf('=');
      if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }
  async function go(url, opt = {}, hops = 0, attempt = 0) {
    if (hops > 10) throw new Error('too many redirects: ' + url);
    const headers = {
      'User-Agent': UA, Cookie: cookieHeader(),
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      ...(opt.headers || {}),
    };
    let res;
    try {
      res = await fetch(url, { dispatcher, ...opt, headers, redirect: 'manual' });
    } catch (e) {
      if (attempt >= 5) throw e;
      const w = 500 * 2 ** attempt; await sleep(w);
      return go(url, opt, hops, attempt + 1);
    }
    storeCookies(res);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`persistent ${res.status} at ${url}`);
      const ra = +(res.headers.get('retry-after') || 0) * 1000;
      const w = ra || 1000 * 2 ** attempt + rand(0, 500);
      await sleep(w);
      return go(url, opt, hops, attempt + 1);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      let loc = res.headers.get('location');
      if (loc.startsWith('/')) loc = BASE + loc.slice(1);
      else if (!loc.startsWith('http')) loc = BASE + loc;
      await sleep(rand(1000, 3000));
      return go(loc, opt, hops + 1, attempt);
    }
    return res;
  }
  return { go, jar };
}

// ---------- 校验门 ----------
function verifyJpeg(buf, expect) {
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg) return { ok: false, reason: 'not JPEG magic bytes' };
  let dec;
  try { dec = require('jpeg-js').decode(buf, { maxMemoryUsageMB: 4096 }); }
  catch (e) { return { ok: false, reason: 'undecodable: ' + e.message }; }
  if (expect && (expect.width && dec.width !== expect.width ||
      expect.height && dec.height !== expect.height))
    return { ok: false, reason: `size ${dec.width}x${dec.height} != ${expect.width}x${expect.height}`,
             width: dec.width, height: dec.height };
  return { ok: true, width: dec.width, height: dec.height };
}

// ---------- 搜索 URL ----------
function searchUrl(storeNo) {
  const payload = { query: [{ field: 'store_no', value: storeNo }],
    domconf: { query_history_content: 'block', post_query_content: 'block', facetsby: 'zong_name' } };
  return BASE + 'index.php?act=Archive/search/' +
    Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 从搜索 HTML 尝试解析年份（民国纪年 → 公元；失败返回 null）
function parseYear(html) {
  const m = html.match(/民國\s*(\d{2,3})\s*年/) || html.match(/(\d{2,3})\s*年/);
  if (m) return +m[1] + 1911;
  const d = html.match(/(19\d{2})\s*[-/年]/);
  return d ? +d[1] : null;
}

// ---------- 下载单个典藏对象 ----------
async function downloadObject(storeNo, ctx) {
  const { go } = makeClient();
  const sUrl = searchUrl(storeNo);
  const ev = { storeNo, started: new Date().toISOString(), pages: [], logs: [] };
  const L = (m) => { ev.logs.push(m); console.log(`[${storeNo}]`, m); };

  let res = await go(BASE + 'index.php?act=Archive');
  res = await go(sUrl, { headers: { Referer: BASE + 'index.php?act=Archive' } });
  const html = await res.text();
  const mAcc = html.match(/acckey=["']?([0-9a-f]{32})/i);
  if (!mAcc) throw new Error('acckey not found');
  const acckey = mAcc[1];
  ev.year = parseYear(html);

  res = await go(BASE + 'index.php', { method: 'POST',
    headers: postHeaders(sUrl),
    body: 'act=' + encodeURIComponent('Display/initial/' + acckey) });
  const init = JSON.parse(await res.text());
  if (!init.action) throw new Error('initial failed: ' + init.info);
  const objCode = init.data.resouse;
  const imagePageUrl = BASE + 'index.php?act=Display/' + init.data.display + '/' + objCode;

  res = await go(imagePageUrl, { headers: { Referer: sUrl } });

  res = await go(BASE + 'index.php', { method: 'POST',
    headers: postHeaders(imagePageUrl),
    body: 'act=' + encodeURIComponent('Display/built/' + objCode + '/') });
  const built = JSON.parse(await res.text());
  const b = built.data;
  const pageCount = b.page_count || 1;
  L(`year=${ev.year} pages=${pageCount} lock=${b.page_access_lock}`);

  const yearDir = String(ev.year || 'unknown-year');
  const outDir = path.join(DL_ROOT, yearDir, storeNo, 'original');
  fs.mkdirSync(outDir, { recursive: true });

  // 逐页：首页协议已验证；翻页（>1）协议待 PHASE 6 实测确认
  for (let p = 1; p <= pageCount; p++) {
    // 锁定/解锁（解锁粒度待确认：保守起见每页都走一次）
    res = await go(BASE + 'index.php', { method: 'POST',
      headers: postHeaders(imagePageUrl),
      body: 'act=' + encodeURIComponent('Display/built/' + objCode + '/' + (p > 1 ? String(p) : '')) });
    const bb = JSON.parse(await res.text()).data;
    const pageCode = bb.page_code_now;

    res = await go(BASE + 'index.php?act=Display/loadimg/' + pageCode,
      { headers: { Referer: imagePageUrl } });
    const lockedBuf = Buffer.from(await res.arrayBuffer());
    const lockedPath = path.join(LOG_DIR, `batch-locked-${storeNo.replace(/[\/]/g, '_')}-${p}.jpg`);
    fs.writeFileSync(lockedPath, lockedBuf);

    const inst = await readInstruction(lockedPath, `b-${storeNo.replace(/[\/]/g, '_')}-${p}`, SCRIPT_DIR, LOG_DIR);
    if (!inst.target) throw new Error('cannot read instruction (page ' + p + ')');
    const { pick } = pickTarget(lockedBuf, inst.target, LOG_DIR);
    if (!pick) throw new Error('target icon not found (page ' + p + ')');

    res = await go(BASE + 'index.php', { method: 'POST',
      headers: postHeaders(imagePageUrl),
      body: 'act=' + encodeURIComponent(`Display/unlock/${pick.px}/${pick.py}`) });
    const unlockText = await res.text();
    if (!/"action"\s*:\s*(true|1)\b/.test(unlockText))
      throw new Error('unlock failed (page ' + p + ')');

    res = await go(BASE + 'index.php?act=Display/loadimg/' + pageCode + '/original',
      { headers: { Referer: imagePageUrl } });
    const origBuf = Buffer.from(await res.arrayBuffer());
    const v = verifyJpeg(origBuf);
    if (!v.ok) throw new Error('verify failed page ' + p + ': ' + v.reason);

    const name = String(p).padStart(3, '0') + '.jpg';
    fs.writeFileSync(path.join(outDir, name), origBuf);
    ev.pages.push({ page: p, file: name, bytes: origBuf.length,
      width: v.width, height: v.height, sha256: sha(origBuf) });
    L(`page ${p}/${pageCount} ok ${v.width}x${v.height} ${origBuf.length}B`);
    await sleep(rand(1000, 3000));
  }

  // metadata
  const metadata = {
    store_no: storeNo, year: ev.year, page_count: pageCount,
    source: { search_url: sUrl, object_code: objCode },
    downloaded_at: new Date().toISOString(),
    pages: ev.pages,
  };
  fs.writeFileSync(path.join(DL_ROOT, yearDir, storeNo, 'metadata.json'),
    JSON.stringify(metadata, null, 2));
  ev.status = 'done';
  return ev;
}

function postHeaders(referer) {
  return {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    Referer: referer,
  };
}

// ---------- 状态持久化（断点续传） ----------
function loadManifest() {
  const argv = process.argv.slice(2);
  const get = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  let ids = [];
  const mf = get('--manifest');
  if (mf) {
    const txt = fs.readFileSync(mf, 'utf8').trim();
    if (mf.endsWith('.jsonl'))
      ids = txt.split('\n').map((l) => { const t = l.trim(); if (!t) return null;
        try { const o = JSON.parse(t); return o.store_no || o; } catch { return t; } });
    else
      ids = JSON.parse(txt).map((o) => (typeof o === 'string' ? o : o.store_no));
  }
  const ii = argv.indexOf('--ids');
  if (ii >= 0) {
    const rest = argv.slice(ii + 1);
    const next = rest.findIndex((a) => a.startsWith('--'));
    ids = (next >= 0 ? rest.slice(0, next) : rest);
  }
  const li = argv.indexOf('--limit');
  const limit = li >= 0 ? +argv[li + 1] : null;
  const ci = argv.indexOf('--concurrency');
  const concurrency = ci >= 0 ? +argv[ci + 1] : 2;
  if (limit) ids = ids.slice(0, limit);
  return { ids: ids.filter(Boolean), concurrency };
}

function ensureState() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const statusPath = path.join(STATE_DIR, 'download_status.jsonl');
  const progressPath = path.join(STATE_DIR, 'progress.json');
  if (!fs.existsSync(statusPath)) fs.writeFileSync(statusPath, '');
  return { statusPath, progressPath };
}
function doneSet(statusPath) {
  const done = new Set();
  for (const l of fs.readFileSync(statusPath, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { const o = JSON.parse(l); if (o.status === 'done') done.add(o.storeNo); } catch {}
  }
  return done;
}
function appendStatus(p, o) { fs.appendFileSync(p, JSON.stringify(o) + '\n'); }
function writeProgress(pathFile, total, finished, failed) {
  fs.writeFileSync(pathFile, JSON.stringify(
    { updated: new Date().toISOString(), total, finished: finished.length,
      failed: failed.length, finished, failed }, null, 2));
}

// ---------- 并发池（对象级，独立会话隔离） ----------
async function runPool(items, concurrency, worker) {
  const q = [...items], out = [];
  async function lane() {
    while (q.length) { const it = q.shift(); out.push(await worker(it)); }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return out;
}

(async () => {
  const { ids, concurrency } = loadManifest();
  if (!ids.length) { console.error('no ids: use --manifest or --ids'); process.exit(1); }
  const { statusPath, progressPath } = ensureState();
  const skip = doneSet(statusPath);
  const todo = ids.filter((id) => !skip.has(id));
  console.log(`total=${ids.length} skip(done)=${skip.size} todo=${todo.length} concurrency=${concurrency}`);

  const finished = [...skip], failed = [];
  await runPool(todo, concurrency, async (storeNo) => {
    try {
      const ev = await downloadObject(storeNo, {});
      appendStatus(statusPath, ev); finished.push(storeNo);
    } catch (e) {
      const rec = { storeNo, status: 'error', error: e.message, at: new Date().toISOString() };
      appendStatus(statusPath, rec); failed.push(storeNo);
      console.error(`[${storeNo}] ERROR`, e.message);
    }
    writeProgress(progressPath, ids.length, finished, failed);
  });
  console.log(`DONE finished=${finished.length} failed=${failed.length}`);
  process.exit(failed.length ? 4 : 0);
})().catch((e) => { console.error('BATCH FATAL', e); process.exit(2); });
