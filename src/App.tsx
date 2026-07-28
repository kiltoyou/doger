import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ChatsScreen from "./components/ChatsScreen";
import LiveRoomScreen from "./components/LiveRoomScreen";
import ProfileScreen from "./components/ProfileScreen";
import SearchScreen from "./components/SearchScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import LoginScreen from "./screens/LoginScreen";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center text-[#66708A] text-sm"
        style={{ background: "#0E1117" }}
      >
        Загрузка...
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
