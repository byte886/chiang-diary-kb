// lib_unlock.js — 锁定图识别共享库：黄色指令 OCR + 绿色图标分类
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { execFile } = require('child_process');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exec = (cmd, args) => new Promise((resolve, reject) =>
  execFile(cmd, args, { maxBuffer: 8 * 1024 * 1024 }, (e, stdout, stderr) =>
    e ? reject(new Error(`${cmd}: ${e.message} ${stderr}`)) : resolve(stdout)));

// ---------- 绿色图标 ----------
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

function buildBank(logDir) {
  const td = path.join(logDir, 'templates');
  return {
    earth: tplFromPng(path.join(td, 'earth.png')),
    gear: tplFromPng(path.join(td, 'c1.png')),
    yinyang: tplFromPng(path.join(td, 'c2.png')),
    clock: tplFromPng(path.join(td, 'c4.png')),
    mandala: tplFromPng(path.join(td, 'iconA.png')),
    basketball: tplFromPng(path.join(td, 'iconB.png')),
    gear2: tplFromPng(path.join(td, 'iconD.png')),
    tire: tplFromPng(path.join(td, 'tire.png')),
  };
}
const ANG = Array.from({ length: 24 }, (_, i) => i * 15);

function classifyIcons(jpgBuf, logDir) {
  const bank = buildBank(logDir);
  const dec = jpeg.decode(jpgBuf, { maxMemoryUsageMB: 4096 });
  const mask = greenMask(dec.width, dec.height, dec.data);
  const raw = components(mask, dec.width, dec.height, 800);
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
    for (const [name, t] of Object.entries(bank)) {
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

// ---------- 黄色指令 ----------
const TARGET_MAP = [
  [/tai\s*ch|taich|taiji|太[極极]/i, 'yinyang'],
  [/earth|globe|地球/i, 'earth'],
  [/clock|時鐘|时钟/i, 'clock'],
  [/gear|齒輪|齿轮/i, 'gear'],
  [/basketball|籃球|篮球/i, 'basketball'],
  [/tire|輪胎|轮胎/i, 'tire'],
  [/mandala|曼陀/i, 'mandala'],
];
async function readInstruction(lockedJpg, tag, scriptDir, logDir) {
  const prefix = path.join(logDir, `replay-yellow-${tag}`);
  await exec('python3', [path.join(scriptDir, 'prep_yellow.py'), lockedJpg, prefix]);
  let text = '';
  for (const cand of ['a', 'b'])
    text += '\n' + await exec(path.join(scriptDir, 'ocr_yellow'), [`${prefix}-${cand}.png`]);
  for (const [re, key] of TARGET_MAP) if (re.test(text)) return { target: key, text };
  return { target: null, text };
}

// 给定锁定图，返回要点击的 px/py
function pickTarget(jpgBuf, target, logDir) {
  const icons = classifyIcons(jpgBuf, logDir);
  let pick;
  if (target === 'earth') {
    pick = icons.find((ic) => Object.entries(ic.scores)
      .filter(([k]) => k !== 'earth').every(([, v]) => v < 0.6));
  } else {
    pick = icons.find((ic) => ic.scores[target] >= 0.6);
  }
  return { pick, icons };
}

module.exports = { readInstruction, classifyIcons, pickTarget, sleep };
