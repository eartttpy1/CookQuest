async function requestResetOtp() {
    const identity = document.getElementById('identity-input').value.trim();

    if (!identity) {
        alert('Please enter your username or email.');
        return;
    }

    if (identity.includes('@')) {
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
        if (!gmailRegex.test(identity)) {
            alert('กรุณากรอก Gmail ที่ถูกต้อง (เช่น user@gmail.com)');
            return;
        }
    }

    try {
        const response = await axios.post('http://localhost:4000/api/forgot-password', { identity });
        alert(response.data.msg || 'If this account exists, reset OTP has been sent.');
    } catch (error) {
        const message = error.response?.data?.msg || 'Unable to send reset OTP.';
        alert(message);
    }
}

async function resetPassword() {
    const identity = document.getElementById('identity-input').value.trim();
    const otp = document.getElementById('otp-input').value.trim();
    const newPassword = document.getElementById('new-password-input').value;

    if (!identity || !otp || !newPassword) {
        alert('Please fill username/email, OTP and new password.');
        return;
    }

    try {
        const response = await axios.post('http://localhost:4000/api/reset-password', {
            identity,
            otp,
            newPassword
        });

        alert(response.data.msg || 'Password reset successful.');
        window.location.href = '/html/user/login.html';
    } catch (error) {
        const message = error.response?.data?.msg || 'Unable to reset password.';
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('new-password-input');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassword.classList.replace('fa-eye-slash', 'fa-eye');
            } else {
                passwordInput.type = 'password';
                togglePassword.classList.replace('fa-eye', 'fa-eye-slash');
            }
        });
    }
});

