/**
 * Tests for validateForm() — unit + property-based
 *
 * Validates: Requirements 1.4, 1.5, 1.6
 */

const fc = require('fast-check');
const { validateForm } = require('../../app.js');

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fully-valid form data object. */
const validFormData = () => ({
  name: 'Coffee',
  amount: '4.50',
  category: 'Food',
});

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe('validateForm — valid input', () => {
  test('accepts minimal valid data', () => {
    const result = validateForm({ name: 'A', amount: '0.01', category: 'Food' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('accepts maximum boundary values', () => {
    const result = validateForm({ name: 'A'.repeat(100), amount: '999999999.99', category: 'Transport' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('trims whitespace from name before validating', () => {
    const result = validateForm({ name: '  Coffee  ', amount: '5.00', category: 'Fun' });
    expect(result.valid).toBe(true);
  });

  test('accepts all three valid categories', () => {
    for (const cat of VALID_CATEGORIES) {
      const result = validateForm({ name: 'Test', amount: '1.00', category: cat });
      expect(result.valid).toBe(true);
    }
  });
});

describe('validateForm — name validation', () => {
  test('rejects empty name', () => {
    const result = validateForm({ ...validFormData(), name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  test('rejects whitespace-only name', () => {
    const result = validateForm({ ...validFormData(), name: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  test('rejects name exceeding 100 characters', () => {
    const result = validateForm({ ...validFormData(), name: 'A'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  // Edge case: exactly 100 chars passes
  test('accepts name with exactly 100 characters', () => {
    const result = validateForm({ ...validFormData(), name: 'A'.repeat(100) });
    expect(result.valid).toBe(true);
    expect(result.errors.name).toBeUndefined();
  });
});

describe('validateForm — amount validation', () => {
  test('rejects empty amount', () => {
    const result = validateForm({ ...validFormData(), amount: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  test('rejects non-numeric amount', () => {
    const result = validateForm({ ...validFormData(), amount: 'abc' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  test('rejects zero amount', () => {
    const result = validateForm({ ...validFormData(), amount: '0' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  test('rejects negative amount', () => {
    const result = validateForm({ ...validFormData(), amount: '-1.00' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  test('rejects amount above 999999999.99', () => {
    const result = validateForm({ ...validFormData(), amount: '1000000000' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  test('rejects Infinity as amount', () => {
    const result = validateForm({ ...validFormData(), amount: 'Infinity' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  // Edge case: exactly 0.01 passes (minimum boundary)
  test('accepts 0.01 (minimum boundary)', () => {
    const result = validateForm({ ...validFormData(), amount: '0.01' });
    expect(result.valid).toBe(true);
    expect(result.errors.amount).toBeUndefined();
  });

  // Edge case: exactly 999999999.99 passes (maximum boundary)
  test('accepts 999999999.99 (maximum boundary)', () => {
    const result = validateForm({ ...validFormData(), amount: '999999999.99' });
    expect(result.valid).toBe(true);
    expect(result.errors.amount).toBeUndefined();
  });
});

describe('validateForm — category validation', () => {
  test('rejects empty category string', () => {
    const result = validateForm({ ...validFormData(), category: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  test('rejects invalid category value', () => {
    const result = validateForm({ ...validFormData(), category: 'Other' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  test('rejects placeholder/unselected value', () => {
    const result = validateForm({ ...validFormData(), category: 'Select a category' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });
});

describe('validateForm — multiple errors', () => {
  test('reports errors for all three invalid fields simultaneously', () => {
    const result = validateForm({ name: '', amount: '', category: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.category).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('validateForm — PBT: Property 1 — rejects empty or missing fields', () => {
  // Feature: expense-budget-visualizer, Property 1: Validator rejects empty or missing fields
  // Validates: Requirements 1.4

  test('empty or whitespace-only name always produces a name error', () => {
    fc.assert(
      fc.property(
        // Use fc.record with empty-string / whitespace-only / placeholder values for name
        fc.record({
          name: fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('\r\n')
          ),
          amount: fc.constant('1.00'),
          category: fc.constantFrom(...VALID_CATEGORIES),
        }),
        (formData) => {
          const result = validateForm(formData);
          expect(result.valid).toBe(false);
          expect(result.errors.name).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('empty amount string always produces an amount error', () => {
    fc.assert(
      fc.property(
        // Use fc.record with empty amount (missing/unset field)
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          amount: fc.constant(''),
          category: fc.constantFrom(...VALID_CATEGORIES),
        }),
        (formData) => {
          const result = validateForm(formData);
          expect(result.valid).toBe(false);
          expect(result.errors.amount).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('missing or placeholder category always produces a category error', () => {
    fc.assert(
      fc.property(
        // Use fc.record with placeholder/empty category values
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          amount: fc.constant('1.00'),
          category: fc.oneof(
            fc.constant(''),
            fc.constant('Select a category'),
            fc.constant('none'),
            fc.string().filter(s => !VALID_CATEGORIES.includes(s))
          ),
        }),
        (formData) => {
          const result = validateForm(formData);
          expect(result.valid).toBe(false);
          expect(result.errors.category).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateForm — PBT: Property 2 — rejects out-of-range or non-numeric amounts', () => {
  // Feature: expense-budget-visualizer, Property 2: Validator rejects out-of-range or non-numeric amounts
  // Validates: Requirements 1.5

  test('empty string, non-numeric, zero/negative, or very large amounts are always rejected', () => {
    fc.assert(
      fc.property(
        // Use fc.oneof as specified in the design
        fc.oneof(
          fc.constant(''),
          fc.constant('abc'),
          fc.double({ max: 0, noNaN: true }).filter(n => isFinite(n)).map(String),
          fc.double({ min: 1e9, noNaN: true }).filter(n => isFinite(n) && n > 999999999.99).map(String)
        ),
        (amount) => {
          const result = validateForm({ name: 'Test Item', amount, category: 'Food' });
          expect(result.valid).toBe(false);
          expect(result.errors.amount).not.toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateForm — PBT: Property 3 — rejects item names exceeding 100 characters', () => {
  // Feature: expense-budget-visualizer, Property 3: Validator rejects item names exceeding 100 characters
  // Validates: Requirements 1.6

  test('any name longer than 100 characters is always rejected', () => {
    fc.assert(
      fc.property(
        // Use fc.string({ minLength: 101 }) but ensure trimmed length also exceeds 100
        // by generating a string whose trim() result is still > 100 chars
        fc.string({ minLength: 101 }).filter(s => s.trim().length > 100),
        (name) => {
          const result = validateForm({ name, amount: '1.00', category: 'Food' });
          expect(result.valid).toBe(false);
          expect(result.errors.name).not.toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
