import React, { createContext, useContext, useEffect, useState } from "react";
import { api, PublicUser } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { displayName?: string; mood?: string | null; avatarUrl?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("doger_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => {
        setUser(user);
        connectSocket();
      })
      .catch(() => {
        localStorage.removeItem("doger_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem("doger_token", token);
    setUser(user);
    connectSocket();
  }

  async function register(data: { username: string; email: string; password: string; displayName: string }) {
    const { token, user } = await api.register(data);
    localStorage.setItem("doger_token", token);
    setUser(user);
    connectSocket();
  }

  function logout() {
    localStorage.removeItem("doger_token");
    disconnectSocket();
    setUser(null);
  }

  async function updateProfile(data: { displayName?: string; mood?: string | null; avatarUrl?: string | null }) {
    const { user } = await api.updateProfile(data);
    setUser(user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
