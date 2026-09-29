# manifests — 批量下载清单

`batch_download.js` 的输入清单，描述要采集哪些典藏对象。

## 格式

- `.json`：JSON 数组，元素为典藏号字符串，或 `{"store_no":"002-..."}`：
  ```json
  ["002-150101-00037-141", {"store_no": "002-150101-00037-142"}]
  ```
- `.jsonl`：每行一个典藏号或一个对象。

## 用法

```bash
node code/scripts/batch_download.js --manifest manifests/<file>.json [--limit N] [--concurrency 2]
node code/scripts/batch_download.js --ids 002-150101-00037-141
```

## 状态与断点续传（本地，不入库）

- `logs/batch/download_status.jsonl`：每对象一行（done/error），重跑自动跳过 done。
- `logs/batch/progress.json`：汇总 total/finished/failed。
- 影像落 `downloads/YYYY/<典藏号>/`，metadata.json 记录来源、SHA-256、尺寸。

## PHASE 6 待办

- 从站点检索 1947 年典藏号列表，构建 10 件小规模清单（`manifests/1947-pilot.json`），
  验证服务器稳定性、解锁粒度（每页/每对象/每会话）与多页对象翻页协议。
