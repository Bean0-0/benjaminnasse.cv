# Benjamin Nasse

Source for [benjaminnasse.cv](https://benjaminnasse.cv), a personal website featuring projects, writeups, experience, and a downloadable résumé.

Built with HTML and CSS and hosted on Cloudflare Workers Static Assets. The notebook interface uses a collapsible file explorer, a single reading pane, and a page outline. Light colors follow Monkeytype’s Paper theme; dark mode uses neutral charcoal tones. Typography uses Obsidian’s default system font stacks for the interface, reading, and code. Scripts are self-hosted, with no analytics, downloaded fonts, or runtime dependencies.

## Development

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787). To use another port:

```sh
npx wrangler dev --ip 127.0.0.1 --port 8791
```

Wrangler serves extensionless HTML paths and applies the configured response headers. A basic static server may require opening the `.html` paths directly.

## Repository structure

| Path | Purpose |
| --- | --- |
| `public/index.html` | Overview, projects, background, and metadata |
| `public/projects/` | Project notes and repository links |
| `public/writeups/` | Published HTML reading pages |
| `public/styles.css` | Themes, typography, and responsive layout |
| `public/theme.js` | System theme detection and saved appearance preference |
| `public/navigation.js` | Reversible folder height animation and keyboard-safe disclosure |
| `public/resume.pdf` | Published résumé |
| `public/_headers` | Security and cache headers |
| `content/writeups/` | Markdown source notes; not served |
| `resume/resume.tex` | Public résumé source |
| `tests/` | Content, asset, and configuration checks |
| `e2e/` | Playwright browser and accessibility tests |
| `wrangler.jsonc` | Cloudflare deployment configuration |

Only `public/` is deployed.

## Editing content

Pages are maintained as static HTML. Add project notes to `public/projects/` and reading pages to `public/writeups/`, then update navigation in each page’s desktop and mobile explorers. Mark the active file with `aria-current="page"`. Add public, indexable pages to `public/sitemap.xml` and update tests when adding assets.

Markdown files in `content/writeups/` can be edited in Obsidian, but Markdown-to-HTML publishing and vault synchronization are not implemented. Changes to Markdown do not rebuild the corresponding HTML. The `.md` filenames shown in the interface are presentation labels.

“Notes on building useful tools” is explicitly labeled demonstration content, not a published article by Benjamin. Its HTML page is marked `noindex` and excluded from the sitemap.

## Appearance

The filename bar includes a **Dark mode** switch. On first visit, appearance follows the device preference, including live changes. Clicking the switch toggles between light and dark; that choice is saved in browser local storage and synchronized across pages and tabs. Clearing the saved site preference restores system-following behavior. If storage is unavailable, a manual choice applies only to the current page.

The theme script runs before styles load to avoid flashing the wrong saved theme. Subsequent theme changes fade shared background, text, and border colors together over 240 ms. Folder contents slide open and closed over 180 ms; repeated clicks reverse from the current height. Closing folders remove their contents from keyboard navigation immediately. Reduced-motion preferences disable animations. Without JavaScript, CSS still follows the system preference and native folder navigation remains available. Folder expansion resets on navigation. Print styles use dark text on white in either theme.

## Updating the résumé

Edit `resume/resume.tex`, then rebuild with [Tectonic](https://tectonic-typesetting.github.io/):

```sh
npm run resume:build
```

Commit both `resume/resume.tex` and `public/resume.pdf`. The PDF is checked in, so deployment does not require LaTeX. Keep private contact details out of both public files.

## Testing

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run deploy:check
```

Checks cover local links and anchors, assets, attribution, responsive layouts, keyboard navigation, folder controls, light/dark accessibility, theme persistence, blocked storage, JavaScript-disabled behavior, printing, security headers, and 404 responses. Browser tests save screenshots in `test-results/`. Automated accessibility checks supplement manual review.

To test an existing server:

```sh
SITE_URL=http://127.0.0.1:8791 npm run test:e2e
```

GitHub Actions runs checks on pushes to `main` and on pull requests. `npm run build` runs content, asset, and configuration checks; it does not compile or bundle the site.

## Deployment

Worker: `benjaminnasse-cv`. Custom domain: `benjaminnasse.cv`.

With Cloudflare authorization:

```sh
npm run deploy
```

For automatic deployments, connect the repository through the Worker’s **Settings → Builds** in Cloudflare:

| Setting | Value |
| --- | --- |
| Repository | `Bean0-0/benjaminnasse.cv` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

No application environment variables or secrets are required. Cloudflare manages authorization for connected builds. GitHub Actions and Cloudflare Builds are independent; use branch protection to require checks before merging to `main`.

Security headers are defined in `public/_headers`. Content Security Policy allows only same-origin scripts, styles, fonts, and images, with no inline scripts or evaluation. The `no-transform` cache directive prevents edge content modifications, including analytics injection, and may also limit compression and image transformations.

Hosting documentation: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

## Licensing

Existing résumé attribution and license comments are preserved in its source.
