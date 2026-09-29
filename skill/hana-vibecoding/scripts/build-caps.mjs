#!/usr/bin/env node
/**
 * build-caps.mjs — 从 api-capabilities.md 生成分节查询文件 references/caps/
 *
 * 为什么存在：55 KB 全表的最小读取单元太大。caps/ 让"查一个域"只读 2~6 KB。
 * 铁律：caps/ 是**生成物**，唯一事实源是 api-capabilities.md。
 *      改完全集跑本脚本重新生成；手改 caps/ 会被下次生成覆盖。
 * 用法：node scripts/build-caps.mjs（脚本位置无关，路径已锚定）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const refDir = path.join(here, '..', 'references');
const srcPath = path.join(refDir, 'api-capabilities.md');
const outDir = path.join(refDir, 'caps');

const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

// —— 解析：一级 ## 分节；§1 内再按 ### 细分 ——
const sections = []; // {no:'1'|'2'..., level:'##'|'###', title, start, end}
let cur = null;
const flush = end => { if (cur) { cur.end = end; sections.push(cur); cur = null; } };
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(#{2,3})\s+([0-9]+)([.\s][^#]*)?\s*(.*)$/);
  const h2 = lines[i].match(/^##\s+(.*)$/);
  const h3 = lines[i].match(/^###\s+(.*)$/);
  if (h2 || h3) {
    const level = h2 ? '##' : '###';
    const title = (h2 || h3)[1].trim();
    const noMatch = title.match(/^(\d+(?:\.\d+)?)/);
    if (noMatch) { flush(i); cur = { level, no: noMatch[1], title, start: i }; }
    else { flush(i); cur = { level, no: null, title, start: i }; } // 如 "## 统计"
  }
}
flush(lines.length);

const slug = title => {
  const stripped = title.replace(/^\d+(\.\d+)*\s*/, '');
  const en = stripped.replace(/[（(）)」、，]/g, ' ')
    .match(/[A-Za-z][A-Za-z0-9./_-]*/g) || [];
  const s = en.join('-').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'misc';
};

// —— 清场重写 ——
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const generated = [];
const skip = t => /怎么读这份表|统计/.test(t);
// 有 ### 子节的 ## 父节（如 §1）不单独成文件，避免空壳
const hasChild = sec => sec.level === '##' && sections.some(s => s.level === '###' && s.no && s.no.startsWith(sec.no + '.'));
for (const sec of sections) {
  if (!sec.no || skip(sec.title) || hasChild(sec)) continue;
  const body = lines.slice(sec.start, sec.end).join('\n').trimEnd();
  // §1 的每个 1.x 单独成文件；§2~§5 整节成文件
  const fname = `${sec.no}-${slug(sec.title)}.md`;
  const header = `> ⚙️ 生成物，勿手改。唯一事实源：\`../api-capabilities.md\` §${sec.no}；改完全集跑 \`node scripts/build-caps.mjs\` 重新生成。\n\n`;
  fs.writeFileSync(path.join(outDir, fname), header + body + '\n', 'utf8');
  generated.push({ fname, no: sec.no, title: sec.title, bytes: fs.statSync(path.join(outDir, fname)).size });
}

// —— INDEX ——
const indexLines = [
  '# caps/ 索引（生成物）',
  '',
  '> 由 build-caps.mjs 生成。查能力：先回 `capability-map.md`（任务导向），查不到再按下面挑**一个文件整份读**（每份 ≤6 KB）。',
  '> 唯一事实源是 `../api-capabilities.md`，本目录只读不改；重生成后 `git diff references/caps` 应为空（除源文件有改动）。',
  '',
  '| 域 | 文件 | 大小 |',
  '|---|---|---|',
  ...generated.map(g => `| ${g.title} | [\`${g.fname}\`](./${g.fname}) | ${(g.bytes / 1024).toFixed(1)} KB |`),
  '',
];
fs.writeFileSync(path.join(outDir, 'INDEX.md'), indexLines.join('\n'), 'utf8');

console.log(`caps/ 生成完成：${generated.length} 个域文件 + INDEX.md → ${outDir}`);
const max = Math.max(...generated.map(g => g.bytes));
console.log(`最大单文件 ${(max / 1024).toFixed(1)} KB`);
