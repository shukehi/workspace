import crypto from 'crypto';
import { Op } from 'sequelize';
import { ErpContract } from '../models';

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
        return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    }
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(',')}}`;
}

function computePayloadHash(payload: unknown): string {
    const canonical = stableStringify(payload);
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

interface RawContract {
    code?: string;
    customerName?: string;
    orderDate?: string;
    advanceDate?: string;
    count?: string;
    totalAmount?: number | null;
    [key: string]: unknown;
}

export interface ListContractsQuery {
    page?: string | number;
    pageSize?: string | number;
    code?: string;
    customer?: string;
    from?: string;
    to?: string;
}

class ContractCacheService {
    async cacheContract(rawContract: unknown): Promise<{ status: string; contract: any }> {
        if (!rawContract || typeof rawContract !== 'object') {
            throw new Error('INVALID_PAYLOAD');
        }
        const rc = rawContract as RawContract;
        const code = String(rc.code || '').trim();
        if (!code) {
            throw new Error('MISSING_CONTRACT_CODE');
        }

        const now = new Date();
        const payloadHash = computePayloadHash(rawContract);
        const existing = await ErpContract.findOne({ where: { contract_code: code } });

        if (!existing) {
            const created = await ErpContract.create({
                contract_code: code,
                customer_name: rc.customerName || null,
                order_date: rc.orderDate || null,
                advance_date: rc.advanceDate || null,
                total_count_raw: rc.count || null,
                total_amount: rc.totalAmount ?? null,
                payload_hash: payloadHash,
                last_fetched_at: now,
                raw_json: rawContract as object
            });
            return { status: 'created', contract: created };
        }

        const status = existing.get('payload_hash') === payloadHash ? 'unchanged' : 'updated';
        await existing.update({
            customer_name: rc.customerName || null,
            order_date: rc.orderDate || null,
            advance_date: rc.advanceDate || null,
            total_count_raw: rc.count || null,
            total_amount: rc.totalAmount ?? null,
            payload_hash: payloadHash,
            last_fetched_at: now,
            raw_json: rawContract as object
        });

        return { status, contract: existing };
    }

    async getByCode(code: unknown): Promise<any> {
        const key = String(code || '').trim();
        if (!key) return null;
        return ErpContract.findOne({ where: { contract_code: key } });
    }

    async deleteByCode(code: unknown): Promise<true> {
        const key = String(code || '').trim();
        if (!key) throw new Error('MISSING_CONTRACT_CODE');
        const existing = await ErpContract.findOne({ where: { contract_code: key } });
        if (!existing) throw new Error('NOT_FOUND');
        await existing.destroy();
        return true;
    }

    async listContracts(query: ListContractsQuery = {}): Promise<{ page: number; pageSize: number; total: number; rows: any[] }> {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
        const offset = (page - 1) * pageSize;

        const where: Record<string, any> = {};
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

const contractCacheService = new ContractCacheService();
export default contractCacheService;
