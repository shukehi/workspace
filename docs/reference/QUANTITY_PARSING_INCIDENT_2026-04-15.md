# Quantity Parsing Incident 2026-04-15

## Summary

This note records the root cause of the historical quantity error found in procurement order `PO-202604030016-04`.

Observed symptom:

- Packaging order right-side quantity was larger than the ERP source data
- A source row with `qty = "36/0"` was persisted as `quantity_left = 36` and `quantity_right = 36`

Expected result:

- `quantity_left = 36`
- `quantity_right = 0`

## Root Cause

The bug came from the shared quantity parser in [src/lib/erp-engine/parsers.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/parsers.ts).

Historical behavior used a fallback pattern equivalent to:

```ts
const rightVal = parseFloat(parts[1]) || leftVal;
```

That logic was incorrect for explicit zero values:

1. ERP input `36/0`
2. `parseFloat("0")` returns `0`
3. `0` is falsy in JavaScript
4. The fallback path replaced the right-side quantity with `leftVal`
5. Final parsed pair became `36/36`

This was not a packaging-specific bug. Packaging only surfaced it because the parsed left/right values were written directly into the generated order items.

## Affected Flow

The incorrect parser sat on a shared path used by multiple procurement generators:

- Packaging
- Handle
- Lockset
- Cylinder accessory pack
- Lock fork quantity derivation
- Raw quantity helpers reused by print/export flows

For packaging generation, the flow was:

1. ERP row `qty`
2. `parseQuantityPair()`
3. [src/services/po-rules/packagingRule.ts](/Users/aries/Dve/workspace/src/services/po-rules/packagingRule.ts)
4. generated `OrderItem.quantity_left / quantity_right`
5. persisted procurement order

## Why `PO-202604030016-04` Was Wrong

The ERP source rows for `5层黄卡加硬纸箱` under contract `202604030016` were:

- `63/36`
- `0/27`
- `18/18`
- `36/0`
- `18/27`
- `0/9`

Correct totals:

- left = `135`
- right = `117`

Historical persisted totals:

- left = `135`
- right = `153`

The entire delta (`+36`) came from the single row `36/0`, which was incorrectly parsed as `36/36`.

## Fixes Applied

The parser was corrected so explicit zero is preserved:

- right-side value now falls back only when the parsed value is missing/invalid (`NaN`), not when it is `0`
- `parseQuantityPair()` and `parseQuantity()` were aligned so split totals and aggregate totals stay consistent
- `a/b`, `a+b`, and single-value `a` formats are now handled by the same logic

In addition, persistence was hardened:

- when `quantity_left` / `quantity_right` are present, server persistence now recomputes `quantity` from split quantities instead of trusting caller-supplied `quantity`

## Prevention

To avoid the same class of failure in the future:

1. Keep all ERP `qty` parsing in the shared parser
   Do not introduce category-specific quantity parsers.

2. Never use falsy checks for numeric fallbacks
   Explicit zero must be treated as valid data, not as "missing".

3. Keep split and aggregate quantity semantics aligned
   `parseQuantityPair()` and `parseQuantity()` must describe the same business meaning.

4. Preserve server-side normalization
   If split quantities exist, persist `quantity = quantity_left + quantity_right`.

5. Maintain direct regression tests
   Required edge cases:
   - `36/0`
   - `0/27`
   - `2+3`
   - single-value `10`

6. Run historical audits after parser changes
   Use the procurement quantity audit script to detect previously generated orders that may need correction.

## Reference

Relevant files:

- [src/lib/erp-engine/parsers.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/parsers.ts)
- [src/services/po-rules/packagingRule.ts](/Users/aries/Dve/workspace/src/services/po-rules/packagingRule.ts)
- [server/services/orders/order.mapper.ts](/Users/aries/Dve/workspace/server/services/orders/order.mapper.ts)
- [server/scripts/audit_po_quantity_history.ts](/Users/aries/Dve/workspace/server/scripts/audit_po_quantity_history.ts)
