import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createPackagingOrderItem,
    createCylinderOrderItem,
    createLockOrderItem,
    createHandleOrderItem,
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

    const handle = createHandleOrderItem({
        supplier: '拉手供应商A',
        type: 'DJ-6847双活',
        spec: '10公分配件包',
        qtyLeft: 50,
        qtyRight: 70,
        quantity: 120
    });
    assert.equal(handle.supplier, '拉手供应商A');
    assert.equal(handle.type, 'DJ-6847双活');
    assert.equal(handle.spec, '10公分配件包');
    assert.equal(handle.quantity_left, 50);
    assert.equal(handle.quantity_right, 70);
    assert.equal(handle.unit, '付');
    assert.equal(handle.quantity, 120);

    const lockset = createLockOrderItem({
        supplier: '汇成',
        type: '6607大锁',
        spec: '主锁体',
        unit: '把',
        qtyLeft: 20,
        qtyRight: 15,
        quantity: 35
    });
    assert.equal(lockset.supplier, '汇成');
    assert.equal(lockset.type, '6607大锁');
    assert.equal(lockset.spec, '主锁体');
    assert.equal(lockset.quantity_left, 20);
    assert.equal(lockset.quantity_right, 15);
    assert.equal(lockset.unit, '把');
    assert.equal(lockset.quantity, 35);
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

    const handleMissing = findMissingCategoryFields('拉手', [{
        id: 0,
        material_id: 'h1',
        supplier: '拉手供应商A',
        name: 'DJ-6847',
        model: 'DJ-6847',
        quantity: 1,
        unit: '付'
    } as any]);
    assert.equal(handleMissing.length, 1);
    assert.ok(handleMissing[0].missing.includes('type'));
    assert.ok(handleMissing[0].missing.includes('spec'));
    assert.ok(handleMissing[0].missing.includes('quantity_left'));
    assert.ok(handleMissing[0].missing.includes('quantity_right'));

    const locksetMissing = findMissingCategoryFields('锁具', [{
        id: 0,
        material_id: 'l1',
        supplier: '汇成',
        name: '6607大锁',
        model: '主锁体',
        quantity: 1,
        unit: '套'
    } as any]);
    assert.equal(locksetMissing.length, 1);
    assert.ok(locksetMissing[0].missing.includes('type'));
    assert.ok(locksetMissing[0].missing.includes('spec'));
    assert.ok(locksetMissing[0].missing.includes('quantity_left'));
    assert.ok(locksetMissing[0].missing.includes('quantity_right'));

    const commonMissing = findMissingCommonFields([
        { id: 0, material_id: 'm1', name: '', model: 'm', quantity: 1, unit: '个' } as any
    ]);
    assert.equal(commonMissing.length, 1);
    assert.ok(commonMissing[0].missing.includes('name'));
});
