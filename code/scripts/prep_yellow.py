#!/usr/bin/env python3
"""黄色指令文字预处理：提取黄像素 → 膨胀合并 → 去噪 → PCA 测角
→ 生成 ±两种转正候选（白底黑字）
用法: prep_yellow.py <locked.jpg> <outprefix>
输出 <outprefix>-a.png, <outprefix>-b.png，并在末行打印 JSON: {"angle":x}
"""
import sys
import json
import numpy as np
from PIL import Image
from collections import deque


def dilate(m, it=2):
    H, W = m.shape
    for _ in range(it):
        out = m.copy()
        ys, xs = np.nonzero(m)
        for y, x in zip(ys.tolist(), xs.tolist()):
            y0, y1 = max(0, y - 1), min(H, y + 2)
            x0, x1 = max(0, x - 1), min(W, x + 2)
            out[y0:y1, x0:x1] = True
        m = out
    return m


def big_components(m, minn=200):
    H, W = m.shape
    seen = np.zeros(m.shape, bool)
    keep = np.zeros(m.shape, bool)
    ys, xs = np.nonzero(m)
    pset = set(zip(ys.tolist(), xs.tolist()))
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        q = deque([(y, x)]); seen[y, x] = 1; cells = []
        while q:
            cy, cx = q.popleft(); cells.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if (ny, nx) in pset and not seen[ny, nx]:
                        seen[ny, nx] = 1; q.append((ny, nx))
        if len(cells) > minn:
            for cy, cx in cells:
                keep[cy, cx] = 1
    return keep


def main():
    src, outprefix = sys.argv[1], sys.argv[2]
    im = np.array(Image.open(src).convert('RGB')).astype(int)
    H, W, _ = im.shape
    R, G, B = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    m = (R > 170) & (G > 170) & (B < 130) & ((R + G - 2 * B) > 60)
    md = dilate(m, 2)
    keep = big_components(md)
    ys, xs = np.nonzero(keep)
    if len(xs) < 200:
        print("ERROR: too few yellow pixels", file=sys.stderr); sys.exit(2)
    pts = np.column_stack([xs, ys]).astype(float)
    c = pts - pts.mean(0)
    w, v = np.linalg.eigh(np.cov(c.T))
    d = v[:, np.argmax(w)]
    ang = np.degrees(np.arctan2(d[1], d[0]))
    if ang > 45:
        ang -= 180
    if ang < -45:
        ang += 180

    canvas = np.full((H, W, 3), 255, np.uint8)
    canvas[keep] = 0
    base = Image.fromarray(canvas)
    for tag, a in [('a', ang), ('b', -ang)]:
        pim = base.rotate(-a, expand=True, fillcolor=(255, 255, 255),
                          resample=Image.BICUBIC)
        arr = np.array(pim.convert('L'))
        dark = np.nonzero(arr < 120)
        y0, y1, x0, x1 = dark[0].min(), dark[0].max(), dark[1].min(), dark[1].max()
        pad = 40
        pim = pim.crop((max(0, x0 - pad), max(0, y0 - pad),
                        min(pim.width, x1 + pad), min(pim.height, y1 + pad)))
        sc = min(1.5, 3000 / max(pim.size))
        if sc != 1:
            pim = pim.resize((int(pim.width * sc), int(pim.height * sc)),
                             Image.LANCZOS)
        pim.save(f'{outprefix}-{tag}.png')
        print(f'{outprefix}-{tag}.png rot={-a:.2f} size={pim.size}')
    print(json.dumps({'angle': ang}))


if __name__ == '__main__':
    main()
