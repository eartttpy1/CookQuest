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
        const response = await fetch('/api/quests');
        if (!response.ok) throw new Error('Failed to load quests');
        const quests = await response.json();
        renderQuests(quests);
    } catch (error) {
        console.error('Error fetching quests:', error);
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
        
        // Handle lock state based on user's rank if needed, here we just show all
        const isLocked = false; 
        
        if (isLocked) {
            card.classList.add('locked');
            card.removeAttribute('href');
        }

        // We use placeholders since there's no multiple image field in DB right now
        card.innerHTML = `
            <h2 class="quest-title thaipattaya">${quest.name}</h2>
            <figure class="quest-image-grid">
                <img src="../../assets/img/steak1.png" alt="food">
                <img src="../../assets/img/steak2.png" alt="food">
                <img src="../../assets/img/steak3.png" alt="food">
                <img src="../../assets/img/steak4.png" alt="food">
                ${isLocked ? `
                <div class="lock-overlay">
                    <i class="fa-solid fa-lock"></i><span class="rank-text">${quest.level}</span>
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
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('questList')) {
        loadQuests();
        applyRankColors();
    }
});
function getRankColor(rank) {
  switch (rank) {
    case 'BRONZE': return '#CD7F32'; // ทองแดง
    case 'SILVER': return '#C0C0C0'; // เงิน
    case 'GOLD': return '#FFD700'; // ทอง
    case 'PLATINUM': return '#E5E4E2'; // แพลตินัม
    case 'DIAMOND': return '#2574EB'; // เพชร
    case 'MASTER': return '#0B5091'; // ปรมาจารย์
    default: return '#fff';
  }
}
function applyRankColors() {
  const textEls = document.querySelectorAll('.rank-text'); // หรือ class ที่คุณใช้
  textEls.forEach(el => {
    const rank = el.textContent.toUpperCase().trim();
    const color = getRankColor(rank);
    el.style.color = color;
  });
}