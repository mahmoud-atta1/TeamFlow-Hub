(function initSocket() {
  let socket = null;
  let connecting = false;
  const listeners = {};
  const ORIGIN_STORAGE_KEY = "teamflow_backend_origin";

  function on(event, handler) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
  }

  function emitLocal(event, payload) {
    (listeners[event] || []).forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        // Keep other listeners alive.
      }
    });
  }

  function normalizeOrigin(origin) {
    return String(origin || "").replace(/\/+$/, "");
  }

  function uniqueOrigins(origins) {
    const seen = new Set();
    return origins.filter((origin) => {
      const clean = normalizeOrigin(origin);
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }

  function persistWorkingOrigin(origin) {
    const clean = normalizeOrigin(origin);
    if (!clean) return;

    localStorage.setItem(ORIGIN_STORAGE_KEY, clean);

    if (window.TeamFlow && window.TeamFlow.config) {
      window.TeamFlow.config.BACKEND_ORIGIN = clean;
      window.TeamFlow.config.API_BASE_URL = `${clean}/api/v1`;
      window.TeamFlow.config.SOCKET_URL = clean;
    }
  }

  function socketOrigins() {
    const config = window.TeamFlow.config || {};
    const stored = localStorage.getItem(ORIGIN_STORAGE_KEY);
    const candidates =
      typeof config.getCandidateOrigins === "function"
        ? config.getCandidateOrigins()
        : [config.SOCKET_URL];

    return uniqueOrigins([stored, ...candidates]);
  }

  function wireSocketEvents(instance, userId, origin) {
    instance.on("connect", () => {
      connecting = false;
      persistWorkingOrigin(origin);
      instance.emit("join", userId);
      emitLocal("socketConnected", { origin });
    });

    instance.on("disconnect", () => {
      emitLocal("socketDisconnected");
    });

    instance.on("newNotification", (data) => emitLocal("newNotification", data));
    instance.on("dashboardUpdate", (data) => emitLocal("dashboardUpdate", data));
    instance.on("taskCreated", (data) => emitLocal("taskCreated", data));
    instance.on("taskAssigned", (data) => emitLocal("taskAssigned", data));
    instance.on("taskCompleted", (data) => emitLocal("taskCompleted", data));
  }

  function connectUsingOrigins(origins, index, userId) {
    if (index >= origins.length) {
      connecting = false;
      emitLocal("socketConnectError");
      return null;
    }

    const origin = origins[index];
    socket = window.io(origin, {
      transports: ["websocket", "polling"],
      timeout: 5000,
    });

    wireSocketEvents(socket, userId, origin);

    socket.once("connect_error", () => {
      if (socket && !socket.connected) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
        connectUsingOrigins(origins, index + 1, userId);
      }
    });

    return socket;
  }

  function connectSocket() {
    if (socket) return socket;
    if (connecting) return null;
    if (typeof window.io !== "function") return null;

    const user = window.TeamFlow.auth.getUser();
    if (!user || !user._id) return null;

    connecting = true;

    return connectUsingOrigins(socketOrigins(), 0, user._id);
  }

  function disconnectSocket() {
    connecting = false;
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.socket = {
    on,
    connectSocket,
    disconnectSocket,
  };
})();
