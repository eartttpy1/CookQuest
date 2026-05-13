document.addEventListener("DOMContentLoaded", () => {

    const signup = async () => {
        try {
            const username = document.querySelector('input[name="username"]').value.trim();
            const email = document.querySelector('input[name="email"]').value.trim();
            const password = document.querySelector('input[name="password"]').value.trim();

            if (!username || !email || !password) {
                alert("กรุณากรอกข้อมูลให้ครบ");
                return;
            }

            // ✅ แก้ port → 5000
            const response = await axios.post("http://localhost:5000/api/auth/register", {
                username,
                email,
                password
            });

            console.log(response.data);

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("user_data", JSON.stringify(response.data.user));

            alert("สมัครสำเร็จ");
            window.location.href = "login.html";

        } catch (error) {
            console.error(error);

            const msg =
                error.response?.data?.msg ||
                "Register failed";

            alert(msg);
        }
    };

    const btn = document.querySelector(".buttonbox button");
    if (btn) btn.addEventListener("click", signup);
});