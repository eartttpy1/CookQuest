const MENU_IMAGE_PLACEHOLDER = '../../assets/img/emptymenu.jpg';
const ADMIN_IMAGE_PLACEHOLDER = '../../assets/a-img/placeholder-dish.png';

function isBase64DataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:');
}

function slimMenuForCache(menu) {
    if (!menu || !isBase64DataUrl(menu.imageURL)) {
        return menu;
    }
    return { ...menu, imageURL: '', hasImage: true };
}

function getMenuImagePlaceholder(useAdminPlaceholder) {
    return useAdminPlaceholder ? ADMIN_IMAGE_PLACEHOLDER : MENU_IMAGE_PLACEHOLDER;
}

async function fetchMenuImage(menuId) {
    const response = await fetch(`/api/menus/${menuId}/image`);
    if (!response.ok) {
        return '';
    }
    const data = await response.json();
    return data.imageURL || '';
}

async function fetchMenuImagesBatch(menuIds) {
    const uniqueIds = [...new Set(menuIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return {};
    }

    const response = await fetch(`/api/menus/images?ids=${uniqueIds.join(',')}`);
    if (!response.ok) {
        return {};
    }
    return response.json();
}

function applyMenuImage(img, imageURL, fallback) {
    if (imageURL) {
        img.src = imageURL;
    } else if (fallback) {
        img.src = fallback;
    }
    img.dataset.loaded = 'true';
}

function setupLazyMenuImages(root, options = {}) {
    const container = root || document;
    const fallback = options.fallback || MENU_IMAGE_PLACEHOLDER;
    const images = container.querySelectorAll('img[data-lazy-menu-id]:not([data-loaded="true"])');

    if (images.length === 0) {
        return;
    }

    const loadImage = async (img) => {
        const menuId = img.dataset.lazyMenuId;
        if (!menuId || img.dataset.loaded === 'true') {
            return;
        }

        try {
            const imageURL = await fetchMenuImage(menuId);
            applyMenuImage(img, imageURL, fallback);
        } catch (error) {
            console.error('Failed to load menu image:', error);
            img.dataset.loaded = 'true';
        }
    };

    if (!('IntersectionObserver' in window)) {
        images.forEach((img) => loadImage(img));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }
            const img = entry.target;
            observer.unobserve(img);
            loadImage(img);
        });
    }, { rootMargin: '200px' });

    images.forEach((img) => observer.observe(img));
}

async function hydrateQuestCardImages() {
    const images = document.querySelectorAll('.quest-image-grid img[data-lazy-menu-id]:not([data-loaded="true"])');
    if (images.length === 0) {
        return;
    }

    const menuIds = [...new Set([...images].map((img) => img.dataset.lazyMenuId).filter(Boolean))];
    try {
        const imageMap = await fetchMenuImagesBatch(menuIds);
        images.forEach((img) => {
            const imageURL = imageMap[img.dataset.lazyMenuId] || '';
            applyMenuImage(img, imageURL, MENU_IMAGE_PLACEHOLDER);
        });
    } catch (error) {
        console.error('Failed to batch load quest images:', error);
    }
}
