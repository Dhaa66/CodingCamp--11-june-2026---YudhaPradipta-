# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a zero-dependency single-page web application (`index.html`, `style.css`, `app.js`) that tracks personal expenses, persists data in `localStorage`, and renders a live-updating Canvas 2D pie chart. The implementation follows the unidirectional data-flow architecture defined in the design: every state mutation flows through Validator → State → Persistence → Render.

---

## Tasks

- [x] 1. Scaffold project files and define core data types
  - Create `index.html` with semantic HTML skeleton: `<form id="transaction-form">`, `<ul id="transaction-list">`, `<div id="balance-display">`, `<canvas id="spending-chart">`, and a `<div id="warning-banner">` for system messages
  - Add exactly one `<link rel="stylesheet" href="style.css">` and one `<script src="app.js" defer>` (satisfies Requirement 7.2)
  - Add ARIA labels to `#balance-display`, `#transaction-list`, and `#spending-chart` (Requirement 7.5)
  - Add all `<span class="field-error">` placeholders adjacent to each Input_Form field (Requirement 1.4–1.6)
  - Create `style.css` with base styles: CSS custom properties for colors, flex/grid layout, sticky Balance_Display header (Requirement 4.1), responsive breakpoint at 600 px (Requirement 7.3), tab-order-consistent visual stacking of form fields (Requirement 7.4)
  - Create `app.js` with section comments: `// === STATE ===`, `// === PERSISTENCE ===`, `// === VALIDATOR ===`, `// === CALCULATOR ===`, `// === RENDERER ===`, `// === CHART ===`, `// === EVENT HANDLERS ===`
  - Declare the `transactions` array and `storageAvailable` flag in the STATE section
  - Define the `Transaction` JSDoc typedef and the `CATEGORY_COLORS` constant map `{ Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }` (Requirement 5.5)
  - _Requirements: 1.1, 2.1, 4.1, 5.5, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement Validator and Calculator pure functions
  - [x] 2.1 Implement `validateForm(formData)` in the VALIDATOR section
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }` as specified in the design
    - Enforce: name 1–100 chars after trimming (Requirements 1.4, 1.6), amount finite number in [0.01, 999999999.99] (Requirements 1.4, 1.5), category one of `['Food', 'Transport', 'Fun']` (Requirement 1.4)
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 2.2 Write property tests for `validateForm` — Properties 1, 2, 3
    - Create `tests/unit/validator.test.js`
    - **Property 1: Validator rejects empty or missing fields** — use `fc.record` with empty-string/whitespace-only/placeholder values; assert `result.valid === false` and each missing field has a non-empty error message
    - **Validates: Requirements 1.4**
    - **Property 2: Validator rejects out-of-range or non-numeric amounts** — use `fc.oneof(fc.constant(''), fc.constant('abc'), fc.double({ max: 0 }), fc.double({ min: 1e9 }))`; assert `result.valid === false && result.errors.amount !== undefined`
    - **Validates: Requirements 1.5**
    - **Property 3: Validator rejects item names exceeding 100 characters** — use `fc.string({ minLength: 101 })`; assert `result.valid === false && result.errors.name !== undefined`
    - **Validates: Requirements 1.6**
    - Include example-based tests for edge cases: name of exactly 100 chars passes, amount of exactly 0.01 passes, amount of exactly 999999999.99 passes
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 2.3 Implement `computeBalance(transactions)` and `computeCategoryTotals(transactions)` in the CALCULATOR section
    - `computeBalance`: return the sum of all `amount` fields; return 0 for empty array; use `Number(t.amount) || 0` fallback to avoid NaN propagation (Requirements 4.2, 4.5)
    - `computeCategoryTotals`: return `{ Food, Transport, Fun }` where each value equals the sum of `amount` for matching transactions; default each category to 0 (Requirements 5.1, 5.2, 5.3)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x] 2.4 Write property tests for Calculator — Properties 9, 10
    - Create `tests/unit/calculator.test.js`
    - **Property 9: Balance equals the exact sum of all transaction amounts** — use `fc.array(transactionArb)`; assert `computeBalance(txs) === txs.reduce((s,t) => s+t.amount, 0)`
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - **Property 10: Category totals correctly aggregate all transaction amounts** — use `fc.array(transactionArb)`; for each category key assert the computed value equals the filtered-sum of matching entries, and categories with no matching transactions equal 0
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - _Requirements: 4.2, 4.5, 5.1, 5.2, 5.3_

- [ ] 3. Implement Persistence layer
  - [x] 3.1 Implement `loadFromStorage()` and `saveToStorage(transactions)` in the PERSISTENCE section
    - `loadFromStorage`: wrap `localStorage.getItem` and `JSON.parse` in try/catch; return parsed array on success; return `null` and set `storageAvailable = false` on any error; validate that parsed value is an Array before returning (Requirements 6.3, 6.4)
    - `saveToStorage`: wrap `localStorage.setItem` in try/catch; catch `QuotaExceededError` and other errors; show non-blocking warning banner and set `storageAvailable = false` on failure (Requirement 6.1, 6.2)
    - Initialize `storageAvailable` by testing `localStorage` availability once on startup using a try/catch probe write/delete; display warning banner if unavailable (Requirement 6.4)
    - _Requirements: 2.2, 6.1, 6.2, 6.3, 6.4_

  - [ ] 3.2 Write property tests for Persistence — Property 12
    - Create `tests/unit/persistence.test.js`
    - **Property 12: Persistence round-trip preserves all transaction data** — use `fc.array(transactionArb)`; call `saveToStorage(txs)` then `loadFromStorage()`; assert the result deep-equals the input array (same `id`, `name`, `amount`, `category`, `timestamp` for every entry, in the same order)
    - **Validates: Requirements 2.2, 6.3**
    - Include example tests: `loadFromStorage` with invalid JSON returns null; corrupt data triggers warning banner
    - _Requirements: 2.2, 6.3, 6.4_

- [x] 4. Checkpoint — Validate pure functions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement state mutations: `addTransaction` and `deleteTransaction`
  - [x] 5.1 Implement `addTransaction(formData)` in the EVENT HANDLERS / STATE section
    - Check `storageAvailable`; if false, show warning and return (Requirement 1.7)
    - Check `transactions.length >= 1000`; if true, show warning and return (Requirement 6.5)
    - Call `validateForm(formData)`; on failure render inline errors and return
    - Create a new `Transaction` object with `id = crypto.randomUUID()`, `timestamp = Date.now()`, and the validated fields
    - Push to `transactions`, call `saveToStorage(transactions)`, then call `renderAll()` (Requirements 1.2, 4.3, 5.2, 6.1)
    - Reset form fields after save (Requirement 1.3)
    - _Requirements: 1.2, 1.3, 1.7, 4.3, 5.2, 6.1, 6.5_

  - [ ] 5.2 Write property tests for `addTransaction` — Properties 4, 5, 13
    - Create `tests/integration/add-transaction.test.js`
    - **Property 4: Add transaction round-trip** — use valid transaction arbitrary; assert `transactions.length` increases by exactly 1, the new entry matches input fields, and `localStorage` contains the serialized entry
    - **Validates: Requirements 1.2, 6.1**
    - **Property 5: Form resets after valid submission** — after `addTransaction` succeeds, assert name input is `''`, amount input is `''`, and category dropdown value equals the placeholder value
    - **Validates: Requirements 1.3**
    - **Property 13: Transaction capacity limit is enforced at 1,000 entries** — seed `transactions` with exactly 1,000 entries using `fc.array(transactionArb, { minLength:1000, maxLength:1000 })`; call `addTransaction` with one more valid entry; assert `transactions.length` remains 1,000 and `localStorage` is unchanged; also assert that for arrays of length < 1,000 a valid add succeeds
    - **Validates: Requirements 6.5**
    - _Requirements: 1.2, 1.3, 6.1, 6.5_

  - [x] 5.3 Implement `deleteTransaction(id)` in the EVENT HANDLERS / STATE section
    - Show a confirmation dialog (`window.confirm`); return early if user cancels (Requirement 3.2)
    - Filter `transactions` to remove the entry with the matching `id`
    - Call `saveToStorage(transactions)` then `renderAll()` (Requirements 3.3, 3.4, 6.2)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.4, 5.3, 6.2_

  - [ ] 5.4 Write property tests for `deleteTransaction` — Properties 8, 15
    - Create `tests/integration/delete-transaction.test.js`
    - **Property 8: Delete transaction round-trip** — use `fc.array(transactionArb, { minLength: 1 })` and pick a random index; after deletion assert that `id` no longer appears in `transactions` and `localStorage` contains no entry with that `id`
    - **Validates: Requirements 3.2**
    - **Property 15: Every transaction list item has a delete control** — use `fc.array(transactionArb, { minLength: 1 })`; call `renderList()`; assert every rendered `<li>` contains exactly one `.btn-delete` element with a non-empty `aria-label`
    - **Validates: Requirements 3.1**
    - _Requirements: 3.1, 3.2_

- [x] 6. Implement Renderer functions
  - [x] 6.1 Implement `renderList()` in the RENDERER section
    - Sort `transactions` by ascending `timestamp` before rendering (Requirement 2.4)
    - Clear `#transaction-list` innerHTML
    - If empty, render `<li class="empty-state">No expenses recorded yet.</li>` (Requirement 2.5)
    - Otherwise render one `<li data-id="{id}">` per transaction with spans for name, amount (formatted `$N,NNN.NN`), category, date/time, and a `<button class="btn-delete" aria-label="Delete {name}">✕</button>` (Requirements 2.1, 3.1)
    - _Requirements: 2.1, 2.4, 2.5, 3.1_

  - [x] 6.2 Implement `renderBalance()` in the RENDERER section
    - Call `computeBalance(transactions)` and update `#balance-display` text to `Total Balance: $N,NNN.NN` (Requirements 4.2, 4.3, 4.4, 4.5)
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 6.3 Implement `drawPieChart(canvas, categoryTotals)` in the CHART section and `renderChart()` in the RENDERER section
    - `drawPieChart`: use Canvas 2D API; if all totals are 0 draw a full grey circle with "No data" center label (Requirement 5.4); otherwise draw arc segments proportional to each category's share of the total, using `CATEGORY_COLORS`, skipping zero-value categories (Requirement 5.6); draw a legend with color swatches and category labels
    - `renderChart()`: call `computeCategoryTotals(transactions)` then `drawPieChart(canvas, totals)` (Requirements 5.1, 5.2, 5.3)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.4 Implement `renderAll()` helper that calls `renderList()`, `renderBalance()`, and `renderChart()` in sequence
    - Ensure each component updates within the timing bounds defined in the requirements (≤100 ms for Balance_Display, ≤500 ms for Chart and List)
    - _Requirements: 3.3, 3.4, 4.3, 4.4, 5.2, 5.3_

  - [x] 6.5 Write property tests for Renderer — Properties 6, 7, 11, 14
    - Create `tests/integration/render.test.js`
    - **Property 6: Transaction list renders all required fields for every entry** — use `fc.array(transactionArb, { minLength: 1 })`; call `renderList()`; assert every rendered `<li>` contains non-empty text for name, amount, category, and date
    - **Validates: Requirements 2.1**
    - **Property 7: Transaction list is always rendered in ascending timestamp order** — use `fc.array(transactionArb, { minLength: 2 })` in arbitrary insertion order; call `renderList()`; assert DOM item `data-id` order corresponds to ascending `timestamp`
    - **Validates: Requirements 2.4**
    - **Property 11: Zero-value categories are omitted from pie chart segments** — use `fc.record({ Food: fc.nat(), Transport: fc.constant(0), Fun: fc.nat() })` (and permutations); call `drawPieChart()`; assert the number of rendered arc segments equals the count of non-zero category values and the arcs sum to a full circle
    - **Validates: Requirements 5.6**
    - **Property 14: ARIA labels are always present on key components** — use `fc.array(transactionArb)`; call `renderAll()`; assert `#balance-display`, `#transaction-list`, and `#spending-chart` each have a non-empty `aria-label`
    - **Validates: Requirements 7.5**
    - _Requirements: 2.1, 2.4, 5.6, 7.5_

- [x] 7. Checkpoint — Validate rendering and state mutations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire event handlers and app initialization
  - [x] 8.1 Implement the form submit event handler `handleFormSubmit(event)`
    - Call `event.preventDefault()`, read values from the three form fields, call `addTransaction(formData)`
    - Render inline errors for any `ValidationResult.errors` returned (Requirements 1.4, 1.5, 1.6)
    - Clear field-level error spans on the next field `input` event (progressive disclosure)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 8.2 Implement the delete button event handler using event delegation on `#transaction-list`
    - Listen for `click` on `.btn-delete` children; extract `data-id` from the parent `<li>`; call `deleteTransaction(id)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.3 Implement the app initialization function `initApp()`
    - Probe `localStorage` availability and set `storageAvailable`
    - Call `loadFromStorage()`; if result is null show warning banner and set `transactions = []`; otherwise set `transactions = result` (Requirement 6.4)
    - Call `renderAll()` to populate Transaction_List, Balance_Display, and Chart on load (Requirement 2.2, 6.3)
    - Attach all event listeners: form submit, delete delegation
    - Call `initApp()` on `DOMContentLoaded`
    - _Requirements: 2.2, 6.3, 6.4_

  - [x] 8.4 Write edge-case example tests
    - Create `tests/integration/edge-cases.test.js`
    - Test: UI renders empty-state placeholder when `transactions` is empty (Requirement 2.5)
    - Test: Deleting the last transaction shows all three empty states simultaneously — empty-state `<li>`, grey "No data" chart, balance `$0.00` (Requirement 3.5)
    - Test: `localStorage` unavailable at startup shows warning banner and initializes empty (Requirement 6.4)
    - Test: Corrupt/invalid JSON in `localStorage` shows warning and initializes empty (Requirement 6.4)
    - Test: `CATEGORY_COLORS` map has distinct non-empty values for Food, Transport, and Fun (Requirement 5.5)
    - Test: Form fields appear in correct DOM tab-index / source order (Requirement 7.4)
    - _Requirements: 2.5, 3.5, 5.5, 6.4, 7.4_

- [x] 9. Apply responsive and accessible styles
  - Implement the 600 px media query in `style.css` to reflow all components into a single-column layout with no horizontal overflow (Requirement 7.3)
  - Ensure `#balance-display` uses `position: sticky; top: 0` so it remains visible during Transaction_List scroll (Requirement 4.1)
  - Ensure tab order matches top-to-bottom, left-to-right visual reading order — item name → amount → category → submit button (Requirement 7.4)
  - Verify no overlapping elements and all interactive controls remain operable in Chrome, Firefox, Edge, and Safari (Requirement 7.1)
  - _Requirements: 4.1, 7.1, 7.3, 7.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- All 15 correctness properties from the design are covered by property-based tests using `fast-check`.
- Checkpoints at tasks 4, 7, and 10 ensure incremental validation at each major layer boundary.
- `crypto.randomUUID()` is available in all modern browsers without a polyfill (Chrome 92+, Firefox 95+, Safari 15.4+, Edge 92+).
- The `tests/` directory sits alongside `index.html`; test files import functions exported from `app.js` using ES module syntax or a test-compatible bundle — check the fast-check setup for the exact runner configuration.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.3", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.4", "3.2", "5.1", "6.1", "6.2", "6.3"] },
    { "id": 2, "tasks": ["5.2", "5.3", "6.4"] },
    { "id": 3, "tasks": ["5.4", "6.5"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["8.4"] }
  ]
}
```
