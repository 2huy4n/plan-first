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

## 给 AI 看：用户不会装时按此执行

如果用户不会安装 skill，不要只发一个链接；按下面步骤直接做。

1. **前置检查**：确认 `node --version` **≥18**，并确认目标目录可写。写不了就跳到第 6 步，不要硬闯。

2. **判断工具和目标目录**：

   | 用户工具 | 目标目录 |
   |---|---|
   | Claude Code | `~/.claude/skills/plan-first/` |
   | DSH / Codex / TRAE / 通用 Agent Skills | `~/.agents/skills/plan-first/` |
   | 不确定 | 先问用户“你用的是哪个工具？”，不要猜 |

   如果无法向用户提问，按当前运行环境判断；仍不确定时优先用 `~/.agents/skills/plan-first/`，并在报告里写明“我假设你用的是 X”。

3. **安装**：优先用 `npx`，它会自动下载仓库：

   ```bash
   npx -y skills add 2huy4n/plan-first --copy -g
   ```

   已知工具时可以指定：

   ```bash
   npx -y skills add 2huy4n/plan-first --copy -a claude-code
   npx -y skills add 2huy4n/plan-first --copy -a codex
   ```

   没有 `npx` 时，复制整个技能目录，不能只复制 `SKILL.md`：

   ```bash
   mkdir -p ~/.agents/skills/plan-first
   cp -R SKILL.md README.md package.json scripts templates agents \
     ~/.agents/skills/plan-first/
   ```

   Windows PowerShell：

   ```powershell
   New-Item -ItemType Directory -Force "$env:USERPROFILE\.agents\skills\plan-first" | Out-Null
   Copy-Item SKILL.md,README.md,package.json,scripts,templates,agents `
     "$env:USERPROFILE\.agents\skills\plan-first\" -Recurse
   ```

4. **验证**：

   ```bash
   node ~/.agents/skills/plan-first/scripts/render-plan.js --help
   ```

   退出码应为 0；目标目录还必须存在 `SKILL.md`、`scripts/render-plan.js` 和 `templates/plan.html`。验证失败就检查是不是漏了 `scripts/` 或 `templates/`。

5. **告诉用户怎么用**：重启工具或重新打开会话，然后输入 `/plan-first`。如果工作区没有 `project.md`，技能会先问最多 3 轮问题，再生成 `plan.html`。

6. **失败处理**：遇到权限或沙箱拒绝，不要反复重试；直接告诉用户需要手动执行，并给出上面的 `mkdir` / `cp` 或 PowerShell 命令。

`plan-first` 是独立技能，不依赖 `stop-wishing`；不要为了安装它去安装整套 stop-wishing。

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
