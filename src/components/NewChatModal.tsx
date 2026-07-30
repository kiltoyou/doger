import React, { useEffect, useState } from "react";
import { Search, X, Users, Check } from "lucide-react";
import GlassCard from "./GlassCard";
import Avatar from "./Avatar";
import { api } from "../lib/api";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
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
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState("");

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

  function toggleUser(u: UserResult) {
    setSelected((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]
    );
  }

  async function handleCreate() {
    if (selected.length === 0) return;
    setCreating(true);
    try {
      const isGroup = selected.length > 1;
      const { chat } = await api.createChat({
        type: isGroup ? "group" : "direct",
        name: isGroup ? groupName.trim() || undefined : undefined,
        memberIds: selected.map((u) => u.id),
      });
      onCreated(chat.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <GlassCard className="w-full max-w-sm rounded-[24px] p-5" style={{ background: "#141a26" }}>
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-base font-semibold">
              {selected.length > 1 ? "Новая группа" : "Новый чат"}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <X size={14} color="#8A93A6" />
            </button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selected.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full text-xs"
                  style={{ background: "rgba(45,124,255,0.2)" }}
                >
                  <Avatar url={u.avatarUrl} color={u.avatarColor} name={u.displayName} size={20} />
                  <span className="text-white">{u.displayName}</span>
                  <X size={11} color="#8A93A6" />
                </button>
              ))}
            </div>
          )}

          {selected.length > 1 && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Название группы (необязательно)"
              className="w-full px-3 py-2.5 rounded-2xl mb-3 text-sm text-white/90 outline-none placeholder-[#66708A]"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          )}

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

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto mb-3">
            {loading && <div className="text-xs text-[#66708A] text-center py-4">Поиск...</div>}
            {!loading && results.length === 0 && (
              <div className="text-xs text-[#66708A] text-center py-4">Никого не нашлось</div>
            )}
            {results.map((u) => {
              const isSelected = selected.some((p) => p.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left hover:bg-white/5"
                  style={{ background: isSelected ? "rgba(45,124,255,0.12)" : "transparent" }}
                >
                  <Avatar url={u.avatarUrl} color={u.avatarColor} name={u.displayName} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{u.displayName}</div>
                    <div className="text-xs text-[#8A93A6] truncate">@{u.username}</div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: GRADIENT }}>
                      <Check size={12} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCreate}
            disabled={selected.length === 0 || creating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: GRADIENT }}
          >
            {selected.length > 1 && <Users size={15} />}
            {creating
              ? "Создание..."
              : selected.length > 1
              ? `Создать группу (${selected.length})`
              : selected.length === 1
              ? `Написать ${selected[0].displayName}`
              : "Выбери хотя бы одного человека"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
