// 1. กำหนดตัวแปรสำหรับเก็บสถานะการเลือกปัจจุบัน
let currentSortName = 'none';
let currentSortExp = 'none';

// 2. ฟังก์ชันจัดการ Custom Dropdown (อัปเดตให้เรียกใช้ sortQuests ได้ถูกต้อง)
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
                document.getElementById('current-exp-text').innerText = "เลือก";
            } else if (type === 'exp') {
                currentSortExp = value;
                currentSortName = 'none'; // ล้างค่าอีกฝั่ง
                document.getElementById('current-name-text').innerText = "เลือก";
            }
            
            sortQuests(); // เรียกฟังก์ชันเรียงลำดับ
        });
    });
}

// 3. ฟังก์ชันหลักในการเรียงลำดับการ์ดเควส
function sortQuests() {
    const questList = document.getElementById('questList');
    if (!questList) return;

    // แปลง NodeList เป็น Array เพื่อใช้ฟังก์ชัน sort()
    const cards = Array.from(questList.querySelectorAll('.quest-card'));

    cards.sort((a, b) => {
        // เรียงตาม Name (ก-ฮ)[cite: 2]
        if (currentSortName !== 'none') {
            const nameA = a.getAttribute('data-name') || "";
            const nameB = b.getAttribute('data-name') || "";
            if (currentSortName === 'asc') return nameA.localeCompare(nameB, 'th');
            if (currentSortName === 'desc') return nameB.localeCompare(nameA, 'th');
        }

        // เรียงตาม Exp[cite: 2]
        if (currentSortExp !== 'none') {
            const expA = parseInt(a.getAttribute('data-exp')) || 0;
            const expB = parseInt(b.getAttribute('data-exp')) || 0;
            if (currentSortExp === 'low') return expA - expB;
            if (currentSortExp === 'high') return expB - expA;
        }
        
        return 0;
    });

    // นำการ์ดที่เรียงแล้วกลับไปใส่ใน Container[cite: 2]
    cards.forEach(card => questList.appendChild(card));
}

// 4. เริ่มต้นการทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    // ตั้งค่าปุ่มเปิด-ปิดเมนูหลัก[cite: 2]
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');

    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('hidden');
        });
    }

    // ตั้งค่า Custom Dropdown สำหรับ Name และ Exp[cite: 2, 3]
    setupCustomSelect('nameTrigger', 'nameOptions', 'current-name-text', 'name');
    setupCustomSelect('expTrigger', 'expOptions', 'current-exp-text', 'exp');

    // ปิด dropdown เมื่อคลิกข้างนอกพื้นที่[cite: 2]
    window.addEventListener('click', () => {
        if (sortDropdown) sortDropdown.classList.add('hidden');
        document.querySelectorAll('.custom-options').forEach(opt => opt.classList.add('hidden'));
    });
});