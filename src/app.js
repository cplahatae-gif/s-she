import { mountOverview } from './overview/overview.js';

const root = document.querySelector('#app');
const overviewRoot = document.createElement('div');
const briefing = document.createElement('dialog');
briefing.className = 'briefing';
briefing.setAttribute('aria-labelledby', 'briefing-title');
briefing.setAttribute('aria-describedby', 'briefing-description');
briefing.innerHTML = `
  <div class="briefing-content">
    <p class="eyebrow">B/C · 벨트 컨베이어</p>
    <h2 id="briefing-title">마지막 자물쇠</h2>
    <p class="briefing-role">이물질 제거 작업자</p>
    <p id="briefing-description">컨베이어 점검구 안에 이물질이 끼었습니다. 제거 작업을 맡았습니다. 벨트는 멈춰 있지만, 작업에 들어가기 전에 직접 안전을 확보해야 합니다.</p>
    <ol class="briefing-steps" aria-label="작업 전 안전 확보 흐름">
      <li>작업 대상 확인 · 차단 지점으로 이동</li>
      <li>에너지 차단 · 본인 자물쇠·표지 체결</li>
      <li>잔류 에너지 안전조치 · 차단 확인</li>
      <li>점검구로 이동 · 작업 진입 판단</li>
    </ol>
    <p class="briefing-note">현재는 공장 전경과 작업 안내를 확인할 수 있습니다.</p>
    <form method="dialog">
      <button class="return-button" autofocus>공장 전경으로 <span aria-hidden="true">↗</span></button>
    </form>
  </div>`;

root.append(overviewRoot, briefing);
let returnFocus = null;

mountOverview(overviewRoot, {
  onEnter() {
    returnFocus = document.activeElement;
    briefing.showModal();
  },
});

briefing.addEventListener('close', () => {
  returnFocus?.focus();
});
