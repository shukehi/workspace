// Script: run with tsx
import sequelize from '../config/database';
import type { PlainRecord } from '../shared/types';
import { initDB, FormulaDefinition, FormulaRevision } from '../models';

function formatDateYYYYMMDD(input: Date | string = new Date()): string {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        return `${fallback.getFullYear()}${String(fallback.getMonth() + 1).padStart(2, '0')}${String(fallback.getDate()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

async function migrate(): Promise<void> {
    await initDB();

    await sequelize.transaction(async (transaction) => {
        const definitions = (await FormulaDefinition.findAll({
            order: [['created_at', 'ASC'], ['id', 'ASC']],
            transaction
        })) as PlainRecord[];

        if (definitions.length === 0) {
            console.log('No formulas found, nothing to migrate.');
            return;
        }

        const sequenceByDate = new Map<string, number>();
        const keyMappingByFormulaId = new Map<number, { oldKey: string; newKey: string }>();

        for (const definition of definitions) {
            const datePart = formatDateYYYYMMDD(definition.created_at || definition.createdAt || new Date());
            const nextSequence = (sequenceByDate.get(datePart) || 0) + 1;
            sequenceByDate.set(datePart, nextSequence);

            const newFormulaKey = `F${datePart}-${String(nextSequence).padStart(4, '0')}`;
            keyMappingByFormulaId.set(definition.id, {
                oldKey: String(definition.formula_key || '').trim(),
                newKey: newFormulaKey
            });
        }

        // Two-phase update to avoid unique-index collisions during key rewrites.
        for (const definition of definitions) {
            await FormulaDefinition.update(
                { formula_key: `TMP_FKEY_${definition.id}` },
                { where: { id: definition.id }, transaction }
            );
        }

        for (const definition of definitions) {
            const mapping = keyMappingByFormulaId.get(definition.id)!;
            await FormulaDefinition.update(
                { formula_key: mapping.newKey },
                { where: { id: definition.id }, transaction }
            );
        }

        const revisions = (await FormulaRevision.findAll({
            attributes: ['id', 'formula_id', 'payload_json'],
            transaction
        })) as PlainRecord[];

        let updatedRevisions = 0;
        for (const revision of revisions) {
            const mapping = keyMappingByFormulaId.get(revision.formula_id);
            if (!mapping) continue;

            let payload: Record<string, unknown>;
            try {
                payload = JSON.parse(revision.payload_json || '{}');
            } catch {
                payload = {};
            }

            payload['formulaKey'] = mapping.newKey;
            await FormulaRevision.update(
                { payload_json: JSON.stringify(payload) },
                { where: { id: revision.id }, transaction }
            );
            updatedRevisions += 1;
        }

        console.log(`Migrated ${definitions.length} formulas.`);
        console.log(`Updated ${updatedRevisions} revision payloads.`);
        const preview = definitions.slice(0, 5).map((item: any) => {
            const mapping = keyMappingByFormulaId.get(item.id)!;
            return `${mapping.oldKey} -> ${mapping.newKey}`;
        });
        console.log('Sample mappings:');
        preview.forEach((line: string) => console.log(`  ${line}`));
    });

    await sequelize.close();
}

migrate().catch(async (error) => {
    console.error('Formula key migration failed:', error);
    await sequelize.close();
    process.exit(1);
});
