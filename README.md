# 《蒋中正日记》数字影像采集工程

> 尽可能完整采集台湾国史馆开放的《蒋中正日记》（1917–1972）官方原始数字影像，
> 按「年份 / 典藏号」建立纯文件资料库，每件产出原始图片、原始图像 PDF、转稿 MD 与 metadata。

## 项目目标

- **官方原始影像第一优先**：忠实保存国史馆官方数字影像，不过度压缩、不加水印、不以 OCR 覆盖原图
- **每件一份 PDF + 一份转稿**：PDF 是最高证据等级，转稿仅辅助阅读
- **典藏号为核心标识**：目录以典藏号（如 `002-150101-00037-141`）命名，日期只进 metadata
- 纯文件系统管理，任何一件都可追溯到年份、日期、典藏号与国史馆原始页面

**明确不做**：数据库（SQLite/MySQL…）、全文检索、RAG / 向量库、复杂 Web UI。

## 数据来源

- 国史馆檔案史料文物查詢系統：<https://ahonline.drnh.gov.tw/>（第一优先级）
- 国史馆官网：<https://www.drnh.gov.tw/>
- 转稿辅助参考（非权威）：<https://github.com/mahavivo/Chiang-Kai-shek>

访问身份：**匿名访客，无账户**。若某环节强制要求登录，暂停并与用户商量，不做绕过。

## 仓库地址

- GitHub：<https://github.com/byte886/chiang-diary-kb>（公有；仅代码与文档，影像不入库）

## 当前状态

协议侦察与技术探测已完成：测试件 `002-150101-00037-141`（1947-04-09，1 页）
的「搜索 → 影像页 → 解锁 → 下载无水印原件」全链路已分别由浏览器与独立 HTTP client
双路径跑通并验证。详见 [下载协议技术报告](docs/download_protocol_report.md)。

## 目录概览

```text
.
├── code/                 Node 工程（package.json + scripts/）
│   └── scripts/          驱动、HTTP 复现、识别库、授权脚本
├── docs/                 方案、需求、流程、协议报告
├── project-management/   TASK_STATUS / ISSUES
├── logs/                 运行日志（站点源码、图标模板入库；其余不入库）
└── downloads/            采集到的影像（不入库）
```

批量阶段每件最终结构：

```text
YYYY/<典藏号>/
├── original/001.jpg ...     官方原始图片
├── <典藏号>.pdf             原始图像 PDF
├── <典藏号>.md              转稿（逐页对应）
└── metadata.json            来源 URL、下载协议、SHA-256、校验结果
```

## 快速开始

```bash
# 1. 安装依赖（Node >= 18；本机 Node 22）
cd code && npm install && cd ..

# 2. 确保代理可用（本机 ClashX Pro：http://127.0.0.1:7890）

# 3. 独立 HTTP client 复现测试件全链路（含本地视觉解锁）
node code/scripts/http_replay.js
```

浏览器参照路径（附加到已开的日常 Chrome，不另开浏览器）：

```bash
node code/scripts/pupp_full.js
```

## 常用查询话术

| 想知道 | 直接发送 |
|---|---|
| 当前任务进度 | `查询任务状态：当前进展到哪一步？` |
| 未决问题 | `查询问题：当前有哪些未解决的问题？` |
| 项目整体概览 | `给我一个项目整体状态总结` |
| 协议结论 | `下载协议判定结果是什么？依据呢？` |

AI 代理的执行规则见 [AGENTS.md](AGENTS.md)。
