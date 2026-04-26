import { sequelize, initDB } from '../models';
import {
  findDuplicateCodeMappings,
  findDuplicateSupplierMappings,
} from '../services/materials/material-mapping.repository';

async function main() {
  const json = process.argv.includes('--json');
  await initDB();

  try {
    const [supplierDuplicates, codeDuplicates] = await Promise.all([
      findDuplicateSupplierMappings(),
      findDuplicateCodeMappings(),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      supplierDuplicateCount: supplierDuplicates.length,
      codeDuplicateCount: codeDuplicates.length,
      supplierDuplicates,
      codeDuplicates,
    };

    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log('[audit_material_mapping_conflicts] summary', {
        supplierDuplicateCount: payload.supplierDuplicateCount,
        codeDuplicateCount: payload.codeDuplicateCount,
      });
      for (const row of supplierDuplicates.slice(0, 20)) {
        console.log('[audit_material_mapping_conflicts] supplier duplicate', row);
      }
      for (const row of codeDuplicates.slice(0, 20)) {
        console.log('[audit_material_mapping_conflicts] code duplicate', row);
      }
    }
  } catch (error) {
    console.error('[audit_material_mapping_conflicts] failed', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
