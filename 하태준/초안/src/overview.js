const FACILITIES = [
  { name: '사무동', x: 83, y: 42 },
  { name: '치장', x: 57, y: 75 },
  { name: '야적장', x: 49, y: 49 },
  { name: '사일로', x: 51, y: 25 },
];
const BC = { x: 24.1, y: 27.3 };

export function mountOverview(root, { onEnter, resume = false }) {
  const figure = document.createElement('div');
  figure.className = 'overview-scene';
  figure.innerHTML = `<div class="overview-world"><img class="overview-image" src="../../assets/images/overview/factory-overview.png" alt="공장 전체 전경. 왼쪽 벨트 컨베이어 B/C 구역에서 이물질 제거 작업을 시작합니다.">
    ${FACILITIES.map(({ name, x, y }) => `<span class="facility-label" hidden style="left:${x}%;top:${y}%">${name}</span>`).join('')}
    <button class="zone-button" type="button" hidden style="left:${BC.x}%;top:${BC.y}%" aria-label="B/C 벨트 컨베이어 구역, ${resume ? '이전 체험 이어가기' : '체험 시작'}"><span class="zone-dot" aria-hidden="true"></span><span>B/C <small>${resume ? '이어서 진행' : '벨트 컨베이어'}</small></span></button></div>
    <div class="overview-loading" role="status">공장 전경을 불러오는 중입니다.</div>
    <div class="overview-caption" hidden><p>벨트 컨베이어 · 이물질 제거 작업</p><h1>마지막 자물쇠</h1><p>작업반장의 지시를 받았습니다.<br>작업 전에 무엇부터 하겠습니까?</p><span class="overview-instruction">${resume ? 'B/C 구역을 선택하면 이전 단계와 위치에서 이어갑니다.' : 'B/C 구역을 선택해 현장으로 이동하세요.'}</span></div><span class="overview-map-note" hidden>시설 위치는 초안 배치입니다 · B/C만 이동 가능</span><p class="overview-transition-status sr-only" role="status"></p>`;
  root.replaceChildren(figure);
  const img = figure.querySelector('img');
  const loading = figure.querySelector('.overview-loading');
  const button = figure.querySelector('.zone-button');
  const world = figure.querySelector('.overview-world');
  let destroyed = false;
  let entering = false;
  let transitionTimer;
  const loaded = () => {
    if (destroyed) return;
    root.parentElement.style.setProperty('--overview-native-width', `${img.naturalWidth}px`);
    loading.remove();
    figure.querySelectorAll('[hidden]').forEach(element => { element.hidden = false; });
  };
  const failed = () => {
    if (destroyed) return;
    loading.innerHTML = '<strong>공장 전경을 불러오지 못했습니다.</strong><p>서버 연결을 확인한 뒤 다시 불러오세요.</p><button type="button">다시 불러오기</button>';
    loading.querySelector('button').addEventListener('click', () => { img.src = `${img.src.split('?')[0]}?retry=${Date.now()}`; });
  };
  const enter = () => {
    if (destroyed || entering) return;
    entering = true;
    button.disabled = true;
    figure.querySelector('.overview-transition-status').textContent = 'B/C 현장으로 이동합니다.';
    const reduced = document.querySelector('#reduced-motion')?.checked || matchMedia('(prefers-reduced-motion: reduce)').matches;
    figure.classList.toggle('overview-reduced-motion', reduced);
    const box = img.getBoundingClientRect();
    const renderedWidth = Math.min(box.width, box.height * img.naturalWidth / img.naturalHeight);
    const scale = Math.max(1, Math.min(1.2, img.naturalWidth / renderedWidth));
    world.style.setProperty('--overview-scale', scale);
    figure.classList.add('overview-entering');
    world.style.transformOrigin = `${BC.x}% ${BC.y}%`;
    transitionTimer = setTimeout(() => { if (!destroyed) onEnter(); }, reduced ? 120 : 900);
  };
  const motionChanged = () => {
    if (entering && document.querySelector('#reduced-motion')?.checked) figure.classList.add('overview-reduced-motion');
  };
  const motionInput = document.querySelector('#reduced-motion');
  motionInput?.addEventListener('change', motionChanged);
  img.addEventListener('load', loaded); img.addEventListener('error', failed);
  button.addEventListener('click', enter);
  if (img.complete && img.naturalWidth > 0) loaded();
  return { destroy() { destroyed = true; clearTimeout(transitionTimer); root.parentElement.style.removeProperty('--overview-native-width'); motionInput?.removeEventListener('change', motionChanged); img.removeEventListener('load', loaded); img.removeEventListener('error', failed); button.removeEventListener('click', enter); figure.remove(); } };
}
