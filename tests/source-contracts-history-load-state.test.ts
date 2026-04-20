import test from 'node:test';
import assert from 'node:assert/strict';
import { useContractsHistorySourceLoadState } from '../src/features/source-analysis/composables/useContractsHistorySourceLoadState';

test('contracts history source-load state manages loading lifecycle and success side effects', async () => {
  const calls: string[] = [];
  const state = useContractsHistorySourceLoadState(
    {
      loadHistoryContractByCode: async (code: string) => {
        calls.push(`load:${code}`);
      },
    },
    {
      toast: ({ title, description }) => calls.push(`toast:${title}:${description}`),
      push: (path) => calls.push(`push:${path}`),
    },
  );

  await state.loadContract('H-001');

  assert.equal(state.loadingContractId.value, null);
  assert.deepEqual(calls, [
    'load:H-001',
    'toast:加载成功:合同 H-001 已成功载入数据源',
    'push:/source',
  ]);
});

test('contracts history source-load state normalizes load failures into destructive toast', async () => {
  const calls: string[] = [];
  const state = useContractsHistorySourceLoadState(
    {
      loadHistoryContractByCode: async () => {
        throw new Error('boom');
      },
    },
    {
      toast: ({ title, description, variant }) => calls.push(`toast:${title}:${description}:${variant}`),
      push: () => calls.push('push'),
    },
  );

  await state.loadContract('H-ERR');

  assert.equal(state.loadingContractId.value, null);
  assert.deepEqual(calls, ['toast:加载失败:boom:destructive']);
});
