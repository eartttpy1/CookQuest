// Mock data for user's completed recipes
const mockCompletedRecipes = [
    {
        id: 1,
        name: 'สเต็กหมู',
        image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092',
        time: '45 นาที',
        xp: 200,
        isFavorite: true
    },
    {
        id: 2,
        name: 'ไก่ย่างเกาลัด',
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
        time: '30 นาที',
        xp: 150,
        isFavorite: false
    },
    {
        id: 3,
        name: 'ปลาทอดน้ำปลา',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        time: '20 นาที',
        xp: 100,
        isFavorite: true
    },
    {
        id: 4,
        name: 'ผัดไทย',
        image: 'https://images.unsplash.com/photo-1559314311-7db3814d4c4d',
        time: '25 นาที',
        xp: 120,
        isFavorite: false
    },
    {
        id: 5,
        name: 'แกงแดงไก่',
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641',
        time: '40 นาที',
        xp: 180,
        isFavorite: true
    }
];

// Level progression data - based on total XP
const levelSystem = {
    1: { rank: 'IRON Chef', minXP: 0, maxXP: 500 },
    2: { rank: 'BRONZE Chef', minXP: 501, maxXP: 1500 },
    3: { rank: 'SILVER Chef', minXP: 1501, maxXP: 3000 },
    4: { rank: 'GOLD Chef', minXP: 3001, maxXP: 5000 },
    5: { rank: 'PLATINUM Chef', minXP: 5001, maxXP: Infinity }
};

/**
 * Determine rank and tier based on total XP
 */
function getRankByXP(totalXP) {
    for (let level = 5; level >= 1; level--) {
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
        rank: 'IRON Chef',
        minXP: 0,
        maxXP: 500,
        totalXP: totalXP,
        progressInTier: totalXP,
        tierSize: 500
    };
}

// Mock user data
const mockUserData = {
    username: 'CookMaster',
    xp: 850,
    completedRecipes: 5,
    favorites: [1, 3, 5],
    badges: []
};

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

function createRecipeCard(recipe) {
    const recipeId = recipe._id ? recipe._id.toString() : '';
    const isFavorite = mockUserData.favorites.includes(recipeId);
    const menuName = recipe.requestId ? recipe.requestId.menuName : 'Unknown Menu';
    
    // Map database status to UI formatting
    let status = recipe.status || 'pending';
    let statusDisplay = status === 'approved' ? 'Complete' : (status.charAt(0).toUpperCase() + status.slice(1));
    let statusColor = status === 'approved' ? '#4CAF50' : (status === 'rejected' ? '#F44336' : '#FF9800');

    let timeStr = 'N/A';
    if (recipe.createdAt || recipe.submittedAt) {
        const date = new Date(recipe.createdAt || recipe.submittedAt);
        timeStr = date.toLocaleDateString();
    }

    return `
        <div class="recipe-card" data-recipe-id="${recipeId}">
            <div class="recipe-header">
                <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-star favorite-icon" style="cursor: pointer; color: ${isFavorite ? '#ff6b6b' : 'white'};"></i>
                <span class="thai">${menuName}</span>
            </div>
            <img src="${recipe.imageURL || 'https://via.placeholder.com/300'}" alt="${menuName}" style="object-fit: cover; height: 150px; width: 100%;">
            <div class="recipe-footer" style="display: flex; justify-content: space-between; padding-top: 10px;">
                <span style="color: ${statusColor}; font-weight: bold;">
                    <i class="fa-solid fa-${status === 'approved' ? 'circle-check' : (status === 'rejected' ? 'circle-xmark' : 'clock')}" style="margin-right: 4px;"></i>${statusDisplay}
                </span>
                <span style="font-size: 0.9rem;">
                    <i class="fa-regular fa-calendar"></i>
                    ${timeStr}
                </span>
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
        const actualCompletedCount = userHistoryData.filter(r => r.status === 'approved').length;
        document.getElementById('profile-completed').textContent = actualCompletedCount;

        if (userHistoryData.length === 0) {
            recipesContainer.innerHTML = '<p class="empty-message thai">ยังไม่มีประวัติการทำอาหาร (No completed recipes yet)</p>';
            return;
        }

        recipesContainer.innerHTML = userHistoryData
            .map(recipe => createRecipeCard(recipe))
            .join('');
        
        addFavoriteListeners();
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
    const favorites = userHistoryData.filter(recipe => mockUserData.favorites.includes(recipe._id ? recipe._id.toString() : ''));
    
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<p class="empty-message">No favorite recipes yet. Add some from your completed recipes!</p>';
        return;
    }
    
    favoritesContainer.innerHTML = favorites
        .map(recipe => createRecipeCard(recipe))
        .join('');
    
    // Add event listeners for favorite icons
    addFavoriteListeners();
}

/**
 * Add event listeners for favorite icons
 */
function addFavoriteListeners() {
    const favoriteIcons = document.querySelectorAll('.favorite-icon');
    favoriteIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            const recipeCard = e.target.closest('.recipe-card');
            const recipeId = recipeCard.dataset.recipeId;
            
            const index = mockUserData.favorites.indexOf(recipeId);
            if (index > -1) {
                mockUserData.favorites.splice(index, 1);
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
                icon.style.color = 'white';
            } else {
                mockUserData.favorites.push(recipeId);
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                icon.style.color = '#ff6b6b';
            }
            
            // Save favorites to localStorage
            saveFavoritesToStorage(mockUserData.favorites);
        });
    });
}

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
    const levelData = getRankByXP(mockUserData.xp);
    const currentLevel = levelData.level;
    const rankIds = ['rank-iron', 'rank-bronze', 'rank-silver', 'rank-gold'];
    
    rankIds.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            if (index + 1 === currentLevel) {
                element.style.backgroundColor = '#ff6a6c';
                element.style.boxShadow = '0 0 10px rgba(255, 106, 108, 0.5)';
            } else {
                element.style.backgroundColor = '';
                element.style.boxShadow = '';
            }
        }
    });
}

/**
 * Load user badges from database
 */
function loadUserBadges(badges = []) {
    const badgeList = document.getElementById('badge-list');
    if (!badgeList) return;

    badgeList.innerHTML = '';

    if (badges.length > 0) {
            // Use flexbox to group badges closer together and move slightly inward from the left
            badgeList.style.display = 'flex';
            badgeList.style.flexWrap = 'wrap';
            badgeList.style.justifyContent = 'flex-start';
            badgeList.style.gap = '20px';
            badgeList.style.paddingLeft = '5px';

        badges.forEach(badge => {
            badgeList.innerHTML += `
                <div class="badge">
                    <div class="circle" style="background: #ff6a6c; display: flex; align-items: center; justify-content: center; font-size: 24px;">${badge.icon || '🏆'}</div>
                    <p title="${badge.name}">${badge.name}</p>
                </div>
            `;
        });
    } else {
            // Keep center alignment for the empty message
            badgeList.style.display = 'grid'; // Revert back to grid for the empty message
            badgeList.style.justifyContent = 'center';
            badgeList.style.paddingLeft = '0';
        badgeList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 14px; opacity: 0.7;">Start cooking to unlock badges!</p>';
    }
}
function updateXPDisplay() {
    const levelData = getRankByXP(mockUserData.xp);
    const xpElement = document.getElementById('profile-xp');
    if (xpElement) {
        xpElement.textContent = `${levelData.totalXP}/${levelData.maxXP} XP`;
    }
    
    // Update XP progress bar if it exists
    const xpBar = document.querySelector('.xp-bar-fill');
    if (xpBar) {
        const percentage = (levelData.progressInTier / levelData.tierSize) * 100;
        xpBar.style.width = percentage + '%';
    }
}

/**
 * Load user profile data
 */
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('authToken');
        const testUser = localStorage.getItem('testUser'); // For testing with test2
        
        // Use mock data for test2
        if (testUser === 'test2') {
            mockUserData.username = 'test2';
            mockUserData.xp = 250;
            mockUserData.completedRecipes = 3;
            mockUserData.favorites = [2, 4];
        }
        
        // Try to fetch real data from API, fall back to mock data if it fails
        try {
            const response = await axios.get(
                'http://localhost:4000/api/profile',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            if (response.data) {
                mockUserData.username = response.data.username !== undefined ? response.data.username : mockUserData.username;
                mockUserData.xp = response.data.xp !== undefined ? response.data.xp : mockUserData.xp;
                mockUserData.completedRecipes = response.data.completedRecipes !== undefined ? response.data.completedRecipes : mockUserData.completedRecipes;
                mockUserData.badges = response.data.badges || [];
            }
        } catch (apiError) {
            console.log('Using mock data:', apiError.message);
        }
        
        // Load favorites from localStorage
        mockUserData.favorites = loadFavoritesFromStorage();
        
        // Get rank and level from XP
        const levelData = getRankByXP(mockUserData.xp);
        
        // Update user data
        document.getElementById('profile-username').textContent = mockUserData.username;
        document.getElementById('profile-level').textContent = `Level ${levelData.level}`;
        document.getElementById('profile-rank').textContent = levelData.rank;
        updateXPDisplay();
        document.getElementById('profile-completed').textContent = mockUserData.completedRecipes;
        
        // Load user badges directly from DB
        loadUserBadges(mockUserData.badges);

        // Highlight current rank
        highlightCurrentRank();
        
        // Load initial recipes
        loadCompletedRecipes();
        
    } catch (err) {
        console.error('Error loading profile:', err);
        // Use mock data as fallback
        mockUserData.favorites = loadFavoritesFromStorage();
        
        const levelData = getRankByXP(mockUserData.xp);
        
        document.getElementById('profile-username').textContent = mockUserData.username;
        document.getElementById('profile-level').textContent = `Level ${levelData.level}`;
        document.getElementById('profile-rank').textContent = levelData.rank;
        updateXPDisplay();
        document.getElementById('profile-completed').textContent = mockUserData.completedRecipes;
        
        highlightCurrentRank();
        loadCompletedRecipes();
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
    window.addTestXP = async (amount) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.post('http://localhost:4000/api/profile/add-xp', 
                { xpToAdd: amount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`✅ Success! DB Updated. New XP: ${res.data.user.xp} | Level: ${res.data.user.level} | Rank: ${res.data.user.rank}`);
            location.reload(); // Reload the page to see the changes immediately
        } catch (err) {
            console.error("Failed to add XP to database:", err);
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
