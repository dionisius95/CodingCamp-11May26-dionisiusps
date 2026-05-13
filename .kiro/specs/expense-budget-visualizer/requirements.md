# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly single-page web application that helps users track their daily spending. It allows users to log transactions with a name, amount, and category; view a running total balance; visualize spending distribution via a pie chart; and manage their data entirely client-side using browser Local Storage. The app supports dark/light mode toggling and custom user-defined categories, all built with plain HTML, CSS, and Vanilla JavaScript — no frameworks or build tools required.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single spending entry consisting of an item name, a monetary amount, and a category.
- **Category**: A label assigned to a Transaction. Default categories are Food, Transport, and Fun. Users may also define Custom Categories.
- **Custom Category**: A user-defined category added beyond the three default categories.
- **Transaction List**: The scrollable UI component that displays all recorded Transactions.
- **Total Balance**: The running sum of all Transaction amounts displayed at the top of the App.
- **Pie Chart**: A visual chart rendered in Vanilla JavaScript that shows spending distribution broken down by Category.
- **Local Storage**: The browser's `localStorage` API used to persist all data client-side.
- **Theme**: The visual color scheme of the App, either Light Mode or Dark Mode.
- **Input Form**: The UI form containing fields for Item Name, Amount, and Category used to add a new Transaction.

---

## Requirements

### Requirement 1: Add a Transaction via Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new spending transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for Item Name, a numeric field for Amount, and a dropdown selector for Category.
2. THE Category dropdown SHALL include the default options: Food, Transport, and Fun, as well as any Custom Categories previously added by the user.
3. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL add the Transaction to the Transaction List and persist it to Local Storage.
4. WHEN the user submits the Input_Form with one or more empty fields, THE Input_Form SHALL display a validation error message indicating which fields are missing.
5. WHEN the user submits the Input_Form with an Amount that is not a positive number, THE Input_Form SHALL display a validation error message indicating the Amount is invalid.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: View and Manage the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction's Item Name, Amount, and Category.
2. THE Transaction_List SHALL be scrollable when the number of Transactions exceeds the visible area.
3. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction List and from Local Storage.
4. WHEN the user selects "Sort by Amount", THE Transaction_List SHALL re-render with Transactions ordered from highest to lowest Amount.
5. WHEN the user selects "Sort by Category", THE Transaction_List SHALL re-render with Transactions grouped and ordered alphabetically by Category name.
6. WHEN no Transactions exist, THE Transaction_List SHALL display an empty-state message indicating no transactions have been recorded.

---

### Requirement 3: Display Total Balance

**User Story:** As a user, I want to see my total spending balance at the top of the screen so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Total Balance at the top of the page at all times.
2. WHEN a Transaction is added, THE Total_Balance SHALL update to reflect the new sum of all Transaction amounts without requiring a page reload.
3. WHEN a Transaction is deleted, THE Total_Balance SHALL update to reflect the new sum of all remaining Transaction amounts without requiring a page reload.
4. THE Total_Balance SHALL be formatted as a currency value with two decimal places (e.g., $0.00).

---

### Requirement 4: Visualize Spending with a Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE App SHALL render a Pie Chart in Vanilla JavaScript that displays the proportion of total spending for each Category.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update automatically to reflect the new spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update automatically to reflect the revised spending distribution without requiring a page reload.
4. WHEN no Transactions exist, THE Pie_Chart SHALL display a placeholder state indicating there is no data to visualize.
5. WHEN all Transactions are deleted and the Pie_Chart was previously rendered, THE App SHALL transition the Pie_Chart to placeholder mode and replace the entire chart with placeholder content.
5. THE Pie_Chart SHALL assign a distinct color to each Category so that categories are visually distinguishable.

---

### Requirement 5: Toggle Dark/Light Theme

**User Story:** As a user, I want to switch between dark and light themes so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between Light Mode and Dark Mode.
2. WHEN the user activates the theme toggle, THE App SHALL apply the selected Theme to all UI elements immediately without a page reload.
3. WHEN the user activates the theme toggle, THE App SHALL persist the selected Theme preference to Local Storage.
4. WHEN the App loads, THE App SHALL read the Theme preference from Local Storage and apply it before rendering any content, preventing a flash of the wrong theme.
5. IF no Theme preference exists in Local Storage, THEN THE App SHALL default to Light Mode.
6. WHEN the App loads and the stored Theme preference conflicts with the current theme state, THE App SHALL update Local Storage to match the current state and resolve the conflict gracefully without throwing an error.

---

### Requirement 6: Manage Custom Categories

**User Story:** As a user, I want to add my own custom spending categories so that I can organize transactions beyond the default options.

#### Acceptance Criteria

1. THE App SHALL provide a UI control that allows the user to enter and save a new Custom Category name.
2. WHEN the user submits a non-empty Custom Category name, THE App SHALL add it to the Category dropdown in the Input_Form and persist it to Local Storage.
3. WHEN the user submits an empty or whitespace-only Custom Category name, THE App SHALL display a validation error and SHALL NOT add the category.
4. WHEN the user submits a Custom Category name that already exists (case-insensitive), THE App SHALL display a duplicate error and SHALL NOT add the category.
5. WHEN the App loads, THE App SHALL restore all previously saved Custom Categories from Local Storage so they are available in the Category dropdown.

---

### Requirement 7: Persist and Restore Application State

**User Story:** As a user, I want my transactions, categories, and preferences to be saved automatically so that my data is still available when I return to the app.

#### Acceptance Criteria

1. THE App SHALL persist all Transactions to Local Storage whenever a Transaction is added or deleted.
2. THE App SHALL persist all Custom Categories to Local Storage whenever a Custom Category is added.
3. WHEN the App loads, THE App SHALL restore all Transactions from Local Storage and render them in the Transaction List; IF either the restoration or the rendering step fails, THEN THE App SHALL treat the entire operation as failed, initialize with an empty Transaction List, and SHALL NOT throw an unhandled error.
4. WHEN the App loads, THE App SHALL restore all Custom Categories from Local Storage and populate the Category dropdown.
5. IF Local Storage data is corrupted or unparseable, THEN THE App SHALL attempt to parse and restore whatever valid data can be recovered, render the Transaction List with any successfully parsed Transactions, and SHALL NOT throw an unhandled error.

---

### Requirement 8: Mobile-Friendly Responsive Layout

**User Story:** As a user, I want the app to work well on my phone so that I can log expenses on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to screen widths from 320px to 1440px without horizontal scrolling.
2. THE Input_Form, Transaction_List, Total_Balance, and Pie_Chart SHALL each remain fully usable and readable on screens with a width of 320px or greater.
3. THE App SHALL use touch-friendly tap targets with a minimum size of 44×44 CSS pixels for all interactive controls.
4. THE App SHALL load and render its initial state within 3 seconds on a standard broadband connection.

---

### Requirement 9: Technical Stack and Code Organization

**User Story:** As a developer, I want the app to be built with plain HTML, CSS, and Vanilla JavaScript so that it requires no build tools, frameworks, or server setup.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no front-end frameworks or transpilers; all charting functionality SHALL be implemented in Vanilla JavaScript without relying on Chart.js or any other charting library.
2. THE App SHALL contain exactly one CSS file located at `css/style.css`.
3. THE App SHALL contain exactly one JavaScript file located at `js/app.js`.
4. WHERE Chart.js is loaded from a CDN, THE App SHALL permit loading from both CDN and a local bundle simultaneously, provided that CDN loading occurs; however, given that charting is implemented in Vanilla JavaScript per criterion 1, THE App SHALL NOT load Chart.js from any source.
5. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without polyfills.
