// ─── Favorite star state (keyed by card index) ───
const favState = {};

function syncCardStar(idx) {
    const cardStars = document.querySelectorAll(`.quest-card[data-id="${idx}"] .quest-title-wrapper .fa-star`);
    cardStars.forEach(cardStar => {
        if (favState[idx]) {
            cardStar.classList.replace('fa-regular', 'fa-solid');
            cardStar.style.color = 'white';
        } else {
            cardStar.classList.replace('fa-solid', 'fa-regular');
            cardStar.style.color = 'white';
        }
    });
}

function syncModalStar() {
    const modalStar = document.querySelector('.modal-star');
    if (!modalStar) return;
    const idx = document.getElementById('questModal').dataset.currentCard;
    if (favState[idx]) {
        modalStar.classList.replace('fa-regular', 'fa-solid');
        modalStar.style.color = 'white';
    } else {
        modalStar.classList.replace('fa-solid', 'fa-regular');
        modalStar.style.color = 'white';
    }
}

const CURRENT_USER_ID = (() => {
    try {
        const data = JSON.parse(localStorage.getItem('user_data'));
        return data?.user?.id || 'user123';
    } catch (e) {
        return 'user123';
    }
})();

// Initialize socket.io connection
const socket = typeof io !== 'undefined' ? io('http://localhost:4000') : null;

if (socket) {
    socket.on('status_updated', async (data) => {
        // Clear session storage cache to prevent loading stale cache
        let userId = 'user123';
        try {
            const userData = JSON.parse(localStorage.getItem('user_data'));
            if (userData?.user?.id) userId = userData.user.id;
        } catch (e) {}
        sessionStorage.removeItem(`cookquest_cache_${userId}`);

        // Re-load the main quest details
        const urlParams = new URLSearchParams(window.location.search);
        const questId = urlParams.get('id');
        if (questId) {
            await loadQuestDetails(questId);
        } else if (typeof loadQuests === 'function') {
            await loadQuests();
        }

        // If the modal is currently open for a menu, re-populate it
        const modal = document.getElementById('questModal');
        if (modal && !modal.classList.contains('hidden')) {
            const menuId = modal.dataset.currentCard;
            const menuData = window.allRelatedMenus.find(m => String(m._id) === String(menuId));
            if (menuData) {
                populateModal(menuData, modal);
            }
        }
    });
}

// Card star toggle (using document-level delegation to support multiple quest-sections)
document.addEventListener('click', async function (e) {
    if (!e.target.classList.contains('fa-star')) return;
    if (!e.target.closest('.quest-title-wrapper')) return; // Target only the favorite star, not the EXP star
    const card = e.target.closest('.quest-card');
    if (!card) return;
    const idx = card.dataset.id;
    
    // Prevent double clicking
    if (e.target.classList.contains('is-loading')) return;
    e.target.classList.add('is-loading');
    
    try {
        const res = await fetch('http://localhost:4000/api/favorites/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: CURRENT_USER_ID, menuId: idx })
        });
        if (res.ok) {
            favState[idx] = !favState[idx];
            syncCardStar(idx);
            // ถ้า modal เปิดอยู่และเป็น card เดียวกัน ให้ sync ด้วย
            const modal = document.getElementById('questModal');
            if (!modal.classList.contains('hidden') && modal.dataset.currentCard === idx) {
                syncModalStar();
            }
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
    } finally {
        e.target.classList.remove('is-loading');
    }
});

// Modal star toggle
document.querySelector('.modal-star').addEventListener('click', async function (e) {
    const modal = document.getElementById('questModal');
    const idx = modal.dataset.currentCard;
    if (idx === undefined) return;
    
    if (e.target.classList.contains('is-loading')) return;
    e.target.classList.add('is-loading');
    
    try {
        const res = await fetch('http://localhost:4000/api/favorites/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: CURRENT_USER_ID, menuId: idx })
        });
        if (res.ok) {
            favState[idx] = !favState[idx];
            syncModalStar();
            syncCardStar(idx);
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
    } finally {
        e.target.classList.remove('is-loading');
    }
});

window.allRelatedMenus = window.allRelatedMenus || []; // เก็บข้อมูลเมนูไว้ใช้ใน Modal

// pop-up Menu (Event Delegation for dynamically created cards)
document.addEventListener('click', (e) => {
    const card = e.target.closest('.menu-card:not(.locked)');
    if (card && (card.closest('#menuList') || card.closest('#recipes-container') || card.closest('#favorites-container'))) {
        // ป้องกันการเปิด modal ถ้ากดโดนดาว Favorite
        if (e.target.classList.contains('fa-star')) return;
        
        e.preventDefault();
        const menuId = card.dataset.id;
        const menuData = window.allRelatedMenus.find(m => m._id === menuId);
        
        const modal = document.getElementById('questModal');
        if (modal && menuData) {
            modal.dataset.currentCard = menuId;
            populateModal(menuData, modal);
            modal.classList.remove('hidden');
            syncModalStar();
        }
    }
});

function populateModal(menu, modal) {
    // Keep it sync or make async?
    // Let's make it async to fetch history
    _populateModalAsync(menu, modal);
}

async function _populateModalAsync(menu, modal) {
    // Header
    const titleEl = modal.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = menu.menuName;

    // Image
    const imgEl = modal.querySelector('.modal-main-img');
    if (imgEl) imgEl.src = menu.imageURL || '../../assets/img/emptymenu.jpg';

    // Tags
    const tagsContainer = modal.querySelector('.modal-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (menu.tags && menu.tags.length > 0) {
            menu.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'modal-tag';
                span.textContent = tag;
                tagsContainer.appendChild(span);
            });
        }
    }

    // Info (Servings & Time)
    const infoEls = modal.querySelectorAll('.modal-info');
    if (infoEls.length >= 2) {
        infoEls[0].textContent = `จำนวน : ${menu.servings || 1} จาน`;
        
        const prepStr = menu.prepTime || '0 นาที';
        const cookStr = menu.cookTime || '0 นาที';
        infoEls[1].textContent = `เวลาเตรียม: ${prepStr} | เวลาปรุง: ${cookStr}`;
    }

    // Ingredients
    const ingContainer = modal.querySelector('.ingredient-list');
    if (ingContainer) {
        ingContainer.innerHTML = '';
        if (menu.ingredients && menu.ingredients.length > 0) {
            menu.ingredients.forEach(ing => {
                const div = document.createElement('div');
                div.className = 'ing-item';
                div.innerHTML = `<span class="thai">${ing.name}</span><span>${ing.amount} ${ing.unit}</span>`;
                ingContainer.appendChild(div);
            });
        } else {
            ingContainer.innerHTML = '<div class="ing-item"><span class="thai">ไม่มีข้อมูลวัตถุดิบ</span></div>';
        }
    }

    // Steps
    const stepContainer = modal.querySelector('.step-list');
    if (stepContainer) {
        stepContainer.innerHTML = '';
        if (menu.instructions && menu.instructions.length > 0) {
            const sortedSteps = [...menu.instructions].sort((a, b) => a.stepNumber - b.stepNumber);
            sortedSteps.forEach((step, index) => {
                const div = document.createElement('div');
                div.className = 'step-item';
                let stepHtml = `
                    <div class="step-num-badge">${step.stepNumber || (index + 1)}</div>
                    <div class="step-body">
                        <p class="thai">${step.description}</p>
                `;
                if (step.stepImageURL) {
                    stepHtml += `<img src="${step.stepImageURL}" alt="step ${step.stepNumber}" class="step-img">`;
                }
                stepHtml += `</div>`;
                div.innerHTML = stepHtml;
                stepContainer.appendChild(div);
            });
        } else {
            stepContainer.innerHTML = '<div class="step-item"><div class="step-body"><p class="thai">ไม่มีข้อมูลขั้นตอนการทำ</p></div></div>';
        }
    }

    // EXP in Quest Zone
    const xpSpan = modal.querySelector('.modal-xp-bar span');
    if (xpSpan) xpSpan.textContent = `${menu.EXP || 0} EXP`;

    // Random Quest Event
    const questDesc = modal.querySelector('.modal-quest-desc');
    if (questDesc) {
        const randomQuests = [
            "ถ่ายรูปมือชู 2 นิ้วเคียงข้างจานอาหาร",
            "ถ่ายรูปมือถือช้อน/ส้อมที่กำลังตักอาหารขึ้นมา (ให้เห็น Texture อาหารชัดๆ)",
            "ถ่ายรูปมือขณะกำลังโรยพริกไทยหรือตกแต่งจานเป็นขั้นตอนสุดท้าย",
            "ถ่ายรูปมุม Top View โดยให้มีมือวางอยู่ขอบจานในท่าทางผ่อนคลาย",
            "ถ่ายรูปมือประคองจานอาหารเพื่อนำเสนอความภูมิใจ (เห็นเฉพาะช่วงอกลงไป)",
            "ถ่ายรูปการจัดจานแบบ Minimal โดยใช้แสงเงาพาดผ่านจานอาหาร",
            "ถ่ายรูปมือทำท่า Mini Heart ❤️ คู่กับจานอาหาร",
            "ถ่ายรูปมือทำท่า 'OK' 👌 เหนือจานอาหารที่ทำสำเร็จ",
            "ถ่ายรูปมือขณะใช้ตะเกียบหรือส้อมคีบอาหารขึ้นมาในระยะ Macro (เน้นความน่ากิน)",
            "ถ่ายรูปกำปั้นชนกันข้างจานอาหาร (ท่า Fist Bump แสดงความสะใจ)",
            "ถ่ายรูปมือที่กำลังยกนิ้วโป้ง 'Like' 👍 ข้างๆ เมนูสุดภูมิใจ",
            "ถ่ายรูปอาหารโดยเลือกฉากหลังที่มีสีตัดกับสีของอาหาร (เช่น จานเหลืองบนผ้าปูสีน้ำเงิน)",
            "ถ่ายรูปมือขณะถือขวดซอสหรือกระปุกเครื่องปรุงชูขึ้นเป็น Background",
            "ถ่ายรูปเงาของมือที่กำลังเอื้อมไปหยิบอาหาร (เล่นกับแสงแดดหรือโคมไฟ)",
            "ถ่ายรูปมือขณะถือจานอาหารยื่นมาข้างหน้า (เหมือนกำลังจะเสิร์ฟให้คนดู)"
        ];
        const randomIndex = Math.floor(Math.random() * randomQuests.length);
        questDesc.textContent = randomQuests[randomIndex];
    }

    const isLoggedIn = !!localStorage.getItem('authToken');
    const interactables = modal.querySelectorAll('.upload-box, .upload-actions, .taste-rating, .taste-tags, .modal-review, .modal-submit-row');
    let loginPrompt = modal.querySelector('.login-prompt-zone');

    if (!isLoggedIn) {
        interactables.forEach(el => { if (el) el.style.display = 'none'; });
        if (!loginPrompt) {
            const prompt = document.createElement('div');
            prompt.className = 'login-prompt-zone';
            prompt.style.textAlign = 'center';
            prompt.style.padding = '20px';
            prompt.innerHTML = `
                <p class="thai" style="margin-bottom: 15px; color: #e74c3c; font-weight: bold;">กรุณาเข้าสู่ระบบให้เรียบร้อยเพื่อทำ Quest</p>
                <a href="login.html" class="btn-submit thai" style="display: inline-block; text-decoration: none; padding: 10px 20px; border-radius: 20px; color: white;">เข้าสู่ระบบ (Login)</a>
            `;
            if (questDesc && questDesc.parentNode) {
                questDesc.parentNode.insertBefore(prompt, questDesc.nextSibling);
            }
        } else {
            loginPrompt.style.display = 'block';
        }
    } else {
        interactables.forEach(el => { if (el) el.style.display = ''; });
        if (loginPrompt) loginPrompt.style.display = 'none';
    }

    // Fetch history and update button state
    const submitBtn = modal.querySelector('.modal-submit-row .btn-submit');
    try {
        const res = await fetch(`http://localhost:4000/api/history?menuName=${encodeURIComponent(menu.menuName)}&userId=${CURRENT_USER_ID}`);
        if (res.ok) {
            const historyData = await res.json();
            
            // Render History Modal
            renderHistory(historyData);

            if (submitBtn) {
                const latest = historyData[0];
                if (latest && latest.status === 'pending') {
                    submitBtn.textContent = 'Pending...';
                    submitBtn.style.backgroundColor = '#f1c40f'; // yellow
                    submitBtn.style.color = '#fff';
                    submitBtn.disabled = true;
                } else if (latest && latest.status === 'approved') {
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.backgroundColor = '#2ecc71'; // green
                    submitBtn.style.color = '#fff';
                    submitBtn.disabled = false;
                    submitBtn.dataset.isResubmit = 'true';
                } else {
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.backgroundColor = ''; 
                    submitBtn.style.color = '';
                    submitBtn.disabled = false;
                    submitBtn.dataset.isResubmit = 'false';
                }
            }
        }
    } catch (err) {
        console.error("Failed to fetch history", err);
    }
}

function renderHistory(historyData) {
    const historyModalContent = document.querySelector('.history-modal-content');
    if (!historyModalContent) return;

    const headerHtml = `
        <div class="history-header">
            <span class="thaipattaya history-title">ประวัติการทำ</span>
            <button class="close-modal" id="closeHistoryModal">✕</button>
        </div>
    `;

    let bodyHtml = '';
    if (historyData.length === 0) {
        bodyHtml = '<p class="thai" style="text-align: center; padding: 20px;">ยังไม่มีประวัติการส่ง Quest นี้</p>';
    } else {
        historyData.forEach((sub, index) => {
            const req = sub.requestId || {};
            const statusLabel = sub.status === 'pending' ? 'Pending ...' : (sub.status === 'approved' ? 'Approved' : 'Rejected');
            const statusClass = sub.status;
            
            const allTags = ["หวาน", "เค็ม", "เปรี้ยว", "ขม", "อูมามิ", "เผ็ด"];
            const tasteTagsHtml = allTags.map(tag => {
                const isSelected = sub.tasteTags && sub.tasteTags.includes(tag);
                return `<button class="taste-tag thai ${isSelected ? 'selected' : ''} disabled" data-taste="${tag}">${tag}</button>`;
            }).join('');

            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= sub.tasteRating) {
                    starsHtml += `<i class="fa-solid fa-star taste-star active" data-val="${i}" style="color:#FFD700; pointer-events:none"></i>`;
                } else {
                    starsHtml += `<i class="fa-regular fa-star taste-star" data-val="${i}" style="pointer-events:none"></i>`;
                }
            }

            bodyHtml += `
            <details class="history-item" id="historyItem${index}">
                <summary class="history-summary">
                    <div class="history-summary-left">
                    <span class="inria-serif history-quest-name">Quest ${historyData.length - index}</span>
                    <span class="history-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down history-chevron"></i>
                </summary>
                <div class="history-body">
                    <p class="thai history-desc">${req.randomQuests || ''}</p>
                    <div class="history-photo-wrap">
                        <img src="${sub.imageURL || '../../assets/img/emptymenu.jpg'}" alt="submitted" class="history-photo" id="historyPhoto${index}">
                    </div>
                    <div class="history-photo-actions hidden" id="historyPhotoActions${index}">
                        <label class="btn-change-img thai" for="historyFileInput${index}">
                            <i class="fa-solid fa-pen"></i> เปลี่ยนรูป
                        </label>
                        <input type="file" id="historyFileInput${index}" accept="image/*" style="display:none" onchange="changeHistoryPhoto(event, ${index})">
                    </div>
                    <div class="taste-rating">
                        <span class="taste-label">Taste :</span>
                        <div class="taste-stars" id="historyTasteStars${index}">
                            ${starsHtml}
                        </div>
                    </div>
                    <div class="taste-tags" id="historyTasteTags${index}">
                        ${tasteTagsHtml}
                    </div>
                    <div class="history-review-wrap" id="historyReviewWrap${index}">
                        <p class="history-review-text thai" id="historyReviewText${index}">${sub.review || ''}</p>
                        <textarea class="modal-review thai hidden" id="historyReviewInput${index}" rows="2">${sub.review || ''}</textarea>
                    </div>
                    <div class="history-btn-row" id="historyBtnRow${index}">
                        ${sub.status === 'pending' ? `
                        <div class="history-view-actions" id="historyViewActions${index}">
                            <button class="btn-edit-history thai" onclick="enterEditMode(${index})">Edit</button>
                        </div>
                        <div class="history-edit-actions hidden" id="historyEditActions${index}">
                            <button class="btn-submit thai" onclick="saveHistoryEdit(${index}, '${sub._id}')">Save</button>
                            <button class="btn-cancel-history thai" onclick="cancelEditMode(${index})">Cancel</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </details>
            `;
        });
    }

    historyModalContent.innerHTML = headerHtml + bodyHtml;

    const closeHistoryBtn = document.getElementById('closeHistoryModal');
    const historyModal = document.getElementById('historyModal');
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.classList.add('hidden');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('questModal');
    const closeBtn = document.getElementById('closeModal');

    // ปิด Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // ปิดเมื่อคลิกข้างนอก Modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // ─── Submit Quest Logic ───
    const submitBtn = document.querySelector('.modal-submit-row .btn-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const menuId = modal.dataset.currentCard;
            const menuData = window.allRelatedMenus.find(m => m._id === menuId);
            if (!menuData) return;

            // Collect data
            const preview = document.getElementById('uploadPreview');
            const imageURL = preview.src && !preview.classList.contains('hidden') ? preview.src : '';
            
            // หาดาวที่ active โดยนับว่ามีกี่ดวงที่มีคลาส active (หรือเช็คสี)
            // โค้ดเดิมเวลา click star จะใส่ class .active
            const activeStars = document.querySelectorAll('#tasteStars .taste-star.active');
            let tasteRating = 0;
            if (activeStars.length > 0) {
                tasteRating = parseInt(activeStars[activeStars.length - 1].dataset.val);
            }
            
            const activeTags = document.querySelectorAll('#tasteTags .taste-tag.selected');
            const tasteTags = Array.from(activeTags).map(t => t.dataset.taste);
            
            const review = document.getElementById('reviewText').value.trim();
            
            if (!imageURL || tasteRating === 0 || tasteTags.length === 0 || !review) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่ง (รูปถ่าย, รสชาติ, รูปแบบรสชาติ, รีวิว)');
                return;
            }
            
            if (submitBtn.dataset.isResubmit === 'true') {
                const confirmResubmit = confirm('การส่งใหม่จะไม่ได้ EXP เพิ่มเติม จะถูกบันทึกเป็นประวัติเท่านั้น ยืนยันที่จะส่งหรือไม่?');
                if (!confirmResubmit) return;
            }
            
            const randomQuests = modal.querySelector('.modal-quest-desc').textContent;
            const menuName = menuData.menuName;

            try {
                const res = await fetch('http://localhost:4000/api/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ menuName, randomQuests, imageURL, tasteRating, tasteTags, review, createdBy: CURRENT_USER_ID })
                });
                
                if (res.ok) {
                    // Clear form
                    removeUpload();
                    document.querySelectorAll('#tasteStars .taste-star').forEach(s => {
                        s.classList.replace('fa-solid', 'fa-regular');
                        s.classList.remove('active');
                        s.style.color = 'white';
                    });
                    document.querySelectorAll('#tasteTags .taste-tag').forEach(t => t.classList.remove('selected'));
                    document.getElementById('reviewText').value = '';
                    
                    // Change button to pending
                    submitBtn.textContent = 'Pending';
                    submitBtn.style.backgroundColor = '#f1c40f'; // สีเหลือง
                    submitBtn.style.color = '#fff';
                    submitBtn.disabled = true;
                    submitBtn.dataset.isResubmit = 'false';
                    
                    // Update history UI dynamically
                    try {
                        const historyRes = await fetch(`http://localhost:4000/api/history?menuName=${encodeURIComponent(menuName)}&userId=${CURRENT_USER_ID}`);
                        if (historyRes.ok) {
                            const historyData = await historyRes.json();
                            if (typeof renderHistory === 'function') {
                                renderHistory(historyData);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to update history UI', e);
                    }

                    // Update quest card color immediately
                    const card = document.querySelector(`.quest-card[data-id="${menuId}"]`);
                    if (card) {
                        card.classList.remove('status-approved', 'status-rejected');
                        card.classList.add('status-pending');
                    }
                    
                    alert('ส่ง Quest สำเร็จ! รอการตรวจสอบจากแอดมิน');
                } else {
                    alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
                }
            } catch (error) {
                console.error(error);
                alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
            }
        });
    }

    // Fetch quest data if URL has ID
    const urlParams = new URLSearchParams(window.location.search);
    const questId = urlParams.get('id');
    if (questId) {
        loadQuestDetails(questId);
    }
});

function showSkeletonLoadersInDetail() {
    const menuList = document.getElementById('menuList');
    if (!menuList) return;
    const skeletonHTML = `
        <div class="skeleton-card">
            <div class="skeleton-title"></div>
            <div class="skeleton-image"></div>
            <div class="skeleton-footer"></div>
        </div>
    `.repeat(6);
    menuList.innerHTML = skeletonHTML;
}

async function loadQuestDetails(questId) {
    const cacheKey = `cookquest_cache_${CURRENT_USER_ID}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    const token = localStorage.getItem('authToken');

    const renderFromData = (quests, menus, fState, mStatusMap, profile) => {
        window.currentUserProfile = profile;
        for (let key in favState) delete favState[key];
        Object.assign(favState, fState);
        const currentQuest = quests.find(q => q._id === questId);
        if (!currentQuest) return;

        const titleContainer = document.querySelector('.category-container div:first-child');
        if (titleContainer) {
            titleContainer.innerHTML = `
                <span class="category-header">Quest</span>
                <span class="category-title thai">${currentQuest.name}</span>
            `;
        }
        
        const relatedMenus = menus.filter(menu => {
            const hasQuestId = menu.questIds && menu.questIds.includes(questId);
            const hasTagMatch = currentQuest.tags && currentQuest.tags.some(tag => tag.toLowerCase() === (menu.menuName || '').toLowerCase());
            return hasQuestId || hasTagMatch;
        });

        window.allRelatedMenus = relatedMenus; // เก็บไว้ใช้ใน Modal
        renderMenus(relatedMenus, mStatusMap);
    };

    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            renderFromData(data.quests, data.menus, data.favState, data.menuStatusMap, data.profile);
        } catch (e) {
            console.error('Cache parsing failed', e);
            showSkeletonLoadersInDetail();
        }
    } else {
        showSkeletonLoadersInDetail();
    }

    if (!window.Worker) {
        console.error('Web Workers are not supported in this browser.');
        return;
    }

    let worker;
    let workerPort;
    if (typeof SharedWorker !== 'undefined') {
        worker = new SharedWorker('../../assets/js/worker.js');
        workerPort = worker.port;
        workerPort.start();
    } else {
        worker = new Worker('../../assets/js/worker.js');
        workerPort = worker;
    }

    workerPort.postMessage({ userId: CURRENT_USER_ID, token });

    workerPort.onmessage = function(e) {
        const data = e.data;
        if (!data.success) {
            console.error('Worker error:', data.error);
            return;
        }

        const { quests, menus, favState: newFavState, menuStatusMap, profile } = data;
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
                quests, menus, favState: newFavState, menuStatusMap, profile
            }));
        } catch (e) {
            console.warn('Could not cache data in sessionStorage. Quota might be exceeded:', e);
        }
        
        renderFromData(quests, menus, newFavState, menuStatusMap, profile);
    };

    if (typeof SharedWorker === 'undefined') {
        worker.onerror = function(error) {
            console.error('Worker failed:', error);
        };
    }
}

function renderMenus(menus, menuStatusMap = {}) {
    const menuList = document.getElementById('menuList');
    if (!menuList) return;
    
    menuList.innerHTML = '';
    
    menus.forEach(menu => {
        const card = document.createElement('div');
        card.className = 'quest-card menu-card';
        card.setAttribute('data-id', menu._id);
        card.setAttribute('data-name', menu.menuName || '');
        card.setAttribute('data-exp', menu.EXP || 0);

        const mStatus = menuStatusMap[menu.menuName];
        if (mStatus) {
            card.classList.add(`status-${mStatus}`);
        }

        const menuExp = menu.EXP || 0;
        let requiredRank = 'bronze';
        if (menuExp >= 100 && menuExp <= 150) requiredRank = 'bronze';
        else if (menuExp >= 151 && menuExp <= 200) requiredRank = 'silver';
        else if (menuExp >= 201 && menuExp <= 250) requiredRank = 'gold';
        else if (menuExp >= 251 && menuExp <= 300) requiredRank = 'platinum';
        else if (menuExp >= 301 && menuExp <= 500) requiredRank = 'diamond';
        else if (menuExp >= 501) requiredRank = 'master';

        const rankOrder = {
            'bronze': 1, 'silver': 2, 'gold': 3,
            'platinum': 4, 'diamond': 5, 'master': 6
        };
        
        let userRankStr = 'bronze';
        if (window.currentUserProfile && window.currentUserProfile.rank) {
            const cleanRank = window.currentUserProfile.rank.toLowerCase();
            if (cleanRank.includes('bronze')) userRankStr = 'bronze';
            else if (cleanRank.includes('silver')) userRankStr = 'silver';
            else if (cleanRank.includes('gold')) userRankStr = 'gold';
            else if (cleanRank.includes('platinum')) userRankStr = 'platinum';
            else if (cleanRank.includes('diamond')) userRankStr = 'diamond';
            else if (cleanRank.includes('master')) userRankStr = 'master';
        }
        
        const requiredVal = rankOrder[requiredRank] || 1;
        const userVal = rankOrder[userRankStr] || 1;
        const isLocked = userVal < requiredVal;

        if (isLocked) {
            card.classList.add('locked');
        }

        const imageUrl = menu.imageURL || '../../assets/img/emptymenu.jpg';
        const rankValue = requiredRank;
        const rankDisplay = rankValue.toUpperCase();
        const prepTimeStr = menu.prepTime || '0';
        const cookTimeStr = menu.cookTime || '0';
        const totalTime = (parseInt(prepTimeStr) || 0) + (parseInt(cookTimeStr) || 0);
        const timeDisplay = totalTime > 0 ? `${totalTime} นาที` : (menu.prepTime || '30 นาที');

        const isFavorited = favState[menu._id];
        card.innerHTML = `
            <span class="quest-title-wrapper">
                <h2 class="quest-title thaipattaya">${menu.menuName}</h2>
                <i class="${isFavorited ? 'fa-solid' : 'fa-regular'} fa-star" style="cursor:pointer; color: white;"></i>
            </span>
            <figure class="quest-image">
                <img src="${imageUrl}" alt="${menu.menuName}">
                ${isLocked ? `
                <div class="lock-overlay">
                    <i class="fa-solid fa-lock"></i><span class="rank-label rank-text" data-rank="${rankValue}">${rankDisplay}</span>
                </div>` : ''}
            </figure>
            <div class="menu-footer">
                <span class="time"><i class="fa-solid fa-clock"></i> ${timeDisplay}</span>
                <span class="exp"><i class="fa-solid fa-star"></i> ${menu.EXP || 0} EXP</span>
            </div>
        `;
        menuList.appendChild(card);
    });

    if (typeof applyRankColors === 'function') {
        applyRankColors();
    }
    if (typeof sortQuests === 'function') {
        sortQuests();
    }
}
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
 
    // ─── Modal & History: Taste tag toggle ───
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('taste-tag')) {
            if (e.target.classList.contains('disabled')) return; // block ถ้า disabled
            e.target.classList.toggle('selected');
        }
        
        // ─── History: Taste star rating (Event Delegation) ───
        if (e.target.classList.contains('taste-star') && e.target.closest('#historyModal')) {
            const star = e.target;
            // เช็คว่า pointer-events เป็น none หรือไม่ (ถ้าเป็น none จะคลิกไม่ติดอยู่แล้ว แต่กันไว้ก่อน)
            if (window.getComputedStyle(star).pointerEvents === 'none') return;

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
        }
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

async function saveHistoryEdit(idx, submissionId) {
  const input = document.getElementById(`historyReviewInput${idx}`);
  const text = document.getElementById(`historyReviewText${idx}`);
  
  // รวบรวมข้อมูลใหม่
  const review = input.value.trim();
  const activeStars = document.querySelectorAll(`#historyTasteStars${idx} .taste-star.active`);
  const tasteRating = activeStars.length > 0 ? parseInt(activeStars[activeStars.length - 1].dataset.val) : 0;
  
  const activeTags = document.querySelectorAll(`#historyTasteTags${idx} .taste-tag.selected`);
  const tasteTags = Array.from(activeTags).map(t => t.dataset.taste);
  
  const photoImg = document.getElementById(`historyPhoto${idx}`);
  const imageURL = photoImg.src; // อาจจะเป็น base64 หากเพิ่งเปลี่ยน

  if (tasteRating === 0 || tasteTags.length === 0 || !review) {
      alert('กรุณากรอกข้อมูลดาว รสชาติ และรีวิวให้ครบถ้วน');
      return;
  }

  try {
      const res = await fetch(`http://localhost:4000/api/submissions/${submissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review, tasteRating, tasteTags, imageURL })
      });

      if (res.ok) {
          text.textContent = review; // อัปเดตใน UI
          cancelEditMode(idx);
          alert('บันทึกการแก้ไขสำเร็จ!');
      } else {
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
  } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
  }
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
    preview.classList.add('hidden');
    icon.classList.remove('hidden');
    label.classList.remove('hidden');
    actions.classList.add('hidden');
    input.value = '';
}

function getRankColor(rank) {
  switch (rank.toLowerCase()) {
    case 'bronze': return '#ffa954ff'; // ทองแดง
    case 'silver': return '#e3e3e3ff'; // เงิน
    case 'gold': return '#FFD700'; // ทอง
    case 'platinum': return '#ff25ffff'; // แพลตินัม
    case 'diamond': return '#34d0ffff'; // เพชร
    case 'master': return 'rainbow'; // ปรมาจารย์ (สีรุ้ง)
    default: return '#fff';
  }
}

function applyRankColors() {
  const textEls = document.querySelectorAll('.rank-text'); // หรือ class ที่คุณใช้
  textEls.forEach(el => {
    const rank = el.textContent.trim().toLowerCase();
    
    // Reset previous inline styles or rainbow class
    el.style.color = '';
    el.classList.remove('rank-rainbow');
    
    const lockOverlay = el.closest('.lock-overlay');
    let lockIcon = null;
    if (lockOverlay) {
        lockIcon = lockOverlay.querySelector('.fa-lock');
        if (lockIcon) {
            lockIcon.style.color = '';
            lockIcon.classList.remove('rank-rainbow');
        }
    }

    const color = getRankColor(rank);
    if (color === 'rainbow') {
        el.classList.add('rank-rainbow');
        if (lockIcon) {
            lockIcon.classList.add('rank-rainbow');
        }
    } else {
        el.style.color = color;
        if (lockIcon) {
            lockIcon.style.color = color;
        }
    }
  });
}