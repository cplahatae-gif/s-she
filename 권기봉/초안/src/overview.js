export function mountOverview(root, { onEnter }) {
  const figure = document.createElement('div');
  figure.className = 'overview-scene';
  figure.innerHTML = `<img class="overview-image" src="../../assets/images/overview/factory-overview.png" alt="레미콘 공장 전체 전경. 왼쪽 벨트 컨베이어 B/C 구역에서 마지막 자물쇠 체험을 시작합니다.">
    <div class="overview-loading" role="status">공장 전경을 불러오는 중입니다.</div>
    <button class="zone-button" type="button" hidden style="left:24.1%;top:27.3%" aria-label="B/C 벨트 컨베이어 구역, 마지막 자물쇠 체험 시작"><span class="zone-dot" aria-hidden="true"></span><span>B/C <small>벨트 컨베이어</small></span></button>
    <div class="overview-caption" hidden><p>벨트 컨베이어 · 이물질 제거 작업</p><h1>마지막 자물쇠</h1><p>멈춰 있는 설비.<br>작업에 들어가도 안전할까요?</p><span class="overview-instruction">표시된 B/C 구역을 선택해 현장으로 이동하세요.</span></div>`;
  root.replaceChildren(figure);
  const img = figure.querySelector('img');
  const loading = figure.querySelector('.overview-loading');
  const button = figure.querySelector('.zone-button');
  const caption = figure.querySelector('.overview-caption');
  let destroyed = false;
  const loaded = () => { if (destroyed) return; loading.remove(); button.hidden = false; caption.hidden = false; };
  const failed = () => {
    if (destroyed) return;
    loading.innerHTML = '<strong>공장 전경을 불러오지 못했습니다.</strong><p>이미지 경로와 서버 연결을 확인한 뒤 다시 시도하세요.</p><button type="button">다시 불러오기</button>';
    loading.querySelector('button').addEventListener('click', () => { img.src = `${img.src.split('?')[0]}?retry=${Date.now()}`; });
  };
  img.addEventListener('load', loaded); img.addEventListener('error', failed);
  button.addEventListener('click', onEnter);
  if (img.complete && img.naturalWidth > 0) loaded();
  return { destroy() { destroyed = true; img.removeEventListener('load', loaded); img.removeEventListener('error', failed); button.removeEventListener('click', onEnter); figure.remove(); } };
}
