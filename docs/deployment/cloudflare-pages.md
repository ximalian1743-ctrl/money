# 部署到 Cloudflare Pages

目标：把 `frontend/dist` 托管在 Cloudflare Pages，绑定自定义子域名（示例：`money.ximalian.cc.cd`），在手机上作为 PWA 使用。

**前提**：

- 代码已推到 GitHub（本仓库）
- Cloudflare 账号下已经托管了 `ximalian.cc.cd` 这个域名（已有 lanobe 项目作参考）

## 一次性：连接仓库

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选择仓库 `ximalian1743-ctrl/money`
3. 生产分支：`main`
4. 构建配置：

   | 字段                | 值                        |
   | ------------------- | ------------------------- |
   | Framework preset    | `None`（不要选 Vite）     |
   | Build command       | `npm run build`           |
   | Build output directory | `frontend/dist`        |
   | Root directory      | （留空，使用仓库根）      |
   | Node version        | `20` 或更高               |

   如果 Node 版本需要显式指定，在 **Settings → Environment variables** 加 `NODE_VERSION=20`。

5. **Save and Deploy**，等待首次构建完成（约 1–2 分钟）

构建成功后 Cloudflare 会给一个临时域名，例如 `money-xxx.pages.dev`，此时在浏览器打开应该能看到账本界面。

## 绑定自定义子域名

1. Cloudflare Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入 `money.ximalian.cc.cd`
3. 因为 `ximalian.cc.cd` 已经在同一个 Cloudflare 账号下，Cloudflare 会自动创建 CNAME 记录、自动签发 SSL 证书
4. 等待 DNS 生效（通常 < 1 分钟），访问 `https://money.ximalian.cc.cd`

## 后续迭代

改代码 → `git push origin main` → Cloudflare Pages 自动检测到新 commit → 自动构建部署。

PR 会自动得到一个 preview 部署地址，可以在 PR 页面查看。

## PWA 更新行为

`vite-plugin-pwa` 配置的是 `registerType: 'autoUpdate'`。流程：

1. 用户打开已安装的 PWA
2. SW 后台检测到新版本
3. 新版本下载完成后自动 reload 应用（因为 `registerSW({ immediate: true })`）

如果用户打开时离线，就继续用旧版本，等下次联网再升级。

## 常见问题

**构建报错 `Could not resolve "virtual:pwa-register"`**
构建命令的工作目录没选对。确认 Build command 是 `npm run build`、Root directory 留空；根目录的 `npm run build` 会转到 frontend workspace 再执行。

**手机打开白屏**
打开 DevTools 远程调试（Android Chrome → `chrome://inspect`；iOS Safari → 开启 Web 检查器）查 Console。常见是 SW 缓存了旧的坏版本，清理站点数据或把 PWA 卸载重装。

**PWA 没法「添加到主屏幕」**
需要 HTTPS（Cloudflare 自动开启）。检查 `manifest.webmanifest` 能访问、图标 200 OK。

**AI 请求被 CORS 挡住**
极少见。大部分兼容 OpenAI 的服务都允许浏览器跨域。如果遇到，换一个 endpoint 或者自己加个代理。
