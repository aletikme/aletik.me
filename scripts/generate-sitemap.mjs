import { readdirSync } from "fs";
import { writeFileSync } from "fs";
import { join } from "path";

const SITE = "https://aletik.me";
const today = new Date().toISOString().split("T")[0];

const staticPages = [
  { url: "/", priority: "1.0", changefreq: "weekly" },
  { url: "/posts", priority: "0.8", changefreq: "weekly" },
  { url: "/projects", priority: "0.8", changefreq: "weekly" },
  { url: "/about", priority: "0.7", changefreq: "monthly" },
];

function getMdSlugs(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

const postSlugs = getMdSlugs(join(process.cwd(), "posts"));
const projectSlugs = getMdSlugs(join(process.cwd(), "projects"));

const urls = [
  ...staticPages.map(
    (p) => `  <url>
    <loc>${SITE}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  ),
  ...postSlugs.map(
    (slug) => `  <url>
    <loc>${SITE}/post?slug=${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  ),
  ...projectSlugs.map(
    (slug) => `  <url>
    <loc>${SITE}/project?slug=${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(join(process.cwd(), "dist", "sitemap.xml"), sitemap);
console.log(`Sitemap generated with ${urls.length} URLs`);
