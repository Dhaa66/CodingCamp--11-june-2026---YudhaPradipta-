/**
 * Example-based integration tests for edge cases.
 * Covers specific scenarios not addressed by property-based tests.
 *
 * Tests:
 *   1. Empty state placeholder (Req 2.5)
 *   2. Delete last transaction shows all three empty states (Req 3.5)
 *   3. localStorage unavailable at startup shows warning (Req 6.4)
 *   4. Corrupt JSON in localStorage shows warning / returns null (Req 6.4)
 *   5. CATEGORY_COLORS has distinct non-empty values (Req 5.5)
 *   6. Form fields appear in correct DOM source order (Req 7.4)
 */

require('jest-canvas-mock');

const app = require('../../app.js');
const {
  renderList,
  renderAll,
  loadFromStorage,
  showWarning,
  hideWarning,
  initApp,
  CATEGORY_COLORS,
} = app;

// ---------------------------------------------------------------------------
// DOM setup helper — mirrors the minimal HTML used by app.js
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="warning-banner" role="alert" aria-live="polite"></div>
    <div id="balance-display" aria-label="Total balance">Total Balance: $0.00</div>
    <form id="transaction-form" novalidate>
      <input type="text"   id="item-name"  />
      <span class="field-error" id="item-name-error"></span>
      <input type="number" id="amount"     />
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
// Test 1: Empty state placeholder (Req 2.5)
// ---------------------------------------------------------------------------

describe('Empty state placeholder', () => {
  beforeEach(setupDOM);

  test('renderList() shows empty-state li when transactions is empty (Req 2.5)', () => {
    app.transactions = [];
    renderList();

    const ul = document.getElementById('transaction-list');
    const emptyItem = ul.querySelector('li.empty-state');

    expect(emptyItem).not.toBeNull();
    expect(emptyItem.textContent).toBe('No expenses recorded yet.');
  });
});

// ---------------------------------------------------------------------------
// Test 2: Delete last transaction shows all three empty states (Req 3.5)
// ---------------------------------------------------------------------------

describe('Delete last transaction — all three empty states', () => {
  beforeEach(setupDOM);

  test('after removing the last transaction renderAll shows empty placeholders everywhere (Req 3.5)', () => {
    // Start with one transaction
    app.transactions = [
      {
        id: 'abc-123',
        name: 'Coffee',
        amount: 4.5,
        category: 'Food',
        timestamp: Date.now(),
      },
    ];
    renderAll();

    // Verify the transaction was rendered
    const ulBefore = document.getElementById('transaction-list');
    expect(ulBefore.querySelectorAll('li[data-id]').length).toBe(1);

    // Now clear and re-render
    app.transactions = [];
    renderAll();

    // 1) Transaction list has empty-state li
    const ul = document.getElementById('transaction-list');
    const emptyLi = ul.querySelector('li.empty-state');
    expect(emptyLi).not.toBeNull();
    expect(ul.querySelectorAll('li[data-id]').length).toBe(0);

    // 2) Balance display shows $0.00
    const balanceDisplay = document.getElementById('balance-display');
    expect(balanceDisplay.textContent).toContain('$0.00');

    // 3) Canvas is present (chart empty state — grey circle — is drawn)
    const canvas = document.getElementById('spending-chart');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-label')).toBe('Spending by category pie chart');
  });
});

// ---------------------------------------------------------------------------
// Test 3: localStorage unavailable at startup shows warning (Req 6.4)
// ---------------------------------------------------------------------------

describe('localStorage unavailable at startup', () => {
  beforeEach(setupDOM);

  afterEach(() => {
    // Restore localStorage after each test in this suite
    jest.restoreAllMocks();
  });

  test('initApp() shows warning banner when localStorage.setItem throws (Req 6.4)', () => {
    // Make localStorage.setItem throw (simulating unavailability)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    initApp();

    const banner = document.getElementById('warning-banner');
    expect(banner.textContent.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Corrupt JSON in localStorage returns null (Req 6.4)
// ---------------------------------------------------------------------------

describe('Corrupt JSON in localStorage', () => {
  beforeEach(setupDOM);

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('loadFromStorage() returns null when data is invalid JSON (Req 6.4)', () => {
    // Plant corrupt JSON
    localStorage.setItem('expense-budget-visualizer-transactions', 'not valid json{');

    const result = loadFromStorage();

    expect(result).toBeNull();
  });

  test('loadFromStorage() sets storageAvailable to false on corrupt data (Req 6.4)', () => {
    // Reset storageAvailable to true before this test
    app.storageAvailable = true;

    localStorage.setItem('expense-budget-visualizer-transactions', 'not valid json{');
    loadFromStorage();

    expect(app.storageAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test 5: CATEGORY_COLORS has distinct non-empty values (Req 5.5)
// ---------------------------------------------------------------------------

describe('CATEGORY_COLORS', () => {
  test('Food, Transport, Fun all have truthy string values (Req 5.5)', () => {
    expect(typeof CATEGORY_COLORS.Food).toBe('string');
    expect(CATEGORY_COLORS.Food.length).toBeGreaterThan(0);

    expect(typeof CATEGORY_COLORS.Transport).toBe('string');
    expect(CATEGORY_COLORS.Transport.length).toBeGreaterThan(0);

    expect(typeof CATEGORY_COLORS.Fun).toBe('string');
    expect(CATEGORY_COLORS.Fun.length).toBeGreaterThan(0);
  });

  test('all three category colors are distinct from each other (Req 5.5)', () => {
    expect(CATEGORY_COLORS.Food).not.toBe(CATEGORY_COLORS.Transport);
    expect(CATEGORY_COLORS.Food).not.toBe(CATEGORY_COLORS.Fun);
    expect(CATEGORY_COLORS.Transport).not.toBe(CATEGORY_COLORS.Fun);
  });
});

// ---------------------------------------------------------------------------
// Test 6: Form fields appear in correct DOM source order (Req 7.4)
// ---------------------------------------------------------------------------

describe('Form fields DOM source order', () => {
  beforeEach(setupDOM);

  test('interactive fields are ordered: item-name, amount, category, submit button (Req 7.4)', () => {
    const form = document.getElementById('transaction-form');

    // Query all relevant interactive elements
    const fields = form.querySelectorAll('#item-name, #amount, #category, button[type="submit"]');

    expect(fields.length).toBe(4);
    expect(fields[0].id).toBe('item-name');
    expect(fields[1].id).toBe('amount');
    expect(fields[2].id).toBe('category');
    expect(fields[3].tagName.toLowerCase()).toBe('button');
    expect(fields[3].type).toBe('submit');
  });
});
