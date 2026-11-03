# plan-first

把任务目标变成一份人类可读的独立 HTML 计划书。

## 使用

在目标工作区根目录调用：

```text
/plan-first
```

行为：

- 找到 `project.md`：直接以它为唯一事实来源，生成 `plan.html`，不再重复访谈。
- 找不到 `project.md`：最多进行 3 轮简短询问，确认目标、边界和验收后写入 `project.md`，再生成 `plan.html`。

## 手动渲染

```bash
node scripts/render-plan.js --source project.md --out plan.html
```

已有 `plan.html` 时：

```bash
node scripts/render-plan.js --source project.md --out plan.html --force
```

## 设计约束

- 只写 `project.md`（缺失时）和生成的 `plan.html`。
- 不改代码、测试、依赖或配置。
- HTML 自包含：内联 CSS、无外部字体、无网络、无构建步骤。
- 所有事实来自 `project.md`；缺失内容标为 `待确认`，不编造。
- 输出适合屏幕阅读和打印。

## 测试

```bash
npm test
```
