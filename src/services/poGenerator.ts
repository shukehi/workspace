
import { useSourceStore } from '@/stores/useSourceStore';
import { packagingMatcher } from '@/lib/packagingMatcher';
import type { Order, OrderItem } from '@/types/order';

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

    generateProposal(): SupplierGroup[] {
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
                    target.items.push({
                        id: 0,
                        material_id: mat.materialId,
                        name: mat.materialId, // Material ID is usually descriptive enough or use mapping
                        model: mat.materialId,
                        quantity: Math.ceil(mat.totalUsage), // Round up for procurement
                        unit: 'unit', // Placeholder, needs unit logic if available
                        price: 0,
                        total: 0,
                        remark: `Usage: ${mat.totalUsage.toFixed(2)}`
                    });
                });
            });
        }

        // 2. Process Hardware - Cylinders
        const hardware = this.sourceStore.hardwareRequirements;
        if (hardware?.cylinders) {
            hardware.cylinders.forEach((cyl: any, idx: number) => {
                const supplier = cyl.supplier || '未分配五金';
                const target = ensureGroup(supplier, '锁芯');

                target.items.push({
                    id: 0,
                    material_id: cyl.type,
                    name: '锁芯',
                    model: cyl.type, // Contains detailed spec e.g. "72.5+37.5"
                    quantity: cyl.quantity,
                    unit: '套',
                    remark: cyl.remark
                });
            });
        }

        // 3. Process Hardware - Lock Forks
        if (hardware?.lockForks) {
            hardware.lockForks.forEach((fork: any, idx: number) => {
                const supplier = fork.supplier || '未分配五金';
                const target = ensureGroup(supplier, '锁叉');

                target.items.push({
                    id: 0,
                    material_id: fork.type,
                    name: '锁叉',
                    model: fork.type,
                    quantity: fork.quantity,
                    unit: '个',
                    remark: fork.spec // e.g. "30*250=..."
                });
            });
        }

        if (hardware?.packaging) {
            Object.values(hardware.packaging).forEach((pkg: any, idx: number) => {
                const internalName = pkg.internalName || pkg.spec; // Assuming internalName might be available or fallback to spec

                // Use Matcher
                const matchedName = packagingMatcher.match(internalName);
                const supplier = pkg.supplierName || '方亮包装'; // Default to 方亮 if not set
                const target = ensureGroup(supplier, '包装');

                target.items.push({
                    id: 0,
                    material_id: pkg.spec,
                    name: matchedName, // Use standardized name
                    model: pkg.spec,
                    quantity: pkg.totalQty,
                    unit: '套',
                    remark: `原名: ${internalName}` // Keep trace of original
                });
            });
        }

        return Object.values(proposal);
    }

    createOrders(selectedGroups: { supplier: string; category: string }[]): Order[] {
        const proposal = this.generateProposal();
        const orders: Order[] = [];
        const contractCode = this.sourceStore.currentOrder?.code || 'UNKNOWN';

        proposal.forEach(group => {
            const isSelected = selectedGroups.some(g => g.supplier === group.supplierName && g.category === group.category);
            if (!isSelected) return;

            orders.push({
                id: 0,
                order_no: `PO-${contractCode}-${group.category}-${group.supplierName}`,
                supplier: group.supplierName,
                // Add category here, assuming types/order.ts Order might need category field. (Need to check if it does, wait)
                category: group.category as any, // Cast to any if we haven't updated the Order type
                items: group.items,
                total_amount: 0, // Calculate if price available
                created_at: new Date().toISOString(),
                status: 'draft',
                remark: `Generated from Contract ${contractCode}`
            });
        });

        return orders;
    }
}
