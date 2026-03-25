/**
 * Client-side GitHub content fetching utilities.
 * Fetches blog posts from a public GitHub repository.
 * Uses raw.githubusercontent.com (no API rate limits) for content,
 * and the GitHub API only for directory listing.
 */

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  heroImage?: string;
}

export interface GitHubBlogConfig {
  owner: string;
  repo: string;
  branch: string;
  contentPath: string;
}

// --- Frontmatter parser (runs client-side, no dependencies) ---

export function parseFrontmatter(raw: string): {
  data: Record<string, string | string[]>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, string | string[]> = {};
  let currentKey = "";
  const arrayBuffer: string[] = [];
  let collectingArray = false;

  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Continuation of a YAML array (lines starting with "- ")
    if (collectingArray && trimmed.startsWith("- ")) {
      arrayBuffer.push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
      continue;
    }
    if (collectingArray) {
      data[currentKey] = [...arrayBuffer];
      arrayBuffer.length = 0;
      collectingArray = false;
    }

    const kvMatch = trimmed.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kvMatch) continue;

    currentKey = kvMatch[1];
    const value = kvMatch[2].trim();

    if (value === "") {
      // Might be a multi-line array
      collectingArray = true;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      // Inline array: [tag1, tag2]
      data[currentKey] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[currentKey] = value.replace(/^["']|["']$/g, "");
    }
  }

  if (collectingArray) {
    data[currentKey] = [...arrayBuffer];
  }

  return { data, content: match[2] };
}

// --- Caching helpers (sessionStorage) ---

const CACHE_PREFIX = "aletik_blog";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(`${CACHE_PREFIX}_${key}`);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCache(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}_${key}`,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// --- Raw URL builder ---

function rawUrl(cfg: GitHubBlogConfig, filePath: string): string {
  return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${filePath}`;
}

// --- Public API ---

/**
 * Fetch list of all blog posts with metadata.
 * Makes 1 GitHub API call (directory listing) + N raw fetches (no rate limit).
 */
export async function fetchPostList(
  cfg: GitHubBlogConfig,
): Promise<BlogPost[]> {
  const cached = getCache<BlogPost[]>(`${cfg.contentPath}_list`);
  if (cached) return cached;

  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.contentPath}?ref=${cfg.branch}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const files: { name: string; path: string; type: string }[] =
    await res.json();
  const mdFiles = files.filter(
    (f) => f.type === "file" && f.name.endsWith(".md") && !f.name.startsWith("_"),
  );

  const posts = await Promise.all(
    mdFiles.map(async (file) => {
      try {
        const r = await fetch(rawUrl(cfg, file.path));
        if (!r.ok) return null;
        const text = await r.text();
        const { data, content } = parseFrontmatter(text);

        return {
          slug: file.name.replace(/\.md$/, ""),
          title:
            (data.title as string) ||
            file.name.replace(/\.md$/, "").replace(/-/g, " "),
          date: (data.date as string) || "",
          description: ((data.description || data.excerpt) as string) || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          heroImage: (data.heroImage as string) || undefined,
          content,
        } satisfies BlogPost;
      } catch {
        return null;
      }
    }),
  );

  const sorted = posts
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  setCache(`${cfg.contentPath}_list`, sorted);
  return sorted;
}

/**
 * Fetch a single blog post by slug.
 */
export async function fetchPost(
  slug: string,
  cfg: GitHubBlogConfig,
): Promise<BlogPost | null> {
  const cached = getCache<BlogPost>(`${cfg.contentPath}_${slug}`);
  if (cached) return cached;

  const url = rawUrl(cfg, `${cfg.contentPath}/${slug}.md`);
  const res = await fetch(url);
  if (!res.ok) return null;

  const text = await res.text();
  const { data, content } = parseFrontmatter(text);

  const post: BlogPost = {
    slug,
    title:
      (data.title as string) || slug.replace(/-/g, " "),
    date: (data.date as string) || "",
    description: ((data.description || data.excerpt) as string) || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    heroImage: (data.heroImage as string) || undefined,
    content,
  };

  setCache(`${cfg.contentPath}_${slug}`, post);
  return post;
}

/**
 * Rewrite relative image paths in markdown to point to GitHub raw URLs.
 */
export function rewriteImagePaths(
  markdown: string,
  cfg: GitHubBlogConfig,
): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (_match, alt, src) => {
      const fullUrl = rawUrl(cfg, `${cfg.contentPath}/${src}`);
      return `![${alt}](${fullUrl})`;
    },
  );
}

// --- Utilities ---

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
