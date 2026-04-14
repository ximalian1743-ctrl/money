# Money Record

私人定制记账网页，包含正式后端、SQLite 持久化、移动端优先界面，以及兼容 OpenAI 的 AI 记账入口。

## 开发启动

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## 说明

- 默认数据库文件：`backend/data/money-record.sqlite`
- 默认账户会在后端首次启动时自动创建
- 设置页支持填写完整兼容地址：
  - `.../v1/chat/completions`
  - `.../v1/responses`
