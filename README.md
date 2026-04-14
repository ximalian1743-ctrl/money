# money

一个简单易用的个人财务管理工具，帮助你追踪收支、管理预算，掌握每一分钱的去向。

## 功能特性

- **收支记录** — 快速记录日常收入与支出
- **分类管理** — 自定义账单分类，清晰区分各类消费
- **预算设置** — 按月或按类别设定预算上限，超支提醒
- **数据统计** — 可视化图表展示收支趋势与结构
- **多账户支持** — 管理银行卡、现金、信用卡等多种账户
- **数据导出** — 支持导出为 CSV / Excel 格式，方便留存分析

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
git clone https://github.com/ximalian1743-ctrl/money.git
cd money
npm install
```

### 运行

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

## 使用说明

1. **添加账户** — 在"账户"页面创建你的银行卡或现金账户。
2. **记录交易** — 点击"新增"按钮，选择收入或支出，填写金额和分类。
3. **查看报表** — 在"统计"页面查看月度/年度的收支汇总与图表。
4. **设置预算** — 在"预算"页面为各分类设置月度限额，超出时系统将发出提醒。

## 项目结构

```
money/
├── src/
│   ├── components/   # UI 组件
│   ├── pages/        # 页面视图
│   ├── store/        # 状态管理
│   └── utils/        # 工具函数
├── public/           # 静态资源
├── tests/            # 测试文件
└── package.json
```

## 贡献指南

欢迎提交 Issue 或 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: 添加某功能'`
4. 推送分支：`git push origin feature/your-feature`
5. 发起 Pull Request

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
