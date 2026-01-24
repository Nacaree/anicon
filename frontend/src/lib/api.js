import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function request(endpoint, options = {}) {
  const headers = await getAuthHeaders();

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || data?.error || "An error occurred",
      response.status,
      data,
    );
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body) =>
    request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

// Auth-specific API calls
export const authApi = {
  // Get current user info and profile (auto-creates profile if needed)
  getCurrentUser: () => api.get("/api/auth/me"),

  // Resend verification email (public endpoint)
  resendVerification: (email) =>
    api.post("/api/auth/resend-verification", { email }),

  // Send magic link (public endpoint)
  sendMagicLink: (email, redirectTo) =>
    api.post("/api/auth/magic-link", { email, redirectTo }),
};

// Profile API calls
export const profileApi = {
  getMyProfile: () => api.get("/api/profiles/me"),
  getProfileByUsername: (username) => api.get(`/api/profiles/${username}`),
  getProfileById: (userId) => api.get(`/api/profiles/user/${userId}`),
};

export { ApiError };
