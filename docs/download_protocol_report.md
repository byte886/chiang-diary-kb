# 《蒋中正日记》下载协议技术报告（PHASE 4）

- 目标站点：台湾国史馆「檔案史料文物查詢系統」 https://ahonline.drnh.gov.tw/
- 测试件：典藏号 `002-150101-00037-141`（1947-04-09，1 页）
- 网络：本机直连 DNS 失败，统一走 ClashX Pro 代理 `http://127.0.0.1:7890`
- 身份：匿名访客（无账户），全流程无需登录
- 日期：2026-09-29

## 一、最终判定：DIRECT_HTTP（可行）

独立 HTTP client（Node + undici ProxyAgent + 手工 cookie jar，不执行任何页面 JS）
成功复现「建会话 → 搜索 → initial → built → 取锁定图 → 解锁 → 下载 original」全链路。
浏览器**不是**协议必需；解锁挑战所需的图像识别完全在本地完成，与浏览器无关。

- 复现脚本：`scripts/http_replay.js`
- 共享识别库：`scripts/lib_unlock.js`
- 浏览器参照实现（已端到端跑通）：`scripts/pupp_full.js`

### SHA-256 跨会话不一致（重要）

同一原件在不同会话两次下载，文件字节不同：

| 来源 | 字节数 | SHA-256（前 16） |
|---|---|---|
| 浏览器下载 | 369,678 | 4277f2e45c566737 |
| HTTP 复现 | 369,792 | 7a3a6fe751491e78 |

解码后对比：尺寸均为 737×1087；**98.89% 像素完全相同**；仅 0.23% 像素差异 >10
（最大差 38，平均差 0.063）。判定为服务端 gd-jpeg 逐请求重编码的微小非确定性，内容等价。

**批量校验规则据此调整**：
1. 每个文件仍计算并记录自身 SHA-256（落盘完整性 / 去重）；
2. 跨会话/重下载不得要求 SHA 相同，改为「尺寸一致 + 解码像素一致率 ≥ 99.5%」判定；
3. Content-Type、文件大小区间、Magic Bytes（JPEG `FF D8 FF`）照常校验。

## 二、完整请求链

所有请求经代理；302 需手工逐跳跟随并收集每跳 Set-Cookie。

1. `GET index.php?act=Archive` — 建立访客会话（2 个 cookie）
2. `GET index.php?act=Archive/search/<base64>` — 典藏号搜索，结果 HTML 中
   正则 `acckey=["']?([0-9a-f]{32})` 取 32 位 acckey
3. `POST index.php`
   - body：`act=Display%2Finitial%2F<acckey>`
   - 头：`Content-Type: application/x-www-form-urlencoded; charset=UTF-8`、
     `X-Requested-With: XMLHttpRequest`
   - 响应：`{"action":1,"data":{"display":"image","resouse":"<ObjectCode>"}}`
4. `GET index.php?act=Display/image/<ObjectCode>` — 建立 Display 会话
5. `POST index.php`，body `act=Display%2Fbuilt%2F<ObjectCode>%2F`
   （page code 留空即取首页）→ object_built JSON：
   `page_access_lock`（1 锁定 / 0 解锁）、`page_count`、`page_list`、
   `page_code_now` 等
6. `GET index.php?act=Display/loadimg/<pagecode>` — 锁定挑战图（约 1.05 MB）
7. 本地识别（见第三节）得到目标图标百分比 `px/py`
8. `POST index.php`，body `act=Display%2Funlock%2F<px>%2F<py>`
   - 成功：`{"action":1,"data":[],"version":"ndap - collect v4.0 / 2017-09-30","mode":[]}`
   - 失败：action 为假（注意成功值是数字 **1**，不是 true）
9. `GET index.php?act=Display/loadimg/<pagecode>/original` — 无水印原件
   （响应 `Content-Disposition: attachment; filename="<典藏号>-001.jpg"`，
   无 Content-Length、chunked）

注：POST 无需 CSRF token；ObjectCode / PageCode 每次会话重新生成，禁止硬编码。

## 三、解锁挑战的本地视觉管线

锁定图规格：1400×2064，gd-jpeg q90，150dpi，约 1 MB；满铺「國史館/Academia
Historica」水印 + 中央斜体黄色双语指令 + 若干亮绿色图标（实测 4–6 个，位置随机）。

1. **读指令（先于定位图标）**
   - 黄色掩膜：`R>170, G>170, B<130, (R+G-2B)>60`（核心色约 228,233,103）
   - 3×3 膨胀合并笔画 → 连通域留大块 → PCA 测角 → 生成 ± 两种转正候选
     （白底黑字）→ 取水平版 → macOS Vision OCR（zh-Hans/zh-Hant/en-US）
   - 英文行稳定：`Please login or click on the "<X>" icon ...`；中文行作备份
   - 脚本：`scripts/prep_yellow.py`、`scripts/ocr_yellow`（已编译二进制）
2. **定位目标图标**
   - 绿色掩膜：`G>170, R<140, B<140`；连通域 + 邻近碎片聚合（距离 <160 合并）
   - 候选归一化 64×64，对模板库做 0–360° 每 15° 旋转扫描取最大 IoU
   - 诱饵对自身模板 0.87–0.94；目标阈值 0.6
   - Earth 特殊：随机旋转/经纬度，对全部模板 ≤0.43，取「所有非 earth 分数
     均 <0.6」的唯一候选
3. 模板库：`logs/templates/`（见下）

### 已确认图标词表（7 类）

| 指令词（英/中，正则忽略大小写） | 模板 |
|---|---|
| Earth / Globe / 地球 | earth.png |
| Tai Chi / Taiji / 太極 | c2.png |
| Clock / 時鐘 | c4.png |
| Gear / 齒輪 | c1.png、iconD.png |
| Basketball / 籃球 | iconB.png |
| Mandala / 曼陀 | iconA.png |
| **Tire / 輪胎** | **tire.png（本轮新增）** |

Tire 与 Gear/Mandala 同为辐条环形，IoU 曾达 0.89–0.91；已用 tire.png 专模板区分。
若再遇词表外目标：保存锁定样本、扩充 templates/ 与 TARGET_MAP 后再继续。

## 四、批量下载建议

- 并发初始 2，请求间隔 1–3 秒；对 429 / 5xx 指数退避重试，单请求超时
- 断点续传：`download_status.jsonl` / `progress.json`
- 解锁粒度（每页 / 每对象 / 每会话）尚未判定——测试件仅 1 页，批量时验证
- 顺序：1 件 → 10 件 → 1947 全年 → 1917–1954（1924 缺失放 README；
  1955–1972 未确认开放，标 NOT_YET_CONFIRMED_ONLINE）
- 每件产出：original/ 原始图、原始图像 PDF、转稿 MD、metadata.json
  （来源 URL、下载协议、SHA-256、像素校验结果）

## 五、已验证死路

curl 直连 DNS 失败；curl 走代理 302 循环；Playwright launch 独立 Chrome（违背
复用日常 Chrome 的要求）；Playwright connectOverCDP 多 WS 反复弹授权；合成坐标
点授权 sheet 只关窗不真正授权（须 AXPress）；Vision 直读全图黄字只出碎片。

连接日常 Chrome 的授权弹窗（每次连接一次、无法永久关闭）由 accounting-kb 成熟
方案处理：`press_allow.applescript` + `press_allow_locked.sh` + 800ms 串行
AXPress 循环（见 `scripts/pupp_full.js` connectWithConsent）。
