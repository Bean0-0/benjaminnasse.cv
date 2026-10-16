# Benjamin Nasse · Personal website

Compact single-column portfolio at **https://benjaminnasse.cv**. Formatting follows [Nolan Yee's portfolio](https://www.nolanyee.cv/) without its terminal: centered 600px column, Geist typography, gray section labels, thin rules, and short entries. Original implementation with Benjamin's content. Plain HTML and CSS, served by Cloudflare Workers Static Assets. No client-side JavaScript, third-party requests, tracking, or production dependencies.

Geist is self-hosted under the SIL Open Font License. Font and license live in `public/fonts/`; the matching source package is a development dependency.

## Local development

Node.js 22+ and npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:8787.

## Edit the site

- `public/index.html`: bio, projects, experience, contact, metadata.
- `public/styles.css`: colors, typography, responsive layout.
- `resume/resume.tex`: phone-free public résumé source.
- `public/resume.pdf`: downloadable résumé served to visitors.
- `wrangler.jsonc`: Cloudflare Worker and custom domain.

Edit public résumé separately from private originals. Do not copy a phone-bearing PDF into `public/`. With [Tectonic](https://tectonic-typesetting.github.io/) installed, rebuild the public copy:

```sh
npm run resume:build
```

Commit both source and rebuilt PDF. Cloudflare does not need a LaTeX installation because the public PDF is checked in.

## Validate

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run deploy:check
```

Browser tests cover 320/390/768/1440px layouts, compact centered formatting, project/contact links, absence of terminal controls, WCAG AA automated checks, keyboard access, reduced motion, PDF/font delivery, security headers, and 404 routing. Automated checks do not replace human accessibility review. GitHub Actions runs these checks on pushes and pull requests.

## Hosting

- Worker: `benjaminnasse-cv`
- Custom domain: `benjaminnasse.cv`
- Upload directory: `public/` only
- Direct deployment: `npm run deploy` (requires Cloudflare authorization)

`public/_headers` sends a strict Content Security Policy and `Cache-Control: no-transform` to prevent Cloudflare from injecting an analytics beacon. This preserves the no-script/no-tracking design; `no-transform` can also prevent edge compression and image transformations. See [Cloudflare's injection behavior](https://developers.cloudflare.com/web-analytics/get-started/).

### GitHub automatic deployments — one-time connection

In Cloudflare, open **Workers & Pages → benjaminnasse-cv → Settings → Builds → Connect**. Authorize the Cloudflare GitHub app for **only** `Bean0-0/benjaminnasse.cv` where repository selection is offered.

Set:

| Setting | Value |
| --- | --- |
| Repository | `Bean0-0/benjaminnasse.cv` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Keep non-production branch deployments disabled unless wanted. No custom environment variables or secrets are needed by this static site. Cloudflare manages its build deployment authorization; do not commit tokens or paste them into chat.

Once connected, each push to `main` builds and deploys. Verify the first build reaches **Success** and the domain shows the update. GitHub Actions checks and Cloudflare Builds are separate pipelines; use branch protection if checks must gate production merges.

```sh
git add public resume
git commit -m "Update portfolio"
git push
```

Documentation: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
