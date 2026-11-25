/**
 * 构建前自动生成 Service Worker 缓存版本。
 *
 * 旧页面缓存里可能引用已被新构建删除的 /_next/static/chunks/*，每次构建换一个
 * 版本号即可让新 SW 在 activate 阶段清掉整个旧缓存，避免 ChunkLoadError。
 * 由 npm 的 prebuild 生命周期自动调用，不需要手改 public/sw.js。
 */
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const swPath = path.join(root, 'public', 'sw.js');

/** CI 若显式给了 BUILD_ID 就复用它，保证 SW 与 Next 构建版本一致 */
const buildId = (process.env.BUILD_ID ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
const version = buildId
  ? `v${buildId}`
  : `v${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;

const source = await readFile(swPath, 'utf8');
const updated = source.replace(
  /const CACHE_VERSION = ['"][^'"]+['"];/,
  `const CACHE_VERSION = '${version}';`,
);

if (updated === source) {
  throw new Error(`未在 ${path.relative(root, swPath)} 中找到 CACHE_VERSION 声明`);
}

await writeFile(swPath, updated, 'utf8');
console.log(`[sw] cache version -> ${version}`);
