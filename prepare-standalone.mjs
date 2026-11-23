/**
 * 本地按 standalone 产物启动前的准备脚本，配合 npm run start:standalone 使用。
 *
 * next build 在 output: 'standalone' 下只把 server.js、精简 node_modules 与
 * .next/server 等运行时必需文件写入 .next/standalone，public/ 和 .next/static/
 * 需要另行复制。缺了这两份目录时，SSR 页面本身能返回 200，但全部 JS / CSS /
 * 字体 / 启动图 / sw.js 都会 404，表现为白屏无样式，且 Service Worker 注册失败。
 * 线上由部署平台按 Next.js 模式自动补齐，这里只服务于「用和线上一致的产物做验证」。
 */
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const STANDALONE_DIR = '.next/standalone';

/** 源目录 -> 复制到 standalone 内的目标目录 */
const STATIC_ASSET_DIRS = [
  ['public', `${STANDALONE_DIR}/public`],
  ['.next/static', `${STANDALONE_DIR}/.next/static`],
];

const root = process.cwd();

/** 缺产物与缺源目录的成因不同，提示也要分开 */
const missingHint = (source) =>
  source.startsWith('.next') ? '请先执行 npm run build' : '请检查工作区是否完整';

if (!existsSync(resolve(root, STANDALONE_DIR))) {
  console.error(`未找到 ${STANDALONE_DIR}，请先执行 npm run build`);
  process.exit(1);
}

for (const [source, target] of STATIC_ASSET_DIRS) {
  if (!existsSync(resolve(root, source))) {
    console.error(`未找到 ${source}，${missingHint(source)}`);
    process.exit(1);
  }

  cpSync(resolve(root, source), resolve(root, target), { recursive: true });
  console.log(`已复制 ${source} -> ${target}`);
}
