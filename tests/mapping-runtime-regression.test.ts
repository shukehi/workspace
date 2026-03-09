import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  adaptCylinderMapping,
  adaptLockForkMapping,
  adaptPackagingMapping,
} from '../src/services/mappings';
import {
  extractCylinderData,
  extractLockForkData,
  extractPackagingData,
} from '../src/lib/erp-engine/dataExtractors';
import { buildCylinderGroups } from '../src/services/po-rules/cylinderRule';
import { buildLockForkGroups } from '../src/services/po-rules/lockForkRule';
import { buildPackagingGroups } from '../src/services/po-rules/packagingRule';
import { buildProcurementDocModel } from '../src/features/procurement/printDocBuilder';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function toComparableGroups(groups: any[]) {
  return groups.map((group) => ({
    supplierName: group.supplierName,
    category: group.category,
    itemCount: Array.isArray(group.items) ? group.items.length : 0,
    items: (Array.isArray(group.items) ? group.items : []).map((item) => {
      if (group.category === '包装') {
        return {
          supplier: item.supplier,
          internal_name: item.internal_name,
          external_name: item.external_name,
          name: item.name,
          spec: item.spec,
          mb: item.mb,
          quantity: item.quantity,
          quantity_left: item.quantity_left,
          quantity_right: item.quantity_right,
        };
      }

      return {
        supplier: item.supplier,
        type: item.type,
        eccentricity: item.eccentricity,
        quantity: item.quantity,
        remark: item.remark,
      };
    }),
  }));
}

function buildPrintChecksum(category: string, group: any, sample: any) {
  const doc = buildProcurementDocModel({
    category,
    order: {
      order_no: `PO-${sample.code}`,
      supplier: group.supplierName,
      category,
      created_at: '2026-03-06T00:00:00.000Z',
      metadata: {
        customer_name: sample.customerName,
        remark: sample.remark,
      },
      items: group.items,
    },
  });

  return {
    pages: doc.pages.length,
    rowsPerPage: doc.pages.map((page) => page.rows.length),
    checksum: createHash('sha256').update(JSON.stringify(doc.pages)).digest('hex'),
  };
}

test('mapping runtime regression: real order sample 202408120023 keeps current extraction/group/print baseline', () => {
  const expected = readJson('tests/fixtures/mapping-runtime-baseline.order-202408120023.json');
  const samplePayload = readJson('data/api_response.json');
  const sample = samplePayload.rows.find((row: any) => row.code === expected.sampleCode);
  assert.ok(sample, `sample order ${expected.sampleCode} should exist`);

  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((item) => String(item)).join(' '));
  };

  try {
    const packagingMapping = adaptPackagingMapping(readJson('data/config/packaging-mapping.json'));
    const cylinderMapping = adaptCylinderMapping(readJson('data/config/cylinder-mapping.json'));
    const lockForkMapping = adaptLockForkMapping(readJson('data/config/lock-fork-mapping.json'));

    const hardwareRequirements = {
      cylinders: extractCylinderData(sample.list, sample, cylinderMapping),
      lockForks: extractLockForkData(sample.list, sample, lockForkMapping),
      packaging: extractPackagingData(sample.list, packagingMapping),
    };

    const ctx = {
      sourceStore: {
        currentOrder: { list: sample.list },
        materialRequirements: null,
        hardwareRequirements,
      },
      configLoader: {
        getPackagingMapping: () => packagingMapping,
      },
      packagingMatcher: {
        syncFromMapping: () => {},
        match: (name: string) => name,
        consumeUnmatchedSummary: () => [],
      },
    };

    const packagingExtracted = Object.values(hardwareRequirements.packaging);
    const packagingGroups = buildPackagingGroups(ctx, { mergeSameSpec: true });
    const cylinderGroups = buildCylinderGroups(ctx);
    const lockForkGroups = buildLockForkGroups(ctx);

    assert.deepEqual(
      {
        cylinders: hardwareRequirements.cylinders,
        lockForks: hardwareRequirements.lockForks,
        packaging: packagingExtracted,
      },
      expected.extracted,
    );

    assert.deepEqual(
      {
        packaging: toComparableGroups(packagingGroups),
        cylinders: toComparableGroups(cylinderGroups),
        lockForks: toComparableGroups(lockForkGroups),
      },
      expected.groups,
    );

    assert.deepEqual(
      {
        packaging: buildPrintChecksum('包装', packagingGroups[0], sample),
        cylinder: buildPrintChecksum('锁芯', cylinderGroups[0], sample),
      },
      expected.print,
    );

    expected.warningIncludes.forEach((needle: string) => {
      assert.ok(
        warnings.some((message) => message.includes(needle)),
        `expected warning containing ${needle}`,
      );
    });
  } finally {
    console.warn = originalWarn;
  }
});
