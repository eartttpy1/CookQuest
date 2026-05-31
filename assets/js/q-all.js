// dropdown Category
const details = document.querySelectorAll(".dropdown");

details.forEach((targetDetail) => {
    targetDetail.addEventListener("click", () => {
        details.forEach((detail) => {
            if (detail !== targetDetail) {
                detail.removeAttribute("open");
            }
        });
    });
});

// Global state for SPA filtering
window.allQuestsData = [];
window.allMenusData = [];
window.currentMenuStatusMap = {};

function setupTabNavigation() {
    const navLinks = document.querySelectorAll('.top-nav .nav-link');
    const questSectionWrapper = document.getElementById('questSectionWrapper');

    // ตรวจสอบ URL parameter ว่ามีการส่ง tab มาหรือไม่ (เช่น ?tab=pending)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    
    if (initialTab) {
        navLinks.forEach(l => l.classList.remove('active'));
        const targetLink = document.querySelector(`.top-nav .nav-link[data-filter="${initialTab}"]`);
        if (targetLink) targetLink.classList.add('active');
        applyFilters();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const filter = e.currentTarget.getAttribute('data-filter');
            if (!filter) return; // Let normal links (like q-self.html) pass through

            e.preventDefault();
            
            // Update active class
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Apply filter
            applyFilters();
        });
    });

    // Add search event listeners
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-button');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', applyFilters);
    }
}

function applyFilters() {
    const activeNav = document.querySelector('.top-nav .nav-link.active');
    const filter = activeNav ? activeNav.getAttribute('data-filter') : 'all';
    const questSectionWrapper = document.getElementById('questSectionWrapper');
    
    const searchInput = document.querySelector('.search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let filteredMenus = window.allMenusData || [];
    let filteredQuests = window.allQuestsData || [];

    if (filter === 'pending') {
        filteredMenus = filteredMenus.filter(menu => 
            window.currentMenuStatusMap && window.currentMenuStatusMap[menu.menuName] === 'pending'
        );
        if (questSectionWrapper) questSectionWrapper.style.display = 'none';
    } else if (filter === 'complete') {
        filteredMenus = filteredMenus.filter(menu => {
            const status = window.currentMenuStatusMap ? window.currentMenuStatusMap[menu.menuName] : null;
            return status === 'approved' || status === 'rejected';
        });
        if (questSectionWrapper) questSectionWrapper.style.display = 'none';
    } else {
        if (questSectionWrapper) questSectionWrapper.style.display = '';
    }

    if (query) {
        filteredMenus = filteredMenus.filter(menu => {
            const nameMatch = (menu.menuName || '').toLowerCase().includes(query);
            const tagMatch = menu.tags && menu.tags.some(tag => tag.toLowerCase().includes(query));
            const ingMatch = menu.ingredients && menu.ingredients.some(ing => (ing.name || '').toLowerCase().includes(query));
            return nameMatch || tagMatch || ingMatch;
        });
        
        filteredQuests = filteredQuests.filter(quest => {
            const nameMatch = (quest.name || '').toLowerCase().includes(query);
            const tagMatch = quest.tags && quest.tags.some(tag => tag.toLowerCase().includes(query));
            const ingMatch = quest.ingredients && quest.ingredients.some(ing => (ing.name || '').toLowerCase().includes(query));
            return nameMatch || tagMatch || ingMatch;
        });
    }

    if (typeof renderQuests === 'function') {
        renderQuests(filteredQuests);
    }
    if (typeof renderMenus === 'function') {
        renderMenus(filteredMenus, window.currentMenuStatusMap);
    }
    if (typeof window.sortQuests === 'function') {
        window.sortQuests();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
});

// ─── API Connection (Load Quests from Server) ───
function showSkeletonLoaders() {
    const questList = document.getElementById('questList');
    const menuList = document.getElementById('menuList');
    
    const skeletonHTML = `
        <div class="skeleton-card">
            <div class="skeleton-title"></div>
            <div class="skeleton-image"></div>
            <div class="skeleton-footer"></div>
        </div>
    `.repeat(6); 
    
    if (questList) questList.innerHTML = skeletonHTML;
    if (menuList) menuList.innerHTML = skeletonHTML;
}

async function loadQuests() {
    if (!window.Worker) {
        console.error('Web Workers are not supported in this browser.');
        return;
    }

    let userId = 'user123';
    let token = null;
    try {
        const data = JSON.parse(localStorage.getItem('user_data'));
        if (data?.user?.id) userId = data.user.id;
        token = localStorage.getItem('authToken');
    } catch (e) {}
    const cacheKey = `cookquest_cache_v2_${userId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            window.allQuestsData = data.quests;
            window.allMenusData = data.menus;
            window.currentMenuStatusMap = data.menuStatusMap;
            window.currentUserProfile = data.profile;
            
            if (typeof favState !== 'undefined') {
                for (let key in favState) delete favState[key];
                Object.assign(favState, data.favState);
            }
            if (typeof window.allRelatedMenus !== 'undefined') window.allRelatedMenus = data.menus;
            
            // Check current active tab to render correctly from cache
            const activeNav = document.querySelector('.top-nav .nav-link.active');
            const activeFilter = activeNav ? activeNav.getAttribute('data-filter') : 'all';
            
            applyFilters();
        } catch (e) {
            console.error('Cache parsing failed', e);
            showSkeletonLoaders();
        }
    } else {
        showSkeletonLoaders();
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

    workerPort.postMessage({ userId, token });

    workerPort.onmessage = function(e) {
        const data = e.data;
        if (!data.success) {
            console.error('Worker error:', data.error);
            return;
        }

        const { quests, menus, favState: newFavState, menuStatusMap, profile } = data;
        
        window.allQuestsData = quests;
        window.allMenusData = menus;
        window.currentMenuStatusMap = menuStatusMap;
        window.currentUserProfile = profile;

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
                quests, menus, favState: newFavState, menuStatusMap, profile
            }));
        } catch (e) {
            console.warn('Could not cache data in sessionStorage. Quota might be exceeded:', e);
        }

        // Update global variables
        if (typeof favState !== 'undefined') {
            for (let key in favState) delete favState[key];
            Object.assign(favState, newFavState);
        }
        if (typeof window.allRelatedMenus !== 'undefined') {
            window.allRelatedMenus = menus;
        }

        applyFilters();
    };

    if (typeof SharedWorker === 'undefined') {
        worker.onerror = function(error) {
            console.error('Worker failed:', error);
        };
    }
}

function renderQuests(quests) {
    const questList = document.getElementById('questList');
    if (!questList) return;
    
    // Clear the existing hardcoded quests
    questList.innerHTML = '';
    
    quests.forEach(quest => {
        const card = document.createElement('a');
        card.href = `q-detail.html?id=${quest._id}`;
        card.className = 'quest-card';
        card.setAttribute('data-name', quest.name || '');
        card.setAttribute('data-exp', quest.exp || 0);
        card.setAttribute('data-id', quest._id);
        
        const { imageUrls, highestRank } = quest.processedData || { 
            imageUrls: ['../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg'], 
            highestRank: 'bronze' 
        };

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
        
        const requiredVal = rankOrder[highestRank.toLowerCase()] || 1;
        const userVal = rankOrder[userRankStr] || 1;
        const isLocked = userVal < requiredVal;
        
        if (isLocked) {
            card.classList.add('locked');
            card.removeAttribute('href');
        }
        
        if (quest.processedData?.isQuestComplete) {
            card.classList.add('quest-complete');
        }

        const gridImages = (imageUrls || []).map(imgData => {
            const lazyAttr = imgData.menuId ? ` data-lazy-menu-id="${imgData.menuId}"` : '';
            return `<img src="${imgData.url}" alt="Quest image" loading="lazy"${lazyAttr}>`;
        }).join('');

        // We use placeholders since there's no multiple image field in DB right now
        card.innerHTML = `
            <h2 class="quest-title thaipattaya">${quest.name}</h2>
            <figure class="quest-image-grid">
                ${gridImages}
                ${isLocked ? `
                <div class="lock-overlay">
                    <i class="fa-solid fa-lock"></i><span class="rank-text">${highestRank.toUpperCase()}</span>
                </div>` : ''}
            </figure>
            <div class="quest-footer">
                <span class="exp"><i class="fa-solid fa-star"></i> ${quest.exp} EXP</span>
            </div>
        `;
        questList.appendChild(card);
    });
    
    // Call sortQuests from sort.js if it exists to sort newly loaded cards
    if (typeof sortQuests === 'function') {
        sortQuests();
    }
    
    // Apply colors after rendering is complete
    applyRankColors();

    if (typeof hydrateQuestCardImages === 'function') {
        hydrateQuestCardImages();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('questList')) {
        loadQuests();
    }
});
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