// e-menu.js - Handles functionality for e-menu admin page

// Global variables
let deleteMode = false;
let currentEditItem = null;
let recipes = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadRecipes();
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
            <button class="item-delete-btn hidden" onclick="deleteItem(this)"><i class="fa-solid fa-minus"></i></button>
            <div class="item-img">
                <img src="${recipe.imageURL || '../../assets/a-img/placeholder-dish.png'}" alt="dish">
            </div>
            <div class="item-info">
                <span class="item-title thai">${recipe.menuName}</span>
                <div class="tag-list">
                    ${recipe.tags.map(tag => `<span class="tag thai">${tag}</span>`).join('')}
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
        recipes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === 'za') {
        recipes.sort((a, b) => b.name.localeCompare(a.name));
    }

    renderRecipes();
    toggleSortDropdown();
}

function openAddForm() {
    currentEditItem = null;
    document.getElementById('formTitle').textContent = 'เพิ่มเมนูอาหาร';
    document.getElementById('menuName').value = '';
    document.getElementById('menuServings').value = 1;
    document.getElementById('prepTime').value = '';
    document.getElementById('cookTime').value = '';
    document.getElementById('tagsArea').innerHTML = '<span class="tag removable thai">เมนูทอด <button onclick="removeTag(this)">X</button></span><span class="tag removable thai">เมนูไข่ <button onclick="removeTag(this)">X</button></span>';
    document.getElementById('ingredientsList').innerHTML = `
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" placeholder="สันคอหมู หรือ เนื้อ">
            <span class="thai ing-label">จำนวน</span>
            <input type="text" class="form-input ing-qty" value="1">
            <input type="text" class="form-input ing-unit thai" placeholder="กรัม">
            <button class="btn-ing-remove" onclick="removeIngredient(this)">−</button>
        </div>
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" placeholder="โรสแมรี่สด">
            <span class="thai ing-label">จำนวน</span>
            <input type="text" class="form-input ing-qty" value="1">
            <input type="text" class="form-input ing-unit thai" placeholder="กาน">
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
                    <textarea class="step-textarea thai" placeholder="ตั้งน้ำให้เดือด"></textarea>
                </div>
            </div>
            <button class="btn-step-remove" onclick="removeStep(this)">−</button>
        </div>
        <div class="step-row">
            <span class="step-num">2.</span>
            <div class="step-content">
                <label>
                    <i class="fa-solid fa-image"></i>
                    <span class="thai">เพิ่มไฟล์รูปภาพ</span>
                    <input type="file" accept="image/*" class="hidden">
                </label>
            </div>
            <div class="step-text-row">
                <span class="thai step-lbl">วิธีทำ</span>
                <textarea class="step-textarea thai" placeholder="ใส่เครื่องสมุนไพรลงไป"></textarea>
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

    document.getElementById('formTitle').textContent = 'แก้ไขเมนูอาหาร';
    document.getElementById('menuName').value = currentEditItem.menuName;
    document.getElementById('menuServings').value = currentEditItem.servings || 1;
    document.getElementById('prepTime').value = currentEditItem.prepTime || '';
    document.getElementById('cookTime').value = currentEditItem.cookTime || '';
    document.getElementById('tagsArea').innerHTML = currentEditItem.tags.map(tag => `<span class="tag removable thai">${tag} <button onclick="removeTag(this)">X</button></span>`).join('');
    document.getElementById('ingredientsList').innerHTML = (currentEditItem.ingredients || []).map(ing => `
        <div class="ingredient-row">
            <span class="thai ing-label">วัตถุดิบ</span>
            <input type="text" class="form-input ing-name thai" value="${ing.name}">
            <span class="thai ing-label">จำนวน</span>
            <input type="text" class="form-input ing-qty" value="${ing.amount}">
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
                        <input type="file" accept="image/*" class="hidden">
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

async function deleteItem(button) {
    const item = button.closest('.recipe-item');
    const id = item.getAttribute('data-id');

    if (confirm('Are you sure you want to delete this recipe?')) {
        try {
            const response = await fetch(`/api/menus/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await loadRecipes();
            } else {
                alert('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe');
        }
    }
}

function removeTag(button) {
    button.parentElement.remove();
}

async function saveRecipe() {
    const menuName = document.getElementById('menuName').value;
    const servings = parseInt(document.getElementById('menuServings').value);
    const prepTime = document.getElementById('prepTime').value;
    const cookTime = document.getElementById('cookTime').value;
    const tags = Array.from(document.querySelectorAll('#tagsArea .tag')).map(tag => tag.textContent.replace(' X', ''));
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
        EXP: 0, // Default values
        prepareTime: 0,
        cookingTime: 0,
        createdBy: 'admin', // Default
        imageURL: '',
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
        <input type="text" class="form-input ing-name thai" placeholder="วัตถุดิบ">
        <span class="thai ing-label">จำนวน</span>
        <input type="text" class="form-input ing-qty" value="1">
        <input type="text" class="form-input ing-unit thai" placeholder="หน่วย">
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
    // Implement image preview
    console.log('Preview image');
}