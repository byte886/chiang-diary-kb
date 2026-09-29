# 工作流程（WORKFLOW）

> 协议细节以 [download_protocol_report.md](download_protocol_report.md) 为权威；
> 需求口径见 [REQUIREMENTS.md](REQUIREMENTS.md)。

## 1. 总体阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| PHASE 0 | 环境检查（Node/Python/代理/磁盘） | 完成 |
| PHASE 1–2 | 打开站点、定位测试件 | 完成 |
| PHASE 3 | 捕获「下载影像」请求链 | 完成 |
| PHASE 4 | 独立 HTTP 复现、SHA/像素对比、协议报告 | 完成 |
| PHASE 5 | 工程化批量下载器 | 待开始 |
| PHASE 6–7 | 1 件 → 10 件验证稳定性 | 待开始 |
| PHASE 8–9 | 1947 全年 → 1917–1954（跳过 1924） | 待开始 |
| PHASE 10 | 每件 PDF / 转稿 / metadata 成品 | 待开始 |

## 2. 单件下载链路（DIRECT_HTTP）

1. `GET index.php?act=Archive` — 建立访客会话（手工 cookie jar）
2. `GET index.php?act=Archive/search/<base64>` — 典藏号搜索，取 32 位 acckey
3. `POST index.php`（`act=Display/initial/<acckey>`，XHR）
   → `data.resouse` = ObjectCode
4. `GET index.php?act=Display/image/<ObjectCode>` — 建立 Display 会话
5. `POST index.php`（`act=Display/built/<ObjectCode>/`）
   → lock、page_count、page_code_now、page_list
6. `GET .../Display/loadimg/<pagecode>` — 锁定挑战图
7. 本地视觉管线：
   - `prep_yellow.py` 提取并转正黄色文字 → `ocr_yellow` 读出目标图标名
   - `lib_unlock.classifyIcons` 绿色图标分类 → 得到目标 px/py
8. `POST index.php`（`act=Display/unlock/<px>/<py>`）→ `"action":1`
9. `GET .../Display/loadimg/<pagecode>/original` — 无水印原件
10. 校验：Content-Type、Magic Bytes、尺寸、大小、SHA-256；多页逐页重复
11. 落盘到 `downloads/`，写 `download_status.jsonl`

浏览器参照路径（pupp_full.js）流程相同，仅步骤 8 由页面内 fetch 完成、
连接期自动处理授权 sheet。

## 3. 批量控制

- 并发 2、间隔 1–3 秒；429/5xx 指数退避；单请求超时
- 断点续跑：启动时读 `download_status.jsonl`，跳过 complete、重跑 failed
- `progress.json` 按年汇总 total/completed/failed
- 顺序：测试件 → 10 件 → 1947 → 1917–1954；1924 只放 README；
  1955–1972 未确认不采集

## 4. 每件成品加工

1. original/ 原始图片核对（页数 = page_count、顺序 = page_list）
2. 图片按官方顺序合并为 `<典藏号>.pdf`（官方给 PDF 则原样保存）
3. 转稿：按优先级获取；无可靠来源则在独立 Python 3.12 venv 中 OCR，
   输出逐页对应 MD，不自动润色
4. 生成 metadata.json（URL、协议、SHA-256、转稿来源、校验结果）

## 5. 参考文档

- [下载协议技术报告](download_protocol_report.md)
- [需求说明](REQUIREMENTS.md)
- [目录结构](DIRECTORY_STRUCTURE.md)
- [系统要求](SYSTEM_REQUIREMENTS.md)
- 原始方案：[采集方案_v2.md](采集方案_v2.md)、[下载技术探测与批量下载方案](下载技术探测与批量下载方案.md)
