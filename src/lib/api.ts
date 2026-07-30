const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("doger_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка запроса: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  status: string;
  mood: string | null;
  isPremium: boolean;
}

export const api = {
  register: (data: { username: string; email: string; password: string; displayName: string }) =>
    request<{ token: string; user: PublicUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: PublicUser }>("/api/auth/me"),

  updateProfile: (data: { displayName?: string; mood?: string | null; avatarUrl?: string | null }) =>
    request<{ user: PublicUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) }),

  getChats: () => request<{ chats: any[] }>("/api/chats"),

  createChat: (data: { type: "direct" | "group" | "channel"; name?: string; memberIds: string[] }) =>
    request<{ chat: any }>("/api/chats", { method: "POST", body: JSON.stringify(data) }),

  searchUsers: (q: string) => request<{ users: any[] }>(`/api/users?q=${encodeURIComponent(q)}`),

  startDirectChat: (userId: string) =>
    request<{ chat: any }>("/api/users/direct-chat", { method: "POST", body: JSON.stringify({ userId }) }),

  getMessages: (chatId: string) => request<{ messages: any[] }>(`/api/chats/${chatId}/messages`),

  sendMessage: (chatId: string, data: { type?: string; content?: string }) =>
    request<{ message: any }>(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getNotifications: () => request<{ notifications: any[] }>("/api/notifications"),
  markNotificationsRead: () => request("/api/notifications/read-all", { method: "POST" }),

  uploadFile: async (file: File): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> => {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const res = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Ошибка загрузки: ${res.status}`);
    }
    return res.json();
  },

  getLiveRoom: (chatId: string) => request<{ liveRoom: any }>(`/api/live-rooms/${chatId}`),
  joinLiveRoom: (chatId: string) => request(`/api/live-rooms/${chatId}/join`, { method: "POST" }),
  leaveLiveRoom: (chatId: string) => request(`/api/live-rooms/${chatId}/leave`, { method: "POST" }),
};

export { API_URL, getToken };
