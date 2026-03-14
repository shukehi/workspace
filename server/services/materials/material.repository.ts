import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import type {
    MaterialAttributes,
    MaterialCreationAttributes,
} from '../../models/types';

const { Material } = require('../../models');

/**
 * 物料数据访问层 (Repository)
 */
export class MaterialRepository {
    /**
     * 根据 ID 查找物料
     */
    static async findById(id: number, transaction?: Transaction): Promise<MaterialAttributes | null> {
        return Material.findByPk(id, transaction ? { transaction } : {});
    }

    /**
     * 根据编码查找物料
     */
    static async findByCode(code: string, transaction?: Transaction): Promise<MaterialAttributes | null> {
        return Material.findOne({
            where: { code },
            ...(transaction ? { transaction } : {})
        });
    }

    /**
     * 根据名称或模型精确匹配
     */
    static async findOneExact(rawName: string, transaction?: Transaction): Promise<MaterialAttributes | null> {
        return Material.findOne({
            where: {
                [Op.or]: [
                    { code: rawName },
                    { model: rawName },
                    { name: rawName }
                ]
            },
            ...(transaction ? { transaction } : {})
        });
    }

    /**
     * 搜索物料
     */
    static async search(query: string, limit = 50): Promise<MaterialAttributes[]> {
        const where: any = {};
        if (query) {
            where[Op.or] = [
                { name: { [Op.like]: `%${query}%` } },
                { model: { [Op.like]: `%${query}%` } },
                { code: { [Op.like]: `%${query}%` } },
                { supplier: { [Op.like]: `%${query}%` } }
            ];
        }
        return Material.findAll({ where, limit });
    }

    /**
     * 获取所有物料
     */
    static async findAll(): Promise<MaterialAttributes[]> {
        return Material.findAll();
    }

    /**
     * 创建物料
     */
    static async create(payload: MaterialCreationAttributes, transaction?: Transaction): Promise<MaterialAttributes> {
        return Material.create(payload, transaction ? { transaction } : {});
    }

    /**
     * 更新物料
     */
    static async update(id: number, payload: Partial<MaterialAttributes>, transaction?: Transaction): Promise<[number]> {
        return Material.update(payload, {
            where: { id },
            ...(transaction ? { transaction } : {})
        });
    }

    /**
     * 根据别名查找物料 (TODO: 算法增强阶段实现)
     */
    static async findByAlias(alias: string, transaction?: Transaction): Promise<MaterialAttributes | null> {
        // 使用 JSON 包含逻辑查询 aliases 数组
        return Material.findOne({
            where: sequelize.where(
                sequelize.fn('JSON_EXTRACT', sequelize.col('aliases'), '$'),
                { [Op.like]: `%${alias}%` }
            ),
            ...(transaction ? { transaction } : {})
        });
    }
}

// 为了保持与现有 JS 代码的兼容性，同时提供 module.exports
const sequelize = require('../../config/database');
module.exports = MaterialRepository;
export default MaterialRepository;
