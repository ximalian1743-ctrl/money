# 架构说明

## 概览

Money Record 是一个**本地优先（local-first）的 PWA**：

```
┌──────────────────────── 浏览器 ────────────────────────┐
│                                                         │
│   React UI  ──▶  lib/api.ts  ──▶  lib/db.ts (IndexedDB) │
│                       │                                 │
│                       └────────▶  lib/ai/client.ts ──▶ 兼容 OpenAI 的 AI 服务
│                                                         │
│   Service Worker (Workbox) ◀── vite-plugin-pwa         │
└─────────────────────────────────────────────────────────┘
```

没有自己的后端。所有数据落盘在 IndexedDB，AI 请求从浏览器直接打到用户在设置里配置的 endpoint。

## 模块边界

### `frontend/src/lib/domain/`

纯函数层，不依赖浏览器 API：

- `types.ts` — 账户、交易、设置等类型；全项目复用
- `summary.ts` — `computeSummary` 聚合资产/负债，`computeAccountBalances` 用交易记录回放得到当前余额
- `transactions.ts` — `resolveTransaction` 把 5 种交易类型（收入 / 支出 / 转账 / 信用卡还款 / 余额调整）落到账户 delta
- `ai-draft.ts` — 规范化 AI 返回的 draft、补齐漏掉的字段

**该层是可移植的**。如果以后把账本搬回后端，这些文件可以几乎原封不动搬到服务端。

### `frontend/src/lib/db.ts`

IndexedDB 封装（基于 [`idb`](https://github.com/jakearchibald/idb)）。

数据库：`money-record` v1。对象仓库：

| Store          | keyPath | 说明                                   |
| -------------- | ------- | -------------------------------------- |
| `accounts`     | `id`    | 账户定义 + 初始余额，`name` 唯一索引   |
| `transactions` | `id`    | 含 `occurredAt`、`deletedAt` 索引      |
| `settings`     | `id`    | 单例（`id: 'global'`），AI 配置和汇率  |

首次打开时会种入 7 个默认账户（见 `db.ts` 中的 `seedAccounts`）。

导出/导入：`exportAll()` 返回整个快照 JSON；`importAll(payload)` 清库后写回；`resetDb()` 全量清除后重新种默认账户。

### `frontend/src/lib/ai/`

浏览器端 AI 调用：

- `provider.ts` — endpoint 归一化、模型列表 URL 推导、响应解析
- `client.ts` — `parseTransactionText` / `parseReceiptImage` / `loadModels` 三个入口

支持两种协议：

- `chat_completions` — OpenAI 标准 `/v1/chat/completions`；图片走 `content` 数组里的 `image_url`
- `responses` — OpenAI 新版 `/v1/responses`；图片用 `input_image` 类型

系统 prompt 用中文描述账户列表和输出 schema，要求严格 JSON。

### `frontend/src/lib/api.ts`

对 UI 稳定的入口层。UI 只 import 这一个文件，内部再调用 `db` 和 `ai`。

导出保持和原来后端 HTTP 客户端一致的签名（`getAccounts` / `getSummary` / `saveSettings` / `parseTransaction` / ...），所以页面代码基本没动。

### Service Worker

由 `vite-plugin-pwa` 的 `generateSW` 模式生成，使用 Workbox 预缓存所有静态资源。离线时可以继续打开 app 查账本和手动录入；AI 解析需要联网。

## 数据流示例：手动录入

1. 用户在手动录入页填写表单
2. `ManualEntryPage` 调用 `api.createTransaction(input)`
3. `api.ts` → `db.createTransaction` → IndexedDB 写入
4. 页面调用 `useAppData.reload()`
5. `api.getSummary()` 读 accounts + transactions，通过 `computeAccountBalances` 回放得到当前余额，通过 `computeSummary` 聚合总资产

## 数据流示例：AI 录入

1. 用户在 AI 录入页粘贴文字 / 上传照片
2. 页面调用 `api.parseTransaction(...)` 或 `api.parseReceiptImage(...)`
3. `api.ts` → `ai/client.ts` 组装 prompt，带上当前账户列表
4. `fetch` 直接打用户设置的 AI endpoint
5. 返回的 JSON 用 `normalizeParsedDraft` 规范化，给 UI 做确认页
6. 用户确认后走 `createTransaction` 入库

## 如果要换方案

### 加回后端

领域层（`lib/domain/`）可以直接搬到 Node 端。`lib/db.ts` 换成 SQLite / Postgres 的 repository。`lib/api.ts` 里的实现改成 `fetch('/api/...')`，签名保持不变，UI 不用改。

### 多设备同步

最小改动：在 `api.ts` 里 `createTransaction` 之后额外 push 到后端；`reload` 时合并远端数据。IndexedDB 作为 offline 缓存保留。

### 换成 Electron / Tauri 桌面端

UI 和 `lib/` 整体复用。`lib/db.ts` 可以保留 IndexedDB（Electron 的 renderer 进程同样有），也可以换成 better-sqlite3（在主进程跑）。

### 换 AI 协议

`ai/client.ts` 的 `buildRequestBody` 是唯一需要改的地方。新协议在这里加分支即可。

## 关键决策

- **为什么不用 localStorage**：交易记录可能增长到几千条，IndexedDB 更合适，也有事务和索引。
- **为什么 AI key 存浏览器**：单机私用，用户自己负责 key 的敏感程度。README 里提醒过不要填付费 key。
- **为什么用 `generateSW` 而不是 `injectManifest`**：自定义 SW 需求很少，generateSW + Workbox 预缓存够用。
- **为什么选 Cloudflare Pages**：免费、CDN 快、支持自定义域名、自动 HTTPS、GitHub 集成简单。
