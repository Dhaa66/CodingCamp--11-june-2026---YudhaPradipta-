# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page web application (SPA) built with plain HTML, CSS, and Vanilla JavaScript — no frameworks, no build tools, no backend. All state is stored in the browser's `localStorage` and all rendering is driven by a single lightweight state management loop.

The core design principle is **simplicity and correctness over abstraction**: a small set of pure functions transform data, a thin DOM layer renders it, and a persistence layer syncs to `localStorage` on every state change.

### Key Design Goals

- **No dependencies**: zero npm packages, CDN scripts, or bundlers. The entire app ships as three files: `index.html`, `style.css`, `app.js`.
- **Single source of truth**: the in-memory `transactions` array is the canonical state; the DOM and `localStorage` are always derived from it.
- **Pure-function core**: balance calculation, category aggregation, and validation are stateless pure functions — easy to unit-test and reason about.
- **Reactive UI**: any mutation to state triggers a full re-render of the affected components (Transaction_List, Balance_Display, Chart) within the required time bounds.

---

## Architecture

The app follows a simple **unidirectional data-flow** pattern:

```
User Action
     │
     ▼
 Validator ──(fail)──► Error Display
     │
   (pass)
     │
     ▼
State Mutation (transactions[])
     │
     ▼
Persistence (localStorage.setItem)
     │
     ▼
  Render (DOM update + Chart redraw)
```

### File Structure

```
index.html      – HTML skeleton, single <script> and <link> tag
style.css       – All visual styles, including responsive breakpoints
app.js          – All application logic (state, validation, persistence, rendering, chart)
```

This satisfies Requirement 7.2 (exactly one CSS file and one JS file).

### Module Boundaries (within app.js)

Although the app is a single file, the code is organized into clearly named sections:

| Section | Responsibility |
|---|---|
| **State** | Holds the in-memory `transactions` array and a `storageAvailable` flag |
| **Persistence** | `loadFromStorage()`, `saveToStorage()` — reads and writes `localStorage` |
| **Validator** | `validateForm(formData)` → returns `{ valid, errors }` |
| **Calculator** | `computeBalance(transactions)`, `computeCategoryTotals(transactions)` |
| **Renderer** | `renderList()`, `renderBalance()`, `renderChart()` |
| **Chart** | `drawPieChart(canvas, categoryTotals)` — draws using Canvas 2D API |
| **Event Handlers** | Wires DOM events to state mutations and renders |

---

## Components and Interfaces

### 1. Input_Form

**HTML element**: `<form id="transaction-form">`

Fields:
- `<input type="text" id="item-name" maxlength="100">` — item name (1–100 chars)
- `<input type="number" id="amount" min="0.01" max="999999999.99" step="0.01">` — amount
- `<select id="category">` — options: placeholder (disabled, selected by default), Food, Transport, Fun

Each field has an adjacent `<span class="field-error">` that holds inline error messages (Requirement 1.4–1.6).

**Submit handler interface:**
```js
function handleFormSubmit(event) { ... }
// - calls validateForm()
// - on failure: renders inline errors, returns
// - on success: calls addTransaction(), resetForm()
```

### 2. Transaction_List

**HTML element**: `<ul id="transaction-list" aria-label="Transaction list">`

Each item renders as:
```html
<li data-id="{transaction.id}">
  <span class="tx-name">{name}</span>
  <span class="tx-amount">${amount}</span>
  <span class="tx-category">{category}</span>
  <span class="tx-date">{formattedDate}</span>
  <button class="btn-delete" aria-label="Delete {name}">✕</button>
</li>
```

When empty, renders:
```html
<li class="empty-state">No expenses recorded yet.</li>
```

Transactions are rendered in ascending timestamp order (Requirement 2.4).

### 3. Balance_Display

**HTML element**: `<div id="balance-display" aria-label="Total balance">`

Renders the sum of all transaction amounts formatted to two decimal places:
```
Total Balance: $1,234.56
```

### 4. Chart (Pie Chart)

**HTML element**: `<canvas id="spending-chart" aria-label="Spending by category pie chart">`

Rendered using the Canvas 2D API (no external library). The draw function:
- Accepts `categoryTotals: { Food: number, Transport: number, Fun: number }`
- Omits zero-value categories from the rendered segments (Requirement 5.6)
- When all totals are zero, draws a single full grey circle with a "No data" label (Requirement 5.4)
- Fixed color map: `{ Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }` (Requirement 5.5)

### 5. Validator

Pure function, no side effects:

```js
/**
 * @param {{ name: string, amount: string, category: string }} formData
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(formData) { ... }
```

Validation rules:
- `name`: required, 1–100 characters after trimming
- `amount`: required, must parse to a finite number in range [0.01, 999999999.99]
- `category`: must be one of `['Food', 'Transport', 'Fun']`

### 6. Persistence Layer

```js
function loadFromStorage() → Transaction[] | null
function saveToStorage(transactions: Transaction[]) → void
```

- `loadFromStorage` returns `null` (and sets a warning) if `localStorage` is unavailable or data is corrupt/not a valid JSON array.
- `saveToStorage` is a no-op (with warning) if `localStorage` is unavailable.
- The `storageAvailable` flag is set once on app initialization.

---

## Data Models

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - UUID v4 generated at creation time (crypto.randomUUID())
 * @property {string}  name      - Item name (1–100 characters)
 * @property {number}  amount    - Positive monetary amount (0.01–999,999,999.99)
 * @property {string}  category  - One of: 'Food' | 'Transport' | 'Fun'
 * @property {number}  timestamp - Unix epoch (ms) from Date.now() at creation
 */
```

### localStorage Schema

Key: `"expense-budget-visualizer-transactions"`  
Value: JSON-serialized array of `Transaction` objects

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Coffee",
    "amount": 4.50,
    "category": "Food",
    "timestamp": 1718000000000
  }
]
```

### Category Totals (computed, not stored)

```js
/**
 * @typedef {Object} CategoryTotals
 * @property {number} Food
 * @property {number} Transport
 * @property {number} Fun
 */
```

Computed by `computeCategoryTotals()` on every render cycle from the in-memory `transactions` array.

### FormData (transient, not stored)

```js
/**
 * @typedef {Object} FormData
 * @property {string} name
 * @property {string} amount   - raw string from input, before numeric parsing
 * @property {string} category
 */
```

### ValidationResult (transient, not stored)

```js
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {{ name?: string, amount?: string, category?: string }} errors
 */
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Validator rejects empty or missing fields

*For any* form submission where one or more of the name, amount, or category fields is empty (empty string, whitespace-only, or unselected placeholder), `validateForm()` SHALL return `valid: false` and include a non-empty error message for each empty field.

**Validates: Requirements 1.4**

---

### Property 2: Validator rejects out-of-range or non-numeric amounts

*For any* form submission where the amount string is non-numeric, zero, negative, or greater than 999,999,999.99, `validateForm()` SHALL return `valid: false` and include a non-empty error for the amount field.

**Validates: Requirements 1.5**

---

### Property 3: Validator rejects item names exceeding 100 characters

*For any* string of length greater than 100 characters supplied as the item name, `validateForm()` SHALL return `valid: false` and include a non-empty error for the name field.

**Validates: Requirements 1.6**

---

### Property 4: Add transaction round-trip

*For any* valid transaction (name 1–100 chars, amount in [0.01, 999,999,999.99], category in {Food, Transport, Fun}), after `addTransaction()` is called, the in-memory `transactions` array length SHALL increase by exactly 1, the new entry SHALL appear in the array with matching fields, and `localStorage` SHALL contain the serialized representation of that transaction.

**Validates: Requirements 1.2, 6.1**

---

### Property 5: Form resets after valid submission

*For any* valid form submission, after the transaction is saved, the name input SHALL be empty, the amount input SHALL be empty, and the category dropdown SHALL be reset to its default unselected placeholder.

**Validates: Requirements 1.3**

---

### Property 6: Transaction list renders all required fields for every entry

*For any* non-empty `transactions` array passed to `renderList()`, every rendered list item SHALL contain the transaction's item name, formatted amount, category, and formatted date/time — with no entry missing any of these four fields.

**Validates: Requirements 2.1**

---

### Property 7: Transaction list is always rendered in ascending timestamp order

*For any* array of transactions in arbitrary insertion order, `renderList()` SHALL produce DOM entries whose data-id order corresponds to transactions sorted by ascending `timestamp` value, with the most recently added transaction appearing last.

**Validates: Requirements 2.4**

---

### Property 8: Delete transaction round-trip

*For any* transaction present in the `transactions` array, after the user confirms deletion via the delete control, that transaction's `id` SHALL no longer appear in the `transactions` array AND `localStorage` SHALL not contain any serialized entry with that `id`.

**Validates: Requirements 3.2**

---

### Property 9: Balance equals the exact sum of all transaction amounts

*For any* array of transactions (including the empty array), `computeBalance(transactions)` SHALL return the mathematically exact sum of all `amount` fields, with the result being 0 for an empty array. This invariant must hold after every add and every delete operation.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

---

### Property 10: Category totals correctly aggregate all transaction amounts

*For any* array of transactions, `computeCategoryTotals(transactions)` SHALL return an object where the value for each category key equals the sum of the `amount` fields of all transactions whose `category` matches that key, and categories with no matching transactions SHALL have a value of 0.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 11: Zero-value categories are omitted from pie chart segments

*For any* `categoryTotals` object where at least one category has a value of 0 and at least one has a non-zero value, `drawPieChart()` SHALL render segments only for categories with non-zero totals, and the rendered segments SHALL sum to a full circle (360°).

**Validates: Requirements 5.6**

---

### Property 12: Persistence round-trip preserves all transaction data

*For any* array of valid `Transaction` objects, serializing them to `localStorage` via `saveToStorage()` and then deserializing them via `loadFromStorage()` SHALL produce an array of objects equivalent to the original (same `id`, `name`, `amount`, `category`, and `timestamp` for every entry, in the same order).

**Validates: Requirements 2.2, 6.3**

---

### Property 13: Transaction capacity limit is enforced at 1,000 entries

*For any* `transactions` array of length ≥ 1,000, calling `addTransaction()` SHALL not add the new entry to the array, SHALL not update `localStorage`, and SHALL display a non-blocking warning. *For any* array of length < 1,000, a valid add SHALL succeed.

**Validates: Requirements 6.5**

---

### Property 14: ARIA labels are always present on key components

*For any* app state (empty list, populated list, mid-deletion), the DOM elements for `Balance_Display`, `Transaction_List`, and the Chart `<canvas>` SHALL each carry a non-empty `aria-label` attribute. This invariant must hold regardless of state mutations.

**Validates: Requirements 7.5**

---

### Property 15: Every transaction list item has a delete control

*For any* non-empty `transactions` array, every `<li>` rendered by `renderList()` SHALL contain exactly one delete button element with a non-empty `aria-label`.

**Validates: Requirements 3.1**

---

## Error Handling

### Validation Errors (user-facing, recoverable)

| Scenario | Error Type | Handling |
|---|---|---|
| Empty name field | Inline field error | Display below name input; prevent submit |
| Name > 100 chars | Inline field error | Display below name input; prevent submit |
| Empty amount field | Inline field error | Display below amount input; prevent submit |
| Amount out of range or non-numeric | Inline field error | Display below amount input; prevent submit |
| No category selected | Inline field error | Display below dropdown; prevent submit |

Inline errors are cleared on the next successful submission or when the user modifies the field.

### System Errors (non-blocking banners)

| Scenario | Error Type | Handling |
|---|---|---|
| `localStorage` unavailable at startup | Warning banner | Show sticky banner at top of page; initialize with empty list |
| `localStorage` data is corrupt/unparseable | Warning banner | Show sticky banner; initialize with empty list |
| `localStorage` unavailable at save time | Warning banner | Show banner; prevent transaction from being added |
| Transaction limit (1,000) reached | Warning banner | Show banner; prevent transaction from being added |

### Defensive Coding

- `loadFromStorage()` wraps its `localStorage.getItem` and `JSON.parse` calls in a try/catch; any thrown error triggers the corrupt-data path.
- `saveToStorage()` wraps `localStorage.setItem` in a try/catch; a `QuotaExceededError` or other storage error is caught, logged, and shown as a non-blocking warning.
- `computeBalance()` and `computeCategoryTotals()` use `Number(amount)` with a fallback to 0 for NaN values to avoid propagating `NaN` into the UI.
- `renderList()` and `renderBalance()` are idempotent — calling them multiple times with the same state produces the same DOM output.
- All event listeners use `event.preventDefault()` on form submit to prevent full-page reload.

---

## Testing Strategy

### Overview

Because the core application logic is composed of **pure functions** (validation, balance calculation, category aggregation) and **serialization/deserialization** (localStorage persistence), property-based testing is directly applicable to those layers. The DOM rendering layer is best covered with targeted example-based tests.

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library, browser-compatible)

Each property test must:
- Run a minimum of **100 iterations** (fast-check default `numRuns: 100`)
- Include a tag comment referencing the design property being tested
- Use arbitrary generators for the full valid input space

**Tag format**: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`

#### Properties to Test with fast-check

| Design Property | Arbitrary Generators | Assertion |
|---|---|---|
| Property 1: Validator rejects empty fields | `fc.record({ name: fc.constant(''), amount: fc.string(), category: fc.constant('') })` etc. | `result.valid === false && result.errors.name !== undefined` |
| Property 2: Validator rejects bad amounts | `fc.oneof(fc.constant(''), fc.constant('abc'), fc.double({ max: 0 }), fc.double({ min: 1e9 }))` | `result.valid === false && result.errors.amount !== undefined` |
| Property 3: Validator rejects long names | `fc.string({ minLength: 101 })` | `result.valid === false && result.errors.name !== undefined` |
| Property 4: Add transaction round-trip | `fc.record({ name: fc.string({minLength:1,maxLength:100}), amount: fc.double({min:0.01,max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun') })` | List length +1, localStorage contains entry |
| Property 5: Form resets after submit | Same as Property 4 | After add: name='', amount='', category=placeholder |
| Property 6: List renders all fields | `fc.array(transactionArb, { minLength: 1 })` | Each rendered item contains name, amount, category, date |
| Property 7: List rendered in ascending timestamp order | `fc.array(transactionArb, { minLength: 2 })` | DOM item timestamps are non-decreasing |
| Property 8: Delete round-trip | `fc.array(transactionArb, { minLength: 1 })` + pick random index | Transaction id absent from array and localStorage after delete |
| Property 9: Balance equals sum | `fc.array(transactionArb)` | `computeBalance(txs) === txs.reduce((s,t)=>s+t.amount, 0)` |
| Property 10: Category totals correct | `fc.array(transactionArb)` | Totals per category equal filtered sum |
| Property 11: Zero categories omitted from chart | `fc.record({ Food: fc.nat(), Transport: fc.constant(0), Fun: fc.nat() })` etc. | Rendered segments count equals non-zero category count |
| Property 12: Persistence round-trip | `fc.array(transactionArb)` | `loadFromStorage(saveToStorage(txs)) deep-equals txs` |
| Property 13: Capacity limit at 1,000 | `fc.array(transactionArb, {minLength:1000,maxLength:1000})` + one more | Add returns false; list length unchanged |
| Property 14: ARIA labels always present | `fc.array(transactionArb)` | All three landmark elements have non-empty aria-label after render |
| Property 15: Delete control on every item | `fc.array(transactionArb, { minLength: 1 })` | Every rendered `<li>` has one `.btn-delete` element |

### Example-Based Unit Tests

Focus on **specific scenarios** and **error paths** not covered by the above:

- UI renders correct empty-state placeholder when list is empty (Requirement 2.5)
- Deleting the last transaction shows all three empty states (Requirement 3.5)
- `localStorage` unavailable at startup shows warning and initializes empty (Requirement 6.4)
- `localStorage` corrupt data shows warning and initializes empty (Requirement 6.4)
- Chart color map has distinct fixed values for Food, Transport, Fun (Requirement 5.5)
- Form fields appear in correct DOM tab order (Requirement 7.4)
- `loadFromStorage()` with invalid JSON returns null and triggers warning (Requirement 6.4)

### Integration / Smoke Tests

Manual or single-run checks that do not require repetition:

- App loads without errors in Chrome, Firefox, Edge, Safari (Requirement 7.1)
- App reflows correctly at 600px viewport width (Requirement 7.3)
- `index.html` has exactly one `<link>` and one `<script>` tag (Requirement 7.2)
- Balance_Display uses sticky/fixed positioning (Requirement 4.1)

### Test File Organization

```
tests/
  unit/
    validator.test.js       # Properties 1, 2, 3 (PBT + examples)
    calculator.test.js      # Properties 9, 10 (PBT)
    persistence.test.js     # Properties 12, 4 partial (PBT)
    capacity.test.js        # Property 13 (PBT)
  integration/
    add-transaction.test.js # Properties 4, 5 (PBT + examples)
    delete-transaction.test.js # Properties 8, 15 (PBT)
    render.test.js          # Properties 6, 7, 11, 14 (PBT + examples)
    edge-cases.test.js      # Example-based edge cases
```
