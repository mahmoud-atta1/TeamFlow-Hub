(function initNotificationsModule() {
  const { ENDPOINTS } = window.TeamFlow.config;
  const { apiCall } = window.TeamFlow.api;
  const { qs, qsa, showToast, timeAgo, escapeHtml } = window.TeamFlow.utils;
  let realtimeBound = false;
  let unreadPollTimer = null;

  function notificationMessage(item) {
    if (item.type === "newTask") return "A new task was created for your team.";
    if (item.type === "taskAssigned") return "You were assigned a new task.";
    if (item.type === "taskCompleted") return "One of your tasks has been completed.";
    return "New notification.";
  }

  function notificationTitle(item) {
    if (item.type === "newTask") return "New Team Task";
    if (item.type === "taskAssigned") return "Task Assigned";
    if (item.type === "taskCompleted") return "Task Completed";
    return "Notification";
  }

  async function refreshUnreadCount() {
    try {
      const res = await apiCall(ENDPOINTS.notifications.unreadCount);
      const count = res.data ? res.data.count : 0;

      qsa("[data-notification-count]").forEach((node) => {
        node.textContent = count;
        node.style.display = count > 0 ? "inline-flex" : "none";
      });

      return count;
    } catch (error) {
      // Keep UI stable even if realtime/API has a transient failure.
      return 0;
    }
  }

  async function markNotificationRead(id) {
    await apiCall(ENDPOINTS.notifications.markRead(id), { method: "PATCH" });
  }

  async function markAllRead() {
    await apiCall(ENDPOINTS.notifications.markAllRead, { method: "PATCH" });
    await refreshUnreadCount();
  }

  function taskTargetPath() {
    const user = window.TeamFlow.auth.getUser();
    if (!user) return window.TeamFlow.config.PATHS.login;

    if (user.role === "manager") return window.TeamFlow.config.PATHS.manager.tasks;
    if (user.role === "team-lead") return window.TeamFlow.config.PATHS.teamLead.tasks;
    return window.TeamFlow.config.PATHS.developer.tasks;
  }

  function notificationItemHtml(item) {
    const typeClassMap = {
      newTask: "type-newTask",
      taskAssigned: "type-taskAssigned",
      taskCompleted: "type-taskCompleted",
    };

    const unreadClass = item.isRead ? "" : "unread";
    const typeClass = typeClassMap[item.type] || "type-generic";

    return `
      <article class="notification-item ${unreadClass} ${typeClass}" data-id="${item._id}">
        <div class="notification-icon" aria-hidden="true"></div>
        <div class="notification-main">
          <div class="notification-item-top">
            <strong>${escapeHtml(notificationTitle(item))}</strong>
            <span>${timeAgo(item.createdAt)}</span>
          </div>
          <p>${escapeHtml(notificationMessage(item))}</p>
          <div class="notification-actions-row">
            <button class="btn btn-ghost" data-action="mark-read">Mark read</button>
            <button class="btn btn-primary" data-action="open-task">Open task</button>
          </div>
        </div>
      </article>
    `;
  }

  async function renderNotificationsPage() {
    const listNode = qs("#notifications-list");
    if (!listNode) return;

    listNode.innerHTML = "<div class=\"loading\">Loading notifications...</div>";

    try {
      const res = await apiCall(ENDPOINTS.notifications.getAll);
      const rows = res.data || [];

      if (!rows.length) {
        listNode.innerHTML = "<p class=\"empty-state\">No notifications yet.</p>";
      } else {
        listNode.innerHTML = rows.map(notificationItemHtml).join("");
      }

      await refreshUnreadCount();
    } catch (error) {
      listNode.innerHTML = `<p class=\"empty-state error\">${escapeHtml(error.message)}</p>`;
    }
  }

  function bindNotificationsPage() {
    const listNode = qs("#notifications-list");
    if (!listNode) return;

    listNode.addEventListener("click", async (event) => {
      const item = event.target.closest(".notification-item");
      if (!item) return;

      const id = item.getAttribute("data-id");
      const action = event.target.getAttribute("data-action");

      try {
        if (action === "mark-read") {
          await markNotificationRead(id);
          item.classList.remove("unread");
          await refreshUnreadCount();
          return;
        }

        if (action === "open-task") {
          await markNotificationRead(id);
          window.TeamFlow.auth.navigate(taskTargetPath());
        }
      } catch (error) {
        showToast(error.message, "error");
      }
    });

    const markAllButton = qs("#mark-all-read-btn");
    if (markAllButton) {
      markAllButton.addEventListener("click", async () => {
        try {
          await markAllRead();
          await renderNotificationsPage();
          showToast("All notifications marked as read", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    }
  }

  async function initGlobalNotifications() {
    await refreshUnreadCount();
    startUnreadPolling();

    if (window.TeamFlow.socket) {
      window.TeamFlow.socket.connectSocket();
    }

    if (!window.TeamFlow.socket || realtimeBound) return;
    realtimeBound = true;

    const refreshOnly = async () => {
      await refreshUnreadCount();
    };

    // Keep bell badge in sync without showing text toasts.
    window.TeamFlow.socket.on("newNotification", refreshOnly);
    window.TeamFlow.socket.on("taskCreated", refreshOnly);
    window.TeamFlow.socket.on("taskAssigned", refreshOnly);
    window.TeamFlow.socket.on("taskCompleted", refreshOnly);
    window.TeamFlow.socket.on("socketConnected", refreshOnly);
  }

  async function initNotificationsPage() {
    bindNotificationsPage();
    await renderNotificationsPage();

    if (window.TeamFlow.socket) {
      window.TeamFlow.socket.on("newNotification", async () => {
        await renderNotificationsPage();
      });
    }
  }

  function startUnreadPolling() {
    if (unreadPollTimer) return;

    unreadPollTimer = window.setInterval(() => {
      refreshUnreadCount();
    }, 15000);
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.notifications = {
    refreshUnreadCount,
    markNotificationRead,
    markAllRead,
    initGlobalNotifications,
    initNotificationsPage,
  };
})();
