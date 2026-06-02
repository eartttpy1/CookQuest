const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const editButtons = document.querySelectorAll(".btn-edit");

const completeCard = document.querySelectorAll(".card .number")[0];
const pendingCard = document.querySelectorAll(".card .number")[1];

const token = localStorage.getItem("authToken");

if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    window.location.href = "login.html";
}

function authFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
}

// ================== LOAD PROFILE ==================
async function loadProfile() {
    const res = await authFetch("http://localhost:4000/api/profile");
    const data = await res.json();

    usernameInput.value = data.username;
    emailInput.value = data.email;
}

// ================== UPDATE PROFILE ==================
async function updateProfile(field, value, emailOtp = null) {
    const res = await authFetch("http://localhost:4000/api/profile", {
        method: "PUT",
        body: JSON.stringify({
            username: field === "username" ? value : usernameInput.value,
            email: field === "email" ? value : emailInput.value,
            otp: emailOtp
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.msg || "อัปเดตข้อมูลไม่สำเร็จ");
        return false;
    }

    if (data.status === 'OTP_SENT') {
        alert(data.msg);
        return 'OTP_SENT';
    }

    alert("บันทึกสำเร็จ");
    loadProfile();
    return true;
}

// =============== ENABLE EDIT BUTTONS ===============
editButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const target = btn.dataset.target;
        if (!target) return; // Skip if it's the change password button

        const input = document.getElementById(target);

        if (input.readOnly) {
            input.readOnly = false;
            input.focus();
            btn.textContent = "Save";
        } else {
            if (target === "email") {
                const result = await updateProfile(target, input.value);
                if (result === 'OTP_SENT') {
                    // Keep input editable, show inline OTP container
                    const otpContainer = document.getElementById("email-otp-container");
                    if (otpContainer) {
                        otpContainer.classList.remove("hidden");
                    }
                    btn.textContent = "Save";
                } else if (result === true) {
                    input.readOnly = true;
                    btn.textContent = "Edit";
                    const otpContainer = document.getElementById("email-otp-container");
                    if (otpContainer) {
                        otpContainer.classList.add("hidden");
                        const otpInput = document.getElementById("email-otp");
                        if (otpInput) otpInput.value = "";
                    }
                }
            } else {
                const result = await updateProfile(target, input.value);
                if (result === true) {
                    input.readOnly = true;
                    btn.textContent = "Edit";
                }
            }
        }
    });
});

// ==================== EMAIL OTP CONFIRMATION ======================
const btnConfirmEmailOtp = document.getElementById("btn-confirm-email-otp");
const emailOtpInput = document.getElementById("email-otp");

if (btnConfirmEmailOtp) {
    btnConfirmEmailOtp.addEventListener("click", async (e) => {
        e.preventDefault();
        const otpValue = emailOtpInput.value.trim();
        if (!otpValue) {
            alert("กรุณากรอก OTP");
            return;
        }

        const result = await updateProfile("email", emailInput.value, otpValue);
        if (result === true) {
            emailInput.readOnly = true;
            const emailEditBtn = document.querySelector('.btn-edit[data-target="email"]');
            if (emailEditBtn) {
                emailEditBtn.textContent = "Edit";
            }
            const otpContainer = document.getElementById("email-otp-container");
            if (otpContainer) {
                otpContainer.classList.add("hidden");
                emailOtpInput.value = "";
            }
        }
    });
}

// ==================== PASSWORD CHANGE FLOW ========================
const btnChangePassword = document.getElementById("btn-change-password");
const passwordChangeFields = document.getElementById("password-change-fields");
const newPasswordInput = document.getElementById("new-password");
const toggleNewPassword = document.getElementById("toggle-new-password");
const passwordOtpInput = document.getElementById("password-otp");
const btnSendOtp = document.getElementById("btn-send-otp");
const btnSubmitPassword = document.getElementById("btn-submit-password");
const btnCancelPassword = document.getElementById("btn-cancel-password");

if (toggleNewPassword && newPasswordInput) {
    toggleNewPassword.addEventListener("click", () => {
        if (newPasswordInput.type === "password") {
            newPasswordInput.type = "text";
            toggleNewPassword.classList.replace("fa-eye-slash", "fa-eye");
        } else {
            newPasswordInput.type = "password";
            toggleNewPassword.classList.replace("fa-eye", "fa-eye-slash");
        }
    });
}

if (btnChangePassword && passwordChangeFields) {
    btnChangePassword.addEventListener("click", (e) => {
        e.preventDefault();
        passwordChangeFields.classList.toggle("hidden");
    });
}

if (btnCancelPassword && passwordChangeFields) {
    btnCancelPassword.addEventListener("click", (e) => {
        e.preventDefault();
        passwordChangeFields.classList.add("hidden");
        newPasswordInput.value = "";
        passwordOtpInput.value = "";
    });
}

let countdownTimer;
if (btnSendOtp) {
    btnSendOtp.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) {
            alert("กรุณาระบุอีเมลก่อนขอรับ OTP");
            return;
        }
        btnSendOtp.disabled = true;
        btnSendOtp.textContent = "กำลังส่ง...";
        try {
            const res = await fetch("http://localhost:4000/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ identity: email })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.msg || "ส่ง OTP สำเร็จแล้ว กรุณาตรวจสอบอีเมลของคุณ");
                let seconds = 60;
                btnSendOtp.textContent = `ส่งอีกครั้งใน (${seconds}s)`;
                countdownTimer = setInterval(() => {
                    seconds--;
                    if (seconds <= 0) {
                        clearInterval(countdownTimer);
                        btnSendOtp.disabled = false;
                        btnSendOtp.textContent = "Send OTP";
                    } else {
                        btnSendOtp.textContent = `ส่งอีกครั้งใน (${seconds}s)`;
                    }
                }, 1000);
            } else {
                alert(data.msg || "เกิดข้อผิดพลาดในการส่ง OTP");
                btnSendOtp.disabled = false;
                btnSendOtp.textContent = "Send OTP";
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการส่ง OTP");
            btnSendOtp.disabled = false;
            btnSendOtp.textContent = "Send OTP";
        }
    });
}

if (btnSubmitPassword) {
    btnSubmitPassword.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const newPassword = newPasswordInput.value;
        const otp = passwordOtpInput.value.trim();

        if (!newPassword || newPassword.length < 6) {
            alert("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
            return;
        }
        if (!otp) {
            alert("กรุณากรอกรหัส OTP");
            return;
        }

        try {
            const res = await fetch("http://localhost:4000/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identity: email,
                    otp: otp,
                    newPassword: newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert("เปลี่ยนรหัสผ่านสำเร็จแล้ว!");
                newPasswordInput.value = "";
                passwordOtpInput.value = "";
                passwordChangeFields.classList.add("hidden");
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                }
                btnSendOtp.disabled = false;
                btnSendOtp.textContent = "Send OTP";
            } else {
                alert(data.msg || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
        }
    });
}

// ==================== INIT ========================
loadProfile();
