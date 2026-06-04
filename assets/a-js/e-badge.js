let allBadges = [];
let currentEditItem = null;
let currentDeleteItem = null;

const PRESET_CATEGORIES = [
  "เมนูไข่", "เมนูไก่", "เมนูหมู", "เมนูเป็ด", "เมนูเนื้อวัว", "เมนูไส้กรอก", "เมนูเบคอน", "เมนูอาหารทะเล", "เมนูเส้น", "เมนูเห็ด", "เมนูเต้าหู้", "เมนูข้าว", "เมนูผัก", "เมนูผลไม้",
  "เมนูอาหารเช้า", "เมนูอาหารจานเดียว", "เมนูกับแกล้ม/อาหารว่าง", "เมนูมังสวิรัติ", "เมนูอาหารไทย", "เมนูอาหารเหนือ", "เมนูอาหารอีสาน", "เมนูอาหารใต้", "เมนูอาหารญี่ปุ่น", "เมนูอาหารจีน", "เมนูอาหารเกาหลี", "เมนูอาหารฝรั่ง", "เมนูอาหารอิตาเลียน", "เมนูสเต๊ก", "เมนูแกง", "สูตรน้ำจิ้ม", "เมนูอาหารฟิวชัน", "เมนูซุป", "อาหารนานาชาติ", "เมนูแซนด์วิช", "เมนูอาหารเย็น", "เมนูน้ำพริก", "เมนูกับข้าว", "เมนูก๋วยเตี๋ยว",
  "เมนูไมโครเวฟ", "เมนูต้ม", "เมนูผัด", "เมนูทอด", "เมนูอบ", "เมนูนึ่ง", "เมนูยำ", "เมนูย่าง", "เมนูหม้ออบลมร้อน", "เมนูหม้อหุงข้าว",
  "เมนูไอศกรีม", "เมนูขนมไทย", "เมนูเบเกอรี", "เมนูเค้ก", "เมนูของหวาน", "เมนูช็อคโกแลต",
  "เมนูทำง่ายไม่เกิน 15 นาที", "เมนูประหยัด", "เมนูเด็กหอ", "เมนูสร้างอาชีพ", "เมนูข้าวกล่อง", "เมนูวาเลนไทน์", "เมนูฮาโลวีน", "เมนูคริสต์มาส",
  "สูตรน้ำสลัด", "เมนูอาหารคลีน", "เมนูสลัด", "เมนูอาหารลดน้ำหนัก", "เมนูอาหารแคลอรี่ต่ำ", "เมนูอาหารไขมันต่ำ", "เมนูอาหารไฟเบอร์สูง"
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication token
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '../user/login.html';
        return;
    }

    populatePresetCategories();
    await loadBadges();
    await loadUsers();
    setupSearch();
    toggleRuleValueInput();
});

// Populate target categories in form
function populatePresetCategories() {
    const categorySelect = document.getElementById('ruleCategory');
    if (!categorySelect) return;

    categorySelect.innerHTML = '';
    PRESET_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

// Fetch all system badges
async function loadBadges() {
    try {
        const response = await fetch('/api/badges');
        if (!response.ok) {
            throw new Error('Failed to fetch badges');
        }
        allBadges = await response.json();
        renderBadges(allBadges);
        populateAssignBadgeDropdown(allBadges);
    } catch (error) {
        console.error('Error loading badges:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดเหรียญตรา', 'error');
    }
}

// Render badges to HTML list
function renderBadges(badges) {
    const listContainer = document.getElementById('badgeList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (badges.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #888; font-family: 'IBM Plex Sans Thai Looped', sans-serif;" class="thai">
                ไม่พบเหรียญตราในระบบ คลิกปุ่ม '+' เพื่อเพิ่มเหรียญตราใหม่!
            </div>
        `;
        return;
    }

    badges.forEach(badge => {
        const ruleLabel = getRuleLabelText(badge.ruleType, badge.ruleValue, badge.ruleCategory);
        
        const badgeItem = document.createElement('div');
        badgeItem.className = 'badge-item';
        badgeItem.innerHTML = `
            <div class="item-icon-circle">${badge.icon}</div>
            <div class="item-info">
                <span class="item-name">${badge.name}</span>
                <span class="item-desc thai">${badge.desc}</span>
                <span class="item-rule thai"><i class="fa-solid fa-gears"></i> เงื่อนไข: ${ruleLabel}</span>
            </div>
            <div class="item-actions">
                <button class="btn-item-edit thai" onclick="openEditForm('${badge._id}')">
                    <i class="fa-solid fa-pen"></i> แก้ไข
                </button>
                <button class="btn-item-delete thai" onclick="openDeleteModal('${badge._id}', '${badge.name}')">
                    <i class="fa-solid fa-trash"></i> ลบ
                </button>
            </div>
        `;
        listContainer.appendChild(badgeItem);
    });
}

// Get readable text description of badge criteria rule
function getRuleLabelText(type, value, category) {
    switch (type) {
        case 'level':
            return `เลเวลผู้ใช้ >= ${value}`;
        case 'recipes_count':
            return `ปรุงเมนูสำเร็จทั้งหมด >= ${value} เมนู`;
        case 'cooking_streak':
            return `ทำอาหารติดต่อกัน >= ${value} วัน (Streak)`;
        case 'star_rating':
            return `ได้รับรีวิวรสชาติ >= ${value} ดาว`;
        case 'category_count':
            return `ปรุงเมนูสำเร็จในหมวดหมู่ "${category || 'ทั่วไป'}" >= ${value} เมนู`;
        case 'manual':
            return 'มอบโดยผู้ดูแลระบบด้วยตนเอง';
        default:
            return 'มอบโดยผู้ดูแลระบบ';
    }
}

// Search / filter badges
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const filtered = allBadges.filter(badge => 
            badge.name.toLowerCase().includes(query) || 
            badge.desc.toLowerCase().includes(query) ||
            badge.ruleType.toLowerCase().includes(query)
        );
        renderBadges(filtered);
    });
}

// Toggle rule threshold visibility based on criteria selector
function toggleRuleValueInput() {
    const ruleType = document.getElementById('ruleType').value;
    const ruleValueRow = document.getElementById('ruleValueRow');
    const ruleValueUnit = document.getElementById('ruleValueUnit');
    const ruleCategoryRow = document.getElementById('ruleCategoryRow');

    // Show/hide category dropdown
    if (ruleType === 'category_count') {
        ruleCategoryRow.classList.remove('hidden');
    } else {
        ruleCategoryRow.classList.add('hidden');
    }

    if (ruleType === 'manual') {
        ruleValueRow.classList.add('hidden');
    } else {
        ruleValueRow.classList.remove('hidden');
        
        // Update label helper text
        switch (ruleType) {
            case 'level':
                ruleValueUnit.textContent = 'เลเวลเป้าหมาย';
                break;
            case 'recipes_count':
                ruleValueUnit.textContent = 'จำนวนเมนูเป้าหมาย';
                break;
            case 'cooking_streak':
                ruleValueUnit.textContent = 'จำนวนวันเป้าหมาย';
                break;
            case 'star_rating':
                ruleValueUnit.textContent = 'จำนวนดาวรีวิวเป้าหมาย (1-5)';
                break;
            case 'category_count':
                ruleValueUnit.textContent = 'จำนวนเมนูในหมวดหมู่เป้าหมาย';
                break;
            default:
                ruleValueUnit.textContent = 'เป้าหมายค่าความต้องการ';
        }
    }
}

// Modal Form controls
function openAddForm() {
    currentEditItem = null;
    document.getElementById('formTitle').textContent = 'เพิ่มเหรียญตราใหม่';
    document.getElementById('badgeForm').reset();
    document.getElementById('ruleType').value = 'level';
    document.getElementById('ruleValue').value = 0;
    if (document.getElementById('ruleCategory')) {
        document.getElementById('ruleCategory').value = PRESET_CATEGORIES[0];
    }
    toggleRuleValueInput();
    document.getElementById('badgeFormModal').classList.remove('hidden');
}

function openEditForm(badgeId) {
    const badge = allBadges.find(b => b._id === badgeId);
    if (!badge) return;

    currentEditItem = badge;
    document.getElementById('formTitle').textContent = 'แก้ไขเหรียญตรา';
    document.getElementById('badgeName').value = badge.name;
    document.getElementById('badgeIcon').value = badge.icon;
    document.getElementById('badgeDesc').value = badge.desc;
    document.getElementById('ruleType').value = badge.ruleType || 'manual';
    document.getElementById('ruleValue').value = badge.ruleValue || 0;
    
    if (document.getElementById('ruleCategory')) {
        document.getElementById('ruleCategory').value = badge.ruleCategory || PRESET_CATEGORIES[0];
    }
    
    toggleRuleValueInput();
    document.getElementById('badgeFormModal').classList.remove('hidden');
}

function closeForm() {
    document.getElementById('badgeFormModal').classList.add('hidden');
    currentEditItem = null;
}

// Save or Update badge
async function saveBadge(event) {
    event.preventDefault();
    
    const name = document.getElementById('badgeName').value.trim();
    const icon = document.getElementById('badgeIcon').value.trim();
    const desc = document.getElementById('badgeDesc').value.trim();
    const ruleType = document.getElementById('ruleType').value;
    const ruleValue = ruleType === 'manual' ? 0 : parseInt(document.getElementById('ruleValue').value) || 0;
    const ruleCategory = ruleType === 'category_count' ? document.getElementById('ruleCategory').value : "";

    const token = localStorage.getItem('authToken');
    const url = currentEditItem ? `/api/badges/${currentEditItem._id}` : '/api/badges';
    const method = currentEditItem ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, icon, desc, ruleType, ruleValue, ruleCategory })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.msg || 'ไม่สามารถบันทึกข้อมูลเหรียญตราได้');
        }

        showToast(currentEditItem ? 'แก้ไขข้อมูลเหรียญตราสำเร็จ!' : 'เพิ่มข้อมูลเหรียญตราใหม่สำเร็จ!', 'success');
        closeForm();
        await loadBadges();
    } catch (error) {
        console.error('Error saving badge:', error);
        showToast(error.message || 'เกิดข้อผิดพลาดในการบันทึกเหรียญตรา', 'error');
    }
}

// Delete modal controls
function openDeleteModal(badgeId, badgeName) {
    currentDeleteItem = badgeId;
    document.getElementById('deleteModalText').textContent = `คุณแน่ใจหรือไม่ว่าต้องการลบเหรียญตรา "${badgeName}"?`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    currentDeleteItem = null;
}

// Confirm badge delete
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentDeleteItem) return;
    
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`/api/badges/${currentDeleteItem}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถลบเหรียญตราได้');
        }

        showToast('ลบเหรียญตราสำเร็จ!', 'success');
        closeDeleteModal();
        await loadBadges();
    } catch (error) {
        console.error('Error deleting badge:', error);
        showToast('เกิดข้อผิดพลาดในการลบเหรียญตรา', 'error');
        closeDeleteModal();
    }
});

// Fetch all users list to award badge manually
async function loadUsers() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const users = await response.json();
        populateUserDropdown(users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Populate user dropdown selector
function populateUserDropdown(users) {
    const userSelect = document.getElementById('assignUserSelect');
    if (!userSelect) return;

    userSelect.innerHTML = '<option value="">-- เลือกผู้ใช้งาน --</option>';
    
    // Sort users alphabetically by username
    users.sort((a, b) => a.username.localeCompare(b.username));
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        option.textContent = `${user.username} (${user.email})`;
        userSelect.appendChild(option);
    });
}

// Populate badge dropdown selector for assignment
function populateAssignBadgeDropdown(badges) {
    const badgeSelect = document.getElementById('assignBadgeSelect');
    if (!badgeSelect) return;

    badgeSelect.innerHTML = '<option value="">-- เลือกเหรียญตรา --</option>';
    
    badges.forEach(badge => {
        const option = document.createElement('option');
        option.value = badge.name;
        option.setAttribute('data-icon', badge.icon);
        option.textContent = `${badge.icon} ${badge.name}`;
        badgeSelect.appendChild(option);
    });
}

// Award a badge manually to a user
async function assignBadgeToUser() {
    const badgeName = document.getElementById('assignBadgeSelect').value;
    const userId = document.getElementById('assignUserSelect').value;

    if (!badgeName || !userId) {
        showToast('กรุณาเลือกทั้งเหรียญตราและผู้ใช้งาน', 'error');
        return;
    }

    const selectedOption = document.getElementById('assignBadgeSelect').selectedOptions[0];
    const badgeIcon = selectedOption.getAttribute('data-icon');

    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch('/api/profile/add-badge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ badgeName, badgeIcon, userId })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.msg || 'ไม่สามารถมอบเหรียญตราได้');
        }

        showToast('มอบเหรียญตราสำเร็จ!', 'success');
        document.getElementById('assignBadgeSelect').value = '';
        document.getElementById('assignUserSelect').value = '';
    } catch (error) {
        console.error('Error awarding badge:', error);
        showToast(error.message || 'เกิดข้อผิดพลาดในการมอบเหรียญตรา', 'error');
    }
}

// Show feedback toasts
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
