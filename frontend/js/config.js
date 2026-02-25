(function initConfig() {
  function normalizeOrigin(origin) {
    return String(origin || "").replace(/\/+$/, "");
  }

  function uniqueOrigins(origins) {
    const seen = new Set();
    return origins.filter((origin) => {
      if (!origin) return false;
      if (seen.has(origin)) return false;
      seen.add(origin);
      return true;
    });
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const host = window.location.hostname || "localhost";

  const runtimeOrigin = normalizeOrigin(window.__TEAMFLOW_BACKEND_ORIGIN__);
  const storedOrigin = normalizeOrigin(localStorage.getItem("teamflow_backend_origin"));
  const defaultOrigin = normalizeOrigin(`${protocol}//${host}:3000`);
  const legacyOrigin = normalizeOrigin(`${protocol}//${host}:5000`);

  const BACKEND_ORIGIN = runtimeOrigin || storedOrigin || defaultOrigin;

  const API_BASE_URL = `${BACKEND_ORIGIN}/api/v1`;
  const SOCKET_URL = BACKEND_ORIGIN;

  function getCandidateOrigins() {
    return uniqueOrigins([runtimeOrigin, storedOrigin, defaultOrigin, legacyOrigin]);
  }

  const ENDPOINTS = {
    auth: {
      register: "/auth/register",
      login: "/auth/login",
      logout: "/auth/logout",
    },
    users: {
      profile: "/users/profile",
      updateProfile: "/users/update-profile",
      changePassword: "/users/change-password",
      getAll: "/users",
      getOne: (id) => `/users/${id}`,
      update: (id) => `/users/${id}`,
      delete: (id) => `/users/${id}`,
    },
    teams: {
      create: "/teams",
      getAll: "/teams",
      update: (id) => `/teams/${id}`,
      addMember: (id) => `/teams/${id}/add-member`,
      removeMember: (id) => `/teams/${id}/remove-member`,
      changeLead: (id) => `/teams/${id}/change-lead`,
      delete: (id) => `/teams/${id}`,
    },
    tasks: {
      create: "/tasks",
      createSubTask: "/tasks/sub-task",
      getAll: "/tasks",
      getOne: (id) => `/tasks/${id}`,
      update: (id) => `/tasks/${id}`,
      updateStatus: (id) => `/tasks/${id}/status`,
      delete: (id) => `/tasks/${id}`,
    },
    dashboard: {
      manager: "/dashboard/manager",
      teamLead: "/dashboard/team",
      developer: "/dashboard/me",
    },
    notifications: {
      getAll: "/notifications/me",
      unreadCount: "/notifications/unread-count",
      markRead: (id) => `/notifications/${id}/read`,
      markAllRead: "/notifications/read-all",
    },
  };

  const PATHS = {
    login: "/index.html",
    register: "/register.html",
    manager: {
      dashboard: "/pages/manager/dashboard.html",
      teams: "/pages/manager/teams.html",
      tasks: "/pages/manager/tasks.html",
      users: "/pages/manager/users.html",
    },
    teamLead: {
      dashboard: "/pages/team-lead/dashboard.html",
      tasks: "/pages/team-lead/tasks.html",
      team: "/pages/team-lead/team.html",
    },
    developer: {
      dashboard: "/pages/developer/dashboard.html",
      tasks: "/pages/developer/my-tasks.html",
    },
    shared: {
      profile: "/pages/shared/profile.html",
      notifications: "/pages/shared/notifications.html",
    },
  };

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.config = {
    BACKEND_ORIGIN,
    API_BASE_URL,
    SOCKET_URL,
    getCandidateOrigins,
    ENDPOINTS,
    PATHS,
  };
})();
