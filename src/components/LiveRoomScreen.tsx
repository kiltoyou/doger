import React, { useEffect, useState } from "react";
import { MonitorPlay, Video, Mic, PhoneOff, Plus, LogIn } from "lucide-react";
import GlassCard from "./GlassCard";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

interface ChatSummary {
  id: string;
  name: string;
}

interface LiveParticipant {
  id: string;
  displayName: string;
  avatarColor: string;
  cameraOn: boolean;
  micOn: boolean;
  screenOn: boolean;
  me: boolean;
}

export default function LiveRoomScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  useEffect(() => {
    api.getChats().then(({ chats }) => setChats(chats));
  }, []);

  useEffect(() => {
    if (!activeChatId || !user) return;

    const socket = connectSocket();

    api.joinLiveRoom(activeChatId).then(() => {
      api.getLiveRoom(activeChatId).then(({ liveRoom }) => setParticipants(liveRoom.participants));
    });
    socket.emit("live:join", activeChatId);

    const onJoined = () => {
      api.getLiveRoom(activeChatId).then(({ liveRoom }) => setParticipants(liveRoom.participants));
    };
    const onLeft = ({ userId }: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
    };
    const onToggle = ({ userId, field, value }: { userId: string; field: string; value: boolean }) => {
      setParticipants((prev) => prev.map((p) => (p.id === userId ? { ...p, [field]: value } : p)));
    };

    socket.on("live:participant-joined", onJoined);
    socket.on("live:participant-left", onLeft);
    socket.on("live:toggle", onToggle);

    return () => {
      socket.emit("live:leave", activeChatId);
      socket.off("live:participant-joined", onJoined);
      socket.off("live:participant-left", onLeft);
      socket.off("live:toggle", onToggle);
    };
  }, [activeChatId, user]);

  function toggleField(field: "cameraOn" | "micOn" | "screenOn") {
    if (!activeChatId) return;
    const current = { cameraOn, micOn, screenOn }[field];
    const next = !current;
    if (field === "cameraOn") setCameraOn(next);
    if (field === "micOn") setMicOn(next);
    if (field === "screenOn") setScreenOn(next);

    const socket = connectSocket();
    socket.emit("live:toggle", { chatId: activeChatId, field, value: next });
    setParticipants((prev) => prev.map((p) => (p.me ? { ...p, [field]: next } : p)));
  }

  function leaveRoom() {
    if (!activeChatId) return;
    const socket = connectSocket();
    socket.emit("live:leave", activeChatId);
    api.leaveLiveRoom(activeChatId).catch(() => {});
    setActiveChatId(null);
    setParticipants([]);
  }

  if (!activeChatId) {
    return (
      <div className="flex-1 flex flex-col px-8 py-6 max-w-md">
        <h1 className="text-white text-xl font-semibold tracking-tight mb-4">Live Room</h1>
        <div className="text-xs text-[#66708A] mb-4">Выбери чат, чтобы начать совместную комнату</div>
        <div className="flex flex-col gap-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <span className="text-white text-sm font-medium">{chat.name}</span>
              <LogIn size={15} color="#8A93A6" />
            </button>
          ))}
          {chats.length === 0 && (
            <div className="text-xs text-[#66708A] text-center py-6">Нет доступных чатов</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #2D7CFF, #6B4EFF)" }}>
            <MonitorPlay size={18} color="#fff" />
            <div className="absolute -inset-1 rounded-2xl animate-pulse" style={{ boxShadow: "0 0 16px 2px rgba(45,124,255,0.6)" }} />
          </div>
          <div>
            <div className="text-white font-semibold">Live Room</div>
            <div className="text-xs text-[#8A93A6]">● {participants.length} участник(ов)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {participants.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <div className="relative">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: p.avatarColor, boxShadow: p.me ? "0 0 0 2px #0E1117, 0 0 0 4px #2EE6C5" : "none" }}
              >
                {p.displayName[0]}
              </div>
              {p.me && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2D7CFF, #6B4EFF)" }}>
                  <Plus size={11} color="#fff" />
                </div>
              )}
              {!p.micOn && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#FF4D67" }}>
                  <Mic size={9} color="#fff" />
                </div>
              )}
            </div>
            <span className="text-xs text-[#B8C0D4] truncate max-w-full">{p.displayName}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => toggleField("cameraOn")}
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: cameraOn ? "linear-gradient(135deg, #2D7CFF, #6B4EFF)" : "rgba(255,255,255,0.06)" }}
          >
            <Video size={18} color={cameraOn ? "#fff" : "#E4E7ED"} />
          </button>
          <span className="text-[11px] text-[#8A93A6]">Видео</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => toggleField("micOn")}
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: micOn ? "linear-gradient(135deg, #2D7CFF, #6B4EFF)" : "rgba(255,255,255,0.06)" }}
          >
            <Mic size={18} color={micOn ? "#fff" : "#E4E7ED"} />
          </button>
          <span className="text-[11px] text-[#8A93A6]">Звук</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => toggleField("screenOn")}
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: screenOn ? "linear-gradient(135deg, #2D7CFF, #6B4EFF)" : "rgba(255,255,255,0.06)" }}
          >
            <MonitorPlay size={18} color={screenOn ? "#fff" : "#E4E7ED"} />
          </button>
          <span className="text-[11px] text-[#8A93A6]">Экран</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button onClick={leaveRoom} className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#FF4D67" }}>
            <PhoneOff size={18} color="#fff" />
          </button>
          <span className="text-[11px] text-[#8A93A6]">Выйти</span>
        </div>
      </div>
    </div>
  );
}
