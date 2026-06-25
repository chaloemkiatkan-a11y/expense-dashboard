// --- Default Seed Data ---
const DEFAULT_MEMBERS = ["สมชาย ใจดี", "สมหญิง รักงาน", "สมศักดิ์ สู้ชีวิต"];

const DEFAULT_TASKS = [
    {
        id: "task-1",
        title: "ออกแบบหน้าหลักของแอปพลิเคชัน (UI Dashboard)",
        description: "ออกแบบระบบ Glassmorphism UI สำหรับหน้าสถิติและ Kanban Board เพื่อเสนอผู้ใช้งาน",
        deadline: getOffsetDateString(2),
        assignee: "สมชาย ใจดี",
        status: "todo",
        priority: "high"
    },
    {
        id: "task-2",
        title: "พัฒนาฟังก์ชัน Drag and Drop",
        description: "เขียนลอจิก JavaScript เพื่อให้สามารถลากการ์ดงานสลับคอลัมน์ได้เสมือนจริง",
        deadline: getOffsetDateString(1),
        assignee: "สมชาย ใจดี",
        status: "in_progress",
        priority: "medium"
    },
    {
        id: "task-3",
        title: "ทำสรุปรายงานยอดขายไตรมาส 2",
        description: "รวบรวมข้อมูลยอดขายและทำสไลด์นำเสนอสำหรับการประชุมกับฝ่ายบริหาร",
        deadline: getOffsetDateString(0),
        assignee: "สมหญิง รักงาน",
        status: "review",
        priority: "medium"
    },
    {
        id: "task-4",
        title: "แก้ไขบักการอัปโหลดไฟล์",
        description: "บักอัปโหลดไฟล์รูปภาพขนาดเกิน 5MB แล้วระบบล่ม ได้แก้ไขและทดสอบเรียบร้อย",
        deadline: getOffsetDateString(-2),
        assignee: "สมศักดิ์ สู้ชีวิต",
        status: "done",
        priority: "high"
    },
    {
        id: "task-5",
        title: "อัปเดตเอกสารคู่มือผู้ใช้",
        description: "เขียนอธิบายวิธีการใช้หน้า Kanban และการทำงานของระบบจำลองสิทธิ์การเข้าถึง",
        deadline: getOffsetDateString(4),
        assignee: "สมหญิง รักงาน",
        status: "todo",
        priority: "low"
    }
];

// Helper to get relative dates
function getOffsetDateString(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
}

// --- App State ---
let state = {
    tasks: [],
    members: [],
    currentRole: "supervisor",
    theme: "dark",
    isCloudMode: false // Indicates if we are connected to Cloudflare D1
};

// --- Cache DOM Elements ---
const roleSelect = document.getElementById("roleSelect");
const themeBtn = document.getElementById("themeBtn");
const notificationArea = document.getElementById("notificationArea");
const viewSupervisor = document.getElementById("viewSupervisor");
const viewMember = document.getElementById("viewMember");
const modalElement = document.getElementById("taskModal");

// Supervisor view specific elements
const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statPending = document.getElementById("statPending");
const statOverdue = document.getElementById("statOverdue");
const teamWorkloadList = document.getElementById("teamWorkloadList");
const formCreateTask = document.getElementById("formCreateTask");
const selectAssignee = document.getElementById("selectAssignee");
const inputNewMember = document.getElementById("inputNewMember");
const btnAddMember = document.getElementById("btnAddMember");

// Filters for Directory
const filterAssignee = document.getElementById("filterAssignee");
const filterStatus = document.getElementById("filterStatus");
const inputSearch = document.getElementById("inputSearch");
const taskTableBody = document.getElementById("taskTableBody");

// Kanban Column Cards containers
const cardsTodo = document.getElementById("cards-todo");
const cardsInProgress = document.getElementById("cards-in_progress");
const cardsReview = document.getElementById("cards-review");
const cardsDone = document.getElementById("cards-done");
const memberBoardTitle = document.getElementById("memberBoardTitle");

// --- Modal Elements ---
const modalTitle = document.getElementById("modalTitle");
const formModal = document.getElementById("formModal");
const modalTaskId = document.getElementById("modalTaskId");
const modalTaskTitle = document.getElementById("modalTaskTitle");
const modalTaskDesc = document.getElementById("modalTaskDesc");
const modalTaskDeadline = document.getElementById("modalTaskDeadline");
const modalTaskAssignee = document.getElementById("modalTaskAssignee");
const modalTaskPriority = document.getElementById("modalTaskPriority");
const modalTaskStatus = document.getElementById("modalTaskStatus");
const btnModalDelete = document.getElementById("btnModalDelete");

// --- Load and Save Data (Hybrid Cloud D1 + LocalStorage Fallback) ---
async function initData() {
    // Load Theme
    state.theme = localStorage.getItem("team_todo_theme") || "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";

    // Attempt to load from Cloudflare D1 APIs
    try {
        const membersRes = await fetch("/api/members");
        const tasksRes = await fetch("/api/tasks");
        
        if (membersRes.ok && tasksRes.ok) {
            state.members = await membersRes.json();
            // In SQL members table is [{name: "xxx"}, ...] we map it to string array
            state.members = state.members.map(m => m.name);
            state.tasks = await tasksRes.json();
            state.isCloudMode = true;
            console.log("Connected to Cloudflare D1 Database!");
        } else {
            throw new Error("API responded with error code");
        }
    } catch (err) {
        console.warn("Could not connect to Cloudflare D1 API. Falling back to localStorage.", err);
        state.isCloudMode = false;
        
        // Fallback to localStorage
        const storedMembers = localStorage.getItem("team_todo_members");
        if (storedMembers) {
            state.members = JSON.parse(storedMembers);
        } else {
            state.members = [...DEFAULT_MEMBERS];
            localStorage.setItem("team_todo_members", JSON.stringify(state.members));
        }

        const storedTasks = localStorage.getItem("team_todo_tasks");
        if (storedTasks) {
            state.tasks = JSON.parse(storedTasks);
        } else {
            state.tasks = [...DEFAULT_TASKS];
            localStorage.setItem("team_todo_tasks", JSON.stringify(state.tasks));
        }
    }

    // Populate role selectors
    populateRoleDropdowns();

    // Check query params or defaults
    state.currentRole = localStorage.getItem("team_todo_current_role") || "supervisor";
    
    // Check if currentRole is valid member or supervisor
    if (state.currentRole !== "supervisor" && !state.members.includes(state.currentRole)) {
        state.currentRole = "supervisor";
    }
    
    roleSelect.value = state.currentRole;

    render();
}

// Save data locally if offline, otherwise Cloud APIs handle it
function saveLocalFallback() {
    if (!state.isCloudMode) {
        localStorage.setItem("team_todo_tasks", JSON.stringify(state.tasks));
        localStorage.setItem("team_todo_members", JSON.stringify(state.members));
    }
}

// --- Populate dropdown options dynamically ---
function populateRoleDropdowns() {
    // Main selector in header
    roleSelect.innerHTML = `<option value="supervisor">👤 หัวหน้างาน (Supervisor) ${state.isCloudMode ? '☁️' : ''}</option>`;
    state.members.forEach(member => {
        if (member !== "ไม่มีผู้รับผิดชอบ") {
            const option = document.createElement("option");
            option.value = member;
            option.textContent = `🛠️ ทีมงาน: ${member}`;
            roleSelect.appendChild(option);
        }
    });

    // Form select assignee (in Create Form)
    selectAssignee.innerHTML = `<option value="" disabled selected>เลือกผู้รับผิดชอบ...</option>`;
    state.members.forEach(member => {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        selectAssignee.appendChild(option);
    });

    // Directory filter assignee
    filterAssignee.innerHTML = `<option value="all">ทุกคนในทีม</option>`;
    state.members.forEach(member => {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        filterAssignee.appendChild(option);
    });

    // Modal select assignee
    modalTaskAssignee.innerHTML = ``;
    state.members.forEach(member => {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        modalTaskAssignee.appendChild(option);
    });
}

// --- Date checks ---
function isOverdue(deadlineStr, status) {
    if (status === "done") return false;
    if (!deadlineStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0,0,0,0);
    return deadline < today;
}

// --- Render Controller ---
function render() {
    checkOverdueNotifications();

    if (state.currentRole === "supervisor") {
        viewSupervisor.style.display = "grid";
        viewMember.style.display = "none";
        renderSupervisorDashboard();
    } else {
        viewSupervisor.style.display = "none";
        viewMember.style.display = "block";
        renderMemberKanbanBoard();
    }
}

// --- Check Overdue Notifications ---
function checkOverdueNotifications() {
    let overdueCount = 0;
    
    if (state.currentRole === "supervisor") {
        overdueCount = state.tasks.filter(t => isOverdue(t.deadline, t.status)).length;
    } else {
        overdueCount = state.tasks.filter(t => t.assignee === state.currentRole && isOverdue(t.deadline, t.status)).length;
    }

    if (overdueCount > 0) {
        notificationArea.style.display = "block";
        notificationArea.innerHTML = `
            <div class="notification-banner">
                <div class="notification-content">
                    <span><strong>⚠️ แจ้งเตือน:</strong> มีงานที่เลยกำหนดส่งมอบทั้งหมด <strong>${overdueCount} งาน</strong> โปรดตรวจสอบและเร่งดำเนินการ!</span>
                </div>
                <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
    } else {
        notificationArea.style.display = "none";
    }
}

// --- Render Supervisor View ---
function renderSupervisorDashboard() {
    const totalCount = state.tasks.length;
    const completedCount = state.tasks.filter(t => t.status === "done").length;
    const pendingCount = totalCount - completedCount;
    const overdueCount = state.tasks.filter(t => isOverdue(t.deadline, t.status)).length;

    statTotal.textContent = totalCount;
    statCompleted.textContent = completedCount;
    statPending.textContent = pendingCount;
    statOverdue.textContent = overdueCount;

    teamWorkloadList.innerHTML = "";
    state.members.forEach(member => {
        if (member === "ไม่มีผู้รับผิดชอบ" && state.tasks.filter(t => t.assignee === member).length === 0) {
            return; // Skip showing placeholder if it has no tasks
        }
        const memberTasks = state.tasks.filter(t => t.assignee === member);
        const total = memberTasks.length;
        const completed = memberTasks.filter(t => t.status === "done").length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        const item = document.createElement("div");
        item.className = "team-member-item";
        item.innerHTML = `
            <div class="member-info">
                <div class="member-name">
                    <span class="member-avatar">${member.charAt(0)}</span>
                    <span>${member}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--text-muted); font-size: 0.8rem;">(${completed}/${total} งาน) ${percentage}%</span>
                    ${member !== "ไม่มีผู้รับผิดชอบ" ? `<button class="member-delete-btn" title="ลบพนักงานคนนี้" onclick="deleteMember('${member}')">🗑️</button>` : ''}
                </div>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        teamWorkloadList.appendChild(item);
    });

    renderDirectoryTable();
}

function renderDirectoryTable() {
    const selectedAssignee = filterAssignee.value;
    const selectedStatus = filterStatus.value;
    const searchQuery = inputSearch.value.trim().toLowerCase();

    let filteredTasks = state.tasks.filter(task => {
        const matchAssignee = selectedAssignee === "all" || task.assignee === selectedAssignee;
        const matchStatus = selectedStatus === "all" || task.status === selectedStatus;
        
        const matchText = task.title.toLowerCase().includes(searchQuery) || 
                          (task.description && task.description.toLowerCase().includes(searchQuery)) ||
                          task.assignee.toLowerCase().includes(searchQuery);

        return matchAssignee && matchStatus && matchText;
    });

    taskTableBody.innerHTML = "";
    if (filteredTasks.length === 0) {
        taskTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">ไม่พบงานตามเงื่อนไขที่ระบุ</td>
            </tr>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const isLate = isOverdue(task.deadline, task.status);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${escapeHTML(task.title)}</strong></td>
            <td><span class="member-avatar" style="display:inline-flex; vertical-align:middle; margin-right:6px;">${task.assignee.charAt(0)}</span> ${escapeHTML(task.assignee)}</td>
            <td>${formatThaiDate(task.deadline)} ${isLate ? '<span class="overdue-warning" title="เลยกำหนดส่ง!"></span>' : ''}</td>
            <td><span class="badge badge-${task.priority}">${getPriorityLabel(task.priority)}</span></td>
            <td><span class="badge badge-${task.status}">${getStatusLabel(task.status)}</span></td>
            <td>
                <button class="card-btn edit" onclick="openEditModal('${task.id}')">✏️ แก้ไข</button>
                <button class="card-btn delete" onclick="deleteTask('${task.id}')" style="margin-left: 8px;">🗑️ ลบ</button>
            </td>
        `;
        taskTableBody.appendChild(row);
    });
}

// --- Render Member Kanban View ---
function renderMemberKanbanBoard() {
    const memberName = state.currentRole;
    memberBoardTitle.textContent = `บอร์ดงานของ: ${memberName} ${state.isCloudMode ? '☁️' : ''}`;

    const memberTasks = state.tasks.filter(t => t.assignee === memberName);

    const columns = {
        todo: cardsTodo,
        in_progress: cardsInProgress,
        review: cardsReview,
        done: cardsDone
    };

    Object.values(columns).forEach(col => col.innerHTML = "");

    memberTasks.forEach(task => {
        const card = createKanbanCard(task);
        if (columns[task.status]) {
            columns[task.status].appendChild(card);
        }
    });

    Object.keys(columns).forEach(status => {
        const countBadge = document.getElementById(`count-${status}`);
        if (countBadge) {
            countBadge.textContent = memberTasks.filter(t => t.status === status).length;
        }
    });
}

// --- Create Kanban Card Element ---
function createKanbanCard(task) {
    const isLate = isOverdue(task.deadline, task.status);
    const card = document.createElement("div");
    card.className = `kanban-card ${isLate ? 'overdue-card' : ''}`;
    card.setAttribute("draggable", "true");
    card.setAttribute("data-id", task.id);
    
    if (isLate) {
        card.style.borderLeft = "4px solid var(--danger)";
    } else {
        card.style.borderLeft = `4px solid ${getPriorityColor(task.priority)}`;
    }

    card.innerHTML = `
        <div class="card-title">${escapeHTML(task.title)}</div>
        <div class="card-details">${escapeHTML(task.description || "ไม่มีรายละเอียด")}</div>
        <div class="card-meta">
            <div class="card-date ${isLate ? 'overdue-warning' : ''}">
                📅 ${formatThaiDate(task.deadline)}
            </div>
            <span class="badge badge-${task.priority}">${getPriorityLabel(task.priority)}</span>
        </div>
        
        <div class="card-actions-wrapper">
            <div class="mobile-move-buttons" style="margin-right: auto;">
                <button class="btn-move" title="ย้ายไปคอลัมน์ซ้าย" onclick="moveTaskDirection('${task.id}', -1)">◀</button>
                <button class="btn-move" title="ย้ายไปคอลัมน์ขวา" onclick="moveTaskDirection('${task.id}', 1)">▶</button>
            </div>
            <button class="card-btn edit" onclick="openEditModal('${task.id}')">✏️</button>
            <button class="card-btn delete" onclick="deleteTask('${task.id}')">🗑️</button>
        </div>
    `;

    card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", task.id);
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });

    return card;
}

// --- Drag & Drop for Kanban Columns ---
document.querySelectorAll(".kanban-cards-area").forEach(area => {
    area.addEventListener("dragover", (e) => {
        e.preventDefault();
        area.classList.add("drag-over");
    });

    area.addEventListener("dragleave", () => {
        area.classList.remove("drag-over");
    });

    area.addEventListener("drop", (e) => {
        e.preventDefault();
        area.classList.remove("drag-over");
        const taskId = e.dataTransfer.getData("text/plain");
        const targetStatus = area.getAttribute("data-status");

        if (taskId && targetStatus) {
            updateTaskStatus(taskId, targetStatus);
        }
    });
});

async function updateTaskStatus(taskId, newStatus) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        if (state.isCloudMode) {
            try {
                await fetch("/api/tasks", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(task)
                });
            } catch (err) {
                console.error("Failed to update status on Cloudflare D1", err);
            }
        }
        saveLocalFallback();
        render();
    }
}

// --- Quick move direction buttons ---
function moveTaskDirection(taskId, direction) {
    const statusOrder = ["todo", "in_progress", "review", "done"];
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        const currentIndex = statusOrder.indexOf(task.status);
        let nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < statusOrder.length) {
            updateTaskStatus(taskId, statusOrder[nextIndex]);
        }
    }
}

// --- Helper translation labels ---
function getPriorityLabel(priority) {
    const labels = { high: "ด่วนที่สุด", medium: "ด่วน", low: "ปกติ" };
    return labels[priority] || priority;
}

function getPriorityColor(priority) {
    const colors = { high: "var(--danger)", medium: "var(--warning)", low: "var(--text-muted)" };
    return colors[priority] || "transparent";
}

function getStatusLabel(status) {
    const labels = { todo: "งานใหม่", in_progress: "กำลังทำ", review: "รอตรวจ", done: "เสร็จสิ้น" };
    return labels[status] || status;
}

function formatThaiDate(dateStr) {
    if (!dateStr) return "-";
    const months = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = (parseInt(parts[0], 10) + 543) % 100;
    return `${day} ${month} ${year}`;
}

// --- Task CRUD Operations ---

// 1. Create task (Supervisor)
formCreateTask.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById("inputTitle");
    const descInput = document.getElementById("inputDesc");
    const deadlineInput = document.getElementById("inputDeadline");
    const assigneeVal = selectAssignee.value;
    const priorityVal = document.getElementById("selectPriority").value;

    if (!titleInput.value.trim() || !assigneeVal || !deadlineInput.value) {
        alert("กรุณากรอกหัวข้องาน วันกำหนดส่ง และระบุผู้รับผิดชอบ");
        return;
    }

    const newTask = {
        id: "task-" + Date.now(),
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        deadline: deadlineInput.value,
        assignee: assigneeVal,
        status: "todo",
        priority: priorityVal
    };

    state.tasks.push(newTask);

    if (state.isCloudMode) {
        try {
            await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });
        } catch (err) {
            console.error("Failed to save task to Cloudflare D1", err);
        }
    }

    saveLocalFallback();
    render();
    formCreateTask.reset();
});

// 2. Open Modal to Edit Task
function openEditModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTitle.textContent = "แก้ไขรายละเอียดงาน";
    modalTaskId.value = task.id;
    modalTaskTitle.value = task.title;
    modalTaskDesc.value = task.description || "";
    modalTaskDeadline.value = task.deadline;
    modalTaskAssignee.value = task.assignee;
    modalTaskPriority.value = task.priority;
    modalTaskStatus.value = task.status;

    btnModalDelete.style.display = "inline-block";
    modalElement.classList.add("active");
}

// 3. Open Modal to Add Task (Kanban Column)
function openAddModalFromColumn(status) {
    modalTitle.textContent = `เพิ่มงานใหม่ลงช่อง (${getStatusLabel(status)})`;
    modalTaskId.value = "";
    modalTaskTitle.value = "";
    modalTaskDesc.value = "";
    modalTaskDeadline.value = getOffsetDateString(2);
    modalTaskAssignee.value = state.currentRole;
    modalTaskPriority.value = "medium";
    modalTaskStatus.value = status;

    btnModalDelete.style.display = "none";
    modalElement.classList.add("active");
}

// 4. Save Modal Changes (Edit or New Task)
formModal.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = modalTaskId.value;
    const title = modalTaskTitle.value.trim();
    const description = modalTaskDesc.value.trim();
    const deadline = modalTaskDeadline.value;
    const assignee = modalTaskAssignee.value;
    const priority = modalTaskPriority.value;
    const status = modalTaskStatus.value;

    if (!title || !assignee || !deadline) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (id) {
        // Edit mode
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            const updatedTask = { ...state.tasks[index], title, description, deadline, assignee, priority, status };
            state.tasks[index] = updatedTask;

            if (state.isCloudMode) {
                try {
                    await fetch("/api/tasks", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updatedTask)
                    });
                } catch (err) {
                    console.error("Failed to update task in Cloudflare D1", err);
                }
            }
        }
    } else {
        // Add Mode from Column
        const newTask = {
            id: "task-" + Date.now(),
            title,
            description,
            deadline,
            assignee,
            status,
            priority
        };
        state.tasks.push(newTask);

        if (state.isCloudMode) {
            try {
                await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newTask)
                });
            } catch (err) {
                console.error("Failed to save task to Cloudflare D1", err);
            }
        }
    }

    saveLocalFallback();
    closeModal();
    render();
});

// Close Modal
function closeModal() {
    modalElement.classList.remove("active");
}

// 5. Delete Task
async function deleteTask(taskId) {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้อย่างถาวร?")) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);

        if (state.isCloudMode) {
            try {
                await fetch(`/api/tasks?id=${taskId}`, {
                    method: "DELETE"
                });
            } catch (err) {
                console.error("Failed to delete task from Cloudflare D1", err);
            }
        }

        saveLocalFallback();
        closeModal();
        render();
    }
}

// Connect delete button inside Modal
btnModalDelete.addEventListener("click", () => {
    const id = modalTaskId.value;
    if (id) {
        deleteTask(id);
    }
});

// --- Team Members List Management ---

// Add new member
btnAddMember.addEventListener("click", async () => {
    const name = inputNewMember.value.trim();
    if (!name) return;
    if (state.members.includes(name) || name === "supervisor") {
        alert("ชื่อพนักงานซ้ำซ้อนหรือระบบไม่รองรับ");
        return;
    }
    
    state.members.push(name);

    if (state.isCloudMode) {
        try {
            await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
        } catch (err) {
            console.error("Failed to add member to Cloudflare D1", err);
        }
    }

    saveLocalFallback();
    populateRoleDropdowns();
    renderSupervisorDashboard();
    inputNewMember.value = "";
});

// Delete member
async function deleteMember(memberName) {
    const memberTasks = state.tasks.filter(t => t.assignee === memberName);
    if (memberTasks.length > 0) {
        if (!confirm(`พนักงานคนนี้มีงานมอบหมายอยู่ ${memberTasks.length} งาน หากลบพนักงาน งานจะถูกย้ายไปที่ "ไม่มีผู้รับผิดชอบ" คุณยินยอมหรือไม่?`)) {
            return;
        }
        
        state.tasks.forEach(t => {
            if (t.assignee === memberName) {
                t.assignee = "ไม่มีผู้รับผิดชอบ";
            }
        });
    }

    state.members = state.members.filter(m => m !== memberName);
    
    if (!state.members.includes("ไม่มีผู้รับผิดชอบ")) {
        state.members.push("ไม่มีผู้รับผิดชอบ");
    }

    if (state.isCloudMode) {
        try {
            await fetch(`/api/members?name=${encodeURIComponent(memberName)}`, {
                method: "DELETE"
            });
        } catch (err) {
            console.error("Failed to delete member from Cloudflare D1", err);
        }
    }

    saveLocalFallback();
    populateRoleDropdowns();
    
    if (state.currentRole === memberName) {
        state.currentRole = "supervisor";
        roleSelect.value = "supervisor";
        localStorage.setItem("team_todo_current_role", "supervisor");
    }

    render();
}

// --- Event Listeners ---
roleSelect.addEventListener("change", (e) => {
    state.currentRole = e.target.value;
    localStorage.setItem("team_todo_current_role", state.currentRole);
    render();
});

themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("team_todo_theme", state.theme);
    document.documentElement.setAttribute("data-theme", state.theme);
    themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
});

filterAssignee.addEventListener("change", renderDirectoryTable);
filterStatus.addEventListener("change", renderDirectoryTable);
inputSearch.addEventListener("input", renderDirectoryTable);

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Initialization ---
initData();
