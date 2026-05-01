// assets/js/quest-detail.js

document.addEventListener('DOMContentLoaded', function () {

  // ย้ายโค้ดทั้งหมดจาก (function(){ ... })(); มาใส่ตรงนี้เลย
  const params  = new URLSearchParams(location.search);
  const catId   = params.get('cat');
  const questId = params.get('quest');
  const main    = document.getElementById('detail-main');

  const cat = DB.categories.find(c => c.id === catId);
  if (!cat) {
    main.innerHTML = '<p class="thai" style="padding:2rem;text-align:center">ไม่พบหมวดหมู่นี้</p>';
    return;
  }

  let sortMode = 'level';

  function sortedQuests() {
    const list = [...cat.quests.filter(q => q.visible)];
    if (sortMode === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    } else {
      list.sort((a, b) => a.exp - b.exp);
    }
    return list;
  }

  function renderDetail() {
    main.innerHTML = '';

    const titleSection = document.createElement('section');
    titleSection.className = 'category-title';
    titleSection.innerHTML = `
      <div class="cat-label-name">
        <span class="cat-badge">${cat.label}</span>
        <span class="cat-name thai">${cat.name}</span>
      </div>
      <div class="sort-wrapper">
        <button class="sort-btn" id="sortBtn"><i class="fa-solid fa-list"></i></button>
        <div class="sort-dropdown hidden" id="sortDropdown">
          <div class="sort-option${sortMode === 'az' ? ' active' : ''}" data-sort="az">↑ A-Z ก-ฮ</div>
          <div class="sort-option${sortMode === 'level' ? ' active' : ''}" data-sort="level">↑ ระดับ</div>
        </div>
      </div>
    `;
    main.appendChild(titleSection);

    const questSection = document.createElement('section');
    questSection.className = 'quest-section quest-menu-list';

    sortedQuests().forEach(q => {
      const rank   = getRankByExp(q.exp);
      const locked = isQuestLocked(q.exp);
      const isFocus = q.id === questId;

      const cardEl = document.createElement(locked ? 'div' : 'a');
      cardEl.className = 'quest-card menu-card' + (locked ? ' locked' : '') + (isFocus ? ' focused' : '');
      if (!locked) {
        cardEl.href = `q-detail.html?cat=${catId}&quest=${q.id}`;
      }

      const lockHtml = locked ? `
        <div class="lock-overlay">
          <i class="fa-solid fa-lock"></i>
          <span class="rank-label" data-rank="${rank.rank}">${rank.label}</span>
        </div>` : '';

      cardEl.innerHTML = `
        <figure class="quest-image-grid single-image">
          <img src="${q.image}" alt="${q.name}" loading="lazy">
          <h2 class="quest-title thaipattaya">${q.name}</h2>
          ${lockHtml}
        </figure>
        <div class="quest-footer">
          <span class="time"><i class="fa-solid fa-clock"></i> ${q.time} นาที</span>
          <span class="exp-xp"><i class="fa-solid fa-star"></i> ${q.exp.toLocaleString()} EXP</span>
          <span class="rank-badge" data-rank="${rank.rank}">
            <i class="fa-solid fa-shield-halved"></i> ${rank.label}
          </span>
        </div>
      `;
      questSection.appendChild(cardEl);
    });

    main.appendChild(questSection);

    // sort dropdown events — ต้อง bind ใหม่ทุกครั้งที่ renderDetail() เพราะ innerHTML ถูก reset
    const sortBtn = document.getElementById('sortBtn');
    const sortDD  = document.getElementById('sortDropdown');

    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sortDD.classList.toggle('hidden');
    });

    sortDD.querySelectorAll('.sort-option').forEach(opt => {
      opt.addEventListener('click', () => {
        sortMode = opt.dataset.sort;
        sortDD.classList.add('hidden');
        renderDetail(); // re-render จะ bind event ใหม่ด้วย
      });
    });

    // ปิด dropdown เมื่อคลิกที่อื่น
    document.addEventListener('click', () => sortDD.classList.add('hidden'), { once: true });
  }

  renderDetail();

});