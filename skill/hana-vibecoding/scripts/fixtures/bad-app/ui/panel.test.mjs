import { test } from 'node:test';
// 反证样本：测试文件混进 App 目录 → WARN（打包会随包分发，dev-lessons §5）
test('placeholder', () => {});
