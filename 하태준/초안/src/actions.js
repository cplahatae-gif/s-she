import { ACTION_SCENES, ACCIDENT_IDS } from './action-scenes.mjs';

const imageUrl = (file) => new URL(`../assets/actions/${file}.png`, import.meta.url).href;
const image = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  const fail = () => reject(new Error('행동 이미지를 불러오지 못했습니다. 다시 시도하세요.'));
  img.onload = async () => {
    try { await img.decode(); resolve(img); } catch { fail(); }
  };
  img.onerror = fail;
  img.src = imageUrl(file);
});

export function mountActions(shell, { reducedMotion = false, onState = () => {} } = {}) {
  const layer = document.createElement('section');
  layer.className = 'action-scene'; layer.hidden = true;
  layer.setAttribute('aria-label', '선택한 행동의 근접 장면');
  layer.innerHTML = '<div class="action-picture"><img class="action-photo"><div class="action-blackout"></div></div><p class="action-narration" role="status" aria-live="polite"><strong class="action-phase"></strong><span class="action-copy"></span></p>';
  shell.append(layer);
  const photo = layer.querySelector('.action-photo');
  const phase = layer.querySelector('.action-phase');
  const narration = layer.querySelector('.action-copy');
  let pending, generation = 0, frame, destroyed = false;
  const cancel = () => {
    generation++; cancelAnimationFrame(frame);
    const old = pending; pending = undefined;
    layer.hidden = true; shell.classList.remove('playing-action'); old?.resolve();
  };
  const play = async (outcome, { beforeSafety = {}, afterSafety = beforeSafety } = {}, accident = false) => {
    cancel();
    if (destroyed) return;
    const definition = ACTION_SCENES[outcome.optionId];
    if (!definition) throw new RangeError('행동 장면이 정의되지 않았습니다.');
    if (accident && !ACCIDENT_IDS.includes(outcome.optionId)) throw new RangeError('사고 장면이 없는 선택지입니다.');
    const current = generation;
    const shots = (accident ? definition.accidentShots : undefined) ?? definition.shots
      ?? [{ file: definition.view === 'access' ? 'access' : 'panel', at: 0 }];
    const files = [...new Set(shots.map(({ file }) => file))];
    const loaded = new Promise((resolve, reject) => { pending = { resolve, reject }; });
    Promise.all(files.map(image)).then((images) => {
      if (current === generation) pending?.resolve(new Map(files.map((file, index) => [file, images[index]])));
    }, (error) => { if (current === generation) pending?.reject(error); });
    let images;
    try { images = await loaded; } finally { if (current === generation) pending = undefined; }
    if (!images || destroyed || current !== generation) return;
    layer.className = `action-scene view-${definition.view} operation-${definition.operation}${reducedMotion ? ' reduced-motion' : ''}`;
    layer.dataset.option = outcome.optionId;
    narration.textContent = accident
      ? definition.accidentNarration ?? '설비가 움직이고 손이 회전부에 가까워집니다. 위험 발생 순간 실습을 멈춥니다.'
      : definition.narration;
    let shown = -1;
    const showShot = (progress) => {
      let next = 0;
      for (let index = 1; index < shots.length; index++) if (progress >= shots[index].at) next = index;
      if (next === shown) return;
      shown = next;
      const currentImage = images.get(shots[next].file);
      photo.src = currentImage.src;
      photo.alt = shots[next].label ?? definition.narration;
      phase.textContent = shots[next].label ?? '';
      phase.hidden = !shots[next].label;
      photo.style.setProperty('--photo-width', `${currentImage.naturalWidth}px`);
      photo.style.setProperty('--photo-height', `${currentImage.naturalHeight}px`);
    };
    showShot(0);
    layer.hidden = false;
    shell.classList.add('playing-action');
    onState(beforeSafety);
    const duration = accident ? 2600 : 3200;
    const started = performance.now();
    return new Promise((resolve) => {
      pending = { resolve };
      let changed = false;
      const paint = (now) => {
        if (current !== generation || destroyed) return;
        const progress = Math.min(1, (now - started) / duration);
        showShot(progress);
        layer.classList.toggle('blackout', accident && progress >= .84);
        if (!changed && progress >= (definition.stateAt ?? .55)) { changed = true; if (!accident) onState(afterSafety); }
        if (progress === 1) {
          pending = undefined;
          if (!accident) { layer.hidden = true; shell.classList.remove('playing-action'); }
          resolve(); return;
        }
        frame = requestAnimationFrame(paint);
      };
      frame = requestAnimationFrame(paint);
    });
  };
  return {
    play, cancel,
    setReducedMotion(value) { reducedMotion = Boolean(value); layer.classList.toggle('reduced-motion', reducedMotion); },
    destroy() { destroyed = true; cancel(); layer.remove(); },
  };
}
