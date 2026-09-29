# 问题清单（ISSUES）

## 未决问题

| # | 问题 | 影响 | 计划 |
|---|---|---|---|
| 1 | 解锁粒度未判定（每页 / 每对象 / 每会话） | 决定批量时解锁调用次数 | 测试件仅 1 页，10 件/多页件验证 |
| 2 | 1955–1972 是否开放在线原始影像未确认 | 采集范围 | 标 NOT_YET_CONFIRMED_ONLINE，官方开放后增量接入 |
| 3 | 可能再遇模板库外的新图标/指令词 | 解锁中断 | 保存样本、扩 templates 与 TARGET_MAP 后再继续 |
| 4 | OCR 需 Python 3.12 venv（系统 3.14 不支持 onnxruntime） | 转稿阶段 | OCR 阶段单独建 venv |

## 暂停条件（出现即停下与用户商量）

- 解锁或下载要求登录（本项目无账户）
- 出现验证码或明确禁止自动化
- 一次出现 2 个未匹配候选、目标无法唯一确定

## 已验证死路（Won't Fix，勿重复）

1. curl 直连国史馆：DNS 失败
2. curl 走代理：302 循环
3. Playwright launch 独立 Chrome：违背复用日常 Chrome 的要求
4. Playwright connectOverCDP：多 target 多 WS，反复弹授权、驱动失败
5. cliclick / 合成坐标点授权 sheet：只关窗不真正授权（且易误点取消）
6. 按 AXTitle 找授权按钮：可见文字在 AXDescription
7. Vision 直读全图黄色文字：只出碎片
8. 预处理坑：fillcolor 传整数变红底；去噪阈值过大打碎笔画；PCA 角度有符号歧义（须 ± 候选）
9. osascript 递归遍历含 AXWebArea 的整树：超时（只遍历 sheet）
