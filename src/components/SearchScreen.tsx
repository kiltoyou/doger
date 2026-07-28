import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User as UserIcon } from "lucide-react";
import GlassCard from "./GlassCard";
import { api } from "../lib/api";

interface FoundUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  status: string;
}

export default function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .searchUsers(query)
        .then(({ users }) => setResults(users))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function openChatWith(userId: string) {
    setStartingChatId(userId);
    try {
      await api.startDirectChat(userId);
      navigate("/");
    } finally {
      setStartingChatId(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col px-8 py-6 max-w-xl">
      <h1 className="text-white text-xl font-semibold tracking-tight mb-4">Поиск</h1>

      <GlassCard
        className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-6"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <Search size={16} color="#66708A" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти людей по имени или юзернейму..."
          className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder-[#66708A]"
        />
      </GlassCard>

      {query && (
        <div className="text-xs text-[#66708A] mb-3">
          {loading ? "Поиск..." : `Результаты (${results.length})`}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => openChatWith(u.id)}
            disabled={startingChatId === u.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left hover:bg-white/5 disabled:opacity-60"
          >
            <div className="relative shrink-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: u.avatarColor }}
              >
                {u.displayName[0]}
              </div>
              {u.status === "online" && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: "#2EE6C5", borderColor: "#0E1117" }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-medium truncate">{u.displayName}</span>
                <UserIcon size={11} color="#66708A" />
              </div>
              <div className="text-xs text-[#8A93A6] truncate">@{u.username}</div>
            </div>
            <span className="text-[11px] text-[#66708A] shrink-0">
              {startingChatId === u.id ? "Открываем..." : "Написать"}
            </span>
          </button>
        ))}
        {query && !loading && results.length === 0 && (
          <div className="text-sm text-[#66708A] py-6 text-center">Никого не найдено</div>
        )}
      </div>
    </div>
  );
}
