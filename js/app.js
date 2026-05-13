/* js/app.js — Expense & Budget Visualizer */

// =============================================================================
// 1. Constants & Configuration
// =============================================================================

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4'
];

const STORAGE_KEY_TRANSACTIONS = 'ebv_transactions';
const STORAGE_KEY_CATEGORIES   = 'ebv_categories';
const STORAGE_KEY_THEME        = 'ebv_theme';

// =============================================================================
// 2. State Object
// =============================================================================

const state = {
  transactions: [], // Transaction[]
  categories:   [], // string[] — custom categories only
  theme:        'light', // 'light' | 'dark'
  sortKey:      'default', // 'default' | 'amount' | 'category'
};

// =============================================================================
// 3. Storage Layer
// =============================================================================

/**
 * Reads all three localStorage keys, parses them safely, and returns the
 * combined application state.
 *
 * @returns {{ transactions: object[], categories: string[], theme: string }}
 */
function loadState() {
  // --- transactions ---
  let transactions = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any non-object (null, primitive, array) entries
        transactions = parsed.filter(
          (entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry)
        );
      }
    }
  } catch (e) {
    transactions = [];
  }

  // --- categories ---
  let categories = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        categories = parsed.filter((entry) => typeof entry === 'string');
      }
    }
  } catch (e) {
    categories = [];
  }

  // --- theme ---
  let theme = 'light';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THEME);
    if (raw === 'light' || raw === 'dark') {
      theme = raw;
    }
  } catch (e) {
    theme = 'light';
  }

  return { transactions, categories, theme };
}

/**
 * Persists state.transactions to localStorage.
 * Emits a console warning if the write fails (e.g. quota exceeded).
 */
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(state.transactions));
  } catch (e) {
    console.warn('Expense & Budget Visualizer: failed to save transactions to localStorage.', e);
  }
}

/**
 * Persists state.categories to localStorage.
 * Emits a console warning if the write fails (e.g. quota exceeded).
 */
function saveCategories() {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(state.categories));
  } catch (e) {
    console.warn('Expense & Budget Visualizer: failed to save categories to localStorage.', e);
  }
}

/**
 * Persists state.theme to localStorage.
 * Emits a console warning if the write fails (e.g. quota exceeded).
 */
function saveTheme() {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, state.theme);
  } catch (e) {
    console.warn('Expense & Budget Visualizer: failed to save theme to localStorage.', e);
  }
}

// =============================================================================
// 4. Validation Helpers
// =============================================================================

/**
 * Validates a transaction's name and amount fields.
 *
 * Rules:
 *  - name must be a non-empty, non-whitespace-only string
 *  - amount must be a finite number greater than zero
 *
 * @param {string} name   - The item name entered by the user.
 * @param {*}      amount - The amount value entered by the user (may be a
 *                          string from a form input or already a number).
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTransaction(name, amount) {
  const errors = [];

  // --- name validation ---
  if (typeof name !== 'string' || name.trim() === '') {
    errors.push('Item name is required.');
  }

  // --- amount validation ---
  const numericAmount = Number(amount);
  if (amount === '' || amount === null || amount === undefined) {
    errors.push('Amount is required.');
  } else if (!isFinite(numericAmount) || isNaN(numericAmount)) {
    errors.push('Amount must be a valid number.');
  } else if (numericAmount <= 0) {
    errors.push('Amount must be a positive number.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a custom category name.
 *
 * Rules:
 *  - name must be a non-empty, non-whitespace-only string
 *  - name must not already exist in the combined default + custom category
 *    list (comparison is case-insensitive)
 *
 * Note: `getCategories()` is defined later in section 5 (Category Functions).
 * This works because JS function declarations are hoisted. As a safety net,
 * if `getCategories` is not yet defined (e.g. during isolated unit tests),
 * the function falls back to reading DEFAULT_CATEGORIES and state.categories
 * directly.
 *
 * @param {string} name - The category name entered by the user.
 * @returns {{ valid: boolean, error: string }}
 */
function validateCategory(name) {
  // --- empty / whitespace check ---
  if (typeof name !== 'string' || name.trim() === '') {
    return { valid: false, error: 'Category name is required.' };
  }

  // --- duplicate check (case-insensitive) ---
  // Use getCategories() when available; fall back to direct state access.
  const allCategories =
    typeof getCategories === 'function'
      ? getCategories()
      : [...DEFAULT_CATEGORIES, ...state.categories];

  const trimmedLower = name.trim().toLowerCase();
  const isDuplicate = allCategories.some(
    (cat) => cat.toLowerCase() === trimmedLower
  );

  if (isDuplicate) {
    return { valid: false, error: 'Category already exists.' };
  }

  return { valid: true, error: '' };
}

// =============================================================================
// 7. Balance Functions
// =============================================================================

/**
 * Returns the arithmetic sum of all `amount` fields in `state.transactions`.
 * Returns `0` when the transaction list is empty.
 *
 * @returns {number}
 */
function computeBalance() {
  return state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Formats a number as Indonesian Rupiah currency string.
 * Uses dot as thousands separator and no decimal places.
 * e.g., `formatCurrency(10000)` → `"Rp 10.000"`
 *
 * @param {number} n - The numeric value to format.
 * @returns {string}
 */
function formatCurrency(n) {
  return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
}

// =============================================================================
// 5. Transaction Functions
// =============================================================================

/**
 * Adds a new transaction to state, persists it, and re-renders the UI.
 *
 * @param {string} name     - The item name.
 * @param {number} amount   - The positive numeric amount.
 * @param {string} category - The category label.
 */
function addTransaction(name, amount, category) {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString();

  const transaction = {
    id,
    name: name.trim(),
    amount: Number(amount),
    category,
    createdAt: Date.now(),
  };

  state.transactions.push(transaction);
  saveTransactions();

  renderTransactionList();
  renderBalance();
  renderPieChart();
}

/**
 * Removes the transaction with the given id from state, persists the change,
 * and re-renders the UI.
 *
 * @param {string} id - The id of the transaction to remove.
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  saveTransactions();

  renderTransactionList();
  renderBalance();
  renderPieChart();
}

/**
 * Returns a sorted copy of state.transactions based on the given sortKey.
 *
 * - 'amount'   → descending by amount (highest first)
 * - 'category' → ascending alphabetically by category name
 * - 'default'  → ascending by createdAt (insertion order)
 *
 * @param {string} sortKey - One of 'amount', 'category', or 'default'.
 * @returns {object[]} A new sorted array of transaction objects.
 */
function getSortedTransactions(sortKey) {
  const copy = [...state.transactions];

  if (sortKey === 'amount') {
    copy.sort((a, b) => b.amount - a.amount);
  } else if (sortKey === 'category') {
    copy.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    // 'default' — preserve insertion order by ascending createdAt
    copy.sort((a, b) => a.createdAt - b.createdAt);
  }

  return copy;
}

// =============================================================================
// 6. Category Functions
// =============================================================================

/**
 * Adds a new custom category to state, persists it, and re-renders the
 * category dropdown.
 *
 * @param {string} name - The trimmed, validated category name to add.
 */
function addCategory(name) {
  state.categories.push(name.trim());
  saveCategories();
  renderCategoryDropdown();
}

/**
 * Returns the full list of available categories: the three built-in defaults
 * followed by any user-defined custom categories.
 *
 * @returns {string[]}
 */
function getCategories() {
  return [...DEFAULT_CATEGORIES, ...state.categories];
}

// =============================================================================
// 8. Pie Chart Renderer
// =============================================================================

/**
 * Renders a pie chart of spending by category on `#chart-canvas`.
 *
 * Behaviour:
 *  - When `state.transactions` is empty: hides the canvas and shows a
 *    placeholder `<p>` element inside `#chart-container`.
 *  - When transactions exist and the chart was previously in placeholder mode:
 *    hides the placeholder and shows the canvas, then draws the chart.
 *  - If `getContext('2d')` returns `null` (unsupported browser): skips
 *    rendering and emits a console warning.
 *  - Colors are assigned from `CHART_COLORS`, cycling when there are more
 *    categories than palette entries.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
function renderPieChart() {
  const container = document.getElementById('chart-container');
  const canvas    = document.getElementById('chart-canvas');

  if (!container || !canvas) return;

  // ── Placeholder helpers ──────────────────────────────────────────────────

  /** Returns the existing placeholder <p>, or null if it doesn't exist yet. */
  function getPlaceholder() {
    return container.querySelector('p.chart-placeholder');
  }

  /** Creates (or reuses) the placeholder <p> and makes it visible. */
  function showPlaceholder() {
    let placeholder = getPlaceholder();
    if (!placeholder) {
      placeholder = document.createElement('p');
      placeholder.className = 'chart-placeholder';
      placeholder.textContent = 'No transactions yet. Add one to see your spending chart.';
      container.appendChild(placeholder);
    }
    placeholder.style.display = '';
    canvas.style.display = 'none';
    // Hide legend when in placeholder mode
    const legend = container.querySelector('ul.chart-legend');
    if (legend) legend.style.display = 'none';
  }

  /** Hides the placeholder <p> (if present) and makes the canvas visible. */
  function hidePlaceholder() {
    const placeholder = getPlaceholder();
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    canvas.style.display = '';
    // Restore legend visibility when chart is shown
    const legend = container.querySelector('ul.chart-legend');
    if (legend) legend.style.display = '';
  }

  // ── Empty-state guard ────────────────────────────────────────────────────

  if (state.transactions.length === 0) {
    showPlaceholder();
    return;
  }

  // Transactions exist — ensure canvas is visible and placeholder is hidden
  hidePlaceholder();

  // ── Canvas context guard ─────────────────────────────────────────────────

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('Expense & Budget Visualizer: Canvas 2D context is not available; skipping pie chart render.');
    return;
  }

  // ── Aggregate spending by category ───────────────────────────────────────

  /** @type {Map<string, number>} category → total amount */
  const totals = new Map();
  for (const tx of state.transactions) {
    totals.set(tx.category, (totals.get(tx.category) || 0) + tx.amount);
  }

  const categories = Array.from(totals.keys());
  const total      = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);

  // Guard against a zero total (all amounts somehow zero) to avoid NaN arcs
  if (total <= 0) {
    showPlaceholder();
    return;
  }

  // ── Draw pie chart ───────────────────────────────────────────────────────

  const width  = canvas.width;
  const height = canvas.height;
  const cx     = width  / 2;
  const cy     = height / 2;
  const radius = Math.min(cx, cy) * 0.85; // leave a small margin

  // Clear previous frame
  ctx.clearRect(0, 0, width, height);

  let startAngle = -Math.PI / 2; // start at 12 o'clock

  categories.forEach((category, index) => {
    const sliceValue = totals.get(category);
    const sliceAngle = (sliceValue / total) * 2 * Math.PI;
    const endAngle   = startAngle + sliceAngle;

    // Fill arc segment
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
    ctx.fill();

    // Thin white separator stroke between slices
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // ── Render HTML legend ───────────────────────────────────────────────────

  // Reuse or create the legend element
  let legend = container.querySelector('ul.chart-legend');
  if (!legend) {
    legend = document.createElement('ul');
    legend.className = 'chart-legend';
    container.appendChild(legend);
  }
  legend.innerHTML = '';

  categories.forEach((category, index) => {
    const amount  = totals.get(category);
    const percent = ((amount / total) * 100).toFixed(1);
    const color   = CHART_COLORS[index % CHART_COLORS.length];

    const li = document.createElement('li');
    li.className = 'chart-legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'chart-legend-swatch';
    swatch.style.backgroundColor = color;

    const label = document.createElement('span');
    label.className = 'chart-legend-label';
    label.textContent = `${category} — ${formatCurrency(amount)} (${percent}%)`;

    li.appendChild(swatch);
    li.appendChild(label);
    legend.appendChild(li);
  });
}

// =============================================================================
// 9. DOM Render Functions
// =============================================================================

/**
 * Clears and re-renders the `#transaction-list` `<ul>` element.
 *
 * Behaviour:
 *  - Reads the sorted transaction list via `getSortedTransactions(state.sortKey)`.
 *  - Each transaction is rendered as a `<li>` containing the item name,
 *    formatted amount, category, and a delete button with a `data-id` attribute.
 *  - When no transactions exist, renders a single `<li>` with an empty-state
 *    message.
 *
 * Requirements: 2.1, 2.2, 2.6
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing content
  list.innerHTML = '';

  const transactions = getSortedTransactions(state.sortKey);

  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'transaction-empty';
    emptyItem.textContent = 'No transactions recorded yet.';
    list.appendChild(emptyItem);
    return;
  }

  transactions.forEach((tx) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    // Item name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = tx.name;

    // Formatted amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = formatCurrency(tx.amount);

    // Category
    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = tx.category;

    // Delete button — data-id is used by event delegation in the event listener
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'transaction-delete';
    deleteBtn.setAttribute('data-id', tx.id);
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${tx.name}`);
    deleteBtn.textContent = 'Delete';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

/**
 * Clears and re-populates the `#category` `<select>` inside `#transaction-form`
 * with the full list of categories returned by `getCategories()`.
 *
 * Requirements: 1.1, 1.2
 */
function renderCategoryDropdown() {
  const select = document.querySelector('#transaction-form #category');
  if (!select) return;

  // Clear existing options
  select.innerHTML = '';

  getCategories().forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/**
 * Updates the text content of `#total-balance` with the current balance
 * formatted as a currency string.
 *
 * Requirements: 3.1, 3.4
 */
function renderBalance() {
  const balanceEl = document.getElementById('total-balance');
  if (!balanceEl) return;

  balanceEl.textContent = formatCurrency(computeBalance());
}

// =============================================================================
// 10. Theme Functions
// =============================================================================

/**
 * Applies the given theme to the document by toggling the `dark` CSS class on
 * `<body>`.
 *
 * - When `theme === 'dark'`, adds the class `dark` to `document.body`.
 * - For any other value (including `'light'`), removes the class `dark`.
 *
 * Requirements: 5.1, 5.2, 5.4
 *
 * @param {string} theme - Either `'dark'` or `'light'`.
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

/**
 * Toggles `state.theme` between `'light'` and `'dark'`, persists the new
 * value to localStorage via `saveTheme()`, then applies it to the DOM via
 * `applyTheme()`.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveTheme();
  applyTheme(state.theme);
}

// =============================================================================
// 11. Event Listeners
// =============================================================================

/**
 * Removes all existing `.error-msg` spans inside the given form element.
 *
 * @param {HTMLFormElement} form
 */
function clearFormErrors(form) {
  form.querySelectorAll('.error-msg').forEach((el) => el.remove());
}

/**
 * Inserts an inline `<span class="error-msg">` immediately after the given
 * input/select element.
 *
 * @param {HTMLElement} field - The input or select element to annotate.
 * @param {string}      msg   - The error message text.
 */
function showFieldError(field, msg) {
  const span = document.createElement('span');
  span.className = 'error-msg';
  span.setAttribute('role', 'alert');
  span.textContent = msg;
  field.insertAdjacentElement('afterend', span);
}

// ── #transaction-form submit ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function attachTransactionFormListener() {
  const form = document.getElementById('transaction-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameField     = document.getElementById('item-name');
    const amountField   = document.getElementById('amount');
    const categoryField = document.getElementById('category');

    const name     = nameField   ? nameField.value   : '';
    const amount   = amountField ? amountField.value : '';
    const category = categoryField ? categoryField.value : '';

    // Clear previous errors
    clearFormErrors(form);

    const { valid, errors } = validateTransaction(name, amount);

    if (!valid) {
      // Display each error after the relevant field
      errors.forEach((msg) => {
        if (msg.toLowerCase().includes('name') && nameField) {
          showFieldError(nameField, msg);
        } else if (
          (msg.toLowerCase().includes('amount') || msg.toLowerCase().includes('number')) &&
          amountField
        ) {
          showFieldError(amountField, msg);
        } else {
          // Fallback: append after the submit button
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) showFieldError(submitBtn, msg);
        }
      });
      return;
    }

    addTransaction(name, parseFloat(amount), category);
    form.reset();
  });
});

// ── #category-form submit ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function attachCategoryFormListener() {
  const form = document.getElementById('category-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameField = document.getElementById('category-name');
    const name      = nameField ? nameField.value : '';

    // Clear previous errors
    clearFormErrors(form);

    const { valid, error } = validateCategory(name);

    if (!valid) {
      if (nameField) showFieldError(nameField, error);
      return;
    }

    addCategory(name.trim());
    if (nameField) nameField.value = '';
  });
});

// ── #transaction-list click (event delegation for delete buttons) ────────────

document.addEventListener('DOMContentLoaded', function attachTransactionListListener() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.addEventListener('click', function (e) {
    const btn = e.target.closest('button.transaction-delete');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    if (id) {
      deleteTransaction(id);
    }
  });
});

// ── #sort-controls click ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function attachSortControlsListener() {
  const sortControls = document.getElementById('sort-controls');
  if (!sortControls) return;

  sortControls.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-sort]');
    if (!btn) return;

    const sortKey = btn.getAttribute('data-sort');
    if (sortKey === 'default' || sortKey === 'amount' || sortKey === 'category') {
      state.sortKey = sortKey;
      renderTransactionList();
    }
  });
});

// ── #theme-toggle click ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function attachThemeToggleListener() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  themeToggle.addEventListener('click', function () {
    toggleTheme();
  });
});

// =============================================================================
// 12. App Initialisation
// =============================================================================

/**
 * Initialises the application.
 *
 * Steps:
 *  1. Calls `loadState()` to read persisted data from localStorage.
 *  2. Populates the in-memory `state` object with the loaded values.
 *  3. Handles invalid theme: if the stored theme is neither 'light' nor 'dark',
 *     defaults to 'light' and overwrites the invalid value in localStorage.
 *  4. Calls `applyTheme`, `renderCategoryDropdown`, `renderTransactionList`,
 *     `renderBalance`, and `renderPieChart` to render the initial UI.
 *
 * Requirements: 5.4, 5.5, 5.6, 7.3, 7.4
 */
function init() {
  const loaded = loadState();

  state.transactions = loaded.transactions;
  state.categories   = loaded.categories;

  // Validate and resolve theme — default to 'light' for any invalid value
  if (loaded.theme === 'light' || loaded.theme === 'dark') {
    state.theme = loaded.theme;
  } else {
    state.theme = 'light';
    // Overwrite the invalid value in localStorage
    saveTheme();
  }

  applyTheme(state.theme);
  renderCategoryDropdown();
  renderTransactionList();
  renderBalance();
  renderPieChart();
}

// Bootstrap the app once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', init);

// =============================================================================
// Module Exports (for unit testing with Vitest / Node.js)
// =============================================================================

if (typeof module !== 'undefined') {
  module.exports = {
    validateTransaction,
    validateCategory,
    computeBalance,
    formatCurrency,
    getSortedTransactions,
    loadState,
    saveTransactions,
    saveCategories,
    // Expose state and helpers needed by tests
    state,
    DEFAULT_CATEGORIES,
    addTransaction,
    deleteTransaction,
    addCategory,
    getCategories,
    toggleTheme,
    saveTheme,
    applyTheme,
  };
}
