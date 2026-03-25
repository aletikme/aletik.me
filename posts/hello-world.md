---
title: Hello World
date: 2026-03-25
description: First post on my new site — built with Astro and powered by GitHub.
tags: [meta, web]
---

Welcome to my corner of the internet. This site is built as a fully static shell served from my home server and cached by Cloudflare, while all blog content — including this post — is fetched directly from GitHub at runtime.

## How it works

The site itself is just HTML, CSS, and a small amount of JavaScript. When you visit the posts page, client-side code fetches the markdown files from this repository via `raw.githubusercontent.com`. No server-side rendering, no database, no CMS.

- **Zero server hits for content** — Cloudflare caches the static shell, GitHub serves the markdown
- **Instant publishing** — push a `.md` file to the repo and it's live
- **No rebuild needed** — only the site shell requires a build step

## What's next

I'll be writing about fintech, product management, AI, and the occasional hardware tinkering project. Stay tuned.
