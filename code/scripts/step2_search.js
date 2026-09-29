// STEP 2：选择"典藏號"字段，搜索 002-150101-00037-141，导出结果列表
const path = require('path');
const fs = require('fs');
const { attachNetwork, launchContext, LOG_DIR } = require('./recon-lib');

const CATALOG = '002-150101-00037-141';

(async () => {
  const logFile = path.join(LOG_DIR, 'network-step2.jsonl');
  const ctx = await launchContext(false);
  attachNetwork(ctx, logFile);
  const page = ctx.pages()[0] || await ctx.newPage();

  if (!page.url().includes('act=Archive')) {
    await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive', {
      waitUntil: 'load', timeout: 90000
    });
    await page.waitForTimeout(3000);
  }

  // 找到"典藏號"选项的 value
  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  const target = opts.find((o) => o.t === '典藏號');
  console.log('[step2] 典藏號 option value =', target.v);
  await page.selectOption('#search_field', target.v);
  await page.fill('#search_input', CATALOG);
  await page.screenshot({ path: path.join(LOG_DIR, 'step2-before-search.png') });

  await page.click('#search_submit');
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  await page.screenshot({ path: path.join(LOG_DIR, 'step2-results.png') });

  const dump = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table')).map((t) =>
      Array.from(t.rows).slice(0, 60).map((r) =>
        Array.from(r.cells).map((c) => c.innerText.trim().slice(0, 150))));
    const links = Array.from(document.querySelectorAll('a'))
      .filter((a) => a.innerText.trim())
      .slice(0, 150)
      .map((a) => ({ text: a.innerText.trim().slice(0, 80), href: a.getAttribute('href') }));
    return {
      url: location.href, title: document.title,
      body: document.body.innerText.slice(0, 2500), tables, links
    };
  });
  fs.writeFileSync(path.join(LOG_DIR, 'step2-results.json'),
    JSON.stringify(dump, null, 2));
  console.log('URL:', dump.url);
  console.log(dump.body);
  await ctx.close();
})().catch((e) => { console.error(e); process.exit(1); });
