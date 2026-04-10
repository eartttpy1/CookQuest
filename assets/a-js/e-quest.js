// e-quest.js - Handles functionality for e-quest admin page

// Global variables
let deleteMode = false;
let currentEditItem = null;

// Sample quest data (replace with database calls later)
let quests = [
    { id: 1, name: 'ผู้กล้าเสต็ก', level: 'bronze', exp: 200, tags: ['เสต็ก'] },
    { id: 2, name: 'รวมพลขนมหวาน', level: 'silver', exp: 600, tags: ['ไอศกรีม', 'คุกกี้', 'มัฟฟิน'] },
    { id: 3, name: 'รวมพลขนมหวาน ++', level: 'gold', exp: 1000, tags: ['ครัวซองต์', 'มาการอง', 'ซูเฟล่'] }
];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    renderQuests();
    setupQuestEventListeners();

    // Form submission
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveQuest);
    }
});

// Quest functions
function renderQuests() {
    const questList = document.getElementById('questList');
    questList.innerHTML = '';

    quests.forEach(quest => {
        const questItem = document.createElement('div');
        questItem.className = `quest-item bg-${quest.level}`;
        questItem.setAttribute('data-id', quest.id);

        questItem.innerHTML = `
            <button class="item-delete-btn hidden" onclick="deleteItem(this)"><i class="fa-solid fa-minus"></i></button>
            <div class="quest-icon-area">
                <div class="quest-icon-placeholder">
                    <img src="../../assets/a-img/placeholder-quest.png" alt="quest">
                </div>
            </div>
            <div class="quest-info">
                <div class="quest-title-row">
                    <span class="quest-title thai">${quest.name}</span>
                    <span class="quest-exp">${quest.exp} EXP</span>
                </div>
                <div class="tag-list">
                    ${quest.tags.map(tag => `<span class="tag thai">${tag}</span>`).join('')}
                </div>
            </div>
            <button class="btn-edit" onclick="openEditForm(this)">Edit</button>
        `;

        questList.appendChild(questItem);
    });
}

function setupQuestEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', filterQuests);

    // Sort
    document.getElementById('sortBtn').addEventListener('click', toggleSortDropdown);
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => sortQuests(option.getAttribute('data-sort')));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-wrapper')) {
            document.getElementById('sortDropdown').classList.add('hidden');
        }
    });
}

function filterQuests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const questItems = document.querySelectorAll('.quest-item');

    questItems.forEach(item => {
        const name = item.querySelector('.quest-title').textContent.toLowerCase();
        const tags = Array.from(item.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

        const matches = name.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm));
        item.style.display = matches ? 'flex' : 'none';
    });
}

function toggleSortDropdown() {
    document.getElementById('sortDropdown').classList.toggle('hidden');
}

function sortQuests(sortType) {
    if (sortType === 'az') {
        quests.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === 'level') {
        const levelOrder = { bronze: 1, silver: 2, gold: 3 };
        quests.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
    }

    renderQuests();
    toggleSortDropdown();
}

function openAddForm() {
    currentEditItem = null;
    document.getElementById('formTitle').textContent = 'เพิ่มเควส';
    document.getElementById('questName').value = '';
    document.getElementById('questLevel').value = 'bronze';
    document.getElementById('questExp').value = '';
    document.getElementById('menuTagsArea').innerHTML = '<span class="tag removable thai">เสต็ก <button onclick="removeTag(this)">X</button></span>';
    document.getElementById('formOverlay').classList.remove('hidden');
}

function openEditForm(button) {
    const item = button.closest('.quest-item');
    const id = parseInt(item.getAttribute('data-id'));
    currentEditItem = quests.find(q => q.id === id);

    document.getElementById('formTitle').textContent = 'แก้ไขเควส';
    document.getElementById('questName').value = currentEditItem.name;
    document.getElementById('questLevel').value = currentEditItem.level;
    document.getElementById('questExp').value = currentEditItem.exp;
    document.getElementById('menuTagsArea').innerHTML = currentEditItem.tags.map(tag => `<span class="tag removable thai">${tag} <button onclick="removeTag(this)">X</button></span>`).join('');
    document.getElementById('formOverlay').classList.remove('hidden');
}

function closeForm() {
    document.getElementById('formOverlay').classList.add('hidden');
    currentEditItem = null;
}

function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const deleteBtns = document.querySelectorAll('.item-delete-btn');
    const deleteModeBtn = document.getElementById('deleteModeBtn');

    deleteBtns.forEach(btn => {
        btn.classList.toggle('hidden', !deleteMode);
    });

    deleteModeBtn.classList.toggle('active', deleteMode);
}

function deleteItem(button) {
    const item = button.closest('.quest-item');
    const id = parseInt(item.getAttribute('data-id'));

    if (confirm('Are you sure you want to delete this quest?')) {
        quests = quests.filter(q => q.id !== id);
        renderQuests();
    }
}

function removeTag(button) {
    button.parentElement.remove();
}

function saveQuest() {
    const name = document.getElementById('questName').value;
    const level = document.getElementById('questLevel').value;
    const exp = parseInt(document.getElementById('questExp').value);
    const tags = Array.from(document.querySelectorAll('#menuTagsArea .tag')).map(tag => tag.textContent.replace(' X', ''));

    if (!name || !exp) {
        alert('Please fill in all required fields');
        return;
    }

    if (currentEditItem) {
        // Edit
        currentEditItem.name = name;
        currentEditItem.level = level;
        currentEditItem.exp = exp;
        currentEditItem.tags = tags;
    } else {
        // Add
        const newId = Math.max(...quests.map(q => q.id)) + 1;
        quests.push({ id: newId, name, level, exp, tags });
    }

    renderQuests();
    closeForm();
}

function previewImg(input) {
    // Implement image preview
    console.log('Preview image');
}