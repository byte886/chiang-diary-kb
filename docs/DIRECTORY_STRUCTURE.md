# 目录结构（DIRECTORY_STRUCTURE）

## 1. 仓库现状

```text
《蒋中正日记》/
├── README.md                 项目介绍（给人看）
├── AGENTS.md                 AI 代理操作手册
├── CHANGELOG.md              变更记录
├── LICENSE                   MIT
├── .gitignore
│
├── code/                     Node 工程
│   ├── package.json          依赖声明（node_modules 不入库）
│   ├── package-lock.json
│   ├── .userdata/            早期侦察独立 Chrome profile（不入库）
│   └── scripts/
│       ├── http_replay.js        独立 HTTP 全链路复现（主路径）
│       ├── pupp_full.js          浏览器参照驱动
│       ├── lib_unlock.js         识别共享库
│       ├── prep_yellow.py        黄色文字预处理
│       ├── ocr_yellow(.swift)    Vision OCR（二进制 + 源码）
│       ├── extract_tpl.js        图标模板提取
│       ├── press_allow*.{applescript,sh}
│       ├── cdp_consent_guard.sh  授权 sheet 处理
│       └── *.js                  早期侦察/弃用脚本（留档）
│
├── docs/
│   ├── REQUIREMENTS.md
│   ├── WORKFLOW.md
│   ├── DIRECTORY_STRUCTURE.md
│   ├── SYSTEM_REQUIREMENTS.md
│   ├── DOCUMENTATION_MAP.md
│   ├── download_protocol_report.md
│   ├── 采集方案_v2.md
│   └── 下载技术探测与批量下载方案.md
│
├── project-management/
│   ├── README.md
│   ├── TASK_STATUS.md
│   └── ISSUES.md
│
├── logs/                     运行日志（整体不入库）
│   ├── templates/            图标模板（入库，运行时依赖）
│   ├── js_archive.js / js_display.js / js_library.js  站点源码（入库）
│   └── （锁定样本、网络 jsonl、运行日志、中间图片等不入库）
│
└── downloads/                采集影像（不入库，批量阶段为多 GB）
```

## 2. 批量阶段每件标准结构

```text
YYYY/
└── <典藏号>/
    ├── original/
    │   ├── 001.jpg
    │   ├── 002.jpg
    │   └── ...
    ├── <典藏号>.pdf
    ├── <典藏号>.md
    └── metadata.json
```

- 目录名用典藏号，不用日期（同一日期可能有多件/附件/杂录）
- 原件文件名遵循服务端 Content-Disposition：`<典藏号>-NNN.jpg`
- 1924 目录下仅 README；未确认开放年份不建空数据目录
