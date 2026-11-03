# plan-first

把任务目标变成一份人类可读的独立 HTML 计划书。

## 安装

`plan-first` 是独立技能，不依赖 `stop-wishing`。需要 Node.js 18+。

### 一键安装（推荐）

如果你使用 Claude Code、Codex 等支持 Agent Skills 的工具：

```bash
npx -y skills add 2huy4n/plan-first --copy
```

默认装到当前项目；加 `-g` 装到用户级。也可以指定工具：

```bash
npx -y skills add 2huy4n/plan-first --copy -a claude-code
npx -y skills add 2huy4n/plan-first --copy -a codex
```

安装后重启工具或重新打开会话，`/plan-first` 才会出现在技能列表中。

### 手动安装

把整个 `plan-first` 目录复制到对应工具的 skills 根目录，不要只复制 `SKILL.md`：

```bash
# Claude Code
cp -R plan-first ~/.claude/skills/plan-first

# 通用 .agents/skills
cp -R plan-first ~/.agents/skills/plan-first
```

`scripts/`、`templates/` 和 `agents/` 必须一起复制，否则 `/plan-first` 无法渲染 HTML。

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
