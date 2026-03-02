const { Material, sequelize } = require('../models');
const { Op } = require('sequelize');

class MaterialService {
    async searchMaterials(query = '') {
        const where = {};
        if (query) {
            where[Op.or] = [
                { name: { [Op.like]: `%${query}%` } },
                { model: { [Op.like]: `%${query}%` } },
                { code: { [Op.like]: `%${query}%` } },
                { supplier: { [Op.like]: `%${query}%` } }
            ];
        }
        return await Material.findAll({ where, limit: 50 }); // Cap results
    }

    async getAllMaterials() {
        return await Material.findAll();
    }

    async createMaterial(data) {
        return await Material.create(data);
    }

    async updateMaterial(id, data) {
        const mat = await Material.findByPk(id);
        if (!mat) throw new Error('Material not found');
        return await mat.update(data);
    }

    // Smart Match Logic
    async findSmartMatch(rawName) {
        // 1. Exact Code Match
        let mat = await Material.findOne({ where: { code: rawName } });
        if (mat) return mat;

        // 2. Exact Model Match
        mat = await Material.findOne({ where: { model: rawName } });
        if (mat) return mat;

        // 3. Exact Name Match
        mat = await Material.findOne({ where: { name: rawName } });
        if (mat) return mat;

        // 4. TODO: Implement Alias / Fuzzy Search here

        return null;
    }
}

module.exports = new MaterialService();
