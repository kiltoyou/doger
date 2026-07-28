import React, { useEffect, useRef, useState } from "react";
import { Settings, Search, Plus, Phone, Video, Mic, Send, Paperclip, Square, FileText, Download, ArrowLeft } from "lucide-react";
import GlassCard from "./GlassCard";
import NewChatModal from "./NewChatModal";
import { api, API_URL } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";

interface ChatSummary {
  id: string;
  name: string;
  preview: string;
  isLive: boolean;
  members: { id: string; displayName: string; avatarColor: string; status: string }[];
}

interface ChatMessage {
  id: string;
  mine: boolean;
  type: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  createdAt: string;
  sender: { id: string; displayName: string; avatarColor: string };
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);

  function loadChats(selectId?: string) {
    setLoading(true);
    api
      .getChats()
      .then(({ chats }) => {
        setChats(chats);
        if (selectId) {
          setActiveChat(selectId);
        } else if (chats.length > 0 && !activeChat) {
          setActiveChat(chats[0].id);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadChats();
    const socket = connectSocket();
    const onPresence = ({ userId, status }: { userId: string; status: string }) => {
      setPresence((prev) => ({ ...prev, [userId]: status }));
    };
    socket.on("presence:update", onPresence);
    return () => {
      socket.off("presence:update", onPresence);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeChat) return;

    setIsTyping(false);
    api.getMessages(activeChat).then(({ messages }) => setMessages(messages));

    const socket = connectSocket();
    socket.emit("chat:join", activeChat);

    const onNewMessage = (msg: ChatMessage & { chatId: string }) => {
      if (msg.chatId !== activeChat) return;
      setMessages((prev) => [...prev, { ...msg, mine: msg.sender.id === user?.id }]);
    };
    const onTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (chatId !== activeChat || userId === user?.id) return;
      setIsTyping(true);
      if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current);
      stopTypingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
    };
    socket.on("message:new", onNewMessage);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.emit("chat:leave", activeChat);
      socket.off("message:new", onNewMessage);
      socket.off("chat:typing", onTyping);
    };
  }, [activeChat, user?.id]);

  function handleInputChange(value: string) {
    setInput(value);
    if (!activeChat) return;
    const socket = connectSocket();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.emit("chat:typing", { chatId: activeChat });
    typingTimeout.current = setTimeout(() => {}, 1000);
  }

  function handleSend() {
    if (!input.trim() || !activeChat) return;
    const socket = connectSocket();
    socket.emit("message:send", { chatId: activeChat, type: "text", content: input });
    setInput("");
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeChat) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadFile(file);
      const isImage = uploaded.mimeType.startsWith("image/");
      const socket = connectSocket();
      socket.emit("message:send", {
        chatId: activeChat,
        type: isImage ? "image" : "file",
        fileUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function toggleRecording() {
    if (!activeChat) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordStartRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationSec = Math.round((Date.now() - recordStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });

        setUploading(true);
        try {
          const uploaded = await api.uploadFile(file);
          const socket = connectSocket();
          socket.emit("message:send", {
            chatId: activeChat,
            type: "voice",
            fileUrl: uploaded.url,
            fileName: uploaded.fileName,
            fileSize: uploaded.fileSize,
            duration: durationSec,
          });
        } catch (err) {
          console.error(err);
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Не удалось получить доступ к микрофону", err);
    }
  }

  const activeChatData = chats.find((c) => c.id === activeChat);
  const otherMember = activeChatData?.members.find((m) => m.id !== user?.id);
  const otherStatus = otherMember ? presence[otherMember.id] || otherMember.status : null;

  return (
    <>
      {/* Chat list */}
      <div className={`${mobileChatOpen ? "hidden" : "flex"} sm:flex w-full sm:w-[300px] flex-col border-r border-white/5 px-4 py-5`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-semibold tracking-tight">Чаты</h1>
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Settings size={16} color="#8A93A6" />
          </button>
        </div>

        <GlassCard className="flex items-center gap-2 px-3 py-2 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
          <Search size={15} color="#66708A" />
          <input placeholder="Поиск" className="bg-transparent text-sm text-white/80 outline-none placeholder-[#66708A] w-full" />
        </GlassCard>

        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          {loading && <div className="text-xs text-[#66708A] text-center py-4">Загрузка чатов...</div>}
          {!loading && chats.length === 0 && (
            <div className="text-xs text-[#66708A] text-center py-4">
              Пока нет чатов. Выполни сид на backend (<code>npm run prisma:seed</code>), чтобы появился тестовый чат.
            </div>
          )}
          {chats.map((chat) => {
            const other = chat.members.find((m) => m.id !== user?.id);
            const isOnline = other ? (presence[other.id] || other.status) === "online" : false;
            return (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat.id);
                  setMobileChatOpen(true);
                }}
                className="flex items-center gap-3 px-2 py-2.5 rounded-2xl transition-all text-left"
                style={{ background: activeChat === chat.id ? "rgba(45,124,255,0.12)" : "transparent" }}
              >
                <div className="relative shrink-0">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ background: chat.members[0]?.avatarColor || "#2D7CFF" }}
                  >
                    {chat.name[0]}
                  </div>
                  {chat.isLive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse" style={{ background: "#FF4D67", borderColor: "#0E1117" }} />
                  )}
                  {!chat.isLive && isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "#2EE6C5", borderColor: "#0E1117" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium truncate block">{chat.name}</span>
                  <span className="text-xs text-[#8A93A6] truncate block">{chat.preview}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowNewChat(true)}
          className="mt-4 self-end w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: GRADIENT, boxShadow: "0 4px 20px rgba(45,124,255,0.5)" }}
        >
          <Plus size={20} color="#fff" />
        </button>
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={(chatId) => {
            setShowNewChat(false);
            setMobileChatOpen(true);
            loadChats(chatId);
          }}
        />
      )}

      {/* Chat window */}
      <div className={`${mobileChatOpen ? "flex" : "hidden"} sm:flex flex-1 flex-col`}>
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-[#66708A] text-sm">Выбери чат слева</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileChatOpen(false)} className="sm:hidden mr-1">
                  <ArrowLeft size={18} color="#8A93A6" />
                </button>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: otherMember?.avatarColor || "#2D7CFF" }}
                >
                  {(activeChatData?.name || "?")[0]}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{activeChatData?.name}</div>
                  <div className="text-xs" style={{ color: isTyping ? "#2EE6C5" : otherStatus === "online" ? "#2EE6C5" : "#66708A" }}>
                    {isTyping ? "печатает..." : otherStatus === "online" ? "в сети" : "не в сети"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Phone size={15} color="#8A93A6" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Video size={15} color="#8A93A6" />
                </button>
              </div>
            </div>

            <div className="flex-1 px-6 py-5 flex flex-col gap-3 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[70%] px-4 py-2.5 rounded-[20px] backdrop-blur-md"
                    style={
                      m.mine
                        ? { background: GRADIENT, color: "#fff", borderBottomRightRadius: 6 }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", color: "#E4E7ED", borderBottomLeftRadius: 6 }
                    }
                  >
                    {m.type === "image" && m.fileUrl && (
                      <img
                        src={`${API_URL}${m.fileUrl}`}
                        alt={m.fileName || "изображение"}
                        className="rounded-2xl max-w-full max-h-64 mb-1"
                      />
                    )}
                    {m.type === "file" && m.fileUrl && (
                      <a
                        href={`${API_URL}${m.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 py-1"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{m.fileName}</div>
                          <div className="text-[10px] opacity-70">{formatFileSize(m.fileSize)}</div>
                        </div>
                        <Download size={14} className="shrink-0 opacity-70" />
                      </a>
                    )}
                    {m.type === "voice" && m.fileUrl && (
                      <div className="flex items-center gap-2 py-1 min-w-[180px]">
                        <audio controls src={`${API_URL}${m.fileUrl}`} className="h-8 max-w-[220px]" />
                        {m.duration != null && <span className="text-[11px] opacity-70 shrink-0">{m.duration}s</span>}
                      </div>
                    )}
                    {m.type === "text" && <span className="text-sm">{m.content}</span>}
                    <div className="text-[10px] mt-1 text-right" style={{ opacity: 0.6 }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4">
              <GlassCard className="flex items-center gap-2 px-4 py-3 rounded-[24px]" style={{ background: "rgba(255,255,255,0.05)" }}>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                <button onClick={handleAttachClick} disabled={uploading} className="shrink-0">
                  <Paperclip size={17} color="#66708A" />
                </button>
                <input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={uploading ? "Загрузка..." : isRecording ? "Идёт запись..." : "Сообщение..."}
                  disabled={uploading || isRecording}
                  className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder-[#66708A]"
                />
                {input ? (
                  <button
                    onClick={handleSend}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: GRADIENT }}
                  >
                    <Send size={15} color="#fff" />
                  </button>
                ) : (
                  <button
                    onClick={toggleRecording}
                    disabled={uploading}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isRecording ? "#FF4D67" : GRADIENT }}
                  >
                    {isRecording ? <Square size={13} color="#fff" fill="#fff" /> : <Mic size={15} color="#fff" />}
                  </button>
                )}
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}
