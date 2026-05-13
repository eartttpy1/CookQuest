document.addEventListener("DOMContentLoaded", () => {

  // ✅ ใช้ตัวเดียวพอ
  const email = localStorage.getItem("otp_email");

  console.log("email:", email);

  const inputs = document.querySelectorAll(".otp-input input");
  const button = document.querySelector(".btn-send");

  // ❌ กันพัง
  if (!inputs.length) {
    console.error("OTP inputs not found");
    return;
  }

  if (!button) {
    console.error("Button not found");
    return;
  }

  // ✅ auto focus
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });
  });

  // ✅ send OTP
  button.addEventListener("click", async () => {

    let otp = "";

    inputs.forEach(input => {
      otp += input.value;
    });

    console.log("OTP:", otp);

    try {
      const res = await axios.post("http://localhost:4000/api/verify-otp", {
        email,
        otp
      });

      alert(res.data.msg);
      window.location.href = "login.html";

    } catch (err) {
      alert(err.response?.data?.msg || "Error");
    }
  });

});