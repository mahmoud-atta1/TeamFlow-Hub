(function initDashboardModule() {
  const { ENDPOINTS } = window.TeamFlow.config;
  const { apiCall } = window.TeamFlow.api;
  const { qs, setUserHeader, highlightNav, showToast } = window.TeamFlow.utils;

  function endpointByRole(role) {
    if (role === "manager") return ENDPOINTS.dashboard.manager;
    if (role === "team-lead") return ENDPOINTS.dashboard.teamLead;
    return ENDPOINTS.dashboard.developer;
  }

  async function loadDashboard(role) {
    const endpoint = endpointByRole(role);
    const data = await apiCall(endpoint);

    const values = data.data || {};
    Object.keys(values).forEach((key) => {
      const node = qs(`[data-metric=\"${key}\"]`);
      if (node) node.textContent = values[key];
    });
  }

  async function init(role) {
    const auth = window.TeamFlow.auth.requireAuth([role]);
    if (!auth) return;

    setUserHeader(auth.user);
    highlightNav();

    window.TeamFlow.socket.connectSocket();
    await window.TeamFlow.notifications.initGlobalNotifications();

    try {
      await loadDashboard(role);
    } catch (error) {
      showToast(error.message, "error");
    }

    window.TeamFlow.socket.on("dashboardUpdate", async () => {
      try {
        await loadDashboard(role);
      } catch (error) {
        // Avoid noisy failures during reconnect windows.
      }
    });

    const logoutBtn = qs("[data-action=logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        window.TeamFlow.auth.logout();
      });
    }
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.dashboard = {
    init,
    loadDashboard,
  };
})();
