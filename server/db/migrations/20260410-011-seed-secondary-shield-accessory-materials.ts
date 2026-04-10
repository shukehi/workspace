import { Sequelize, QueryTypes } from 'sequelize';

export const id = '20260410-011-seed-secondary-shield-accessory-materials';
export const name = 'seed secondary shield accessory materials';

const ACCESSORY_MATERIALS = [
    {
        code: 'ACC-FSHZ-YHLXMB-5',
        name: '一号铝小面板 5公分配件包',
        model: '5公分配件包',
        supplier: '巨力',
        unit: '套',
        category: '五金/配件',
        packageSpec: '5公分配件包',
    },
    {
        code: 'ACC-FSHZ-YHLXMB-7',
        name: '一号铝小面板 7公分配件包',
        model: '7公分配件包',
        supplier: '巨力',
        unit: '套',
        category: '五金/配件',
        packageSpec: '7公分配件包',
    },
    {
        code: 'ACC-FSHZ-YHLXMB-9',
        name: '一号铝小面板 9公分配件包',
        model: '9公分配件包',
        supplier: '巨力',
        unit: '套',
        category: '五金/配件',
        packageSpec: '9公分配件包',
    },
    {
        code: 'ACC-FSHZ-YHLXMB-10',
        name: '一号铝小面板 10公分配件包',
        model: '10公分配件包',
        supplier: '巨力',
        unit: '套',
        category: '五金/配件',
        packageSpec: '10公分配件包',
    },
];

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    await sequelize.transaction(async (transaction) => {
        for (const item of ACCESSORY_MATERIALS) {
            const existing = await sequelize.query<{ id: number }>(
                `SELECT id FROM materials WHERE code = :code LIMIT 1`,
                {
                    replacements: { code: item.code },
                    type: QueryTypes.SELECT,
                    transaction,
                },
            );

            if (existing.length > 0) {
                await sequelize.query(
                    `
                        UPDATE materials
                        SET name = :name,
                            model = :model,
                            supplier = :supplier,
                            unit = :unit,
                            category = :category,
                            package_spec = :packageSpec,
                            updatedAt = CURRENT_TIMESTAMP
                        WHERE code = :code
                    `,
                    {
                        replacements: item,
                        transaction,
                    },
                );
                continue;
            }

            await sequelize.query(
                `
                    INSERT INTO materials (
                        code, name, model, supplier, unit, price, category, package_spec,
                        aliases, stock_quantity, min_stock, createdAt, updatedAt
                    ) VALUES (
                        :code, :name, :model, :supplier, :unit, 0, :category, :packageSpec,
                        '[]', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                `,
                {
                    replacements: item,
                    transaction,
                },
            );
        }
    });
}

export async function down({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    await sequelize.query(
        `DELETE FROM materials WHERE code IN ('ACC-FSHZ-YHLXMB-5','ACC-FSHZ-YHLXMB-7','ACC-FSHZ-YHLXMB-9','ACC-FSHZ-YHLXMB-10')`,
    );
}
