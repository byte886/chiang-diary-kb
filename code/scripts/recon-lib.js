// 侦察共享库：启动 Chrome（走代理）、全量记录网络请求/响应、捕获下载事件
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'logs');
const DL_DIR = path.join(ROOT, 'downloads');
const USER_DATA = path.join(ROOT, '.userdata');
const PROXY = 'http://127.0.0.1:7890';

function ts() { return new Date().toISOString(); }

function attachNetwork(ctx, logFile) {
  const write = (obj) => {
    try { fs.appendFileSync(logFile, JSON.stringify(obj) + '\n'); } catch (e) {}
  };

  const wirePage = (page) => {
    page.on('download', (d) => write({
      t: ts(), kind: 'download-event', url: d.url(),
      suggested: d.suggestedFilename()
    }));
  };

  ctx.on('request', (req) => write({
    t: ts(), kind: 'request', method: req.method(), url: req.url(),
    headers: req.headers(), postData: req.postData() || null,
    rtype: req.resourceType()
  }));

  ctx.on('response', async (res) => {
    const rec = {
      t: ts(), kind: 'response', status: res.status(),
      url: res.url(), headers: res.headers()
    };
    try {
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (/json|text|javascript|xml/.test(ct) && !/html/.test(ct)) {
        const buf = await res.body();
        if (buf.length <= 2_000_000) rec.body = buf.toString('utf8');
      }
    } catch (e) { rec.bodyError = e.message; }
    write(rec);
  });

  ctx.on('requestfailed', (req) => write({
    t: ts(), kind: 'failed', method: req.method(),
    url: req.url(), failure: req.failure()
  }));

  ctx.on('page', wirePage);
  ctx.pages().forEach(wirePage);
  return write;
}

async function launchContext(headless = false) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(DL_DIR, { recursive: true });
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    channel: 'chrome',
    headless,
    proxy: { server: PROXY },
    acceptDownloads: true,
    viewport: null,
    args: ['--disable-blink-features=AutomationControlled']
  });
  return ctx;
}

module.exports = { attachNetwork, launchContext, LOG_DIR, DL_DIR, ROOT, ts };
