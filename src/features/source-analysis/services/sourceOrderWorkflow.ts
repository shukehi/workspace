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
import { runSourceOrderAnalysis } from './sourceOrderAnalysisRunner';
import { applySourceOrderContractData } from './sourceOrderContractStateApplier';
import { applySourceOrderContractCache } from './sourceOrderContractCacheApplier';
import { beginSourceOrderRequest, finishSourceOrderRequest } from './sourceOrderRequestStateApplier';
import { failSourceOrderFetch, failSourceOrderHistoryLoad } from './sourceOrderRequestErrorApplier';
import { runSourceContractFetch, runSourceHistoryContractLoad } from './sourceOrderFetchRunner';
import { clearSourceOrderWorkflowState } from './sourceOrderClearApplier';
import { runSourceOrderApplyPipeline } from './sourceOrderApplyRunner';
import { runSourceOrderRehydrate } from './sourceOrderRehydrateRunner';

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
    try {
      const result = await runSourceOrderAnalysis({
        state,
        analyzeOrder,
        items: itemsToProcess,
      });
      if (!result) return;

      applySourceAnalysisResult(state, result);
    } catch (error) {
      failSourceAnalysisCalculation(state, error);
    }
  }

  async function applyContractData(orderData: any, options: { persistCache?: boolean } = {}) {
    await runSourceOrderApplyPipeline({
      orderData,
      persistCache: options.persistCache,
      applyContractState: (currentOrderData) => applySourceOrderContractData(state, currentOrderData, persistSourceOrderSnapshot),
      applyContractCache: ({ orderData: currentOrderData, persistCache }) => applySourceOrderContractCache({
        orderData: currentOrderData,
        persistCache,
        cacheErpContractSnapshot,
        warn: (message, error) => console.warn(message, error),
      }),
      calculateMaterials: () => calculateMaterials(),
    });
  }

  async function fetchContract(contractId: string) {
    await runSourceContractFetch({
      contractId,
      beginRequest: () => beginSourceOrderRequest(state),
      finishRequest: () => finishSourceOrderRequest(state),
      fetchErpContract,
      applyContractData,
      failSourceOrderFetch: (error) => failSourceOrderFetch(state, error),
    });
  }

  async function loadHistoryContractByCode(code: string) {
    return await runSourceHistoryContractLoad({
      code,
      beginRequest: () => beginSourceOrderRequest(state),
      finishRequest: () => finishSourceOrderRequest(state),
      fetchHistoryContractByCode,
      applyContractData,
      failSourceOrderHistoryLoad: (error) => failSourceOrderHistoryLoad(state, error),
    });
  }

  function clear() {
    clearSourceOrderWorkflowState(state, clearSourceOrderSnapshot);
  }

  async function rehydrateFromSnapshot() {
    await runSourceOrderRehydrate({
      state,
      calculateMaterials: () => calculateMaterials(),
      warn: (error) => warnSourceAnalysisRehydrateFailure(error),
    });
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
