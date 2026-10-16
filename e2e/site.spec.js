import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [320, 390, 768, 1440]) {
  test(`compact profile layout, links, and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Benjamin Nasse');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Experience', 'Projects', 'Education', 'Awards']);
    await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/Bean0-0');
    await expect(page.getByRole('link', { name: 'LinkedIn', exact: true })).toHaveAttribute('href', 'https://linkedin.com/in/benjaminnasse');
    await expect(page.getByRole('link', { name: 'benjaminnasse@icloud.com' })).toHaveAttribute('href', 'mailto:benjaminnasse@icloud.com');
    await expect(page.getByRole('link', { name: 'View resume', exact: true })).toHaveAttribute('href', '/resume.pdf');
    await expect(page.locator('#work a')).toHaveCount(2);
    await expect(page.locator('#work a').first()).toHaveAttribute('href', 'https://github.com/Bean0-0/tamu-schedule-helper');
    await expect(page.locator('#work a').last()).toHaveAttribute('href', 'https://github.com/Bean0-0/pi-provider-kimi-code');
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /terminal/i })).toHaveCount(0);
    const layout = await page.evaluate(() => ({
      pageWidth: document.querySelector('main').getBoundingClientRect().width,
      pageX: document.querySelector('main').getBoundingClientRect().x,
      headingSize: getComputedStyle(document.querySelector('h1')).fontSize,
      background: getComputedStyle(document.body).backgroundColor,
      fontLoaded: document.fonts.check('14px Geist'),
    }));
    expect(layout.pageWidth).toBe(Math.min(600, width));
    expect(layout.pageX).toBe((width - layout.pageWidth) / 2);
    expect(layout.headingSize).toBe('30px');
    expect(layout.background).toBe('rgb(247, 246, 243)');
    expect(layout.fontLoaded).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/site-${width}.png`, fullPage: true });
  });
}

test('keyboard skip link, project access, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  const project = page.locator('#work a').first();
  await project.focus();
  await expect(project).toBeFocused();
  expect(await project.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
});

test('PDF, local font, security headers, and missing pages', async ({ request }) => {
  const pdf = await request.get('/resume.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const font = await request.get('/fonts/geist-latin.woff2');
  expect(font.status()).toBe(200);
  expect((await font.body()).subarray(0, 4).toString()).toBe('wOF2');
  const home = await request.get('/');
  expect(home.headers()['cache-control']).toContain('no-transform');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(home.headers()['content-security-policy']).toContain("font-src 'self'");
  const missing = await request.get('/not-a-real-page');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Not here.');
});
