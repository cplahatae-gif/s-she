async (page) => {
  await page.bringToFront();
  page.setDefaultTimeout(5000);
  const check = (ok,id,msg) => { if(!ok) throw new Error(`${id}: ${msg}`); };
  const state = () => page.locator('[data-testid="diagnostics"]').evaluate(el=>({...el.dataset}));
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:8770/하태준_omo/?diagnostics=1');
  await page.getByRole('button',{name:'B/C 구역 시작',exact:true}).click();
  await page.getByRole('button',{name:'현장 탐색 시작',exact:true}).click();
  await page.locator('[data-testid="stage-canvas"]').focus();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('e');
  const safe=await state();
  const started=Date.now();
  await page.locator('[data-testid="entry-submit"]').evaluate(el=>{for(let i=0;i<5;i++)el.click()});
  await page.locator('[data-testid="rewind"]').waitFor({state:'visible'});
  const elapsed=Date.now()-started;
  const accident=await state();
  check(elapsed<=6000,'LIFE01','accident card must appear within six seconds');
  check(accident.attempts==='1','FG05','five rapid submissions must produce one attempt');
  check(await page.locator('[data-testid="rewind"]').evaluate(el=>el===document.activeElement),'LIFE01','rewind receives focus');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-testid="dialog"]').isVisible(),'A11Y03','escape cannot dismiss accident');
  await page.locator('[data-testid="rewind"]').evaluate(el=>{for(let i=0;i<5;i++)el.click()});
  const rewound=await state();
  check(rewound.rewinds==='1'&&rewound.attempts==='1','LIFE02','rewind preserves attempt');
  check(rewound.workerX===safe.workerX,'LIFE02','rewind returns to safe entry coordinate');
  for(let i=0;i<3;i++) {
    await page.locator('[data-testid="overview-button"]').click();
    await page.getByRole('button',{name:'B/C 구역 시작',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="diagnostics"]')?.dataset.screen==='stage');
    check((await state()).workerX===safe.workerX,'LIFE03','factory resume must preserve position');
  }
  await page.locator('[data-testid="stage-canvas"]').focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(250);
  const walked=await state();
  const distance=Number(walked.workerX)-Number(rewound.workerX);
  check(distance>10&&distance<140,'LIFE05','repeated resume must not multiply movement');
  await page.keyboard.down('ArrowRight');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  const blurred=await state();
  await page.waitForTimeout(250);
  check((await state()).workerX===blurred.workerX,'LIFE05','blur releases held movement');
  await page.keyboard.up('ArrowRight');
  await page.screenshot({path:'C:/Users/nomus/작업공간/s-she/하태준_omo/.omo/evidence/task-7-lifecycle.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  try {
    await page.reload();
    check(await page.locator('#reduced-motion').isChecked(),'LIFE01','system motion preference reflected');
    await page.getByRole('button',{name:'B/C 구역 시작',exact:true}).click();
    await page.getByRole('button',{name:'현장 탐색 시작',exact:true}).click();
    await page.locator('[data-testid="stage-canvas"]').focus();
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(()=>Number(document.querySelector('[data-testid="diagnostics"]').dataset.distance)<100);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.press('e');
    const reducedStarted=Date.now();
    await page.locator('[data-testid="entry-submit"]').click();
    await page.locator('[data-testid="rewind"]').waitFor({state:'visible'});
    check(Date.now()-reducedStarted<=6000,'LIFE01','reduced-motion accident within six seconds');
    check(await page.locator('[data-testid="rewind"]').evaluate(el=>el===document.activeElement),'LIFE01','reduced-motion rewind focus');
    await page.screenshot({path:'C:/Users/nomus/작업공간/s-she/하태준_omo/.omo/evidence/task-7-reduced-motion.png',fullPage:true});
  } finally { await page.emulateMedia({reducedMotion:'no-preference'}); }
  return {results:['LIFE01 PASS normal and reduced-motion','LIFE02 PASS','LIFE03 PASS','LIFE05 PASS','FG05 PASS','A11Y03 PASS'],elapsed,distance,rewound};
}
