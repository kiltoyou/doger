import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import GlassCard from "./GlassCard";
import { api } from "../lib/api";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  status: string;
}

export default function NewChatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .searchUsers(query)
        .then(({ users }) => setResults(users))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handlePick(user: UserResult) {
    setCreating(user.id);
    try {
      const { chat } = await api.createChat({ type: "direct", memberIds: [user.id] });
      onCreated(chat.id);
    } finally {
      setCreating(null);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <GlassCard
        className="w-full max-w-sm rounded-[24px] p-5"
        style={{ background: "#141a26" }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-base font-semibold">Новый чат</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <X size={14} color="#8A93A6" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Search size={15} color="#66708A" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя или юзернейм"
              className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder-[#66708A]"
            />
          </div>

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {loading && <div className="text-xs text-[#66708A] text-center py-4">Поиск...</div>}
            {!loading && results.length === 0 && (
              <div className="text-xs text-[#66708A] text-center py-4">Никого не нашлось</div>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => handlePick(u)}
                disabled={creating === u.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left hover:bg-white/5 disabled:opacity-50"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: u.avatarColor }}
                >
                  {u.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{u.displayName}</div>
                  <div className="text-xs text-[#8A93A6] truncate">@{u.username}</div>
                </div>
                {creating === u.id && <span className="text-[10px] text-[#66708A]">Создание...</span>}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
