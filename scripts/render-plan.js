#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(HERE, '..', 'templates', 'plan.html')

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')
}

function renderBlocks(lines) {
  let html = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    if (line.startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`
      continue
    }

    if (line.startsWith('#### ')) {
      html += `<h4>${inline(line.slice(5).trim())}</h4>`
      i++
      continue
    }
    if (line.startsWith('### ')) {
      html += `<h3>${inline(line.slice(4).trim())}</h3>`
      i++
      continue
    }
    if (line.startsWith('> ')) {
      const quote = []
      while (i < lines.length && lines[i].startsWith('> ')) quote.push(lines[i++].slice(2))
      html += `<blockquote>${quote.map(inline).join('<br>')}</blockquote>`
      continue
    }

    if (/^\s*[-*] /.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*] /, '')
        i++
        const task = /^\[([ xX])\]\s+/.exec(item)
        if (task) {
          item = item.replace(/^\[([ xX])\]\s+/, '')
          items.push(`<li class="task ${task[1].toLowerCase() === 'x' ? 'done' : ''}"><span class="box">${task[1].toLowerCase() === 'x' ? '✓' : '□'}</span>${inline(item)}</li>`)
        } else {
          items.push(`<li>${inline(item)}</li>`)
        }
      }
      html += `<ul>${items.join('')}</ul>`
      continue
    }

    if (/^\s*\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\. /, ''))}</li>`)
        i++
      }
      html += `<ol>${items.join('')}</ol>`
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i++
      }
      html += `<div class="table-wrap"><table><thead><tr>${head.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      continue
    }

    if (line.trim() === '---') { html += '<hr>'; i++; continue }

    const paragraph = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4} |> |\s*[-*] |\s*\d+\. |---)/.test(lines[i])) {
      paragraph.push(lines[i].trim())
      i++
    }
    html += `<p>${inline(paragraph.join(' '))}</p>`
  }

  return html || '<p class="empty">（未提供内容）</p>'
}

export function parseDocument(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n')
  let title = ''
  let inFence = false
  const intro = []
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('```')) inFence = !inFence
    if (!inFence && !title && /^# /.test(line)) {
      title = line.slice(2).trim()
      continue
    }
    if (!inFence && /^## /.test(line)) {
      current = { heading: line.slice(3).trim(), lines: [] }
      sections.push(current)
      continue
    }
    if (current) current.lines.push(line)
    else intro.push(line)
  }

  if (intro.some(line => line.trim())) sections.unshift({ heading: '概述', lines: intro })
  for (const section of sections) {
    while (section.lines.length && !section.lines[0].trim()) section.lines.shift()
    while (section.lines.length && !section.lines.at(-1).trim()) section.lines.pop()
  }

  return { title, sections: sections.filter(section => section.heading || section.lines.length) }
}

function bulletCount(lines) {
  return lines.filter(line => /^\s*[-*]\s+/.test(line)).length
}

export function summarize(document) {
  const allText = document.sections.map(section => section.lines.join('\n')).join('\n')
  const tasks = [...allText.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+/gm)]
  const tasksDone = tasks.filter(match => match[1].toLowerCase() === 'x').length
  const taskPct = tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0

  const scopeSection = document.sections.find(section => /^(范围|scope)$/i.test(section.heading))
  const scopeLines = scopeSection
    ? scopeSection.lines.filter(line => /^\s*[-*]\s+/.test(line))
    : []
  let scopeIn = 0
  let scopeOut = 0
  let scopeClassified = false
  for (const line of scopeLines) {
    if (/(^|\s)(In|包含|包括|纳入)\s*[:：]/i.test(line)) { scopeIn++; scopeClassified = true }
    else if (/(^|\s)(Out|不包含|不包括|不做|排除)\s*[:：]/i.test(line)) { scopeOut++; scopeClassified = true }
  }
  if (!scopeClassified) scopeIn = scopeLines.length

  const constraintSection = document.sections.find(section => /约束|假设|constraints?|assumptions?/i.test(section.heading))
  const openCount = (allText.match(/待确认|未决|\bopen\b/gi) || []).length

  return {
    sections: document.sections.length,
    tasksDone,
    tasksTotal: tasks.length,
    taskPct,
    scopeIn,
    scopeOut,
    scopeTotal: scopeIn + scopeOut,
    constraints: constraintSection ? bulletCount(constraintSection.lines) : 0,
    openCount,
  }
}

function renderDashboard(stats) {
  const ring = stats.tasksTotal
    ? `<svg class="ring" viewBox="0 0 42 42" role="img" aria-label="验收进度 ${stats.taskPct}%">
        <circle class="ring-bg" cx="21" cy="21" r="16" pathLength="100"></circle>
        <circle class="ring-value" cx="21" cy="21" r="16" pathLength="100" stroke-dasharray="${stats.taskPct} 100"></circle>
      </svg><span class="ring-label">${stats.taskPct}%</span>`
    : '<span class="metric-empty">—</span>'

  const scopeTotal = stats.scopeTotal || 1
  const scopePct = stats.scopeTotal ? Math.round((stats.scopeIn / scopeTotal) * 100) : 0

  return `<section class="overview" aria-labelledby="overview-title">
    <div class="overview-head">
      <p class="eyebrow">AT A GLANCE</p>
      <h2 id="overview-title">计划概览</h2>
      <p>从 project.md 直接统计，不引入额外事实。</p>
    </div>
    <div class="metrics">
      <article class="metric">
        <div class="metric-visual ring-wrap">${ring}</div>
        <div><span class="metric-kicker">验收进度</span><strong>${stats.tasksDone} / ${stats.tasksTotal}</strong><small>已完成 / 总项</small></div>
      </article>
      <article class="metric">
        <div class="metric-visual scope-visual">
          <div class="scope-bar"><span style="width:${scopePct}%"></span></div>
          <div class="scope-legend"><span><i class="dot in"></i>In ${stats.scopeIn}</span><span><i class="dot out"></i>Out ${stats.scopeOut}</span></div>
        </div>
        <div><span class="metric-kicker">范围平衡</span><strong>${stats.scopeTotal}</strong><small>纳入 / 排除条目</small></div>
      </article>
      <article class="metric">
        <div class="metric-visual big-number">${stats.sections}</div>
        <div><span class="metric-kicker">章节</span><strong>${stats.constraints}</strong><small>约束与假设条目</small></div>
      </article>
      <article class="metric">
        <div class="metric-visual big-number">${stats.openCount}</div>
        <div><span class="metric-kicker">待确认</span><strong>Open</strong><small>需要后续决定的事项</small></div>
      </article>
    </div>
  </section>`
}

export function renderPlanHtml(markdown, options = {}) {
  const document = parseDocument(markdown)
  const title = document.title || basename(options.source || 'project.md', '.md')
  const sections = document.sections.length
    ? document.sections
    : [{ heading: '概述', lines: markdown.split('\n') }]
  const stats = summarize(document)

  const nav = sections
    .map((section, index) => `<a href="#section-${index + 1}"><span class="nav-index">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(section.heading)}</span></a>`)
    .join('')

  const body = sections.map((section, index) => `
    <section class="block" id="section-${index + 1}">
      <div class="block-head"><span class="index">${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(section.heading)}</h2></div>
      <div class="content">${renderBlocks(section.lines)}</div>
    </section>`).join('')

  const template = readFileSync(TEMPLATE, 'utf8')
  return template
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replaceAll('{{SOURCE}}', escapeHtml(options.source || 'project.md'))
    .replaceAll('{{GENERATED}}', escapeHtml(options.generated || new Date().toISOString()))
    .replaceAll('{{NAV}}', nav || '<span>暂无章节</span>')
    .replaceAll('{{DASHBOARD}}', renderDashboard(stats))
    .replaceAll('{{SECTIONS}}', body)
}

function parseArgs(argv) {
  const options = { source: 'project.md', out: 'plan.html', force: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--force') options.force = true
    else if (arg === '--source' || arg === '--out') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error(`缺少值: ${arg}`)
      if (arg === '--source') options.source = value
      else options.out = value
    } else throw new Error(`未知参数: ${arg}`)
  }
  return options
}

function usage() {
  return `用法: node render-plan.js [--source project.md] [--out plan.html] [--force]\n\n读取 project.md，生成独立 HTML 计划书。\n--force  覆盖已存在的输出文件\n`
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    console.error(error.message)
    console.error(usage())
    return 2
  }
  if (options.help) {
    console.log(usage())
    return 0
  }

  const source = resolve(cwd, options.source)
  const out = resolve(cwd, options.out)
  if (!existsSync(source)) {
    console.error(`找不到源文件: ${source}`)
    return 2
  }
  if (existsSync(out) && !options.force) {
    console.error(`输出已存在: ${out}（加 --force 覆盖）`)
    return 1
  }

  const markdown = readFileSync(source, 'utf8')
  const html = renderPlanHtml(markdown, {
    source: options.source,
    generated: new Date().toISOString(),
  })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html, 'utf8')
  const document = parseDocument(markdown)
  console.log(`已生成 ${options.out}`)
  console.log(`标题: ${document.title || '(无标题)'}`)
  console.log(`章节: ${document.sections.length}`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
