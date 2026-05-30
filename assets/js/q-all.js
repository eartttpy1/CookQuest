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
    try {
        const data = JSON.parse(localStorage.getItem('user_data'));
        if (data?.user?.id) userId = data.user.id;
    } catch (e) {}
    const cacheKey = `cookquest_cache_${userId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            window.allQuestsData = data.quests;
            window.allMenusData = data.menus;
            window.currentMenuStatusMap = data.menuStatusMap;
            
            if (typeof favState !== 'undefined') {
                for (let key in favState) delete favState[key];
                Object.assign(favState, data.favState);
            }
            if (typeof allRelatedMenus !== 'undefined') allRelatedMenus = data.menus;
            
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

    const worker = new Worker('../../assets/js/worker.js');
    worker.postMessage({ userId });

    worker.onmessage = function(e) {
        const data = e.data;
        if (!data.success) {
            console.error('Worker error:', data.error);
            return;
        }

        const { quests, menus, favState: newFavState, menuStatusMap } = data;
        
        window.allQuestsData = quests;
        window.allMenusData = menus;
        window.currentMenuStatusMap = menuStatusMap;

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
                quests, menus, favState: newFavState, menuStatusMap
            }));
        } catch (e) {
            console.warn('Could not cache data in sessionStorage. Quota might be exceeded:', e);
        }

        // Update global variables
        if (typeof favState !== 'undefined') {
            for (let key in favState) delete favState[key];
            Object.assign(favState, newFavState);
        }
        if (typeof allRelatedMenus !== 'undefined') {
            allRelatedMenus = menus;
        }

        applyFilters();
    };

    worker.onerror = function(error) {
        console.error('Worker failed:', error);
    };
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
        
        // Handle lock state based on user's rank if needed, here we just show all
        const isLocked = false; 
        
        if (isLocked) {
            card.classList.add('locked');
            card.removeAttribute('href');
        }

        // Use pre-calculated data from the worker
        const { imageUrls, highestRank } = quest.processedData || { 
            imageUrls: ['../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg', '../../assets/img/emptymenu.jpg'], 
            highestRank: 'bronze' 
        };

        // We use placeholders since there's no multiple image field in DB right now
        card.innerHTML = `
            <h2 class="quest-title thaipattaya">${quest.name}</h2>
            <figure class="quest-image-grid">
                <img src="${imageUrls[0]}" alt="food">
                <img src="${imageUrls[1]}" alt="food">
                <img src="${imageUrls[2]}" alt="food">
                <img src="${imageUrls[3]}" alt="food">
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
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('questList')) {
        loadQuests();
    }
});
function getRankColor(rank) {
  switch (rank.toLowerCase()) {
    case 'bronze': return '#ffa954ff'; // ทองแดง
    case 'silver': return '#c0c0c0ff'; // เงิน
    case 'gold': return '#FFD700'; // ทอง
    case 'platinum': return '#ff25ffff'; // แพลตินัม
    case 'diamond': return '#34d0ffff'; // เพชร
    case 'master': return '#0B5091'; // ปรมาจารย์
    default: return '#fff';
  }
}
function applyRankColors() {
  const textEls = document.querySelectorAll('.rank-text'); // หรือ class ที่คุณใช้
  textEls.forEach(el => {
    const rank = el.textContent.trim();
    const color = getRankColor(rank);
    el.style.color = color;
    
    // Apply color to the lock icon as well
    const lockOverlay = el.closest('.lock-overlay');
    if (lockOverlay) {
        const lockIcon = lockOverlay.querySelector('.fa-lock');
        if (lockIcon) {
            lockIcon.style.color = color;
        }
    }
  });
}