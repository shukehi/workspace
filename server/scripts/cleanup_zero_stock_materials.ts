import { InventoryLocationBalance, InventoryMovement, InventoryOutboundItem, InventoryReceipt, Material, OrderItem, sequelize } from '../models';
import { buildZeroStockCleanupPlan } from '../services/inventory/inventory-material-cleanup.service';

type CleanupOptions = {
    execute: boolean;
    confirmToken: string;
    json: boolean;
};

const EXECUTE_CONFIRM_TOKEN = 'DELETE_ZERO_STOCK_MATERIALS';

function readOptions(argv: string[]): CleanupOptions {
    let execute = false;
    let confirmToken = '';
    let json = false;

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--execute') {
            execute = true;
            continue;
        }
        if (token === '--json') {
            json = true;
            continue;
        }
        if (token === '--confirm' && argv[index + 1]) {
            confirmToken = String(argv[index + 1] || '');
            index += 1;
            continue;
        }
        if (token.startsWith('--confirm=')) {
            confirmToken = token.slice('--confirm='.length);
        }
    }

    return { execute, confirmToken, json };
}

function toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

async function collectCleanupCandidates() {
    const materials = await Material.findAll({
        where: sequelize.where(sequelize.col('stock_quantity'), '<=', 0),
        order: [['id', 'ASC']],
    });
    const inputs = [];

    for (const material of materials) {
        const plain = (typeof (material as { get?: (options?: unknown) => unknown }).get === 'function'
            ? (material as { get: (options?: unknown) => unknown }).get({ plain: true })
            : material) as Record<string, unknown>;
        const code = String(plain.code || '');
        const materialId = Number(plain.id || 0);

        const [
            balanceCount,
            movementCount,
            outboundItemCount,
            receiptCount,
            orderItemCount,
        ] = await Promise.all([
            InventoryLocationBalance.count({ where: { material_id: materialId } }),
            InventoryMovement.count({ where: { material_id: materialId } }),
            InventoryOutboundItem.count({ where: { material_id: materialId } }),
            InventoryReceipt.count({ where: { material_id: code } }),
            OrderItem.count({ where: { material_id: code } }),
        ]);

        const blockers = {
            location_balances: balanceCount,
            inventory_movements: movementCount,
            inventory_outbound_items: outboundItemCount,
            inventory_receipts: receiptCount,
            order_items: orderItemCount,
        };
        inputs.push({
            id: materialId,
            code,
            name: String(plain.name || ''),
            model: String(plain.model || ''),
            stock_quantity: toNumber(plain.stock_quantity),
            blockers,
        });
    }

    return buildZeroStockCleanupPlan(inputs);
}

async function cleanupZeroStockMaterials() {
    const options = readOptions(process.argv.slice(2));

    try {
        await sequelize.authenticate();
        const result = await collectCleanupCandidates();

        if (!options.execute) {
            const payload = {
                mode: 'dry-run',
                confirmToken: EXECUTE_CONFIRM_TOKEN,
                scanned: result.scanned,
                candidates: result.candidates,
                blocked: result.blocked,
            };
            if (options.json) {
                console.log(JSON.stringify(payload, null, 2));
            } else {
                console.log('[cleanup_zero_stock_materials] dry-run summary', {
                    scanned: result.scanned,
                    candidateCount: result.candidates.length,
                    blockedCount: result.blocked.length,
                    confirmToken: EXECUTE_CONFIRM_TOKEN,
                });
            }
            return;
        }

        if (options.confirmToken !== EXECUTE_CONFIRM_TOKEN) {
            throw new Error(`missing or invalid confirm token, expected --confirm ${EXECUTE_CONFIRM_TOKEN}`);
        }

        const deletedIds = result.candidates.map((item) => item.id);
        if (deletedIds.length === 0) {
            console.log('[cleanup_zero_stock_materials] nothing to delete');
            return;
        }

        const deletedCount = await Material.destroy({
            where: {
                id: deletedIds,
            },
        });

        const payload = {
            mode: 'execute',
            deletedCount,
            deletedIds,
            deletedCodes: result.candidates.map((item) => item.code),
        };

        if (options.json) {
            console.log(JSON.stringify(payload, null, 2));
        } else {
            console.log('[cleanup_zero_stock_materials] completed', payload);
        }
    } catch (error) {
        console.error('[cleanup_zero_stock_materials] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

cleanupZeroStockMaterials();
