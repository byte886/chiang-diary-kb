# SOP：Chrome 连接、授权与标签页卫生（本项目用法）

> 通用方法已沉淀在 **mac-system-toolkit 技能** `scripts/chrome-cdp/`；
> 本文说明本项目中的使用方式。通用原理以技能文档为准。

## 1. 连接通道

- 本项目附加**用户已打开的日常 Chrome**，不另开浏览器、不 launch
- 通道：Chrome 144+「运行时远程调试」（通道 B）
  - 一次性开启：`chrome://inspect/#remote-debugging` 对当前 profile 勾选（持久化）
  - 端点现读：`~/Library/Application Support/Google/Chrome/DevToolsActivePort`
    （首行端口、次行 `/devtools/browser/<uuid>`；uuid 重启即变，禁止硬编码）
  - WebSocket-only：`/json` 返回 404 属正常
- 每次新连接弹一次「要允许远程调试吗？」，官方设计、无法永久关闭

## 2. 授权弹窗处理（关键事实）

1. 弹窗是 window 上的模态 **sheet**；只遍历 sheet，**绝不进 AXWebArea**
2. 按钮可见文字在 **AXDescription**（…取消/允许），AXTitle 为空
3. 必须对按钮 `perform action "AXPress"`；合成坐标点击只关窗、不授权（禁止）
4. 握手期 800ms 循环代点；跨进程 mkdir 原子锁串行（全机同时最多一个）
5. 偶发 403/挂起属竞态，退避重试 1–2 次即稳定

本项目脚本（code/scripts/）：
- `press_allow.applescript`、`press_allow_locked.sh`、`cdp_consent_guard.sh`
- `pupp_full.js` 已集成 `connectWithConsent()`（连接 + 代点 + 重试）

## 3. 标签页卫生

- **开新页前**：关闭上轮残留（URL 含 `act=Display/image` / `act=Archive/search`）
- **收工时**：关闭本轮打开的 archive 与 viewer 标签
- 只关 URL 命中模式的标签，用户原有标签一律不动

```bash
# 手动清理残留影像页
node code/scripts/tab_hygiene.js "act=Display/image"
```

## 4. 收尾纪律

- 断开用 `browser.disconnect()`/detach；**禁止 close()/kill 用户 Chrome**
- 关闭「自己打开的标签」与「不断开浏览器」不冲突
- cookie/token 不回显对话、不写进入库文件（network jsonl 不入库）
