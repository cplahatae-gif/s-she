const conveyorZone = { u: 0.241, v: 0.273 };

export function mountOverview(root, { onEnter }) {
  const overview = document.createElement('main');
  overview.className = 'overview';
  overview.innerHTML = `
    <header class="overview-header">
      <a class="brand" href="./" aria-label="SAFEPLAY 공장 전경">
        <span class="brand-symbol" aria-hidden="true">S</span>
        <span>SAFEPLAY</span>
      </a>
      <span class="scenario-name">마지막 자물쇠</span>
    </header>
    <section class="overview-scene" aria-labelledby="overview-title">
      <div class="scene-heading">
        <div><p class="eyebrow">작업 구역 선택</p><h1 id="overview-title">공장 전경</h1></div>
        <p class="scene-instruction">벨트 컨베이어 구역을 선택하세요.</p>
      </div>
      <div class="factory-frame">
        <img class="factory-image" src="./assets/images/overview/factory-overview.png" width="1672" height="941" alt="사일로와 배치 플랜트, 골재 저장장 및 벨트 컨베이어가 있는 레미콘 공장의 2D 전경" draggable="false" fetchpriority="high">
        <button class="conveyor-zone" type="button" style="--zone-u: ${conveyorZone.u * 100}%; --zone-v: ${conveyorZone.v * 100}%" aria-label="B/C 벨트 컨베이어 작업 안내 열기">
          <span class="zone-marker" aria-hidden="true"><span></span></span>
          <span class="zone-label"><strong>B/C <span>벨트 컨베이어</span></strong><span class="zone-action">작업 안내 <span aria-hidden="true">↗</span></span></span>
        </button>
      </div>
      <footer class="scene-footer">
        <span><span class="legend-dot" aria-hidden="true"></span>선택 가능한 작업 구역</span>
        <span class="keyboard-hint"><kbd>Tab</kbd> 구역 선택 <span aria-hidden="true">·</span> <kbd>Enter</kbd> 작업 안내</span>
      </footer>
    </section>
  </main>`;

  const zoneButton = overview.querySelector('.conveyor-zone');
  zoneButton.addEventListener('click', onEnter);
  root.append(overview);

  return {
    destroy() {
      zoneButton.removeEventListener('click', onEnter);
      overview.remove();
    },
  };
}
