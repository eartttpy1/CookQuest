document.addEventListener("DOMContentLoaded", () => {

  const signup = async () => {
    const btn = document.querySelector(".buttonbox button");

    try {
      const username = document.querySelector('input[name="username"]').value.trim();
      const email = document.querySelector('input[name="email"]').value.trim();
      const password = document.querySelector('input[name="password"]').value.trim();

      if (!username || !email || !password) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      if (password.length < 6) {
        alert("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }

      btn.disabled = true;
      btn.innerText = "Loading...";

      const response = await axios.post("http://localhost:4000/api/register", {
        username,
        email,
        password
      });

      console.log("Register successful:", response.data);

      // ❌ ไม่ login ตรงนี้
      localStorage.setItem("otp_email", email);

      alert("สมัครสมาชิกสำเร็จ! กรุณายืนยัน OTP");

      window.location.href = "otp.html";

    } catch (error) {
      console.error(error);

      alert(error.response?.data?.msg || "Sign up failed");

    } finally {
      btn.disabled = false;
      btn.innerText = "Sign Up";
    }
  };

  const btn = document.querySelector(".buttonbox button");
  if (btn) btn.addEventListener("click", signup);

});