import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createPackagingOrderItem,
    createCylinderOrderItem,
    createLockForkOrderItem,
    findMissingCategoryFields,
    findMissingCommonFields
} from '../src/services/poContractUtils';

test('PO contract utils: packaging item keeps normalized fields', () => {
    const item = createPackagingOrderItem({
        internalName: '3层黄卡美+C单瓦纸箱',
        externalName: '美+C单瓦',
        spec: '960*2050/7/内开外包',
        mb: '新元宝边',
        qty: 8,
        qtyLeft: 3,
        qtyRight: 5,
        supplier: '方亮包装'
    });

    assert.equal(item.supplier, '方亮包装');
    assert.equal(item.internal_name, '3层黄卡美+C单瓦纸箱');
    assert.equal(item.external_name, '美+C单瓦');
    assert.equal(item.name, '美+C单瓦');
    assert.equal(item.spec, '960*2050/7/内开外包');
    assert.equal(item.mb, '新元宝边');
    assert.equal(item.quantity_left, 3);
    assert.equal(item.quantity_right, 5);
    assert.equal(item.quantity, 8);
    assert.equal(item.remark, '');
});

test('PO contract utils: cylinder/lock-fork items keep required typed fields', () => {
    const cyl = createCylinderOrderItem({
        supplier: '忠恒',
        type: '90AB微珠锌合金锁芯 ORIGINAL&SED(TURKEY)',
        eccentricity: '34.5*55.5/中心孔偏心',
        quantity: 1140,
        remark: '钥匙 2+5 英文说明书'
    });

    assert.equal(cyl.supplier, '忠恒');
    assert.equal(cyl.type, '90AB微珠锌合金锁芯 ORIGINAL&SED(TURKEY)');
    assert.equal(cyl.eccentricity, '34.5*55.5/中心孔偏心');
    assert.equal(cyl.quantity, 1140);

    const lock = createLockForkOrderItem({
        supplier: '应志友',
        type: '双头锁叉 - 上头',
        spec: '570*301 = 871',
        quantity: 1140,
        remark: '7CM 2050'
    });

    assert.equal(lock.supplier, '应志友');
    assert.equal(lock.type, '双头锁叉 - 上头');
    assert.equal(lock.spec, '570*301 = 871');
    assert.equal(lock.quantity, 1140);
});

test('PO contract utils: validators detect missing category/common fields', () => {
    const invalidPackaging = {
        id: 0,
        material_id: 'x',
        name: 'x',
        model: 'x',
        quantity: 1,
        unit: '套'
    } as any;

    const categoryMissing = findMissingCategoryFields('包装', [invalidPackaging]);
    assert.equal(categoryMissing.length, 1);
    assert.ok(categoryMissing[0].missing.includes('supplier'));
    assert.ok(categoryMissing[0].missing.includes('internal_name'));

    const commonMissing = findMissingCommonFields([
        { id: 0, material_id: 'm1', name: '', model: 'm', quantity: 1, unit: '个' } as any
    ]);
    assert.equal(commonMissing.length, 1);
    assert.ok(commonMissing[0].missing.includes('name'));
});
