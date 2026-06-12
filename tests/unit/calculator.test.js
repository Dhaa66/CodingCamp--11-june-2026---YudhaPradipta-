/**
 * Unit and property-based tests for the CALCULATOR section of app.js.
 * Covers: computeBalance, computeCategoryTotals
 */

const fc = require('fast-check');
const { computeBalance, computeCategoryTotals } = require('../../app.js');

// Arbitrary for a valid transaction object
const transactionArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.double({ min: 0.01, max: 999999999.99, noNaN: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

// ─── computeBalance ───────────────────────────────────────────────────────────

describe('computeBalance', () => {
  // Example-based tests
  test('returns 0 for an empty array (Requirement 4.5)', () => {
    expect(computeBalance([])).toBe(0);
  });

  test('returns the amount for a single transaction', () => {
    const txs = [{ id: '1', name: 'Coffee', amount: 4.5, category: 'Food', timestamp: 1 }];
    expect(computeBalance(txs)).toBe(4.5);
  });

  test('sums multiple transactions correctly', () => {
    const txs = [
      { id: '1', name: 'Coffee', amount: 4.5, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Bus', amount: 2.0, category: 'Transport', timestamp: 2 },
      { id: '3', name: 'Movie', amount: 12.0, category: 'Fun', timestamp: 3 },
    ];
    expect(computeBalance(txs)).toBeCloseTo(18.5);
  });

  test('uses 0 as fallback for non-numeric amount (NaN guard)', () => {
    const txs = [
      { id: '1', name: 'Bad', amount: NaN, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Good', amount: 10, category: 'Food', timestamp: 2 },
    ];
    expect(computeBalance(txs)).toBe(10);
  });

  test('coerces string amounts via Number()', () => {
    const txs = [
      { id: '1', name: 'A', amount: '5.5', category: 'Food', timestamp: 1 },
      { id: '2', name: 'B', amount: '2.5', category: 'Food', timestamp: 2 },
    ];
    expect(computeBalance(txs)).toBeCloseTo(8.0);
  });

  // Property 9: Balance equals the exact sum of all transaction amounts
  // Feature: expense-budget-visualizer, Property 9: Balance equals the exact sum of all transaction amounts
  // Validates: Requirements 4.2, 4.3, 4.4, 4.5
  test('Property 9 — balance equals sum of all amounts for any array of transactions', () => {
    fc.assert(
      fc.property(fc.array(transactionArb), (txs) => {
        const expected = txs.reduce((s, t) => s + t.amount, 0);
        expect(computeBalance(txs)).toBeCloseTo(expected, 5);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── computeCategoryTotals ────────────────────────────────────────────────────

describe('computeCategoryTotals', () => {
  // Example-based tests
  test('returns { Food: 0, Transport: 0, Fun: 0 } for empty array (Requirement 5.1–5.3)', () => {
    expect(computeCategoryTotals([])).toEqual({ Food: 0, Transport: 0, Fun: 0 });
  });

  test('accumulates amounts per category correctly', () => {
    const txs = [
      { id: '1', name: 'Coffee', amount: 4.5, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Bus', amount: 2.0, category: 'Transport', timestamp: 2 },
      { id: '3', name: 'Snack', amount: 1.5, category: 'Food', timestamp: 3 },
      { id: '4', name: 'Movie', amount: 12.0, category: 'Fun', timestamp: 4 },
    ];
    const totals = computeCategoryTotals(txs);
    expect(totals.Food).toBeCloseTo(6.0);
    expect(totals.Transport).toBeCloseTo(2.0);
    expect(totals.Fun).toBeCloseTo(12.0);
  });

  test('categories with no matching transactions default to 0', () => {
    const txs = [
      { id: '1', name: 'Coffee', amount: 5.0, category: 'Food', timestamp: 1 },
    ];
    const totals = computeCategoryTotals(txs);
    expect(totals.Transport).toBe(0);
    expect(totals.Fun).toBe(0);
  });

  test('always returns all three category keys', () => {
    const totals = computeCategoryTotals([]);
    expect(totals).toHaveProperty('Food');
    expect(totals).toHaveProperty('Transport');
    expect(totals).toHaveProperty('Fun');
  });

  test('uses 0 as fallback for NaN amounts', () => {
    const txs = [{ id: '1', name: 'Bad', amount: NaN, category: 'Food', timestamp: 1 }];
    expect(computeCategoryTotals(txs).Food).toBe(0);
  });

  // Property 10: Category totals correctly aggregate all transaction amounts
  // Feature: expense-budget-visualizer, Property 10: Category totals correctly aggregate all transaction amounts
  // Validates: Requirements 5.1, 5.2, 5.3
  test('Property 10 — category totals equal filtered sums, zero for absent categories', () => {
    fc.assert(
      fc.property(fc.array(transactionArb), (txs) => {
        const totals = computeCategoryTotals(txs);

        for (const cat of ['Food', 'Transport', 'Fun']) {
          const expected = txs
            .filter((t) => t.category === cat)
            .reduce((s, t) => s + t.amount, 0);
          expect(totals[cat]).toBeCloseTo(expected, 5);
        }

        // Categories with no matching transactions default to 0
        if (!txs.some((t) => t.category === 'Food')) expect(totals.Food).toBe(0);
        if (!txs.some((t) => t.category === 'Transport')) expect(totals.Transport).toBe(0);
        if (!txs.some((t) => t.category === 'Fun')) expect(totals.Fun).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
