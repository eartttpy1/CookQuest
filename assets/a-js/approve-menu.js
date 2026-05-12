let requests = [];
let currentSort = 'desc';
let currentStatus = 'all';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateHeaderTitle(currentStatus);
    loadRequests();
});

async function loadRequests() {
    try {
        const response = await fetch(`/api/requests?status=${currentStatus}`);
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
    const statusFilter = document.getElementById('statusFilter');

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

    if (statusFilter) {
        statusFilter.addEventListener('click', async (event) => {
            const button = event.target.closest('.status-btn');
            if (!button) return;

            currentStatus = button.dataset.status || 'all';
            document.querySelectorAll('.status-btn').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            updateHeaderTitle(currentStatus);
            await loadRequests();
        });
    }

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.sort-wrapper')) {
            sortDropdown.classList.add('hidden');
        }
    });

    if (requestList) {
        requestList.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const item = button.closest('.request-item');
            if (!item) return;

            const target = requests.find((request) => String(request._id) === String(item.dataset.id));
            if (!target || getRequestStatus(target) !== 'pending') return;

            if (button.classList.contains('btn-approve')) {
                await updateRequestStatus(target._id, 'approved');
            }

            if (button.classList.contains('btn-reject')) {
                await updateRequestStatus(target._id, 'rejected');
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
        const requestStatus = getRequestStatus(request);
        if (currentStatus !== 'all' && requestStatus !== currentStatus) {
            return false;
        }

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

        const requestStatus = getRequestStatus(request);
        const isPending = requestStatus === 'pending';

        requestItem.innerHTML = `
            <div class="item-img">
                <img src="${getImageUrl(request)}" alt="dish">
            </div>
            <div class="item-info">
                <div class="item-top">
                    <span class="item-menu thai">Menu: ${escapeHtml(getMenuName(request))}</span>
                    <div class="item-status-row">
                        <span class="request-status ${requestStatus}">${capitalize(requestStatus)}</span>
                        <span class="item-date">${formatDate(request)}</span>
                    </div>
                </div>
                <div class="item-meta">
                    <span class="thai">ID &nbsp;&nbsp; ${escapeHtml(String(request._id || '-'))}</span>
                    <span class="thai">User &nbsp; ${escapeHtml(getUserName(request))}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-approve" type="button" ${isPending ? '' : 'disabled'}>Approve</button>
                <button class="btn-reject" type="button" ${isPending ? '' : 'disabled'}>Reject</button>
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

async function updateRequestStatus(id, status) {
    try {
        const response = await fetch(`/api/requests/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to update request status');
        }

        const updatedRequest = await response.json();
        const index = requests.findIndex((request) => String(request._id) === String(updatedRequest._id));
        if (index !== -1) {
            requests[index] = updatedRequest;
        }

        if (currentStatus !== 'all' && currentStatus !== updatedRequest.status) {
            await loadRequests();
        } else {
            renderRequests();
        }
    } catch (error) {
        console.error('Error updating request status:', error);
    }
}

function getRequestStatus(request) {
    const normalized = String(request.status || 'pending').trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'rejected' || normalized === 'pending') {
        return normalized;
    }
    return 'pending';
}

function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
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

function updateHeaderTitle(status) {
    const headerTitle = document.querySelector('.page-header h1');
    if (!headerTitle) return;

    const titles = {
        all: 'All requests',
        pending: 'Pending requests',
        approved: 'Approved requests',
        rejected: 'Rejected requests'
    };

    headerTitle.textContent = titles[status] || 'Current requests';
}
