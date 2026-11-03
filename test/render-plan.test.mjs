import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { parseDocument, renderPlanHtml } from '../scripts/render-plan.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const SCRIPT = join(ROOT, 'scripts', 'render-plan.js')
const FIXTURE = join(ROOT, 'examples', 'project.md')

function project() {
  const root = mkdtempSync(join(tmpdir(), 'plan-first-'))
  writeFileSync(join(root, 'project.md'), readFileSync(FIXTURE, 'utf8'), 'utf8')
  return root
}

test('parseDocument: title and H2 sections', () => {
  const doc = parseDocument(readFileSync(FIXTURE, 'utf8'))
  assert.equal(doc.title, '给内部后台加登录')
  assert.deepEqual(doc.sections.map(section => section.heading), ['目标', '用户与场景', '范围', '验收标准', '约束与假设', '下一步'])
})

test('renderPlanHtml: includes title, sections, cards and escaped HTML', () => {
  const html = renderPlanHtml('# A <script>alert(1)</script>\n\n## 目标\n\n安全 <b>第一</b>\n\n## 验收标准\n\n- [x] 已做\n- [ ] 未做\n', { source: 'project.md', generated: '2026-11-03T00:00:00.000Z' })
  assert.match(html, /<title>A &lt;script&gt;alert\(1\)&lt;\/script&gt; · 任务计划<\/title>/)
  assert.match(html, /id="section-1"/)
  assert.match(html, /class="task done"/)
  assert.match(html, /□/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /source: project.md/)
})

test('renderPlanHtml: renders a simple table', () => {
  const html = renderPlanHtml('# T\n\n## 范围\n\n| 项目 | 状态 |\n|---|---|\n| 登录 | 包含 |\n', { source: 'project.md' })
  assert.match(html, /<table>/)
  assert.match(html, /<th>项目<\/th>/)
  assert.match(html, /<td>登录<\/td>/)
})

test('CLI: renders project.md to plan.html', () => {
  const root = project()
  const out = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' })
  assert.equal(out.status, 0, out.stderr)
  assert.equal(existsSync(join(root, 'plan.html')), true)
  const html = readFileSync(join(root, 'plan.html'), 'utf8')
  assert.match(html, /给内部后台加登录/)
  assert.match(html, /验收标准/)
  assert.doesNotMatch(html, /\{\{[^}]+\}\}/)
})

test('CLI: refuses to overwrite without --force', () => {
  const root = project()
  writeFileSync(join(root, 'plan.html'), 'old', 'utf8')
  const out = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' })
  assert.equal(out.status, 1)
  assert.match(out.stderr, /--force/)
  assert.equal(readFileSync(join(root, 'plan.html'), 'utf8'), 'old')
})

test('CLI: missing source exits 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'plan-first-missing-'))
  const out = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' })
  assert.equal(out.status, 2)
  assert.match(out.stderr, /找不到源文件/)
})
