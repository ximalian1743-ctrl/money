# 备份与恢复

Money Record 的数据**只存在当前浏览器的 IndexedDB 中**。这份文档说明备份格式、如何手动恢复、以及出事时的应急预案。

## 备份 JSON 的结构

点「设置 → 导出 JSON」得到的文件长这样：

```json
{
  "version": 1,
  "exportedAt": "2026-04-14T12:34:56.000Z",
  "accounts": [
    { "id": 1, "name": "邮储银行存折", "kind": "asset", "currency": "CNY", "initialBalance": 12345.67 }
  ],
  "transactions": [
    {
      "id": "xxx-uuid",
      "type": "expense",
      "occurredAt": "2026-04-14T04:00:00.000Z",
      "amount": 38,
      "currency": "CNY",
      "fromAccountId": 5,
      "note": "午饭",
      "createdAt": "...",
      "deletedAt": null
    }
  ],
  "settings": {
    "id": "global",
    "cnyToJpyRate": 20,
    "jpyToCnyRate": 0.05,
    "aiEndpointUrl": "...",
    "aiApiKey": "...",
    "aiProtocol": "chat_completions",
    "aiModel": "gemini-3-flash-preview"
  }
}
```

向前兼容由 `version` 字段控制。未来 schema 变化时，`lib/db.ts` 的 `importAll` 会根据 `version` 做迁移。

## 恢复流程

1. 打开 PWA，进「设置 → 数据备份」
2. 点「导入 JSON」，选备份文件
3. 确认弹窗（会覆盖当前数据库）
4. 页面自动 reload，看到备份里的所有账户和交易

## 推荐节奏

- **每周导出一次**，存到网盘（iCloud / OneDrive / Google Drive）
- **换手机、刷机、清浏览器数据前**必须导出
- 备份文件不大（即使几千条交易也就几百 KB），可以长期留着每周快照

## 最坏情况

**手机上数据没了、也没有 JSON 备份**：

- IndexedDB 被清 = 数据永久丢失
- 唯一残存：如果你在电脑上也开过同一个站点（且同一浏览器），那边有独立副本

**JSON 文件也丢了**：

- 只能从头开始（或从 AI 服务商那边翻聊天记录凑历史记账 😅）

所以备份节奏是这个项目唯一真正重要的运维工作。

## 开发者：直接操作数据库

在 DevTools → Application → IndexedDB → `money-record` 可以直接看到三个 store 的内容。调试时也可以在 Console 跑：

```js
// 清掉所有数据
indexedDB.deleteDatabase('money-record');
```

这和 UI 上的「清空重置」等价，区别是 UI 版本会重新种默认账户。
