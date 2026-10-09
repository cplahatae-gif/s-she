import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STEPS } from '../../src/scenario.mjs';
import { buildLayout } from '../../src/layout.mjs';
const geometry = buildLayout(JSON.parse(await readFile(new URL('../../assets/assets.json', import.meta.url), 'utf8')));
const directory = fileURLToPath(new URL('./', import.meta.url));
export async function begin(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://127.0.0.1:8770/하태준/초안/');
  await page.locator('.zone-button').click();
  await page.locator('#begin-button').click();
}
export async function runStages(page, from, to) {
  const checks = [];
  for (let index = from; index < to; index++) {
    const step = STEPS[index];
    const dialog = page.locator('#game-dialog');
    if (!(await dialog.evaluate(e => e.open && e.dataset.kind === 'quiz'))) {
      await page.waitForTimeout(120);
      const x = Number(await page.locator('#location-chip').getAttribute('data-world-x'));
      const desired = geometry.targets[step.targetId].x;
      const key = desired > x ? 'ArrowRight' : 'ArrowLeft';
      await page.locator('canvas').focus();
      await page.keyboard.down(key);
      try {
        for (let tick = 0; tick < 100; tick++) {
          const position = Number(await page.locator('#location-chip').getAttribute('data-world-x'));
          if (Math.abs(position - desired) < 100) break;
          await page.waitForTimeout(150);
        }
      } finally { await page.keyboard.up(key); }
      await page.locator('.stage-interact').click();
    }
    for (const option of [...step.options.filter(item => !item.correct), ...step.options.filter(item => item.correct)]) {
      await page.locator(`button[data-option="${option.id}"]`).click({ noWaitAfter: true });
      const layer = page.locator('.action-scene:not([hidden])');
      await layer.waitFor();
      const photo = await layer.locator('.action-photo').evaluate(img => {
        const rect = img.getBoundingClientRect();
        const fitted = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
        const caption = img.closest('.action-scene').querySelector('.action-narration').getBoundingClientRect();
        const box = img.closest('.action-scene').getBoundingClientRect();
        return { src: img.src, fitted, density: Math.max(1,devicePixelRatio), overlays: img.closest('.action-scene').querySelectorAll('.action-hand,.action-lock,.action-loop,.action-debris').length, overflow: box.bottom > innerHeight + 1 || box.right > innerWidth + 1, captionBottom: caption.bottom };
      });
      assert.ok(photo.src.includes('/v2/'), option.id);
      assert.ok(photo.fitted <= 1.001, `${option.id}: source enlarged`);
      assert.equal(photo.overlays, 0);
      assert.equal(photo.overflow, false);
      assert.ok(photo.captionBottom <= 1080);
      await page.waitForTimeout(950);
      await page.screenshot({ path: `${directory}${option.id}.png` });
      await dialog.waitFor({ state: 'visible' });
      const kind = await dialog.getAttribute('data-kind');
      assert.equal(kind, option.effect === 'accident' ? 'accident' : 'outcome', option.id);
      checks.push({ id: option.id, kind, photo });
      await page.locator(option.effect === 'accident' ? '#rewind-button' : '#acknowledge-button').click();
    }
  }
  await writeFile(`${directory}stages-${from}-${to}.json`, JSON.stringify(checks, null, 2));
  return { checks, count: checks.length, counters: await page.locator('#hud-counters').textContent(), kind: await page.locator('#game-dialog').getAttribute('data-kind') };
}
