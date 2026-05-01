/* ════════════════════════════════
   ADD MENU — JAVASCRIPT
   ════════════════════════════════ */

// ─── ข้อมูลเมนูทั้งหมด ───────────────────────────────────────
let menuList = []; // เก็บเมนูที่ add แล้ว

// ─── Open / Close Add Popup ──────────────────────────────────
function openAddMenu() {
  const overlay = document.getElementById('amOverlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('show-flex');
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeAddMenu() {
  const overlay = document.getElementById('amOverlay');
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.classList.remove('show-flex');
    overlay.classList.add('hidden');
  }, 220);
}

document.getElementById('amOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeAddMenu();
});

// ─── Open / Close View Popup ─────────────────────────────────
function openViewMenu(index) {
  const menu = menuList[index];
  if (!menu) return;

  // ชื่อ
  document.getElementById('viewTitle').textContent = menu.name || 'ไม่มีชื่อ';

  // รูป
  const imgWrap = document.getElementById('viewImgWrap');
  const viewImg = document.getElementById('viewImg');
  if (menu.imgSrc) {
    viewImg.src = menu.imgSrc;
    imgWrap.classList.remove('hidden');
  } else {
    imgWrap.classList.add('hidden');
  }

  // จำนวน / เวลา
  const qtyEl   = document.getElementById('viewQtyInfo');
  const timeEl  = document.getElementById('viewTimeInfo');
  const infoRow = document.getElementById('viewInfoRow');

  qtyEl.innerHTML  = menu.qty  ? `<i class="fa-solid fa-utensils"></i> ${menu.qty} จาน` : '';
  const totalTime  = (parseInt(menu.prepTime) || 0) + (parseInt(menu.cookTime) || 0);
  timeEl.innerHTML = totalTime  ? `<i class="fa-regular fa-clock"></i> ${totalTime} นาที` : '';
  infoRow.style.display = (menu.qty || totalTime) ? '' : 'none';

  // Tags
  const tagsSec  = document.getElementById('viewTagsSection');
  const tagsWrap = document.getElementById('viewTagsWrap');
  if (menu.tags && menu.tags.length > 0) {
    tagsWrap.innerHTML = menu.tags.map(t =>
      `<span class="am-tag-pill"><span>${t}</span></span>`
    ).join('');
    tagsSec.classList.remove('hidden');
  } else {
    tagsSec.classList.add('hidden');
  }

  // วัตถุดิบ
  const ingSection = document.getElementById('viewIngSection');
  const ingList    = document.getElementById('viewIngList');
  const ings = (menu.ingredients || []).filter(i => i.name.trim());
  if (ings.length > 0) {
    ingList.innerHTML = ings.map(i =>
      `<div class="view-ing-row">
        <span class="thai">${i.name}</span>
        <span style="text-align:center">${i.qty || ''}</span>
        <span class="thai">${i.unit || ''}</span>
       </div>`
    ).join('');
    ingSection.classList.remove('hidden');
  } else {
    ingSection.classList.add('hidden');
  }

  // ขั้นตอน
  const stepSection = document.getElementById('viewStepSection');
  const stepList    = document.getElementById('viewStepList');
  const steps = (menu.steps || []).filter(s => s.text.trim() || s.imgSrc);
  if (steps.length > 0) {
    stepList.innerHTML = steps.map((s, idx) =>
      `<div class="view-step-item">
        <div class="view-step-num">${idx + 1}.</div>
        ${s.imgSrc ? `<img src="${s.imgSrc}" class="view-step-img" alt="step">` : ''}
        ${s.text   ? `<div class="view-step-text thai">${s.text}</div>` : ''}
       </div>`
    ).join('');
    stepSection.classList.remove('hidden');
  } else {
    stepSection.classList.add('hidden');
  }

  // Taste
  const tasteSec   = document.getElementById('viewTasteSection');
  const tasteStars = document.getElementById('viewTasteStars');
  const tasteTags  = document.getElementById('viewTasteTags');
  if (menu.tasteRating > 0 || (menu.tasteTags && menu.tasteTags.length > 0)) {
    // Stars
    tasteStars.innerHTML = [1,2,3,4,5].map(n =>
      `<i class="${n <= menu.tasteRating ? 'fa-solid' : 'fa-regular'} fa-star am-star${n <= menu.tasteRating ? ' active' : ''}"
          style="cursor:default; color:${n <= menu.tasteRating ? 'var(--star-gold)' : '#ccc'}"></i>`
    ).join('');
    // Tags
    tasteTags.innerHTML = (menu.tasteTags || []).map(t =>
      `<button class="am-ttag thai selected" style="cursor:default">${t}</button>`
    ).join('');
    tasteSec.classList.remove('hidden');
  } else {
    tasteSec.classList.add('hidden');
  }

  // รีวิว
  const reviewSec  = document.getElementById('viewReviewSection');
  const reviewText = document.getElementById('viewReviewText');
  if (menu.review && menu.review.trim()) {
    reviewText.textContent = menu.review;
    reviewSec.classList.remove('hidden');
  } else {
    reviewSec.classList.add('hidden');
  }

  // เปิด overlay
  const overlay = document.getElementById('viewOverlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('show-flex');
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeViewMenu() {
  const overlay = document.getElementById('viewOverlay');
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.classList.remove('show-flex');
    overlay.classList.add('hidden');
  }, 220);
}

document.getElementById('viewOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeViewMenu();
});

// ─── Render เมนูการ์ด ────────────────────────────────────────
function renderMenuCards() {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = menuList.map((menu, idx) => {
    const totalTime = (parseInt(menu.prepTime) || 0) + (parseInt(menu.cookTime) || 0);
    const imgHTML   = menu.imgSrc
      ? `<img class="menu-card-img" src="${menu.imgSrc}" alt="${menu.name}">`
      : `<div class="menu-card-img-placeholder"><i class="fa-regular fa-image"></i></div>`;
    const timeHTML  = totalTime
      ? `<div class="menu-card-footer">
           <i class="fa-regular fa-clock"></i>
           <span class="thai">${totalTime} นาที</span>
         </div>`
      : '';
    return `
      <div class="menu-card" onclick="openViewMenu(${idx})">
        <div class="menu-card-title">${menu.name || 'ไม่มีชื่อ'}</div>
        ${imgHTML}
        ${timeHTML}
      </div>`;
  }).join('');
}

// ─── Main Image Upload ───────────────────────────────────────
let mainImgSrc = '';

function previewMainImg(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    mainImgSrc = e.target.result;
    document.getElementById('amMainPreview').src = mainImgSrc;
    document.getElementById('amMainPreview').classList.remove('hidden');
    document.getElementById('amMainIcon').classList.add('hidden');
    document.getElementById('amMainLabel').classList.add('hidden');
    document.getElementById('amMainActions').classList.remove('hidden');
    document.getElementById('amMainBox').style.minHeight = 'auto';
  };
  reader.readAsDataURL(file);
}

function removeMainImg() {
  mainImgSrc = '';
  document.getElementById('amMainPreview').src = '';
  document.getElementById('amMainPreview').classList.add('hidden');
  document.getElementById('amMainIcon').classList.remove('hidden');
  document.getElementById('amMainLabel').classList.remove('hidden');
  document.getElementById('amMainActions').classList.add('hidden');
  document.getElementById('amMainBox').style.minHeight = '';
  document.getElementById('amMainFile').value = '';
}

// ─── Tags ────────────────────────────────────────────────────
let amTags = [];

function amRenderTags() {
  document.getElementById('amTagsWrap').innerHTML = amTags.map((t, i) =>
    `<span class="am-tag-pill">
       <span>${t}</span>
       <span class="am-tag-rm" onclick="amRemoveTag(${i})">✕</span>
     </span>`
  ).join('');
}

function amAddTag() {
  const inp = document.getElementById('amTagInput');
  const val = inp.value.trim();
  if (val) { amTags.push(val); inp.value = ''; amRenderTags(); }
}

function amRemoveTag(i) { amTags.splice(i, 1); amRenderTags(); }

function amTagKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); amAddTag(); }
}

// ─── Ingredients ─────────────────────────────────────────────
let amIngCount = 0;

function amAddIngredient() {
  amIngCount++;
  const id = 'amIng_' + amIngCount;
  const div = document.createElement('div');
  div.className = 'am-ing-row';
  div.id = id;
  div.innerHTML = `
    <input type="text"   class="am-input am-ing-name" placeholder="วัตถุดิบ">
    <input type="number" class="am-input am-ing-qty"  placeholder="จำนวน" min="0" style="text-align:center">
    <input type="text"   class="am-input am-ing-unit" placeholder="ชิ้น">
    <button class="am-ing-rm" onclick="amRemoveIng('${id}')">−</button>
  `;
  document.getElementById('amIngList').appendChild(div);
}

function amRemoveIng(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function collectIngredients() {
  return [...document.querySelectorAll('#amIngList .am-ing-row')].map(row => ({
    name : row.querySelector('.am-ing-name').value.trim(),
    qty  : row.querySelector('.am-ing-qty').value.trim(),
    unit : row.querySelector('.am-ing-unit').value.trim(),
  }));
}

// ─── Steps ───────────────────────────────────────────────────
let amStepCount = 0;
let stepImgSrcs = {}; // { stepN: base64 }

function amAddStep() {
  amStepCount++;
  const n      = amStepCount;
  const id     = 'amStep_' + n;
  const fileId = 'amStepFile_' + n;
  const div    = document.createElement('div');
  div.className = 'am-step-item';
  div.id = id;
  div.innerHTML = `
    <button class="am-step-rm" onclick="amRemoveStep('${id}', ${n})">−</button>
    <div class="am-step-num">${n}.</div>
    <div class="am-step-upload" id="amStepBox_${n}" onclick="document.getElementById('${fileId}').click()">
      <i class="fa-regular fa-image"></i>
      <span>เพิ่มไฟล์รูปภาพ</span>
      <input type="file" id="${fileId}" accept="image/*" style="display:none"
             onchange="amPreviewStep(event, ${n})">
    </div>
    <textarea class="am-input am-textarea thai am-step-text" placeholder="วิธีทำ" rows="2"></textarea>
  `;
  document.getElementById('amStepList').appendChild(div);
}

function amRemoveStep(id, n) {
  const el = document.getElementById(id);
  if (el) el.remove();
  delete stepImgSrcs[n];
}

function amPreviewStep(event, n) {
  const file = event.target.files[0];
  if (!file) return;
  const reader  = new FileReader();
  const fileId  = 'amStepFile_' + n;
  reader.onload = function(e) {
    stepImgSrcs[n] = e.target.result;
    const box = document.getElementById('amStepBox_' + n);
    box.innerHTML = `
      <img src="${e.target.result}" alt="step">
      <input type="file" id="${fileId}" accept="image/*" style="display:none"
             onchange="amPreviewStep(event, ${n})">
    `;
  };
  reader.readAsDataURL(file);
}

function collectSteps() {
  return [...document.querySelectorAll('#amStepList .am-step-item')].map(item => {
    const n    = item.id.replace('amStep_', '');
    const text = item.querySelector('.am-step-text')?.value.trim() || '';
    return { imgSrc: stepImgSrcs[n] || '', text };
  });
}

// ─── Taste Stars ─────────────────────────────────────────────
let amStarValue = 0;

function amInitStars() {
  const stars = document.querySelectorAll('#amTasteStars .am-star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      amStarValue = parseInt(star.dataset.val);
      amUpdateStars(amStarValue);
    });
    star.addEventListener('mouseenter', () => {
      const hov = parseInt(star.dataset.val);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= hov));
    });
    star.addEventListener('mouseleave', () => amUpdateStars(amStarValue));
  });
}

function amUpdateStars(val) {
  document.querySelectorAll('#amTasteStars .am-star').forEach(s => {
    const sv = parseInt(s.dataset.val);
    if (sv <= val) {
      s.classList.remove('fa-regular'); s.classList.add('fa-solid', 'active');
    } else {
      s.classList.remove('fa-solid', 'active'); s.classList.add('fa-regular');
    }
  });
}

// ─── Taste Tags ──────────────────────────────────────────────
function amInitTasteTags() {
  document.querySelectorAll('#amTasteTags .am-ttag').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });
}

// ─── Reset Form ──────────────────────────────────────────────
function amResetForm() {
  document.getElementById('amName').value      = '';
  document.getElementById('amQty').value       = '';
  document.getElementById('amPrepTime').value  = '';
  document.getElementById('amCookTime').value  = '';
  document.getElementById('amReview').value    = '';
  document.getElementById('amTagInput').value  = '';

  amTags      = [];
  amIngCount  = 0;
  amStepCount = 0;
  stepImgSrcs = {};
  amStarValue = 0;

  amRenderTags();
  amUpdateStars(0);
  document.querySelectorAll('#amTasteTags .am-ttag').forEach(b => b.classList.remove('selected'));
  document.getElementById('amIngList').innerHTML  = '';
  document.getElementById('amStepList').innerHTML = '';
  removeMainImg();

  // เพิ่มแถวเริ่มต้น
  amAddIngredient();
  amAddIngredient();
  amAddIngredient();
  amAddStep();
  amAddStep();
  amAddStep();
}

// ─── Submit ──────────────────────────────────────────────────
function amSubmit() {
  const name = document.getElementById('amName').value.trim();
  if (!name) {
    alert('กรุณาใส่ชื่อเมนู');
    document.getElementById('amName').focus();
    return;
  }

  const menu = {
    name       : name,
    imgSrc     : mainImgSrc,
    qty        : document.getElementById('amQty').value.trim(),
    prepTime   : document.getElementById('amPrepTime').value.trim(),
    cookTime   : document.getElementById('amCookTime').value.trim(),
    tags       : [...amTags],
    ingredients: collectIngredients(),
    steps      : collectSteps(),
    tasteRating: amStarValue,
    tasteTags  : [...document.querySelectorAll('#amTasteTags .am-ttag.selected')].map(b => b.textContent.trim()),
    review     : document.getElementById('amReview').value.trim(),
  };

  menuList.push(menu);
  renderMenuCards();
  amResetForm();
  closeAddMenu();
}

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  amRenderTags();
  amAddIngredient();
  amAddIngredient();
  amAddIngredient();
  amAddStep();
  amAddStep();
  amAddStep();
  amInitStars();
  amInitTasteTags();
});