#!/usr/bin/env python3
"""快速轮询 Chrome 远程调试授权弹窗并点击「允许」（区域截图，0.5s 轮询）。
用法: auto_allow.py [超时秒]
"""
import sys
import time
import subprocess
import numpy as np
from PIL import Image

TIMEOUT = int(sys.argv[1]) if len(sys.argv) > 1 else 300
SHOT = '/tmp/auto_allow_roi.png'
# 对话框 ROI（1920x1200 逻辑分辨率）
RX, Y, RW, RH = 760, 430, 460, 290


def detect_and_click():
    r = subprocess.run(
        ['screencapture', '-x', f'-R{RX},{Y},{RW},{RH}', SHOT],
        capture_output=True)
    if r.returncode != 0:
        return False
    im = np.array(Image.open(SHOT).convert('RGB')).astype(int)
    blue = (im[:, :, 2] > 180) & (im[:, :, 0] < 150) & (im[:, :, 1] < 190)
    ys, xs = np.nonzero(blue)
    if len(xs) < 100:
        return False
    xs_sorted = sorted(xs.tolist())
    clusters = []
    for x in xs_sorted:
        if clusters and x - clusters[-1][-1] <= 15:
            clusters[-1].append(x)
        else:
            clusters.append([x])
    btns = []
    for c in clusters:
        if len(c) > 20:
            m = (xs >= c[0]) & (xs <= c[-1])
            btns.append((RX + (c[0] + c[-1]) // 2,
                         Y + int(ys[m].mean())))
    if len(btns) >= 2:
        x, y = sorted(btns)[-1]
        subprocess.run(['cliclick', f'c:{x},{y}'], capture_output=True)
        print(f'{time.strftime("%H:%M:%S")} clicked allow {x},{y}', flush=True)
        return True
    return False


def main():
    t0 = time.time(); clicked = 0
    while time.time() - t0 < TIMEOUT:
        try:
            if detect_and_click():
                clicked += 1
                time.sleep(1.5)
        except Exception as e:
            print('warn:', e, flush=True)
        time.sleep(0.5)
    print(f'done, clicked {clicked}')


if __name__ == '__main__':
    main()
