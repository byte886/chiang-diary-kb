// STEP 1：打开国史馆站点，记录落地过程，截图并导出页面可交互元素
const path = require('path');
const { attachNetwork, launchContext, LOG_DIR } = require('./recon-lib');

(async () => {
  const logFile = path.join(LOG_DIR, 'network-step1.jsonl');
  const ctx = await launchContext(false);
  attachNetwork(ctx, logFile);

  const page = ctx.pages()[0] || await ctx.newPage();
  console.log('[step1] goto ahonline...');
  await page.goto('https://ahonline.drnh.gov.tw/', {
    waitUntil: 'load', timeout: 90000
  });
  await page.waitForTimeout(8000);

  await page.screenshot({
    path: path.join(LOG_DIR, 'step1-landing.png'), fullPage: false
  });

  const info = await page.evaluate(() => {
    const pick = (s) => Array.from(document.querySelectorAll(s)).slice(0, 100).map((e) => ({
      tag: e.tagName,
      type: e.type || '',
      id: e.id || '',
      name: e.name || '',
      text: (e.innerText || e.value || '').trim().slice(0, 80),
      cls: (e.className || '').toString().slice(0, 80)
    }));
    return {
      url: location.href,
      title: document.title,
      bodyTextHead: document.body.innerText.slice(0, 500),
      inputs: pick('input,select,textarea'),
      clickables: pick('button,a,[role=button],[onclick],.btn')
    };
  });
  fs_write(info);
  console.log(JSON.stringify(info, null, 2));
  await ctx.close();
})().catch((e) => { console.error(e); process.exit(1); });

function fs_write(info) {
  const fs = require('fs');
  fs.writeFileSync(path.join(LOG_DIR, 'step1-dom.json'),
    JSON.stringify(info, null, 2));
}
