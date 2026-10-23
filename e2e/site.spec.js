import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Keep existing Paper snapshots deterministic regardless of the host OS theme.
test.use({ colorScheme: 'light' });

const themeColors = { light: 'rgb(238, 238, 238)', dark: 'rgb(30, 30, 30)' };
async function expectTheme(page, theme, preference) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', preference);
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue(preference);
  await expect(page.locator('body')).toHaveCSS('background-color', themeColors[theme]);
}

const documents = [
  { path: '/', title: 'Benjamin Nasse', filename: 'Overview.md', key: 'overview' },
  { path: '/writeups/building-useful-tools', title: 'Notes on building useful tools', filename: 'Notes on building useful tools.md', key: 'note' },
  { path: '/projects/tamu-schedule-helper', title: 'TAMU Schedule Helper', filename: 'TAMU Schedule Helper.md', key: 'project' },
  { path: '/projects/kimi-code', title: 'Kimi Code × pi', filename: 'Kimi Code × pi.md', key: 'kimi' },
];

async function explorer(page, width) {
  if (width <= 700) {
    const menu = page.locator('.mobile-explorer');
    if (!(await menu.evaluate(el => el.open))) await menu.locator(':scope > summary').click();
    return menu.getByRole('navigation', { name: 'Notebook files' });
  }
  return page.locator('.desktop-explorer').getByRole('navigation', { name: 'Notebook files' });
}

for (const width of [320, 390, 768, 1440]) {
  test(`single-pane notebook, folders, and accessibility at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    const external = [];
    const origin = new URL(testInfo.project.use.baseURL).origin;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });

    for (const document of documents) {
      const response = await page.goto(document.path);
      expect(response.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(document.title);
      await expect(page.locator('.document-name')).toHaveText(document.filename);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(238, 238, 238)');
      const fonts = await page.evaluate(() => ({
        body: getComputedStyle(document.body).fontFamily,
        sidebar: getComputedStyle(document.querySelector('.sidebar')).fontFamily,
        heading: getComputedStyle(document.querySelector('h1')).fontFamily,
        filename: getComputedStyle(document.querySelector('.document-name')).fontFamily,
      }));
      // Chromium on macOS serializes BlinkMacSystemFont as "system-ui".
      expect(fonts.body).toMatch(/^ui-sans-serif, -apple-system, (?:BlinkMacSystemFont|"system-ui"), system-ui,/);
      expect(fonts.sidebar).toBe(fonts.body);
      expect(fonts.heading).toBe(fonts.body);
      expect(fonts.filename).toBe(fonts.body);
      expect(fonts.body).not.toContain('Geist');
      if (document.key === 'note') {
        for (const code of await page.locator('.prose code').all()) {
          await expect(code).toHaveCSS('font-family', /^ui-monospace, SFMono-Regular,/);
        }
      }
      if (width <= 700) {
        await expect(page.locator('.mobile-explorer')).not.toHaveAttribute('open');
        expect(await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(100);
      } else {
        expect(await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width)).toBe(256);
      }
      if (width === 1440) await expect(page.getByRole('complementary', { name: 'On this page' })).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `test-results/obsidian-paper-${document.key}-${width}.png`, fullPage: true });
      const tree = await explorer(page, width);
      await expect(tree.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(tree.locator('[aria-current="page"]')).toHaveAttribute('href', document.path);
      if (document.path !== '/') {
        await expect(tree.locator('[aria-current="page"]').locator('xpath=ancestor::details[@class="folder"]')).toHaveAttribute('open');
      }
      // Expanded mobile navigation remains keyboard-accessible and passes contrast checks.
      if (width <= 700) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }

    await page.goto('/');
    let tree = await explorer(page, width);
    const folder = tree.locator('.folder').filter({ has: page.locator('summary', { hasText: 'Projects' }) });
    await folder.locator(':scope > summary').click();
    await expect(folder).not.toHaveAttribute('open');
    await expect(tree.getByRole('link', { name: 'TAMU Schedule Helper' })).not.toBeVisible();
    await folder.locator(':scope > summary').focus();
    await page.keyboard.press('Space');
    await expect(folder).toHaveAttribute('open');
    await tree.getByRole('link', { name: 'TAMU Schedule Helper' }).click();
    await expect(page).toHaveURL(/\/projects\/tamu-schedule-helper$/);
    await expect(page.locator('.document-name')).toHaveText('TAMU Schedule Helper.md');
    await expect(page.getByRole('link', { name: 'View TAMU Schedule Helper on GitHub' })).toHaveAttribute('href', 'https://github.com/Bean0-0/tamu-schedule-helper');
    tree = await explorer(page, width);
    await tree.getByRole('link', { name: 'Notes on building useful tools' }).click();
    await expect(page).toHaveURL(/\/writeups\/building-useful-tools$/);
    await expect(page.locator('.sample-notice')).toContainText('not a published article by Benjamin');
    await expect(page.getByRole('region', { name: 'Example JavaScript code' })).toContainText('function describeTask');
    tree = await explorer(page, width);
    await tree.getByRole('link', { name: 'Overview', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Benjamin Nasse');
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}

test('keyboard skip link, disclosure controls, code focus, and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  const summary = page.locator('.desktop-explorer .folder').first().locator(':scope > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).not.toHaveAttribute('open');
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open');
  await page.goto('/writeups/building-useful-tools');
  const code = page.getByRole('region', { name: 'Example JavaScript code' });
  await code.focus();
  await expect(code).toBeFocused();
  expect(await code.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
});

test('PDF, security headers, and missing pages', async ({ request }) => {
  const pdf = await request.get('/resume.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const home = await request.get('/');
  expect(home.headers()['cache-control']).toContain('no-transform');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(home.headers()['content-security-policy']).toContain("font-src 'self'");
  expect(home.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(home.headers()['content-security-policy']).not.toMatch(/unsafe-inline|unsafe-eval/);
  const missing = await request.get('/not-a-real-page');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Not here.');
});

for (const width of [320, 390, 768, 1440]) {
  test(`dark theme, responsive files, and accessibility at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: 'dark' });
    const errors = [];
    const external = [];
    const violations = [];
    const origin = new URL(testInfo.project.use.baseURL).origin;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      // Browsers report the intentionally missing page's 404 as a resource error.
      if (message.type() === 'error' && !/Failed to load resource:.*404/.test(message.text())) errors.push(message.text());
    });
    page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.violatedDirective));
      window.__cspViolations = [];
    });

    for (const document of [...documents, { path: '/not-a-real-page', key: '404' }]) {
      const response = await page.goto(document.path);
      expect(response.status()).toBe(document.key === '404' ? 404 : 200);
      await expectTheme(page, 'dark', 'system');
      await page.evaluate(() => window.document.fonts.ready);
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      violations.push(...await page.evaluate(() => window.__cspViolations));
      if (['overview', 'note'].includes(document.key)) {
        await page.screenshot({ path: `test-results/obsidian-paper-dark-${document.key}-${width}.png`, fullPage: true });
      }
      if (width <= 700 && document.key !== '404') {
        const tree = await explorer(page, width);
        await expect(tree.locator('[aria-current="page"]')).toHaveCount(1);
        expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      }
    }
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(violations).toEqual([]);
  });
}

test('system preference tracks live changes until a manual choice, then can be restored', async ({ page }) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expectTheme(page, 'light', 'system');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'dark', 'system');
  await select.selectOption('light');
  await expectTheme(page, 'light', 'light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'light', 'light');
  await select.selectOption('system');
  await expectTheme(page, 'dark', 'system');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, 'light', 'system');
});

test('manual dark choice survives reload and navigation against a light system', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await expectTheme(page, 'dark', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await page.reload();
  await expectTheme(page, 'dark', 'dark');
  await page.locator('#work .note-row').first().click();
  await expect(page).toHaveURL(/\/projects\/tamu-schedule-helper$/);
  await expectTheme(page, 'dark', 'dark');
  await page.goto('/writeups/building-useful-tools');
  await expectTheme(page, 'dark', 'dark');
});

test('theme preference synchronizes between open pages, including restoring System', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/projects/kimi-code');
  await expectTheme(other, 'light', 'system');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await expectTheme(other, 'dark', 'dark');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('system');
  await expectTheme(other, 'light', 'system');
  await other.close();
});

test('unavailable local storage does not break system or manual themes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() { throw new DOMException('Storage unavailable', 'SecurityError'); },
      });
    }
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, 'dark', 'system');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light');
  await expectTheme(page, 'light', 'light');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('system');
  await expectTheme(page, 'dark', 'system');
  await page.reload();
  await expectTheme(page, 'dark', 'system');
  expect(errors).toEqual([]);
});

test('invalid saved preferences fall back to the system', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'not-a-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, 'dark', 'system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, 'light', 'system');
});

test('without JavaScript, system dark colors and native navigation still work', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark', baseURL: testInfo.project.use.baseURL });
  try {
    const page = await context.newPage();
    for (const path of ['/', '/writeups/building-useful-tools', '/not-a-real-page']) {
      await page.goto(path);
      await expect(page.locator('body')).toHaveCSS('background-color', themeColors.dark);
      await expect(page.locator('#theme-select')).toBeHidden();
    }
    await page.goto('/');
    await page.locator('.desktop-explorer').getByRole('link', { name: 'TAMU Schedule Helper' }).click();
    await expect(page).toHaveURL(/\/projects\/tamu-schedule-helper$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('TAMU Schedule Helper');
  } finally {
    await context.close();
  }
});

test('theme selector is keyboard operable and works on the 404 page', async ({ page }) => {
  await page.goto('/not-a-real-page');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await select.focus();
  await expect(select).toBeFocused();
  // Native popup arrow handling varies by OS; typeahead uses the select's keyboard API.
  await page.keyboard.press('d');
  await page.keyboard.press('Tab');
  await expectTheme(page, 'dark', 'dark');
  await page.getByRole('link', { name: 'Back to Benjamin Nasse' }).click();
  await expectTheme(page, 'dark', 'dark');
});

test('printing dark pages stays readable with and without JavaScript', async ({ browser }, testInfo) => {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, colorScheme: 'dark', javaScriptEnabled });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.locator('body')).toHaveCSS('background-color', themeColors.dark);
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(0, 0, 0)');
      await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).not.toBeVisible();
    } finally {
      await context.close();
    }
  }
});
