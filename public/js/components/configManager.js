/**
 * Config Manager
 * Handles the display and editing of Materials and Formulas configuration
 */


class ConfigManager {
    constructor() {
        this.materials = {};
        this.formulas = {};
        this.currentSection = 'materials';

        // Formula Editor State
        this.selectedFormulaKey = null;

        // DOM Elements
        this.searchFile = document.getElementById('configSearch');
        this.materialsTableBody = document.querySelector('#configMaterialsTable tbody');
        this.filterMatType = document.getElementById('filterMatType');
        this.filterMatSupplier = document.getElementById('filterMatSupplier');

        this.materialFilters = { type: '', supplier: '' };

        // Formula UI
        this.formulaList = document.getElementById('formulaList');
        this.formulaSearch = document.getElementById('formulaSearchInput');
        this.currentFormulaName = document.getElementById('currentFormulaName');
        this.bomTableBody = document.getElementById('bomTableBody');
        this.bomEmptyState = document.getElementById('bomEmptyState');
        this.addBomItemBtn = document.getElementById('addBomItemBtn');
        this.deleteFormulaBtn = document.getElementById('deleteFormulaBtn');

        this.bindEvents();
    }

    bindEvents() {
        // Tab Switching
        document.querySelectorAll('.config-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.target);
            });
        });

        // Global Save
        document.getElementById('configSaveBtn').addEventListener('click', () => {
            this.saveCurrentConfig();
        });

        // Refresh
        document.getElementById('configRefreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // --- Material Filters ---
        this.filterMatType.addEventListener('change', (e) => {
            this.materialFilters.type = e.target.value;
            this.renderMaterials();
        });

        this.filterMatSupplier.addEventListener('change', (e) => {
            this.materialFilters.supplier = e.target.value;
            this.renderMaterials();
        });




        // --- Formula Editor Events ---
        this.formulaSearch.addEventListener('input', (e) => {
            this.renderFormulaList(e.target.value);
        });

        this.addBomItemBtn.addEventListener('click', () => {
            this.addBomRow();
        });

        // Use event delegation for list selection to handle dynamic items
        this.formulaList.addEventListener('click', (e) => {
            const item = e.target.closest('.formula-item');
            if (item) {
                this.selectFormula(item.dataset.key);
            }
        });
    }

    switchSection(target) {
        this.currentSection = target;
        // ... (unchanged)
        document.querySelectorAll('.config-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === target);
        });
        document.querySelectorAll('.config-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `config-section-${target}`);
        });
    }

    async loadData() {
        try {
            // Load Materials
            const resMat = await fetch('/api/config/materials');
            this.materials = await resMat.json();
            this.populateMaterialFilters();

            // Load Formulas
            const resForm = await fetch('/api/config/formulas');
            this.formulas = await resForm.json();

            this.renderMaterials();
            this.renderFormulaList();

            console.log('✅ Config data loaded');
        } catch (error) {
            console.error('Failed to load config data:', error);
            alert('无法加载配置数据，请检查服务器连接');
        }
    }

    populateMaterialFilters() {
        const types = new Set();
        const suppliers = new Set();
        // Position isn't always single value (comma sep), need to split? 
        // For simplicity, let's just collect unique FULL strings, users can search. 
        // Or better yet, just extract unique words if needed. 
        // Let's stick to simple unique values for the dropdown first, or parse if comma separated.
        const positions = new Set();

        Object.values(this.materials).forEach(m => {
            if (m.type) types.add(m.type);
            if (m.supplier) suppliers.add(m.supplier);
            // Handling comma separated positions for filter
            if (m.position) {
                m.position.split(',').forEach(p => positions.add(p.trim()));
            }
        });

        const sortedTypes = Array.from(types).sort();
        const sortedSuppliers = Array.from(suppliers).sort();
        const sortedPositions = Array.from(positions).sort();

        this.filterMatType.innerHTML = '<option value="">全部</option>' +
            sortedTypes.map(t => `<option value="${t}">${t}</option>`).join('');

        this.filterMatSupplier.innerHTML = '<option value="">全部</option>' +
            sortedSuppliers.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // --- Materials Logic (Simple Table) ---
    renderMaterials() {
        console.log('ConfigManager V1.2: Rendering Materials (No Position Column)');
        this.materialsTableBody.innerHTML = '';
        Object.keys(this.materials).forEach(key => {
            const mat = this.materials[key];

            // Filter Logic
            if (this.materialFilters.type && mat.type !== this.materialFilters.type) return;
            if (this.materialFilters.supplier && mat.supplier !== this.materialFilters.supplier) return;

            const tr = document.createElement('tr');
            tr.dataset.key = key;
            tr.innerHTML = `
                <td><input class="config-input mono" value="${key}" readonly></td>
                <td><input class="config-input" value="${mat.model || ''}" data-field="model"></td>
                <td><input class="config-input type-col" value="${mat.type || ''}" data-field="type"></td>
                <td><input class="config-input" value="${mat.supplier || ''}" data-field="supplier"></td>
                <td><input class="config-input" value="${mat.unit || ''}" data-field="unit"></td>
                <td><input class="config-input" value="${mat.packageSpec || ''}" data-field="packageSpec"></td>
                <td><button class="delete-btn" onclick="configManager.deleteMaterial('${key}')">Del</button></td>
            `;
            this.materialsTableBody.appendChild(tr);
        });
    }

    // --- Formulas Logic (Master-Detail) ---
    renderFormulaList(filter = '') {
        this.formulaList.innerHTML = '';
        const keys = Object.keys(this.formulas).sort();

        keys.forEach(key => {
            if (filter && !key.toLowerCase().includes(filter.toLowerCase())) return;

            const div = document.createElement('div');
            div.className = `formula-item ${this.selectedFormulaKey === key ? 'active' : ''}`;
            div.dataset.key = key;
            div.textContent = key;
            this.formulaList.appendChild(div);
        });

        // Auto-select first item if none selected and no filter
        if (!this.selectedFormulaKey && keys.length > 0 && !filter) {
            this.selectFormula(keys[0]);
        }
    }

    selectFormula(key) {
        this.selectedFormulaKey = key;

        // Update selection UI
        this.formulaList.querySelectorAll('.formula-item').forEach(el => {
            el.classList.toggle('active', el.dataset.key === key);
        });

        // Render Detail View
        this.renderFormulaDetail(key);
    }

    renderFormulaDetail(key) {
        const formula = this.formulas[key];
        if (!formula) return;

        this.currentFormulaName.textContent = key;
        this.bomEmptyState.style.display = 'none';
        this.addBomItemBtn.disabled = false;
        this.deleteFormulaBtn.disabled = false;

        this.bomTableBody.innerHTML = '';

        if (formula.bom) {
            formula.bom.forEach(item => {
                this.addBomRowUI(item);
            });
        }
    }

    addBomRow() {
        // Add empty row
        this.addBomRowUI({
            materialId: '',
            usage: { single: 0, double: 0, paired: 0 }
        });
    }

    addBomRowUI(item) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="autocomplete-wrapper">
                    <input class="config-input material-search" value="${item.materialId}" placeholder="输入搜配件...">
                    <div class="suggestions-list"></div>
                </div>
            </td>
            <td><input class="config-input" value="${item.position || ''}" placeholder="如:门架" data-field="position"></td>
            <td><input class="config-input" type="number" step="0.01" value="${item.usage.single}" data-field="single"></td>
            <td><input class="config-input" type="number" step="0.01" value="${item.usage.double}" data-field="double"></td>
            <td><input class="config-input" type="number" step="0.01" value="${item.usage.paired}" data-field="paired"></td>
            <td><button class="delete-btn">x</button></td>
        `;

        // Bind delete
        tr.querySelector('.delete-btn').addEventListener('click', () => tr.remove());

        // Bind Search/Autocomplete
        const input = tr.querySelector('.material-search');
        const list = tr.querySelector('.suggestions-list');

        // Basic Auto-calc logic: Double = Single * 2
        const singleInput = tr.querySelector('[data-field="single"]');
        const doubleInput = tr.querySelector('[data-field="double"]');
        singleInput.addEventListener('change', () => {
            if (doubleInput.value == 0 || doubleInput.value == '') {
                doubleInput.value = (parseFloat(singleInput.value) * 2).toFixed(2);
            }
        });

        // Autocomplete Logic
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 1) {
                list.classList.remove('show');
                return;
            }

            // Search in materials
            const matches = Object.values(this.materials).filter(m =>
                (m.id && m.id.toLowerCase().includes(query)) ||
                (m.model && m.model.toLowerCase().includes(query))
            ).slice(0, 10);

            if (matches.length > 0) {
                list.innerHTML = matches.map(m => `
                    <div class="suggestion-item" data-id="${m.id}">
                        ${m.id} <span class="sub">${m.model}</span>
                    </div>
                `).join('');
                list.classList.add('show');
            } else {
                list.classList.remove('show');
            }
        });

        // Click suggestion
        list.addEventListener('click', (e) => {
            const suggestion = e.target.closest('.suggestion-item');
            if (suggestion) {
                input.value = suggestion.dataset.id;
                list.classList.remove('show');
            }
        });

        // Hide on blur (delayed)
        input.addEventListener('blur', () => {
            setTimeout(() => list.classList.remove('show'), 200);
        });

        this.bomTableBody.appendChild(tr);
    }

    async saveCurrentConfig() {
        if (this.currentSection === 'materials') {
            await this.saveMaterials();
        } else {
            await this.saveFormulas();
        }
    }

    async saveMaterials() {
        // Dynamic import to avoid module ordering issues if not using a bundler
        const { DataNormalizer } = await import('../utils/dataNormalizer.js');

        const newMaterials = {};
        const rows = this.materialsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const key = row.dataset.key;
            if (!key) return;
            const inputs = row.querySelectorAll('input');

            // Reconstruct raw object from UI inputs
            const rawMat = {
                id: key,
                model: inputs[1].value,
                type: inputs[2].value,
                supplier: inputs[3].value,
                unit: inputs[4].value,
                packageSpec: inputs[5].value
            };

            // Normalize before saving to ensure defaults and structure
            newMaterials[key] = DataNormalizer.normalizeMaterial(key, rawMat);
        });
        await this.postConfig('/api/config/materials', newMaterials, '材料库');
    }

    async saveFormulas() {
        // Save logic must now considering we might be editing one formula OR we need to save ALL state?
        // Current API saves ALL formulas. This is risky if we only edit one in UI but memory state isn't synced.
        // But since we load all into `this.formulas` and only edit one in DOM, we must SYNC the DOM back to `this.formulas` before full save.

        if (this.selectedFormulaKey) {
            this.syncCurrentFormulaFromDOM();
        }

        await this.postConfig('/api/config/formulas', this.formulas, '颜色配方');
    }

    syncCurrentFormulaFromDOM() {
        if (!this.selectedFormulaKey) return;

        const rows = this.bomTableBody.querySelectorAll('tr');
        const newBom = [];

        rows.forEach(row => {
            const matId = row.querySelector('.material-search').value;
            if (!matId) return;

            const inputs = row.querySelectorAll('input[type="number"]');
            const positionInput = row.querySelector('[data-field="position"]');

            newBom.push({
                materialId: matId,
                position: positionInput ? positionInput.value : '通用',
                usage: {
                    single: parseFloat(inputs[0].value) || 0,
                    double: parseFloat(inputs[1].value) || 0,
                    paired: parseFloat(inputs[2].value) || 0
                }
            });
        });

        this.formulas[this.selectedFormulaKey].bom = newBom;
    }

    async postConfig(url, data, name) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert(`${name}已保存!`);
            } else {
                alert('保存失败');
            }
        } catch (e) {
            console.error(e);
            alert('保存错误');
        }
    }

    deleteMaterial(key) {
        if (confirm('Delete ' + key + '?')) {
            const row = this.materialsTableBody.querySelector(`tr[data-key="${key}"]`);
            if (row) row.remove();
        }
    }
}

// Export and Init
window.ConfigManager = ConfigManager;
const configManager = new ConfigManager();
window.configManager = configManager;
