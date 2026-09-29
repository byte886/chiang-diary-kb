# AGENTS.md — AI 代理操作手册

> 本项目 AI 代理的操作手册，命令式、可执行；与 README.md（给人看的介绍）互补。
> 动手前先按「冷启动 / 续接」路径读取，核心规则见第 2 章。

## 1. 冷启动 / 续接路径

- **冷启动**（首次接触 / 跨阶段 / 没把握），按序读：
  1. `README.md` — 项目目标、边界、目录与快速开始
  2. `docs/HANDOFF.md` — 环境 bootstrap 与交接验收（跨环境时优先）
  3. `docs/REQUIREMENTS.md` — 需求、验收标准、年份策略
  4. `docs/download_protocol_report.md` — 已验证的下载协议（权威）
  5. `docs/WORKFLOW.md` — 批量流程与下载器约定
- **续接**：读 `project-management/TASK_STATUS.md` + `ISSUES.md`，再按需深读。
- 不靠对话记忆猜测；ObjectCode/PageCode 每次会话变化，禁止硬编码。

## 2. 核心规则（必须遵守）

1. **官方原始影像第一优先**：原图不修改、不额外加水印、不降低分辨率、不以 OCR 覆盖；
   PDF 忠实封装官方影像。官方若直接给 PDF 则原样保存、不重新生成。
2. **不建数据库 / 全文检索 / RAG / 向量库 / 复杂 Web UI**；状态用
   `download_status.jsonl` 与 `progress.json`，元数据用 `metadata.json`。
3. **匿名访问、无账户**：出现强制登录、验证码、明确禁止自动化时立即**暂停并商量**，
   不绕过访问控制（不破解、不伪造）。
4. **解锁挑战识别顺序固定**：先识别斜的黄色文字得知目标图标，再定位该图标；
   每次目标随机，绝不假定。
5. **解锁请求与页面点击等价**：POST `Display/unlock/<px>/<py>`；成功响应
   `"action":1`（数字 1，不是 true；失败为假）。
6. **校验门**（HTTP 200 不等于成功）：
   - Content-Type 为图片类型；Magic Bytes（JPEG `FF D8 FF`）
   - 文件大小在合理区间；实际可解码、尺寸与 built 信息一致
   - 每个文件计算并记录 SHA-256
   - **跨会话 SHA 允许不同**：服务端 gd-jpeg 逐请求重编码存在非确定性；
     重下载一致性以「尺寸一致 + 解码像素一致率 ≥ 99.5%」判定
7. **下载器纪律**：初始并发 2、请求间隔 1–3 秒；支持断点续传、超时、429/5xx
   指数退避重试、下载日志；稳定前不调参。
8. **范围纪律**：只做用户要求的事，不自行扩展；批量顺序
   1 件 → 10 件 → 1947 → 1917–1954（跳过 1924）。

## 3. 关键文件

| 文件 | 作用 |
|---|---|
| `code/scripts/http_replay.js` | 独立 HTTP client 全链路复现（DIRECT_HTTP 主路径） |
| `code/scripts/pupp_full.js` | 浏览器参照驱动（附加日常 Chrome，含授权自动处理） |
| `code/scripts/lib_unlock.js` | 共享识别库：黄色指令 OCR + 绿色图标分类 |
| `code/scripts/prep_yellow.py` | 黄色文字提取、转正预处理 |
| `code/scripts/ocr_yellow` | Vision OCR（已编译二进制；源码 ocr_yellow.swift） |
| `code/scripts/extract_tpl.js` | 从锁定图提取新图标模板 |
| `code/scripts/press_allow.applescript` 等 | Chrome 远程调试授权 sheet 自动 AXPress |
| `logs/templates/` | 图标模板库（运行时依赖，已入库） |

## 4. 常用命令

```bash
# 装依赖
(cd code && npm install)

# HTTP 全链路复现测试件
node code/scripts/http_replay.js

# 浏览器参照路径（不另开 Chrome；收尾自动 disconnect）
node code/scripts/pupp_full.js

# 手动识别锁定图黄色文字
python3 code/scripts/prep_yellow.py <locked.jpg> /tmp/y
code/scripts/ocr_yellow /tmp/y-a.png
```

## 5. 异常处理

- **出现词表/模板库外的新图标**（或一次出现 2 个未匹配候选）：
  1. 保存该锁定图样本；
  2. 用 `extract_tpl.js` 提取目标图标为 `logs/templates/<name>.png`；
  3. 在 `lib_unlock.js` 的 bank 与 TARGET_MAP 中登记；
  4. 重跑验证后再继续批量。
- 已确认图标（7 类）：Earth 地球、TaiChi 太極、Clock 時鐘、Gear 齒輪、
  Basketball 籃球、Mandala 曼陀、Tire 輪胎。
- 连接日常 Chrome 弹「要允许远程调试吗？」：官方设计、每次连接一次、无法永久关闭；
  由 800ms 串行 AXPress 循环自动处理（合成坐标点击只关窗、不真正授权，禁止使用）。
- 网络/DNS 失败：确认代理（127.0.0.1:7890）；curl 直连与走代理的 302 循环均为已知死路。

## 6. 安全与收尾

- Cookie / token / 会话值不回显对话、不写进入库文件（网络 jsonl 不入库）；
  对话中只报 YES/NO 与名称。
- 接管用户已开的 Chrome，收尾用 `disconnect()`/detach，**禁止 close/kill**。
- 不移动、不删除用户原有文件；批量影像只落 `downloads/`（不入库）。
