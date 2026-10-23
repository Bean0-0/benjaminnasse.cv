# Benjamin Nasse

[benjaminnasse.cv](https://benjaminnasse.cv) — my personal website for projects, writeups, and résumé.

Inspired by [Obsidian](https://obsidian.md): a simple file explorer, reading pane, and light/dark themes.

Built with HTML, CSS, and JavaScript. Hosted on [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), which serves the `public/` directory directly. Deployment is configured in `wrangler.jsonc` and managed with Wrangler.

## Development

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

## Deployment

With Cloudflare authorization:

```sh
npm run deploy
```
