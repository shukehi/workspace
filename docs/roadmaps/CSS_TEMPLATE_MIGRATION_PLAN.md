# CSS Template Migration Plan (Zero Visual Change)

## Goal
Migrate legacy templates to new class names without changing layout or visual style.

## Scope
- Legacy templates:
  - `public/index.html.bak`
  - `public/procurement.html.bak`
  - `public/inventory.html.bak`
  - `public/statistics.html.bak`
- CSS compatibility layer cleanup in `public/css/**`

## Migration Rules
1. Only change class names. Do not change DOM structure.
2. Do not change numeric style values (size, spacing, color, position).
3. Migrate one template at a time, then verify.
4. Remove compatibility selectors only after the template is verified.
5. Commit in small batches (one template + related CSS cleanup).

## Class Mapping (Legacy -> Target)
- `.action-buttons` ->
  - `.po-action-buttons` (purchase-order list actions)
  - `.order-search-actions` (order-search page actions)
- `.nav-link` (print page context only) -> `.print-nav-link`
- `.subtitle` (detail header context) -> keep `.subtitle` in template if inside `.detail-header` (already scoped in CSS)

Notes:
- `.materials-table`, `.po-number`, `.po-actions` currently exist in both page/component styles for compatibility.
- Do not remove these until all templates are migrated and verified.

## Execution Order
1. `public/index.html.bak`
2. `public/procurement.html.bak`
3. `public/inventory.html.bak`
4. `public/statistics.html.bak`

## Per-File Checklist
1. Replace legacy classes using the mapping above.
2. Search for leftover legacy classes in the file:
   - `action-buttons`
   - `nav-link` (print-only context)
3. Quick visual verification:
   - Navigation area
   - PO list/action buttons
   - Print/preview controls (if present)
4. Remove now-unused compatibility selectors in CSS for this file's scope.
5. Run guard test:
   - `node --test tests/print-style-guard.test.js`
6. Commit.

## Final Cleanup Criteria
You can remove compatibility selectors only when all are true:
- No legacy class usage remains in all `*.bak` templates.
- Visual regression check passes for key pages.
- Guard tests pass.

## Rollback Strategy
- Each batch is one commit.
- If regression appears, revert only the latest migration commit:
  - `git revert <commit>`

## Suggested Commit Message Pattern
- `refactor(template): migrate <file> classes to scoped naming`
- `refactor(css): remove legacy compatibility selectors for <scope>`
