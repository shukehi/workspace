
import { useSourceStore } from '@/stores/useSourceStore';
import type { Order, OrderItem } from '@/types/order';

interface SupplierGroup {
    supplierName: string;
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

        const ensureGroup = (supplier: string) => {
            if (!proposal[supplier]) {
                proposal[supplier] = {
                    supplierName: supplier,
                    items: [],
                    totalCost: 0
                };
            }
            return proposal[supplier];
        };

        // 1. Process Raw Materials
        const materials = this.sourceStore.materialRequirements;
        if (materials && materials.requirements) {
            Object.values(materials.requirements).forEach((group: any) => {
                const supplier = group.supplierName || '未知供应商';
                const target = ensureGroup(supplier);

                group.materials.forEach((mat: any, idx: number) => {
                    target.items.push({
                        id: `mat_${Date.now()}_${idx}`,
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
                const target = ensureGroup(supplier);

                target.items.push({
                    id: `cyl_${Date.now()}_${idx}`,
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
                const target = ensureGroup(supplier);

                target.items.push({
                    id: `fork_${Date.now()}_${idx}`,
                    material_id: fork.type,
                    name: '锁叉',
                    model: fork.type,
                    quantity: fork.quantity,
                    unit: '个',
                    remark: fork.spec // e.g. "30*250=..."
                });
            });
        }

        // 4. Process Packaging
        if (hardware?.packaging) {
            Object.values(hardware.packaging).forEach((pkg: any, idx: number) => {
                const supplier = pkg.supplierName || '未分配包装';
                const target = ensureGroup(supplier);

                target.items.push({
                    id: `pkg_${Date.now()}_${idx}`,
                    material_id: pkg.spec,
                    name: '包装箱',
                    model: pkg.spec,
                    quantity: pkg.totalQty,
                    unit: '套'
                });
            });
        }

        return Object.values(proposal);
    }

    createOrders(selectedSuppliers: string[]): Order[] {
        const proposal = this.generateProposal();
        const orders: Order[] = [];
        const contractCode = this.sourceStore.currentOrder?.code || 'UNKNOWN';

        proposal.forEach(group => {
            if (!selectedSuppliers.includes(group.supplierName)) return;

            orders.push({
                id: `po_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                order_no: `PO-${contractCode}-${group.supplierName}`,
                supplier: group.supplierName,
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
