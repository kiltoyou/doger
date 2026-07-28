import React from "react";
import { Settings, Trophy, Music, Smile, LogOut } from "lucide-react";
import GlassCard from "./GlassCard";
import { useAuth } from "../context/AuthContext";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

const achievements = [
  { icon: Trophy, color: "#FFB84D" },
  { icon: Music, color: "#2EE6C5" },
  { icon: Smile, color: "#FF77C8" },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

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
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Settings size={16} color="#8A93A6" />
        </button>
      </div>

      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-semibold mb-4"
        style={{ background: user.avatarColor || GRADIENT, boxShadow: "0 0 30px rgba(107,78,255,0.35)" }}
      >
        {user.displayName[0]}
      </div>
      <div className="text-white text-xl font-semibold">{user.displayName}</div>
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
        <div className="flex items-center gap-2 text-sm text-white">
          <span className="w-2 h-2 rounded-full" style={{ background: "#2EE6C5" }} />
          {user.mood || "Не указано"}
        </div>
      </GlassCard>
    </div>
  );
}
