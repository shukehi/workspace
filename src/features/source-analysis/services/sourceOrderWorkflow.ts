import type { Ref } from 'vue';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';
import {
  cacheErpContractSnapshot as defaultCacheErpContractSnapshot,
  fetchErpContract as defaultFetchErpContract,
  fetchHistoryContractByCode as defaultFetchHistoryContractByCode,
} from './sourceContractService';
import {
  clearSourceOrderSnapshot as defaultClearSourceOrderSnapshot,
  persistSourceOrderSnapshot as defaultPersistSourceOrderSnapshot,
} from './sourceOrderSnapshot';
import { sourceAnalysisRuntime } from './sourceAnalysisRuntime';
import { applySourceAnalysisResult, clearSourceAnalysisResult } from './sourceAnalysisStateApplier';
import { failSourceAnalysisCalculation, warnSourceAnalysisRehydrateFailure } from './sourceAnalysisErrorApplier';
import { applySourceOrderContractData, clearSourceOrderContractData } from './sourceOrderContractStateApplier';
import { applySourceOrderContractCache } from './sourceOrderContractCacheApplier';
import { beginSourceOrderRequest, failSourceOrderRequest, finishSourceOrderRequest } from './sourceOrderRequestStateApplier';

interface SourceOrderWorkflowState {
  currentOrder: Ref<any>;
  materialRequirements: Ref<any>;
  hardwareRequirements: Ref<any>;
  analysisResult: Ref<SourceAnalysisResult | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

interface SourceOrderWorkflowDeps {
  fetchErpContract?: typeof defaultFetchErpContract;
  fetchHistoryContractByCode?: typeof defaultFetchHistoryContractByCode;
  cacheErpContractSnapshot?: typeof defaultCacheErpContractSnapshot;
  persistSourceOrderSnapshot?: typeof defaultPersistSourceOrderSnapshot;
  clearSourceOrderSnapshot?: typeof defaultClearSourceOrderSnapshot;
  analyzeOrder?: typeof sourceAnalysisRuntime.analyzeOrder;
}

export function createSourceOrderWorkflow(
  state: SourceOrderWorkflowState,
  deps: SourceOrderWorkflowDeps = {},
) {
  const fetchErpContract = deps.fetchErpContract || defaultFetchErpContract;
  const fetchHistoryContractByCode = deps.fetchHistoryContractByCode || defaultFetchHistoryContractByCode;
  const cacheErpContractSnapshot = deps.cacheErpContractSnapshot || defaultCacheErpContractSnapshot;
  const persistSourceOrderSnapshot = deps.persistSourceOrderSnapshot || defaultPersistSourceOrderSnapshot;
  const clearSourceOrderSnapshot = deps.clearSourceOrderSnapshot || defaultClearSourceOrderSnapshot;
  const analyzeOrder = deps.analyzeOrder || sourceAnalysisRuntime.analyzeOrder.bind(sourceAnalysisRuntime);

  async function calculateMaterials(itemsToProcess?: any[]) {
    if (!state.currentOrder.value) return;

    try {
      const result = await analyzeOrder({
        order: state.currentOrder.value,
        items: itemsToProcess,
      });

      applySourceAnalysisResult(state, result);
    } catch (error) {
      failSourceAnalysisCalculation(state, error);
    }
  }

  async function applyContractData(orderData: any, options: { persistCache?: boolean } = {}) {
    const persistCache = options.persistCache ?? true;

    applySourceOrderContractData(state, orderData, persistSourceOrderSnapshot);

    await applySourceOrderContractCache({
      orderData,
      persistCache,
      cacheErpContractSnapshot,
      warn: (message, error) => console.warn(message, error),
    });

    await calculateMaterials();
  }

  async function fetchContract(contractId: string) {
    const normalizedContractId = String(contractId || '').trim();
    if (!normalizedContractId) return;

    beginSourceOrderRequest(state);

    try {
      const orderData = await fetchErpContract(normalizedContractId);
      await applyContractData(orderData, { persistCache: true });
    } catch (error: any) {
      console.error('Fetch failed', error);
      failSourceOrderRequest(state, error.message || 'Failed to fetch contract');
    } finally {
      finishSourceOrderRequest(state);
    }
  }

  async function loadHistoryContractByCode(code: string) {
    const contractCode = String(code || '').trim();
    if (!contractCode) {
      throw new Error('合同号不能为空');
    }

    beginSourceOrderRequest(state);

    try {
      const rawOrder = await fetchHistoryContractByCode(contractCode);

      if (!rawOrder || !Array.isArray(rawOrder.list)) {
        throw new Error('历史合同数据不完整，无法加载');
      }

      await applyContractData(rawOrder, { persistCache: false });
      return rawOrder;
    } catch (error: any) {
      console.error('Load history contract failed', error);
      const message = error?.response?.status === 404
        ? '未找到历史合同'
        : (error.message || '历史合同加载失败，请稍后重试');
      failSourceOrderRequest(state, message);
      throw new Error(message);
    } finally {
      finishSourceOrderRequest(state);
    }
  }

  function clear() {
    clearSourceOrderContractData(state);
    clearSourceAnalysisResult(state);
    state.error.value = null;
    clearSourceOrderSnapshot();
  }

  async function rehydrateFromSnapshot() {
    if (!state.currentOrder.value || !Array.isArray(state.currentOrder.value.list)) return;

    try {
      await calculateMaterials();
    } catch (error) {
      warnSourceAnalysisRehydrateFailure(error);
    }
  }

  return {
    applyContractData,
    fetchContract,
    loadHistoryContractByCode,
    calculateMaterials,
    clear,
    rehydrateFromSnapshot,
  };
}
