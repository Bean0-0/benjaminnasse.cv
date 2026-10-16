import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('public/index.html', root), 'utf8');

test('internal navigation and local assets resolve', async () => {
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (link.startsWith('#')) {
      assert.ok(html.includes(`id="${link.slice(1)}"`), `Missing anchor ${link}`);
    } else if (link.startsWith('/') && link !== '/') {
      assert.ok((await stat(new URL(`public${link}`, root))).isFile(), `Missing ${link}`);
    }
  }
});

test('public directory contains only intended files', async () => {
  const files = (await readdir(new URL('public/', root))).sort();
  assert.deepEqual(files, ['404.html', '_headers', 'favicon.svg', 'index.html', 'resume.pdf', 'robots.txt', 'sitemap.xml', 'styles.css'].sort());
  assert.equal((await readFile(new URL('public/resume.pdf', root))).subarray(0, 5).toString(), '%PDF-');
});

test('public text and public resume source contain no phone numbers', async () => {
  const files = ['public/index.html', 'public/404.html', 'resume/resume.tex'];
  for (const file of files) {
    const text = await readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(text, /\b\d{3}[-. )]+\d{3}[-. ]+\d{4}\b/, `Phone number in ${file}`);
  }
});

test('metadata, accessibility hooks, and honest project attribution exist', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /class="skip-link"/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /rel="canonical" href="https:\/\/benjaminnasse\.cv\/"/);
  assert.match(html, /Contributed to an open-source provider plugin/);
  assert.ok(!html.includes('<script'), 'Site should not require JavaScript');
});

test('deployment serves only public directory without SPA fallback', async () => {
  const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root), 'utf8'));
  assert.equal(config.assets.directory, './public');
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(path.basename(config.assets.directory), 'public');
});
