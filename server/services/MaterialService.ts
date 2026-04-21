import type { Transaction } from 'sequelize';
import type { MaterialAttributes, MaterialCreationAttributes } from '../models/types';
import MaterialRepository from './materials/material.repository';
import { SupplierMaster } from '../models';
import { createMaterialMasterAuditLog } from './config-platform/material-master.audit';

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
    private toPlainMaterial(material: any): MaterialAttributes & {
        supplierMaster?: { id: number; supplier_name: string; normalized_name: string; status: string } | null;
    } {
        const plain = material.get({ plain: true });
        const supplierMaster = plain.supplierMaster
            ? {
                id: Number(plain.supplierMaster.id),
                supplier_name: String(plain.supplierMaster.supplier_name || ''),
                normalized_name: String(plain.supplierMaster.normalized_name || ''),
                status: String(plain.supplierMaster.status || 'active'),
            }
            : null;
        return {
            ...plain,
            supplierMaster,
        };
    }

    private async resolveSupplierMasterId(supplier: unknown, transaction?: Transaction): Promise<number | null> {
        const normalizedSupplier = String(supplier || '').trim();
        if (!normalizedSupplier) return null;

        const match = await SupplierMaster.findOne({
            where: {
                // sqlite-friendly dual match without custom operators
                supplier_name: normalizedSupplier,
            },
            transaction,
        }) || await SupplierMaster.findOne({
            where: {
                normalized_name: normalizedSupplier.toLowerCase(),
            },
            transaction,
        });

        const plain = match && typeof (match as any).get === 'function'
            ? (match as any).get({ plain: true })
            : match;
        const id = Number((plain as any)?.id || 0);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    private async resolveExplicitSupplierMasterId(value: unknown, transaction?: Transaction): Promise<number | null> {
        if (value === undefined) return null;
        if (value === null || value === '') return null;
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) return null;
        const match = await SupplierMaster.findByPk(id, { transaction });
        const plain = match && typeof (match as any).get === 'function'
            ? (match as any).get({ plain: true })
            : match;
        const foundId = Number((plain as any)?.id || 0);
        return Number.isInteger(foundId) && foundId > 0 ? foundId : null;
    }

    /**
     * 搜索物料
     */
    async searchMaterials(query = ''): Promise<MaterialAttributes[]> {
        const materials = await MaterialRepository.search(query);
        return materials.map(m => this.toPlainMaterial(m));
    }

    /**
     * 获取所有物料
     */
    async getAllMaterials(): Promise<MaterialAttributes[]> {
        const materials = await MaterialRepository.findAll();
        return materials.map(m => this.toPlainMaterial(m));
    }

    /**
     * 创建物料
     */
    async createMaterial(data: MaterialCreationAttributes, transaction?: Transaction): Promise<MaterialAttributes> {
        const explicitSupplierMasterId = await this.resolveExplicitSupplierMasterId((data as any).supplier_master_id, transaction);
        const material = await MaterialRepository.create({
            ...data,
            supplier_master_id: explicitSupplierMasterId ?? await this.resolveSupplierMasterId(data.supplier, transaction),
        }, transaction);
        const created = await MaterialRepository.findById((material.get({ plain: true }) as MaterialAttributes).id, transaction);
        const result = this.toPlainMaterial(created || material);
        await createMaterialMasterAuditLog({
            materialId: result.id,
            action: 'create',
            meta: {
                code: result.code,
                supplier: result.supplier,
                supplier_master_id: result.supplier_master_id ?? null,
            },
        });
        return result;
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
        const hasSupplierMasterIdOverride = Object.prototype.hasOwnProperty.call(data, 'supplier_master_id');
        const explicitSupplierMasterId = await this.resolveExplicitSupplierMasterId((data as any).supplier_master_id, transaction);
        const currentMaterial = materialInstance.get({ plain: true }) as MaterialAttributes;
        const nextSupplier = data.supplier === undefined ? currentMaterial.supplier : data.supplier;
        const nextSupplierMasterId = explicitSupplierMasterId !== null
            ? explicitSupplierMasterId
            : hasSupplierMasterIdOverride
                ? await this.resolveSupplierMasterId(nextSupplier, transaction)
                : data.supplier === undefined
                    ? currentMaterial.supplier_master_id ?? null
                    : await this.resolveSupplierMasterId(data.supplier, transaction);
        await MaterialRepository.update(id, {
            ...data,
            supplier_master_id: nextSupplierMasterId,
        }, transaction);
        
        // 重新从数据库加载最新实例，确保返回的对象包含所有触发器、默认值或 hooks 改动
        // 且必须在同一事务上下文中回读以保证隔离性
        const updatedInstance = await MaterialRepository.findById(id, transaction);
        if (!updatedInstance) throw new Error('Consistency Error: Material record lost during update');

        const result = this.toPlainMaterial(updatedInstance);
        await createMaterialMasterAuditLog({
            materialId: result.id,
            action: 'update',
            meta: {
                code: result.code,
                supplier: result.supplier,
                supplier_master_id: result.supplier_master_id ?? null,
            },
        });
        return result;
    }

    /**
     * 智能匹配物料 (三级梯度匹配算法)
     */
    async findSmartMatch(rawName: string, transaction?: Transaction): Promise<MaterialAttributes | null> {
        if (!rawName) return null;

        try {
            // 1. 第一优先级：精确匹配 (Code, Model, Name)
            const exactMatch = await MaterialRepository.findOneExact(rawName, transaction);
            if (exactMatch) return exactMatch.get({ plain: true });

            // 2. 第二优先级：别名匹配 (Alias Match)
            const aliasMatch = await MaterialRepository.findByAlias(rawName, transaction);
            if (aliasMatch) return aliasMatch.get({ plain: true });

            // 3. 第三优先级：模糊保底匹配 (Fuzzy Match)
            const fuzzyMatch = await MaterialRepository.findFuzzy(rawName, transaction);
            return fuzzyMatch ? fuzzyMatch.get({ plain: true }) : null;
        } catch {
            // DB not ready or table missing — degrade gracefully
            return null;
        }
    }
}

const materialService = new MaterialService();
export default materialService;
