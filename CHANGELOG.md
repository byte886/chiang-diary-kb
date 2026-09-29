# CHANGELOG

本项目所有重要变更记录。格式参照 Keep a Changelog，日期为 Asia/Shanghai。

## [0.2.0] - 2026-09-29

### Added
- 跨环境交接手册 `docs/HANDOFF.md`（bootstrap、接手动作、验收清单）
- SOP：`docs/sop/UNLOCK_VISION_SOP.md`（视觉解锁）、`CHROME_CDP_SOP.md`（Chrome 连接/授权/标签卫生）
- `code/scripts/tab_hygiene.js`：按 URL 模式关闭本流程标签
- 同步沉淀至 mac-system-toolkit 技能：`scripts/chrome-cdp/` 连接工程与 SOP

### Changed
- pupp_full.js：开新页前清理残留标签、收尾关闭本轮标签（archive + viewer）
- 下载完成检测兼容 CDP 覆盖同名文件（按 mtime 变化判定）

## [0.1.0] - 2026-09-29

### Added
- 项目立项：《蒋中正日记》1917–1972 官方原始数字影像采集工程
- 协议侦察：定位 Archive 搜索、Display 影像页、锁定/解锁与 original 下载全链路
- 解锁视觉管线：黄色斜体指令 OCR（prep_yellow.py + Vision）与绿色图标
  模板库分类（lib_unlock.js）
- 图标模板库 7 类：地球、太極、時鐘、齒輪、籃球、曼陀、輪胎
- 独立 HTTP client 复现（http_replay.js，undici + 代理 + cookie jar）
- 浏览器参照驱动（pupp_full.js，附加日常 Chrome + 授权 sheet 自动 AXPress）
- 测试件 `002-150101-00037-141`（1947-04-09）双路径端到端跑通
- 下载协议技术报告：判定 DIRECT_HTTP 可行

### Changed
- 跨会话一致性校验由「SHA-256 相同」调整为「尺寸一致 + 像素一致率 ≥ 99.5%」
  （服务端 gd-jpeg 逐请求重编码存在非确定性）
