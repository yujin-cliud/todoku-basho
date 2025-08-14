// tools/generate-sitemap.mjs
import { promises as fs } from "node:fs";
import path from "node:path";

// ===== 設定（必要ならここだけ変える） =====
const BASE_URL = "https://yujin-cliud.github.io/Lumina/"; // 末尾スラッシュ必須
const OUTPUT_SITEMAP = "sitemap.xml"; // ルートに出力
const OUTPUT_ROBOTS  = "robots.txt";  // ルートに出力
// ======================================

// 除外したい HTML（Google サーチコンソールの確認ファイルなどは Sitemap から外す）
const excludeHtml = new Set([
  "404.html",                           // 404 を入れたくない場合
  // 例: "googleb5874dcae5c1a456.html",
]);

/** yyyy-mm-dd 形式に整える */
const fmtDate = (d) =>
  new Date(d).toISOString().slice(0, 10);

/** 再帰的に HTML を集める */
async function walkHtml(dir) {
  const result = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    // 無視したいディレクトリ
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      result.push(...(await walkHtml(path.join(dir, entry.name))));
      continue;
    }
    // HTML 以外はスキップ
    if (!entry.name.toLowerCase().endsWith(".html")) continue;

    const full = path.join(dir, entry.name);
    const rel  = path.relative(process.cwd(), full).replaceAll(path.sep, "/"); // ルートからの相対
    if (excludeHtml.has(rel)) continue;

    const stat = await fs.stat(full);
    result.push({ rel, mtime: stat.mtime });
  }
  return result;
}

/** 相対パスを URL に変換（index.html はディレクトリ URL に正規化） */
function toUrl(rel) {
  // 例: "index.html" -> "", "sub/index.html" -> "sub/"
  if (rel.endsWith("/index.html")) {
    return BASE_URL + rel.slice(0, -("index.html".length));
  }
  if (rel === "index.html") {
    return BASE_URL; // ルート
  }
  return BASE_URL + rel;
}

async function main() {
  const htmls = await walkHtml(process.cwd());

  // XML を組み立て
  const urlset = [];
  for (const { rel, mtime } of htmls) {
    urlset.push(
      [
        "  <url>",
        `    <loc>${toUrl(rel)}</loc>`,
        `    <lastmod>${fmtDate(mtime)}</lastmod>`,
        "    <changefreq>weekly</changefreq>",
        "    <priority>0.8</priority>",
        "  </url>",
      ].join("\n")
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urlset.join("\n") +
    `\n</urlset>\n`;

  await fs.writeFile(OUTPUT_SITEMAP, xml, "utf8");
  console.log(`✅ 生成: ${OUTPUT_SITEMAP} (${htmls.length}件)`);

  // robots.txt も同時更新（任意）
  const robots =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Sitemap: ${BASE_URL}${OUTPUT_SITEMAP}\n`;
  await fs.writeFile(OUTPUT_ROBOTS, robots, "utf8");
  console.log(`✅ 生成: ${OUTPUT_ROBOTS}`);

  // 画面で確認しやすいように簡易ログ
  console.log("\n— 収集した HTML —");
  htmls.forEach(({ rel }) => console.log("•", rel));
}

main().catch((e) => {
  console.error("❌ 生成エラー:", e);
  process.exit(1);
});
