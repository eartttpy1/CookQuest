// e-menu.js - Handles functionality for e-menu admin page

// Global variables
let deleteMode = false;
let currentEditItem = null;
let recipes = [];
let selectedImageData = '';
let availableTags = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadRecipes();
    loadTags();
    setupMenuEventListeners();

    const tagSearchInput = document.getElementById('tagSearchInput');
    if (tagSearchInput) {
        tagSearchInput.addEventListener('input', handleTagSearchInput);
    }

    // Form submission
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveRecipe);
    }
});

// Menu functions
async function loadRecipes() {
    try {
        const response = await fetch('/api/menus');
        recipes = await response.json();
        renderRecipes();
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
}

function renderRecipes() {
    const recipeList = document.getElementById('recipeList');
    recipeList.innerHTML = '';

    recipes.forEach(recipe => {
        const recipeItem = document.createElement('div');
        recipeItem.className = 'recipe-item';
        recipeItem.setAttribute('data-id', recipe._id);

        recipeItem.innerHTML = `
            <button class="item-delete-btn${deleteMode ? '' : ' hidden'}"><i class="fa-solid fa-minus"></i></button>
            <div class="item-img">
                <img src="${recipe.imageURL || '../../assets/a-img/placeholder-dish.png'}" alt="dish">
            </div>
            <div class="item-info">
                <span class="item-title thai">${recipe.menuName}</span>
                <div class="tag-list">
                    ${(recipe.tags || []).map(tag => `<span class="tag thai">${tag}</span>`).join('')}
                </div>
            </div>
            <button class="btn-edit" onclick="openEditForm(this)">Edit</button>
        `;

        recipeList.appendChild(recipeItem);
    });
}

function setupMenuEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', filterRecipes);

    // Sort
    document.getElementById('sortBtn').addEventListener('click', toggleSortDropdown);
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => sortRecipes(option.getAttribute('data-sort')));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-wrapper')) {
            document.getElementById('sortDropdown').classList.add('hidden');
        }
    });

    // Delete buttons inside recipe list
    const recipeList = document.getElementById('recipeList');
    if (recipeList) {
        recipeList.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.item-delete-btn');
            if (deleteButton) {
                event.preventDefault();
                deleteItem(deleteButton);
            }
        });
    }
}

function filterRecipes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const recipeItems = document.querySelectorAll('.recipe-item');

    recipeItems.forEach(item => {
        const name = item.querySelector('.item-title').textContent.toLowerCase();
        const tags = Array.from(item.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

        const matches = name.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm));
        item.style.display = matches ? 'flex' : 'none';
    });
}

function toggleSortDropdown() {
    document.getElementById('sortDropdown').classList.add('hidden');
    document.getElementById('sortDropdown').classList.toggle('hidden');
}

function sortRecipes(sortType) {
    if (sortType === 'az') {
        recipes.sort((a, b) => a.menuName.localeCompare(b.menuName));
    } else if (sortType === 'za') {
        recipes.sort((a, b) => b.menuName.localeCompare(a.menuName));
    }

    renderRecipes();
    toggleSortDropdown();
}

function openAddForm() {
    currentEditItem = null;
    selectedImageData = '';
    clearImagePreview();
    document.getElementById('formTitle').textContent = 'เพิ่มเมนูอาหาร';
    document.getElementById('menuName').value = '';
    document.getElementById('menuServings').value = 1;
    document.getElementById('menuExp').value = 0;
    document.getElementById('prepTime').value = '';
    document.getElementById('cookTime').value = '';
    document.getElementById('tagsArea').innerHTML = '';
    const tagSearchInput = document.getElementById('tagSearchInput');
    if (tagSearchInput) {
        tagSearchInput.value = '';
    }
    renderTagSuggestions('');
    document.getElementById('ingredientsList').innerHTML = `
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" placeholder="เช่น สันคอหมู หรือ เนื้อ">
            <span class="thai ing-label">จำนวน</span>
            <input type="number" class="form-input ing-qty" value="1" min="0">
            <input type="text" class="form-input ing-unit thai" placeholder="เช่น กรัม">
            <button class="btn-ing-remove" onclick="removeIngredient(this)">−</button>
        </div>
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" placeholder="เช่น โรสแมรี่สด">
            <span class="thai ing-label">จำนวน</span>
            <input type="number" class="form-input ing-qty" value="1" min="0">
            <input type="text" class="form-input ing-unit thai" placeholder="เช่น ก้าน">
            <button class="btn-ing-remove" onclick="removeIngredient(this)">−</button>
        </div>
    `;
    document.getElementById('stepsList').innerHTML = `
        <div class="step-row">
            <span class="step-num">1.</span>
            <div class="step-content">
                <div class="step-img-upload">
                    <label>
                        <i class="fa-solid fa-image"></i>
                        <span class="thai">เพิ่มไฟล์รูปภาพ</span>
                        <input type="file" accept="image/*" class="hidden">
                    </label>
                </div>
                <div class="step-text-row">
                    <span class="thai step-lbl">วิธีทำ</span>
                    <textarea class="step-textarea thai" placeholder="เช่น ตั้งน้ำให้เดือด"></textarea>
                </div>
            </div>
            <button class="btn-step-remove" onclick="removeStep(this)">−</button>
        </div>
    `;
    document.getElementById('formOverlay').classList.remove('hidden');
}

function openEditForm(button) {
    const item = button.closest('.recipe-item');
    const id = item.getAttribute('data-id');
    currentEditItem = recipes.find(r => r._id === id);
    selectedImageData = currentEditItem.imageURL || '';
    setImagePreview(selectedImageData);

    document.getElementById('formTitle').textContent = 'แก้ไขเมนูอาหาร';
    document.getElementById('menuName').value = currentEditItem.menuName;
    document.getElementById('menuServings').value = currentEditItem.servings || 1;
    document.getElementById('menuExp').value = currentEditItem.EXP ?? 0;
    document.getElementById('prepTime').value = currentEditItem.prepTime || '';
    document.getElementById('cookTime').value = currentEditItem.cookTime || '';
    document.getElementById('tagsArea').innerHTML = (currentEditItem.tags || []).map(tag => `<span class="tag removable thai">${tag} <button onclick="removeTag(this)">X</button></span>`).join('');
    document.getElementById('tagSearchInput').value = '';
    renderTagSuggestions('');
    document.getElementById('ingredientsList').innerHTML = (currentEditItem.ingredients || []).map(ing => `
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" value="${ing.name}">
            <span class="thai ing-label">จำนวน</span>
            <input type="number" class="form-input ing-qty" value="${ing.amount}" min="0">
            <input type="text" class="form-input ing-unit thai" value="${ing.unit}">
            <button class="btn-ing-remove" onclick="removeIngredient(this)">−</button>
        </div>
    `).join('');
    document.getElementById('stepsList').innerHTML = (currentEditItem.instructions || []).map((instr, index) => `
        <div class="step-row">
            <span class="step-num">${instr.stepNumber}.</span>
            <div class="step-content">
                <div class="step-img-upload">
                    <label>
                        <i class="fa-solid fa-image"></i>
                        <span class="thai">เพิ่มไฟล์รูปภาพ</span>
                        <input type="file" accept="image/*" class="hidden" onchange="previewImg(this)">
                    </label>
                </div>
                <div class="step-text-row">
                    <span class="thai step-lbl">วิธีทำ</span>
                    <textarea class="step-textarea thai">${instr.description}</textarea>
                </div>
            </div>
            <button class="btn-step-remove" onclick="removeStep(this)">−</button>
        </div>
    `).join('');
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

let deleteModalCallback = null;

function openDeleteModal(message, onConfirm) {
    const deleteModal = document.getElementById('deleteModal');
    const modalTitle = deleteModal.querySelector('.modal-title');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    modalTitle.textContent = message;
    deleteModal.classList.remove('hidden');
    deleteModalCallback = onConfirm;

    confirmBtn.onclick = async () => {
        console.log('Confirm button clicked, calling callback');
        const callback = deleteModalCallback;
        closeDeleteModal();
        if (typeof callback === 'function') {
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

    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

async function deleteItem(button) {
    console.log('deleteItem called with button:', button);
    const item = button.closest('.recipe-item');
    console.log('Closest item:', item);
    const id = item.getAttribute('data-id');
    console.log('Item id:', id);
    const recipeName = item.querySelector('.item-title')?.textContent.trim() || 'this recipe';
    const deleteMessage = `Delete recipe "${recipeName}"? It will remove this menu from any related quests and may delete quests with no remaining requirements.`;

    openDeleteModal(deleteMessage, async () => {
        console.log('Attempting to delete menu with id:', id);
        try {
            const response = await fetch(`/api/menus/${id}`, {
                method: 'DELETE'
            });
            console.log('Fetch response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                let message = `Deleted recipe "${recipeName}" successfully.`;

                if (data.affectedQuests && data.affectedQuests.length > 0) {
                    message += ` Updated quests: ${data.affectedQuests.join(', ')}.`;
                }
                if (data.deletedQuests && data.deletedQuests.length > 0) {
                    message += ` Deleted quests: ${data.deletedQuests.join(', ')}.`;
                }
                if ((!data.affectedQuests || data.affectedQuests.length === 0) && (!data.deletedQuests || data.deletedQuests.length === 0)) {
                    message += ' No quests were affected.';
                }

                showToast(message, 'success');
                await loadRecipes();
            } else {
                showToast(data.error || 'Failed to delete recipe', 'error');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            showToast('Error deleting recipe', 'error');
        }
    });
}

function removeTag(button) {
    button.parentElement.remove();
}

async function saveRecipe() {
    const menuName = document.getElementById('menuName').value;
    const servings = parseInt(document.getElementById('menuServings').value);
    const EXP = parseInt(document.getElementById('menuExp').value) || 0;
    const prepTime = document.getElementById('prepTime').value;
    const cookTime = document.getElementById('cookTime').value;
    const tags = Array.from(document.querySelectorAll('#tagsArea .tag')).map(tag => tag.textContent.replace(/\s*X$/, '').trim());
    const ingredients = Array.from(document.querySelectorAll('.ingredient-row')).map((row, index) => ({
        name: row.querySelector('.ing-name').value,
        amount: parseFloat(row.querySelector('.ing-qty').value) || 0,
        unit: row.querySelector('.ing-unit').value
    }));
    const instructions = Array.from(document.querySelectorAll('.step-row')).map((row, index) => ({
        stepNumber: index + 1,
        description: row.querySelector('.step-textarea').value
    }));

    if (!menuName) {
        alert('Please fill in the menu name');
        return;
    }

    const recipeData = {
        menuName,
        servings,
        prepTime,
        cookTime,
        EXP,
        createdBy: 'admin', // Default
        imageURL: selectedImageData || (currentEditItem ? currentEditItem.imageURL : ''),
        ingredients,
        instructions,
        tags,
        questIds: [],
        steps: []
    };

    try {
        if (currentEditItem) {
            // Edit existing menu
            const response = await fetch(`/api/menus/${currentEditItem._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recipeData)
            });
            if (!response.ok) {
                throw new Error('Failed to update menu');
            }
        } else {
            // Add new menu
            await fetch('/api/menus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recipeData)
            });
        }

        await loadRecipes();
        closeForm();
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Error saving recipe');
    }
}

function addIngredient() {
    const ingredientsList = document.getElementById('ingredientsList');
    const newRow = document.createElement('div');
    newRow.className = 'ingredient-row';
    newRow.innerHTML = `
        <span class="thai ing-label">วัตถุดิบ</span>
        <input type="text" class="form-input ing-name thai" placeholder="เช่น วัตถุดิบ">
        <span class="thai ing-label">จำนวน</span>
        <input type="number" class="form-input ing-qty" value="1" min="0">
        <input type="text" class="form-input ing-unit thai" placeholder="เช่น หน่วย">
        <button class="btn-ing-remove" onclick="removeIngredient(this)">−</button>
    `;
    ingredientsList.appendChild(newRow);
}

function addStep() {
    const stepsList = document.getElementById('stepsList');
    const stepCount = stepsList.children.length + 1;
    const newRow = document.createElement('div');
    newRow.className = 'step-row';
    newRow.innerHTML = `
        <span class="step-num">${stepCount}.</span>
        <div class="step-content">
            <div class="step-img-upload">
                <label>
                    <i class="fa-solid fa-image"></i>
                    <span class="thai">เพิ่มไฟล์รูปภาพ</span>
                    <input type="file" accept="image/*" class="hidden">
                </label>
            </div>
            <div class="step-text-row">
                <span class="thai step-lbl">วิธีทำ</span>
                <textarea class="step-textarea thai" placeholder="วิธีทำ..."></textarea>
            </div>
        </div>
        <button class="btn-step-remove" onclick="removeStep(this)">−</button>
    `;
    stepsList.appendChild(newRow);
    updateStepNumbers();
}

function updateStepNumbers() {
    const stepRows = document.querySelectorAll('.step-row');
    stepRows.forEach((row, index) => {
        row.querySelector('.step-num').textContent = `${index + 1}.`;
    });
}

function removeIngredient(button) {
    button.closest('.ingredient-row').remove();
}

function removeStep(button) {
    button.closest('.step-row').remove();
    updateStepNumbers();
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

    const src = imageUrl || '../../assets/a-img/placeholder-dish.png';
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
            <img id="imgPreview" src="../../assets/a-img/placeholder-dish.png" alt="Preview" class="image-preview">
        </div>
        <label class="img-upload-label thai">
            <i class="fa-solid fa-image"></i>
            <span>เพิ่มไฟล์รูปภาพ</span>
            <input type="file" accept="image/*" class="hidden" id="imgInput" onchange="previewImg(this)">
        </label>
    `;
}

async function loadTags(search = '') {
    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`/api/tags${query}`);
        if (!response.ok) {
            throw new Error('Failed to load tags');
        }
        availableTags = await response.json();
        renderTagSuggestions(search);
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function handleTagSearchInput(event) {
    const query = event.target.value.trim();
    loadTags(query);
}

function renderTagSuggestions(query) {
    const resultsContainer = document.getElementById('tagSearchResults');
    const tagNewRow = document.getElementById('tagNewRow');
    if (!resultsContainer || !tagNewRow) return;

    const normalizedQuery = query.toLowerCase();
    const matchingTags = availableTags
        .filter(tag => tag.name.toLowerCase().includes(normalizedQuery))
        .slice(0, 10);

    resultsContainer.innerHTML = '';
    matchingTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'tag-search-result';
        item.textContent = tag.name;
        item.addEventListener('click', () => addTag(tag.name));
        resultsContainer.appendChild(item);
    });

    if (query && matchingTags.length === 0) {
        tagNewRow.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'thai';
        label.textContent = 'สร้างใหม่:';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-add-tag';
        button.textContent = query;
        button.addEventListener('click', () => createAndAddTag(query));

        tagNewRow.appendChild(label);
        tagNewRow.appendChild(button);
    } else {
        tagNewRow.innerHTML = '<span class="thai">สร้างใหม่:</span>';
    }
}

function addTag(tagName) {
    const tagsArea = document.getElementById('tagsArea');
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

async function createAndAddTag(tagName) {
    try {
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: tagName })
        });
        if (!response.ok) {
            throw new Error('Failed to create tag');
        }
        const createdTag = await response.json();
        availableTags.push(createdTag);
        addTag(createdTag.name);
        document.getElementById('tagSearchInput').value = '';
        await loadTags('');
        renderTagSuggestions('');
    } catch (error) {
        console.error('Error creating tag:', error);
        alert('ไม่สามารถสร้าง tag ใหม่ได้');
    }
}
