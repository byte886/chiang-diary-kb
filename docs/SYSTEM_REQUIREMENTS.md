# 系统要求（SYSTEM_REQUIREMENTS）

## 1. 平台

- macOS（本机实测）；网络经代理访问
- 磁盘：批量影像为多 GB，本机剩余空间充足（约 TB 级）

## 2. 运行时

| 组件 | 版本/说明 |
|---|---|
| Node.js | v22.23.2（要求 >= 18） |
| npm | 随 Node；依赖装在 `code/`（`cd code && npm install`） |
| Python | 系统 Python 3.14（仅用于 prep_yellow.py，标准库 + numpy/PIL） |
| OCR 用 Python | 需独立 **Python 3.12 venv**（3.14 不支持 onnxruntime/Paddle），OCR 阶段建立 |
| ClashX Pro | 代理 `http://127.0.0.1:7890`（端口以实际为准） |

## 3. Node 依赖（code/package.json）

- `undici`：HTTP client + ProxyAgent
- `jpeg-js`、`pngjs`：图像解码与模板读写
- `puppeteer-core`：附加已开的日常 Chrome（不下载 Chromium）
- `playwright`：早期侦察（已不作为主路径）

## 4. 本机工具

- `swiftc`：编译 ocr_yellow（Vision 框架，已提供编译好的二进制）
- 连接日常 Chrome：
  - Chrome 144+ 运行时远程调试（通道 B），端点现读
    `~/Library/Application Support/Google/Chrome/DevToolsActivePort`
  - 每次连接弹一次授权 sheet，由 press_allow 系列脚本 800ms 串行 AXPress
  - 不另开 Chrome；收尾 disconnect

## 5. 已知网络事实

- 直连国史馆 DNS 失败，必须走代理
- curl 走代理存在 302 循环，须真实请求链 + cookie（由 http_replay 复现）
- POST 无需 CSRF token；ObjectCode/PageCode 每次会话重新生成

## 6. OCR 阶段依赖（后续）

- 纯文字：RapidOCR PP-OCRv6（`rapidocr onnxruntime pymupdf`，Python 3.12）
- 表格/版式：PP-StructureV3；重型兜底：PaddleOCR-VL
- macOS Vision 为零安装兜底
