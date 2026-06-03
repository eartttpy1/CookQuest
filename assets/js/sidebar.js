const sidebar = document.querySelector('.sidebar');
const menubar = document.querySelector('.menu-button');
const head = document.querySelector('.head');

if (menubar && sidebar) {
    menubar.addEventListener('click', showSidebar);
}
if (head && sidebar) {
    head.addEventListener('click', hideSidebar);
}

function showSidebar() {
    sidebar.style.display = 'flex';
}
function hideSidebar() {
    sidebar.style.display = 'none';
}

function parseJwt(token) {
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;
        const payload = JSON.parse(atob(payloadBase64));
        return payload;
    } catch (error) {
        return null;
    }
}

function redirectByRole(role) {
    if (role === 'admin') {
        window.location.href = '/html/admin/admin-main.html';
    } else {
        window.location.href = '/index.html';
    }
}

function runAuthzGuard() {
    const path = window.location.pathname.toLowerCase();
    const publicUserPages = [
        '/html/user/login.html',
        '/html/user/signup.html',
        '/html/user/otp.html',
        '/html/user/about.html',
        '/html/user/forgot.html'
    ];

    const isAdminPage = path.startsWith('/html/admin/');
    const isUserPage = path.startsWith('/html/user/');
    const isPublicUserPage = publicUserPages.includes(path);

    if (!isAdminPage && (!isUserPage || isPublicUserPage)) {
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/html/user/login.html';
        return;
    }

    const payload = parseJwt(token);
    const role = payload && payload.role;
    const exp = payload && payload.exp;
    const isExpired = exp ? (Date.now() >= exp * 1000) : false;

    if (!payload || !role || isExpired) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user_data');
        window.location.href = '/html/user/login.html';
        return;
    }

    if (isAdminPage && role !== 'admin') {
        redirectByRole(role);
        return;
    }

    if (isUserPage && !isPublicUserPage && role !== 'user') {
        redirectByRole(role);
    }
}

runAuthzGuard();

// Service Worker Registration
/* COMMENTED OUT FOR DEVELOPMENT TO PREVENT CACHING ISSUES
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully with scope:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
*/