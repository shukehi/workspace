import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSourceOrder } from '@/services/sourceAnalysis';
import { createEmptySourceAnalysisResult, createSourceAnalysisResult } from '@/services/sourceAnalysisResultBuilder';

test('source analysis: empty order returns empty analysis result', () => {
    const result = analyzeSourceOrder({
        order: null,
        config: {
            formulas: {},
            materials: {},
            cylinderMapping: {},
            lockMapping: {},
            handleMapping: {},
            lockForkMapping: {},
            packagingMapping: {},
        },
    });

    assert.equal(result.materialRequirements, null);
    assert.deepEqual(result.hardwareRequirements, {
        cylinders: [],
        locks: [],
        handles: [],
        lockForks: [],
        accessories: [],
        packaging: {},
    });
    assert.deepEqual(result.flatMaterials, []);
    assert.deepEqual(result.flatLocks, []);
    assert.deepEqual(result.flatPackaging, []);
});

test('source analysis: computes material and hardware flat views from config snapshot', () => {
    const order = {
        code: 'C-001',
        customerName: '测试客户',
        remark: '',
        list: [
            {
                color: '红色',
                qty: '2/0',
                productModelName: '单开门',
                spec: '900x2100',
                ls: '',
                xsbz: '',
                bz: '',
            },
        ],
    };

    const result = analyzeSourceOrder({
        order,
        config: {
            formulas: {
                红色: {
                    bom: [
                        {
                            materialId: 'mat-1',
                            usage: {
                                single: 0.5,
                                double: 0.8,
                                paired: 1,
                            },
                        },
                    ],
                },
            },
            materials: {
                'mat-1': {
                    supplier: '供应商A',
                    name: '红色粉末',
                },
            },
            cylinderMapping: {},
            lockMapping: {},
            handleMapping: {},
            lockForkMapping: {},
            packagingMapping: {},
        },
    });

    assert.equal(result.materialRequirements.missing.length, 0);
    assert.equal(result.flatMaterials.length, 1);
    assert.equal(result.flatMaterials[0].supplierName, '供应商A');
    assert.equal(result.flatMaterials[0].totalUsage, 1);
    assert.equal(result.flatMaterials[0].details[0].doorCount, 2);
    assert.deepEqual(result.flatCylinders, []);
    assert.deepEqual(result.flatLocks, []);
    assert.deepEqual(result.flatHandles, []);
    assert.deepEqual(result.flatForks, []);
    assert.deepEqual(result.flatAccessories, []);
    assert.equal(result.flatPackaging.length, 1);
    assert.equal(result.flatPackaging[0].internalName, '未匹配');
});


test('source analysis result builder keeps empty and flattened result shaping stable', () => {
    const empty = createEmptySourceAnalysisResult();
    assert.deepEqual(empty.hardwareRequirements, {
        cylinders: [],
        locks: [],
        handles: [],
        lockForks: [],
        accessories: [],
        packaging: {},
    });
    assert.deepEqual(empty.flatMaterials, []);
    assert.deepEqual(empty.flatPackaging, []);

    const shaped = createSourceAnalysisResult({
        materialRequirements: {
            requirements: {
                supplierA: {
                    supplierName: '供应商A',
                    materials: [{ code: 'MAT-1', totalUsage: 2 }],
                },
            },
        },
        hardwareRequirements: {
            cylinders: [],
            locks: [],
            handles: [],
            lockForks: [],
            accessories: [],
            packaging: {
                box: { internalName: '纸箱' },
            },
        },
    });

    assert.equal(shaped.flatMaterials[0].supplierName, '供应商A');
    assert.equal(shaped.flatMaterials[0].code, 'MAT-1');
    assert.equal(shaped.flatPackaging[0].internalName, '纸箱');
});
