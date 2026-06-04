// category-init.js - Handles rendering menus matching a specific category/tag

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryType = urlParams.get('type');

    // Map category type to Thai category name
    const categoryMap = {
        'egg': 'เมนูไข่', 'chicken': 'เมนูไก่', 'pork': 'เมนูหมู', 'duck': 'เมนูเป็ด',
        'beef': 'เมนูเนื้อวัว', 'sausage': 'เมนูไส้กรอก', 'bacon': 'เมนูเบคอน',
        'seafood': 'เมนูอาหารทะเล', 'noodle-material': 'เมนูเส้น', 'mushroom': 'เมนูเห็ด',
        'tofu': 'เมนูเต้าหู้', 'rice': 'เมนูข้าว', 'vegetable': 'เมนูผัก', 'fruit': 'เมนูผลไม้',
        'breakfast': 'เมนูอาหารเช้า', 'single-dish': 'เมนูอาหารจานเดียว',
        'appetizer': 'เมนูกับแกล้ม/อาหารว่าง', 'vegetarian': 'เมนูมังสวิรัติ',
        'thai': 'เมนูอาหารไทย', 'north-thai': 'เมนูอาหารเหนือ', 'isaan': 'เมนูอาหารอีสาน',
        'south-thai': 'เมนูอาหารใต้', 'japanese': 'เมนูอาหารญี่ปุ่น',
        'chinese': 'เมนูอาหารจีน', 'korean': 'เมนูอาหารเกาหลี', 'western': 'เมนูอาหารฝรั่ง',
        'italian': 'เมนูอาหารอิตาเลียน', 'steak': 'เมนูสเต๊ก', 'curry': 'เมนูแกง',
        'dipping-sauce': 'สูตรน้ำจิ้ม', 'fusion': 'เมนูอาหารฟิวชัน', 'soup': 'เมนูซุป',
        'international': 'อาหารนานาชาติ', 'sandwich': 'เมนูแซนด์วิช',
        'dinner': 'เมนูอาหารเย็น', 'chili-paste': 'เมนูน้ำพริก', 'side-dish': 'เมนูกับข้าว',
        'noodle': 'เมนูก๋วยเตี๋ยว', 'microwave': 'เมนูไมโครเวฟ', 'boil': 'เมนูต้ม',
        'stir-fry': 'เมนูผัด', 'fry': 'เมนูทอด', 'bake': 'เมนูอบ', 'steam': 'เมนูนึ่ง',
        'spicy-salad': 'เมนูยำ', 'grill': 'เมนูย่าง', 'air-fryer': 'เมนูหม้ออบลมร้อน',
        'rice-cooker': 'เมนูหม้อหุงข้าว', 'ice-cream': 'เมนูไอศกรีม',
        'thai-dessert': 'เมนูขนมไทย', 'bakery': 'เมนูเบเกอรี', 'cake': 'เมนูเค้ก',
        'dessert': 'เมนูของหวาน', 'chocolate': 'เมนูช็อคโกแลต',
        'quick-meal': 'เมนูทำง่ายไม่เกิน 15 นาที', 'budget': 'เมนูประหยัด',
        'dorm-life': 'เมนูเด็กหอ', 'business': 'เมนูสร้างอาชีพ', 'lunch-box': 'เมนูข้าวกล่อง',
        'valentine': 'เมนูวาเลนไทน์', 'halloween': 'เมนูฮาโลวีน', 'christmas': 'เมนูคริสต์มาส',
        'salad-dressing': 'สูตรน้ำสลัด', 'clean-food': 'เมนูอาหารคลีน', 'salad': 'เมนูสลัด',
        'weight-loss': 'เมนูอาหารลดน้ำหนัก', 'low-calorie': 'เมนูอาหารแคลอรี่ต่ำ',
        'low-fat': 'เมนูอาหารไขมันต่ำ', 'high-fiber': 'เมนูอาหารไฟเบอร์สูง'
    };

    const categoryName = categoryMap[categoryType] || decodeURIComponent(categoryType || '');

    // Set category header title
    const titleEl = document.querySelector('.category-title');
    if (titleEl) titleEl.textContent = categoryName;

    const getUserId = () => {
        try {
            const data = JSON.parse(localStorage.getItem('user_data'));
            return data?.user?.id || 'user123';
        } catch (e) {
            return 'user123';
        }
    };

    const userId = getUserId();
    const token = localStorage.getItem('authToken');

    // Skeleton loader
    const showSkeletons = () => {
        const menuList = document.getElementById('menuList');
        if (!menuList) return;
        menuList.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-title"></div>
                <div class="skeleton-image"></div>
                <div class="skeleton-footer"></div>
            </div>
        `.repeat(6);
    };

    showSkeletons();

    const renderFromData = (quests, menus, fState, mStatusMap, profile) => {
        window.currentUserProfile = profile;
        if (typeof favState !== 'undefined') {
            for (let key in favState) delete favState[key];
            Object.assign(favState, fState);
        }

        // Filter menus that have the category name in their tags
        const filteredMenus = menus.filter(menu => {
            return menu.tags && menu.tags.some(tag => tag.toLowerCase() === categoryName.toLowerCase());
        });

        window.allRelatedMenus = filteredMenus;

        // Render menus using the global function from q-detail.js
        if (typeof renderMenus === 'function') {
            renderMenus(filteredMenus, mStatusMap);
        } else {
            console.error('renderMenus is not defined!');
        }

        // Setup sort system if defined
        if (typeof setupSortSystem === 'function') {
            setupSortSystem(
                'menuList',
                'sortBtn',
                'sortDropdown',
                'nameTrigger',
                'nameOptions',
                'current-name-text',
                'expTrigger',
                'expOptions',
                'current-exp-text'
            );
        }
    };

    // Setup worker connection to get data
    if (window.Worker) {
        let worker;
        let workerPort;
        if (typeof SharedWorker !== 'undefined') {
            worker = new SharedWorker('../../assets/js/worker.js');
            workerPort = worker.port;
            workerPort.start();
        } else {
            worker = new Worker('../../assets/js/worker.js');
            workerPort = worker;
        }

        workerPort.postMessage({ userId, token });

        workerPort.onmessage = function (e) {
            const data = e.data;
            if (!data.success) {
                console.error('Worker error:', data.error);
                return;
            }

            renderFromData(data.quests, data.menus, data.favState, data.menuStatusMap, data.profile);
        };

        if (typeof SharedWorker === 'undefined') {
            worker.onerror = function (error) {
                console.error('Worker failed:', error);
            };
        }
    }

    // Search bar functionality
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-button');

    const performSearch = () => {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const cards = document.querySelectorAll('#menuList .quest-card');

        cards.forEach(card => {
            const name = (card.getAttribute('data-name') || '').toLowerCase();
            if (name.includes(query)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
});
