
import { loadMaterialsCatalog, loadColorFormulas, MATERIALS_CATALOG, COLOR_FORMULAS } from '../config/index.js';
import { DataNormalizer } from '../utils/dataNormalizer.js';

const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

export const ConfigPanel = {
    template: '#config-panel-template',
    setup() {
        const currentTab = ref('materials');
        const searchQuery = ref('');
        const formulaSearch = ref('');

        // Data
        const materials = ref([]);
        const formulas = ref({});

        // Filters
        const filterType = ref('');
        const filterSupplier = ref('');

        // Selection
        const selectedColor = ref(null);

        // New Item State
        const newMaterial = reactive({
            id: '', model: '', type: '', supplier: '', unit: ''
        });

        // Computed: Unique Types/Suppliers for filter
        const uniqueTypes = computed(() => [...new Set(materials.value.map(m => m.type).filter(Boolean))]);
        const uniqueSuppliers = computed(() => [...new Set(materials.value.map(m => m.supplier).filter(Boolean))]);

        // Computed: Filtered Materials
        const filteredMaterials = computed(() => {
            return materials.value.filter(item => {
                const matchSearch = !searchQuery.value ||
                    (item.model && item.model.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
                    (item.id && item.id.toLowerCase().includes(searchQuery.value.toLowerCase()));
                const matchType = !filterType.value || item.type === filterType.value;
                const matchSupplier = !filterSupplier.value || item.supplier === filterSupplier.value;
                return matchSearch && matchType && matchSupplier;
            });
        });

        // Pagination
        const currentPage = ref(1);
        const itemsPerPage = 50;

        const totalPages = computed(() => Math.ceil(filteredMaterials.value.length / itemsPerPage));

        const paginatedMaterials = computed(() => {
            const start = (currentPage.value - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            return filteredMaterials.value.slice(start, end);
        });

        // Watchers to reset pagination
        watch([searchQuery, filterType, filterSupplier], () => {
            currentPage.value = 1;
        });

        const nextPage = () => {
            if (currentPage.value < totalPages.value) currentPage.value++;
        };

        const prevPage = () => {
            if (currentPage.value > 1) currentPage.value--;
        };

        // Computed: Filtered Formulas
        const filteredFormulas = computed(() => {
            if (!formulaSearch.value) return formulas.value;
            const result = {};
            for (const [key, val] of Object.entries(formulas.value)) {
                if (key.toLowerCase().includes(formulaSearch.value.toLowerCase())) {
                    result[key] = val;
                }
            }
            return result;
        });

        // Computed: Current BOM
        const currentFormula = computed(() => {
            if (!selectedColor.value) return {};
            return formulas.value[selectedColor.value];
        });

        // Actions
        const loadData = async () => {
            await Promise.all([loadMaterialsCatalog(), loadColorFormulas()]);

            // Convert Object catalog to Array for table
            // MATERIALS_CATALOG structure: { "id": { id, model, type... } }
            materials.value = Object.values(MATERIALS_CATALOG);
            formulas.value = COLOR_FORMULAS;
            console.log('Vue ConfigPanel loaded data');
        };

        const refreshData = async () => {
            await loadData();
        };

        const saveData = async () => {
            try {
                // 1. Prepare Materials Data (Convert Array back to Object Keyed by ID)
                const materialsObj = {};
                materials.value.forEach(item => {
                    if (item.id) materialsObj[item.id] = item;
                });

                // 2. Save Materials
                const matResponse = await fetch('/api/config/materials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(materialsObj)
                });

                // 3. Save Formulas
                const formResponse = await fetch('/api/config/formulas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formulas.value)
                });

                if (matResponse.ok && formResponse.ok) {
                    alert('✅ 保存成功！');
                } else {
                    throw new Error('API Error');
                }
            } catch (error) {
                console.error('Save failed', error);
                alert('❌ 保存失败，请检查控制台/网络');
            }
        };

        // Material Actions
        const addMaterial = () => {
            if (!newMaterial.id || !newMaterial.model) return alert('ID and Model required');
            materials.value.unshift({ ...newMaterial });
            // Reset
            Object.keys(newMaterial).forEach(k => newMaterial[k] = '');
        };

        const removeMaterial = (id) => {
            if (confirm('Are you sure?')) {
                materials.value = materials.value.filter(m => m.id !== id);
            }
        };

        // Formula Actions
        const selectColor = (color) => {
            selectedColor.value = color;
        };

        const addNewFormula = () => {
            const name = prompt('输入新颜色名称:');
            if (name && !formulas.value[name]) {
                formulas.value[name] = {};
                selectedColor.value = name;
            }
        };

        const deleteFormula = () => {
            if (selectedColor.value && confirm(`删除配方 ${selectedColor.value}?`)) {
                delete formulas.value[selectedColor.value];
                selectedColor.value = null;
            }
        };

        const addBomItem = () => {
            if (!selectedColor.value) return;
            const formula = formulas.value[selectedColor.value];
            if (!formula.bom) formula.bom = [];

            formula.bom.push({
                position: '通用',
                materialId: '',
                usage: { single: 0, double: 0, mother_son: 0 }
            });
        };

        const removeBomItem = (index) => {
            if (selectedColor.value && formulas.value[selectedColor.value]?.bom) {
                formulas.value[selectedColor.value].bom.splice(index, 1);
            }
        };

        onMounted(() => {
            loadData();
        });

        return {
            currentTab,
            searchQuery,
            formulaSearch,
            materials,
            formulas,
            filterType,
            filterSupplier,
            uniqueTypes,
            uniqueSuppliers,
            filteredMaterials,
            filteredFormulas,
            selectedColor,
            currentFormula,
            newMaterial,

            refreshData,
            saveData,
            addMaterial,
            removeMaterial,
            selectColor,
            addNewFormula,
            deleteFormula,
            addBomItem,
            removeBomItem,

            // Pagination
            currentPage,
            totalPages,
            paginatedMaterials,
            nextPage,
            prevPage
        };
    }
};
