let requests = [];
let currentSort = 'desc';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadRequests();
});

async function loadRequests() {
    try {
        const response = await fetch('/api/requests');
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }

        requests = await response.json();
        renderRequests();
    } catch (error) {
        console.error('Error loading requests:', error);
        renderErrorState();
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    const requestList = document.getElementById('requestList');

    if (searchInput) {
        searchInput.addEventListener('input', renderRequests);
    }

    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            sortDropdown.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
            currentSort = option.dataset.sort;
            document.querySelectorAll('.sort-option').forEach(item => item.classList.remove('active'));
            option.classList.add('active');
            sortDropdown.classList.add('hidden');
            renderRequests();
        });
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.sort-wrapper')) {
            sortDropdown.classList.add('hidden');
        }
    });

    if (requestList) {
        requestList.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const item = button.closest('.request-item');
            if (!item) return;

            if (button.classList.contains('btn-approve')) {
                item.remove();
                updateRequestCount();
            }

            if (button.classList.contains('btn-reject')) {
                item.remove();
                updateRequestCount();
            }
        });
    }
}

function renderRequests() {
    const requestList = document.getElementById('requestList');
    const searchInput = document.getElementById('searchInput');

    if (!requestList) return;

    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const filtered = requests.filter((request) => {
        const menuName = getMenuName(request).toLowerCase();
        const userName = getUserName(request).toLowerCase();
        const requestId = String(request._id || '').toLowerCase();
        return menuName.includes(searchTerm) || userName.includes(searchTerm) || requestId.includes(searchTerm);
    });

    const sorted = [...filtered].sort((a, b) => {
        const dateA = getDateValue(a);
        const dateB = getDateValue(b);
        return currentSort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    requestList.innerHTML = '';

    if (sorted.length === 0) {
        requestList.innerHTML = '<div class="request-item"><div class="item-info"><span class="thai">No requests found.</span></div></div>';
        updateRequestCount(0);
        return;
    }

    sorted.forEach((request) => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        requestItem.dataset.id = request._id || '';

        requestItem.innerHTML = `
            <div class="item-img">
                <img src="${getImageUrl(request)}" alt="dish">
            </div>
            <div class="item-info">
                <div class="item-top">
                    <span class="item-menu thai">Menu: ${escapeHtml(getMenuName(request))}</span>
                    <span class="item-date">${formatDate(request)}</span>
                </div>
                <div class="item-meta">
                    <span class="thai">ID &nbsp;&nbsp; ${escapeHtml(String(request._id || '-'))}</span>
                    <span class="thai">User &nbsp; ${escapeHtml(getUserName(request))}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-approve" type="button">Approve</button>
                <button class="btn-reject" type="button">Reject</button>
            </div>
        `;

        requestList.appendChild(requestItem);
    });

    updateRequestCount(sorted.length);
}

function renderErrorState() {
    const requestList = document.getElementById('requestList');
    if (!requestList) return;

    requestList.innerHTML = '<div class="request-item"><div class="item-info"><span class="thai">Unable to load requests.</span></div></div>';
    updateRequestCount(0);
}

function updateRequestCount(count) {
    const requestCount = document.getElementById('request-count');
    if (!requestCount) return;

    if (typeof count === 'number') {
        requestCount.textContent = String(count);
        return;
    }

    const visibleItems = document.querySelectorAll('#requestList .request-item').length;
    requestCount.textContent = String(visibleItems);
}

function getMenuName(request) {
    return request.menuName || request.name || request.menu?.menuName || request.menu?.name || 'Unknown menu';
}

function getUserName(request) {
    return request.createdBy || request.userName || request.username || request.user?.name || request.user || 'Unknown user';
}

function getImageUrl(request) {
    return request.imageURL || request.image || request.menu?.imageURL || '../../assets/a-img/placeholder-dish.png';
}

function getDateValue(request) {
    const raw = request.createdAt || request.submittedAt || request.updatedAt;
    const time = raw ? new Date(raw).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
}

function formatDate(request) {
    const raw = request.createdAt || request.submittedAt || request.updatedAt;
    if (!raw) return '-';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
