async (page) => {
  await page.bringToFront();
  const base = 'http://127.0.0.1:8770/하태준_omo/?diagnostics=1';
  const results = [];
  const check = (value, id, message) => { if (!value) throw new Error(`${id}: ${message}`); };
  const state = () => page.locator('[data-testid="diagnostics"]').evaluate(el => ({ ...el.dataset }));
  const button = name => page.getByRole('button', { name, exact: true });
  const activate = async locator => { await locator.focus(); await locator.press('Enter'); };
  const moveTo = async (target, x) => {
    const before = await state();
    await page.locator('[data-testid="stage-canvas"]').focus();
    const key = Number(before.workerX) < x ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(id => {
        const d = document.querySelector('[data-testid="diagnostics"]')?.dataset;
        return d?.nearestTarget === id && Number(d.distance) < 100;
      }, target, { timeout: 90000 });
    } finally { await page.keyboard.up(key); }
    await page.keyboard.press('e');
    await page.locator('[data-testid="dialog"]').waitFor({ state: 'visible' });
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base);
  await activate(button('B/C 구역 시작'));
  await activate(button('현장 탐색 시작'));
  await page.waitForFunction(() => document.querySelector('[data-testid="diagnostics"]')?.dataset.screen === 'stage');
  let current = await state();
  check(Number(current.workerX) === 600, 'FG02', 'new run starts outside access at x=600');
  await page.locator('[data-testid="stage-canvas"]').focus();
  await page.keyboard.press('e');
  check(!(await page.locator('[data-testid="dialog"]').isVisible()), 'FG02', 'distant E must not open equipment');
  check((await state()).attempts === '0', 'FG02', 'distant interaction cannot add an attempt');
  results.push('FG02 PASS');
  await moveTo('energy-isolator', 2800);
  const stationary = await state();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowLeft');
  check((await state()).workerX === stationary.workerX, 'FG03', 'panel must freeze position');
  results.push('FG03 PASS');
  const untouched = await page.locator('#safety-progress').innerText();
  for (const [target, action] of [['energy-isolator','not-an-action'],['verification-point','verify-isolation'],['energy-isolator','verify-isolation']]) {
    await page.locator('[data-testid="dialog"]').evaluate((el, values) => {
      const b=document.createElement('button'); b.dataset.target=values[0]; b.dataset.action=values[1]; el.append(b); b.click(); b.remove();
    }, [target, action]);
    check(await page.locator('#safety-progress').innerText() === untouched && (await state()).attempts === '0', 'FG04', 'malformed or wrong-target action mutated state');
  }
  results.push('FG04 PASS malformed, wrong active target, wrong action owner');
  await activate(button('에너지 차단'));
  await activate(button('본인 자물쇠 체결'));
  await activate(button('표지 부착'));
  await activate(button('닫기'));
  await moveTo('verification-point', 2000);
  await activate(button('잔류 에너지 안전조치'));
  await activate(button('차단 확인'));
  await activate(button('닫기'));
  await moveTo('work-access', 420);
  await activate(page.locator('[data-testid="entry-submit"]'));
  await page.waitForFunction(() => document.querySelector('[data-testid="diagnostics"]')?.dataset.screen === 'result');
  current = await state();
  check(current.attempts === '1' && current.rewinds === '0', 'FG01', 'one safe entry produces one result');
  check(await page.getByRole('heading', { name: '안전을 확인하고 작업에 들어갔습니다.' }).isVisible(), 'FG01', 'success must be visible');
  await page.screenshot({ path: 'C:/Users/nomus/작업공간/s-she/하태준_omo/.omo/evidence/task-5-functional.png', fullPage: true });
  results.push('FG01 PASS');
  await page.keyboard.press('Escape');
  check((await state()).screen === 'result', 'A11Y03', 'result cannot be dismissed');
  await activate(page.locator('[data-command="overview"]'));
  await activate(button('B/C 구역 시작'));
  check((await state()).screen === 'result' && (await state()).attempts === '1', 'LIFE03', 'completed run restores result');
  await activate(page.locator('[data-testid="retry"]'));
  const reset = await state();
  check(reset.screen === 'brief' && reset.attempts === '0' && reset.rewinds === '0' && Number(reset.workerX) === 600 && Number(reset.velocity) === 0 && Number(reset.cameraX) === 0, 'LIFE04', 'restart must reset run and stage');
  check(await page.locator('#progress-count').innerText() === '0 / 5', 'LIFE04', 'restart clears all safety');
  await page.waitForTimeout(1400);
  check((await state()).screen === 'brief', 'LIFE06', 'old callbacks cannot replace restarted brief');
  results.push('A11Y01 PASS', 'A11Y03 PASS result Escape', 'LIFE03 PASS completed resume', 'LIFE04 PASS', 'LIFE06 PASS reset stability');
  return { results, final: current, reset };
}
