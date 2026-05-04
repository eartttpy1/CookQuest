// dropdown Category
const details = document.querySelectorAll(".dropdown");

details.forEach((targetDetail) => {
    targetDetail.addEventListener("click", () => {
        // เมื่อคลิกอันใดอันหนึ่ง ให้วนลูปปิดอันอื่นที่เหลือ
        details.forEach((detail) => {
            if (detail !== targetDetail) {
                detail.removeAttribute("open");
            }
        });
    });
});
// ─── Favorite star state (keyed by card index) ───
const favState = {};

function syncCardStar(idx) {
    const cardStar = document.querySelector(`.quest-card[data-id="${idx}"] .fa-star`);
    if (!cardStar) return;
    if (favState[idx]) {
        cardStar.classList.replace('fa-regular', 'fa-solid');
        cardStar.style.color = '#ffffff';
    } else {
        cardStar.classList.replace('fa-solid', 'fa-regular');
        cardStar.style.color = '';
    }
}

function syncModalStar() {
    const modalStar = document.querySelector('.modal-star');
    if (!modalStar) return;
    const idx = document.getElementById('questModal').dataset.currentCard;
    if (favState[idx]) {
        modalStar.classList.replace('fa-regular', 'fa-solid');
        modalStar.style.color = '#ffffff';
    } else {
        modalStar.classList.replace('fa-solid', 'fa-regular');
        modalStar.style.color = '';
    }
}

// Card star toggle
document.querySelector('.quest-section').addEventListener('click', function (e) {
    if (!e.target.classList.contains('fa-star')) return;
    const card = e.target.closest('.quest-card');
    if (!card) return;
    const idx = card.dataset.id;
    favState[idx] = !favState[idx];
    syncCardStar(idx);
    // ถ้า modal เปิดอยู่และเป็น card เดียวกัน ให้ sync ด้วย
    const modal = document.getElementById('questModal');
    if (!modal.classList.contains('hidden') && modal.dataset.currentCard === idx) {
        syncModalStar();
    }
});

// Modal star toggle
document.querySelector('.modal-star').addEventListener('click', function () {
    const modal = document.getElementById('questModal');
    const idx = modal.dataset.currentCard;
    if (idx === undefined) return;
    favState[idx] = !favState[idx];
    syncModalStar();
    syncCardStar(idx);
});

// pop-up Menu
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('closeModal');
    const questCards = document.querySelectorAll('.clickable-menu:not(.locked)');

    // เปิด Modal เมื่อกดการ์ดที่ไม่ได้ล็อค[cite: 1]
    questCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // ป้องกันการเปิด modal ถ้ากดโดนดาว Favorite
            if (e.target.classList.contains('fa-star')) return;
            
            e.preventDefault();
            modal.dataset.currentCard = card.dataset.id;
            modal.classList.remove('hidden');
            syncModalStar();
        });
    });

    // ปิด Modal
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // ปิดเมื่อคลิกข้างนอก Modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});
// ─── Modal: Taste star rating ───
document.addEventListener('DOMContentLoaded', () => {
    const tasteStars = document.querySelectorAll('.taste-star');
    tasteStars.forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.dataset.val);
            tasteStars.forEach(s => {
                const sv = parseInt(s.dataset.val);
                if (sv <= val) {
                    s.classList.remove('fa-regular');
                    s.classList.add('fa-solid', 'active');
                } else {
                    s.classList.remove('fa-solid', 'active');
                    s.classList.add('fa-regular');
                }
            });
        });
        // hover preview
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.val);
            tasteStars.forEach(s => {
                s.style.color = parseInt(s.dataset.val) <= val ? '#FFD700' : 'white';
            });
        });
        star.addEventListener('mouseleave', () => {
            tasteStars.forEach(s => {
                s.style.color = s.classList.contains('active') ? '#FFD700' : 'white';
            });
        });
    });
 
    // ─── Modal: Taste tag toggle ───
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('taste-tag')) return;
        if (e.target.classList.contains('disabled')) return; // block ถ้า disabled
        e.target.classList.toggle('selected');
    });
});
 // ─── Modal tags: show partial / show all ───
document.addEventListener('DOMContentLoaded', () => {
    const tagsContainer = document.querySelector('.modal-tags');
    if (!tagsContainer) return;

    const allTags = tagsContainer.querySelectorAll('.modal-tag:not(.modal-tag-more)');
    const moreBtn = tagsContainer.querySelector('.modal-tag-more');
    const VISIBLE_COUNT = 2; // จำนวน tag ที่แสดงตอนแรก
    let expanded = false;

    // ซ่อน tag ที่เกิน VISIBLE_COUNT ตอนเริ่มต้น
    allTags.forEach((tag, i) => {
        if (i >= VISIBLE_COUNT) tag.style.display = 'none';
    });

    if (moreBtn) {
        moreBtn.addEventListener('click', () => {
            expanded = !expanded;
            allTags.forEach((tag, i) => {
                if (i >= VISIBLE_COUNT) {
                    tag.style.display = expanded ? 'inline-block' : 'none';
                }
            });
            moreBtn.textContent = expanded ? '▲' : '...';
        });
    }
});

// ─── History Modal ───
document.addEventListener('DOMContentLoaded', () => {
  const historyModal = document.getElementById('historyModal');
  const closeHistoryBtn = document.getElementById('closeHistoryModal');
  const openHistoryBtn = document.querySelector('.btn-history');

  // เปิด
  if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', () => {
      historyModal.classList.remove('hidden');
    });
  }

  // ปิดด้วย X
  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      historyModal.classList.add('hidden');
    });
  }

  // ปิดเมื่อคลิกพื้นหลัง
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) historyModal.classList.add('hidden');
  });

  // taste star ใน history (ทำงานเหมือน modal ปกติ)
  document.querySelectorAll('#historyModal .taste-star').forEach(star => {
    star.addEventListener('click', () => {
      const group = star.closest('.taste-stars');
      const val = parseInt(star.dataset.val);
      group.querySelectorAll('.taste-star').forEach(s => {
        if (parseInt(s.dataset.val) <= val) {
          s.classList.replace('fa-regular','fa-solid');
          s.classList.add('active');
          s.style.color = '#FFD700';
        } else {
          s.classList.replace('fa-solid','fa-regular');
          s.classList.remove('active');
          s.style.color = 'white';
        }
      });
    });
  });

});

function enterEditMode(idx) {
    // unlock tags
    document.querySelectorAll(`#historyTasteTags${idx} .taste-tag`)
        .forEach(t => t.classList.remove('disabled'));
    // unlock stars
    document.querySelectorAll(`#historyTasteStars${idx} .taste-star`)
        .forEach(s => s.style.pointerEvents = 'auto');

    document.getElementById(`historyReviewText${idx}`).classList.add('hidden');
    document.getElementById(`historyReviewInput${idx}`).classList.remove('hidden');
    document.getElementById(`historyViewActions${idx}`).classList.add('hidden');
    document.getElementById(`historyEditActions${idx}`).classList.remove('hidden');
    document.getElementById(`historyPhotoActions${idx}`).classList.remove('hidden');
}

function cancelEditMode(idx) {
    // lock tags back
    document.querySelectorAll(`#historyTasteTags${idx} .taste-tag`)
        .forEach(t => t.classList.add('disabled'));
    // lock stars back
    document.querySelectorAll(`#historyTasteStars${idx} .taste-star`)
        .forEach(s => s.style.pointerEvents = 'none');
    const input = document.getElementById(`historyReviewInput${idx}`);
    const text = document.getElementById(`historyReviewText${idx}`);
    input.value = text.textContent; // reset
    input.classList.add('hidden');
    text.classList.remove('hidden');
    document.getElementById(`historyViewActions${idx}`).classList.remove('hidden');
    document.getElementById(`historyEditActions${idx}`).classList.add('hidden');
    document.getElementById(`historyPhotoActions${idx}`).classList.add('hidden');
}

function saveHistoryEdit(idx) {
  const input = document.getElementById(`historyReviewInput${idx}`);
  const text = document.getElementById(`historyReviewText${idx}`);
  text.textContent = input.value; // บันทึก (ตอนเชื่อม API ส่งค่าตรงนี้)
  cancelEditMode(idx);
  // TODO: API call → PATCH /history/{idx} { review: input.value, ... }
}

function changeHistoryPhoto(event, idx) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById(`historyPhoto${idx}`).src = e.target.result;
    };
    reader.readAsDataURL(file);
}
// ─── Upload preview ───
function previewUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const preview = document.getElementById('uploadPreview');
    const icon = document.getElementById('uploadIcon');
    const label = document.getElementById('uploadLabel');
    const actions = document.getElementById('uploadActions');
    const reader = new FileReader();
    reader.onload = e => {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        icon.classList.add('hidden');
        label.classList.add('hidden');
        actions.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeUpload() {
    const preview = document.getElementById('uploadPreview');
    const icon = document.getElementById('uploadIcon');
    const label = document.getElementById('uploadLabel');
    const actions = document.getElementById('uploadActions');
    const input = document.getElementById('questFileInput');
    preview.src = '';
    preview.classList.add('hidden');
    icon.classList.remove('hidden');
    label.classList.remove('hidden');
    actions.classList.add('hidden');
    input.value = '';
}