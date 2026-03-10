import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSalesDepartmentLabel, resolveDisplayCustomerName } from '../src/features/procurement/customerName';

test('pickSalesDepartmentLabel extracts sales department from bracketed customer name', () => {
  assert.equal(pickSalesDepartmentLabel('外贸马其顿Orient（三部）'), '三部');
  assert.equal(pickSalesDepartmentLabel('外贸马其顿Orient(三部)'), '三部');
});

test('resolveDisplayCustomerName falls back to full name when no sales department exists', () => {
  assert.equal(resolveDisplayCustomerName('普通客户A'), '普通客户A');
  assert.equal(resolveDisplayCustomerName('外贸马其顿Orient（三部）'), '三部');
});
