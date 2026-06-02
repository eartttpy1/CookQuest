async function requestResetOtp() {
    const identity = document.getElementById('identity-input').value.trim();

    if (!identity) {
        alert('Please enter your username or email.');
        return;
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
