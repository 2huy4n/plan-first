---
name: plan-first
description: >-
  Turn a task goal into a standalone, human-readable HTML plan. Use `/plan-first`
  at the start of a workspace: if `project.md` exists, render it directly without
  re-interviewing; if it is missing, ask up to three short questions, confirm the
  goal, write `project.md`, then generate `plan.html`. The HTML is a reading view
  only and never replaces `project.md` as the source of truth. It writes no code,
  tests, dependencies or settings. 中文触发词：plan-first、任务目标可视化、生成计划书、项目计划 HTML、需求可视化。
user-invocable: true
---

# plan-first — turn a task goal into a readable HTML plan

Writes only `project.md` (when it is missing) and the generated `plan.html`. It does not change code, tests, dependencies or settings.

## Trigger

Use this skill when the user invokes `/plan-first`, asks to “visualize the task goal”, or asks for a readable HTML plan.

## 1) Find the source

Look for `project.md` at the **workspace root**.

- **Exists** — read it and go straight to rendering. Do not interview again.
- **Missing** — continue with the short interview below.
- Do not silently use a different file. If the user names one, use that path and say so.

## 2) Settle the goal

Ask at most **3 rounds**, one question at a time. Keep each round short.

1. **Goal** — “What should be true when this is done, and who uses it?”
2. **Boundary** — “What must this include, and what is explicitly out of scope?”
3. **Done** — “How will we know it is done? Any stack, time or compatibility constraints?”

If the user says “enough” or answers partially, write the known parts and mark gaps as `待确认` / `Open`. Never invent a requirement, number, owner or deadline.

Before writing, show a compact five-line summary: goal, users, in scope, out of scope, acceptance. Ask once: “确认这份任务目标吗？” Only write after a clear yes.

## 3) Write `project.md`

Use this shape at the workspace root:

```markdown
# <short goal title>

## 目标
<one paragraph: whose problem, what becomes possible>

## 用户与场景
<who, when, how often>

## 范围
- In: <what this task includes>
- Out: <what it explicitly does not include>

## 验收标准
- [ ] <observable result or command>
- [ ] <observable result or command>

## 约束与假设
<stack, compatibility, time, budget; mark unconfirmed items as 待确认>

## 下一步
<the first concrete action after this plan is approved>
```

Rules:

- Never overwrite an existing `project.md`; if it exists, use it.
- Do not invent sections, facts or acceptance criteria. Missing becomes `待确认`.
- Keep the file short enough for a human to read without opening code.

## 4) Render the HTML

Resolve the skill base from this `SKILL.md`, not from the workspace. Run from the workspace root:

```bash
node "<skill-base>/scripts/render-plan.js" --source project.md --out plan.html
```

If `plan.html` already exists, add `--force` only after the user agrees to regenerate it.

The renderer:

- reads `project.md` as the only source of facts;
- writes one standalone `plan.html` with inline CSS, no network and no build step;
- escapes HTML and turns headings, lists, checkboxes and simple tables into a readable plan.

## 5) Report

Say:

- which source was used;
- that `plan.html` was generated;
- which sections were rendered;
- any `待确认` / `Open` items.

The HTML is for reading; it never replaces `project.md` as the source of truth.
