import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const pages = ['public/index.html', 'public/writeups/building-useful-tools.html', 'public/projects/tamu-schedule-helper.html', 'public/projects/kimi-code.html'];
const html = await readFile(new URL(pages[0], root), 'utf8');

async function resolvePage(pathname) {
  if (pathname === '/') return 'public/index.html';
  const file = `public${pathname}`;
  return path.extname(pathname) ? file : `${file}.html`;
}

test('internal navigation and local assets resolve on all four pages', async () => {
  for (const page of pages) {
    const text = await readFile(new URL(page, root), 'utf8');
    for (const [, link] of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!link.startsWith('/') && !link.startsWith('#')) continue;
      const target = new URL(link, `https://benjaminnasse.cv/${page.replace(/^public\//, '')}`);
      const file = await resolvePage(target.pathname);
      assert.ok((await stat(new URL(file, root))).isFile(), `Missing ${link} in ${page}`);
      if (target.hash) {
        const contents = await readFile(new URL(file, root), 'utf8');
        assert.ok(contents.includes(`id="${target.hash.slice(1)}"`), `Missing anchor ${link} in ${page}`);
      }
    }
  }
});

test('public directory contains only intended files', async () => {
  const files = (await readdir(new URL('public/', root))).sort();
  assert.deepEqual(files, ['404.html', '_headers', 'favicon.svg', 'index.html', 'navigation.js', 'projects', 'resume.pdf', 'robots.txt', 'sitemap.xml', 'styles.css', 'theme.js', 'writeups'].sort());
  assert.deepEqual(await readdir(new URL('public/writeups/', root)), ['building-useful-tools.html']);
  assert.deepEqual((await readdir(new URL('public/projects/', root))).sort(), ['kimi-code.html', 'tamu-schedule-helper.html']);
  assert.equal((await readFile(new URL('public/resume.pdf', root))).subarray(0, 5).toString(), '%PDF-');
});

test('public text and public resume source contain no phone numbers', async () => {
  for (const file of [...pages, 'public/404.html', 'resume/resume.tex']) {
    const text = await readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(text, /\b\d{3}[-. )]+\d{3}[-. ]+\d{4}\b/, `Phone number in ${file}`);
  }
});

test('metadata, accessibility hooks, and honest project attribution exist', async () => {
  assert.match(html, /rel="canonical" href="https:\/\/benjaminnasse\.cv\/"/);
  assert.match(html, /Contributed to an open-source provider plugin/);
  for (const file of pages) {
    const text = await readFile(new URL(file, root), 'utf8');
    assert.match(text, /<html lang="en">/);
    assert.match(text, /name="viewport"/);
    assert.match(text, /class="skip-link"/);
    assert.equal([...text.matchAll(/<h1\b/g)].length, 1);
    assert.deepEqual([...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(match => [match[1].trim(), match[2].trim()]), [['src="/theme.js"', ''], ['src="/navigation.js" defer', '']], 'Only local theme and navigation enhancements should run');
  }
});

test('sample note is labeled as demo content and has a Markdown counterpart', async () => {
  const note = await readFile(new URL(pages[1], root), 'utf8');
  const markdown = await readFile(new URL('content/writeups/building-useful-tools.md', root), 'utf8');
  assert.match(html, /Sample writeup/);
  assert.match(note, /not a published article by Benjamin/);
  assert.match(note, /name="robots" content="noindex"/);
  assert.match(markdown, /status: sample/);
  for (const heading of ['Start with the repeated step', 'Keep the feedback loop short', 'Leave a trail']) {
    assert.ok(note.includes(heading));
    assert.ok(markdown.includes(`## ${heading}`));
  }
  assert.match(note, /function describeTask/);
  assert.match(markdown, /function describeTask/);
});

test('each page has one active file per responsive explorer and native folders', async () => {
  for (const file of pages) {
    const text = await readFile(new URL(file, root), 'utf8');
    const route = file === pages[0] ? '/' : file.replace(/^public/, '').replace(/\.html$/, '');
    const activeLinks = [...text.matchAll(/<a class="file-link" href="([^"]+)" aria-current="page">/g)];
    assert.equal(activeLinks.length, 2, 'Desktop and mobile each have their own CSS-selected explorer');
    assert.ok(activeLinks.every(match => match[1] === route));
    assert.equal([...text.matchAll(/<details class="folder" open>/g)].length, 4);
    assert.match(text, /<details class="mobile-explorer"><summary>/);
    assert.match(text, /class="document-name"/);
  }
});

test('project notes preserve real repository destinations and attribution', async () => {
  const tamu = await readFile(new URL(pages[2], root), 'utf8');
  const kimi = await readFile(new URL(pages[3], root), 'utf8');
  assert.match(tamu, /href="https:\/\/github.com\/Bean0-0\/tamu-schedule-helper"/);
  assert.match(kimi, /href="https:\/\/github.com\/Bean0-0\/pi-provider-kimi-code"/);
  assert.match(kimi, /Contributed to an open-source provider plugin/);
});

test('Paper palette and Obsidian default font stacks are used', async () => {
  const css = await readFile(new URL('public/styles.css', root), 'utf8');
  for (const [name, color] of [['paper', '#eeeeee'], ['primary', '#444444'], ['sub', '#b2b2b2'], ['border', '#dddddd']]) {
    assert.ok(css.includes(`--${name}: ${color}`));
  }
  assert.match(css, /--font-default: ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Google Sans Flex", Roboto, "Inter Variable", "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;/);
  assert.match(css, /--font-monospace: ui-monospace, SFMono-Regular, "Cascadia Mono", "Roboto Mono", "DejaVu Sans Mono", "Liberation Mono", Menlo, Monaco, "Consolas", "Source Code Pro", monospace;/);
  assert.doesNotMatch(css, /Geist|@font-face/);
  for (const file of [...pages, 'public/404.html']) {
    assert.doesNotMatch(await readFile(new URL(file, root), 'utf8'), /as="font"|geist/i);
  }
});

test('all pages initialize the optional theme before loading styles', async () => {
  for (const file of [...pages, 'public/404.html']) {
    const text = await readFile(new URL(file, root), 'utf8');
    const script = text.indexOf('<script src="/theme.js"></script>');
    const stylesheet = text.indexOf('href="/styles.css"');
    assert.ok(script >= 0 && script < stylesheet, `Theme must initialize before styles in ${file}`);
    assert.match(text, /<label class="switch theme-control" hidden><input class="switch__input" id="theme-toggle" type="checkbox" role="switch">/);
    assert.match(text, /<span class="switch__sr">Dark mode<\/span>/);
    assert.equal([...text.matchAll(/class="switch__icon-part switch__icon-part--\d+"/g)].length, 11);
    assert.doesNotMatch(text, /<span>Dark<\/span>|theme-track|theme-thumb/);
    assert.doesNotMatch(text, /<select\b|theme-select/);
  }
  const css = await readFile(new URL('public/styles.css', root), 'utf8');
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /#1e1e1e/i);
  assert.match(css, /\[data-theme[=\s]*["']?dark/);
  assert.ok((await stat(new URL('public/theme.js', root))).isFile());
});

test('CSP allows only local theme scripts and retains analytics protections', async () => {
  const headers = await readFile(new URL('public/_headers', root), 'utf8');
  assert.match(headers, /Cache-Control:.*no-transform/);
  assert.match(headers, /Content-Security-Policy: default-src 'none'/);
  assert.match(headers, /(?:^|;\s*)script-src 'self'(?:;|$)/m);
  assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval/);
});

test('deployment serves only public directory without SPA fallback', async () => {
  const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root), 'utf8'));
  assert.equal(config.assets.directory, './public');
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(path.basename(config.assets.directory), 'public');
});
