(function initTasksModule() {
  const { ENDPOINTS } = window.TeamFlow.config;
  const { apiCall } = window.TeamFlow.api;
  const {
    qs,
    escapeHtml,
    getPriorityBadge,
    getStatusBadge,
    showToast,
    setUserHeader,
    highlightNav,
  } = window.TeamFlow.utils;

  const state = {
    mode: null,
    tasks: [],
    teams: [],
    modal: {
      onSubmit: null,
    },
  };

  function getRolesByMode(mode) {
    if (mode === "manager") return ["manager"];
    if (mode === "team-lead") return ["team-lead"];
    return ["developer"];
  }

  function statusAdvance(status) {
    if (status === "todo") return "in-progress";
    if (status === "in-progress") return "done";
    return null;
  }

  function teamIdValue(task) {
    return typeof task.teamId === "object" ? task.teamId?._id : task.teamId;
  }

  function teamNameValue(task) {
    return typeof task.teamId === "object" ? task.teamId?.name : "-";
  }

  function listAssigneesForTeam(teamId) {
    const team = state.teams.find((item) => item._id === teamId);
    if (!team) return [];
    return (team.teamMembers || []).filter((member) => member.role !== "manager");
  }

  function taskTypeLabel(task) {
    return task.parentTaskId ? "Subtask" : "Parent";
  }

  function applyFilters(items) {
    const search = (qs("#task-search")?.value || "").toLowerCase().trim();
    const status = qs("#task-status-filter")?.value || "";
    const priority = qs("#task-priority-filter")?.value || "";
    const team = qs("#task-team-filter")?.value || "";

    return items.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const teamId = teamIdValue(task);

      if (search && !title.includes(search)) return false;
      if (status && task.status !== status) return false;
      if (priority && task.priority !== priority) return false;
      if (team && teamId !== team) return false;
      return true;
    });
  }

  function rowHtml(task) {
    const teamName = teamNameValue(task);
    const assignedName = task.assignedTo && typeof task.assignedTo === "object"
      ? task.assignedTo.name
      : "Unassigned";
    const createdByName = task.createdBy && typeof task.createdBy === "object"
      ? task.createdBy.name
      : "-";

    const canEdit = state.mode === "manager" || state.mode === "team-lead";
    const canDelete = canEdit;
    const canProgress = (state.mode === "developer" || state.mode === "team-lead") && task.status !== "done";

    const actions = [];
    actions.push(`<button class="btn btn-ghost" data-action="view" data-id="${task._id}">View</button>`);
    if (canEdit) actions.push(`<button class="btn btn-ghost" data-action="edit" data-id="${task._id}">Edit</button>`);
    if (canDelete) actions.push(`<button class="btn btn-danger" data-action="delete" data-id="${task._id}">Delete</button>`);
    if (canProgress) actions.push(`<button class="btn btn-primary" data-action="progress" data-id="${task._id}">Next Status</button>`);

    return `
      <tr>
        <td>
          <div class="task-title-main">${escapeHtml(task.title)}</div>
          <div class="task-title-meta">${escapeHtml(task.description || "No description")}</div>
        </td>
        <td>${escapeHtml(teamName || "-")}</td>
        <td>${getPriorityBadge(task.priority)}</td>
        <td>${getStatusBadge(task.status)}</td>
        <td>${escapeHtml(createdByName)}</td>
        <td>${escapeHtml(assignedName)}</td>
        <td><span class="task-type-pill">${taskTypeLabel(task)}</span></td>
        <td class="actions-cell">${actions.join("")}</td>
      </tr>
    `;
  }

  function renderTasks() {
    const body = qs("#tasks-table-body");
    if (!body) return;

    const filtered = applyFilters(state.tasks);
    if (!filtered.length) {
      body.innerHTML = "<tr><td colspan=\"8\" class=\"empty-state\">No tasks found.</td></tr>";
      return;
    }

    body.innerHTML = filtered.map(rowHtml).join("");
  }

  function populateTaskFilters() {
    const teamFilter = qs("#task-team-filter");
    if (!teamFilter) return;

    const options = state.teams
      .map((team) => `<option value="${team._id}">${escapeHtml(team.name)}</option>`)
      .join("");

    teamFilter.innerHTML = `<option value="">All Teams</option>${options}`;
  }

  function ensureModal() {
    let modal = qs("#tasks-action-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "tasks-action-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3 id="tasks-modal-title">Task Action</h3>
          <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">x</button>
        </div>
        <form id="tasks-modal-form">
          <div class="modal-body" id="tasks-modal-body"></div>
          <div class="modal-foot">
            <button class="btn btn-ghost" type="button" data-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="tasks-modal-submit" type="submit">Save</button>
          </div>
        </form>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-dismiss=modal]")) {
        closeModal();
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  function closeModal() {
    const modal = qs("#tasks-action-modal");
    if (!modal) return;
    modal.classList.remove("open");
    state.modal.onSubmit = null;
  }

  function openModal(config) {
    const modal = ensureModal();
    const titleNode = qs("#tasks-modal-title");
    const bodyNode = qs("#tasks-modal-body");
    const submitNode = qs("#tasks-modal-submit");
    const formNode = qs("#tasks-modal-form");

    if (!titleNode || !bodyNode || !submitNode || !formNode) return;

    titleNode.textContent = config.title || "Task Action";
    submitNode.textContent = config.submitText || "Save";
    submitNode.className = config.danger ? "btn btn-danger" : "btn btn-primary";
    bodyNode.innerHTML = config.body || "";

    state.modal.onSubmit = config.onSubmit || null;
    formNode.onsubmit = async (event) => {
      event.preventDefault();
      if (!state.modal.onSubmit) return;
      await state.modal.onSubmit(formNode);
    };

    modal.classList.add("open");
  }

  function teamOptionsMarkup() {
    return state.teams
      .map((team) => `<option value="${team._id}">${escapeHtml(team.name)}</option>`)
      .join("");
  }

  function memberOptionsMarkup(members) {
    return members
      .map((member) => `<option value="${member._id}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`)
      .join("");
  }

  function parentTaskOptionsMarkup(teamId) {
    const tasks = state.tasks.filter((task) => teamIdValue(task) === teamId && !task.parentTaskId);
    return tasks
      .map((task) => `<option value="${task._id}">${escapeHtml(task.title)}</option>`)
      .join("");
  }

  function taskDetailsHtml(task) {
    const createdByName = task.createdBy && typeof task.createdBy === "object" ? task.createdBy.name : "-";
    const assignedName = task.assignedTo && typeof task.assignedTo === "object" ? task.assignedTo.name : "Unassigned";
    const parentValue = task.parentTaskId
      ? typeof task.parentTaskId === "object"
        ? task.parentTaskId._id || task.parentTaskId.title || "Yes"
        : String(task.parentTaskId)
      : "None";

    return `
      <div class="modal-grid">
        <label class="form-control"><span>Title</span><input type="text" readonly value="${escapeHtml(task.title)}" /></label>
        <label class="form-control"><span>Priority</span><input type="text" readonly value="${escapeHtml(task.priority)}" /></label>
        <label class="form-control"><span>Status</span><input type="text" readonly value="${escapeHtml(task.status)}" /></label>
        <label class="form-control"><span>Team</span><input type="text" readonly value="${escapeHtml(teamNameValue(task) || "-")}" /></label>
        <label class="form-control"><span>Created By</span><input type="text" readonly value="${escapeHtml(createdByName)}" /></label>
        <label class="form-control"><span>Assigned To</span><input type="text" readonly value="${escapeHtml(assignedName)}" /></label>
        <label class="form-control span-full"><span>Parent Task</span><input type="text" readonly value="${escapeHtml(parentValue)}" /></label>
        <label class="form-control span-full"><span>Description</span><textarea readonly>${escapeHtml(task.description || "-")}</textarea></label>
      </div>
    `;
  }

  async function openCreateTaskModal() {
    if (state.mode === "manager") {
      if (!state.teams.length) {
        showToast("No teams available.", "info");
        return;
      }

      openModal({
        title: "Create Task",
        submitText: "Create Task",
        body: `
          <div class="modal-grid">
            <p class="accent-note">Backend currently requires <code>assignedTo</code> during task creation.</p>
            <label class="form-control">
              Title
              <input type="text" name="title" required minlength="3" />
            </label>
            <label class="form-control">
              Team
              <select name="teamId" id="task-create-team" required>${teamOptionsMarkup()}</select>
            </label>
            <label class="form-control">
              Assignee
              <select name="assignedTo" id="task-create-assignee" required></select>
            </label>
            <label class="form-control">
              Priority
              <select name="priority" required>
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="form-control span-full">
              Description
              <textarea name="description"></textarea>
            </label>
          </div>
        `,
        onSubmit: async (formNode) => {
          const payload = {
            title: formNode.title.value.trim(),
            description: formNode.description.value.trim(),
            priority: formNode.priority.value,
            teamId: formNode.teamId.value,
            assignedTo: formNode.assignedTo.value,
          };

          try {
            await apiCall(ENDPOINTS.tasks.create, {
              method: "POST",
              body: payload,
            });
            closeModal();
            await loadData();
            showToast("Task created", "success");
          } catch (error) {
            showToast(error.message, "error");
          }
        },
      });

      const teamSelect = qs("#task-create-team");
      const assigneeSelect = qs("#task-create-assignee");
      const syncAssignees = () => {
        const members = listAssigneesForTeam(teamSelect.value);
        assigneeSelect.innerHTML = memberOptionsMarkup(members);
      };
      teamSelect.addEventListener("change", syncAssignees);
      syncAssignees();
      return;
    }

    if (state.mode === "team-lead") {
      if (!state.teams.length) {
        showToast("No team available for subtask creation.", "info");
        return;
      }

      openModal({
        title: "Create Subtask",
        submitText: "Create Subtask",
        body: `
          <div class="modal-grid">
            <label class="form-control">
              Team
              <select name="teamId" id="subtask-create-team" required>${teamOptionsMarkup()}</select>
            </label>
            <label class="form-control">
              Parent Task
              <select name="parentTaskId" id="subtask-create-parent" required></select>
            </label>
            <label class="form-control">
              Assign To
              <select name="assignedTo" id="subtask-create-assignee" required></select>
            </label>
            <label class="form-control">
              Priority
              <select name="priority" required>
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="form-control span-full">
              Title
              <input type="text" name="title" required minlength="3" />
            </label>
            <label class="form-control span-full">
              Description
              <textarea name="description"></textarea>
            </label>
          </div>
        `,
        onSubmit: async (formNode) => {
          const payload = {
            title: formNode.title.value.trim(),
            description: formNode.description.value.trim(),
            priority: formNode.priority.value,
            teamId: formNode.teamId.value,
            assignedTo: formNode.assignedTo.value,
            parentTaskId: formNode.parentTaskId.value,
          };

          try {
            await apiCall(ENDPOINTS.tasks.createSubTask, {
              method: "POST",
              body: payload,
            });
            closeModal();
            await loadData();
            showToast("Subtask created", "success");
          } catch (error) {
            showToast(error.message, "error");
          }
        },
      });

      const teamSelect = qs("#subtask-create-team");
      const parentSelect = qs("#subtask-create-parent");
      const assigneeSelect = qs("#subtask-create-assignee");
      const syncSubtaskFields = () => {
        const teamId = teamSelect.value;
        parentSelect.innerHTML = parentTaskOptionsMarkup(teamId);
        assigneeSelect.innerHTML = memberOptionsMarkup(listAssigneesForTeam(teamId));
      };
      teamSelect.addEventListener("change", syncSubtaskFields);
      syncSubtaskFields();
    }
  }

  async function openViewModal(task) {
    openModal({
      title: "Task Details",
      submitText: "Close",
      body: taskDetailsHtml(task),
      onSubmit: async () => {
        closeModal();
      },
    });
  }

  async function openEditModal(task) {
    openModal({
      title: "Edit Task",
      submitText: "Save Changes",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Title
            <input type="text" name="title" required minlength="3" value="${escapeHtml(task.title)}" />
          </label>
          <label class="form-control">
            Priority
            <select name="priority" required>
              <option value="low" ${task.priority === "low" ? "selected" : ""}>Low</option>
              <option value="medium" ${task.priority === "medium" ? "selected" : ""}>Medium</option>
              <option value="high" ${task.priority === "high" ? "selected" : ""}>High</option>
            </select>
          </label>
          <label class="form-control span-full">
            Description
            <textarea name="description">${escapeHtml(task.description || "")}</textarea>
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const payload = {
          title: formNode.title.value.trim(),
          description: formNode.description.value.trim(),
          priority: formNode.priority.value,
        };

        try {
          await apiCall(ENDPOINTS.tasks.update(task._id), {
            method: "PATCH",
            body: payload,
          });
          closeModal();
          await loadData();
          showToast("Task updated", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openDeleteModal(task) {
    openModal({
      title: "Delete Task",
      submitText: "Delete",
      danger: true,
      body: `<p>Delete <strong>${escapeHtml(task.title)}</strong>? This action deactivates the task.</p>`,
      onSubmit: async () => {
        try {
          await apiCall(ENDPOINTS.tasks.delete(task._id), { method: "DELETE" });
          closeModal();
          await loadData();
          showToast("Task deleted", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function handleRowAction(event) {
    const action = event.target.getAttribute("data-action");
    if (!action) return;

    const id = event.target.getAttribute("data-id");
    const task = state.tasks.find((item) => item._id === id);
    if (!task) return;

    if (action === "view") {
      await openViewModal(task);
      return;
    }

    if (action === "edit") {
      await openEditModal(task);
      return;
    }

    if (action === "delete") {
      await openDeleteModal(task);
      return;
    }

    if (action === "progress") {
      const nextStatus = statusAdvance(task.status);
      if (!nextStatus) {
        showToast("Task already done", "info");
        return;
      }

      try {
        await apiCall(ENDPOINTS.tasks.updateStatus(id), {
          method: "PATCH",
          body: { status: nextStatus },
        });

        await loadData();
        showToast(`Task moved to ${nextStatus}`, "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  }

  async function loadData() {
    const calls = [apiCall(ENDPOINTS.tasks.getAll)];
    if (state.mode !== "developer") calls.push(apiCall(ENDPOINTS.teams.getAll));

    const [tasksRes, teamsRes] = await Promise.all(calls);
    state.tasks = tasksRes.data || [];
    state.teams = teamsRes ? teamsRes.data || [] : [];

    populateTaskFilters();
    renderTasks();
  }

  function bindEvents() {
    ["#task-search", "#task-status-filter", "#task-priority-filter", "#task-team-filter"].forEach((selector) => {
      const node = qs(selector);
      if (!node) return;
      node.addEventListener("input", renderTasks);
      node.addEventListener("change", renderTasks);
    });

    const tableBody = qs("#tasks-table-body");
    if (tableBody) tableBody.addEventListener("click", handleRowAction);

    const createBtn = qs("#open-create-task-modal");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        openCreateTaskModal();
      });
    }

    const logoutBtn = qs("[data-action=logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        window.TeamFlow.auth.logout();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  async function init(mode) {
    state.mode = mode;

    const auth = window.TeamFlow.auth.requireAuth(getRolesByMode(mode));
    if (!auth) return;

    setUserHeader(auth.user);
    highlightNav();
    bindEvents();

    window.TeamFlow.socket.connectSocket();
    await window.TeamFlow.notifications.initGlobalNotifications();

    window.TeamFlow.socket.on("taskCreated", async () => {
      if (state.mode !== "team-lead") return;
      try {
        await loadData();
      } catch (error) {
        // Ignore transient realtime failures.
      }
    });

    window.TeamFlow.socket.on("taskAssigned", async () => {
      if (state.mode !== "developer") return;
      try {
        await loadData();
      } catch (error) {
        // Ignore transient realtime failures.
      }
    });

    window.TeamFlow.socket.on("taskCompleted", async () => {
      if (state.mode !== "manager" && state.mode !== "team-lead") return;
      try {
        await loadData();
      } catch (error) {
        // Ignore transient realtime failures.
      }
    });

    try {
      await loadData();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.tasks = {
    init,
    loadData,
  };
})();
