# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a client-side single-page web application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. It requires no build tools, no server, and no external JavaScript libraries. All application state — transactions, custom categories, and theme preference — is persisted in the browser's `localStorage` API.

The application is structured as a single `index.html` file that loads one CSS file (`css/style.css`) and one JavaScript file (`js/app.js`). The pie chart is rendered using the HTML5 Canvas API, implemented entirely in Vanilla JavaScript.

### Key Design Goals

- **Zero dependencies**: No npm, no bundler, no CDN scripts beyond what the browser natively provides.
- **Single-file JS**: All logic lives in `js/app.js`, organized into clearly separated modules/sections via comments and function grouping.
- **Offline-first**: The app works entirely offline; `localStorage` is the only persistence layer.
- **Progressive enhancement**: The layout is mobile-first and scales up to desktop widths.

---

## Architecture

The application follows a simple **Model → View → Controller (MVC-lite)** pattern implemented without classes or frameworks:

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  (DOM structure, links css/style.css & js/app.js)        │
└──────────────────────┬──────────────────────────────────┘
                       │ loads
          ┌────────────▼────────────┐
          │        js/app.js        │
          │                         │
          │  ┌─────────────────┐    │
          │  │   State (Model) │    │  ← in-memory object
          │  └────────┬────────┘    │
          │           │             │
          │  ┌────────▼────────┐    │
          │  │  Storage Layer  │    │  ← localStorage read/write
          │  └────────┬────────┘    │
          │           │             │
          │  ┌────────▼────────┐    │
          │  │  Render Layer   │    │  ← DOM manipulation
          │  └────────┬────────┘    │
          │           │             │
          │  ┌────────▼────────┐    │
          │  │ Event Handlers  │    │  ← user interactions
          │  └─────────────────┘    │
          └─────────────────────────┘
```

### Data Flow

1. **App initialises** → reads `localStorage` → populates in-memory `state` object → renders all UI components.
2. **User action** (add/delete transaction, add category, toggle theme) → event handler fires → mutates `state` → writes `localStorage` → calls render functions.
3. **Render functions** are pure in the sense that they always read from `state` and fully re-render their target DOM node (no partial diffing needed at this scale).

---

## Components and Interfaces

### File Structure

```
index.html
css/
  style.css
js/
  app.js
```

### index.html — DOM Sections

| Section ID | Purpose |
|---|---|
| `#theme-toggle` | Button to switch Light/Dark mode |
| `#total-balance` | Displays the running total |
| `#transaction-form` | Input form (name, amount, category) |
| `#category-form` | Input form for adding custom categories |
| `#sort-controls` | Buttons/select for sort by Amount / Category |
| `#transaction-list` | `<ul>` that renders all transactions |
| `#chart-container` | Wraps the `<canvas>` element for the pie chart |
| `#chart-canvas` | The `<canvas>` element used for pie chart rendering |

### js/app.js — Logical Sections

The single JS file is divided into clearly commented sections:

```
1. Constants & Configuration
2. State Object
3. Storage Layer  (read/write localStorage)
4. Validation Helpers
5. Transaction Functions  (add, delete, sort)
6. Category Functions  (add, list)
7. Balance Functions  (compute, format)
8. Pie Chart Renderer  (Canvas API)
9. DOM Render Functions  (transaction list, category dropdown, balance)
10. Theme Functions  (apply, toggle, persist)
11. Event Listeners  (form submits, delete clicks, sort, theme toggle)
12. App Initialisation  (called on DOMContentLoaded)
```

### Public Function Interfaces (within app.js)

```js
// Storage
function loadState()          // → { transactions, categories, theme }
function saveTransactions()   // writes state.transactions to localStorage
function saveCategories()     // writes state.categories to localStorage
function saveTheme()          // writes state.theme to localStorage

// Validation
function validateTransaction(name, amount) // → { valid: bool, errors: string[] }
function validateCategory(name)            // → { valid: bool, error: string }

// Transactions
function addTransaction(name, amount, category)  // mutates state, saves, renders
function deleteTransaction(id)                   // mutates state, saves, renders
function getSortedTransactions(sortKey)          // → Transaction[]

// Categories
function addCategory(name)   // mutates state, saves, renders dropdown
function getCategories()     // → string[]  (defaults + custom)

// Balance
function computeBalance()    // → number
function formatCurrency(n)   // → string  e.g. "$12.50"

// Pie Chart
function renderPieChart()    // reads state, draws on #chart-canvas

// Render
function renderTransactionList()  // re-renders #transaction-list
function renderCategoryDropdown() // re-renders <select> in #transaction-form
function renderBalance()          // updates #total-balance text

// Theme
function applyTheme(theme)   // adds/removes CSS class on <body>
function toggleTheme()       // flips state.theme, saves, applies

// Init
function init()              // called on DOMContentLoaded
```

---

## Data Models

### In-Memory State Object

```js
const state = {
  transactions: [],   // Transaction[]
  categories: [],     // string[]  — custom categories only
  theme: 'light',     // 'light' | 'dark'
  sortKey: 'default', // 'default' | 'amount' | 'category'
};
```

### Transaction Object

```js
{
  id: string,        // crypto.randomUUID() or Date.now().toString() fallback
  name: string,      // item name, non-empty
  amount: number,    // positive float, stored as number
  category: string,  // one of DEFAULT_CATEGORIES or state.categories
  createdAt: number  // Date.now() timestamp for stable default sort order
}
```

### localStorage Keys

| Key | Value type | Description |
|---|---|---|
| `ebv_transactions` | JSON string → `Transaction[]` | All recorded transactions |
| `ebv_categories` | JSON string → `string[]` | User-defined custom category names |
| `ebv_theme` | `'light'` \| `'dark'` | Current theme preference |

### Default Categories

```js
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
```

Custom categories are stored separately and merged with defaults at runtime. This ensures defaults are always present even if `localStorage` is cleared.

### Pie Chart Color Palette

A fixed array of distinct colors is assigned to categories by index (cycling if more categories than colors exist):

```js
const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4'
];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Adding a transaction grows the list and updates the balance

*For any* existing list of transactions and any valid new transaction (non-empty name, positive amount, valid category), after adding the transaction the list length SHALL increase by exactly one and the total balance SHALL equal the sum of all transaction amounts including the new one.

**Validates: Requirements 1.3, 3.2**

### Property 2: Whitespace-only or empty names are rejected

*For any* string composed entirely of whitespace characters (including the empty string) used as an item name, the `validateTransaction` function SHALL return `valid: false` and the transaction SHALL NOT be added to the list.

**Validates: Requirements 1.4**

### Property 3: Non-positive amounts are rejected

*For any* numeric value that is zero or negative, the `validateTransaction` function SHALL return `valid: false` and the transaction SHALL NOT be added to the list.

**Validates: Requirements 1.5**

### Property 4: Deleting a transaction removes it and updates the balance

*For any* non-empty list of transactions, deleting a transaction by its `id` SHALL result in the transaction no longer appearing in the list, the list length decreasing by exactly one, and the total balance reflecting the sum of the remaining transactions.

**Validates: Requirements 2.3, 3.3**

### Property 5: Balance equals sum of all transaction amounts

*For any* collection of transactions, `computeBalance()` SHALL return a value equal to the arithmetic sum of all `amount` fields in the collection.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Currency formatting preserves value and format

*For any* non-negative number, `formatCurrency(n)` SHALL return a string that starts with `$`, contains exactly two decimal places, and whose numeric value equals the original number rounded to two decimal places.

**Validates: Requirements 3.4**

### Property 7: Transaction persistence round-trip

*For any* list of transactions written to `localStorage` via `saveTransactions()`, calling `loadState()` SHALL return a transactions array that is deeply equal to the original list (same ids, names, amounts, categories, and timestamps).

**Validates: Requirements 7.1, 7.3**

### Property 8: Custom category persistence round-trip

*For any* list of custom category names written to `localStorage` via `saveCategories()`, calling `loadState()` SHALL return a categories array that is deeply equal to the original list.

**Validates: Requirements 7.2, 7.4**

### Property 9: Whitespace-only category names are rejected

*For any* string composed entirely of whitespace characters (including the empty string) used as a custom category name, `validateCategory` SHALL return `valid: false` and the category SHALL NOT be added to the list.

**Validates: Requirements 6.3**

### Property 10: Duplicate category names are rejected (case-insensitive)

*For any* category name that already exists in the combined list of default and custom categories (compared case-insensitively), `validateCategory` SHALL return `valid: false` and the category SHALL NOT be added to the list.

**Validates: Requirements 6.4**

### Property 11: Pie chart segment proportions sum to the whole

*For any* non-empty collection of transactions, the sum of all per-category spending amounts used to draw the pie chart SHALL equal `computeBalance()`, ensuring no spending is lost or double-counted in the visualization.

**Validates: Requirements 4.1**

### Property 12: Sort by amount produces descending order

*For any* list of transactions, `getSortedTransactions('amount')` SHALL return a list where every transaction's amount is greater than or equal to the amount of the transaction that follows it.

**Validates: Requirements 2.4**

### Property 13: Sort by category produces alphabetical grouping

*For any* list of transactions, `getSortedTransactions('category')` SHALL return a list where transactions are ordered such that all transactions with the same category are contiguous and categories appear in ascending alphabetical order.

**Validates: Requirements 2.5**

---

## Error Handling

### localStorage Failures

- **Corrupted JSON**: `loadState()` wraps each `JSON.parse` call in a `try/catch`. If parsing fails for transactions, `state.transactions` defaults to `[]`. If parsing fails for categories, `state.categories` defaults to `[]`. The app continues to render normally with empty/default state.
- **Partial corruption**: If the transactions array parses but contains non-object entries, the loader filters out invalid entries and renders only valid transactions.
- **Storage quota exceeded**: `saveTransactions()` and `saveCategories()` wrap `localStorage.setItem` in a `try/catch`. On failure, a non-blocking console warning is emitted; the in-memory state remains correct even if persistence fails.

### Form Validation Errors

- Validation errors are displayed inline below the relevant form field using a `<span class="error-msg">` element.
- Errors are cleared on the next successful submission or when the user begins typing in the field.
- No `alert()` or `confirm()` dialogs are used.

### Canvas Rendering

- If `getContext('2d')` returns `null` (unsupported browser), `renderPieChart()` silently skips rendering and logs a console warning.
- If there are no transactions, the canvas is hidden and a placeholder `<p>` element is shown instead.

### Theme Conflict Resolution

- On load, if `localStorage` contains a theme value that is neither `'light'` nor `'dark'`, the app defaults to `'light'` and overwrites the invalid value in `localStorage`.

---

## Testing Strategy

### Overview

This feature is a client-side Vanilla JS application. The testing strategy uses two complementary layers:

1. **Property-based tests** — verify universal correctness properties across many generated inputs (pure functions: validation, balance computation, sorting, formatting, persistence round-trips).
2. **Example-based unit tests** — verify specific behaviors, edge cases, and integration points (form submission flow, DOM rendering, theme toggle).

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript/TypeScript PBT library, usable in a browser test harness or Node.js with jsdom).

**Configuration**: Each property test runs a minimum of **100 iterations**.

**Tag format**: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`

Properties to implement as PBT tests (referencing design properties above):

| Test | Design Property | fast-check Arbitraries |
|---|---|---|
| Adding a transaction grows list & updates balance | Property 1 | `fc.array(transactionArb)`, `fc.record({name: fc.string(), amount: fc.float({min:0.01})...})` |
| Whitespace names rejected | Property 2 | `fc.stringMatching(/^\s*$/)` |
| Non-positive amounts rejected | Property 3 | `fc.oneof(fc.constant(0), fc.float({max: 0}))` |
| Deleting a transaction removes it & updates balance | Property 4 | `fc.array(transactionArb, {minLength:1})` |
| Balance equals sum | Property 5 | `fc.array(transactionArb)` |
| Currency formatting | Property 6 | `fc.float({min: 0, max: 1e9})` |
| Transaction persistence round-trip | Property 7 | `fc.array(transactionArb)` |
| Category persistence round-trip | Property 8 | `fc.array(fc.string({minLength:1}))` |
| Whitespace category rejected | Property 9 | `fc.stringMatching(/^\s*$/)` |
| Duplicate category rejected | Property 10 | `fc.string({minLength:1})` |
| Pie chart proportions sum to balance | Property 11 | `fc.array(transactionArb, {minLength:1})` |
| Sort by amount descending | Property 12 | `fc.array(transactionArb)` |
| Sort by category alphabetical | Property 13 | `fc.array(transactionArb)` |

### Example-Based Unit Tests

- **Form validation**: empty name, zero amount, missing category — each triggers the correct error message.
- **Theme toggle**: toggling twice returns to original theme; `localStorage` reflects the current theme.
- **Empty state**: no transactions → balance is `$0.00`, transaction list shows empty-state message, pie chart shows placeholder.
- **Corrupted localStorage**: pre-seeding `localStorage` with invalid JSON → app initialises with empty state, no unhandled errors thrown.
- **Category dropdown**: after adding a custom category, it appears in the `<select>` options.

### Integration / Smoke Tests

- **App load**: `index.html` loads in a browser without console errors.
- **Cross-browser**: manual smoke test in Chrome, Firefox, Edge, Safari (latest stable).
- **Responsive layout**: visual check at 320px, 768px, 1440px viewport widths.

### Test Runner

Tests are written as plain ES modules runnable with **Vitest** (zero-config, no bundler required for the test suite itself) or directly in the browser using a minimal HTML test harness. The production `js/app.js` exports its pure functions for testability when `typeof module !== 'undefined'`.
