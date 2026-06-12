/**
 * Integration and property-based tests for addTransaction().
 * Covers: Properties 4, 5, 13
 *
 *   Property 4  — Add transaction round-trip (Req 1.2, 6.1)
 *   Property 5  — Form resets after valid submission (Req 1.3)
 *   Property 13 — Transaction capacity limit is enforced at 1,000 entries (Req 6.5)
 */

require('jest-canvas-mock');

const fc = require('fast-check');
const app = require('../../app.js');
const { addTransaction } = app;

const STORAGE_KEY = 'expense-budget-visualizer-transactions';

// ---------------------------------------------------------------------------
// DOM setup helper — provides all elements that addTransaction() may read/write
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="warning-banner" role="alert" aria-live="polite"></div>
    <div id="balance-display" aria-label="Total balance">Total Balance: $0.00</div>
    <form id="transaction-form" novalidate>
      <input type="text"   id="item-name"  value="" />
      <span class="field-error" id="item-name-error"></span>
      <input type="number" id="amount"     value="" />
      <span class="field-error" id="amount-error"></span>
      <select id="category">
        <option value="" disabled selected>-- Select a category --</option>
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <span class="field-error" id="category-error"></span>
      <button type="submit">Add Transaction</button>
    </form>
    <ul id="transaction-list" aria-label="Transaction list"></ul>
    <canvas id="spending-chart" aria-label="Spending by category pie chart" width="300" height="300"></canvas>
  `;
}

// ---------------------------------------------------------------------------
// Shared arbitrary: valid form data (raw strings as the form would supply)
// ---------------------------------------------------------------------------

const validFormDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  // amount as a string that parses to a valid number in [0.01, 999999999.99]
  amount: fc.double({ min: 0.01, max: 999999999.99, noNaN: true }).map((n) => String(n)),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
});

// Arbitrary for a stored Transaction object (to pre-seed app.transactions)
const transactionArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  amount: fc.double({ min: 0.01, max: 999999999.99, noNaN: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  setupDOM();
  app.transactions = [];
  app.storageAvailable = true;
  localStorage.clear();
  jest.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 4: Add transaction round-trip
// Feature: expense-budget-visualizer, Property 4: Add transaction round-trip
// Validates: Requirements 1.2, 6.1
// ---------------------------------------------------------------------------

describe('Property 4 — addTransaction round-trip', () => {
  test('for any valid formData: length +1, new entry matches fields, localStorage is updated', () => {
    // Feature: expense-budget-visualizer, Property 4: Add transaction round-trip
    fc.assert(
      fc.property(validFormDataArb, (formData) => {
        // Reset before each iteration
        app.transactions = [];
        app.storageAvailable = true;
        localStorage.clear();

        const lengthBefore = app.transactions.length; // 0

        addTransaction(formData);

        // Length increased by exactly 1
        expect(app.transactions.length).toBe(lengthBefore + 1);

        // The new entry has matching fields
        const newEntry = app.transactions[app.transactions.length - 1];
        expect(newEntry.name).toBe(formData.name.trim());
        expect(newEntry.amount).toBeCloseTo(Number(formData.amount), 5);
        expect(newEntry.category).toBe(formData.category);

        // localStorage must contain a serialized entry with that id
        const raw = localStorage.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();
        const stored = JSON.parse(raw);
        expect(Array.isArray(stored)).toBe(true);
        const storedEntry = stored.find((t) => t.id === newEntry.id);
        expect(storedEntry).toBeDefined();
        expect(storedEntry.name).toBe(newEntry.name);
        expect(storedEntry.amount).toBeCloseTo(newEntry.amount, 5);
        expect(storedEntry.category).toBe(newEntry.category);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Form resets after valid submission
// Feature: expense-budget-visualizer, Property 5: Form resets after valid submission
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------

describe('Property 5 — form inputs reset after successful addTransaction', () => {
  test('name input, amount input, and category select are all empty/placeholder after add', () => {
    // Feature: expense-budget-visualizer, Property 5: Form resets after valid submission
    fc.assert(
      fc.property(validFormDataArb, (formData) => {
        // Reset before each iteration
        app.transactions = [];
        app.storageAvailable = true;
        localStorage.clear();

        // Pre-fill the DOM inputs so addTransaction can read and then reset them
        const nameInput = document.getElementById('item-name');
        const amountInput = document.getElementById('amount');
        const categorySelect = document.getElementById('category');

        nameInput.value = formData.name;
        amountInput.value = formData.amount;
        categorySelect.value = formData.category;

        addTransaction(formData);

        // After a successful add, all three inputs must be reset
        expect(nameInput.value).toBe('');
        expect(amountInput.value).toBe('');
        // The category select must be reset to '' (the placeholder option)
        expect(categorySelect.value).toBe('');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Transaction capacity limit is enforced at 1,000 entries
// Feature: expense-budget-visualizer, Property 13: Transaction capacity limit is enforced at 1,000 entries
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------

describe('Property 13 — capacity limit at 1,000 entries', () => {
  test('addTransaction with exactly 1000 existing entries does NOT add a new entry', () => {
    // Feature: expense-budget-visualizer, Property 13: Transaction capacity limit is enforced at 1,000 entries
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1000, maxLength: 1000 }),
        validFormDataArb,
        (existingTxs, newFormData) => {
          // Seed 1000 entries
          app.transactions = existingTxs.slice(); // copy to avoid mutation across iterations
          app.storageAvailable = true;

          // Persist the 1000 entries as the current localStorage baseline
          localStorage.setItem(STORAGE_KEY, JSON.stringify(app.transactions));

          const lengthBefore = app.transactions.length; // 1000
          const storageBefore = localStorage.getItem(STORAGE_KEY);

          addTransaction(newFormData);

          // Length must remain 1000
          expect(app.transactions.length).toBe(lengthBefore);
          expect(app.transactions.length).toBe(1000);

          // localStorage must be unchanged
          expect(localStorage.getItem(STORAGE_KEY)).toBe(storageBefore);
        }
      ),
      { numRuns: 10 } // fewer runs because seeding 1000 items is expensive
    );
  });

  test('addTransaction with fewer than 1000 existing entries succeeds', () => {
    // Feature: expense-budget-visualizer, Property 13: Transaction capacity limit is enforced at 1,000 entries
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 999 }),
        validFormDataArb,
        (existingTxs, newFormData) => {
          app.transactions = existingTxs.slice();
          app.storageAvailable = true;
          localStorage.clear();

          const lengthBefore = app.transactions.length;

          addTransaction(newFormData);

          // Should have added exactly 1 entry
          expect(app.transactions.length).toBe(lengthBefore + 1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
