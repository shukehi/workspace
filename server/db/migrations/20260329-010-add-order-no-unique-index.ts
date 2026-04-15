import { Sequelize, QueryTypes } from 'sequelize';

export const id = '20260329-010-add-order-no-unique-index';
export const name = 'add unique index on orders.order_no';

type DuplicateOrderRow = {
    id: number;
    order_no: string;
};

function buildDedupedOrderNo(orderNo: string, usedOrderNos: Set<string>): string {
    let suffix = 2;
    let candidate = `${orderNo}-DUP${suffix}`;

    while (usedOrderNos.has(candidate)) {
        suffix += 1;
        candidate = `${orderNo}-DUP${suffix}`;
    }

    return candidate;
}

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    await sequelize.transaction(async (transaction) => {
        const duplicateOrderNos = await sequelize.query<{ order_no: string }>(
            `
                SELECT order_no
                FROM orders
                WHERE order_no IS NOT NULL AND TRIM(order_no) <> ''
                GROUP BY order_no
                HAVING COUNT(*) > 1
                ORDER BY order_no ASC
            `,
            { type: QueryTypes.SELECT, transaction }
        );

        if (duplicateOrderNos.length > 0) {
            const existingOrderNos = await sequelize.query<{ order_no: string }>(
                `
                    SELECT order_no
                    FROM orders
                    WHERE order_no IS NOT NULL AND TRIM(order_no) <> ''
                `,
                { type: QueryTypes.SELECT, transaction }
            );
            const usedOrderNos = new Set(existingOrderNos.map((row) => row.order_no));

            for (const duplicate of duplicateOrderNos) {
                const rows = await sequelize.query<DuplicateOrderRow>(
                    `
                        SELECT id, order_no
                        FROM orders
                        WHERE order_no = :orderNo
                        ORDER BY COALESCE(created_at, updated_at, CURRENT_TIMESTAMP) ASC, id ASC
                    `,
                    {
                        replacements: { orderNo: duplicate.order_no },
                        type: QueryTypes.SELECT,
                        transaction,
                    }
                );

                for (const row of rows.slice(1)) {
                    const dedupedOrderNo = buildDedupedOrderNo(row.order_no, usedOrderNos);
                    usedOrderNos.add(dedupedOrderNo);

                    await sequelize.query(
                        `
                            UPDATE orders
                            SET order_no = :dedupedOrderNo
                            WHERE id = :orderId
                        `,
                        {
                            replacements: { dedupedOrderNo, orderId: row.id },
                            transaction,
                        }
                    );

                    await sequelize.query(
                        `
                            UPDATE inventory_receipts
                            SET order_no = :dedupedOrderNo
                            WHERE order_id = :orderId
                        `,
                        {
                            replacements: { dedupedOrderNo, orderId: row.id },
                            transaction,
                        }
                    );
                }
            }
        }

        await sequelize.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no_unique ON orders(order_no)`,
            { transaction }
        );
    });
}

export async function down({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_order_no_unique`);
}
