const taskName = document.getElementById("taskName");
const category = document.getElementById("category");
const deadline = document.getElementById("deadline");
const taskStatus = document.getElementById("taskStatus");
const feelings = document.getElementById("feelings");
let submit = document.getElementById("submit");
let taskList = document.getElementById("taskList");
const taskCounter = document.getElementById("taskCounter");
const clearAll = document.getElementById("clearAll");
const filterStatus = document.getElementById("filterStatus");
const filterCategory = document.getElementById("filterCategory");

// The name tasks are saved under in the browser's local storage
const STORAGE_KEY = "emotido-tasks";

// Every status a task can have. "Overdue" is set automatically.
const STATUSES = ["Not Started", "In Progress", "Completed", "Overdue"];

let tasks = loadTasks();

/* ---------- Local storage ---------- */

// Read saved tasks when the page opens (or start empty)
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    // Older versions used "Done" instead of "Completed"
    return saved.map(function (t) {
      if (t.status === "Done") t.status = "Completed";
      return t;
    });
  } catch (error) {
    return [];
  }
}

// Save the current task list so it survives a refresh
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    // Storage can be blocked (e.g. private browsing); the app still works
  }
}

/* ---------- Overdue check ---------- */

// Today's date as "YYYY-MM-DD", the same format the date input uses
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Any unfinished task whose deadline has passed becomes "Overdue"
function updateOverdue() {
  const today = todayString();
  tasks.forEach(function (task) {
    if (task.deadline && task.deadline < today && task.status !== "Completed") {
      task.status = "Overdue";
    }
  });
}

/* ---------- Adding tasks ---------- */

submit.addEventListener("click", function (event) {
  event.preventDefault(); // stop the form from reloading the page

  // Because we cancel the click, the browser's "required" check won't run,
  // so we check for an empty name ourselves.
  if (!taskName.value.trim()) return;

  let task = {
    id: Date.now(),
    name: taskName.value.trim(),
    category: category.value,
    deadline: deadline.value,
    status: taskStatus.value,
    feelings: feelings.value,
  };

  tasks.push(task);
  renderTasks();

  // Reset the form for the next task
  taskName.value = "";
  deadline.value = "";
  feelings.selectedIndex = 0; // back to "Neutral"
  taskName.focus();
});

/* ---------- Updating and deleting tasks ---------- */

// One listener on the parent handles every "Mark Complete" and "Delete"
// button, including ones created later by renderTasks()
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const id = Number(button.dataset.id);

  if (button.dataset.action === "delete") {
    // Keep every task except the one whose Delete was clicked
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
  } else {
    const task = tasks.find(function (t) {
      return t.id === id;
    });
    if (task) task.status = "Completed";
  }

  renderTasks();
});

// Changing a row's status dropdown updates that task
taskList.addEventListener("change", function (event) {
  const select = event.target.closest("select[data-id]");
  if (!select) return;

  const id = Number(select.dataset.id);
  const task = tasks.find(function (t) {
    return t.id === id;
  });

  if (task) {
    task.status = select.value;
    renderTasks();
  }
});

// Erase every task from the list and the table
clearAll.addEventListener("click", function () {
  tasks = [];
  renderTasks();
});

/* ---------- Filtering ---------- */

filterStatus.addEventListener("change", renderTasks);
filterCategory.addEventListener("change", renderTasks);

/* ---------- Drawing the table ---------- */

function renderTasks() {
  updateOverdue();
  saveTasks();

  taskList.innerHTML = "";

  // Only show tasks that match both filters
  const visibleTasks = tasks.filter(function (task) {
    const statusMatches =
      filterStatus.value === "All" || task.status === filterStatus.value;
    const categoryMatches =
      filterCategory.value === "All" || task.category === filterCategory.value;
    return statusMatches && categoryMatches;
  });

  if (visibleTasks.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = tasks.length === 0 ? "No tasks yet." : "No tasks match these filters.";
    tr.appendChild(td);
    taskList.appendChild(tr);
  }

  visibleTasks.forEach(function (task) {
    const tr = document.createElement("tr");
    if (task.status === "Completed") tr.className = "done";
    if (task.status === "Overdue") tr.className = "overdue";

    // Task, category and deadline cells
    [task.name, task.category, task.deadline || "No deadline"].forEach(function (text) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });

    // Status cell: a dropdown so progress can be changed right in the table
    const statusTd = document.createElement("td");
    const statusSelect = document.createElement("select");
    statusSelect.dataset.id = task.id;
    STATUSES.forEach(function (status) {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      if (status === task.status) option.selected = true;
      statusSelect.appendChild(option);
    });
    statusTd.appendChild(statusSelect);
    tr.appendChild(statusTd);

    // Feelings cell
    const feelingsTd = document.createElement("td");
    feelingsTd.textContent = task.feelings;
    tr.appendChild(feelingsTd);

    // Action column: "Mark Complete" (or "Completed") plus a Delete button
    const actionTd = document.createElement("td");
    if (task.status !== "Completed") {
      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Mark Complete";
      completeBtn.dataset.id = task.id; // remembers which task this button belongs to
      completeBtn.dataset.action = "complete";
      actionTd.appendChild(completeBtn);
    } else {
      actionTd.textContent = "Completed";
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.id = task.id;
    deleteBtn.dataset.action = "delete";
    actionTd.appendChild(deleteBtn);

    tr.appendChild(actionTd);

    taskList.appendChild(tr);
  });

  updateCounter();
}

function updateCounter() {
  function count(status) {
    return tasks.filter(function (t) {
      return t.status === status;
    }).length;
  }

  const total = tasks.length;
  const done = count("Completed");
  const overdue = count("Overdue");
  const remaining = total - done;

  taskCounter.textContent = `Total: ${total} | Completed: ${done} | Remaining: ${remaining} | Overdue: ${overdue}`;
}

// Draw saved tasks on first load
renderTasks();

// Re-check deadlines every minute so tasks turn "Overdue" at midnight
// even if the page stays open. Only redraw when something changed.
setInterval(function () {
  const before = JSON.stringify(tasks);
  updateOverdue();
  if (JSON.stringify(tasks) !== before) renderTasks();
}, 60 * 1000);