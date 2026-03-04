
import { useSourceStore } from '@/stores/useSourceStore';
import { packagingMatcher } from '@/lib/packagingMatcher';
import { configLoader } from '@/services/configLoader';
import { parseQuantity, parseQuantityPair } from '@/lib/legacy/parsers';
import type { Order, OrderItem } from '@/types/order';
import {
    createPackagingOrderItem,
    createRawMaterialOrderItem,
    createCylinderOrderItem,
    createLockForkOrderItem,
    findMissingCategoryFields,
    findMissingCommonFields
} from '@/services/poContractUtils';

interface SupplierGroup {
    supplierName: string;
    category: string;
    items: OrderItem[];
    totalCost: number;
}

export class POGenerator {
    private sourceStore: ReturnType<typeof useSourceStore>;

    constructor() {
        this.sourceStore = useSourceStore();
    }

    private validateCategoryItems(category: string, items: OrderItem[], orderNo: string) {
        const invalid = findMissingCategoryFields(category, items);

        if (invalid.length > 0) {
            console.warn('[POGenerator] item field validation failed:', {
                order_no: orderNo,
                category,
                invalid
            });
        }
    }

    private validateCommonItemFields(category: string, items: OrderItem[], orderNo: string) {
        const invalid = findMissingCommonFields(items);

        if (invalid.length > 0) {
            console.warn('[POGenerator] common item field validation failed:', {
                order_no: orderNo,
                category,
                invalid
            });
        }
    }

    private buildPackagingItems(mergeSameSpec: boolean): SupplierGroup[] {
        const groups: Record<string, SupplierGroup> = {};

        const ensureGroup = (supplier: string) => {
            const key = `包装_${supplier}`;
            if (!groups[key]) {
                groups[key] = {
                    supplierName: supplier,
                    category: '包装',
                    items: [],
                    totalCost: 0
                };
            }
            return groups[key];
        };

        if (mergeSameSpec) {
            const hardware = this.sourceStore.hardwareRequirements;
            const packagingMapping = configLoader.getPackagingMapping();
            const fallbackSupplier = packagingMapping?.supplierName || '方亮包装';
            if (hardware?.packaging) {
                Object.values(hardware.packaging).forEach((pkg: any) => {
                    const internalName = pkg.internalName || pkg.spec || '未知包装';
                    const externalName = pkg.externalName || packagingMatcher.match(internalName);
                    const supplier = pkg.supplierName || fallbackSupplier;
                    const target = ensureGroup(supplier);

                    target.items.push(createPackagingOrderItem({
                        internalName,
                        externalName,
                        spec: pkg.spec || '-',
                        mb: pkg.mb || '-',
                        qty: Number(pkg.totalQty || 0),
                        qtyLeft: Number(pkg.totalLeft || 0),
                        qtyRight: Number(pkg.totalRight || 0),
                        supplier
                    }));
                });
            }
            return Object.values(groups);
        }

        const orderItems = this.sourceStore.currentOrder?.list || [];
        const packagingMapping = configLoader.getPackagingMapping();
        const mappings = packagingMapping?.mappings || packagingMapping || {};
        const supplier = packagingMapping?.supplierName || '方亮包装';

        orderItems.forEach((item: any) => {
            const internalName = item.bz || '未知包装';
            const target = ensureGroup(supplier);
            const externalName = mappings[internalName] || packagingMatcher.match(internalName);
            const qtyPair = parseQuantityPair(item.qty);

            target.items.push(createPackagingOrderItem({
                internalName,
                externalName,
                spec: item.spec || '-',
                mb: item.mb || '-',
                qty: parseQuantity(item.qty),
                qtyLeft: qtyPair.left,
                qtyRight: qtyPair.right,
                supplier
            }));
        });

        return Object.values(groups);
    }

    generateProposal(options?: { mergeSameSpec?: boolean }): SupplierGroup[] {
        const mergeSameSpec = options?.mergeSameSpec ?? true;
        packagingMatcher.syncFromMapping(configLoader.getPackagingMapping());
        const proposal: Record<string, SupplierGroup> = {};

        const ensureGroup = (supplier: string, category: string) => {
            const key = `${category}_${supplier}`;
            if (!proposal[key]) {
                proposal[key] = {
                    supplierName: supplier,
                    category: category,
                    items: [],
                    totalCost: 0
                };
            }
            return proposal[key];
        };

        // 1. Process Raw Materials
        const materials = this.sourceStore.materialRequirements;
        if (materials && materials.requirements) {
            Object.values(materials.requirements).forEach((group: any) => {
                const supplier = group.supplierName || '未知供应商';
                const target = ensureGroup(supplier, '原辅材料');

                group.materials.forEach((mat: any, idx: number) => {
                    target.items.push(createRawMaterialOrderItem({
                        supplier,
                        materialId: mat.materialId,
                        totalUsage: Number(mat.totalUsage || 0)
                    }));
                });
            });
        }

        // 2. Process Hardware - Cylinders
        const hardware = this.sourceStore.hardwareRequirements;
        if (hardware?.cylinders) {
            hardware.cylinders.forEach((cyl: any, idx: number) => {
                const supplier = cyl.supplier || '未分配五金';
                const target = ensureGroup(supplier, '锁芯');

                target.items.push(createCylinderOrderItem({
                    supplier,
                    type: cyl.type || '锁芯',
                    eccentricity: cyl.eccentricity,
                    quantity: Number(cyl.quantity || 0),
                    remark: cyl.remark
                }));
            });
        }

        // 3. Process Hardware - Lock Forks
        if (hardware?.lockForks) {
            hardware.lockForks.forEach((fork: any, idx: number) => {
                const supplier = fork.supplier || '未分配五金';
                const target = ensureGroup(supplier, '锁叉');

                target.items.push(createLockForkOrderItem({
                    supplier,
                    type: fork.type || '锁叉',
                    spec: fork.spec || '-',
                    quantity: Number(fork.quantity || 0),
                    remark: fork.remark || ''
                }));
            });
        }

        this.buildPackagingItems(mergeSameSpec).forEach(group => {
            const target = ensureGroup(group.supplierName, group.category);
            target.items.push(...group.items);
        });

        const unmatched = packagingMatcher.consumeUnmatchedSummary();
        if (unmatched.length > 0) {
            console.warn('[PackagingMatcher] unmatched packaging names (top):', unmatched);
        }

        return Object.values(proposal);
    }

    createOrders(selectedGroups: { supplier: string; category: string }[], options?: { mergeSameSpec?: boolean }): Order[] {
        const proposal = this.generateProposal(options);
        const orders: Order[] = [];
        const contractCode = this.sourceStore.currentOrder?.code || 'UNKNOWN';
        const customerName = this.sourceStore.currentOrder?.customerName || '';

        proposal.forEach(group => {
            const isSelected = selectedGroups.some(g => g.supplier === group.supplierName && g.category === group.category);
            if (!isSelected) return;

            orders.push({
                id: 0,
                order_no: `PO-${contractCode}`,
                supplier: group.supplierName,
                // Add category here, assuming types/order.ts Order might need category field. (Need to check if it does, wait)
                category: group.category as any, // Cast to any if we haven't updated the Order type
                items: group.items,
                total_amount: 0, // Calculate if price available
                created_at: new Date().toISOString(),
                status: 'draft',
                remark: `Generated from Contract ${contractCode}`,
                metadata: {
                    customer_name: customerName
                }
            });

            this.validateCategoryItems(group.category, group.items, `PO-${contractCode}`);
            this.validateCommonItemFields(group.category, group.items, `PO-${contractCode}`);
        });

        return orders;
    }
}
