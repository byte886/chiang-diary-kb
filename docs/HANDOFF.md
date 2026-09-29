# 环境交接手册（HANDOFF）

> 目标读者：在**新环境**接手本项目的执行者（人或 AI）。按本文可从零恢复环境并独立执行。
> 配套 SOP：[sop/UNLOCK_VISION_SOP.md](sop/UNLOCK_VISION_SOP.md)、
> [sop/CHROME_CDP_SOP.md](sop/CHROME_CDP_SOP.md)。

## 1. 项目一句话

从国史馆「檔案史料文物查詢系統」完整采集《蒋中正日记》（1917–1972）官方原始数字影像，
按「年份/典藏号」建纯文件资料库，每件产出 original/ 原图 + PDF + 转稿 MD + metadata。
**不建数据库 / 全文检索 / RAG / 复杂 Web UI。**

- 仓库：<https://github.com/byte886/chiang-diary-kb>
- 数据源：<https://ahonline.drnh.gov.tw/>，匿名访客、**无账户**
- 当前阶段：协议侦察完成，测试件 `002-150101-00037-141` 双路径跑通；批量下载器待工程化

## 2. 环境 Bootstrap（按序执行）

```bash
# 0) 取代码
git clone git@github.com:byte886/chiang-diary-kb.git
cd chiang-diary-kb

# 1) Node（>= 18；开发机为 Node 22）
node -v
(cd code && npm install)

# 2) 代理（大陆环境必须；开发机 ClashX Pro）
curl -s -x http://127.0.0.1:7890 -o /dev/null -w "%{http_code}\n" \
  https://ahonline.drnh.gov.tw/index.php?act=Archive
# 期望 200/302；端口按实际代理改

# 3) Python（仅黄色文字预处理需要；标准库 + numpy + Pillow）
python3 -c "import numpy, PIL" 2>/dev/null || pip3 install numpy pillow

# 4) 磁盘：批量影像多 GB，确认空间
df -h .
```

OCR/转稿阶段才需要：独立 **Python 3.12 venv**（系统 3.13/3.14 不支持
onnxruntime/Paddle），见 [SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md)。

## 3. 冷启动阅读路径

1. `README.md` → 2. `docs/REQUIREMENTS.md` →
3. `docs/download_protocol_report.md`（协议权威）→
4. `docs/WORKFLOW.md` → 5. `project-management/TASK_STATUS.md`、`ISSUES.md`

## 4. 三条执行路径

| 路径 | 命令 | 用途 |
|---|---|---|
| **独立 HTTP（主路径）** | `node code/scripts/http_replay.js` | 不碰浏览器，cookie jar + 代理，含本地视觉解锁 |
| 浏览器参照 | `node code/scripts/pupp_full.js` | 附加日常 Chrome，人工可见；自动授权、自动关标签 |
| 视觉解锁细节 | 见 [sop/UNLOCK_VISION_SOP.md](sop/UNLOCK_VISION_SOP.md) | 黄字识别、图标分类、扩模板 |

验证成功的标准：拿到无水印原件（约 369.7KB、737×1087），
与基准件尺寸一致、解码像素一致率 ≥ 99.5%。

## 5. 接手后第一批动作

1. 跑通 §4 两条路径（各一次）
2. 把 http_replay 工程化为批量下载器：并发 2、间隔 1–3 秒、断点续传、
   429/5xx 退避、download_status.jsonl / progress.json、校验门
3. 10 件小规模验证（含解锁粒度判定：每页/每对象/每会话）
4. 再按 1947 → 1917–1954 扩展（1924 只放 README；1955–1972 未确认不采集）

## 6. 交接验收清单

- [ ] Node 依赖装好，http_replay 与 pupp_full 均跑通测试件
- [ ] 代理可用；知道无账户、不绕过访问控制
- [ ] 能独立完成「黄字识别 → 图标定位 → 解锁 → 校验」
- [ ] 知道 Chrome 授权 sheet 处理方式与标签页卫生
- [ ] 知道批量纪律、暂停条件与已验证死路（ISSUES.md）
- [ ] 影像只落 downloads/（不入库）；会话/cookie 不回显、不入库

## 7. 必须暂停并商量的情况

强制登录、验证码、明确禁止自动化；模板库外新图标且无法唯一确定；
一次出现 2 个未匹配候选。
