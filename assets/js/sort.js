// ฟังก์ชันสร้างระบบเรียงลำดับอิสระสำหรับแต่ละส่วน (questList, menuList)
function setupSortSystem(listId, triggerBtnId, dropdownId, nameTriggerId, nameOptionsId, nameTextId, expTriggerId, expOptionsId, expTextId) {
    const list = document.getElementById(listId);
    if (!list) return;

    const sortBtn = document.getElementById(triggerBtnId);
    if (!sortBtn || sortBtn.dataset.sortBound === 'true') return;
    sortBtn.dataset.sortBound = 'true';

    let currentSortName = 'none';
    let currentSortExp = 'none';

    const sortDropdown = document.getElementById(dropdownId);
    
    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // ปิด dropdown อื่นๆ ทั้งหมดก่อนเปิดอันนี้
            document.querySelectorAll('.sort-dropdown').forEach(d => {
                if (d !== sortDropdown) d.classList.add('hidden');
            });
            sortDropdown.classList.toggle('hidden');
        });
    }

    // ฟังก์ชันหลักในการเรียงลำดับการ์ด
    function sortList() {
        const list = document.getElementById(listId);
        if (!list) return;

        const cards = Array.from(list.querySelectorAll('.quest-card'));

        cards.sort((a, b) => {
            // เรียงตาม Name (ก-ฮ)
            if (currentSortName !== 'none') {
                const nameA = a.getAttribute('data-name') || "";
                const nameB = b.getAttribute('data-name') || "";
                if (currentSortName === 'asc') return nameA.localeCompare(nameB, 'th');
                if (currentSortName === 'desc') return nameB.localeCompare(nameA, 'th');
            }

            // เรียงตาม Exp
            if (currentSortExp !== 'none') {
                const expA = parseInt(a.getAttribute('data-exp')) || 0;
                const expB = parseInt(b.getAttribute('data-exp')) || 0;
                if (currentSortExp === 'low') return expA - expB;
                if (currentSortExp === 'high') return expB - expA;
            }
            
            return 0;
        });

        // นำการ์ดที่เรียงแล้วกลับไปใส่ใน Container
        cards.forEach(card => list.appendChild(card));
    }

    // ฟังก์ชันจัดการ Custom Dropdown
    function setupCustomSelect(triggerId, optionsId, textId, type) {
        const trigger = document.getElementById(triggerId);
        const optionsContainer = document.getElementById(optionsId);
        const textSpan = document.getElementById(textId);

        if (!trigger || !optionsContainer) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // ปิดอันอื่นก่อนเปิดอันนี้
            document.querySelectorAll('.custom-options').forEach(opt => {
                if (opt !== optionsContainer) opt.classList.add('hidden');
            });
            optionsContainer.classList.toggle('hidden');
        });

        optionsContainer.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                const text = option.innerText;
                
                textSpan.innerText = text;
                optionsContainer.classList.add('hidden');
                
                // อัปเดตสถานะตามประเภทที่เลือก
                if (type === 'name') {
                    currentSortName = value;
                    currentSortExp = 'none'; // ล้างค่าอีกฝั่งเพื่อให้เรียงแค่อย่างเดียว
                    document.getElementById(expTextId).innerText = "เลือก";
                } else if (type === 'exp') {
                    currentSortExp = value;
                    currentSortName = 'none'; // ล้างค่าอีกฝั่ง
                    document.getElementById(nameTextId).innerText = "เลือก";
                }
                
                sortList(); // เรียกฟังก์ชันเรียงลำดับ
            });
        });
    }

    setupCustomSelect(nameTriggerId, nameOptionsId, nameTextId, 'name');
    setupCustomSelect(expTriggerId, expOptionsId, expTextId, 'exp');
    
    // เผื่อให้ไฟล์อื่นสามารถเรียกใช้การจัดเรียงซ้ำได้หลังจากดึงข้อมูลเสร็จ
    window[`sort_${listId}`] = sortList;
}

// Global sort function wrapper to maintain compatibility with q-all.js calls
window.sortQuests = function() {
    if (typeof window.sort_questList === 'function') window.sort_questList();
    if (typeof window.sort_menuList === 'function') window.sort_menuList();
};

document.addEventListener('DOMContentLoaded', () => {
    // Setup for Quest List (q-all.html บน)
    setupSortSystem(
        'questList', 
        'sortBtn', 
        'sortDropdown', 
        'nameTrigger', 
        'nameOptions', 
        'current-name-text', 
        'expTrigger', 
        'expOptions', 
        'current-exp-text'
    );
    
    // Setup for Menu List (q-all.html ล่าง)
    setupSortSystem(
        'menuList', 
        'menu-sortBtn', 
        'menu-sortDropdown', 
        'menu-nameTrigger', 
        'menu-nameOptions', 
        'menu-name-text', 
        'menu-expTrigger', 
        'menu-expOptions', 
        'menu-exp-text'
    );

    // ปิด dropdown เมื่อคลิกข้างนอกพื้นที่
    window.addEventListener('click', () => {
        document.querySelectorAll('.sort-dropdown').forEach(dropdown => dropdown.classList.add('hidden'));
        document.querySelectorAll('.custom-options').forEach(opt => opt.classList.add('hidden'));
    });
});