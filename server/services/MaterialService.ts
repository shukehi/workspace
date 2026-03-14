import type { Transaction } from 'sequelize';
import type { MaterialAttributes, MaterialCreationAttributes } from '../models/types';
import MaterialRepository from './materials/material.repository';

/**
 * 物料服务层 (Service)
 * 负责业务逻辑编排与智能匹配
 */
export class MaterialService {
    /**
     * 搜索物料
     */
    async searchMaterials(query = ''): Promise<MaterialAttributes[]> {
        return MaterialRepository.search(query);
    }

    /**
     * 获取所有物料
     */
    async getAllMaterials(): Promise<MaterialAttributes[]> {
        return MaterialRepository.findAll();
    }

    /**
     * 创建物料
     */
    async createMaterial(data: MaterialCreationAttributes): Promise<MaterialAttributes> {
        return MaterialRepository.create(data);
    }

    /**
     * 更新物料
     */
    async updateMaterial(id: number, data: Partial<MaterialAttributes>): Promise<MaterialAttributes> {
        const mat = await MaterialRepository.findById(id);
        if (!mat) {
            const { AppError } = require('../../app/errors/AppError');
            const { ERROR_CODES } = require('../../app/errors/errorCodes');
            throw new AppError({
                code: ERROR_CODES.NOT_FOUND,
                status: 404,
                message: 'Material not found',
            });
        }
        await MaterialRepository.update(id, data);
        return { ...mat, ...data } as MaterialAttributes;
    }

    /**
     * 智能匹配物料 (Smart Match Logic)
     */
    async findSmartMatch(rawName: string): Promise<MaterialAttributes | null> {
        if (!rawName) return null;

        // 1. 精确匹配 (Code, Model, Name)
        const exactMatch = await MaterialRepository.findOneExact(rawName);
        if (exactMatch) return exactMatch;

        // 2. 别名匹配 (Alias Match)
        // 注意：由于当前数据库中 aliases 为 JSON 类型，
        // 这里的 findByAlias 使用了特定于数据库的 JSON 查询，逻辑见 Repository
        const aliasMatch = await MaterialRepository.findByAlias(rawName);
        if (aliasMatch) return aliasMatch;

        // 3. 模糊搜索 (TODO: 后续可加入更复杂的模糊匹配算法，如 Levenshtein 距离)
        // 目前暂定：如果以上都匹配不到，则返回 null

        return null;
    }
}

const materialService = new MaterialService();
module.exports = materialService;
export default materialService;
