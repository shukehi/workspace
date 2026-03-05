export interface ContractHistoryRow {
    id: number;
    contract_code: string;
    customer_name?: string;
    total_amount?: number;
    last_fetched_at: string;
    payload_hash?: string;
    raw_json?: any;
}
