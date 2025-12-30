const { createApp } = Vue;

createApp({
    data() {
        return {
            // 商品列表
            products: [],
            // 当前选中的商品
            currentProduct: this.getEmptyProduct(),
            // 库存操作数据
            stockOperation: {
                quantity: null,
                reason: ''
            },
            // 库存记录
            inventoryRecords: [],
            // 统计数据
            statistics: {
                totalProducts: 0,
                totalQuantity: 0,
                totalValue: 0,
                lowStockCount: 0
            },
            // 搜索关键词
            searchKeyword: '',
            // 对话框状态
            dialogs: {
                product: false,
                stockIn: false,
                stockOut: false,
                details: false
            },
            // 是否编辑模式
            isEditing: false,
            // 加载状态
            loading: false,
            // 消息提示
            message: {
                show: false,
                type: 'success',
                text: ''
            }
        };
    },

    mounted() {
        // 页面加载时获取数据
        this.loadProducts();
        this.loadStatistics();
    },

    methods: {
        // ==================== 数据加载 ====================

        async loadProducts() {
            this.loading = true;
            try {
                const url = this.searchKeyword
                    ? `/api/products?search=${encodeURIComponent(this.searchKeyword)}`
                    : '/api/products';

                const response = await fetch(url);
                const result = await response.json();

                if (result.success) {
                    this.products = result.data;
                } else {
                    this.showMessage('获取商品列表失败', 'error');
                }
            } catch (error) {
                console.error('获取商品列表失败:', error);
                this.showMessage('网络错误，请稍后重试', 'error');
            } finally {
                this.loading = false;
            }
        },

        async loadStatistics() {
            try {
                const response = await fetch('/api/inventory/statistics');
                const result = await response.json();

                if (result.success) {
                    const overview = result.data.overview;
                    this.statistics = {
                        totalProducts: overview.totalProducts || 0,
                        totalQuantity: overview.totalQuantity || 0,
                        totalValue: overview.totalValue || 0,
                        lowStockCount: result.data.lowStockCount || 0
                    };
                }
            } catch (error) {
                console.error('获取统计数据失败:', error);
            }
        },

        async loadInventoryRecords(productId) {
            try {
                const response = await fetch(`/api/inventory/records?productId=${productId}&limit=10`);
                const result = await response.json();

                if (result.success) {
                    this.inventoryRecords = result.data;
                }
            } catch (error) {
                console.error('获取库存记录失败:', error);
            }
        },

        // ==================== 搜索功能 ====================

        searchProducts() {
            this.loadProducts();
        },

        async showLowStock() {
            this.loading = true;
            try {
                const response = await fetch('/api/products/low-stock');
                const result = await response.json();

                if (result.success) {
                    this.products = result.data;
                    if (result.data.length === 0) {
                        this.showMessage('太棒了！当前没有低库存商品', 'success');
                    } else {
                        this.showMessage(`发现 ${result.data.length} 个低库存商品`, 'warning');
                    }
                }
            } catch (error) {
                console.error('获取低库存商品失败:', error);
                this.showMessage('获取低库存商品失败', 'error');
            } finally {
                this.loading = false;
            }
        },

        // ==================== 商品管理 ====================

        showAddProductDialog() {
            this.isEditing = false;
            this.currentProduct = this.getEmptyProduct();
            this.dialogs.product = true;
        },

        showEditDialog(product) {
            this.isEditing = true;
            this.currentProduct = { ...product };
            this.dialogs.product = true;
        },

        closeProductDialog() {
            this.dialogs.product = false;
            this.currentProduct = this.getEmptyProduct();
        },

        async saveProduct() {
            // 数据验证
            if (!this.currentProduct.code || !this.currentProduct.name) {
                this.showMessage('商品编号和名称不能为空', 'error');
                return;
            }

            try {
                let response;
                if (this.isEditing) {
                    // 更新商品
                    response = await fetch(`/api/products/${this.currentProduct.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.currentProduct)
                    });
                } else {
                    // 创建商品
                    response = await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.currentProduct)
                    });
                }

                const result = await response.json();

                if (result.success) {
                    this.showMessage(this.isEditing ? '商品更新成功' : '商品创建成功', 'success');
                    this.closeProductDialog();
                    this.loadProducts();
                    this.loadStatistics();
                } else {
                    this.showMessage(result.error || '操作失败', 'error');
                }
            } catch (error) {
                console.error('保存商品失败:', error);
                this.showMessage('操作失败，请稍后重试', 'error');
            }
        },

        async deleteProduct(product) {
            if (!confirm(`确定要删除商品 "${product.name}" 吗？`)) {
                return;
            }

            try {
                const response = await fetch(`/api/products/${product.id}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    this.showMessage('商品已禁用', 'success');
                    this.loadProducts();
                    this.loadStatistics();
                } else {
                    this.showMessage(result.error || '删除失败', 'error');
                }
            } catch (error) {
                console.error('删除商品失败:', error);
                this.showMessage('删除失败，请稍后重试', 'error');
            }
        },

        // ==================== 库存操作 ====================

        showStockInDialog(product) {
            this.currentProduct = { ...product };
            this.stockOperation = { quantity: null, reason: '' };
            this.dialogs.stockIn = true;
        },

        closeStockInDialog() {
            this.dialogs.stockIn = false;
            this.stockOperation = { quantity: null, reason: '' };
        },

        async confirmStockIn() {
            if (!this.stockOperation.quantity || this.stockOperation.quantity <= 0) {
                this.showMessage('请输入有效的入库数量', 'error');
                return;
            }

            try {
                const response = await fetch('/api/inventory/in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: this.currentProduct.id,
                        quantity: this.stockOperation.quantity,
                        reason: this.stockOperation.reason || '入库'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.showMessage(result.message || '入库成功', 'success');
                    this.closeStockInDialog();
                    this.loadProducts();
                    this.loadStatistics();
                } else {
                    this.showMessage(result.error || '入库失败', 'error');
                }
            } catch (error) {
                console.error('入库失败:', error);
                this.showMessage('入库失败，请稍后重试', 'error');
            }
        },

        showStockOutDialog(product) {
            this.currentProduct = { ...product };
            this.stockOperation = { quantity: null, reason: '' };
            this.dialogs.stockOut = true;
        },

        closeStockOutDialog() {
            this.dialogs.stockOut = false;
            this.stockOperation = { quantity: null, reason: '' };
        },

        async confirmStockOut() {
            if (!this.stockOperation.quantity || this.stockOperation.quantity <= 0) {
                this.showMessage('请输入有效的出库数量', 'error');
                return;
            }

            if (this.stockOperation.quantity > this.currentProduct.quantity) {
                this.showMessage('出库数量不能大于当前库存', 'error');
                return;
            }

            try {
                const response = await fetch('/api/inventory/out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: this.currentProduct.id,
                        quantity: this.stockOperation.quantity,
                        reason: this.stockOperation.reason || '出库'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.showMessage(result.message || '出库成功', 'success');
                    if (result.warning) {
                        setTimeout(() => {
                            this.showMessage(result.warning, 'warning');
                        }, 2000);
                    }
                    this.closeStockOutDialog();
                    this.loadProducts();
                    this.loadStatistics();
                } else {
                    this.showMessage(result.error || '出库失败', 'error');
                }
            } catch (error) {
                console.error('出库失败:', error);
                this.showMessage('出库失败，请稍后重试', 'error');
            }
        },

        // ==================== 详情查看 ====================

        async viewDetails(product) {
            this.currentProduct = { ...product };
            await this.loadInventoryRecords(product.id);
            this.dialogs.details = true;
        },

        closeDetailsDialog() {
            this.dialogs.details = false;
            this.inventoryRecords = [];
        },

        // ==================== 工具方法 ====================

        getEmptyProduct() {
            return {
                code: '',
                name: '',
                category: '',
                unit: '个',
                price: 0,
                quantity: 0,
                minStock: 10,
                description: '',
                status: 'active'
            };
        },

        formatNumber(num) {
            if (!num) return '0.00';
            return parseFloat(num).toFixed(2);
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatRecordType(type) {
            const types = {
                'IN': '入库',
                'OUT': '出库',
                'ADJUST': '调整'
            };
            return types[type] || type;
        },

        showMessage(text, type = 'success') {
            this.message = { show: true, type, text };
            setTimeout(() => {
                this.message.show = false;
            }, 3000);
        }
    }
}).mount('#app');
