const login = async () => {
  // 1. ดึงค่าจาก input (ใช้ชื่อ username ให้ตรงกับที่จะส่ง)
  const username = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username, // ส่งตัวแปร username
        password,
      }),
    });

    const data = await res.json();
    console.log(data);

    if (data.user) {
      alert("Login success");
      // 2. เก็บข้อมูลผู้ใช้ลง LocalStorage
      localStorage.setItem('user_data', JSON.stringify(data.user));
      // 3. ไปที่หน้าแรกหลังจาก login สำเร็จ
      window.location.href = "../../index.html";
    } else {
      alert(data.msg || "Login failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("เชื่อมต่อ Server ไม่ได้");
  }
};

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userIconTrigger = document.getElementById('user-icon-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    function checkLoginStatus() {
        const user = localStorage.getItem('user_data');

        if (user) {
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    }

    userIconTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user_data');
        alert('ออกจากระบบสำเร็จ');
        window.location.href = 'login.html'; // ✅ FIX
    });

    checkLoginStatus();
});