// STEP 3：解析结果条目结构，点击标题进入档案件（含影像页），捕获新窗口
const path = require('path');
const fs = require('fs');
const { attachNetwork, launchContext, LOG_DIR } = require('./recon-lib');

const CATALOG = '002-150101-00037-141';
const TITLE_TEXT = '蔣中正日記原本民國36年04月09日';

async function doSearch(page) {
  await page.goto('https://ahonline.drnh.gov.tw/index.php?act=Archive', {
    waitUntil: 'load', timeout: 90000
  });
  await page.waitForTimeout(2500);
  const opts = await page.$$eval('#search_field option', (os) =>
    os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  const target = opts.find((o) => o.t === '典藏號');
  await page.selectOption('#search_field', target.v);
  await page.fill('#search_input', CATALOG);
  await page.click('#search_submit');
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
}

(async () => {
  const logFile = path.join(LOG_DIR, 'network-step3.jsonl');
  const ctx = await launchContext(false);
  attachNetwork(ctx, logFile);
  const page = ctx.pages()[0] || await ctx.newPage();

  await doSearch(page);

  // 解析标题元素与"線上閱覽"元素
  const inspect = await page.evaluate((titleText) => {
    const describe = (e) => ({
      tag: e.tagName, id: e.id,
      cls: (e.className || '').toString(),
      onclick: e.getAttribute('onclick'),
      href: e.getAttribute('href'),
      outer: e.outerHTML.slice(0, 400),
      parent: e.parentElement ? {
        tag: e.parentElement.tagName, id: e.parentElement.id,
        cls: (e.parentElement.className || '').toString(),
        onclick: e.parentElement.getAttribute('onclick'),
        outer: e.parentElement.outerHTML.slice(0, 500)
      } : null
    });
    const leaves = Array.from(document.querySelectorAll('*'))
      .filter((e) => e.children.length === 0 && e.textContent.includes(titleText))
      .slice(0, 5).map(describe);
    const online = Array.from(document.querySelectorAll('*'))
      .filter((e) => e.children.length === 0 && e.textContent.trim() === '線上閱覽')
      .slice(0, 5).map(describe);
    return { leaves, online };
  }, TITLE_TEXT);
  fs.writeFileSync(path.join(LOG_DIR, 'step3-title-elements.json'),
    JSON.stringify(inspect, null, 2));
  console.log('[step3] title elements:', JSON.stringify(inspect, null, 2));

  // 点击标题，监听新窗口
  let popup = null;
  try {
    const evt = ctx.waitForEvent('page', { timeout: 12000 });
    await page.getByText(TITLE_TEXT).first().click();
    popup = await evt;
    console.log('[step3] new popup opened');
  } catch (e) {
    console.log('[step3] no popup, same-page navigation');
  }

  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);
  if (popup) {
    await popup.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await popup.waitForTimeout(6000);
  }

  const pages = ctx.pages();
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({
      path: path.join(LOG_DIR, `step3-page${i}.png`)
    }).catch(() => {});
  }
  const states = [];
  for (const p of pages) {
    const s = await p.evaluate(() => ({
      url: location.href, title: document.title,
      body: document.body.innerText.slice(0, 2000)
    })).catch((e) => ({ err: e.message }));
    states.push(s);
  }
  fs.writeFileSync(path.join(LOG_DIR, 'step3-pages.json'),
    JSON.stringify(states, null, 2));
  states.forEach((s, i) => console.log(`--- page ${i} ---`, s.url || s.err, '\n', (s.body || '').slice(0, 1200)));

  await ctx.close();
})().catch((e) => { console.error(e); process.exit(1); });
