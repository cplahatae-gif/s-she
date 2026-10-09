async (page) => {
  await page.bringToFront();
  page.setDefaultTimeout(5000);
  const check=(ok,id,msg)=>{if(!ok)throw new Error(`${id}: ${msg}`)};
  await page.goto('http://127.0.0.1:8770/하태준_omo/?diagnostics=1');
  await page.getByRole('button',{name:'B/C 구역 시작',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'현장 탐색 시작',exact:true}).waitFor();
  check(await page.locator('[data-testid="dialog"]').evaluate(el=>el.contains(document.activeElement)),'A11Y02','dialog must receive focus');
  await page.getByRole('button',{name:'현장 탐색 시작',exact:true}).press('Enter');
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('e');
  check(await page.locator('[data-testid="dialog"]').isVisible(),'A11Y02','E opens nearby equipment');
  await page.keyboard.press('Tab');
  check(await page.locator('[data-testid="dialog"]').evaluate(el=>el.contains(document.activeElement)),'A11Y02','Tab remains inside native modal');
  await page.keyboard.press('Escape');
  check(!(await page.locator('[data-testid="dialog"]').isVisible()),'A11Y02','Escape closes ordinary inspection');
  check(await page.locator('[data-testid="stage-canvas"]').evaluate(el=>el===document.activeElement),'A11Y02','focus returns to stage');
  check(await page.locator('#live-status').getAttribute('role')==='status','A11Y04','updates have an accessible status region');
  await page.screenshot({path:'C:/Users/nomus/작업공간/s-she/하태준_omo/.omo/evidence/task-6-keyboard.png',fullPage:true});
  return {results:['A11Y02 PASS','A11Y04 PASS']};
}
