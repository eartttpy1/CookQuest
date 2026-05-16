/* ════════════════════════════════
   ADD MENU — JAVASCRIPT
   ════════════════════════════════ */

const USER_ID_LOCAL = (() => {
    try {
        const data = JSON.parse(localStorage.getItem('user_data'));
        return data?.user?.id || 'user123';
    } catch (e) {
        return 'user123';
    }
})();
let menuList = []; // เก็บเมนูที่ดึงมาจาก Database
let editingMenuId = null; // เก็บ ID ของเมนูที่กำลังแก้ไข

// ─── Fetch Data ──────────────────────────────────────────────
async function fetchUserMenus() {
  try {
    const res = await fetch(`/api/usermenus?userId=${USER_ID_LOCAL}`);
    if (res.ok) {
      menuList = await res.json();
      renderMenuCards();
    }
  } catch (e) {
    console.error('Error fetching menus:', e);
  }
}

// ─── Open / Close Add Popup ──────────────────────────────────
function openAddMenu(menuId = null) {
  amResetForm();
  editingMenuId = menuId;

  if (menuId) {
    // โหมดแก้ไข
    const menu = menuList.find(m => m._id === menuId);
    if (menu) {
      document.querySelector('.am-popup-title').textContent = 'แก้ไขเมนู';
      document.querySelector('.am-btn-submit').textContent = 'Save Changes';

      document.getElementById('amName').value = menu.menuName || '';
      document.getElementById('amQty').value = menu.servings || '';
      document.getElementById('amPrepTime').value = menu.prepTime || '';
      document.getElementById('amCookTime').value = menu.cookTime || '';
      document.getElementById('amReview').value = menu.review || '';

      if (menu.imageURL) {
        mainImgSrc = menu.imageURL;
        document.getElementById('amMainPreview').src = mainImgSrc;
        document.getElementById('amMainPreview').classList.remove('hidden');
        document.getElementById('amMainIcon').classList.add('hidden');
        document.getElementById('amMainLabel').classList.add('hidden');
        document.getElementById('amMainActions').classList.remove('hidden');
        document.getElementById('amMainBox').style.minHeight = 'auto';
      }

      amTags = [...(menu.tags || [])];
      amRenderTags();

      // Ingredients
      document.getElementById('amIngList').innerHTML = '';
      if (menu.ingredients && menu.ingredients.length > 0) {
        menu.ingredients.forEach(i => {
          amAddIngredient();
          const rows = document.querySelectorAll('#amIngList .am-ing-row');
          const lastRow = rows[rows.length - 1];
          lastRow.querySelector('.am-ing-name').value = i.name || '';
          lastRow.querySelector('.am-ing-qty').value = i.amount || '';
          lastRow.querySelector('.am-ing-unit').value = i.unit || '';
        });
      } else {
        amAddIngredient();
      }

      // Steps
      document.getElementById('amStepList').innerHTML = '';
      if (menu.instructions && menu.instructions.length > 0) {
        menu.instructions.forEach((s, idx) => {
          amAddStep();
          const rows = document.querySelectorAll('#amStepList .am-step-item');
          const lastRow = rows[rows.length - 1];
          const n = lastRow.id.replace('amStep_', '');
          lastRow.querySelector('.am-step-text').value = s.description || '';
          if (s.stepImageURL) {
             stepImgSrcs[n] = s.stepImageURL;
             const box = document.getElementById('amStepBox_' + n);
             box.innerHTML = `
               <img src="${s.stepImageURL}" alt="step">
               <input type="file" id="amStepFile_${n}" accept="image/*" style="display:none" onchange="amPreviewStep(event, ${n})">
             `;
          }
        });
      } else {
        amAddStep();
      }

      amUpdateStars(menu.tasteRating || 0);
      amStarValue = menu.tasteRating || 0;

      // Taste Tags
      if (menu.tasteTags) {
        document.querySelectorAll('#amTasteTags .am-ttag').forEach(btn => {
          if (menu.tasteTags.includes(btn.textContent.trim())) {
            btn.classList.add('selected');
          }
        });
      }
    }
  } else {
    // โหมดเพิ่มใหม่
    document.querySelector('.am-popup-title').textContent = 'เพิ่มเมนูใหม่';
    document.querySelector('.am-btn-submit').textContent = 'Add';
    amAddIngredient();
    amAddIngredient();
    amAddIngredient();
    amAddStep();
    amAddStep();
    amAddStep();
  }

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
  document.getElementById('viewTitle').textContent = menu.menuName || 'ไม่มีชื่อ';

  // ปุ่มลบและแก้ไข
  document.getElementById('btnEditMenu').onclick = () => {
    closeViewMenu();
    openAddMenu(menu._id);
  };
  
  document.getElementById('btnDeleteMenu').onclick = async () => {
    if (confirm('คุณต้องการลบเมนูนี้ใช่หรือไม่?')) {
      try {
        const res = await fetch(`/api/usermenus/${menu._id}`, { method: 'DELETE' });
        if (res.ok) {
          closeViewMenu();
          fetchUserMenus();
        } else {
          alert('เกิดข้อผิดพลาดในการลบ');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // รูป
  const imgWrap = document.getElementById('viewImgWrap');
  const viewImg = document.getElementById('viewImg');
  if (menu.imageURL) {
    viewImg.src = menu.imageURL;
    imgWrap.classList.remove('hidden');
  } else {
    imgWrap.classList.add('hidden');
  }

  // จำนวน / เวลา
  const qtyEl   = document.getElementById('viewQtyInfo');
  const timeEl  = document.getElementById('viewTimeInfo');
  const infoRow = document.getElementById('viewInfoRow');

  qtyEl.innerHTML  = menu.servings  ? `<i class="fa-solid fa-utensils"></i> ${menu.servings} จาน` : '';
  const totalTime  = (parseInt(menu.prepTime) || 0) + (parseInt(menu.cookTime) || 0);
  timeEl.innerHTML = totalTime  ? `<i class="fa-regular fa-clock"></i> ${totalTime} นาที` : '';
  infoRow.style.display = (menu.servings || totalTime) ? '' : 'none';

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
        <span style="text-align:center">${i.amount || ''}</span>
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
  const steps = (menu.instructions || []).filter(s => s.description.trim() || s.stepImageURL);
  if (steps.length > 0) {
    stepList.innerHTML = steps.map((s, idx) =>
      `<div class="view-step-item">
        <div class="view-step-num">${idx + 1}.</div>
        ${s.stepImageURL ? `<img src="${s.stepImageURL}" class="view-step-img" alt="step">` : ''}
        ${s.description   ? `<div class="view-step-text thai">${s.description}</div>` : ''}
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

// ─── Render เมนูการ์ด (อิงตามดีไซน์ q-all.html) ──────────────
function renderMenuCards() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  
  const searchInput = document.querySelector('.search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let filteredMenus = menuList;
  if (query) {
      filteredMenus = filteredMenus.filter(menu => {
          const nameMatch = (menu.menuName || '').toLowerCase().includes(query);
          const tagMatch = menu.tags && menu.tags.some(tag => tag.toLowerCase().includes(query));
          const ingMatch = menu.ingredients && menu.ingredients.some(ing => (ing.name || '').toLowerCase().includes(query));
          return nameMatch || tagMatch || ingMatch;
      });
  }
  
  if (filteredMenus.length === 0) {
      grid.innerHTML = '<div style="width: 100%; text-align: center; color: #888; font-family: var(--font-thai); font-size: 1.2rem;">ไม่มีสูตรอาหารของคุณ<br>ลองค้นหาคำอื่น หรือกดปุ่ม + ด้านล่างขวาเพื่อเพิ่มเลย!</div>';
      return;
  }

  grid.innerHTML = filteredMenus.map((menu) => {
    const idx = menuList.indexOf(menu);
    const totalTime = (parseInt(menu.prepTime) || 0) + (parseInt(menu.cookTime) || 0);
    const imgHTML   = menu.imageURL
      ? `<figure class="quest-image"><img src="${menu.imageURL}" alt="${menu.menuName}"></figure>`
      : `<figure class="quest-image" style="background:#eee; display:flex; align-items:center; justify-content:center;"><i class="fa-regular fa-image fa-3x" style="color:#ccc"></i></figure>`;
    
    return `
      <div class="quest-card menu-card" onclick="openViewMenu(${idx})" style="cursor: pointer; margin:0;">
        <div class="menu-card-header">
            <h3 class="quest-title">${menu.menuName || 'ไม่มีชื่อ'}</h3>
        </div>
        ${imgHTML}
        <div class="quest-footer">
            <span class="quest-info"><i class="fa-solid fa-utensils"></i> ${menu.servings || 1} จาน</span>
            <span class="quest-info"><i class="fa-regular fa-clock"></i> ${totalTime} นาที</span>
        </div>
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
    amount  : parseFloat(row.querySelector('.am-ing-qty').value.trim()) || 0,
    unit : row.querySelector('.am-ing-unit').value.trim(),
  })).filter(i => i.name !== ''); // เอาเฉพาะที่กรอกชื่อ
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
  let stepNumber = 1;
  return [...document.querySelectorAll('#amStepList .am-step-item')].map(item => {
    const n    = item.id.replace('amStep_', '');
    const text = item.querySelector('.am-step-text')?.value.trim() || '';
    if (text || stepImgSrcs[n]) {
      return { stepNumber: stepNumber++, stepImageURL: stepImgSrcs[n] || '', description: text };
    }
    return null;
  }).filter(s => s !== null);
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
  editingMenuId = null;

  amRenderTags();
  amUpdateStars(0);
  document.querySelectorAll('#amTasteTags .am-ttag').forEach(b => b.classList.remove('selected'));
  document.getElementById('amIngList').innerHTML  = '';
  document.getElementById('amStepList').innerHTML = '';
  removeMainImg();
}

// ─── Submit (Save to DB with Validation) ─────────────────────
async function amSubmit() {
  const name = document.getElementById('amName').value.trim();
  const qty = document.getElementById('amQty').value.trim();
  const prepTime = document.getElementById('amPrepTime').value.trim();
  const cookTime = document.getElementById('amCookTime').value.trim();
  
  const ingredients = collectIngredients();
  const steps = collectSteps();

  // 1) Validation (ต้องกรอกให้ครบ)
  if (!name) { alert('กรุณาใส่ชื่อเมนู'); return document.getElementById('amName').focus(); }
  if (!qty) { alert('กรุณาใส่จำนวนจาน'); return document.getElementById('amQty').focus(); }
  if (!prepTime && !cookTime) { alert('กรุณาใส่เวลาเตรียมหรือเวลาปรุง'); return document.getElementById('amPrepTime').focus(); }
  if (ingredients.length === 0) { alert('กรุณาใส่วัตถุดิบอย่างน้อย 1 อย่าง'); return; }
  if (steps.length === 0) { alert('กรุณาใส่ขั้นตอนอย่างน้อย 1 ขั้นตอน'); return; }
  if (amStarValue === 0) { alert('กรุณาให้คะแนนรสชาติ (ดาว)'); return; }

  // 2) Prepare Data
  const payload = {
    createdBy  : USER_ID_LOCAL,
    menuName   : name,
    imageURL   : mainImgSrc,
    servings   : parseInt(qty) || 1,
    prepTime   : prepTime,
    cookTime   : cookTime,
    tags       : [...amTags],
    ingredients: ingredients,
    instructions: steps,
    tasteRating: amStarValue,
    tasteTags  : [...document.querySelectorAll('#amTasteTags .am-ttag.selected')].map(b => b.textContent.trim()),
    review     : document.getElementById('amReview').value.trim(),
  };

  // 3) Send API Request
  try {
    const url = editingMenuId ? `/api/usermenus/${editingMenuId}` : '/api/usermenus';
    const method = editingMenuId ? 'PUT' : 'POST';

    // เปลี่ยนข้อความปุ่มระหว่างรอ
    const btn = document.querySelector('.am-btn-submit');
    const oldText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      // โหลดข้อมูลใหม่
      await fetchUserMenus();
      closeAddMenu();
    } else {
      const errorData = await res.json();
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (errorData.error || 'Unknown error'));
    }

    btn.textContent = oldText;
    btn.disabled = false;
  } catch (err) {
    console.error('Submit error:', err);
    alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  amRenderTags();
  amInitStars();
  amInitTasteTags();
  fetchUserMenus(); // ดึงข้อมูลครั้งแรกเมื่อโหลดหน้าเว็บ

  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-button');
  if (searchInput) {
      searchInput.addEventListener('input', renderMenuCards);
      searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') renderMenuCards();
      });
  }
  if (searchBtn) {
      searchBtn.addEventListener('click', renderMenuCards);
  }
});