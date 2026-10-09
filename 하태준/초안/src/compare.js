import { mountActions } from './actions.js';
import { ACTION_SCENES } from './action-scenes.mjs';
const select = document.querySelector('#scene');
const button = document.querySelector('#play');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const before = document.querySelector('#before');
const reduced = document.querySelector('#reduced');
const controller = mountActions(document.querySelector('#after'));
let generation = 0;
const fitResult = () => {
  result.style.maxWidth = `${result.naturalWidth}px`;
  result.style.maxHeight = `${result.naturalHeight}px`;
};
result.addEventListener('load', fitResult);
const oldFiles = { 'lock-correct': 'lock-before', 'cleanup-correct': 'access-before', 'lock-other-person': 'other-before' };
const update = () => {
  generation++; controller.cancel(); button.disabled = false;
  const definition = ACTION_SCENES[select.value];
  before.src = new URL(`../assets/actions/comparison/${oldFiles[select.value]}.png`, import.meta.url).href;
  result.src = new URL(`../assets/actions/${definition.shots.at(-1).file}.png`, import.meta.url).href;
  result.alt = definition.narration; status.textContent = '';
};
select.addEventListener('change', update);
reduced.addEventListener('change', () => controller.setReducedMotion(reduced.checked));
button.addEventListener('click', async () => {
  const current = generation; const optionId = select.value; button.disabled = true; status.textContent = '재생 중';
  try { await controller.play({ optionId }); if (current === generation) status.textContent = '재생 완료'; }
  catch { if (current === generation) status.textContent = '장면을 불러오지 못했습니다. 다시 재생하세요.'; }
  finally { if (current === generation) button.disabled = false; }
});
window.addEventListener('pagehide', event => { if (event.persisted) controller.cancel(); else controller.destroy(); });
update();
