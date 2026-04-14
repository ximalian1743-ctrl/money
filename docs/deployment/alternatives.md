# 部署方案备选

主推方案见 [`cloudflare-pages.md`](./cloudflare-pages.md)。这份文件记录其它可行方案和它们的取舍，方便以后切换。

## 选型对比

| 方案                | 免费额度    | 自定义域名 | 自动 HTTPS | CI/CD      | 备注                                         |
| ------------------- | ----------- | ---------- | ---------- | ---------- | -------------------------------------------- |
| Cloudflare Pages    | 足够私用    | ✅         | ✅         | GitHub 集成 | **主推**。CDN 全球分发，和域名服务商一致    |
| GitHub Pages        | 足够私用    | ✅         | ✅         | Actions    | 仓库必须 public，或用付费账户                |
| Vercel              | 足够私用    | ✅         | ✅         | GitHub 集成 | 对 Vite 识别最好，构建快                     |
| Netlify             | 足够私用    | ✅         | ✅         | GitHub 集成 | 和 Vercel 类似，生态略弱                     |
| Azure Static Web Apps | 免费 tier | ✅         | ✅         | Actions    | 学生订阅免费，和 lanobe 项目走同一账号       |
| 自己的 VPS / Azure Web App | 按配额 | ✅      | 需配置     | 自建        | 成本最高。只有当需要后端/同步时才考虑       |

Money Record 是纯静态 PWA，**任何静态托管都能跑**。只在需要自建后端时才要服务器方案。

## GitHub Pages

1. 仓库 Settings → Pages → Source: **GitHub Actions**
2. 加 `.github/workflows/pages.yml`：

   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm }
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with: { path: frontend/dist }
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment: github-pages
       steps:
         - uses: actions/deploy-pages@v4
   ```

3. 如果用子路径（如 `username.github.io/money`），在 `vite.config.ts` 里设 `base: '/money/'`；用自定义域名则保持默认 `base: '/'`。

## Vercel

1. vercel.com → Add New Project → Import GitHub repo
2. Framework Preset: **Vite**
3. Root directory: （留空）
4. Build command: `npm run build`
5. Output directory: `frontend/dist`
6. Deploy

绑定自定义域名在 Project Settings → Domains。

## Azure Static Web Apps（如果将来回到 Azure 生态）

参考仓库内 lanobe 项目的 workflow（OIDC + `Azure/static-web-apps-deploy`）。输出目录同样是 `frontend/dist`。

优势：和 Azure 学生订阅其它资源在同一账号管理。劣势：学生订阅一年后失效，续期需要换方案。

## 自建后端场景

如果以后要加后端（多设备同步、共享账本等），推荐拆分：

- 静态前端继续 Cloudflare Pages
- API 层另起，Cloudflare Workers / Deno Deploy / 任意 Node 托管都行
- 前端通过 `VITE_API_BASE` 环境变量指向 API

实现层面参考 [`../architecture.md`](../architecture.md) 的「如果要换方案 → 加回后端」一节。
