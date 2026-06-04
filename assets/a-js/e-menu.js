// e-menu.js - Handles functionality for e-menu admin page

let CATEGORIES_LIST = [];

async function loadCategories() {
    try {
        const response = await fetch('/api/tags');
        if (response.ok) {
            const tags = await response.json();
            CATEGORIES_LIST = tags.map(t => t.name);
            renderCategoryQuickSelect();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoryQuickSelect() {
    const container = document.getElementById('categoryQuickSelect');
    if (!container) return;
    
    container.innerHTML = CATEGORIES_LIST.map(category => {
        return `<button type="button" class="category-badge-opt" data-category="${category}" onclick="toggleCategoryTag('${category}')">${category}</button>`;
    }).join('');
    
    syncCategoryBadges();
}

function syncCategoryBadges() {
    const tagsArea = document.getElementById('tagsArea');
    if (!tagsArea) return;
    
    const currentTags = Array.from(tagsArea.querySelectorAll('.tag')).map(tag => {
        return tag.textContent.replace(/\s*X$/, '').trim();
    });
    
    document.querySelectorAll('.category-badge-opt').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        if (currentTags.includes(cat)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function toggleCategoryTag(categoryName) {
    const tagsArea = document.getElementById('tagsArea');
    if (!tagsArea) return;
    
    const currentTags = Array.from(tagsArea.querySelectorAll('.tag')).map(tag => {
        return tag.textContent.replace(/\s*X$/, '').trim();
    });
    
    if (currentTags.includes(categoryName)) {
        const tagElements = Array.from(tagsArea.querySelectorAll('.tag'));
        const elementToRemove = tagElements.find(tag => tag.textContent.replace(/\s*X$/, '').trim() === categoryName);
        if (elementToRemove) {
            elementToRemove.remove();
        }
    } else {
        addTag(categoryName);
    }
    
    syncCategoryBadges();
}

// Global variables
let deleteMode = false;
let currentEditItem = null;
let recipes = [];
let selectedImageData = '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadRecipes();
    loadCategories();
    setupMenuEventListeners();

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
                <img src="${recipe.imageURL || '../../assets/a-img/placeholder-dish.png'}" alt="dish"${recipe.hasImage ? ` data-lazy-menu-id="${recipe._id}"` : ''}>
            </div>
            <div class="item-info">
                <div class="recipe-title-row">
                    <span class="item-title thai">${recipe.menuName}</span>
                    <span class="recipe-exp">${recipe.EXP ?? 0} EXP</span>
                </div>
                <div class="tag-list">
                    ${(recipe.tags || []).map(tag => `<span class="tag thai">${tag}</span>`).join('')}
                </div>
            </div>
            <button class="btn-edit" onclick="openEditForm(this)">Edit</button>
        `;

        recipeList.appendChild(recipeItem);
    });

    if (typeof setupLazyMenuImages === 'function') {
        setupLazyMenuImages(recipeList, { fallback: '../../assets/a-img/placeholder-dish.png' });
    }
    filterRecipes();
}

let currentSortName = 'none';
let currentSortExp = 'none';

function setupMenuEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', filterRecipes);

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

                sortRecipes();
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
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase();
    const recipeItems = document.querySelectorAll('.recipe-item');

    recipeItems.forEach(item => {
        const name = item.querySelector('.item-title').textContent.toLowerCase();
        const tags = Array.from(item.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

        const matches = name.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm));
        item.style.display = matches ? 'flex' : 'none';
    });
}

function sortRecipes() {
    recipes.sort((a, b) => {
        if (currentSortName !== 'none') {
            const nameA = a.menuName || "";
            const nameB = b.menuName || "";
            if (currentSortName === 'asc') return nameA.localeCompare(nameB, 'th');
            if (currentSortName === 'desc') return nameB.localeCompare(nameA, 'th');
        }

        if (currentSortExp !== 'none') {
            const expA = parseInt(a.EXP) || 0;
            const expB = parseInt(b.EXP) || 0;
            if (currentSortExp === 'low') return expA - expB;
            if (currentSortExp === 'high') return expB - expA;
        }

        return 0;
    });

    renderRecipes();
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
    if (typeof renderCategoryQuickSelect === 'function') {
        renderCategoryQuickSelect();
    }
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
                        <input type="file" accept="image/*" class="hidden" onchange="previewStepImg(this)">
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
    openEditFormById(id);
}

async function openEditFormById(id) {
    try {
        const response = await fetch(`/api/menus/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load menu');
        }
        currentEditItem = await response.json();
    } catch (error) {
        console.error('Error loading menu for edit:', error);
        showToast('Failed to load menu details', 'error');
        return;
    }

    selectedImageData = currentEditItem.imageURL || '';
    setImagePreview(selectedImageData);

    document.getElementById('formTitle').textContent = 'แก้ไขเมนูอาหาร';
    document.getElementById('menuName').value = currentEditItem.menuName;
    document.getElementById('menuServings').value = currentEditItem.servings || 1;
    document.getElementById('menuExp').value = currentEditItem.EXP ?? 0;
    document.getElementById('prepTime').value = parseInt(currentEditItem.prepTime) || '';
    document.getElementById('cookTime').value = parseInt(currentEditItem.cookTime) || '';
    document.getElementById('tagsArea').innerHTML = (currentEditItem.tags || []).map(tag => `<span class="tag removable thai">${tag} <button onclick="removeTag(this)">X</button></span>`).join('');
    if (typeof renderCategoryQuickSelect === 'function') {
        renderCategoryQuickSelect();
    }
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
    document.getElementById('stepsList').innerHTML = (currentEditItem.instructions || []).map((instr, index) => {
        const stepImageHtml = instr.stepImageURL ? `
            <div class="step-image-preview-wrapper" style="margin-bottom: 8px; position: relative; display: inline-block;">
                <img class="step-preview-img" src="${instr.stepImageURL}" style="max-height: 120px; border-radius: 6px; display: block; object-fit: cover;">
                <button type="button" class="btn-clear-step-img" onclick="clearStepImg(this)" style="position: absolute; top: 4px; right: 4px; background: rgba(255, 0, 0, 0.7); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px;">✕</button>
            </div>
        ` : '';
        const labelText = instr.stepImageURL ? 'แก้ไขรูปภาพ' : 'เพิ่มไฟล์รูปภาพ';
        return `
            <div class="step-row">
                <span class="step-num">${instr.stepNumber}.</span>
                <div class="step-content">
                    <div class="step-img-upload">
                        ${stepImageHtml}
                        <label>
                            <i class="fa-solid fa-image"></i>
                            <span class="thai">${labelText}</span>
                            <input type="file" accept="image/*" class="hidden" onchange="previewStepImg(this)">
                        </label>
                    </div>
                    <div class="step-text-row">
                        <span class="thai step-lbl">วิธีทำ</span>
                        <textarea class="step-textarea thai">${instr.description}</textarea>
                    </div>
                </div>
                <button class="btn-step-remove" onclick="removeStep(this)">−</button>
            </div>
        `;
    }).join('');
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
            const token = localStorage.getItem('authToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`/api/menus/${id}`, {
                method: 'DELETE',
                headers: headers
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
    if (typeof syncCategoryBadges === 'function') {
        syncCategoryBadges();
    }
}

async function saveRecipe() {
    const saveBtn = document.querySelector('.btn-save');
    if (window.isMenuSaving || (saveBtn && (saveBtn.disabled || saveBtn.getAttribute('data-saving') === 'true'))) return;
    window.isMenuSaving = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.setAttribute('data-saving', 'true');
        saveBtn.style.pointerEvents = 'none';
    }

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
    const instructions = Array.from(document.querySelectorAll('.step-row')).map((row, index) => {
        const previewImg = row.querySelector('.step-preview-img');
        const stepImageURL = previewImg ? previewImg.src : '';
        return {
            stepNumber: index + 1,
            description: row.querySelector('.step-textarea').value,
            stepImageURL: stepImageURL
        };
    });

    if (!menuName.trim()) {
        alert('กรุณากรอกชื่อเมนูอาหาร');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    if (isNaN(servings) || servings <= 0) {
        alert('กรุณากรอกจำนวนจานให้ถูกต้อง (มากกว่า 0)');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    if (isNaN(EXP) || EXP <= 0) {
        alert('กรุณากรอกค่า EXP ให้ถูกต้อง (มากกว่า 0)');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    if (!prepTime.trim() || isNaN(parseInt(prepTime)) || parseInt(prepTime) < 0) {
        alert('กรุณากรอกเวลาเตรียมอาหารให้ถูกต้อง');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    if (!cookTime.trim() || isNaN(parseInt(cookTime)) || parseInt(cookTime) < 0) {
        alert('กรุณากรอกเวลาปรุงอาหารให้ถูกต้อง');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    if (tags.length === 0) {
        alert('กรุณาเลือกอย่างน้อย 1 หมวดหมู่');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    
    const menuImage = selectedImageData || (currentEditItem ? currentEditItem.imageURL : '');
    if (!menuImage) {
        alert('กรุณาอัปโหลดรูปภาพเมนูอาหาร');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    if (ingredients.length === 0) {
        alert('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (!ing.name.trim() || isNaN(ing.amount) || ing.amount <= 0 || !ing.unit.trim()) {
            alert(`กรุณากรอกข้อมูลวัตถุดิบรายการที่ ${i + 1} ให้ครบถ้วน (ชื่อวัตถุดิบ, จำนวนที่มากกว่า 0, หน่วย)`);
            window.isMenuSaving = false;
            if (saveBtn) saveBtn.disabled = false;
            return;
        }
    }

    if (instructions.length === 0) {
        alert('กรุณาเพิ่มขั้นตอนการทำอย่างน้อย 1 ขั้นตอน');
        window.isMenuSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    for (let i = 0; i < instructions.length; i++) {
        const step = instructions[i];
        if (!step.description.trim()) {
            alert(`กรุณากรอกวิธีทำของขั้นตอนที่ ${i + 1} ให้เรียบร้อย`);
            window.isMenuSaving = false;
            if (saveBtn) saveBtn.disabled = false;
            return;
        }
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
        const token = localStorage.getItem('authToken');
        if (currentEditItem) {
            // Edit existing menu
            const response = await fetch(`/api/menus/${currentEditItem._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(recipeData)
            });
        }

        await loadRecipes();
        closeForm();
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Error saving recipe');
        if (saveBtn) saveBtn.disabled = false;
    } finally {
        window.isMenuSaving = false;
        if (saveBtn) {
            saveBtn.removeAttribute('data-saving');
            saveBtn.disabled = false;
            saveBtn.style.pointerEvents = '';
        }
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
                    <input type="file" accept="image/*" class="hidden" onchange="previewStepImg(this)">
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

function previewStepImg(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const dataUrl = event.target.result;
        const uploadContainer = input.closest('.step-img-upload');
        if (!uploadContainer) return;

        let previewWrapper = uploadContainer.querySelector('.step-image-preview-wrapper');
        if (!previewWrapper) {
            previewWrapper = document.createElement('div');
            previewWrapper.className = 'step-image-preview-wrapper';
            previewWrapper.style.cssText = 'margin-bottom: 8px; position: relative; display: inline-block;';
            previewWrapper.innerHTML = `
                <img class="step-preview-img" src="" style="max-height: 120px; border-radius: 6px; display: block; object-fit: cover;">
                <button type="button" class="btn-clear-step-img" onclick="clearStepImg(this)" style="position: absolute; top: 4px; right: 4px; background: rgba(255, 0, 0, 0.7); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px;">✕</button>
            `;
            // Insert before the label
            uploadContainer.insertBefore(previewWrapper, uploadContainer.querySelector('label'));
        }

        const previewImg = previewWrapper.querySelector('.step-preview-img');
        if (previewImg) {
            previewImg.src = dataUrl;
        }

        const labelSpan = uploadContainer.querySelector('label span');
        if (labelSpan) {
            labelSpan.textContent = 'แก้ไขรูปภาพ';
        }
    };
    reader.readAsDataURL(file);
}

function clearStepImg(button) {
    const uploadContainer = button.closest('.step-img-upload');
    if (!uploadContainer) return;

    const previewWrapper = uploadContainer.querySelector('.step-image-preview-wrapper');
    if (previewWrapper) {
        previewWrapper.remove();
    }

    const fileInput = uploadContainer.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.value = '';
    }

    const labelSpan = uploadContainer.querySelector('label span');
    if (labelSpan) {
        labelSpan.textContent = 'เพิ่มไฟล์รูปภาพ';
    }
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
    if (typeof syncCategoryBadges === 'function') {
        syncCategoryBadges();
    }
}
