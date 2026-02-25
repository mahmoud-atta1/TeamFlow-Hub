(function initUtils() {
  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  function timeAgo(date) {
    const now = Date.now();
    const past = new Date(date).getTime();
    const diff = Math.max(1, Math.floor((now - past) / 1000));

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  function debounce(callback, wait) {
    let timer;

    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => callback.apply(this, args), wait || 300);
    };
  }

  function ensureToastHost() {
    let host = qs("#toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    return host;
  }

  function showToast(message, type) {
    const tone = type || "info";
    const host = ensureToastHost();
    const item = document.createElement("div");
    item.className = `toast toast-${tone}`;
    item.textContent = message;
    host.appendChild(item);

    window.setTimeout(() => {
      item.classList.add("toast-fade");
      window.setTimeout(() => item.remove(), 220);
    }, 3000);
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function getRoleBadge(role) {
    const safe = escapeHtml(role || "-");
    return `<span class="badge role-${safe}">${safe}</span>`;
  }

  function getStatusBadge(status) {
    const safe = escapeHtml(status || "-");
    return `<span class="badge status-${safe}">${safe}</span>`;
  }

  function getPriorityBadge(priority) {
    const safe = escapeHtml(priority || "-");
    return `<span class="badge priority-${safe}">${safe}</span>`;
  }

  function setLoading(container, text) {
    if (!container) return;
    container.innerHTML = `<div class="loading">${escapeHtml(text || "Loading...")}</div>`;
  }

  function updatePageTitle(title) {
    document.title = `${title} | TeamFlow Hub`;
    const heading = qs("[data-page-title]");
    if (heading) heading.textContent = title;
  }

  function resolveProfileImageSrc(value) {
    const fallback = "https://placehold.co/80x80";
    if (!value) return fallback;

    const raw = String(value).trim().replace(/\\/g, "/");
    if (!raw) return fallback;

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:")
    ) {
      return raw;
    }

    const origin =
      (window.TeamFlow &&
        window.TeamFlow.config &&
        window.TeamFlow.config.BACKEND_ORIGIN) ||
      `${window.location.protocol}//${window.location.hostname}:3000`;

    if (raw.startsWith("/users/")) return `${origin}${raw}`;
    if (raw.startsWith("users/")) return `${origin}/${raw}`;
    if (raw.startsWith("/uploads/users/")) return `${origin}${raw}`;
    if (raw.startsWith("uploads/users/")) return `${origin}/${raw}`;
    return `${origin}/users/${raw}`;
  }

  function setUserHeader(user) {
    const nameNode = qs("[data-current-user]");
    if (nameNode) {
      nameNode.textContent = user ? user.name : "-";
    }

    const roleNode = qs("[data-current-role]");
    if (roleNode) {
      roleNode.textContent = user ? user.role : "-";
    }

    qsa("[data-current-avatar]").forEach((avatarNode) => {
      if (!avatarNode || !user) return;
      avatarNode.src = resolveProfileImageSrc(user.profileImg);
      avatarNode.alt = `${user.name} avatar`;
      avatarNode.onerror = () => {
        avatarNode.onerror = null;
        avatarNode.src = "https://placehold.co/80x80";
      };
    });
  }

  function highlightNav() {
    const path = window.location.pathname;
    qsa("[data-nav-link]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href && path.endsWith(href.split("/").pop())) {
        link.classList.add("active");
      }
    });
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.utils = {
    qs,
    qsa,
    escapeHtml,
    formatDate,
    timeAgo,
    debounce,
    showToast,
    confirmAction,
    getRoleBadge,
    getStatusBadge,
    getPriorityBadge,
    setLoading,
    updatePageTitle,
    resolveProfileImageSrc,
    setUserHeader,
    highlightNav,
  };
})();
