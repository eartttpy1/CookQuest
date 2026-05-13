const login = async () => {
    try {
        const username = document.querySelector('.inputbox input[name="username"]').value;
        const password = document.querySelector('.inputbox input[name="password"]').value;
        const response = await axios.post('http://localhost:3000/api/login', {
            username,
            password
        });


        // *** การจัดการ Token ที่นี่ ***
        const token = response.data.token;
        // เก็บ Token ไว้ใน Local Storage (แนะนำ)
        localStorage.setItem('authToken', token);
        
        console.log('Login successful:', response.data);
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data));

        // นำทางผู้ใช้ไปยังหน้าหลัก
        const role = response.data.user.role;

if (role === 'admin') {

    window.location.href = '/html/admin/admin-main.html';

} else {

    window.location.href = '/index.html';

}

   } catch (error) {
        // 1. ตรวจสอบว่า Backend บอกว่าต้องไปหน้า OTP หรือไม่
        if (error.response && error.response.data && error.response.data.needsOtp) {
            alert('กรุณายืนยันรหัส OTP ก่อนเข้าใช้งาน');
            
            // เก็บ email ไว้ใช้ในหน้า otp.html
            localStorage.setItem('pendingEmail', error.response.data.email);
            
            // ย้ายไปหน้า OTP
            window.location.href = 'otp.html'; 
            return; // หยุดการทำงานใน block นี้ทันที
        } 

        // 2. จัดการ Error กรณีอื่นๆ (เช่น รหัสผ่านผิด หรือ Server ล่ม)
        console.error('Login failed:', error);
        
        const errorMessage = error.response && error.response.data && error.response.data.msg 
                            ? error.response.data.msg 
                            : 'Login failed. Please check your credentials and try again.';
        alert(errorMessage);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userIconTrigger = document.getElementById('user-icon-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // --- ฟังก์ชันเช็คสถานะ Login ---
    function checkLoginStatus() {
        const token = localStorage.getItem('authToken'); // มี token = login สำเร็จ
        const user = localStorage.getItem('user_data');

        if (token && user) {
            // ถ้า Login แล้ว → ซ่อนปุ่ม Login / แสดง User Icon
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
        } else {
            // ถ้ายังไม่ Login → แสดงปุ่ม Login / ซ่อน User Icon
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    }

    // --- เปิด/ปิดเมนูโปรไฟล์ ---
    userIconTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    // --- ปิด dropdown เมื่อคลิกที่อื่น ---
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    // --- Logout ---
    logoutBtn.addEventListener('click', () => {

        // ลบข้อมูลทั้งหมด
        localStorage.removeItem('authToken');
        localStorage.removeItem('user_data');
        localStorage.removeItem('isLoggedIn');

        alert('ออกจากระบบสำเร็จ');
        // โหลดหน้าใหม่
        window.location.reload();
        window.location.href = 'login.html';
    });

    // --- เรียกครั้งแรกตอนโหลดหน้าเว็บ ---
    checkLoginStatus();
});
