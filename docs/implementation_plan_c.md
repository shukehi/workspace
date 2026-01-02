# Procurement Workbench (Plan C) Implementation Plan

## 1. Objective
Refactor the current "Order Inquiry" function into a professional **Procurement Workbench**. This involves transitioning from a linear "waterfall" layout to a centralized "dashboard" interface with tabbed views for different purchase types (Packaging, Cylinders, Hardware).

**Key Goals:**
- **Efficiency:** Single-page operation for all procurement tasks.
- **Accuracy:** "Smart Sidebar" to catch non-standard requests in remarks.
- **Scalability:** Modular design to easily add new purchase categories (Tabs).

## 2. Architecture Overview

### Files Structure
- **UI:** `public/index-workbench.html` (Created)
- **Styles:** `public/css/pages/workbench.css` (Created)
- **Logic:**
    - `public/js/pages/workbench.js` (To be created: Main controller)
    - `public/js/components/SmartSidebar.js` (To be created: Remark parser)
    - `public/js/utils/api.js` (Existing: Data fetching)
    - `public/js/utils/po-generator.js` (Refactor: Purchase Order logic)

## 3. Implementation Phases

### Phase 1: Core Interaction & Logic Adapter
**Goal:** Make the new HTML "come alive" with basic interactions.
- [ ] **Tab Switching Logic:** Implement JS to toggle visibility of `.hub-panel` based on `.hub-tab` clicks.
- [ ] **Data Fetching Integration:** Connect the `FETCH` button in the sidebar to the existing `fetchOutContractDetail` API.
- [ ] **State Management:** Ensure `appState` correctly updates when switching tabs (e.g., clearing selection when changing purchase types).

### Phase 2: The "Smart Sidebar" (Remark Parsing)
**Goal:** Solve the "non-standard order" problem.
- [ ] **Keyword Extractor:** Create a utility that scans the `remark` field for keywords like "锁芯" (Cylinder), "把手" (Handle), etc.
- [ ] **Alert UI:** If keywords are found, dynamically inject "Warning Cards" into the `ALERTS` section of the sidebar.
- [ ] **Quick Action:** Add a button in the Alert Card to "Add to Cylinder List" (auto-create a draft item).

### Phase 3: Domain Modules (The Tabs)
**Goal:** Implement specific logic for each purchase category.
- [ ] **Packaging Tab (Porting):** Migrate the existing "Packaging Purchase Preview" logic to the new `PACKAGING` tab. Ensure "Merge Same Size" logic works.
- [ ] **Cylinder Tab (New):** Implement the logic to extract lock cylinder requirements from the order details and display them in the `CYLINDER` tab.
- [ ] **Hardware Tab (Placeholder):** Set up the basic structure for future hardware procurement features.

### Phase 4: Validations & Polish
- [ ] **Print Styles:** ensuring `workbench.css` hides non-essential UI (sidebar, tabs) during printing, showing only the active PO table.
- [ ] **Responsiveness:** Verify layout on tablet/laptop screens.
- [ ] **User Feedback:** Add distinct "Success" or "Error" toasts/notifications for actions like "PO Generated".

## 4. Immediate Next Steps
1. Create `public/js/pages/workbench.js`.
2. Implement the Tab functionality.
3. Connect the API response to populate the "Order Meta" sidebar.
