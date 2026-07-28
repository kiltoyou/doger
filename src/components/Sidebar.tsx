import React from "react";
import { MessageCircle, Video, Search, Bell, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

const items = [
  { to: "/", icon: MessageCircle, label: "Чаты", end: true },
  { to: "/live", icon: Video, label: "Live" },
  { to: "/search", icon: Search, label: "Поиск" },
  { to: "/notifications", icon: Bell, label: "Увед." },
  { to: "/profile", icon: User, label: "Профиль" },
];

export default function Sidebar() {
  return (
    <>
      {/* Десктоп: вертикальная колонка слева */}
      <div className="hidden sm:flex flex-col items-center gap-3 py-6 px-3 border-r border-white/5 shrink-0">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: GRADIENT, boxShadow: "0 0 24px rgba(45,124,255,0.45)" }}
        >
          <MessageCircle size={22} color="#fff" fill="#fff" />
        </div>

        {items.map(({ to, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => (
              <button
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300"
                style={{
                  background: isActive ? GRADIENT : "rgba(255,255,255,0.05)",
                  boxShadow: isActive ? "0 0 20px rgba(45,124,255,0.5)" : "none",
                }}
              >
                <Icon size={20} color={isActive ? "#fff" : "#8A93A6"} />
              </button>
            )}
          </NavLink>
        ))}
      </div>

      {/* Мобильные: нижняя панель */}
      <div
        className="flex sm:hidden items-center justify-around border-t border-white/5 px-2 py-2 fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl"
        style={{ background: "rgba(14,17,23,0.92)" }}
      >
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className="flex-1">
            {({ isActive }) => (
              <button className="w-full flex flex-col items-center gap-1 py-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: isActive ? GRADIENT : "transparent" }}
                >
                  <Icon size={18} color={isActive ? "#fff" : "#8A93A6"} />
                </div>
                <span className="text-[10px]" style={{ color: isActive ? "#2EE6C5" : "#66708A" }}>
                  {label}
                </span>
              </button>
            )}
          </NavLink>
        ))}
      </div>
    </>
  );
}
