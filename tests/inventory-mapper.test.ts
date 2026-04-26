import test from 'node:test';
import assert from 'node:assert/strict';

import { toInventoryItem } from '../server/services/inventory/inventory.mapper';

test('toInventoryItem coerces invalid price values to zero instead of NaN', () => {
  const mapped = toInventoryItem({
    id: 1,
    code: 'INV-PRICE-INVALID',
    name: 'Invalid price material',
    stock_quantity: '3',
    price: 'N/A',
    min_stock: null,
  });

  assert.equal(mapped.price, 0);
  assert.equal(Number.isNaN(mapped.price), false);
  assert.equal(mapped.stock_quantity, 3);
});

test('toInventoryItem keeps numeric price strings as finite numbers', () => {
  const mapped = toInventoryItem({
    id: 2,
    code: 'INV-PRICE-NUMERIC',
    name: 'Numeric price material',
    stock_quantity: 4,
    price: '12.5',
    min_stock: '2',
  });

  assert.equal(mapped.price, 12.5);
  assert.equal(mapped.min_stock, 2);
});
