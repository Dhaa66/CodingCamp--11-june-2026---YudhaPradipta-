// ======================
// STATE
// ======================

let transactions = [];
let storageAvailable = true;

// ======================
// CONFIG
// ======================

const STORAGE_KEY = "expense-tracker-data";

const CATEGORY_COLORS = {
  Food: "#FF6384",
  Transport: "#36A2EB",
  Fun: "#FFCE56",
};

// ======================
// STORAGE
// ======================

function checkStorage() {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    showWarning("LocalStorage tidak tersedia");
  }
}

function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStorage() {
  if (!storageAvailable) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ======================
// CALCULATION
// ======================

function getTotal() {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

function getCategoryTotals() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };

  transactions.forEach(t => {
    totals[t.category] += t.amount;
  });

  return totals;
}

// ======================
// VALIDATION
// ======================

function validate(name, amount, category) {
  const errors = {};

  if (!name || name.trim() === "") {
    errors.name = "Nama wajib diisi";
  }

  const num = Number(amount);
  if (!amount || isNaN(num) || num <= 0) {
    errors.amount = "Amount tidak valid";
  }

  if (!["Food", "Transport", "Fun"].includes(category)) {
    errors.category = "Pilih kategori";
  }

  return errors;
}

// ======================
// SORT
// ======================

function sortTransactions(data) {
  const type = document.getElementById("sort-option")?.value || "latest";

  let sorted = [...data];

  switch (type) {
    case "latest":
      sorted.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case "amount-high":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-low":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case "category":
      sorted.sort((a, b) => a.category.localeCompare(b.category));
      break;
  }

  return sorted;
}

// ======================
// RENDER UI
// ======================

function renderBalance() {
  document.getElementById("balance-display").textContent =
    `$${getTotal().toFixed(2)}`;
}

function renderSummary() {
  const total = getTotal();

  document.getElementById("summary-total").textContent = `$${total.toFixed(2)}`;
  document.getElementById("summary-count").textContent = transactions.length;

  const cat = getCategoryTotals();

  let top = "-";
  let max = 0;

  for (const k in cat) {
    if (cat[k] > max) {
      max = cat[k];
      top = k;
    }
  }

  document.getElementById("summary-category").textContent = top;
}

// ======================
// LIST (DELETE DI UJUNG)
// ======================

function renderList() {
  const list = document.getElementById("transaction-list");
  list.innerHTML = "";

  const data = sortTransactions(transactions);

  if (data.length === 0) {
    list.innerHTML = `
      <li class="empty-state">
        <i class="fa-solid fa-wallet"></i>
        <p>No expenses recorded yet</p>
      </li>`;
    return;
  }

  data.forEach(t => {
    const li = document.createElement("li");
    li.dataset.id = t.id;

    li.innerHTML = `
      <div class="tx-left">
        <strong>${t.name}</strong>
        <small>${t.category}</small>
      </div>

      <div class="tx-right">
        <span class="tx-amount">$${t.amount.toFixed(2)}</span>

        <button class="delete-btn" data-id="${t.id}" title="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    list.appendChild(li);
  });
}

// ======================
// CHART
// ======================

function renderChart() {
  const canvas = document.getElementById("spending-chart");
  const ctx = canvas.getContext("2d");

  const totals = getCategoryTotals();
  const values = Object.values(totals);
  const labels = Object.keys(totals);

  const total = values.reduce((a, b) => a + b, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (total === 0) {
    ctx.fillStyle = "#ccc";
    ctx.beginPath();
    ctx.arc(200, 150, 100, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.fillText("No Data", 200, 150);
    return;
  }

  let start = -Math.PI / 2;

  values.forEach((val, i) => {
    if (val === 0) return;

    const angle = (val / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(200, 150);
    ctx.arc(200, 150, 100, start, start + angle);
    ctx.closePath();

    ctx.fillStyle = CATEGORY_COLORS[labels[i]];
    ctx.fill();

    start += angle;
  });
}

// ======================
// BUDGET
// ======================

function renderBudget() {
  const budget = Number(document.getElementById("budget-limit").value) || 0;
  const total = getTotal();

  const progress = document.getElementById("budget-progress");
  const percentText = document.getElementById("budget-percent");

  if (budget <= 0) {
    progress.value = 0;
    percentText.textContent = "0%";
    return;
  }

  const percent = Math.min((total / budget) * 100, 100);

  progress.value = percent;
  percentText.textContent = `${percent.toFixed(0)}%`;

  percentText.style.color = percent > 80 ? "red" : "green";
}

// ======================
// RENDER ALL
// ======================

function renderAll() {
  renderBalance();
  renderSummary();
  renderList();
  renderChart();
  renderBudget();
}

// ======================
// ACTIONS
// ======================

function addTransaction(name, amount, category) {
  const errors = validate(name, amount, category);

  if (Object.keys(errors).length > 0) {
    alert(Object.values(errors)[0]);
    return;
  }

  const tx = {
    id: crypto.randomUUID(),
    name: name.trim(),
    amount: Number(amount),
    category,
    timestamp: Date.now(),
  };

  transactions.push(tx);
  saveStorage();
  renderAll();
}

// ======================
// DELETE (KELUAR + ANIMASI)
// ======================

function deleteTransaction(id) {
  const el = document.querySelector(`[data-id="${id}"]`);

  if (el) {
    el.style.transition = "0.25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(50px) scale(0.95)";
  }

  setTimeout(() => {
    transactions = transactions.filter(t => t.id !== id);
    saveStorage();
    renderAll();
  }, 220);
}

// ======================
// WARNING
// ======================

function showWarning(msg) {
  const el = document.getElementById("warning-banner");
  if (el) el.textContent = msg;
}

// ======================
// INIT
// ======================

function init() {
  checkStorage();
  transactions = loadStorage();

  renderAll();

  // FORM
  document.getElementById("transaction-form").addEventListener("submit", e => {
    e.preventDefault();

    addTransaction(
      document.getElementById("item-name").value,
      document.getElementById("amount").value,
      document.getElementById("category").value
    );

    e.target.reset();
  });

  // DELETE EVENT (DELEGATION)
  document.getElementById("transaction-list").addEventListener("click", e => {
    const btn = e.target.closest(".delete-btn");
    if (btn) deleteTransaction(btn.dataset.id);
  });

  // SORT
  document.getElementById("sort-option").addEventListener("change", () => {
    renderList();
  });
}

document.addEventListener("DOMContentLoaded", init);