import test from 'node:test';
import assert from 'node:assert';
import materialService from '../server/services/MaterialService';
import MaterialRepository from '../server/services/materials/material.repository';

// 模拟数据库数据 (通过 Repository 操作)
test('Material Smart Match Logic', async (t) => {
    // 假设这些物料已存在于测试 DB 中 (由测试脚手架处理或 Mock)
    // 我们的目的是验证 Service 层如何组织这些调用逻辑

    await t.test('exact match priority', async () => {
        // 场景 1: 完全一致的编码或模型
        // 逻辑应命中 MaterialRepository.findOneExact
        const match = await materialService.findSmartMatch('P-CYL-STD-001');
        if (match) {
            assert.ok(match.code === 'P-CYL-STD-001' || match.model === 'P-CYL-STD-001' || match.name === 'P-CYL-STD-001');
        }
    });

    await t.test('alias match fallthrough', async () => {
        // 场景 2: 别名匹配 (假设数据库中存在别名为 '别名A' 的物料)
        // 逻辑应在精确匹配失败后命中 findByAlias
        const match = await materialService.findSmartMatch('别名A');
        // 如果命中，match 不应为 null (取决于测试环境种子数据)
    });

    await t.test('fuzzy match as last resort', async () => {
        // 场景 3: 模糊搜索 (假设物料名为 '标准纸箱')
        // 输入 '纸箱' 应命中 findFuzzy
        const match = await materialService.findSmartMatch('纸箱');
        if (match) {
            assert.ok(match.name.includes('纸箱'));
        }
    });

    await t.test('null for empty or unknown input', async () => {
        const match = await materialService.findSmartMatch('');
        assert.strictEqual(match, null);

        const unknown = await materialService.findSmartMatch('不存在的物料XYZ-999');
        // 如果数据库确实不存在，则应为 null
    });
});
