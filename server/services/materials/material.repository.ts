import type { Transaction, Model } from 'sequelize';
import { Op } from 'sequelize';
import type {
    MaterialAttributes,
    MaterialCreationAttributes,
} from '../../models/types';

import { Material, SupplierMaster } from '../../models';
import sequelize from '../../config/database';

/**
 * 内部模型实例类型，仅在 Repository 层可见
 */
interface MaterialInstance extends Model<MaterialAttributes, MaterialCreationAttributes>, MaterialAttributes {}

/**
 * 物料数据访问层 (Repository) - 最高标准封装
 */
export class MaterialRepository {
    static readonly SUPPLIER_MASTER_INCLUDE = [{ model: SupplierMaster, as: 'supplierMaster', required: false }];
    /**
     * 根据 ID 查找物料
     */
    static async findById(id: number, transaction?: Transaction): Promise<any> {
        return Material.findByPk(id, { transaction, include: this.SUPPLIER_MASTER_INCLUDE });
    }

    /**
     * 根据编码查找物料
     */
    static async findByCode(code: string, transaction?: Transaction): Promise<any> {
        return Material.findOne({
            where: { code },
            transaction
        });
    }

    /**
     * 根据名称、模型或编码精确匹配
     */
    static async findOneExact(rawName: string, transaction?: Transaction): Promise<any> {
        return Material.findOne({
            where: {
                [Op.or]: [
                    { code: rawName },
                    { model: rawName },
                    { name: rawName }
                ]
            },
            transaction
        });
    }

    /**
     * 搜索物料
     */
    static async search(query: string, limit = 50): Promise<any[]> {
        const where: any = {};
        if (query) {
            where[Op.or] = [
                { name: { [Op.like]: `%${query}%` } },
                { model: { [Op.like]: `%${query}%` } },
                { code: { [Op.like]: `%${query}%` } },
                { supplier: { [Op.like]: `%${query}%` } }
            ];
        }
        return Material.findAll({ where, limit, include: this.SUPPLIER_MASTER_INCLUDE });
    }

    /**
     * 获取所有物料
     */
    static async findAll(): Promise<any[]> {
        return Material.findAll({ include: this.SUPPLIER_MASTER_INCLUDE });
    }

    /**
     * 创建物料
     */
    static async create(payload: MaterialCreationAttributes, transaction?: Transaction): Promise<any> {
        return Material.create(payload, { transaction });
    }

    /**
     * 更新物料
     */
    static async update(id: number, payload: Partial<MaterialAttributes>, transaction?: Transaction): Promise<[number]> {
        return Material.update(payload, {
            where: { id },
            transaction
        });
    }

    /**
     * 根据别名查找物料 (SQLite 稳健版)
     */
    static async findByAlias(alias: string, transaction?: Transaction): Promise<any> {
        // 使用 sequelize.escape 确保 alias 安全
        // 移除表名前缀以增强 SQL 兼容性
        const escapedAlias = sequelize.escape(alias);
        return Material.findOne({
            where: sequelize.literal(`EXISTS (SELECT 1 FROM json_each(aliases) WHERE value = ${escapedAlias})`),
            transaction
        });
    }

    /**
     * 执行模糊匹配搜索 (排序权重增强版)
     */
    static async findFuzzy(rawName: string, transaction?: Transaction): Promise<any> {
        const escapedName = sequelize.escape(rawName);

        return Material.findOne({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${rawName}%` } },
                    { model: { [Op.like]: `%${rawName}%` } },
                    { code: { [Op.like]: `%${rawName}%` } }
                ]
            },
            order: [
                // 优先级排序：1.全等 2.前缀匹配 3.包含
                [sequelize.literal(`CASE 
                    WHEN name = ${escapedName} THEN 1 
                    WHEN name LIKE ${escapedName} || '%' THEN 2 
                    ELSE 3 END`), 'ASC'],
                ['updatedAt', 'DESC']
            ],
            transaction
        });
    }
}

export default MaterialRepository;
