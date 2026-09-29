// http_replay.js — 独立 HTTP client（undici + 代理 + 手工 cookie jar）复现完整链路，
// 判定 DIRECT_HTTP / BROWSER_REQUIRED，并与浏览器下载件做 SHA-256 对比。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ProxyAgent, fetch } = require('undici');
const { readInstruction, pickTarget } = require('./lib_unlock');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_DIR = path.join(ROOT, 'downloads');
const SCRIPT_DIR = __dirname;

const BASE = 'https://ahonline.drnh.gov.tw/';
const SEARCH_URL = BASE + 'index.php?act=Archive/search/' +
  'eyJxdWVyeSI6W3siZmllbGQiOiJzdG9yZV9ubyIsInZhbHVlIjoiMDAyLTE1MDEwMS0wMDAzNy0xNDEifV0sImRvbWNvbmYiOnsicXVlcnlfaGlzdG9yeV9jb250ZW50IjoiYmxvY2siLCJwb3N0X3F1ZXJ5X2NvbnRlbnQiOiJibG9jayIsImZhY2V0c2J5Ijoiem9uZ19uYW1lIn19';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const dispatcher = new ProxyAgent('http://127.0.0.1:7890');

const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
function storeCookies(res) {
  let sc;
  try { sc = res.headers.getSetCookie(); } catch { sc = []; }
  for (const s of sc) {
    const part = s.split(';')[0], eq = part.indexOf('=');
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

// 手工处理 302（保证每跳 cookie 都入 jar）
async function go(url, opt = {}, hops = 0) {
  if (hops > 10) throw new Error('too many redirects: ' + url);
  const headers = {
    'User-Agent': UA, Cookie: cookieHeader(),
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    ...(opt.headers || {}),
  };
  const res = await fetch(url, { dispatcher, ...opt, headers, redirect: 'manual' });
  storeCookies(res);
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    let loc = res.headers.get('location');
    if (loc.startsWith('/')) loc = BASE + loc.slice(1);
    else if (!loc.startsWith('http')) loc = BASE + loc;
    return go(loc, opt, hops + 1);
  }
  return res;
}

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const trace = [];
  const log = (m) => { console.log('[r]', m); trace.push(m); };

  // 1) 建会话
  let res = await go(BASE + 'index.php?act=Archive');
  log(`GET Archive -> ${res.status}, cookies=${jar.size}`);

  // 2) 搜索
  res = await go(SEARCH_URL, { headers: { Referer: BASE + 'index.php?act=Archive' } });
  const html = await res.text();
  log(`GET search -> ${res.status}, html=${html.length}`);
  const mAcc = html.match(/acckey=["']?([0-9a-f]{32})/i);
  if (!mAcc) throw new Error('acckey not found in search html');
  const acckey = mAcc[1];
  log(`acckey located (len ${acckey.length})`);

  // 3) Display/initial
  res = await go(BASE + 'index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: SEARCH_URL,
    },
    body: 'act=' + encodeURIComponent('Display/initial/' + acckey),
  });
  const init = JSON.parse(await res.text());
  log(`initial -> action=${init.action}, display=${init.data && JSON.stringify(init.data)}`);
  if (!init.action) throw new Error('initial failed: ' + init.info);
  // URL = Display/<data.display>/<data.resouse>；display="image"，resouse=ObjectCode
  const objCode = init.data.resouse;
  const imagePageUrl = BASE + 'index.php?act=Display/' + init.data.display + '/' + objCode;

  // 4) GET 影像页（建立 Display 会话）
  res = await go(imagePageUrl, { headers: { Referer: SEARCH_URL } });
  log(`GET image page -> ${res.status}`);

  // 5) built（page code 留空，由服务器给首页）
  res = await go(BASE + 'index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: imagePageUrl,
    },
    body: 'act=' + encodeURIComponent('Display/built/' + objCode + '/'),
  });
  const built = JSON.parse(await res.text());
  const b = built.data;
  log(`built -> lock=${b.page_access_lock} pages=${b.page_count} code=${b.page_code_now}`);

  const pageCode = b.page_code_now;
  // 6) 下载锁定图
  res = await go(BASE + 'index.php?act=Display/loadimg/' + pageCode,
    { headers: { Referer: imagePageUrl } });
  const lockedBuf = Buffer.from(await res.arrayBuffer());
  const lockedPath = path.join(LOG_DIR, 'replay-locked-1.jpg');
  fs.writeFileSync(lockedPath, lockedBuf);
  log(`locked img -> ${lockedBuf.length} bytes, sha=${sha(lockedBuf).slice(0, 16)}`);

  // 7) 识别指令 + 目标图标
  const inst = await readInstruction(lockedPath, 'replay1', SCRIPT_DIR, LOG_DIR);
  log(`instruction target=${inst.target}`);
  if (!inst.target) throw new Error('cannot read instruction');
  const { pick, icons } = pickTarget(lockedBuf, inst.target, LOG_DIR);
  log(`icons=${icons.length}, pick=${pick ? pick.px + ',' + pick.py : 'null'}`);
  if (!pick) throw new Error('target icon not found');

  // 8) unlock
  res = await go(BASE + 'index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: imagePageUrl,
    },
    body: 'act=' + encodeURIComponent(`Display/unlock/${pick.px}/${pick.py}`),
  });
  const unlock = await res.text();
  log(`unlock -> ${unlock.slice(0, 120)}`);
  if (!/"action"\s*:\s*(true|1)\b/.test(unlock)) throw new Error('unlock failed');

  // 9) 下载 original
  res = await go(BASE + 'index.php?act=Display/loadimg/' + pageCode + '/original',
    { headers: { Referer: imagePageUrl } });
  const origBuf = Buffer.from(await res.arrayBuffer());
  const replayPath = path.join(DL_DIR, 'replay-original.jpg');
  fs.writeFileSync(replayPath, origBuf);
  log(`original via HTTP -> ${origBuf.length} bytes`);

  // 10) SHA 对比浏览器件
  const browserPath = path.join(DL_DIR, '002-150101-00037-141-001.jpg');
  const browserBuf = fs.readFileSync(browserPath);
  const s1 = sha(origBuf), s2 = sha(browserBuf);
  log(`sha replay=${s1}`);
  log(`sha browser=${s2}`);
  log(`SHA EQUAL = ${s1 === s2}`);

  fs.writeFileSync(path.join(LOG_DIR, 'replay-trace.json'),
    JSON.stringify({ trace, shaReplay: s1, shaBrowser: s2 }, null, 2));
})().catch((e) => { console.error('REPLAY ERROR', e); process.exit(1); });
