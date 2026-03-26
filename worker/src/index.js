/**
 * Cloudflare Worker: Open Graph meta tag injection for social sharing.
 *
 * When a social media crawler (LinkedIn, Twitter, Facebook, etc.) requests
 * a /post or /project page, this worker fetches the markdown from GitHub,
 * parses the frontmatter, and rewrites the OG meta tags in the HTML response.
 *
 * Regular visitors get the page unchanged (served from Cloudflare cache).
 */

const CONFIG = {
  owner: "aletik",
  repo: "aletik.me",
  branch: "main",
  siteUrl: "https://aletik.me",
  defaultImage: "https://aletik.me/avatar.jpg",
};

const CRAWLER_UA =
  /linkedinbot|twitterbot|facebookexternalhit|slackbot|telegrambot|whatsapp|discordbot|pinterestbot|googlebot|bingbot|yandexbot/i;

// Map URL paths to content folders in the repo
const CONTENT_ROUTES = {
  "/post": "posts",
  "/post/": "posts",
  "/project": "projects",
  "/project/": "projects",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";

    // Only intercept crawler requests for content pages
    const contentPath = CONTENT_ROUTES[url.pathname];
    const slug = url.searchParams.get("slug");

    if (CRAWLER_UA.test(userAgent) && contentPath && slug) {
      try {
        return await handleCrawler(request, url, slug, contentPath);
      } catch (e) {
        // On any error, fall through to origin
        console.error("Worker error:", e);
      }
    }

    return fetch(request);
  },
};

async function handleCrawler(request, url, slug, contentPath) {
  // Fetch markdown from GitHub (raw.githubusercontent.com — no API rate limit)
  const rawUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${contentPath}/${slug}.md`;
  const mdResponse = await fetch(rawUrl, {
    cf: { cacheTtl: 300 }, // Cache GitHub response at edge for 5 min
  });

  if (!mdResponse.ok) {
    return fetch(request);
  }

  const markdown = await mdResponse.text();
  const meta = parseFrontmatter(markdown, contentPath);
  const pageUrl = `${CONFIG.siteUrl}${url.pathname}?slug=${slug}`;
  const pageTitle = `${meta.title} | Andrey Letov`;

  // Resolve image URL
  let imageUrl = CONFIG.defaultImage;
  if (meta.image) {
    imageUrl = meta.image.startsWith("http")
      ? meta.image
      : `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${contentPath}/${meta.image}`;
  }

  // Fetch origin HTML
  const originResponse = await fetch(request);

  // Rewrite meta tags using HTMLRewriter
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(pageTitle);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", pageTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute("content", "article");
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", pageUrl);
      },
    })
    .on('meta[name="twitter:card"]', {
      element(el) {
        el.setAttribute("content", "summary_large_image");
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute("content", pageTitle);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("head", {
      element(el) {
        // Append tags that don't exist in the static shell
        el.append(
          `<meta property="og:image" content="${imageUrl}" />`,
          { html: true },
        );
        el.append(
          `<meta name="twitter:image" content="${imageUrl}" />`,
          { html: true },
        );
        if (meta.date) {
          el.append(
            `<meta property="article:published_time" content="${new Date(meta.date).toISOString()}" />`,
            { html: true },
          );
        }
      },
    })
    .transform(originResponse);
}

function parseFrontmatter(content, contentPath) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { title: "", description: "", image: "", date: "" };

  const data = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (kv) {
      data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const body = content.replace(/^---[\s\S]*?---/, "");

  // Try frontmatter image first, then extract first image from markdown body
  let image = data.heroImage || data.image || data.ogImage || "";
  if (!image) {
    const imgMatch = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (imgMatch) {
      image = imgMatch[1];
    }
  }

  // Use frontmatter description, but if too short (<100 chars) extract from body
  let description = data.description || data.excerpt || "";
  if (description.length < 100) {
    const short = description;
    const paragraphs = body
      .split(/\n\n+/)
      .map(p => p.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/[#*_`>\-\[\]]/g, "").replace(/\s+/g, " ").trim())
      .filter(p => p.length > 100 && !p.startsWith("1.") && p !== short);
    if (paragraphs.length > 0) {
      description = paragraphs[0];
    }
    if (description.length > 200) {
      description = description.slice(0, 197) + "...";
    }
  }

  return {
    title: data.title || "",
    description,
    image,
    date: data.date || "",
  };
}
