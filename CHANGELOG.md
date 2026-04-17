# Changelog

> 本项目于 2026-04-16 完成 4 轮系统化产品化升级，共 40 项独立改动。

---

## 2026-04-17 · 复合找零一次性记账（手动 + AI + 流水显示 三联改造）

**问题：** 超市拿 10000 纸币买菜 6360，找回 3×1000 纸币 + 640 硬币。过去一次记不完：

- 手动模式只能填单一金额，硬币进不了硬币账户。
- AI 模式听不懂"找零"语义，会把 10000 或 4245 当成支出。
- 即使拆成两条，流水里也看不出来哪条是"找零"。

**改动（一体化解决）：**

1. **手动表单** `TransactionForm` — 支出类型下加「使用现金支付（含找零）」复选框：
   - 付款金额 / 找零·纸币 / 找零·硬币 / 硬币账户
   - 实际支出 = 付款 − 找零纸币 − 找零硬币（自动计算）
   - 提交时原子写入 2 条：支出 + 转账（category='找零'）

2. **AI prompt** `lib/ai/client.ts` — 新增「现金找零场景」规则段与 6 个示例，教模型：
   - 识别"找零/找回/找我/找了/おつり/change"关键词
   - 守恒式：付款 = 实际支出 + 找零纸币 + 找零硬币
   - 纸币 vs 硬币分辨（关键词 + 默认规则）
   - 输出格式：第 1 条 expense，第 2 条仅当硬币找零>0 时为 transfer(category='找零')
   - 覆盖 6 种表述：`花了X+找硬币Y` / `付纸币A+找我B+其中C硬币` / `付A买菜B找3千+C硬币` / `花A找硬币B` / `付A找了B` / `花A（无找零）`

3. **流水显示** `LedgerPage.getDirectionInfo` — 当 type=transfer 且 category=找零 时，用「⇋」中性符号和「找零」标签（而非支出的「-」或普通转账的「↔」），账户余额不加不减，只体现两账户间的流转。

**文件：** `frontend/src/components/TransactionForm.tsx` / `frontend/src/pages/ManualEntryPage.tsx` / `frontend/src/pages/LedgerPage.tsx` / `frontend/src/lib/ai/client.ts` / 配套测试

---

## 2026-04-16 · 4 轮产品化升级

### Round 4 — 产品化 UI 大改（10 项）

**Commit:** `0c6dd4e` — CI ✓ deployed

站在成熟产品设计师角度的结构性重构，参考 Cash App / Revolut / Material。

1. **FAB 浮动添加按钮** — `记一笔` + `AI` 两个底部 Tab 合并为右下角 Speed Dial
2. **移除全局 Hero 页眉** — 每屏省 100px 垂直空间，改用 sticky TopBar
3. **底部导航 6 → 3 项** — 总览 / 流水 / 统计 + FAB，触控面积 +50%
4. **统一财富卡** — 净资产 + 人民币 / 日元 / 欠款 inline 细分
5. **BottomSheet 替换中心 Modal** — 所有详情/编辑/确认都底部滑出
6. **汇率 + AI 模型自动化** — 启动时静默同步，24h 缓存
7. **Toast 替代行内 status** — 2.8s 自动消散，不占布局
8. **统计页左右滑动切月** — `‹ ›` 箭头 + 手势
9. **流水搜索 / 筛选折叠图标** — 默认隐藏，点击展开 BottomSheet
10. **账户图标 + 按类型分组** — 🏦 银行 / 💵 现金 / 💳 信用卡 / 📱 电子钱包 / 🚇 交通卡

**新增基础设施：** `BottomSheet.tsx` / `Toast.tsx` / `Fab.tsx` / `TopBar.tsx` / `lib/account-meta.ts`

---

### Round 3 — 问题视角修复（10 项）

**Commit:** `600f7be`

基于实际使用痛点的针对性修复。

1. 账户行"编辑初始"按钮常驻 → 移到钱包点击弹窗内
2. 账户编辑逻辑 → 从"改初始值"改为"创建调整流水"（资产走 income/expense，信用卡走 credit_spending）
3. 总览页太长 → 移除"最近动账"区块（与流水页重复）
4. AI 记账保存后 inputText 不清空 → 确认入账后自动清空
5. AI 基准时间不更新 → 重置为当前时间
6. AI receiptPreview 持久残留 → 保存或放弃所有草稿后自动清除
7. 流水列表编辑/删除按钮与行点击冲突 → 移除列表按钮，操作收敛到详情 Modal
8. 详情 Modal "编辑此条" 流程割裂 → 同一 Modal 内用 `detailMode` 切换 view/edit
9. 删除确认按钮顺序反常规 → "取消(左) / 确认删除(右)"
10. 快捷记账用 `window.prompt` → 改为 `QuickEntryModal`

**新增组件：** `WalletDetailModal.tsx` / `QuickEntryModal.tsx`

---

### Round 2 — 功能追加（10 项）

**Commit:** `776c4bf` + `bf5dc3a`（ESLint 修复）

把产品从"记账 demo"升级为"完整记账产品"。

1. **AI 解析结果可编辑** — `EditableDraftCard` 替代只读展示，用户可改任意字段后确认
2. **一次输入多笔解析** — AI prompt 支持返回 JSON 数组，多笔交易每笔一张卡
3. **快捷记账按钮** — 根据历史高频自动生成 6 个快捷入口
4. **月度统计报表页** — 新增 `/stats` 路由，月份切换、日均、笔数
5. **分类预算警告** — localStorage 存预算，达 80% / 超支显示警告
6. **流水搜索** — 标题 / 备注 / 金额 / 账户 / 分类模糊搜索
7. **交易编辑** — 点编辑按钮弹出完整表单，不用删除重建
8. **汇率自动获取** — open.er-api.com 一键同步
9. **数据可视化** — CSS 柱状图 + 进度条（每日收支 + 分类占比）
10. **CSV 导出** — UTF-8 BOM，Excel 可直接打开

**新增：** `StatsPage.tsx` / `lib/export.ts` / `EditableDraftCard.tsx`

---

### Round 1 — UI 功能优化（10 项）

**Commit:** `86cae42` + `a6c57fc`（Prettier 修复）

第一轮用户提出 3 条 + 我补充 7 条。

1. 流水记录显示 `+/-` 方向标识（绿入 / 红出 / 蓝转账）
2. AI 记账保存原始输入作为备注，点击流水条目弹出查看
3. 首页钱包点击弹出最近动账记录
4. 流水按日期分组（今天 / 昨天 / 前天 / M月D日）
5. 交易类别彩色 Badge
6. 删除交易前弹确认 Modal
7. 金额颜色区分收支
8. 流水页空状态友好提示
9. 首页底部最近 5 条交易摘要
10. 流水按类型筛选（全部 / 收入 / 支出 / 转账 / 信用卡）

---

## 2026-04-15 及更早 · 基础底座

参见 git log 完整历史。关键里程碑：

- `4abc6d0` — UI overhaul：currency units、visual hierarchy、credit card redesign
- `6e10860` — 新增 `credit_transfer` 交易类型（信用卡给资产账户充值）
- `8074806` — PWA local-first 架构（IndexedDB + 浏览器直调 AI）
- `de0a06c` — JPY 账户重分类 + PayPay 电子钱包 + 万单位显示

---

## 项目统计

| 指标       | 值                                                        |
| ---------- | --------------------------------------------------------- |
| 升级轮次   | 4 轮（Round 1-4）                                         |
| 新增功能点 | 40 项                                                     |
| 测试       | TypeScript ✓ / 10/10 unit tests ✓ / Prettier ✓ / ESLint ✓ |
| 部署       | Cloudflare Pages，每次 commit 自动部署                    |
