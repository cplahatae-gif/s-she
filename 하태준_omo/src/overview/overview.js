const factoryUrl = new URL('../../../assets/images/overview/factory-overview.png', import.meta.url);

export function mountOverview(root, { onEnter }) {
  root.innerHTML = `<section aria-labelledby="overview-title">
    <div class="overview-heading"><div><p class="eyebrow">01 / 작업 구역 선택</p><h1 id="overview-title">멈춘 벨트, 남아 있는 위험.</h1></div><p class="intro">공장 전경에서 B/C 구역을 선택하세요.<br>오늘의 작업은 컨베이어 점검구의 이물질 제거입니다.</p></div>
    <div class="overview-frame"><div class="asset-status" role="status"><p></p><button data-testid="retry" type="button" hidden>다시 불러오기</button></div><button class="area-enter" type="button" aria-label="B/C 구역 시작" hidden>B/C 구역 시작 ↗</button><span class="map-caption" hidden>작업 구역 01 · 벨트 컨베이어</span></div>
    <div class="overview-legend"><span><strong>●</strong> B/C 벨트 컨베이어</span><span>구역 선택: 클릭 또는 Tab + Enter / Space</span></div>
  </section>`;
  const frame = root.querySelector('.overview-frame');
  const status = root.querySelector('.asset-status');
  const message = status.querySelector('p');
  const retry = status.querySelector('button');
  const enter = root.querySelector('.area-enter');
  const caption = root.querySelector('.map-caption');
  let image, timer, generation = 0, destroyed = false, entered = false;
  function clearLoad() {
    clearTimeout(timer);
    if (image) { image.onload = null; image.onerror = null; image.remove(); }
  }
  function load() {
    clearLoad();
    const attempt = ++generation;
    status.hidden = false;
    message.textContent = '공장 전경을 불러오는 중입니다.';
    retry.hidden = true;
    enter.hidden = true;
    caption.hidden = true;
    image = new Image();
    image.className = 'factory-image';
    image.alt = '골재 저장시설과 벨트 컨베이어가 있는 레미콘 공장 전경';
    function finish(ok) {
      if (destroyed || generation !== attempt) return;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (ok) {
        frame.prepend(image);
        status.hidden = true;
        enter.hidden = false;
        caption.hidden = false;
        if (attempt > 1) enter.focus();
      } else {
        message.textContent = '공장 전경 이미지를 불러오지 못했습니다.';
        retry.hidden = false;
        if (attempt > 1) retry.focus();
      }
    }
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    timer = setTimeout(() => finish(false), 15000);
    const url = new URL(factoryUrl);
    if (attempt > 1) url.searchParams.set('retry', `${Date.now()}-${attempt}`);
    image.src = url.href;
  }
  function activate() {
    if (destroyed || entered || enter.hidden) return;
    entered = true;
    enter.disabled = true;
    onEnter();
  }
  retry.addEventListener('click', load);
  enter.addEventListener('click', activate);
  load();
  return {
    focus() { (enter.hidden ? retry.hidden ? root : retry : enter).focus(); },
    destroy() { destroyed = true; generation++; clearLoad(); retry.removeEventListener('click', load); enter.removeEventListener('click', activate); root.replaceChildren(); }
  };
}
