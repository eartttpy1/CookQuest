const sidebar = document.querySelector('.sidebar');
const menubar = document.querySelector('.menu-button');
const head = document.querySelector('.head');


menubar.addEventListener('click',showSidebar);
head.addEventListener('click',hideSidebar);

function showSidebar(){
    sidebar.style.display = 'flex'
}
function hideSidebar(){
    sidebar.style.display = 'none'
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully with scope:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}