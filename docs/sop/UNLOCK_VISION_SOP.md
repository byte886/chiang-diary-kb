# SOP：锁定挑战视觉解锁

> 国史馆影像页在未解锁时返回「锁定图」：满铺水印 + 斜的黄色双语指令 + 4–6 个绿色图标。
> 必须**先识别黄色文字得知目标，再定位对应图标**，最后发 unlock 请求。

## 1. 流程总览

```text
锁定图（1400×2064）
  ├─ ① 黄色掩膜 → 膨胀合并 → PCA 测角 → ±转正候选
  │     → Vision OCR → 目标图标词（英文行为准）
  └─ ② 绿色掩膜 → 连通域 + 邻近碎片聚合 → 归一化 64×64
        → 对模板库旋转扫描取最大 IoU → 各候选每类得分
  ③ 按目标词选候选 → px/py（百分比坐标）
  ④ POST act=Display/unlock/<px>/<py> → "action":1
```

## 2. 命令行操作

```bash
# 黄色指令（输出两个转正候选 /tmp/y-a.png、/tmp/y-b.png）
python3 code/scripts/prep_yellow.py <locked.jpg> /tmp/y
code/scripts/ocr_yellow /tmp/y-a.png     # 二进制；英文行示例：
# Please login or click on the "TaiChi" icon in the picture...

# 整体识别 + 分类（脚本内自动完成；http_replay / pupp_full 已集成）
```

## 3. 颜色阈值

- 黄色：`R>170, G>170, B<130, (R+G-2B)>60`（核心色约 228,233,103）
- 绿色：`G>170 且 R<140 且 B<140`

## 4. 指令词 → 模板映射（正则均忽略大小写）

| 指令词 | key |
|---|---|
| tai ch / taich / taiji / 太極 | yinyang |
| earth / globe / 地球 | earth |
| clock / 時鐘 | clock |
| gear / 齒輪 | gear |
| basketball / 籃球 | basketball |
| mandala / 曼陀 | mandala |
| tire / 輪胎 / 轮胎 | tire |

模板位于 `logs/templates/`（已入库）。

## 5. 选择规则

- 普通目标：候选对该类得分 `≥ 0.6` 即选中
- earth 目标：选「所有非 earth 得分均 < 0.6」的唯一候选
  （地球有不同视角模板，避免误配）
- 旋转扫描：0–360° 每 15° 共 24 个角度取最大 IoU
- 诱饵对自身模板约 0.87–0.94；非目标通常 ≤ 0.43

## 6. 扩充新图标（出现词表/模板库外目标时）

1. 保存该锁定图样本到 logs/
2. 提取模板（坐标可从绿色候选列表中读出）：
   ```bash
   node code/scripts/extract_tpl.js <locked.jpg> logs/templates/<name>.png <px> <py>
   ```
3. 在 `code/scripts/lib_unlock.js`（http 路径）与 `pupp_full.js`（浏览器路径）
   的模板 bank 与 TARGET_MAP 中登记
4. 重跑验证（目标能唯一选中）后再继续批量

## 7. 注意事项

- 中文 OCR 行多乱码，仅作备份；以英文行目标词为准
- PCA 角度有符号歧义，必须生成 ± 两个转正候选
- 解锁成功响应是 `"action":1`（数字 1）；失败为假并弹提示
- 一次出现 2 个未匹配候选：暂停，不猜测
