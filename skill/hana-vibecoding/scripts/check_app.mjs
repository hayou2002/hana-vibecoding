#!/usr/bin/env node
/**
 * check_app.mjs — Hana App 静态门禁（dev-lessons §6.1 可静态判定项的脚本化）
 *
 * 用法：node check_app.mjs <app目录> [--verbose]
 * 退出码：有 ERROR → 1；仅 WARN/INFO → 0。
 *
 * 覆盖检查（可静态判定项；文档八项中的「打包内容核对」需解 zip、「渲染实拍/主题模拟」属运行时，均不归本门禁）：
 *   E1 manifest 存在性            E2 JSON/源码 BOM
 *   E3 危险 API（静默失败 §1.1-1.4）  E4 ESM 硬校验（§1.6）
 *   W1 [hidden] 兜底（§1.5）       W2 主题变量三级链
 *   W3 sdk 调用与权限声明对账        I1 声明能力词清单（人眼核最小权限）
 *   W4 测试文件混进包目录（§5 打包坑）
 *
 * 反证样本：scripts/fixtures/bad-app/ —— 修脚本必须先让它继续报红。
 *   ERROR＝静默失败类，必改；WARN＝需人工核对的线索；INFO＝优化建议。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const targetArg = argv.find(a => !a.startsWith('--'));
if (!targetArg) { console.error('用法: node check_app.mjs <app目录> [--verbose]'); process.exit(2); }
const root = path.resolve(targetArg);
if (!fs.existsSync(root)) { console.error(`目录不存在: ${root}`); process.exit(2); }

// vm.SourceTextModule 需要 flag；缺了就带 flag 自我重启一次
if (typeof vm.SourceTextModule !== 'function') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const findings = [];
const add = (level, file, line, msg, hint) => findings.push({ level, file, line, msg, hint });
const lineAt = (text, idx) => text.slice(0, idx).split('\n').length;

// ---- 收集文件 ----
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '__pycache__']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name)); }
    else files.push(path.join(dir, e.name));
  }
})(root);
const rel = f => path.relative(root, f).replaceAll('\\', '/');
const readSafe = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

// 官方脚手架/宿主桥文件不是作者代码，不检查（sdk.js、sdk/ 目录、官方模板 css）
const isBridge = f => /(^|[\\/])sdk([\\/]|\.js$)/i.test(f) || /(^|[\\/])(app-ui|components|tokens)\.css$/i.test(f);
const ownFiles = files.filter(f => !isBridge(f));
const bridgeCount = files.length - ownFiles.length;

const jsFiles = ownFiles.filter(f => /\.(m?js|cjs)$/i.test(f));
const cssFiles = ownFiles.filter(f => /\.css$/i.test(f));
const jsonFiles = ownFiles.filter(f => /\.json$/i.test(f) && !/package-lock\.json$/i.test(f) && !/[\\/]manifest\.json$/i.test(f));

// ---- E1 manifest 存在性 ----
const manifestPath = files.find(f => /manifest\.json$/i.test(f));
const manifestText = manifestPath ? readSafe(manifestPath) : null;
if (!manifestPath) add('ERROR', 'manifest.json', 0, 'App 目录里没有 manifest.json', '用官方 hana-app-creator 脚手架生成，别手搓');

// ---- E2 BOM（宿主 JSON.parse / import 首字节遇 BOM 即炸，§1.7）----
for (const f of [...jsonFiles, ...jsFiles, ...cssFiles, ...(manifestPath ? [manifestPath] : [])]) {
  const fd = fs.openSync(f, 'r');
  const buf = Buffer.alloc(3);
  const n = fs.readSync(fd, buf, 0, 3, 0);
  fs.closeSync(fd);
  if (n === 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF)
    add('ERROR', rel(f), 0, '文件带 UTF-8 BOM', 'PS5.1 Set-Content -Encoding UTF8 会写 BOM；用 [IO.File]::WriteAllText(path,text,(New-Object Text.UTF8Encoding $false))');
}

// ---- E3 危险 API（静默失败清单 §1.1~1.4） ----
const DANGER = [
  [/\bos\.tmpdir\s*\(/g, 'WARN', '用了 os.tmpdir()', '若用于落盘写入必被拒（§1.1）→ 改用 sdk.dataDir；若只拼接/读取请人工确认后忽略'],
  [/\bfs\.rmSync\s*\(/g, 'ERROR', '用了 fs.rmSync()', '沙箱内 rmSync 静默失效、不报错也删不掉（§1.2）→ 用 fs.unlinkSync()'],
  [/\bwindow\.(confirm|alert)\s*\(/g, 'ERROR', '用了 window.confirm/alert', 'iframe 沙箱内被禁且静默失败（§1.3）→ 面板内自定义确认卡'],
  [/\bhana\.external\.open\b/g, 'WARN', '用了 hana.external.open', 'iframe 面板内不可靠（§1.4）→ 外链由后端进程打开；非面板上下文可确认后忽略'],
];
for (const f of jsFiles) {
  const code = readSafe(f); if (code === null) continue;
  for (const [re, level, msg, hint] of DANGER) {
    let m; while ((m = re.exec(code)) !== null) add(level, rel(f), lineAt(code, m.index), msg, hint);
  }
  // 裸 alert(/confirm( 可能是 window 同名简写，提示人工确认
  let m; const bare = /(?<![\w.$])(alert|confirm)\s*\(/g;
  while ((m = bare.exec(code)) !== null) add('WARN', rel(f), lineAt(code, m.index), `裸 ${m[1]}( 调用`, '若指 window.alert/confirm 则必改；若是自建函数可忽略（§1.3）');
}

// ---- W1 [hidden] 兜底（§1.5） ----
const cssAll = cssFiles.map(readSafe).filter(Boolean).join('\n');
if (/\bdisplay:\s*(flex|grid|block)/.test(cssAll) && !/\[\s*hidden\s*\][^{]*\{[^}]*display:\s*none/.test(cssAll))
  add('WARN', '(全部 css)', 0, '组件 CSS 设了 display 但全项目缺 [hidden]{display:none!important} 兜底', 'hidden 属性会被 display 盖掉，元素"隐藏了却还显示"（§1.5）');

// ---- W2 主题变量三级链（§2） ----
const KNOWN_OLD = ['--sidebar-bg', '--main-bg', '--accent', '--text-color', '--card-bg'];
const definedVars = new Set([...cssAll.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)].map(m => m[1]));
for (const f of cssFiles) {
  const css = readSafe(f); if (css === null) continue;
  let m; const use = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/g; // 无 fallback 兜底的取用
  while ((m = use.exec(css)) !== null) {
    const v = m[1];
    if (v.startsWith('--hana-') || definedVars.has(v)) continue;
    if (KNOWN_OLD.includes(v))
      add('WARN', rel(f), lineAt(css, m.index), `裸用旧主题变量 var(${v})，自定义主题下不跟随`, '按 --hana-* → 旧名 → 字面默认值 三级取值（§2）');
    else
      add('INFO', rel(f), lineAt(css, m.index), `var(${v}) 未在本项目定义且无 fallback`, '确认它由主题 CSS 提供且有三級链，否则自定义主题会掉色');
  }
}

// ---- W3/I1 sdk 调用与权限声明对账 ----
const declared = new Set(manifestText ? [...manifestText.matchAll(/app\/[A-Za-z0-9._-]+/g)].map(m => m[0]) : []);
const domainPrefix = { tools: 'app/tools', commands: 'app/commands', hooks: 'app/hooks', session: 'app/session', notifications: 'app/notifications', windows: 'app/windows', input: 'app/input', resources: 'app/resources', process: 'app/process' };
const usedDomains = new Set();
for (const f of jsFiles) {
  const code = readSafe(f); if (code === null) continue;
  let m; const d = /\bsdk\.([a-zA-Z]+)\b/g;
  while ((m = d.exec(code)) !== null) if (domainPrefix[m[1]]) usedDomains.add(m[1]);
}
for (const dom of usedDomains) {
  const p = domainPrefix[dom];
  if (![...declared].some(c => c === p || c.startsWith(p + '.') || c.startsWith(p + '/')))
    add('WARN', 'manifest.json', 0, `代码调用 sdk.${dom}.* 但 manifest 未见 ${p}/* 声明`, '运行时必被拒；补声明或去掉调用');
}
for (const cap of declared) {
  const dom = cap.split('/')[1]?.split('.')[0];
  if (domainPrefix[dom] && !usedDomains.has(dom))
    add('INFO', 'manifest.json', 0, `声明了 ${cap} 但代码未见对应 sdk.${dom} 调用`, '确认是否多要了权限（最小权限）');
}

// ---- W4 测试文件混进包目录（§5：打包器无排除规则） ----
for (const f of files) {
  if (/\.(test|spec)\.(m?js|cjs)$/i.test(f))
    add('WARN', rel(f), 0, '测试文件在 App 目录内，打包会随包分发', '移到仓库根 tests/，不进 App 目录（§5）');
}

// ---- E4 ESM 硬校验（§1.6：node --check 抓不到的用 SourceTextModule 抓） ----
for (const f of jsFiles) {
  const code = readSafe(f); if (code === null) continue;
  try { new vm.SourceTextModule(code, { identifier: rel(f) }); }
  catch (e) { add('ERROR', rel(f), 0, `ESM 解析失败: ${e.message}`, '含重复声明等 node --check 不报的错（§1.6）'); }
}

// ---- 输出：同文件同级同问题聚合，防刷屏 ----
const order = { ERROR: 0, WARN: 1, INFO: 2 };
const merged = new Map();
for (const x of findings) {
  const key = `${x.level}|${x.file}|${x.msg}`;
  const g = merged.get(key);
  if (g) { g.count++; if (x.line < g.line || g.line === 0) g.line = x.line; }
  else merged.set(key, { ...x, count: 1 });
}
const rows = [...merged.values()].sort((a, b) => order[a.level] - order[b.level] || a.file.localeCompare(b.file) || a.line - b.line);
const shown = verbose ? rows : rows.filter(x => x.level !== 'INFO');
const counts = { ERROR: 0, WARN: 0, INFO: 0 };
for (const x of rows) counts[x.level] += x.count;

console.log(`check_app · ${rel(root) || '.'} · 作者文件 ${ownFiles.length} 个（已跳过官方桥文件 ${bridgeCount} 个）`);
for (const x of shown) console.log(`[${x.level}] ${x.file}${x.line ? ':' + x.line : ''} — ${x.msg}${x.count > 1 ? ` ×${x.count}处` : ''}\n        ↳ ${x.hint}`);
const hidden = rows.filter(x => x.level === 'INFO').reduce((s, x) => s + (verbose ? 0 : x.count), 0);
console.log(`—— ERROR ${counts.ERROR} / WARN ${counts.WARN} / INFO ${counts.INFO}${hidden ? `（INFO 未显示，加 --verbose）` : ''}`);
process.exit(counts.ERROR > 0 ? 1 : 0);
