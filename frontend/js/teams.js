(function initTeamsModule() {
  const { ENDPOINTS } = window.TeamFlow.config;
  const { apiCall } = window.TeamFlow.api;
  const { qs, escapeHtml, showToast, setUserHeader, highlightNav } = window.TeamFlow.utils;

  const state = {
    mode: null,
    teams: [],
    approvedUsers: [],
    modal: {
      onSubmit: null,
    },
  };

  function roleByMode(mode) {
    return mode === "manager" ? ["manager"] : ["team-lead"];
  }

  function memberId(member) {
    if (!member) return "";
    return typeof member === "object" ? String(member._id) : String(member);
  }

  function userLabel(user) {
    return `${user.name} (${user.email})`;
  }

  function sortByName(items) {
    return [...items].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function managerOnly() {
    return state.mode === "manager";
  }

  function renderCreateButton() {
    const button = qs("#open-create-team-modal");
    if (!button) return;
    button.style.display = managerOnly() ? "inline-flex" : "none";
  }

  function rowActions(team) {
    const actions = [];
    actions.push(`<button class="btn btn-ghost" data-action="view-members" data-id="${team._id}">View Members</button>`);
    if (managerOnly()) {
      actions.push(`<button class="btn btn-ghost" data-action="rename" data-id="${team._id}">Rename</button>`);
      actions.push(`<button class="btn btn-ghost" data-action="change-lead" data-id="${team._id}">Change Lead</button>`);
      actions.push(`<button class="btn btn-primary" data-action="add-member" data-id="${team._id}">Add Member</button>`);
      actions.push(`<button class="btn btn-ghost" data-action="remove-member" data-id="${team._id}">Remove Member</button>`);
      actions.push(`<button class="btn btn-danger" data-action="delete" data-id="${team._id}">Delete</button>`);
      return actions.join("");
    }
    actions.push(`<button class="btn btn-primary" data-action="add-member" data-id="${team._id}">Add Member</button>`);
    actions.push(`<button class="btn btn-ghost" data-action="remove-member" data-id="${team._id}">Remove Member</button>`);
    return actions.join("");
  }

  function renderTeams() {
    const body = qs("#teams-table-body");
    if (!body) return;

    if (!state.teams.length) {
      body.innerHTML = "<tr><td colspan=\"5\" class=\"empty-state\">No teams found.</td></tr>";
      return;
    }

    body.innerHTML = state.teams
      .map((team) => {
        const leadName = team.teamLead && team.teamLead.name ? team.teamLead.name : "-";
        const memberCount = (team.teamMembers || []).length;

        return `
          <tr>
            <td>${escapeHtml(team.name)}</td>
            <td>${escapeHtml(leadName)}</td>
            <td><span class="team-members-chip">${memberCount}</span></td>
            <td><span class="team-id" title="${escapeHtml(team._id)}">${escapeHtml(team._id)}</span></td>
            <td class="actions-cell">${rowActions(team)}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadData() {
    const calls = [apiCall(ENDPOINTS.teams.getAll)];
    calls.push(apiCall(`${ENDPOINTS.users.getAll}?status=approved`));

    const [teamsRes, usersRes] = await Promise.all(calls);
    state.teams = teamsRes.data || [];
    state.approvedUsers = sortByName(usersRes ? usersRes.data || [] : []);

    renderTeams();
  }

  function findTeam(id) {
    return state.teams.find((team) => team._id === id);
  }

  function ensureModal() {
    let modal = qs("#teams-action-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "teams-action-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3 id="teams-modal-title">Action</h3>
          <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">x</button>
        </div>
        <form id="teams-modal-form">
          <div class="modal-body" id="teams-modal-body"></div>
          <div class="modal-foot">
            <button class="btn btn-ghost" type="button" data-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="teams-modal-submit" type="submit">Save</button>
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
    const modal = qs("#teams-action-modal");
    if (!modal) return;
    modal.classList.remove("open");
    state.modal.onSubmit = null;
  }

  function openModal(config) {
    const modal = ensureModal();
    const titleNode = qs("#teams-modal-title");
    const bodyNode = qs("#teams-modal-body");
    const submitNode = qs("#teams-modal-submit");
    const formNode = qs("#teams-modal-form");

    if (!titleNode || !bodyNode || !submitNode || !formNode) return;

    titleNode.textContent = config.title || "Action";
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

  function optionsMarkup(users) {
    return users
      .map((user) => `<option value="${user._id}">${escapeHtml(userLabel(user))}</option>`)
      .join("");
  }

  async function openCreateTeamModal() {
    const leads = state.approvedUsers.filter((user) => user.role !== "manager");
    if (!leads.length) {
      showToast("No approved users available for team lead.", "info");
      return;
    }

    openModal({
      title: "Create Team",
      submitText: "Create Team",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Team Name
            <input type="text" name="name" required minlength="3" />
          </label>
          <label class="form-control">
            Team Lead
            <select name="teamLead" required>${optionsMarkup(leads)}</select>
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const name = formNode.name.value.trim();
        const teamLead = formNode.teamLead.value;
        if (!name || !teamLead) return;

        try {
          await apiCall(ENDPOINTS.teams.create, {
            method: "POST",
            body: { name, teamLead },
          });
          closeModal();
          await loadData();
          showToast("Team created", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openRenameModal(team) {
    openModal({
      title: "Rename Team",
      submitText: "Save Name",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Team Name
            <input type="text" name="name" required minlength="3" value="${escapeHtml(team.name)}" />
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const name = formNode.name.value.trim();
        if (!name) return;

        try {
          await apiCall(ENDPOINTS.teams.update(team._id), {
            method: "PATCH",
            body: { name },
          });
          closeModal();
          await loadData();
          showToast("Team renamed", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openChangeLeadModal(team) {
    const members = team.teamMembers || [];
    const existingIds = members.map(memberId);
    const currentLeadId = memberId(team.teamLead);

    const candidates = state.approvedUsers.filter((user) => {
      if (user.role === "manager") return false;
      if (String(user._id) === currentLeadId) return false;
      return true;
    });

    if (!candidates.length) {
      showToast("No available lead candidates.", "info");
      return;
    }

    openModal({
      title: "Change Team Lead",
      submitText: "Change Lead",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            New Team Lead
            <select name="teamLead" required>${optionsMarkup(candidates)}</select>
          </label>
          <p class="field-help">Selected lead will be added automatically to team members.</p>
          <p class="field-help">Current team members: ${existingIds.length}</p>
        </div>
      `,
      onSubmit: async (formNode) => {
        const teamLead = formNode.teamLead.value;
        if (!teamLead) return;

        try {
          await apiCall(ENDPOINTS.teams.changeLead(team._id), {
            method: "PATCH",
            body: { teamLead },
          });
          closeModal();
          await loadData();
          showToast("Team lead updated", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openAddMemberModal(team) {
    const existingIds = new Set((team.teamMembers || []).map(memberId));
    const candidates = state.approvedUsers.filter((user) => {
      if (user.role === "manager") return false;
      return !existingIds.has(String(user._id));
    });

    if (!candidates.length) {
      showToast("No available members to add.", "info");
      return;
    }

    openModal({
      title: "Add Member",
      submitText: "Add Member",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Team Member
            <select name="teamMember" required>${optionsMarkup(candidates)}</select>
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const teamMember = formNode.teamMember.value;
        if (!teamMember) return;

        try {
          await apiCall(ENDPOINTS.teams.addMember(team._id), {
            method: "PATCH",
            body: { teamMember },
          });
          closeModal();
          await loadData();
          showToast("Member added", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openRemoveMemberModal(team) {
    const leadId = memberId(team.teamLead);
    const removable = (team.teamMembers || []).filter((member) => memberId(member) !== leadId);
    if (!removable.length) {
      showToast("No removable members.", "info");
      return;
    }

    openModal({
      title: "Remove Member",
      submitText: "Remove Member",
      danger: true,
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Team Member
            <select name="removeMember" required>
              ${removable
                .map((member) => `<option value="${member._id}">${escapeHtml(userLabel(member))}</option>`)
                .join("")}
            </select>
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const removeMember = formNode.removeMember.value;
        if (!removeMember) return;

        try {
          await apiCall(ENDPOINTS.teams.removeMember(team._id), {
            method: "PATCH",
            body: { removeMember },
          });
          closeModal();
          await loadData();
          showToast("Member removed", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openDeleteModal(team) {
    openModal({
      title: "Delete Team",
      submitText: "Delete",
      danger: true,
      body: `
        <p>Delete <strong>${escapeHtml(team.name)}</strong>? This action deactivates the team.</p>
      `,
      onSubmit: async () => {
        try {
          await apiCall(ENDPOINTS.teams.delete(team._id), { method: "DELETE" });
          closeModal();
          await loadData();
          showToast("Team deleted", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openViewMembersModal(team) {
    const leadId = memberId(team.teamLead);
    const members = (team.teamMembers || []).map((member) => {
      const isLead = memberId(member) === leadId;
      return `
        <li class="team-member-item">
          <span><strong>${escapeHtml(member.name || "Member")}</strong> - ${escapeHtml(member.email || "-")}</span>
          <span class="badge ${isLead ? "role-team-lead" : "role-developer"}">${isLead ? "Lead" : (member.role || "member")}</span>
        </li>
      `;
    });

    openModal({
      title: `Members - ${team.name}`,
      submitText: "Close",
      body: `
        <div class="modal-grid">
          <p class="muted-note">Team lead and current team members list.</p>
          <ul class="account-list">
            ${members.length ? members.join("") : "<li>No members found.</li>"}
          </ul>
        </div>
      `,
      onSubmit: async () => {
        closeModal();
      },
    });
  }

  async function handleAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    const team = findTeam(id);
    if (!team) return;

    if (action === "rename") {
      await openRenameModal(team);
      return;
    }

    if (action === "view-members") {
      await openViewMembersModal(team);
      return;
    }

    if (action === "change-lead") {
      await openChangeLeadModal(team);
      return;
    }

    if (action === "add-member") {
      await openAddMemberModal(team);
      return;
    }

    if (action === "remove-member") {
      await openRemoveMemberModal(team);
      return;
    }

    if (action === "delete") {
      await openDeleteModal(team);
    }
  }

  function bindEvents() {
    const body = qs("#teams-table-body");
    if (body) body.addEventListener("click", handleAction);

    const createBtn = qs("#open-create-team-modal");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        openCreateTeamModal();
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

    const auth = window.TeamFlow.auth.requireAuth(roleByMode(mode));
    if (!auth) return;

    setUserHeader(auth.user);
    highlightNav();
    renderCreateButton();
    bindEvents();

    window.TeamFlow.socket.connectSocket();
    await window.TeamFlow.notifications.initGlobalNotifications();

    try {
      await loadData();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.teams = {
    init,
    loadData,
  };
})();
