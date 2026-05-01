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
// favorite star toggle
const questContainer = document.querySelector('.quest-section');

questContainer.addEventListener('click', function(e) {
    // ตรวจสอบว่าสิ่งที่คลิกคือไอคอนดาวหรือไม่ (เช็คจาก class)
    if (e.target.classList.contains('fa-star')) {
        const star = e.target;
        
        // สลับคลาสระหว่างดาวโปร่งและดาวทึบ
        if (star.classList.contains('fa-regular')) {
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid');
            star.style.color = "#ffffff"; // เปลี่ยนเป็นสีทองเมื่อกด (ถ้าต้องการ)
        } else {
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
            star.style.color = ""; // คืนค่าสีเดิม
        }
    }
});