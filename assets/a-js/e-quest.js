// e-quest.js - Handles functionality for e-quest admin page

// Global variables
let deleteMode = false;
let currentEditItem = null;
let quests = [];
let selectedImageData = '';
let availableTags = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadQuests();
    loadMenus();
    setupQuestEventListeners();

    const menuTagSearchInput = document.getElementById('menuTagSearchInput');
    if (menuTagSearchInput) {
        menuTagSearchInput.addEventListener('input', handleMenuTagSearchInput);
    }

    // Form submission
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveQuest);
    }
});

// Quest functions
async function loadQuests() {
    try {
        const response = await fetch('/api/quests');
        quests = await response.json();
        renderQuests();
    } catch (error) {
        console.error('Error loading quests:', error);
    }
}

function renderQuests() {
    const questList = document.getElementById('questList');
    questList.innerHTML = '';

    quests.forEach(quest => {
        const questItem = document.createElement('div');
        questItem.className = 'quest-item';
        questItem.setAttribute('data-id', quest._id);

        questItem.innerHTML = `
            <button class="item-delete-btn${deleteMode ? '' : ' hidden'}"><i class="fa-solid fa-minus"></i></button>
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

    updateDeleteButtons();
    filterQuests();
}

let currentSortName = 'none';
let currentSortExp = 'none';

function setupQuestEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', filterQuests);

    // Sort Dropdown Toggle
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('hidden');
        });
    }

    // Helper to setup custom selects for Name and Exp
    function setupCustomSelect(triggerId, optionsId, textId, type) {
        const trigger = document.getElementById(triggerId);
        const optionsContainer = document.getElementById(optionsId);
        const textSpan = document.getElementById(textId);

        if (!trigger || !optionsContainer) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other options
            document.querySelectorAll('.custom-options').forEach(opt => {
                if (opt !== optionsContainer) opt.classList.add('hidden');
            });
            optionsContainer.classList.toggle('hidden');
        });

        optionsContainer.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.getAttribute('data-value');
                textSpan.innerText = option.innerText;
                optionsContainer.classList.add('hidden');

                if (type === 'name') {
                    currentSortName = value;
                    currentSortExp = 'none';
                    const expText = document.getElementById('current-exp-text');
                    if (expText) expText.innerText = "เลือก";
                } else if (type === 'exp') {
                    currentSortExp = value;
                    currentSortName = 'none';
                    const nameText = document.getElementById('current-name-text');
                    if (nameText) nameText.innerText = "เลือก";
                }

                sortQuests();
            });
        });
    }

    setupCustomSelect('nameTrigger', 'nameOptions', 'current-name-text', 'name');
    setupCustomSelect('expTrigger', 'expOptions', 'current-exp-text', 'exp');

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (sortDropdown) sortDropdown.classList.add('hidden');
        document.querySelectorAll('.custom-options').forEach(opt => opt.classList.add('hidden'));
    });

    // Delete buttons inside quest list
    const questList = document.getElementById('questList');
    if (questList) {
        questList.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.item-delete-btn');
            if (deleteButton) {
                event.preventDefault();
                deleteItem(deleteButton);
            }
        });
    }
}

function updateDeleteButtons() {
    const deleteBtns = document.querySelectorAll('.item-delete-btn');
    deleteBtns.forEach(btn => {
        if (deleteMode) {
            btn.classList.remove('hidden');
            btn.style.display = 'flex';
        } else {
            btn.classList.add('hidden');
            btn.style.display = '';
        }
    });
}

function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const deleteModeBtn = document.getElementById('deleteModeBtn');

    updateDeleteButtons();
    deleteModeBtn.classList.toggle('active', deleteMode);
}

function filterQuests() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase();
    const questItems = document.querySelectorAll('.quest-item');

    questItems.forEach(item => {
        const name = item.querySelector('.quest-title').textContent.toLowerCase();
        const tags = Array.from(item.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

        const matches = name.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm));
        item.style.display = matches ? 'flex' : 'none';
    });
}

function sortQuests() {
    quests.sort((a, b) => {
        if (currentSortName !== 'none') {
            const nameA = a.name || "";
            const nameB = b.name || "";
            if (currentSortName === 'asc') return nameA.localeCompare(nameB, 'th');
            if (currentSortName === 'desc') return nameB.localeCompare(nameA, 'th');
        }

        if (currentSortExp !== 'none') {
            const expA = parseInt(a.exp) || 0;
            const expB = parseInt(b.exp) || 0;
            if (currentSortExp === 'low') return expA - expB;
            if (currentSortExp === 'high') return expB - expA;
        }

        return 0;
    });

    renderQuests();
}

function openAddForm() {
    currentEditItem = null;
    selectedImageData = '';
    clearImagePreview();
    document.getElementById('formTitle').textContent = 'เพิ่มเควส';
    document.getElementById('questName').value = '';
    document.getElementById('questExp').value = '';
    document.getElementById('menuTagsArea').innerHTML = '';
    const tagSearchInput = document.getElementById('menuTagSearchInput');
    if (tagSearchInput) {
        tagSearchInput.value = '';
    }
    renderMenuTagSuggestions('');
    document.getElementById('formOverlay').classList.remove('hidden');
}

function openEditForm(button) {
    const item = button.closest('.quest-item');
    const id = item.getAttribute('data-id');
    currentEditItem = quests.find(q => q._id === id);
    selectedImageData = '';
    setImagePreview('');

    document.getElementById('formTitle').textContent = 'แก้ไขเควส';
    document.getElementById('questName').value = currentEditItem.name;
    document.getElementById('questExp').value = currentEditItem.exp;
    document.getElementById('menuTagsArea').innerHTML = (currentEditItem.tags || []).map(tag => `<span class="tag removable thai">${tag} <button onclick="removeTag(this)">X</button></span>`).join('');
    const tagSearchInput = document.getElementById('menuTagSearchInput');
    if (tagSearchInput) {
        tagSearchInput.value = '';
    }
    renderMenuTagSuggestions('');
    document.getElementById('formOverlay').classList.remove('hidden');
}

function closeForm() {
    document.getElementById('formOverlay').classList.add('hidden');
    currentEditItem = null;
}

let deleteModalCallback = null;

function openDeleteModal(message, onConfirm) {
    console.log('openDeleteModal called with message:', message);
    const deleteModal = document.getElementById('deleteModal');
    const modalTitle = deleteModal.querySelector('.modal-title');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    modalTitle.textContent = message;
    deleteModal.classList.remove('hidden');
    deleteModalCallback = onConfirm;
    console.log('deleteModalCallback set');

    confirmBtn.onclick = async () => {
        console.log('Confirm button clicked in modal');
        const callback = deleteModalCallback;
        closeDeleteModal();
        if (typeof callback === 'function') {
            console.log('Calling deleteModalCallback');
            await callback();
        }
    };
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.classList.add('hidden');
    deleteModalCallback = null;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const containerId = 'toastContainer';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

async function deleteItem(button) {
    console.log('deleteItem called with button:', button);
    const item = button.closest('.quest-item');
    console.log('Closest item:', item);
    const id = item.getAttribute('data-id');
    console.log('Item id:', id);
    const questName = item.querySelector('.quest-title')?.textContent.trim() || 'this quest';
    const deleteMessage = `Delete quest "${questName}"?`;

    openDeleteModal(deleteMessage, async () => {
        console.log('Modal callback executed');
        try {
            console.log('Fetching delete for id:', id);
            const response = await fetch(`/api/quests/${id}`, {
                method: 'DELETE'
            });
            console.log('Response status:', response.status);
            if (response.ok) {
                showToast(`Quest "${questName}" deleted successfully.`, 'success');
                await loadQuests();
            } else {
                const data = await response.json();
                console.log('Response data:', data);
                showToast(data.error || 'Failed to delete quest', 'error');
            }
        } catch (error) {
            console.error('Error deleting quest:', error);
            showToast('Error deleting quest', 'error');
        }
    });
}

function removeTag(button) {
    button.parentElement.remove();
    const searchInput = document.getElementById('menuTagSearchInput');
    const query = searchInput ? searchInput.value : '';
    renderMenuTagSuggestions(query);
}

async function loadMenus(search = '') {
    try {
        const response = await fetch('/api/menus');
        if (!response.ok) {
            throw new Error('Failed to load menus');
        }
        const menus = await response.json();
        availableTags = menus.map(menu => ({ name: menu.menuName }));
        renderMenuTagSuggestions(search);
    } catch (error) {
        console.error('Error loading menus:', error);
    }
}

function handleMenuTagSearchInput(event) {
    const query = event.target.value.trim();
    renderMenuTagSuggestions(query);
}

function renderMenuTagSuggestions(query) {
    const resultsContainer = document.getElementById('menuTagSearchResults');
    if (!resultsContainer) return;

    const selectedTags = Array.from(document.querySelectorAll('#menuTagsArea .tag'))
        .map(tag => tag.textContent.replace(/\s*X$/, '').trim());

    const normalizedQuery = (query || '').toLowerCase();
    const matchingMenus = availableTags
        .filter(menu => menu.name.toLowerCase().includes(normalizedQuery));

    resultsContainer.innerHTML = '';
    matchingMenus.forEach(menu => {
        const isSelected = selectedTags.includes(menu.name);
        
        const item = document.createElement('div');
        item.className = `menu-select-item${isSelected ? ' selected' : ''}`;
        item.innerHTML = `
            <span class="thai">${menu.name}</span>
            <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'}"></i>
        `;
        
        item.addEventListener('click', () => {
            if (isSelected) {
                // Remove tag
                const tags = Array.from(document.querySelectorAll('#menuTagsArea .tag'));
                const targetTag = tags.find(t => t.textContent.replace(/\s*X$/, '').trim() === menu.name);
                if (targetTag) targetTag.remove();
            } else {
                // Add tag
                addMenuTag(menu.name);
            }
            // Re-render suggestions to update state
            const searchInput = document.getElementById('menuTagSearchInput');
            renderMenuTagSuggestions(searchInput ? searchInput.value : '');
        });
        
        resultsContainer.appendChild(item);
    });
}


function addMenuTag(tagName) {
    const tagsArea = document.getElementById('menuTagsArea');
    if (!tagsArea) return;

    const existing = Array.from(tagsArea.querySelectorAll('.tag')).some(tag => {
        const labelText = tag.firstChild && tag.firstChild.textContent
            ? tag.firstChild.textContent.trim()
            : tag.textContent.replace(/\s*X$/, '').trim();
        return labelText === tagName;
    });

    if (existing) {
        return;
    }

    const tagElement = document.createElement('span');
    tagElement.className = 'tag removable thai';
    tagElement.textContent = tagName + ' ';

    const removeButton = document.createElement('button');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', () => removeTag(removeButton));

    tagElement.appendChild(removeButton);
    tagsArea.appendChild(tagElement);
}

function createAndAddMenuTag(tagName) {
    addMenuTag(tagName);
    const tagInput = document.getElementById('menuTagSearchInput');
    if (tagInput) {
        tagInput.value = '';
    }
    renderMenuTagSuggestions('');
}

async function saveQuest() {
    const saveBtn = document.querySelector('.btn-save');
    if (window.isQuestSaving || (saveBtn && (saveBtn.disabled || saveBtn.getAttribute('data-saving') === 'true'))) return;
    window.isQuestSaving = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.setAttribute('data-saving', 'true');
        saveBtn.style.pointerEvents = 'none';
    }

    const name = document.getElementById('questName').value;
    const exp = parseInt(document.getElementById('questExp').value);
    const tags = Array.from(document.querySelectorAll('#menuTagsArea .tag')).map(tag => tag.textContent.replace(/\s*X$/, '').trim());

    if (!name || !exp) {
        alert('Please fill in all required fields');
        window.isQuestSaving = false;
        if (saveBtn) {
            saveBtn.removeAttribute('data-saving');
            saveBtn.disabled = false;
            saveBtn.style.pointerEvents = '';
        }
        return;
    }

    const questData = { name, exp, tags };

    try {
        if (currentEditItem) {
            // Edit existing quest
            const response = await fetch(`/api/quests/${currentEditItem._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(questData)
            });
            if (!response.ok) {
                throw new Error('Failed to update quest');
            }
        } else {
            // Add new quest
            await fetch('/api/quests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(questData)
            });
        }

        await loadQuests();
        closeForm();
    } catch (error) {
        console.error('Error saving quest:', error);
        alert('Error saving quest');
    } finally {
        window.isQuestSaving = false;
        if (saveBtn) {
            saveBtn.removeAttribute('data-saving');
            saveBtn.disabled = false;
            saveBtn.style.pointerEvents = '';
        }
    }
}

function previewImg(input) {
    const file = input.files && input.files[0];
    if (!file) {
        clearImagePreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        selectedImageData = event.target.result;
        setImagePreview(selectedImageData);
    };
    reader.readAsDataURL(file);
}

function setImagePreview(imageUrl) {
    const previewContainer = document.getElementById('formImgPreview');
    if (!previewContainer) return;

    const src = imageUrl || '../../assets/a-img/placeholder-quest.png';
    previewContainer.innerHTML = `
        <div class="image-preview-wrapper">
            <img id="imgPreview" src="${src}" alt="Preview" class="image-preview">
            <button type="button" class="btn-clear-image" onclick="clearImagePreview()">Remove</button>
        </div>
        <label class="img-upload-label thai">
            <i class="fa-solid fa-image"></i>
            <span>แก้ไขรูปภาพ</span>
            <input type="file" accept="image/*" class="hidden" id="imgInput" onchange="previewImg(this)">
        </label>
    `;
}

function clearImagePreview() {
    selectedImageData = '';
    const previewContainer = document.getElementById('formImgPreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = `
        <div class="image-preview-wrapper">
            <img id="imgPreview" src="../../assets/a-img/placeholder-quest.png" alt="Preview" class="image-preview">
        </div>
        <label class="img-upload-label thai">
            <i class="fa-solid fa-image"></i>
            <span>เพิ่มไฟล์รูปภาพ</span>
            <input type="file" accept="image/*" class="hidden" id="imgInput" onchange="previewImg(this)">
        </label>
    `;
}