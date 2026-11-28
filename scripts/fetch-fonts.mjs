// 下载 Noto Serif SC（思源宋体）的 Google Fonts unicode-range 分片到本地，
// 生成 app/fonts.css（@font-face 全部指向 /fonts/ 下的本地文件）。
// 运行：bun scripts/fetch-fonts.mjs
import fs from "node:fs";
import path from "node:path";

const FAMILY = "Noto Serif SC";
const SLUG = "noto-serif-sc";
const WEIGHTS = [400, 700, 900];
const CSS_HOSTS = ["https://fonts.googleapis.com", "https://fonts.loli.net"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const OUT_DIR = path.join(process.cwd(), "public", "fonts", SLUG);
const CSS_OUT = path.join(process.cwd(), "app", "fonts.css");

async function fetchCss() {
  const query = `${FAMILY.replace(/ /g, "+")}:wght@${WEIGHTS.join(";")}&display=swap`;
  let lastError;
  for (const host of CSS_HOSTS) {
    try {
      const res = await fetch(`${host}/css2?family=${query}`, {
        headers: { "User-Agent": UA },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const css = await res.text();
      if (!css.includes("@font-face")) throw new Error("响应中没有 @font-face");
      console.log(`字体 CSS 来源：${host}`);
      return css;
    } catch (error) {
      lastError = error;
      console.warn(`源不可用 ${host}: ${error.message}`);
    }
  }
  throw lastError;
}

function parseBlocks(css) {
  const blocks = [];
  const re = /@font-face\s*\{([^}]+)\}/g;
  for (const match of css.matchAll(re)) {
    const body = match[1];
    const pick = (prop) => {
      const m = body.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`));
      return m ? m[1].trim() : "";
    };
    const urlMatch = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    blocks.push({
      weight: pick("font-weight"),
      unicodeRange: pick("unicode-range"),
      url: urlMatch[1],
    });
  }
  return blocks;
}

async function downloadAll(tasks) {
  const failures = [];
  let done = 0;
  const batch = 10;
  for (let i = 0; i < tasks.length; i += batch) {
    await Promise.all(
      tasks.slice(i, i + batch).map(async ({ url, file }) => {
        try {
          const res = await fetch(url, { headers: { "User-Agent": UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        } catch (error) {
          failures.push(`${url} → ${error.message}`);
        }
        done += 1;
        if (done % 50 === 0) console.log(`  已下载 ${done}/${tasks.length}`);
      })
    );
  }
  if (failures.length) {
    console.error(`下载失败 ${failures.length} 个：`);
    failures.forEach((f) => console.error("  " + f));
    process.exit(1);
  }
}

const css = await fetchCss();
const blocks = parseBlocks(css);
console.log(`解析到 ${blocks.length} 个分片声明`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const tasks = [];
const faceCss = [];
const counters = {};
for (const block of blocks) {
  const weight = block.weight || "400";
  counters[weight] = (counters[weight] ?? 0) + 1;
  const file = `${SLUG}-${weight}-${String(counters[weight]).padStart(3, "0")}.woff2`;
  tasks.push({ url: block.url, file: path.join(OUT_DIR, file) });
  faceCss.push(
    `@font-face {\n  font-family: '${FAMILY}';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(/fonts/${SLUG}/${file}) format('woff2');\n  unicode-range: ${block.unicodeRange};\n}`
  );
}

await downloadAll(tasks);

fs.writeFileSync(
  CSS_OUT,
  `/* 本地化的 ${FAMILY}（思源宋体）：Google Fonts unicode-range 分片，\n   由 scripts/fetch-fonts.mjs 生成，文件位于 public/fonts/${SLUG}/。 */\n\n${faceCss.join("\n\n")}\n`
);

const total = tasks.reduce((sum, t) => sum + fs.statSync(t.file).size, 0);
console.log(
  `完成：${tasks.length} 个分片 → public/fonts/${SLUG}/，共 ${(total / 1024 / 1024).toFixed(2)} MB；CSS → app/fonts.css`
);
