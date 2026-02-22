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

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(endpoint, options = {}, retries = 3) {
  const headers = await getAuthHeaders();

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      // Retry on server errors (5xx)
      if (response.status >= 500 && retries > 0) {
        await wait(500);
        return request(endpoint, options, retries - 1);
      }

      throw new ApiError(
        data?.message || data?.error || "An error occurred",
        response.status,
        data,
      );
    }

    return data;
  } catch (error) {
    // Retry on network errors if we have retries left
    if (retries > 0 && error.name !== "ApiError") {
      await wait(500);
      return request(endpoint, options, retries - 1);
    }
    throw error;
  }
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
  // ! Depreciated 
  // !might not get used 
  getProfileById: (userId) => api.get(`/api/profiles/user/${userId}`),
};

// Event API calls
export const eventApi = {
  listEvents: () => api.get("/api/events"),
  getEvent: (id) => api.get(`/api/events/${id}`),
};

// Adapts a raw EventResponse from the backend to the shape frontend components expect.
// The API returns eventDate/eventTime/coverImageUrl; components expect date/time/imageUrl etc.
function formatEventDate(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(isoTime) {
  if (!isoTime) return "";
  const [h, m] = isoTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0
    ? `${hour} ${period}`
    : `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function normalizeEvent(event) {
  return {
    ...event,
    date: formatEventDate(event.eventDate),
    time: formatEventTime(event.eventTime),
    imageUrl: event.coverImageUrl || null,
    images: event.coverImageUrl ? [event.coverImageUrl] : [],
    thumbnails: event.coverImageUrl ? [event.coverImageUrl] : [],
    wantToGoCount: event.currentAttendance || 0,
    timeRange: formatEventTime(event.eventTime),
    dateRange: formatEventDate(event.eventDate),
  };
}

export { ApiError };
