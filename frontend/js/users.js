(function initUsersModule() {
  const { ENDPOINTS } = window.TeamFlow.config;
  const { apiCall, apiUpload } = window.TeamFlow.api;
  const {
    qs,
    escapeHtml,
    getRoleBadge,
    showToast,
    setUserHeader,
    highlightNav,
    resolveProfileImageSrc,
  } = window.TeamFlow.utils;

  const state = {
    users: [],
    modal: {
      onSubmit: null,
    },
  };

  const roleOrder = ["manager", "team-lead", "developer"];

  function roleRank(role) {
    const index = roleOrder.indexOf(role);
    return index === -1 ? 99 : index;
  }

  function userStatusMeta(status) {
    const value = (status || "").toLowerCase();
    if (value === "pending") return { label: "Pending", cls: "pending" };
    if (value === "approved") return { label: "Approved", cls: "approved" };
    if (value === "rejected") return { label: "Rejected", cls: "rejected" };
    return { label: status || "-", cls: "unknown" };
  }

  function rowHtml(user) {
    const meta = userStatusMeta(user.status);
    return `
      <tr class="user-row user-row-${meta.cls}">
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${getRoleBadge(user.role)}</td>
        <td><span class="user-status-badge user-status-${meta.cls}">${escapeHtml(meta.label)}</span></td>
        <td class="actions-cell">
          <button class="btn btn-ghost" data-action="approve" data-id="${user._id}">Approve</button>
          <button class="btn btn-ghost" data-action="reject" data-id="${user._id}">Reject</button>
          <button class="btn btn-primary" data-action="role" data-id="${user._id}">Role</button>
          <button class="btn btn-danger" data-action="delete" data-id="${user._id}">Delete</button>
        </td>
      </tr>
    `;
  }

  function renderUsers() {
    const body = qs("#users-table-body");
    if (!body) return;

    const status = qs("#user-status-filter")?.value || "";
    const rows = status ? state.users.filter((item) => item.status === status) : state.users;

    rows.sort((a, b) => {
      const roleDelta = roleRank(a.role) - roleRank(b.role);
      if (roleDelta !== 0) return roleDelta;
      return String(a.name).localeCompare(String(b.name));
    });

    if (!rows.length) {
      body.innerHTML = "<tr><td colspan=\"5\" class=\"empty-state\">No users found.</td></tr>";
      return;
    }

    body.innerHTML = rows.map(rowHtml).join("");
  }

  async function loadUsers() {
    const status = qs("#user-status-filter")?.value || "";
    const endpoint = status ? `${ENDPOINTS.users.getAll}?status=${encodeURIComponent(status)}` : ENDPOINTS.users.getAll;
    const res = await apiCall(endpoint);
    state.users = res.data || [];
    renderUsers();
  }

  function ensureModal() {
    let modal = qs("#users-action-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "users-action-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3 id="users-modal-title">User Action</h3>
          <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">x</button>
        </div>
        <form id="users-modal-form">
          <div class="modal-body" id="users-modal-body"></div>
          <div class="modal-foot">
            <button class="btn btn-ghost" type="button" data-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="users-modal-submit" type="submit">Save</button>
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
    const modal = qs("#users-action-modal");
    if (!modal) return;
    modal.classList.remove("open");
    state.modal.onSubmit = null;
  }

  function openModal(config) {
    const modal = ensureModal();
    const titleNode = qs("#users-modal-title");
    const bodyNode = qs("#users-modal-body");
    const submitNode = qs("#users-modal-submit");
    const formNode = qs("#users-modal-form");

    if (!titleNode || !bodyNode || !submitNode || !formNode) return;

    titleNode.textContent = config.title || "User Action";
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

  function roleOptions(selectedRole) {
    return roleOrder
      .map((role) => `<option value="${role}" ${selectedRole === role ? "selected" : ""}>${role}</option>`)
      .join("");
  }

  async function openRoleModal(user) {
    openModal({
      title: `Change Role - ${user.name}`,
      submitText: "Update Role",
      body: `
        <div class="modal-grid">
          <label class="form-control">
            Role
            <select name="role" required>${roleOptions(user.role)}</select>
          </label>
        </div>
      `,
      onSubmit: async (formNode) => {
        const role = formNode.role.value;
        if (!role) return;

        try {
          await apiCall(ENDPOINTS.users.update(user._id), {
            method: "PATCH",
            body: { role },
          });
          closeModal();
          await loadUsers();
          showToast("User role updated", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function openDeleteModal(user) {
    openModal({
      title: `Delete User - ${user.name}`,
      submitText: "Delete User",
      danger: true,
      body: `<p>Delete <strong>${escapeHtml(user.name)}</strong> account?</p>`,
      onSubmit: async () => {
        try {
          await apiCall(ENDPOINTS.users.delete(user._id), { method: "DELETE" });
          closeModal();
          await loadUsers();
          showToast("User deleted", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      },
    });
  }

  async function handleUserAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    const user = state.users.find((item) => item._id === id);
    if (!user) return;

    try {
      if (action === "approve") {
        await apiCall(ENDPOINTS.users.update(id), {
          method: "PATCH",
          body: { status: "approved" },
        });
        await loadUsers();
        showToast("User approved", "success");
        return;
      }

      if (action === "reject") {
        await apiCall(ENDPOINTS.users.update(id), {
          method: "PATCH",
          body: { status: "rejected" },
        });
        await loadUsers();
        showToast("User rejected", "success");
        return;
      }

      if (action === "role") {
        await openRoleModal(user);
        return;
      }

      if (action === "delete") {
        await openDeleteModal(user);
      }
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function bindUsersPageEvents() {
    const body = qs("#users-table-body");
    if (body) body.addEventListener("click", handleUserAction);

    const filter = qs("#user-status-filter");
    if (filter) {
      filter.addEventListener("change", () => {
        loadUsers().catch((error) => showToast(error.message, "error"));
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

  async function initUsersPage() {
    const auth = window.TeamFlow.auth.requireAuth(["manager"]);
    if (!auth) return;

    setUserHeader(auth.user);
    highlightNav();
    bindUsersPageEvents();

    window.TeamFlow.socket.connectSocket();
    await window.TeamFlow.notifications.initGlobalNotifications();

    try {
      await loadUsers();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function normalizeUserForStorage(user) {
    if (!user) return null;
    return {
      ...user,
      profileImg: user.profileImg || "",
    };
  }

  async function loadProfile() {
    const res = await apiCall(ENDPOINTS.users.profile);
    const user = normalizeUserForStorage(res.data);

    const name = qs("#profile-name");
    const email = qs("#profile-email");
    const role = qs("#profile-role");
    const status = qs("#profile-status");
    const team = qs("#profile-team");
    const preview = qs("#profile-preview");

    if (name) name.value = user.name || "";
    if (email) email.value = user.email || "";
    if (role) role.textContent = user.role || "-";
    if (status) status.textContent = user.status || "-";
    if (team) team.textContent = user.teamId || "Not assigned";
    if (preview) preview.src = resolveProfileImageSrc(user.profileImg);

    window.TeamFlow.auth.updateStoredUser(user);
    window.TeamFlow.auth.renderSharedSidebar(user);
    window.TeamFlow.auth.setSharedDashboardLink(user);
    setUserHeader(user);
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData();

    if (form.name.value.trim()) formData.append("name", form.name.value.trim());
    if (form.profileImg.files[0]) formData.append("profileImg", form.profileImg.files[0]);

    try {
      const res = await apiUpload(ENDPOINTS.users.updateProfile, formData, "PATCH");
      const current = window.TeamFlow.auth.getUser() || {};
      const nextUser = normalizeUserForStorage({ ...current, ...(res.data || {}) });

      window.TeamFlow.auth.updateStoredUser(nextUser);
      setUserHeader(nextUser);
      const preview = qs("#profile-preview");
      if (preview) preview.src = resolveProfileImageSrc(nextUser.profileImg);

      await loadProfile();
      showToast("Profile updated", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.newPassword.value !== form.passwordConfirm.value) {
      showToast("Password confirmation does not match", "error");
      return;
    }

    try {
      const res = await apiCall(ENDPOINTS.users.changePassword, {
        method: "PATCH",
        body: {
          currentPassword: form.currentPassword.value,
          newPassword: form.newPassword.value,
          passwordConfirm: form.passwordConfirm.value,
        },
      });

      const user = window.TeamFlow.auth.getUser();
      window.TeamFlow.auth.setSession(res.accessToken, user);
      form.reset();
      showToast("Password updated", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function bindProfilePageEvents() {
    const profileForm = qs("#profile-form");
    if (profileForm) profileForm.addEventListener("submit", handleProfileUpdate);

    const passwordForm = qs("#password-form");
    if (passwordForm) passwordForm.addEventListener("submit", handlePasswordChange);

    const fileInput = qs("#profile-image");
    const preview = qs("#profile-preview");

    if (fileInput && preview) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowed.includes(file.type)) {
          showToast("Only image files are allowed", "error");
          fileInput.value = "";
          return;
        }

        preview.src = URL.createObjectURL(file);
      });
    }

    const logoutBtn = qs("[data-action=logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        window.TeamFlow.auth.logout();
      });
    }
  }

  async function initProfilePage() {
    const auth = window.TeamFlow.auth.requireAuth(["manager", "team-lead", "developer"]);
    if (!auth) return;

    window.TeamFlow.auth.renderSharedSidebar(auth.user);
    window.TeamFlow.auth.setSharedDashboardLink(auth.user);
    setUserHeader(auth.user);
    highlightNav();
    bindProfilePageEvents();

    window.TeamFlow.socket.connectSocket();
    await window.TeamFlow.notifications.initGlobalNotifications();

    try {
      await loadProfile();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.users = {
    initUsersPage,
    initProfilePage,
  };
})();
