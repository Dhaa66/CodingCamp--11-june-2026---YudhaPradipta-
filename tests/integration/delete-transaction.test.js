/**
 * Integration and property-based tests for deleteTransaction() and renderList().
 * Covers: Properties 8, 15
 *
 *   Property 8  — Delete transaction round-trip (Req 3.2)
 *   Property 15 — Every transaction list item has a delete control (Req 3.1)
 */

require('jest-canvas-mock');

const fc = require('fast-check');
const app = require('../../app.js');
const { deleteTransaction, renderList } = app;

const STORAGE_KEY = 'expense-budget-visualizer-transactions';

// ---------------------------------------------------------------------------
// DOM setup helper — minimal elements required by deleteTransaction / renderList
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="warning-banner" role="alert" aria-live="polite"></div>
    <div id="balance-display" aria-label="Total balance">Total Balance: $0.00</div>
    <ul id="transaction-list" aria-label="Transaction list"></ul>
    <canvas id="spending-chart" aria-label="Spending by category pie chart" width="300" height="300"></canvas>
  `;
}

// ---------------------------------------------------------------------------
// Shared arbitrary: a valid Transaction object as stored after addTransaction()
// ---------------------------------------------------------------------------

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
  // Mock window.confirm to return true by default (user confirms deletion)
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 8: Delete transaction round-trip
// Feature: expense-budget-visualizer, Property 8: Delete transaction round-trip
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe('Property 8 — deleteTransaction round-trip', () => {
  test('after deletion the id is absent from app.transactions and localStorage', () => {
    // Feature: expense-budget-visualizer, Property 8: Delete transaction round-trip
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1 }),
        fc.integer({ min: 0, max: 999 }), // random index selector
        (txs, rawIndex) => {
          // Reset state before each iteration
          app.transactions = txs.slice();
          app.storageAvailable = true;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(app.transactions));

          // Make sure window.confirm still returns true for this iteration
          window.confirm.mockReturnValue(true);

          // Pick a transaction to delete
          const idx = rawIndex % txs.length;
          const targetId = txs[idx].id;

          deleteTransaction(targetId);

          // The id must no longer be in app.transactions
          const foundInMemory = app.transactions.some((t) => t.id === targetId);
          expect(foundInMemory).toBe(false);

          // The id must not appear in localStorage either
          const raw = localStorage.getItem(STORAGE_KEY);
          const stored = raw ? JSON.parse(raw) : [];
          const foundInStorage = stored.some((t) => t.id === targetId);
          expect(foundInStorage).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('deleteTransaction does NOT remove entry when user cancels confirmation', () => {
    const tx = {
      id: 'keep-me-123',
      name: 'Coffee',
      amount: 4.5,
      category: 'Food',
      timestamp: Date.now(),
    };
    app.transactions = [tx];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([tx]));

    // User cancels
    window.confirm.mockReturnValue(false);

    deleteTransaction(tx.id);

    // Transaction must still be present
    expect(app.transactions.length).toBe(1);
    expect(app.transactions[0].id).toBe(tx.id);
  });
});

// ---------------------------------------------------------------------------
// Property 15: Every transaction list item has a delete control
// Feature: expense-budget-visualizer, Property 15: Every transaction list item has a delete control
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe('Property 15 — every rendered list item has a delete button with aria-label', () => {
  test('every <li data-id> rendered by renderList contains exactly one .btn-delete with non-empty aria-label', () => {
    // Feature: expense-budget-visualizer, Property 15: Every transaction list item has a delete control
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1 }), (txs) => {
        app.transactions = txs;
        renderList();

        const ul = document.getElementById('transaction-list');
        const items = ul.querySelectorAll('li[data-id]');

        // Exactly one <li> per transaction
        expect(items.length).toBe(txs.length);

        for (const li of items) {
          const deleteBtns = li.querySelectorAll('.btn-delete');

          // Exactly one delete button per list item
          expect(deleteBtns.length).toBe(1);

          // The button must have a non-empty aria-label
          const ariaLabel = deleteBtns[0].getAttribute('aria-label');
          expect(typeof ariaLabel).toBe('string');
          expect(ariaLabel.trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
