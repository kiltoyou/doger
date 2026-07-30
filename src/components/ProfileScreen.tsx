import React, { useRef, useState } from "react";
import { Trophy, Music, Smile, LogOut, Camera, Pencil, Check, X, Loader2 } from "lucide-react";
import GlassCard from "./GlassCard";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

const achievements = [
  { icon: Trophy, color: "#FFB84D" },
  { icon: Music, color: "#2EE6C5" },
  { icon: Smile, color: "#FF77C8" },
];

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.displayName || "");
  const [editingMood, setEditingMood] = useState(false);
  const [moodDraft, setMoodDraft] = useState(user?.mood || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await api.uploadFile(file);
      await updateProfile({ avatarUrl: uploaded.url });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName() {
    if (!nameDraft.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ displayName: nameDraft.trim() });
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveMood() {
    setSaving(true);
    try {
      await updateProfile({ mood: moodDraft.trim() || null });
      setEditingMood(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-8 py-10 overflow-y-auto">
      <div className="self-end flex items-center gap-2 mb-4">
        <button
          onClick={logout}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,77,103,0.12)" }}
          title="Выйти"
        >
          <LogOut size={16} color="#FF4D67" />
        </button>
      </div>

      <div className="relative mb-4">
        <div style={{ boxShadow: "0 0 30px rgba(107,78,255,0.35)", borderRadius: "9999px" }}>
          <Avatar url={user.avatarUrl} color={user.avatarColor} name={user.displayName} size={96} />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelected} />
        <button
          onClick={handleAvatarClick}
          disabled={uploadingAvatar}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2"
          style={{ background: GRADIENT, borderColor: "#0E1117" }}
        >
          {uploadingAvatar ? <Loader2 size={14} color="#fff" className="animate-spin" /> : <Camera size={14} color="#fff" />}
        </button>
      </div>

      {editingName ? (
        <div className="flex items-center gap-2 mb-1">
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="text-white text-xl font-semibold bg-transparent border-b outline-none text-center"
            style={{ borderColor: "#2D7CFF" }}
          />
          <button onClick={saveName} disabled={saving}><Check size={16} color="#2EE6C5" /></button>
          <button onClick={() => { setEditingName(false); setNameDraft(user.displayName); }}><X size={16} color="#8A93A6" /></button>
        </div>
      ) : (
        <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 mb-1 group">
          <span className="text-white text-xl font-semibold">{user.displayName}</span>
          <Pencil size={13} color="#66708A" />
        </button>
      )}

      <div className="text-sm text-[#8A93A6] mb-3">@{user.username}</div>
      {user.isPremium && (
        <div className="px-4 py-1.5 rounded-full text-xs font-medium text-white mb-6" style={{ background: GRADIENT }}>
          ✨ Doger Premium
        </div>
      )}

      <GlassCard className="w-full max-w-sm rounded-[24px] p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="text-xs text-[#8A93A6] mb-3">Достижения</div>
        <div className="flex gap-3">
          {achievements.map(({ icon: Icon, color }, i) => (
            <div key={i} className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${color}22` }}>
              <Icon size={18} color={color} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="w-full max-w-sm rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="text-xs text-[#8A93A6] mb-2">Настроение</div>
        {editingMood ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={moodDraft}
              onChange={(e) => setMoodDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveMood()}
              placeholder="Например: В отличном настроении 😎"
              className="flex-1 bg-transparent text-sm text-white outline-none border-b"
              style={{ borderColor: "#2D7CFF" }}
            />
            <button onClick={saveMood} disabled={saving}><Check size={15} color="#2EE6C5" /></button>
            <button onClick={() => { setEditingMood(false); setMoodDraft(user.mood || ""); }}><X size={15} color="#8A93A6" /></button>
          </div>
        ) : (
          <button onClick={() => setEditingMood(true)} className="flex items-center justify-between w-full text-sm text-white">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "#2EE6C5" }} />
              {user.mood || "Добавить настроение"}
            </span>
            <Pencil size={13} color="#66708A" />
          </button>
        )}
      </GlassCard>
    </div>
  );
}
