import React, { useRef, useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../context/AuthContext";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWakeupHint, setShowWakeupHint] = useState(false);
  const wakeupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setShowWakeupHint(false);
    wakeupTimer.current = setTimeout(() => setShowWakeupHint(true), 3500);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ username, email, password, displayName });
      }
    } catch (err: any) {
      setError(err.message || "Что-то пошло не так");
    } finally {
      setBusy(false);
      setShowWakeupHint(false);
      if (wakeupTimer.current) clearTimeout(wakeupTimer.current);
    }
  }

  return (
    <div
      className="w-screen h-screen flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at 20% 0%, #151b28 0%, #0E1117 55%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <GlassCard className="w-full max-w-sm rounded-[24px] p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: GRADIENT, boxShadow: "0 0 24px rgba(45,124,255,0.45)" }}
          >
            <MessageCircle size={26} color="#fff" fill="#fff" />
          </div>
          <div className="text-white text-lg font-semibold">Doger Messenger</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Имя"
                required
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white outline-none placeholder-[#66708A]"
              />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя пользователя"
                required
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white outline-none placeholder-[#66708A]"
              />
            </>
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white outline-none placeholder-[#66708A]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            required
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white outline-none placeholder-[#66708A]"
          />

          {error && <div className="text-xs text-[#FF4D67]">{error}</div>}
          {showWakeupHint && (
            <div className="text-xs text-[#66708A] text-center">
              Сервер просыпается — обычно это занимает 30–50 секунд, подожди немного 🙂
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-2xl py-2.5 text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: GRADIENT }}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 text-xs text-[#8A93A6] w-full text-center"
        >
          {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </GlassCard>
    </div>
  );
}
