// 反证样本 · 故意写错。期望 check_app.mjs 至少报出：
// BOM(manifest) / rmSync / window.alert / os.tmpdir / ESM 重复声明 五条 ERROR
import fs from 'node:fs';
import os from 'node:os';

let count = 0;
let count = 1; // 重复声明 → ESM ERROR（node --check 抓不到）

export function cleanup() {
  const tmp = os.tmpdir() + '/gh-app';        // ERROR §1.1
  fs.rmSync(tmp, { recursive: true });        // ERROR §1.2
  if (window.confirm('确定退出登录？')) {     // ERROR §1.3
    sdk.tools.register('demo', {});           // WARN：未声明 app/tools
  }
}
