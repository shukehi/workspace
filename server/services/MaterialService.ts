import type { Transaction } from 'sequelize';
import type { MaterialAttributes, MaterialCreationAttributes } from '../models/types';
import MaterialRepository from './materials/material.repository';

// 解决循环依赖或 JS/TS 混合环境下使用的延迟引用
const getErrorInfrastructures = () => {
    const AppError = require('../app/errors/AppError');
    const ERROR_CODES = require('../app/errors/errorCodes');
    return { AppError, ERROR_CODES };
};

/**
 * 物料服务层 (Service) - 最高工程标准封装
 * 负责业务逻辑编排、事务传播与智能匹配
 */
export class MaterialService {
    /**
     * 搜索物料
     */
    async searchMaterials(query = ''): Promise<MaterialAttributes[]> {
        const materials = await MaterialRepository.search(query);
        return materials.map(m => m.get({ plain: true }));
    }

    /**
     * 获取所有物料
     */
    async getAllMaterials(): Promise<MaterialAttributes[]> {
        const materials = await MaterialRepository.findAll();
        return materials.map(m => m.get({ plain: true }));
    }

    /**
     * 创建物料
     */
    async createMaterial(data: MaterialCreationAttributes, transaction?: Transaction): Promise<MaterialAttributes> {
        const material = await MaterialRepository.create(data, transaction);
        return material.get({ plain: true });
    }

    /**
     * 更新物料 (已支持原子性事务与数据一致性回读)
     */
    async updateMaterial(id: number, data: Partial<MaterialAttributes>, transaction?: Transaction): Promise<MaterialAttributes> {
        const materialInstance = await MaterialRepository.findById(id, transaction);
        
        if (!materialInstance) {
            const { AppError, ERROR_CODES } = getErrorInfrastructures();
            throw new AppError({
                code: ERROR_CODES.NOT_FOUND,
                status: 404,
                message: 'Material not found',
            });
        }
        
        // 执行更新逻辑
        await MaterialRepository.update(id, data, transaction);
        
        // 重新从数据库加载最新实例，确保返回的对象包含所有触发器、默认值或 hooks 改动
        // 且必须在同一事务上下文中回读以保证隔离性
        const updatedInstance = await MaterialRepository.findById(id, transaction);
        if (!updatedInstance) throw new Error('Consistency Error: Material record lost during update');

        return updatedInstance.get({ plain: true });
    }

    /**
     * 智能匹配物料 (三级梯度匹配算法)
     */
    async findSmartMatch(rawName: string, transaction?: Transaction): Promise<MaterialAttributes | null> {
        if (!rawName) return null;

        // 1. 第一优先级：精确匹配 (Code, Model, Name)
        const exactMatch = await MaterialRepository.findOneExact(rawName, transaction);
        if (exactMatch) return exactMatch.get({ plain: true });

        // 2. 第二优先级：别名匹配 (Alias Match)
        const aliasMatch = await MaterialRepository.findByAlias(rawName, transaction);
        if (aliasMatch) return aliasMatch.get({ plain: true });

        // 3. 第三优先级：模糊保底匹配 (Fuzzy Match)
        const fuzzyMatch = await MaterialRepository.findFuzzy(rawName, transaction);
        return fuzzyMatch ? fuzzyMatch.get({ plain: true }) : null;
    }
}

const materialService = new MaterialService();
module.exports = materialService;
export default materialService;
