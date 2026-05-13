# Implementation Tasks: Expense & Budget Visualizer

## Task Dependency Graph

```
Task 1 (Project Scaffold)
  └── Task 2 (Constants, State & Storage Layer)
        ├── Task 3 (Validation Helpers)
        │     ├── Task 5 (Transaction Functions)
        │     └── Task 6 (Category Functions)
        ├── Task 4 (Balance Functions)
        │     └── Task 5 (Transaction Functions)
        └── Task 5 (Transaction Functions)
              ├── Task 7 (Pie Chart Renderer)
              ├── Task 8 (DOM Render Functions)
              │     └── Task 10 (Event Listeners & App Init)
              └── Task 9 (Theme Functions)
                    └── Task 10 (Event Listeners & App Init)
Task 10 (Event Listeners & App Init)
  └── Task 11 (Responsive CSS & Mobile Layout)
        └── Task 12 (Property-Based Tests)
              └── Task 13 (Example-Based Unit Tests)
```

---

## Tasks

- [x] 1. Set up project scaffold (index.html, css/style.css, js/app.js)
  - Create the root `index.html` with the required DOM sections: `#theme-toggle`, `#total-balance`, `#transaction-form`, `#category-form`, `#sort-controls`, `#transaction-list`, `#chart-container`, and `#chart-canvas`.
  - Create the empty `css/style.css` file at `css/style.css`.
  - Create the empty `js/app.js` file at `js/app.js`.
  - Link `css/style.css` and `js/app.js` from `index.html` (no CDN scripts, no external libraries).
  - Verify the file structure matches exactly: `index.html`, `css/style.css`, `js/app.js`.
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement Constants, State object, and Storage Layer
  - Define `DEFAULT_CATEGORIES`, `CHART_COLORS`, and localStorage key constants (`ebv_transactions`, `ebv_categories`, `ebv_theme`).
  - Define the in-memory `state` object with `transactions`, `categories`, `theme`, and `sortKey` fields.
  - Implement `loadState()` — reads all three localStorage keys, wraps each `JSON.parse` in `try/catch`, filters out non-object transaction entries, defaults to `[]`/`'light'` on failure, and returns `{ transactions, categories, theme }`.
  - Implement `saveTransactions()`, `saveCategories()`, and `saveTheme()` — each wraps `localStorage.setItem` in `try/catch` and emits a console warning on quota failure.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 5.4, 5.5, 5.6_

- [x] 3. Implement Validation Helpers
  - Implement `validateTransaction(name, amount)` — returns `{ valid: bool, errors: string[] }`. Rejects empty/whitespace-only names and non-positive or non-numeric amounts.
  - Implement `validateCategory(name)` — returns `{ valid: bool, error: string }`. Rejects empty/whitespace-only names and names that already exist in the combined default + custom category list (case-insensitive comparison).
  - _Requirements: 1.4, 1.5, 6.3, 6.4_

- [x] 4. Implement Balance Functions
  - Implement `computeBalance()` — returns the arithmetic sum of all `amount` fields in `state.transactions`; returns `0` when the list is empty.
  - Implement `formatCurrency(n)` — returns a string starting with `$` with exactly two decimal places (e.g., `"$12.50"`).
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement Transaction and Category Functions
  - Implement `addTransaction(name, amount, category)` — generates a unique `id` via `crypto.randomUUID()` (falling back to `Date.now().toString()`), appends to `state.transactions`, calls `saveTransactions()`, then calls `renderTransactionList()`, `renderBalance()`, and `renderPieChart()`.
  - Implement `deleteTransaction(id)` — removes the matching transaction from `state.transactions`, calls `saveTransactions()`, then calls `renderTransactionList()`, `renderBalance()`, and `renderPieChart()`.
  - Implement `getSortedTransactions(sortKey)` — returns a sorted copy of `state.transactions`: `'amount'` sorts descending by amount; `'category'` sorts ascending alphabetically by category name; `'default'` preserves insertion order (ascending `createdAt`).
  - Implement `addCategory(name)` — appends the trimmed name to `state.categories`, calls `saveCategories()`, then calls `renderCategoryDropdown()`.
  - Implement `getCategories()` — returns `[...DEFAULT_CATEGORIES, ...state.categories]`.
  - _Requirements: 1.2, 1.3, 1.6, 2.3, 2.4, 2.5, 6.1, 6.2, 6.5_

- [x] 6. Implement Pie Chart Renderer
  - Implement `renderPieChart()` — reads `state.transactions`, aggregates spending by category, and draws proportional arc segments on `#chart-canvas` using the Canvas 2D API and `CHART_COLORS` palette (cycling if more categories than colors).
  - When `state.transactions` is empty, hide `#chart-canvas` and show a placeholder `<p>` element inside `#chart-container`.
  - When transactions exist and the chart was previously in placeholder mode, hide the placeholder and show `#chart-canvas`.
  - If `getContext('2d')` returns `null`, skip rendering and emit a console warning.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Implement DOM Render Functions
  - Implement `renderTransactionList()` — clears and re-renders `#transaction-list` as a `<ul>` using `getSortedTransactions(state.sortKey)`. Each `<li>` shows item name, formatted amount, and category, plus a delete button. When the list is empty, renders an empty-state message.
  - Implement `renderCategoryDropdown()` — clears and re-populates the `<select>` in `#transaction-form` with `getCategories()`.
  - Implement `renderBalance()` — updates the text content of `#total-balance` with `formatCurrency(computeBalance())`.
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.6, 3.1, 3.4_

- [x] 8. Implement Theme Functions
  - Implement `applyTheme(theme)` — adds class `dark` to `<body>` when `theme === 'dark'`; removes it otherwise.
  - Implement `toggleTheme()` — flips `state.theme` between `'light'` and `'dark'`, calls `saveTheme()`, then calls `applyTheme(state.theme)`.
  - On load, if the stored theme value is neither `'light'` nor `'dark'`, default to `'light'` and overwrite the invalid value in localStorage.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 9. Implement Event Listeners and App Initialisation
  - Attach a `submit` listener to `#transaction-form`: run `validateTransaction`, display inline `<span class="error-msg">` errors on failure, or call `addTransaction` and reset the form on success.
  - Attach a `submit` listener to `#category-form`: run `validateCategory`, display inline error on failure, or call `addCategory` and reset the field on success.
  - Attach a `click` listener on `#transaction-list` (event delegation) to handle delete button clicks by calling `deleteTransaction(id)`.
  - Attach change/click listeners on `#sort-controls` to update `state.sortKey` and call `renderTransactionList()`.
  - Attach a `click` listener on `#theme-toggle` to call `toggleTheme()`.
  - Implement `init()` — called on `DOMContentLoaded`: calls `loadState()`, populates `state`, calls `applyTheme`, `renderCategoryDropdown`, `renderTransactionList`, `renderBalance`, and `renderPieChart`.
  - Export pure functions (`validateTransaction`, `validateCategory`, `computeBalance`, `formatCurrency`, `getSortedTransactions`, `loadState`, `saveTransactions`, `saveCategories`) when `typeof module !== 'undefined'` to enable unit testing.
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.3, 2.4, 2.5, 5.1, 6.1, 6.2, 7.3_

- [x] 10. Implement Responsive CSS and Mobile-Friendly Layout
  - Write mobile-first CSS in `css/style.css` using a single-column layout as the base.
  - Use media queries to adapt the layout for tablet (≥ 768px) and desktop (≥ 1024px) widths, ensuring no horizontal scrolling from 320px to 1440px.
  - Define CSS custom properties (variables) for light and dark theme color tokens; apply the `dark` class on `<body>` to switch the palette.
  - Ensure all interactive controls (`button`, `input`, `select`) have a minimum tap target of 44×44 CSS pixels.
  - Style `#transaction-list` with `overflow-y: auto` and a max-height so it scrolls when content overflows.
  - Style the empty-state message and pie chart placeholder to be visually distinct.
  - _Requirements: 5.2, 8.1, 8.2, 8.3, 8.4_

- [x] 11. Write Property-Based Tests (fast-check)
  - Set up Vitest and fast-check as dev dependencies (or configure a minimal Node.js test harness).
  - Create `js/app.test.js` (or equivalent) that imports the exported pure functions from `js/app.js`.
  - Implement the following 13 property tests, each running a minimum of 100 iterations and tagged with `// Feature: expense-budget-visualizer, Property {N}: {property_text}`:
    - [x] 11.1 Write property test: adding a transaction grows the list by 1 and updates the balance (Property 1) — **Validates: Requirements 1.3, 3.2**
    - [x] 11.2 Write property test: whitespace-only or empty names are rejected by validateTransaction (Property 2) — **Validates: Requirements 1.4**
    - [x] 11.3 Write property test: non-positive amounts are rejected by validateTransaction (Property 3) — **Validates: Requirements 1.5**
    - [x] 11.4 Write property test: deleting a transaction removes it and updates the balance (Property 4) — **Validates: Requirements 2.3, 3.3**
    - [x] 11.5 Write property test: computeBalance equals the arithmetic sum of all amounts (Property 5) — **Validates: Requirements 3.1, 3.2, 3.3**
    - [x] 11.6 Write property test: formatCurrency starts with $, has two decimal places, and preserves value (Property 6) — **Validates: Requirements 3.4**
    - [x] 11.7 Write property test: transaction persistence round-trip via saveTransactions/loadState (Property 7) — **Validates: Requirements 7.1, 7.3**
    - [x] 11.8 Write property test: custom category persistence round-trip via saveCategories/loadState (Property 8) — **Validates: Requirements 7.2, 7.4**
    - [x] 11.9 Write property test: whitespace-only category names are rejected by validateCategory (Property 9) — **Validates: Requirements 6.3**
    - [x] 11.10 Write property test: duplicate category names are rejected case-insensitively by validateCategory (Property 10) — **Validates: Requirements 6.4**
    - [x] 11.11 Write property test: pie chart per-category amounts sum to computeBalance (Property 11) — **Validates: Requirements 4.1**
    - [x] 11.12 Write property test: getSortedTransactions('amount') returns descending order (Property 12) — **Validates: Requirements 2.4**
    - [x] 11.13 Write property test: getSortedTransactions('category') returns alphabetical grouping (Property 13) — **Validates: Requirements 2.5**
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 3.1–3.4, 4.1, 6.3, 6.4, 7.1–7.4_

- [x] 12. Write Example-Based Unit Tests
  - In the same test file, add example-based tests covering:
    - [x] 12.1 Form validation: empty name → correct error message returned by `validateTransaction`.
    - [x] 12.2 Form validation: zero amount → correct error message returned by `validateTransaction`.
    - [x] 12.3 Form validation: negative amount → correct error message returned by `validateTransaction`.
    - [x] 12.4 Theme toggle: calling `toggleTheme()` twice returns `state.theme` to its original value and localStorage reflects the final theme.
    - [x] 12.5 Empty state: no transactions → `computeBalance()` returns `0`, `formatCurrency(0)` returns `"$0.00"`.
    - [x] 12.6 Corrupted localStorage: pre-seeding `ebv_transactions` with invalid JSON → `loadState()` returns `{ transactions: [], ... }` without throwing.
    - [x] 12.7 Partial corruption: pre-seeding `ebv_transactions` with an array containing non-object entries → `loadState()` filters them out and returns only valid entries.
    - [x] 12.8 Category dropdown: after `addCategory('Travel')`, `getCategories()` includes `'Travel'` alongside the three defaults.
    - [x] 12.9 Duplicate category (case-insensitive): `validateCategory('food')` returns `valid: false` when `'Food'` is already a default category.
    - [x] 12.10 Delete non-existent id: `deleteTransaction('nonexistent-id')` does not throw and leaves `state.transactions` unchanged.
  - _Requirements: 1.4, 1.5, 5.2, 5.3, 6.2, 6.4, 7.3, 7.5_
