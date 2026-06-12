# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses and visualize spending distribution by category. Built with plain HTML, CSS, and Vanilla JavaScript, the app stores all data in the browser's Local Storage so no backend or account setup is needed. Users can add and delete transactions, see their running total balance, and view a live-updating pie chart that breaks down spending by category.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry composed of an item name, a monetary amount, and a category.
- **Category**: One of the three predefined expense groupings — Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Balance_Display**: The UI component at the top of the page that shows the current total of all transaction amounts.
- **Input_Form**: The UI form through which a user enters a new transaction.
- **Chart**: The pie chart that visualizes spending distribution across categories.
- **Local_Storage**: The browser's built-in key-value persistence layer used to save transaction data client-side.
- **Validator**: The logic component responsible for verifying that submitted form data is complete and valid before a transaction is created.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for item name (accepting 1–100 characters), a numeric field for amount (accepting values from 0.01 to 999,999,999.99), and a dropdown selector for category with options Food, Transport, and Fun, and a default unselected placeholder.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with all fields filled, THE Input_Form SHALL reset all fields to their default empty state after the transaction is saved — text and amount fields cleared, dropdown returned to the unselected placeholder.
4. IF any field in the Input_Form is empty or the dropdown is at the unselected placeholder at submission time, THEN THE Validator SHALL display an inline error message adjacent to the empty field and prevent the transaction from being saved.
5. IF the amount field contains a value outside the range 0.01–999,999,999.99 or a non-numeric value, THEN THE Validator SHALL display an inline error message adjacent to the amount field and prevent the transaction from being saved.
6. IF the item name field contains more than 100 characters, THEN THE Validator SHALL display an inline error message adjacent to the item name field and prevent the transaction from being saved.
7. IF Local_Storage is unavailable when a transaction is submitted, THEN THE App SHALL display a non-blocking warning message indicating that data cannot be saved and prevent the transaction from being added.

---

### Requirement 2: View Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every saved transaction showing its item name, amount, category, and the date and time it was added.
2. WHEN the App loads, THE Transaction_List SHALL populate from Local_Storage and display all previously saved transactions.
3. WHILE the number of transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain scrollable so all entries are accessible.
4. WHEN transactions are present, THE Transaction_List SHALL render them in ascending order of their addition timestamp, with the most recent transaction shown last.
5. WHEN the Transaction_List contains no transactions, THE Transaction_List SHALL display a placeholder message indicating that no expenses have been recorded yet.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete individual transactions so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control alongside each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL display a confirmation prompt, and IF the user confirms, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
4. WHEN a transaction is deleted, THE Chart SHALL update to reflect the new category distribution within 500 milliseconds without requiring a page reload.
5. WHEN the last transaction is deleted, THE Transaction_List SHALL display the empty-state placeholder message and THE Chart SHALL display its empty state, and THE Balance_Display SHALL show a value of 0.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total balance at the top of the page so that I know my cumulative spending at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the App and remain visible during scrolling.
2. THE Balance_Display SHALL show the net sum of all transaction amounts currently in the Transaction_List.
3. WHEN a transaction is added, THE Balance_Display SHALL update its value within 100 milliseconds without requiring a page reload.
4. WHEN a transaction is deleted, THE Balance_Display SHALL update its value within 100 milliseconds without requiring a page reload.
5. WHEN the Transaction_List is empty, THE Balance_Display SHALL show a value of 0.

---

### Requirement 5: Visualize Spending by Category (Pie Chart)

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying the proportion of total spending attributed to each category (Food, Transport, Fun).
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new category distribution within 500 milliseconds without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the new category distribution within 500 milliseconds without requiring a page reload.
4. WHEN the Transaction_List is empty, THE Chart SHALL display a single grey full-circle segment with a label indicating no data is available.
5. THE Chart SHALL assign a unique fixed color to each category — Food, Transport, and Fun each receive a distinct color that does not change regardless of which categories are present.
6. WHEN a category has a total spending of zero and at least one other category has a non-zero total, THE Chart SHALL omit that zero-value category's segment from the rendered pie chart.

---

### Requirement 6: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between browser sessions so that I do not lose my expense history when I close and reopen the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local_Storage within 100 milliseconds of the transaction being confirmed.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage within 100 milliseconds of the deletion being confirmed.
3. WHEN the App loads, THE App SHALL read the transaction list from Local_Storage and restore all previously saved transactions before rendering the Transaction_List, Balance_Display, and Chart.
4. IF Local_Storage is unavailable or returns data that cannot be parsed as a valid JSON array of transaction objects, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning banner identifying that saved data could not be loaded.
5. THE App SHALL not persist more than 1,000 transactions to Local_Storage; IF adding a transaction would exceed 1,000 entries, THEN THE App SHALL display a non-blocking warning message informing the user the limit has been reached and prevent the new transaction from being saved.

---

### Requirement 7: Responsive and Accessible UI

**User Story:** As a user, I want the app to be usable on different screen sizes and in modern browsers so that I can access it from any device.

#### Acceptance Criteria

1. THE App SHALL render in the latest stable releases of Chrome, Firefox, Edge, and Safari with no overlapping elements, no clipped or missing content, and all interactive controls remaining operable.
2. THE App SHALL be implemented using exactly one CSS file and exactly one JavaScript file; no additional stylesheet or script files shall be loaded from the project source.
3. WHILE the viewport width is 600 px or less, THE App SHALL reflow its layout so that all components are reachable and operable and no content is clipped or requires horizontal scrolling to view.
4. THE Input_Form fields and interactive controls SHALL be keyboard-navigable in a top-to-bottom, left-to-right tab order matching the visual reading order of the page.
5. THE Balance_Display, Transaction_List, and Chart SHALL each carry a non-empty ARIA label that identifies the component's purpose to assistive technologies.
