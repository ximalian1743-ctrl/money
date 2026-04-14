# Money Record · 私人账本

个人使用的本地优先（local-first）记账 PWA。数据存在浏览器 IndexedDB，AI 解析直接从浏览器调用兼容 OpenAI 的接口，没有后端服务器。

- 移动端优先 UI，安装到桌面后和原生 app 使用感受接近
- 支持文字描述和拍照小票两种 AI 录入方式
- 支持 CNY / JPY 双币种账户、负债账户、转账
- 数据完全本地，可随时导出 JSON 备份

## 快速开始（开发）

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # 输出到 frontend/dist/
npm run typecheck
npm run lint
```

要求 Node ≥ 20。

## 部署到手机使用

推荐路径：**Cloudflare Pages + 自定义子域名 + 手机添加到主屏幕**。

详细步骤：

- [`docs/deployment/cloudflare-pages.md`](docs/deployment/cloudflare-pages.md) — 把 `frontend/dist` 连到 Cloudflare Pages 并绑定子域名
- [`docs/deployment/alternatives.md`](docs/deployment/alternatives.md) — GitHub Pages / Vercel / Azure Web App 等备选方案
- [`docs/mobile-install.md`](docs/mobile-install.md) — iOS / Android 添加到主屏幕

首次部署完成后，在手机 Safari 或 Chrome 打开站点，用「添加到主屏幕」即可像 app 一样使用。

## 项目结构

```
money_record/
├── frontend/
│   ├── public/               PWA 图标、favicon
│   ├── src/
│   │   ├── app/              顶层 App 组件
│   │   ├── pages/            路由页面（总览、账本、手动录入、AI 录入、设置）
│   │   ├── components/       UI 组件
│   │   ├── hooks/            React hooks
│   │   ├── lib/
│   │   │   ├── api.ts        面向 UI 的数据接口（包装 db + ai）
│   │   │   ├── db.ts         IndexedDB 封装（基于 idb）
│   │   │   ├── domain/       纯领域逻辑（summary / transactions / 类型）
│   │   │   └── ai/           浏览器端 AI 调用
│   │   └── types/            共用 TS 类型
│   ├── index.html
│   └── vite.config.ts        含 VitePWA 配置
├── docs/
│   ├── architecture.md       架构说明
│   ├── backup-and-restore.md 备份与恢复
│   ├── mobile-install.md     手机安装
│   └── deployment/           部署方案
└── package.json              npm workspaces 根
```

## 架构与可替换性

当前架构：**纯前端 PWA + IndexedDB + 浏览器直调 AI**。

如果后续想换方案（例如加回后端、换成 Electron 桌面应用、多设备同步等），阅读 [`docs/architecture.md`](docs/architecture.md)。文档说明了数据流、模块边界，以及从哪里接入后端或同步层最自然。

## 数据安全

- 数据只存在当前浏览器的 IndexedDB 中。清理浏览器存储 / 卸载 PWA 会丢数据。
- 请定期用「设置 → 数据备份」导出 JSON。
- AI Key 明文保存在浏览器并从前端直接调用：**不要填入付费 key**，仅用于免费或低风险的 key。
