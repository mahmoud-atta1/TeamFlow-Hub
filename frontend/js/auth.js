(function initAuth() {
  const STORAGE_TOKEN = "teamflow_token";
  const STORAGE_USER = "teamflow_user";

  function getConfig() {
    return window.TeamFlow.config;
  }

  function normalizePath(path) {
    return (path || "").replace(/\\/g, "/");
  }

  function getFrontendRoot() {
    const path = normalizePath(window.location.pathname);
    const marker = "/frontend/";
    const idx = path.indexOf(marker);

    if (idx >= 0) {
      return path.slice(0, idx + marker.length - 1);
    }

    return "";
  }

  function toAppPath(relativePath) {
    const root = getFrontendRoot();
    const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return `${root}${clean}`;
  }

  function navigate(relativePath) {
    window.location.href = toAppPath(relativePath);
  }

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  function getUser() {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  }

  function updateStoredUser(nextUser) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
  }

  function rolePath(role) {
    const PATHS = getConfig().PATHS;

    if (role === "manager") return PATHS.manager.dashboard;
    if (role === "team-lead") return PATHS.teamLead.dashboard;
    return PATHS.developer.dashboard;
  }

  function redirectByRole(role) {
    navigate(rolePath(role));
  }

  function sharedNavItems(role) {
    const PATHS = getConfig().PATHS;

    if (role === "manager") {
      return [
        { label: "Dashboard", href: PATHS.manager.dashboard },
        { label: "Teams", href: PATHS.manager.teams },
        { label: "Tasks", href: PATHS.manager.tasks },
        { label: "Users", href: PATHS.manager.users },
      ];
    }

    if (role === "team-lead") {
      return [
        { label: "Dashboard", href: PATHS.teamLead.dashboard },
        { label: "Tasks", href: PATHS.teamLead.tasks },
        { label: "Team", href: PATHS.teamLead.team },
      ];
    }

    return [
      { label: "Dashboard", href: PATHS.developer.dashboard },
      { label: "My Tasks", href: PATHS.developer.tasks },
    ];
  }

  function renderSharedSidebar(user) {
    const nav = document.querySelector("[data-shared-nav]");
    if (!nav) return;

    const sourceUser = user || getUser();
    const role = sourceUser && sourceUser.role ? sourceUser.role : "developer";
    const items = [
      ...sharedNavItems(role),
      { label: "Profile", href: getConfig().PATHS.shared.profile },
      { label: "Notifications", href: getConfig().PATHS.shared.notifications },
    ];

    nav.innerHTML = `${items
      .map((item) => `<a data-nav-link href="${toAppPath(item.href)}">${item.label}</a>`)
      .join("")}<a href="#" data-action="logout">Logout</a>`;
  }

  function setSharedDashboardLink(user) {
    const target = document.querySelector("[data-shared-dashboard]");
    if (!target) return;

    const sourceUser = user || getUser();
    const role = sourceUser && sourceUser.role ? sourceUser.role : "developer";
    target.setAttribute("href", toAppPath(rolePath(role)));
  }

  function requireAuth(roles) {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      navigate(getConfig().PATHS.login);
      return null;
    }

    if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
      navigate(rolePath(user.role));
      return null;
    }

    return { token, user };
  }

  function ensureGuest() {
    const token = getToken();
    const user = getUser();

    if (token && user) {
      redirectByRole(user.role);
      return false;
    }

    return true;
  }

  async function logout() {
    const api = window.TeamFlow.api;
    const ENDPOINTS = getConfig().ENDPOINTS;

    try {
      await api.apiCall(ENDPOINTS.auth.logout, { method: "POST" });
    } catch (error) {
      // Logout should clear client state even if server call fails.
    }

    if (window.TeamFlow.socket) {
      window.TeamFlow.socket.disconnectSocket();
    }

    clearSession();
    navigate(getConfig().PATHS.login);
  }

  async function login(credentials) {
    const api = window.TeamFlow.api;
    const ENDPOINTS = getConfig().ENDPOINTS;
    const data = await api.apiCall(ENDPOINTS.auth.login, {
      method: "POST",
      body: credentials,
    });

    setSession(data.accessToken, data.data);
    return data.data;
  }

  async function register(payload) {
    const api = window.TeamFlow.api;
    const ENDPOINTS = getConfig().ENDPOINTS;

    return api.apiCall(ENDPOINTS.auth.register, {
      method: "POST",
      body: payload,
    });
  }

  function bindLogoutButton() {
    const button = document.querySelector("[data-action=logout]");
    if (!button) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  }

  function initLoginPage() {
    if (!ensureGuest()) return;

    const form = document.querySelector("#login-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = form.email.value.trim();
      const password = form.password.value;

      try {
        const user = await login({ email, password });
        if (window.TeamFlow.socket) window.TeamFlow.socket.connectSocket();
        redirectByRole(user.role);
      } catch (error) {
        if (window.TeamFlow.utils) {
          window.TeamFlow.utils.showToast(error.message, "error");
        } else {
          window.alert(error.message);
        }
      }
    });
  }

  function initRegisterPage() {
    if (!ensureGuest()) return;

    const form = document.querySelector("#register-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
      };

      try {
        await register(payload);
        if (window.TeamFlow.utils) {
          window.TeamFlow.utils.showToast(
            "Account created. Wait for manager approval.",
            "success",
          );
        }

        window.setTimeout(() => navigate(getConfig().PATHS.login), 700);
      } catch (error) {
        if (window.TeamFlow.utils) {
          window.TeamFlow.utils.showToast(error.message, "error");
        } else {
          window.alert(error.message);
        }
      }
    });
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.auth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    updateStoredUser,
    requireAuth,
    ensureGuest,
    redirectByRole,
    renderSharedSidebar,
    setSharedDashboardLink,
    rolePath,
    navigate,
    toAppPath,
    logout,
    login,
    register,
    bindLogoutButton,
    initLoginPage,
    initRegisterPage,
  };
})();
