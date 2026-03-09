const crypto = require('crypto');
const { Op } = require('sequelize');
const { ErpContract } = require('../models');

function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
        return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
    return `{${pairs.join(',')}}`;
}

function computePayloadHash(payload) {
    const canonical = stableStringify(payload);
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

class ContractCacheService {
    async cacheContract(rawContract) {
        if (!rawContract || typeof rawContract !== 'object') {
            throw new Error('INVALID_PAYLOAD');
        }
        const code = String(rawContract.code || '').trim();
        if (!code) {
            throw new Error('MISSING_CONTRACT_CODE');
        }

        const now = new Date();
        const payloadHash = computePayloadHash(rawContract);
        const existing = await ErpContract.findOne({ where: { contract_code: code } });

        if (!existing) {
            const created = await ErpContract.create({
                contract_code: code,
                customer_name: rawContract.customerName || null,
                order_date: rawContract.orderDate || null,
                advance_date: rawContract.advanceDate || null,
                total_count_raw: rawContract.count || null,
                total_amount: rawContract.totalAmount ?? null,
                payload_hash: payloadHash,
                last_fetched_at: now,
                raw_json: rawContract
            });
            return { status: 'created', contract: created };
        }

        const status = existing.payload_hash === payloadHash ? 'unchanged' : 'updated';
        await existing.update({
            customer_name: rawContract.customerName || null,
            order_date: rawContract.orderDate || null,
            advance_date: rawContract.advanceDate || null,
            total_count_raw: rawContract.count || null,
            total_amount: rawContract.totalAmount ?? null,
            payload_hash: payloadHash,
            last_fetched_at: now,
            raw_json: rawContract
        });

        return { status, contract: existing };
    }

    async getByCode(code) {
        const key = String(code || '').trim();
        if (!key) return null;
        return ErpContract.findOne({ where: { contract_code: key } });
    }

    async deleteByCode(code) {
        const key = String(code || '').trim();
        if (!key) throw new Error('MISSING_CONTRACT_CODE');
        const existing = await ErpContract.findOne({ where: { contract_code: key } });
        if (!existing) throw new Error('NOT_FOUND');
        await existing.destroy();
        return true;
    }

    async listContracts(query = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
        const offset = (page - 1) * pageSize;

        const where = {};
        const code = String(query.code || '').trim();
        const customer = String(query.customer || '').trim();
        const from = String(query.from || '').trim();
        const to = String(query.to || '').trim();

        if (code) {
            where.contract_code = { [Op.like]: `%${code}%` };
        }
        if (customer) {
            where.customer_name = { [Op.like]: `%${customer}%` };
        }
        if (from || to) {
            where.last_fetched_at = {};
            if (from) where.last_fetched_at[Op.gte] = new Date(from);
            if (to) where.last_fetched_at[Op.lte] = new Date(to);
        }

        const result = await ErpContract.findAndCountAll({
            where,
            order: [['last_fetched_at', 'DESC']],
            offset,
            limit: pageSize
        });

        return {
            page,
            pageSize,
            total: result.count,
            rows: result.rows
        };
    }
}

module.exports = new ContractCacheService();
