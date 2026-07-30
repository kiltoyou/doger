import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { MessageCircle, Loader2 } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatsScreen from "./components/ChatsScreen";
import LiveRoomScreen from "./components/LiveRoomScreen";
import ProfileScreen from "./components/ProfileScreen";
import SearchScreen from "./components/SearchScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import LoginScreen from "./screens/LoginScreen";
import { useAuth } from "./context/AuthContext";
import { connectSocket } from "./lib/socket";
import { playNotificationSound } from "./lib/sound";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    const onNotification = () => {
      playNotificationSound();
    };
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [user]);

  if (loading) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "radial-gradient(circle at 20% 0%, #151b28 0%, #0E1117 55%)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: GRADIENT, boxShadow: "0 0 24px rgba(45,124,255,0.45)" }}
        >
          <MessageCircle size={26} color="#fff" fill="#fff" />
        </div>
        <div className="flex items-center gap-2 text-[#66708A] text-sm">
          <Loader2 size={15} className="animate-spin" />
          Загрузка...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div
      className="w-screen h-screen flex flex-col sm:flex-row overflow-hidden"
      style={{ background: "radial-gradient(circle at 20% 0%, #151b28 0%, #0E1117 55%)" }}
    >
      <Sidebar />
      <div className="flex-1 flex overflow-hidden pb-16 sm:pb-0">
        <Routes>
          <Route path="/" element={<ChatsScreen />} />
          <Route path="/live" element={<LiveRoomScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </div>
    </div>
  );
}
