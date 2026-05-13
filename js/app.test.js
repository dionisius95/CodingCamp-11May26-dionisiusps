/**
 * Property-Based Tests for Expense & Budget Visualizer
 * Feature: expense-budget-visualizer
 *
 * Test runner : Vitest (jsdom environment)
 * PBT library : fast-check
 *
 * Each property runs a minimum of 100 iterations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createRequire } from 'module';

// ─── Load app.js via CommonJS require ────────────────────────────────────────
// app.js uses `if (typeof module !== 'undefined') { module.exports = ... }`
// which works in a CJS context. We use createRequire so this ESM test file
// can load it.
const require = createRequire(import.meta.url);

// ─── Minimal DOM stubs ───────────────────────────────────────────────────────
// app.js calls render functions (renderTransactionList, renderBalance,
// renderPieChart) inside addTransaction / deleteTransaction. Those functions
// look up DOM elements by id. We create stub elements so the render calls
// are no-ops rather than throwing.
function setupMinimalDOM() {
  document.body.innerHTML = `
    <span id="total-balance"></span>
    <ul id="transaction-list"></ul>
    <div id="chart-container">
      <canvas id="chart-canvas" width="300" height="300"></canvas>
    </div>
    <form id="transaction-form">
      <select id="category"></select>
    </form>
  `;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** A valid category chosen from DEFAULT_CATEGORIES */
const categoryArb = fc.constantFrom('Food', 'Transport', 'Fun');

/** A valid transaction name: non-empty, non-whitespace-only string */
const nameArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

/** A valid positive amount (double, min 0.01, max 1e6) */
const amountArb = fc.double({ min: 0.01, max: 1_000_000, noNaN: true }).filter(
  (n) => n > 0 && isFinite(n)
);

/** A valid transaction record (plain object, not yet in state) */
const transactionArb = fc.record({
  id: fc.uuid(),
  name: nameArb,
  amount: amountArb,
  category: categoryArb,
  createdAt: fc.integer({ min: 0, max: Date.now() }),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Expense & Budget Visualizer — Property-Based Tests', () => {
  // Re-require app.js before each test so state is fresh.
  // Because Node caches require(), we reset state manually instead.
  let app;

  beforeEach(() => {
    setupMinimalDOM();
    // Load (or reuse cached) module
    app = require('./app.js');
    // Reset in-memory state to a clean baseline
    app.state.transactions = [];
    app.state.categories = [];
    app.state.theme = 'light';
    app.state.sortKey = 'default';
    // Clear localStorage stubs provided by jsdom
    localStorage.clear();
  });

  // ── Property 1 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 1: adding a transaction grows the list and updates the balance

  it(
    'Property 1 — adding a transaction grows the list by 1 and updates the balance',
    () => {
      // Validates: Requirements 1.3, 3.2
      fc.assert(
        fc.property(
          fc.array(transactionArb), // existing transactions (may be empty)
          nameArb,                  // new transaction name
          amountArb,                // new transaction amount
          categoryArb,              // new transaction category
          (existingTxs, name, amount, category) => {
            // ── Arrange ──────────────────────────────────────────────────────
            // Seed state with the generated existing transactions
            app.state.transactions = existingTxs.map((tx) => ({ ...tx }));

            const lengthBefore  = app.state.transactions.length;
            const balanceBefore = app.computeBalance();

            // ── Act ───────────────────────────────────────────────────────────
            app.addTransaction(name, amount, category);

            // ── Assert ────────────────────────────────────────────────────────
            // 1. List grows by exactly 1 (Requirement 1.3)
            expect(app.state.transactions.length).toBe(lengthBefore + 1);

            // 2. Balance equals previous balance + new amount (Requirement 3.2)
            const expectedBalance = balanceBefore + Number(amount);
            expect(app.computeBalance()).toBeCloseTo(expectedBalance, 5);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 2 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 2: whitespace-only or empty names are rejected by validateTransaction

  it(
    'Property 2 — whitespace-only or empty names are rejected by validateTransaction',
    () => {
      // Validates: Requirements 1.4
      fc.assert(
        fc.property(
          fc.stringMatching(/^\s*$/), // whitespace-only or empty string
          amountArb,                  // valid positive amount
          (whitespaceOnlyName, validAmount) => {
            // ── Act ───────────────────────────────────────────────────────────
            const result = app.validateTransaction(whitespaceOnlyName, validAmount);

            // ── Assert ────────────────────────────────────────────────────────
            // validateTransaction must reject whitespace-only/empty names (Requirement 1.4)
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 3 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 3: non-positive amounts are rejected by validateTransaction

  it(
    'Property 3 — non-positive amounts are rejected by validateTransaction',
    () => {
      // Validates: Requirements 1.5
      fc.assert(
        fc.property(
          nameArb,                                                              // valid name
          fc.oneof(fc.constant(0), fc.double({ max: 0, noNaN: true })),       // zero or negative
          (validName, nonPositiveAmount) => {
            // ── Act ───────────────────────────────────────────────────────────
            const result = app.validateTransaction(validName, nonPositiveAmount);

            // ── Assert ────────────────────────────────────────────────────────
            // validateTransaction must reject non-positive amounts (Requirement 1.5)
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 4 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 4: deleting a transaction removes it and updates the balance

  it(
    'Property 4 — deleting a transaction removes it and updates the balance',
    () => {
      // Validates: Requirements 2.3, 3.3
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 1 }),  // non-empty list of transactions
          fc.integer({ min: 0, max: 99 }),             // raw index (will be clamped)
          (transactions, rawIndex) => {
            // ── Arrange ──────────────────────────────────────────────────────
            // Seed state with the generated transactions (deep copy to avoid mutation issues)
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            const previousLength  = app.state.transactions.length;
            const previousBalance = app.computeBalance();

            // Pick a valid index within the actual list length
            const selectedIndex = rawIndex % previousLength;
            const deletedTx     = app.state.transactions[selectedIndex];
            const selectedId    = deletedTx.id;
            const deletedAmount = deletedTx.amount;

            // ── Act ───────────────────────────────────────────────────────────
            app.deleteTransaction(selectedId);

            // ── Assert ────────────────────────────────────────────────────────
            // 1. The deleted transaction is no longer in state.transactions (Requirement 2.3)
            const stillPresent = app.state.transactions.some((tx) => tx.id === selectedId);
            expect(stillPresent).toBe(false);

            // 2. List length decreased by exactly 1 (Requirement 2.3)
            expect(app.state.transactions.length).toBe(previousLength - 1);

            // 3. Balance equals previous balance minus the deleted amount (Requirement 3.3)
            const expectedBalance = previousBalance - deletedAmount;
            expect(app.computeBalance()).toBeCloseTo(expectedBalance, 5);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 5 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 5: computeBalance equals the arithmetic sum of all amounts

  it(
    'Property 5 — computeBalance equals the arithmetic sum of all amounts',
    () => {
      // Validates: Requirements 3.1, 3.2, 3.3
      fc.assert(
        fc.property(
          fc.array(transactionArb),
          (transactions) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            // ── Act ───────────────────────────────────────────────────────────
            const balance = app.computeBalance();

            // ── Assert ────────────────────────────────────────────────────────
            const expectedSum = transactions.reduce((sum, tx) => sum + tx.amount, 0);
            expect(balance).toBeCloseTo(expectedSum, 5);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 6 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 6: formatCurrency starts with Rp, uses dot thousands separator, and preserves rounded value

  it(
    'Property 6 — formatCurrency starts with Rp, uses dot thousands separator, and preserves rounded value',
    () => {
      // Validates: Requirements 3.4
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1e9, noNaN: true }).filter((n) => isFinite(n) && n >= 0),
          (n) => {
            // ── Act ───────────────────────────────────────────────────────────
            const result = app.formatCurrency(n);

            // ── Assert ────────────────────────────────────────────────────────
            // 1. Starts with 'Rp '
            expect(result.startsWith('Rp ')).toBe(true);

            // 2. Numeric portion (strip 'Rp ' and dots) equals Math.round(n)
            const numericStr = result.slice(3).replace(/\./g, '');
            expect(parseInt(numericStr, 10)).toBe(Math.round(Number(n)));
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 7 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 7: transaction persistence round-trip via saveTransactions/loadState

  it(
    'Property 7 — transaction persistence round-trip via saveTransactions/loadState',
    () => {
      // Validates: Requirements 7.1, 7.3
      fc.assert(
        fc.property(
          fc.array(transactionArb),
          (transactions) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            // ── Act ───────────────────────────────────────────────────────────
            app.saveTransactions();
            const loaded = app.loadState();

            // ── Assert ────────────────────────────────────────────────────────
            expect(loaded.transactions).toEqual(app.state.transactions);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 8 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 8: custom category persistence round-trip via saveCategories/loadState

  it(
    'Property 8 — custom category persistence round-trip via saveCategories/loadState',
    () => {
      // Validates: Requirements 7.2, 7.4
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)),
          (categories) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.categories = [...categories];

            // ── Act ───────────────────────────────────────────────────────────
            app.saveCategories();
            const loaded = app.loadState();

            // ── Assert ────────────────────────────────────────────────────────
            expect(loaded.categories).toEqual(app.state.categories);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 9 ─────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 9: whitespace-only category names are rejected by validateCategory

  it(
    'Property 9 — whitespace-only category names are rejected by validateCategory',
    () => {
      // Validates: Requirements 6.3
      fc.assert(
        fc.property(
          fc.stringMatching(/^\s*$/),
          (whitespaceOnlyName) => {
            // ── Act ───────────────────────────────────────────────────────────
            const result = app.validateCategory(whitespaceOnlyName);

            // ── Assert ────────────────────────────────────────────────────────
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 10 ────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 10: duplicate category names are rejected case-insensitively by validateCategory

  it(
    'Property 10 — duplicate category names are rejected case-insensitively by validateCategory',
    () => {
      // Validates: Requirements 6.4
      fc.assert(
        fc.property(
          fc.constantFrom('Food', 'Transport', 'Fun'),
          (existingCategory) => {
            // ── Arrange ──────────────────────────────────────────────────────
            // Reset custom categories so only defaults are present
            app.state.categories = [];

            // ── Assert: exact case ────────────────────────────────────────────
            expect(app.validateCategory(existingCategory).valid).toBe(false);

            // ── Assert: lowercase variant ─────────────────────────────────────
            expect(app.validateCategory(existingCategory.toLowerCase()).valid).toBe(false);

            // ── Assert: uppercase variant ─────────────────────────────────────
            expect(app.validateCategory(existingCategory.toUpperCase()).valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 11 ────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 11: pie chart per-category amounts sum to computeBalance

  it(
    'Property 11 — pie chart per-category amounts sum to computeBalance',
    () => {
      // Validates: Requirements 4.1
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 1 }),
          (transactions) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            // ── Act: aggregate per-category totals (same logic as renderPieChart) ──
            /** @type {Map<string, number>} */
            const totals = new Map();
            for (const tx of app.state.transactions) {
              totals.set(tx.category, (totals.get(tx.category) || 0) + tx.amount);
            }

            const categorySum = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);
            const balance     = app.computeBalance();

            // ── Assert ────────────────────────────────────────────────────────
            expect(categorySum).toBeCloseTo(balance, 5);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 12 ────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 12: getSortedTransactions('amount') returns descending order

  it(
    "Property 12 — getSortedTransactions('amount') returns descending order",
    () => {
      // Validates: Requirements 2.4
      fc.assert(
        fc.property(
          fc.array(transactionArb),
          (transactions) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            // ── Act ───────────────────────────────────────────────────────────
            const sorted = app.getSortedTransactions('amount');

            // ── Assert ────────────────────────────────────────────────────────
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].amount).toBeGreaterThanOrEqual(sorted[i + 1].amount);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // ── Property 13 ────────────────────────────────────────────────────────────
  // Feature: expense-budget-visualizer, Property 13: getSortedTransactions('category') returns alphabetical grouping

  it(
    "Property 13 — getSortedTransactions('category') returns alphabetical grouping",
    () => {
      // Validates: Requirements 2.5
      fc.assert(
        fc.property(
          fc.array(transactionArb),
          (transactions) => {
            // ── Arrange ──────────────────────────────────────────────────────
            app.state.transactions = transactions.map((tx) => ({ ...tx }));

            // ── Act ───────────────────────────────────────────────────────────
            const sorted = app.getSortedTransactions('category');

            // ── Assert ────────────────────────────────────────────────────────
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].category.localeCompare(sorted[i + 1].category)).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// =============================================================================
// Example-Based Unit Tests (Tasks 12.1 – 12.10)
// =============================================================================

describe('Expense & Budget Visualizer — Example-Based Unit Tests', () => {
  let app;

  beforeEach(() => {
    // Reuse the same minimal DOM setup as the PBT suite
    document.body.innerHTML = `
      <span id="total-balance"></span>
      <ul id="transaction-list"></ul>
      <div id="chart-container">
        <canvas id="chart-canvas" width="300" height="300"></canvas>
      </div>
      <form id="transaction-form">
        <select id="category"></select>
      </form>
    `;
    app = require('./app.js');
    // Reset in-memory state to a clean baseline
    app.state.transactions = [];
    app.state.categories   = [];
    app.state.theme        = 'light';
    app.state.sortKey      = 'default';
    // Clear localStorage stubs provided by jsdom
    localStorage.clear();
  });

  // ── 12.1 ───────────────────────────────────────────────────────────────────
  it('12.1 — empty name returns valid:false with "Item name is required." error', () => {
    const result = app.validateTransaction('', 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Item name is required.');
  });

  // ── 12.2 ───────────────────────────────────────────────────────────────────
  it('12.2 — zero amount returns valid:false with "Amount must be a positive number." error', () => {
    const result = app.validateTransaction('Coffee', 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount must be a positive number.');
  });

  // ── 12.3 ───────────────────────────────────────────────────────────────────
  it('12.3 — negative amount returns valid:false with "Amount must be a positive number." error', () => {
    const result = app.validateTransaction('Coffee', -5);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount must be a positive number.');
  });

  // ── 12.4 ───────────────────────────────────────────────────────────────────
  it('12.4 — toggleTheme() twice returns state.theme to its original value and localStorage reflects it', () => {
    const originalTheme = app.state.theme; // 'light'

    app.toggleTheme(); // → 'dark'
    app.toggleTheme(); // → 'light'

    expect(app.state.theme).toBe(originalTheme);
    expect(localStorage.getItem(app.STORAGE_KEY_THEME ?? 'ebv_theme')).toBe(originalTheme);
  });

  // ── 12.5 ───────────────────────────────────────────────────────────────────
  it('12.5 — empty state: computeBalance() returns 0 and formatCurrency(0) returns "Rp 0"', () => {
    app.state.transactions = [];
    expect(app.computeBalance()).toBe(0);
    expect(app.formatCurrency(0)).toBe('Rp 0');
  });

  // ── 12.6 ───────────────────────────────────────────────────────────────────
  it('12.6 — corrupted localStorage: loadState() returns empty transactions array without throwing', () => {
    localStorage.setItem('ebv_transactions', 'invalid JSON');

    let loaded;
    expect(() => {
      loaded = app.loadState();
    }).not.toThrow();

    expect(loaded.transactions).toEqual([]);
  });

  // ── 12.7 ───────────────────────────────────────────────────────────────────
  it('12.7 — partial corruption: loadState() filters out non-object entries and returns only valid ones', () => {
    const mixed = [
      { id: '1', name: 'Valid',      amount: 10, category: 'Food',      createdAt: 123 },
      null,
      'string',
      42,
      { id: '2', name: 'Also valid', amount: 5,  category: 'Transport', createdAt: 456 },
    ];
    localStorage.setItem('ebv_transactions', JSON.stringify(mixed));

    const loaded = app.loadState();
    expect(loaded.transactions.length).toBe(2);
  });

  // ── 12.8 ───────────────────────────────────────────────────────────────────
  it('12.8 — addCategory("Travel") makes getCategories() include "Travel" alongside the three defaults', () => {
    app.state.categories = [];
    app.addCategory('Travel');

    const categories = app.getCategories();
    expect(categories).toContain('Travel');
    expect(categories.length).toBe(4); // 3 defaults + 1 custom
  });

  // ── 12.9 ───────────────────────────────────────────────────────────────────
  it('12.9 — validateCategory("food") returns valid:false when "Food" is already a default category', () => {
    app.state.categories = [];
    const result = app.validateCategory('food');
    expect(result.valid).toBe(false);
  });

  // ── 12.10 ──────────────────────────────────────────────────────────────────
  it('12.10 — deleteTransaction with non-existent id does not throw and leaves state.transactions unchanged', () => {
    app.state.transactions = [
      { id: 'a', name: 'Test', amount: 10, category: 'Food', createdAt: 123 },
    ];

    expect(() => {
      app.deleteTransaction('nonexistent-id');
    }).not.toThrow();

    expect(app.state.transactions.length).toBe(1);
  });
});
