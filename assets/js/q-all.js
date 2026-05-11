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
// ─── API Connection (Load Quests from Server) ───
async function loadQuests() {
    try {
        const [questsResponse, menusResponse] = await Promise.all([
            fetch('/api/quests'),
            fetch('/api/menus')
        ]);
        if (!questsResponse.ok) throw new Error('Failed to load quests');
        if (!menusResponse.ok) throw new Error('Failed to load menus');
        
        const quests = await questsResponse.json();
        const menus = await menusResponse.json();
        renderQuests(quests, menus);
    } catch (error) {
        console.error('Error fetching quests or menus:', error);
    }
}

function renderQuests(quests, menus) {
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

        // Find related menus based on questIds or matching tags (menuName)
        const relatedMenus = menus.filter(menu => {
            const hasQuestId = menu.questIds && menu.questIds.includes(quest._id.toString());
            const hasTagMatch = quest.tags && quest.tags.some(tag => tag.toLowerCase() === (menu.menuName || '').toLowerCase());
            return hasQuestId || hasTagMatch;
        });
        
        // Extract up to 4 image URLs
        const imageUrls = relatedMenus.map(m => m.imageURL).filter(url => url).slice(0, 4);
        
        // Fill remaining with placeholders if less than 4 images
        const defaultPlaceholders = [
            '../../assets/img/steak1.png',
            '../../assets/img/steak2.png',
            '../../assets/img/steak3.png',
            '../../assets/img/emptymenu.jpg'
        ];
        
        while (imageUrls.length < 4) {
            imageUrls.push(defaultPlaceholders[imageUrls.length]);
        }
        
        // Find highest rank from related menus
        const rankOrder = {
            'bronze': 1,
            'silver': 2,
            'gold': 3,
            'platinum': 4,
            'diamond': 5,
            'master': 6
        };
        
        let highestRank = 'bronze'; // default rank
        let highestRankValue = 0;
        
        relatedMenus.forEach(menu => {
            const r = (menu.rank || 'bronze').toLowerCase();
            if (rankOrder[r] && rankOrder[r] > highestRankValue) {
                highestRankValue = rankOrder[r];
                highestRank = r;
            }
        });


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