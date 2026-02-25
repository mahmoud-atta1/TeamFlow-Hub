(function initApi() {
  const TeamFlow = window.TeamFlow || {};
  const config = TeamFlow.config;
  const ORIGIN_STORAGE_KEY = "teamflow_backend_origin";

  function redirectToLogin() {
    if (window.TeamFlow && window.TeamFlow.auth && window.TeamFlow.auth.navigate) {
      window.TeamFlow.auth.clearSession();
      window.TeamFlow.auth.navigate(config.PATHS.login);
      return;
    }

    localStorage.removeItem("teamflow_token");
    localStorage.removeItem("teamflow_user");
    window.location.href = "/index.html";
  }

  function uniqueOrigins(origins) {
    const seen = new Set();
    return origins.filter((origin) => {
      const clean = String(origin || "").replace(/\/+$/, "");
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }

  function persistWorkingOrigin(origin) {
    const clean = String(origin || "").replace(/\/+$/, "");
    if (!clean) return;

    localStorage.setItem(ORIGIN_STORAGE_KEY, clean);

    if (window.TeamFlow && window.TeamFlow.config) {
      window.TeamFlow.config.BACKEND_ORIGIN = clean;
      window.TeamFlow.config.API_BASE_URL = `${clean}/api/v1`;
      window.TeamFlow.config.SOCKET_URL = clean;
    }

    if (
      window.TeamFlow &&
      window.TeamFlow.utils &&
      typeof window.TeamFlow.utils.setUserHeader === "function" &&
      window.TeamFlow.auth &&
      typeof window.TeamFlow.auth.getUser === "function"
    ) {
      const currentUser = window.TeamFlow.auth.getUser();
      if (currentUser) {
        window.TeamFlow.utils.setUserHeader(currentUser);
      }
    }
  }

  function requestOrigins() {
    const stored = localStorage.getItem(ORIGIN_STORAGE_KEY);
    const candidates =
      typeof config.getCandidateOrigins === "function"
        ? config.getCandidateOrigins()
        : [config.BACKEND_ORIGIN];

    return uniqueOrigins([stored, ...candidates]);
  }

  async function fetchWithOriginFallback(endpoint, fetchOptions) {
    const origins = requestOrigins();
    let lastError = null;

    for (const origin of origins) {
      try {
        const response = await fetch(`${origin}/api/v1${endpoint}`, fetchOptions);
        persistWorkingOrigin(origin);
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to reach backend server");
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch (error) {
      return { message: text };
    }
  }

  async function apiCall(endpoint, options) {
    const requestOptions = options || {};
    const token = localStorage.getItem("teamflow_token");
    const headers = { ...(requestOptions.headers || {}) };
    const isFormData = requestOptions.body instanceof FormData;

    if (!isFormData && requestOptions.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const method = requestOptions.method || "GET";
    const fetchOptions = {
      ...requestOptions,
      method,
      headers,
    };

    if (!isFormData && fetchOptions.body && typeof fetchOptions.body !== "string") {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    const response = await fetchWithOriginFallback(endpoint, fetchOptions);
    const data = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        redirectToLogin();
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function apiUpload(endpoint, formData, method) {
    return apiCall(endpoint, {
      method: method || "PATCH",
      body: formData,
    });
  }

  window.TeamFlow = window.TeamFlow || {};
  window.TeamFlow.api = {
    apiCall,
    apiUpload,
  };
})();
