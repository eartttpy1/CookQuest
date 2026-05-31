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

function hydrateQuestCardImages() {
    const grids = document.querySelectorAll('.quest-image-grid:not([data-loaded="true"])');
    if (grids.length === 0) {
        return;
    }

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        const visibleGrids = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
        if (visibleGrids.length === 0) return;

        const menuIds = new Set();
        const imagesToLoad = [];

        visibleGrids.forEach(grid => {
            observer.unobserve(grid);
            grid.dataset.loaded = 'true';
            const images = grid.querySelectorAll('img[data-lazy-menu-id]:not([data-loaded="true"])');
            images.forEach(img => {
                if (img.dataset.lazyMenuId) menuIds.add(img.dataset.lazyMenuId);
                imagesToLoad.push(img);
            });
        });

        if (menuIds.size > 0) {
            fetchMenuImagesBatch([...menuIds]).then(imageMap => {
                imagesToLoad.forEach(img => {
                    applyMenuImage(img, imageMap[img.dataset.lazyMenuId] || '', MENU_IMAGE_PLACEHOLDER);
                });
            }).catch(err => console.error('Failed to batch load quest images:', err));
        }
    }, { rootMargin: '200px' });

    grids.forEach(grid => observer.observe(grid));
}
