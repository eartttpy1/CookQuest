// Mock data for user's completed recipes
const mockCompletedRecipes = [
    {
        id: 1,
        name: 'สเต็กหมู',
        image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092',
        time: '45 นาที',
        exp: 200,
        isFavorite: true
    },
    {
        id: 2,
        name: 'ไก่ย่างเกาลัด',
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
        time: '30 นาที',
        exp: 150,
        isFavorite: false
    },
    {
        id: 3,
        name: 'ปลาทอดน้ำปลา',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        time: '20 นาที',
        exp: 100,
        isFavorite: true
    },
    {
        id: 4,
        name: 'ผัดไทย',
        image: 'https://images.unsplash.com/photo-1559314311-7db3814d4c4d',
        time: '25 นาที',
        exp: 120,
        isFavorite: false
    },
    {
        id: 5,
        name: 'แกงแดงไก่',
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641',
        time: '40 นาที',
        exp: 180,
        isFavorite: true
    }
];

// Level progression data - based on total XP
const levelSystem = {
    1: { rank: 'BRONZE Chef', minXP: 0, maxXP: 1500 },
    2: { rank: 'SILVER Chef', minXP: 1501, maxXP: 3000 },
    3: { rank: 'GOLD Chef', minXP: 3001, maxXP: 5000 },
    4: { rank: 'PLATINUM Chef', minXP: 5001, maxXP: 8000 },
    5: { rank: 'DIAMOND Chef', minXP: 8001, maxXP: 12000 },
    6: { rank: 'MASTER Chef', minXP: 12001, maxXP: Infinity }
};

/**
 * Determine rank and tier based on total XP
 */
function getRankByXP(totalXP) {
    for (let level = 6; level >= 1; level--) {
        if (totalXP >= levelSystem[level].minXP) {
            return {
                level: level,
                rank: levelSystem[level].rank,
                minXP: levelSystem[level].minXP,
                maxXP: levelSystem[level].maxXP,
                totalXP: totalXP,
                progressInTier: totalXP - levelSystem[level].minXP,
                tierSize: levelSystem[level].maxXP - levelSystem[level].minXP
            };
        }
    }
    return {
        level: 1,
        rank: 'BRONZE Chef',
        minXP: 0,
        maxXP: 1500,
        totalXP: totalXP,
        progressInTier: totalXP,
        tierSize: 1500
    };
}

// Mock user data
const mockUserData = {
    username: 'CookMaster',
    exp: 850,
    completedRecipes: 5,
    completedQuests: [],
    favorites: [1, 3, 5],
    badges: []
};

let allMenusData = []; // Store menus to get IDs for favorites
let userHistoryData = []; // Store history data globally

/**
 * Get current level data
 */
function getCurrentLevelData(userXP) {
    return getRankByXP(userXP);
}

/**
 * Save favorites to localStorage
 */
function saveFavoritesToStorage(favorites) {
    localStorage.setItem('userFavorites', JSON.stringify(favorites));
}

/**
 * Load favorites from localStorage
 */
function loadFavoritesFromStorage() {
    const stored = localStorage.getItem('userFavorites');
    return stored ? JSON.parse(stored) : mockUserData.favorites;
}

function getMenuIdByName(menuName) {
    const menu = allMenusData.find(m => m.menuName === menuName);
    return menu && menu._id ? menu._id.toString() : '';
}

/**
 * Helper to get the resolved status of a menu by name from user history
 */
function getResolvedMenuStatus(menuName) {
    if (typeof userHistoryData === 'undefined' || !userHistoryData || userHistoryData.length === 0) {
        return '';
    }
    const subs = userHistoryData.filter(h => h.requestId && h.requestId.menuName === menuName);
    if (subs.length === 0) return '';
    
    const hasPending = subs.some(s => s.status === 'pending');
    const hasApproved = subs.some(s => s.status === 'approved');
    
    if (hasPending) {
        return 'pending';
    } else if (hasApproved) {
        return 'approved';
    } else {
        return 'rejected';
    }
}

function createRecipeCard(data, isMenu = false) {
    let menu = null;
    let status = '';
    
    if (isMenu) {
        menu = data;
        status = getResolvedMenuStatus(menu.menuName);
    } else {
        const mName = data.requestId ? data.requestId.menuName : 'Unknown Menu';
        status = getResolvedMenuStatus(mName) || data.status || '';
        menu = allMenusData.find(m => m.menuName === mName);
        if (!menu) {
            menu = {
                _id: data.requestId?._id || '',
                menuName: mName,
                imageURL: data.imageURL || '',
                EXP: 100,
                prepTime: '30 นาที',
                cookTime: '0'
            };
        }
    }
    
    const menuId = menu._id ? menu._id.toString() : '';
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
    } else {
        const lvlData = getRankByXP(mockUserData.exp);
        const cleanRank = lvlData.rank.toLowerCase();
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

    const imageUrl = menu.imageURL || '../../assets/img/emptymenu.jpg';
    const lazyAttr = menuId ? ` data-lazy-menu-id="${menuId}"` : '';
    const rankValue = requiredRank;
    const rankDisplay = rankValue.toUpperCase();
    const prepTimeStr = menu.prepTime || '0';
    const cookTimeStr = menu.cookTime || '0';
    const totalTime = (parseInt(prepTimeStr) || 0) + (parseInt(cookTimeStr) || 0);
    const timeDisplay = totalTime > 0 ? `${totalTime} นาที` : (menu.prepTime || '30 นาที');

    const isFavorited = mockUserData.favorites.includes(menuId);
    
    let statusClass = '';
    if (status === 'pending') statusClass = 'status-pending';
    else if (status === 'approved') statusClass = 'status-approved';
    else if (status === 'rejected') statusClass = 'status-rejected';

    const completedCount = (typeof userHistoryData !== 'undefined' ? userHistoryData : []).filter(
        h => h.requestId && h.requestId.menuName === menu.menuName
    ).length;

    return `
        <div class="quest-card menu-card ${statusClass} ${isLocked ? 'locked' : ''}" data-id="${menuId}" data-name="${menu.menuName}" data-exp="${menuExp}">
            <span class="quest-title-wrapper">
                <h2 class="quest-title thaipattaya">${menu.menuName}</h2>
                <i class="${isFavorited ? 'fa-solid' : 'fa-regular'} fa-star favorite-icon" style="cursor:pointer; color: white;"></i>
            </span>
            <figure class="quest-image">
                <img src="${imageUrl}" alt="${menu.menuName}" loading="lazy"${lazyAttr}>
                ${isLocked ? `
                <div class="lock-overlay">
                    <i class="fa-solid fa-lock"></i><span class="rank-label rank-text" data-rank="${rankValue}">${rankDisplay}</span>
                </div>` : ''}
            </figure>
            <div class="menu-footer">
                <span class="time"><i class="fa-solid fa-clock"></i> ${timeDisplay}</span>
                <span class="done-count" style="font-size: 0.9rem; color: #FFF3C9;"><i class="fa-solid fa-circle-check"></i> ทำแล้ว ${completedCount} ครั้ง</span>
                <span class="exp"><i class="fa-solid fa-star"></i> ${menuExp} EXP</span>
            </div>
        </div>
    `;
}

/**
 * Load and display completed recipes
 */
async function loadCompletedRecipes() {
    const recipesContainer = document.getElementById('recipes-container');
    recipesContainer.innerHTML = '<p class="empty-message thai">Loading...</p>';
    
    try {
        const userDataStr = localStorage.getItem('user_data');
        if (!userDataStr) {
            recipesContainer.innerHTML = '<p class="empty-message thai">กรุณาเข้าสู่ระบบเพื่อดูประวัติการทำอาหาร</p>';
            return;
        }
        const userData = JSON.parse(userDataStr);
        const userId = userData.user.id;

        // Fetch user's real quest history
        const response = await axios.get(`http://localhost:4000/api/history?userId=${userId}`);
        userHistoryData = response.data || [];

        // Sync exact completed count dynamically from actual history 
        const actualCompletedCount = userHistoryData.length;
        document.getElementById('profile-completed').textContent = actualCompletedCount;

        if (userHistoryData.length === 0) {
            recipesContainer.innerHTML = '<p class="empty-message thai">ยังไม่มีประวัติการทำอาหาร (No completed recipes yet)</p>';
            return;
        }

        // Group history by menuName to show only one card per menu
        const uniqueHistoryMap = new Map();
        userHistoryData.forEach(recipe => {
            const mName = recipe.requestId ? recipe.requestId.menuName : 'Unknown Menu';
            const existing = uniqueHistoryMap.get(mName);
            if (!existing) {
                uniqueHistoryMap.set(mName, recipe);
            } else {
                const statusPriority = { 'approved': 3, 'pending': 2, 'rejected': 1 };
                const currentPri = statusPriority[recipe.status] || 0;
                const existingPri = statusPriority[existing.status] || 0;
                if (currentPri > existingPri) {
                    uniqueHistoryMap.set(mName, recipe);
                } else if (currentPri === existingPri) {
                    const dateA = new Date(recipe.submittedAt || recipe.createdAt);
                    const dateB = new Date(existing.submittedAt || existing.createdAt);
                    if (dateA > dateB) {
                        uniqueHistoryMap.set(mName, recipe);
                    }
                }
            }
        });
        
        // Override status of each card with the resolved status
        uniqueHistoryMap.forEach((recipe, mName) => {
            recipe.status = getResolvedMenuStatus(mName);
        });
        
        const uniqueHistory = Array.from(uniqueHistoryMap.values());

        recipesContainer.innerHTML = uniqueHistory
            .map(recipe => createRecipeCard(recipe))
            .join('');
        applyRankColors();
        if (typeof setupLazyMenuImages === 'function') {
            setupLazyMenuImages(recipesContainer);
        }
    } catch (err) {
        console.error('Error fetching recipes:', err);
        recipesContainer.innerHTML = '<p class="empty-message thai">เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติการทำอาหาร</p>';
    }
}

/**
 * Load and display favorite recipes
 */
function loadFavoriteRecipes() {
    const favoritesContainer = document.getElementById('favorites-container');
    const favorites = allMenusData.filter(menu => {
        return menu._id && mockUserData.favorites.includes(menu._id.toString());
    });
    
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<p class="empty-message">No favorite recipes yet. Add some from the quest page!</p>';
        return;
    }
    
    favoritesContainer.innerHTML = favorites
        .map(menu => createRecipeCard(menu, true))
        .join('');
    applyRankColors();
    if (typeof setupLazyMenuImages === 'function') {
        setupLazyMenuImages(favoritesContainer);
    }
}

// Global event delegation for favorite icons in profile
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('favorite-icon')) {
        const icon = e.target;
        const recipeCard = icon.closest('.quest-card.menu-card');
        if (!recipeCard) return;
        const menuId = recipeCard.dataset.id;
        
        if (!menuId) {
            alert('ไม่สามารถเพิ่มรายการโปรดได้ เนื่องจากไม่พบข้อมูลเมนู');
            return;
        }
        
        // Prevent double clicking to avoid E11000 duplicate key errors
        if (icon.classList.contains('is-loading')) return;
        icon.classList.add('is-loading');
        
        const userDataStr = localStorage.getItem('user_data');
        let userId = 'user123';
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData?.user?.id) userId = userData.user.id;
        }
        
        try {
            const res = await axios.post('http://localhost:4000/api/favorites/toggle', {
                userId,
                menuId
            });
            
            const index = mockUserData.favorites.indexOf(menuId);
            const isNowFavorite = index === -1;
            
            if (isNowFavorite) {
                mockUserData.favorites.push(menuId);
            } else {
                mockUserData.favorites.splice(index, 1);
            }
            saveFavoritesToStorage(mockUserData.favorites);
            
            // Update ALL matching icons on the page
            document.querySelectorAll(`.quest-card.menu-card[data-id="${menuId}"] .favorite-icon`).forEach(otherIcon => {
                if (isNowFavorite) {
                    otherIcon.classList.remove('fa-regular');
                    otherIcon.classList.add('fa-solid');
                    otherIcon.style.color = 'white';
                } else {
                    otherIcon.classList.remove('fa-solid');
                    otherIcon.classList.add('fa-regular');
                    otherIcon.style.color = 'white';
                }
            });
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            icon.classList.remove('is-loading');
        }
    }
});

/**
 * Initialize tab switching
 */
function initTabSwitching() {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabItems.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            item.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Reload content based on active tab
            if (tabName === 'recipes') {
                loadCompletedRecipes();
            } else if (tabName === 'favorites') {
                loadFavoriteRecipes();
            }
        });
    });
}

/**
 * Highlight current rank in level system
 */
function highlightCurrentRank() {
    const levelData = getRankByXP(mockUserData.exp);
    const currentLevel = levelData.level;
    const rankIds = ['rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum', 'rank-diamond', 'rank-master'];
    
    rankIds.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            if (index + 1 === currentLevel) {
                element.style.boxShadow = '0 0 12px rgba(229, 115, 115, 0.8)';
                element.style.border = '2px solid #e57373';
            } else {
                element.style.boxShadow = '';
                element.style.border = '';
            }
        }
    });
}

/**
 * Load user badges from database
 */
function loadUserBadges() {
    const badgeList = document.getElementById('badge-list');
    if (!badgeList) return;

    badgeList.innerHTML = '';

    const profile = {
        level: getRankByXP(mockUserData.exp).level,
        badges: mockUserData.badges || []
    };
    
    const historyData = typeof userHistoryData !== 'undefined' ? userHistoryData : [];
    const approvedDishes = historyData.filter(item => item.status === 'approved');

    let evaluatedBadges = [];
    
    // Use the shared badge-logic if loaded, otherwise fallback to exact replica
    if (typeof window.evaluateBadges === 'function') {
        evaluatedBadges = window.evaluateBadges(profile, historyData, approvedDishes);
        if (typeof window.syncNewBadges === 'function') {
            window.syncNewBadges(evaluatedBadges);
        }
    } else {
        const lvl = profile.level || 1;
        const earnedBadges = profile.badges || [];
        
        let maxStreak = 0, currentStreak = 0, lastDate = null;
        const uniqueDays = [...new Set(approvedDishes.map(d => new Date(d.submittedAt || d.createdAt).setHours(0,0,0,0)))].sort();
        uniqueDays.forEach(day => {
            if (lastDate && day - lastDate === 86400000) currentStreak++;
            else currentStreak = 1;
            maxStreak = Math.max(maxStreak, currentStreak);
            lastDate = day;
        });

        const healthyCount = approvedDishes.filter(d => {
            const menuName = d.requestId?.menuName || '';
            const menu = allMenusData.find(m => m.menuName === menuName);
            const tags = menu?.tags || [];
            return tags.some(t => typeof t === 'string' && (t.includes('สลัด') || t.includes('ผัก') || t.includes('คลีน')));
        }).length;

        const ALL_BADGES = [
            { name: 'Master Chef', icon: '👨‍🍳', desc: 'Reach Level 5 (Platinum Chef)', logicUnlocked: lvl >= 5 },
            { name: 'First Blood', icon: '🔪', desc: 'Complete your first cooking quest', logicUnlocked: approvedDishes.length > 0 },
            { name: 'Star Baker', icon: '⭐', desc: 'Get a 5-star taste rating on a quest', logicUnlocked: historyData.some(dish => dish.tasteRating === 5) },
            { name: 'Fire Starter', icon: '🔥', desc: 'Maintain a 3-day cooking streak', logicUnlocked: maxStreak >= 3 },
            { name: 'Healthy Eats', icon: '🥗', desc: 'Cook 5 healthy meals (Salad/Veg)', logicUnlocked: healthyCount >= 5 }
        ];

        evaluatedBadges = ALL_BADGES.map(badgeDef => {
            const inDB = earnedBadges.some(b => b.name === badgeDef.name || b.icon === badgeDef.icon);
            const isUnlocked = badgeDef.logicUnlocked || inDB;
            
            if (badgeDef.logicUnlocked && !inDB) {
                const token = localStorage.getItem('authToken');
                if (token && typeof axios !== 'undefined') {
                    axios.post('http://localhost:4000/api/profile/add-badge', 
                        { badgeName: badgeDef.name, badgeIcon: badgeDef.icon },
                        { headers: { Authorization: `Bearer ${token}` } }
                    ).catch(e => console.error(e));
                }
            }
            
            return { ...badgeDef, isUnlocked };
        });
    }

    badgeList.style.display = 'flex';
    badgeList.style.flexWrap = 'nowrap';
    badgeList.style.justifyContent = 'flex-start';
    badgeList.style.gap = '20px';
    badgeList.style.paddingLeft = '5px';
    badgeList.style.overflowX = 'auto';
    badgeList.style.paddingBottom = '10px';

    evaluatedBadges.forEach(badgeDef => {
        const filterStyle = badgeDef.isUnlocked ? '' : 'filter: grayscale(100%) opacity(40%);';
        const bgStyle = badgeDef.isUnlocked ? 'background: linear-gradient(135deg, #d32f2f, #9e0002); color: white;' : 'background: #444; color: #888;';
        const title = badgeDef.isUnlocked ? badgeDef.name : `Locked: ${badgeDef.name}\n${badgeDef.desc}`;

        badgeList.innerHTML += `
            <div class="badge" style="display: flex; flex-direction: column; align-items: center; ${filterStyle} transition: all 0.3s ease;">
                <div class="circle ${badgeDef.isUnlocked ? 'unlocked-badge' : ''}" title="${title}" style="${bgStyle} display: flex; align-items: center; justify-content: center; font-size: 24px; width: 50px; height: 50px; border-radius: 50%;">
                    ${badgeDef.icon}
                </div>
                <p title="${title}" style="text-align: center; margin-top: 5px; font-size: 12px; white-space: nowrap;">${badgeDef.name}</p>
            </div>
        `;
    });
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

function showProfileSkeleton() {
    const recipesContainer = document.getElementById('recipes-container');
    if (recipesContainer) {
        recipesContainer.innerHTML = `
            <div class="recipe-card skeleton-card">
                <div class="recipe-header" style="padding: 10px; display: flex; gap: 10px;">
                    <div class="skeleton-bg" style="height: 20px; width: 20px; border-radius: 50%;"></div>
                    <div class="skeleton-bg" style="height: 20px; width: 60%; border-radius: 4px;"></div>
                </div>
                <div class="skeleton-bg-main" style="height: 150px; width: 100%;"></div>
                <div class="recipe-footer" style="display: flex; justify-content: space-between; padding: 10px;">
                    <div class="skeleton-bg" style="height: 15px; width: 40%; border-radius: 4px;"></div>
                    <div class="skeleton-bg" style="height: 15px; width: 30%; border-radius: 4px;"></div>
                </div>
            </div>
        `.repeat(3);
    }
}

function updateXPDisplay() {
    const levelData = getRankByXP(mockUserData.exp);
    const xpElement = document.getElementById('profile-xp');
    if (xpElement) {
        const maxDisplay = levelData.maxXP === Infinity ? 'MAX' : levelData.maxXP;
        xpElement.textContent = `${levelData.totalXP}/${maxDisplay} EXP`;
    }
    
    // Update XP progress bar if it exists
    const xpBar = document.querySelector('.xp-bar-fill');
    if (xpBar) {
        const percentage = levelData.tierSize === Infinity ? 100 : (levelData.progressInTier / levelData.tierSize) * 100;
        xpBar.style.width = percentage + '%';
    }
}

/**
 * Load user profile data
 */
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('user_data');
        let userId = 'user123';
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData?.user?.id) userId = userData.user.id;
        }
        
        const testUser = localStorage.getItem('testUser'); // For testing with test2
        
        // Use mock data for test2
        if (testUser === 'test2') {
            mockUserData.username = 'test2';
            mockUserData.exp = 250;
            mockUserData.completedRecipes = 3;
            mockUserData.favorites = [2, 4];
        }
        
        const cacheKey = `cookquest_profile_${userId}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        const renderAll = () => {
            const levelData = getRankByXP(mockUserData.exp);
            
            const nameEl = document.getElementById('profile-username');
            if (nameEl) nameEl.textContent = mockUserData.username;
            const lvlEl = document.getElementById('profile-level');
            if (lvlEl) lvlEl.textContent = `Level ${levelData.level}`;
            const rankEl = document.getElementById('profile-rank');
            if (rankEl) rankEl.textContent = levelData.rank;
            
            updateXPDisplay();
            const actualCompletedCount = (userHistoryData || []).length;
            const compEl = document.getElementById('profile-completed');
            if (compEl) compEl.textContent = actualCompletedCount;
            const questsCompEl = document.getElementById('profile-quests-completed');
            if (questsCompEl) questsCompEl.textContent = (mockUserData.completedQuests || []).length;
            
            highlightCurrentRank();
            
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab && activeTab.dataset.tab === 'favorites') {
                loadFavoriteRecipes();
            } else {
                loadCompletedRecipes();
            }
            
            loadUserBadges();
        };
        
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                allMenusData = parsed.menus || [];
                window.allRelatedMenus = parsed.menus || [];
                userHistoryData = parsed.history || [];
                Object.assign(mockUserData, parsed.profile || {});
                mockUserData.favorites = parsed.favorites || [];
                renderAll();
            } catch (e) {
                console.error('Cache parsing failed', e);
                showProfileSkeleton();
            }
        } else {
            showProfileSkeleton();
        }
        
        if (!window.Worker) {
            console.warn('Web Workers are not supported in this browser.');
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

        workerPort.postMessage({ userId, token });

        workerPort.onmessage = function(e) {
            const data = e.data;
            if (!data.success) {
                console.error('Worker error:', data.error);
                return;
            }

            if (data.menus) {
                allMenusData = data.menus;
                window.allRelatedMenus = data.menus;
            }
            if (data.history) userHistoryData = data.history;

            if (data.profile) {
                const pData = data.profile;
                mockUserData.username = pData.username !== undefined ? pData.username : mockUserData.username;
                mockUserData.exp = pData.exp !== undefined ? pData.exp : mockUserData.exp;
                mockUserData.completedRecipes = pData.completedRecipes !== undefined ? pData.completedRecipes : mockUserData.completedRecipes;
                mockUserData.completedQuests = pData.completedQuests || [];
                mockUserData.badges = pData.badges || [];
                window.currentUserProfile = pData;
            }

            if (data.favState) {
                mockUserData.favorites = Object.keys(data.favState);
                saveFavoritesToStorage(mockUserData.favorites);
            }

            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    menus: allMenusData,
                    history: userHistoryData,
                    profile: mockUserData,
                    favorites: mockUserData.favorites
                }));
            } catch (e) {
                console.warn('Quota might be exceeded for sessionStorage:', e);
            }
            
            renderAll();
        };

        // Initialize Socket.io connection on profile page
        const socket = typeof io !== 'undefined' ? io('http://localhost:4000') : null;
        if (socket) {
            socket.on('status_updated', async (data) => {
                sessionStorage.removeItem(cacheKey);
                sessionStorage.removeItem(`cookquest_cache_${userId}`);
                await loadUserProfile();
            });
            socket.on('new_submission', async (data) => {
                sessionStorage.removeItem(cacheKey);
                sessionStorage.removeItem(`cookquest_cache_${userId}`);
                await loadUserProfile();
            });
        }

        if (typeof SharedWorker === 'undefined') {
            worker.onerror = function(error) {
                console.error('Worker failed:', error);
            };
        }
        
    } catch (err) {
        console.error('Error loading profile:', err);
        if (typeof renderAll === 'function' && !sessionStorage.getItem(`cookquest_profile_${userId}`)) {
            mockUserData.favorites = loadFavoritesFromStorage();
            renderAll();
        }
    }
}

/**
 * Initialize everything when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    initTabSwitching();
    
    // Allow testing with different users via console
    window.switchUser = (username) => {
        if (username === 'test2') {
            localStorage.setItem('testUser', 'test2');
            console.log('Switched to test2 user. Refreshing page...');
            location.reload();
        } else {
            localStorage.removeItem('testUser');
            console.log('Switched to CookMaster user. Refreshing page...');
            location.reload();
        }
    };

    // Test function for adding XP and syncing to database
    window.addTestExp = async (amount) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.post('http://localhost:4000/api/profile/add-exp', 
                { expToAdd: amount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`✅ Success! DB Updated. New EXP: ${res.data.user.exp} | Level: ${res.data.user.level} | Rank: ${res.data.user.rank}`);
            location.reload(); // Reload the page to see the changes immediately
        } catch (err) {
            console.error("Failed to add EXP to database:", err);
        }
    };

    // Test function for adding Badges and syncing to database
    window.addTestBadge = async (name = 'Master Chef', icon = '👨‍🍳') => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.post('http://localhost:4000/api/profile/add-badge', 
                { badgeName: name, badgeIcon: icon },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`✅ Success! Badge Added:`, res.data.user.badges);
            location.reload(); 
        } catch (err) {
            console.error("Failed to add badge:", err.response?.data?.msg || err);
        }
    };
});
