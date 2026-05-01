const questList = document.getElementById('questList');
const sortName = document.getElementById('sortName');
const sortExp = document.getElementById('sortExp');
const sortBtn = document.getElementById('sortBtn');
const sortDropdown = document.getElementById('sortDropdown');

// 1. กดปุ่มเพื่อ เปิด/ปิด Dropdown
sortBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // กันไม่ให้ event ไหลไปที่ window
    sortDropdown.classList.toggle('hidden');
});

// 2. ถ้ากดที่อื่นในหน้าจอ ให้ปิด Dropdown อัตโนมัติ
window.addEventListener('click', (e) => {
    if (!sortDropdown.contains(e.target) && e.target !== sortBtn) {
        sortDropdown.classList.add('hidden');
    }
});

// ป้องกันไม่ให้การกดเลือกข้างใน Dropdown (เช่น เลือก Name/Exp) แล้วเมนูปิดตัวลง
sortDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});

function sortQuests() {
    // แปลง NodeList เป็น Array เพื่อใช้ฟังก์ชัน sort()
    const cards = Array.from(questList.querySelectorAll('.quest-card'));

    cards.sort((a, b) => {
        // 1. เรียงตาม Name (ก-ฮ)
        if (sortName.value !== 'none') {
            const nameA = a.getAttribute('data-name');
            const nameB = b.getAttribute('data-name');
            if (sortName.value === 'asc') return nameA.localeCompare(nameB, 'th');
            if (sortName.value === 'desc') return nameB.localeCompare(nameA, 'th');
        }

        // 2. เรียงตาม Exp
        if (sortExp.value !== 'none') {
            const expA = parseInt(a.getAttribute('data-exp'));
            const expB = parseInt(b.getAttribute('data-exp'));
            if (sortExp.value === 'low') return expA - expB;
            if (sortExp.value === 'high') return expB - expA;
        }
        
        return 0;
    });

    // นำการ์ดที่เรียงแล้วกลับไปใส่ใน Container
    cards.forEach(card => questList.appendChild(card));
}

// ใส่ Event Listener เมื่อมีการเปลี่ยนค่าใน Select
sortName.addEventListener('change', () => {
    sortExp.value = 'none'; // ล้างค่าอีกฝั่งเพื่อไม่ให้ตีกัน
    sortQuests();
});

sortExp.addEventListener('change', () => {
    sortName.value = 'none'; // ล้างค่าอีกฝั่งเพื่อไม่ให้ตีกัน
    sortQuests();
});