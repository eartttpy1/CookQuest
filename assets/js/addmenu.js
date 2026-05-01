/* ════════════════════════════════
   ADD MENU POPUP — JAVASCRIPT
   ════════════════════════════════ */

// ─── Open / Close ───────────────────────────────────────────
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

// ปิดเมื่อคลิก overlay ข้างนอก
document.getElementById('amOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeAddMenu();
});

// ─── Main Image Upload ───────────────────────────────────────
function previewMainImg(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('amMainPreview').src = e.target.result;
    document.getElementById('amMainPreview').classList.remove('hidden');
    document.getElementById('amMainIcon').classList.add('hidden');
    document.getElementById('amMainLabel').classList.add('hidden');
    document.getElementById('amMainActions').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeMainImg() {
  document.getElementById('amMainPreview').src = '';
  document.getElementById('amMainPreview').classList.add('hidden');
  document.getElementById('amMainIcon').classList.remove('hidden');
  document.getElementById('amMainLabel').classList.remove('hidden');
  document.getElementById('amMainActions').classList.add('hidden');
  document.getElementById('amMainFile').value = '';
}

// ─── Tags ────────────────────────────────────────────────────
const amTags = ['เมนูหมู', 'เมนูใช้ X'];

function amRenderTags() {
  const wrap = document.getElementById('amTagsWrap');
  wrap.innerHTML = amTags.map((t, i) =>
    `<span class="am-tag-pill">
       <span>${t}</span>
       <span class="am-tag-rm" onclick="amRemoveTag(${i})">✕</span>
     </span>`
  ).join('');
}

function amAddTag() {
  const inp = document.getElementById('amTagInput');
  const val = inp.value.trim();
  if (val) {
    amTags.push(val);
    inp.value = '';
    amRenderTags();
  }
}

function amRemoveTag(i) {
  amTags.splice(i, 1);
  amRenderTags();
}

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
    <input type="text"   class="am-input" placeholder="วัตถุดิบ">
    <input type="number" class="am-input" placeholder="จำนวน" min="0" style="text-align:center">
    <input type="text"   class="am-input" placeholder="ชิ้น">
    <button class="am-ing-rm" onclick="amRemoveIng('${id}')">−</button>
  `;
  document.getElementById('amIngList').appendChild(div);
}

function amRemoveIng(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Steps ───────────────────────────────────────────────────
let amStepCount = 0;

function amAddStep() {
  amStepCount++;
  const n = amStepCount;
  const id = 'amStep_' + n;
  const fileId = 'amStepFile_' + n;

  const div = document.createElement('div');
  div.className = 'am-step-item';
  div.id = id;
  div.innerHTML = `
    <button class="am-step-rm" onclick="amRemoveStep('${id}')">−</button>
    <div class="am-step-num">${n}.</div>
    <div class="am-step-upload" id="amStepBox_${n}" onclick="document.getElementById('${fileId}').click()">
      <i class="fa-regular fa-image"></i>
      <span>เพิ่มไฟล์รูปภาพ</span>
      <input type="file" id="${fileId}" accept="image/*" style="display:none"
             onchange="amPreviewStep(event, ${n})">
    </div>
    <textarea class="am-input am-textarea thai" placeholder="วิธีทำ" rows="2"></textarea>
  `;
  document.getElementById('amStepList').appendChild(div);
}

function amRemoveStep(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function amPreviewStep(event, n) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  const fileId = 'amStepFile_' + n;
  reader.onload = function (e) {
    const box = document.getElementById('amStepBox_' + n);
    box.innerHTML = `
      <img src="${e.target.result}" alt="step">
      <input type="file" id="${fileId}" accept="image/*" style="display:none"
             onchange="amPreviewStep(event, ${n})">
    `;
  };
  reader.readAsDataURL(file);
}

// ─── Taste Stars ─────────────────────────────────────────────
let amStarValue = 0;

function amInitStars() {
  const stars = document.querySelectorAll('.am-star');

  stars.forEach(star => {
    // click → set rating
    star.addEventListener('click', () => {
      amStarValue = parseInt(star.dataset.val);
      amUpdateStars(amStarValue);
    });

    // hover preview
    star.addEventListener('mouseenter', () => {
      const hov = parseInt(star.dataset.val);
      stars.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= hov);
      });
    });

    // restore on mouse leave
    star.addEventListener('mouseleave', () => {
      amUpdateStars(amStarValue);
    });
  });
}

function amUpdateStars(val) {
  document.querySelectorAll('.am-star').forEach(s => {
    const sv = parseInt(s.dataset.val);
    if (sv <= val) {
      s.classList.remove('fa-regular');
      s.classList.add('fa-solid', 'active');
    } else {
      s.classList.remove('fa-solid', 'active');
      s.classList.add('fa-regular');
    }
  });
}

// ─── Taste Tags ──────────────────────────────────────────────
function amInitTasteTags() {
  document.querySelectorAll('.am-ttag').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });
}

// ─── Submit ──────────────────────────────────────────────────
function amSubmit() {
  // รวบรวมข้อมูลทั้งหมด (เชื่อม API ตรงนี้)
  const data = {
    name     : document.getElementById('amName').value.trim(),
    qty      : document.getElementById('amQty').value.trim(),
    prepTime : document.getElementById('amPrepTime').value.trim(),
    cookTime : document.getElementById('amCookTime').value.trim(),
    tags     : [...amTags],
    tasteRating: amStarValue,
    tasteTags: [...document.querySelectorAll('.am-ttag.selected')].map(b => b.textContent.trim()),
    review   : document.getElementById('amReview').value.trim(),
  };
  console.log('Submit data:', data);
  // TODO: ส่งข้อมูลไปยัง API ของคุณที่นี่
  alert('บันทึกเรียบร้อย!');
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