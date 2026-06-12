/**
 * Integration / property-based tests for the RENDERER section of app.js.
 * Covers: renderList, renderBalance, drawPieChart, renderAll
 *
 * Properties tested:
 *   Property 6  — Transaction list renders all required fields for every entry (Req 2.1)
 *   Property 7  — Transaction list is always rendered in ascending timestamp order (Req 2.4)
 *   Property 11 — Zero-value categories are omitted from pie chart segments (Req 5.6)
 *   Property 14 — ARIA labels are always present on key components (Req 7.5)
 */

require('jest-canvas-mock');

const fc = require('fast-check');
const app = require('../../app.js');
const { renderList, renderBalance, renderChart, renderAll, drawPieChart } = app;

// ---------------------------------------------------------------------------
// DOM setup helpers
// ---------------------------------------------------------------------------

/**
 * Set up the minimal DOM elements that the renderer functions depend on.
 * Called before each test to ensure a clean state.
 */
function setupDOM() {
  document.body.innerHTML = `
    <ul id="transaction-list" aria-label="Transaction list"></ul>
    <div id="balance-display" aria-label="Total balance"></div>
    <canvas id="spending-chart" aria-label="Spending by category pie chart" width="300" height="300"></canvas>
  `;
}

// ---------------------------------------------------------------------------
// Shared arbitrary: a valid Transaction object as it would be stored after
// addTransaction() — name is trimmed and non-empty, amount is numeric.
// ---------------------------------------------------------------------------

const transactionArb = fc.record({
  id: fc.uuid(),
  // Names are stored after trim(), so restrict to strings that are non-empty after trim
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  amount: fc.double({ min: 0.01, max: 999999999.99, noNaN: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// ---------------------------------------------------------------------------
// Property 6: Transaction list renders all required fields for every entry
// Feature: expense-budget-visualizer, Property 6: Transaction list renders all required fields for every entry
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------

describe('Property 6 — renderList renders all required fields', () => {
  beforeEach(setupDOM);

  test('every rendered <li> contains non-empty name, amount, category, and date text', () => {
    // Feature: expense-budget-visualizer, Property 6: Transaction list renders all required fields for every entry
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1 }), (txs) => {
        // Inject transactions into app state
        app.transactions = txs;
        renderList();

        const ul = document.getElementById('transaction-list');
        const items = ul.querySelectorAll('li[data-id]');

        // There must be exactly as many items as transactions
        expect(items.length).toBe(txs.length);

        for (const li of items) {
          // name
          const nameEl = li.querySelector('.tx-name');
          expect(nameEl).not.toBeNull();
          expect(nameEl.textContent.trim().length).toBeGreaterThan(0);

          // amount
          const amountEl = li.querySelector('.tx-amount');
          expect(amountEl).not.toBeNull();
          expect(amountEl.textContent.trim().length).toBeGreaterThan(0);

          // category
          const categoryEl = li.querySelector('.tx-category');
          expect(categoryEl).not.toBeNull();
          expect(categoryEl.textContent.trim().length).toBeGreaterThan(0);

          // date
          const dateEl = li.querySelector('.tx-date');
          expect(dateEl).not.toBeNull();
          expect(dateEl.textContent.trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Transaction list is always rendered in ascending timestamp order
// Feature: expense-budget-visualizer, Property 7: Transaction list is always rendered in ascending timestamp order
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

describe('Property 7 — renderList sorts by ascending timestamp', () => {
  beforeEach(setupDOM);

  test('DOM item data-id order corresponds to ascending timestamp order', () => {
    // Feature: expense-budget-visualizer, Property 7: Transaction list is always rendered in ascending timestamp order
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 2 }), (txs) => {
        // Inject in arbitrary order
        app.transactions = txs;
        renderList();

        const ul = document.getElementById('transaction-list');
        const items = Array.from(ul.querySelectorAll('li[data-id]'));

        // Build a map from id → timestamp
        const tsMap = Object.fromEntries(txs.map((t) => [t.id, t.timestamp]));

        // Extract the timestamps in DOM order
        const domTimestamps = items.map((li) => tsMap[li.dataset.id]);

        // Each timestamp should be <= the next one (ascending order)
        for (let i = 0; i < domTimestamps.length - 1; i++) {
          expect(domTimestamps[i]).toBeLessThanOrEqual(domTimestamps[i + 1]);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Zero-value categories are omitted from pie chart segments
// Feature: expense-budget-visualizer, Property 11: Zero-value categories are omitted from pie chart segments
// Validates: Requirements 5.6
//
// Strategy: jest-canvas-mock makes ctx.arc a Jest mock function, so we can
// read ctx.arc.mock.calls after calling drawPieChart().
// The "no-data" path is excluded by the filter (at least one non-zero and at
// least one zero). The legend uses fillRect, NOT arc, so all arc calls are
// pie-segment arcs. We verify:
//   1. arc call count == number of non-zero categories
//   2. sum of (endAngle - startAngle) across all arcs ≈ 2π (full circle)
// ---------------------------------------------------------------------------

describe('Property 11 — drawPieChart omits zero-value categories and covers full circle', () => {
  beforeEach(setupDOM);

  test('arc call count equals non-zero category count, arcs sum to a full circle', () => {
    // Feature: expense-budget-visualizer, Property 11: Zero-value categories are omitted from pie chart segments

    const categoryTotalsArb = fc.record({
      Food: fc.nat(),        // may be 0
      Transport: fc.nat(),   // may be 0
      Fun: fc.nat(),         // may be 0
    }).filter((t) => {
      // Need at least one non-zero (otherwise "no-data" path) AND at least one zero
      // so Property 11 (omitting zero-value categories) is actually exercised.
      const nonZero = [t.Food, t.Transport, t.Fun].filter((v) => v > 0).length;
      return nonZero >= 1 && nonZero < 3;
    });

    fc.assert(
      fc.property(categoryTotalsArb, (categoryTotals) => {
        const canvas = document.getElementById('spending-chart');
        const ctx = canvas.getContext('2d');

        // jest-canvas-mock makes ctx.arc a Jest mock — clear previous call records
        ctx.arc.mockClear();

        drawPieChart(canvas, categoryTotals);

        const nonZeroCount = [categoryTotals.Food, categoryTotals.Transport, categoryTotals.Fun]
          .filter((v) => v > 0).length;

        // All arc calls go to pie segments (legend uses fillRect)
        const arcCallCount = ctx.arc.mock.calls.length;
        expect(arcCallCount).toBe(nonZeroCount);

        // The arc angles must sum to exactly 2π (full circle)
        // Each arc call signature: arc(x, y, r, startAngle, endAngle[, anticlockwise])
        const totalAngle = ctx.arc.mock.calls.reduce(
          (sum, [, , , startAngle, endAngle]) => sum + (endAngle - startAngle),
          0
        );
        expect(totalAngle).toBeCloseTo(2 * Math.PI, 5);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: ARIA labels are always present on key components
// Feature: expense-budget-visualizer, Property 14: ARIA labels are always present on key components
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

describe('Property 14 — renderAll preserves ARIA labels on all three landmark elements', () => {
  beforeEach(setupDOM);

  test('#balance-display, #transaction-list, and #spending-chart each have a non-empty aria-label after renderAll()', () => {
    // Feature: expense-budget-visualizer, Property 14: ARIA labels are always present on key components
    fc.assert(
      fc.property(fc.array(transactionArb), (txs) => {
        app.transactions = txs;
        renderAll();

        const balanceDisplay = document.getElementById('balance-display');
        const transactionList = document.getElementById('transaction-list');
        const spendingChart = document.getElementById('spending-chart');

        expect(balanceDisplay).not.toBeNull();
        const balanceLabel = balanceDisplay.getAttribute('aria-label');
        expect(typeof balanceLabel).toBe('string');
        expect(balanceLabel.trim().length).toBeGreaterThan(0);

        expect(transactionList).not.toBeNull();
        const listLabel = transactionList.getAttribute('aria-label');
        expect(typeof listLabel).toBe('string');
        expect(listLabel.trim().length).toBeGreaterThan(0);

        expect(spendingChart).not.toBeNull();
        const chartLabel = spendingChart.getAttribute('aria-label');
        expect(typeof chartLabel).toBe('string');
        expect(chartLabel.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
