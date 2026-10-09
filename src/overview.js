const locations = [
  { name: 'B/C', left: 24.1, top: 27.3, labelLeft: 23, labelTop: 10, number: 1, active: true },
  { name: '사무동', left: 79, top: 36, labelLeft: 83, labelTop: 23, number: 2 },
  { name: '치장', left: 17, top: 57, labelLeft: 13, labelTop: 73, number: 3 },
  { name: '야적장', left: 91, top: 67, labelLeft: 85, labelTop: 83, number: 4 },
  { name: '사일로', left: 44, top: 18, labelLeft: 49, labelTop: 7, number: 5 },
];

export function mountOverview(root, { onEnter, resume = false, reducedMotion = false }) {
  const figure = document.createElement('div');
  figure.className = 'overview-scene';
  figure.dataset.transition = 'idle';
  figure.innerHTML = `<div class="overview-layout"><aside class="overview-rail"><div class="overview-caption" hidden><p class="exploration-label">화성공장 / 공간 탐색</p><h1>익숙한 현장,<br>새로운 시선.</h1><p>공장을 돌아보고<br>작업 구역의 설비를 살펴보세요.</p><span class="overview-instruction">${resume ? 'B/C에서 이전 체험을 이어갑니다.' : 'B/C를 선택해 현장으로 이동하세요.'}</span></div>
    <div class="map-legend" hidden><ol class="overview-place-list">${locations.map(place => `<li class="${place.active ? 'available' : ''}"><span class="list-place-number">${place.number}</span><div><strong>${place.name}</strong><small>${place.active ? '벨트 컨베이어 · 이동 가능' : '위치 안내'}</small></div>${place.active ? '<span class="available-dot" aria-hidden="true"></span>' : ''}</li>`).join('')}</ol><p>B/C만 이동할 수 있습니다.</p></div></aside>
    <div class="overview-map"><div class="overview-world"><img class="overview-image" src="assets/images/overview/factory-overview.png" alt="화성공장 전경. 벨트 컨베이어, 사무동, 치장, 야적장과 사일로의 위치를 표시합니다.">
    <div class="overview-markers" hidden><svg class="map-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${locations.map(place => `<polyline class="${place.active ? 'active-leader' : ''}" points="${place.labelLeft},${place.labelTop} ${place.labelLeft},${(place.top + place.labelTop) / 2} ${place.left},${place.top}"></polyline>`).join('')}</svg>
    ${locations.map(place => `<span class="map-point ${place.active ? 'active-point' : ''}" style="left:${place.left}%;top:${place.top}%" aria-hidden="true">${place.number}</span>${place.active ? `<button class="zone-button" type="button" style="left:${place.labelLeft}%;top:${place.labelTop}%" aria-label="B/C 벨트 컨베이어 구역, ${resume ? '이전 체험 이어가기' : '체험 시작'}"><span class="zone-dot" aria-hidden="true"></span><span>B/C <small>${resume ? '이어서 진행' : '현장으로 이동'}</small></span></button>` : `<span class="location-marker" style="left:${place.labelLeft}%;top:${place.labelTop}%" aria-label="${place.name}, 위치 안내만 제공"><strong>${place.name}</strong><small>위치 안내</small></span>`}`).join('')}</div></div><p class="overview-map-caption">화성공장 전경 <span>숫자 표지로 장소를 확인하세요.</span></p></div></div>
    <div class="overview-loading" role="status">공장 전경을 불러오는 중입니다.</div>
    <div class="travel-caption" role="status" hidden><span>B/C 벨트 컨베이어</span><strong>현장으로 이동합니다</strong></div>`;
  root.replaceChildren(figure);
  const img = figure.querySelector('img');
  const loading = figure.querySelector('.overview-loading');
  const button = figure.querySelector('.zone-button');
  const markers = figure.querySelector('.overview-markers');
  const caption = figure.querySelector('.overview-caption');
  const legend = figure.querySelector('.map-legend');
  const travel = figure.querySelector('.travel-caption');
  let destroyed = false, entering = false, timer = null, revealTimer = null, revealResolve = null, motionReduced = reducedMotion;
  const loaded = () => {
    if (destroyed) return;
    loading.remove(); markers.hidden = false; caption.hidden = false; legend.hidden = false;
  };
  const failed = () => {
    if (destroyed) return;
    loading.innerHTML = '<strong>공장 전경을 불러오지 못했습니다.</strong><p>이미지 경로와 서버 연결을 확인한 뒤 다시 불러오세요.</p><button type="button">다시 불러오기</button>';
    loading.querySelector('button').addEventListener('click', () => { img.src = `${img.src.split('?')[0]}?retry=${Date.now()}`; });
  };
  const enter = () => {
    if (destroyed || entering) return;
    entering = true; button.disabled = true; travel.hidden = false;
    figure.dataset.transition = 'zooming'; figure.classList.add('traveling');
    figure.classList.toggle('motion-reduced', motionReduced);
    timer = setTimeout(() => {
      if (destroyed) return;
      figure.dataset.transition = 'arrived';
      onEnter();
    }, motionReduced ? 150 : 900);
  };
  img.addEventListener('load', loaded); img.addEventListener('error', failed);
  button.addEventListener('click', enter);
  if (img.complete && img.naturalWidth > 0) loaded();
  return {
    setReducedMotion(value) { motionReduced = Boolean(value); },
    reveal() {
      if (destroyed) return Promise.resolve();
      figure.classList.add('leaving');
      return new Promise(resolve => {
        revealResolve = resolve;
        revealTimer = setTimeout(() => { revealResolve = null; resolve(); }, motionReduced ? 150 : 240);
      });
    },
    destroy() {
      destroyed = true; clearTimeout(timer); clearTimeout(revealTimer); revealResolve?.(); revealResolve = null;
      img.removeEventListener('load', loaded); img.removeEventListener('error', failed);
      button.removeEventListener('click', enter); figure.remove();
    },
  };
}
