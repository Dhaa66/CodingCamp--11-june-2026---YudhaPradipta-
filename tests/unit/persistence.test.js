/**
 * Unit and property-based tests for the PERSISTENCE section of app.js.
 * Covers: loadFromStorage, saveToStorage
 *
 * Property tested:
 *   Property 12 — Persistence round-trip preserves all transaction data (Req 2.2, 6.3)
 *
 * Example tests:
 *   - loadFromStorage() with invalid JSON returns null
 *   - corrupt data sets storageAvailable = false
 */

require('jest-canvas-mock');

const fc = require('fast-check');
const app = require('../../app.js');
const { loadFromStorage, saveToStorage } = app;

const STORAGE_KEY = 'expense-budget-visualizer-transactions';

// ---------------------------------------------------------------------------
// Shared arbitrary: a valid Transaction object
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
  localStorage.clear();
  // Restore any spies from previous tests
  jest.restoreAllMocks();
  // Ensure storage is considered available before each test
  app.storageAvailable = true;
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Example-based tests
// ---------------------------------------------------------------------------

describe('loadFromStorage — example tests', () => {
  test('returns null when localStorage has no data for the key', () => {
    const result = loadFromStorage();
    // null is returned when parsed value is not an Array (null from getItem → JSON.parse → null)
    // Actually JSON.parse(null) returns null, not an array, so storageAvailable = false and returns null
    expect(result).toBeNull();
  });

  test('returns null and sets storageAvailable=false for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {{{');
    app.storageAvailable = true;

    const result = loadFromStorage();

    expect(result).toBeNull();
    expect(app.storageAvailable).toBe(false);
  });

  test('returns null and sets storageAvailable=false for valid JSON that is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    app.storageAvailable = true;

    const result = loadFromStorage();

    expect(result).toBeNull();
    expect(app.storageAvailable).toBe(false);
  });

  test('returns null for JSON null value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(null));
    app.storageAvailable = true;

    const result = loadFromStorage();
    expect(result).toBeNull();
  });

  test('returns an empty array when stored value is an empty array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    const result = loadFromStorage();

    expect(result).toEqual([]);
  });

  test('returns the exact array that was stored', () => {
    const txs = [
      { id: 'abc-1', name: 'Coffee', amount: 4.5, category: 'Food', timestamp: 1718000000000 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));

    const result = loadFromStorage();

    expect(result).toEqual(txs);
  });
});

describe('saveToStorage — example tests', () => {
  test('writes serialized array to localStorage under the correct key', () => {
    const txs = [
      { id: 'xyz-1', name: 'Bus', amount: 2.0, category: 'Transport', timestamp: 1718000001000 },
    ];
    saveToStorage(txs);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw)).toEqual(txs);
  });

  test('overwrites previous data with the new array', () => {
    const first = [{ id: 'a', name: 'Old', amount: 1, category: 'Fun', timestamp: 1 }];
    const second = [{ id: 'b', name: 'New', amount: 2, category: 'Food', timestamp: 2 }];

    saveToStorage(first);
    saveToStorage(second);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw)).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// Property 12: Persistence round-trip preserves all transaction data
// Feature: expense-budget-visualizer, Property 12: Persistence round-trip preserves all transaction data
// Validates: Requirements 2.2, 6.3
// ---------------------------------------------------------------------------

describe('Property 12 — persistence round-trip preserves all transaction data', () => {
  test('saveToStorage then loadFromStorage returns a deep-equal array in the same order', () => {
    // Feature: expense-budget-visualizer, Property 12: Persistence round-trip preserves all transaction data
    fc.assert(
      fc.property(fc.array(transactionArb), (txs) => {
        // Reset state before each iteration
        localStorage.clear();
        app.storageAvailable = true;

        // Round-trip: save then load
        saveToStorage(txs);
        const loaded = loadFromStorage();

        // Must come back as an array
        expect(Array.isArray(loaded)).toBe(true);

        // Same length
        expect(loaded.length).toBe(txs.length);

        // Every entry must match the original exactly (id, name, amount, category, timestamp)
        for (let i = 0; i < txs.length; i++) {
          expect(loaded[i].id).toBe(txs[i].id);
          expect(loaded[i].name).toBe(txs[i].name);
          expect(loaded[i].amount).toBeCloseTo(txs[i].amount, 10);
          expect(loaded[i].category).toBe(txs[i].category);
          expect(loaded[i].timestamp).toBe(txs[i].timestamp);
        }
      }),
      { numRuns: 100 }
    );
  });
});
