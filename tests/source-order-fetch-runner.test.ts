import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runSourceContractFetch,
  runSourceHistoryContractLoad,
} from '../src/features/source-analysis/services/sourceOrderFetchRunner';

test('source order fetch runner ignores blank contract ids before request lifecycle starts', async () => {
  const calls: string[] = [];
  const result = await runSourceContractFetch({
    contractId: '   ',
    beginRequest: () => calls.push('begin'),
    finishRequest: () => calls.push('finish'),
    fetchErpContract: async () => {
      calls.push('fetch');
      return { code: 'X' };
    },
    applyContractData: async () => {
      calls.push('apply');
    },
    failSourceOrderFetch: () => {
      calls.push('fail');
    },
  });

  assert.equal(result, null);
  assert.deepEqual(calls, []);
});

test('source order fetch runner delegates request lifecycle and apply flow', async () => {
  const calls: string[] = [];
  const result = await runSourceContractFetch({
    contractId: ' C-101 ',
    beginRequest: () => calls.push('begin'),
    finishRequest: () => calls.push('finish'),
    fetchErpContract: async (contractId) => {
      calls.push(`fetch:${contractId}`);
      return { code: contractId, list: [{ id: 1 }] };
    },
    applyContractData: async (orderData, options) => {
      calls.push(`apply:${orderData.code}:${String(options?.persistCache)}`);
    },
    failSourceOrderFetch: () => {
      calls.push('fail');
    },
  });

  assert.equal(result.code, 'C-101');
  assert.deepEqual(calls, ['begin', 'fetch:C-101', 'apply:C-101:true', 'finish']);
});

test('source order history runner validates contract code and payload shape', async () => {
  await assert.rejects(() => runSourceHistoryContractLoad({
    code: '   ',
    beginRequest: () => undefined,
    finishRequest: () => undefined,
    fetchHistoryContractByCode: async () => ({ code: 'X', list: [] }),
    applyContractData: async () => undefined,
    failSourceOrderHistoryLoad: () => 'ignored',
  }), /合同号不能为空/);

  const calls: string[] = [];
  await assert.rejects(() => runSourceHistoryContractLoad({
    code: 'H-1',
    beginRequest: () => calls.push('begin'),
    finishRequest: () => calls.push('finish'),
    fetchHistoryContractByCode: async (code) => {
      calls.push(`fetch:${code}`);
      return { code };
    },
    applyContractData: async () => {
      calls.push('apply');
    },
    failSourceOrderHistoryLoad: () => {
      calls.push('fail');
      return '历史合同数据不完整，无法加载';
    },
  }), /历史合同数据不完整，无法加载/);
  assert.deepEqual(calls, ['begin', 'fetch:H-1', 'fail', 'finish']);
});
