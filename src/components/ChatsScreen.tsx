import React, { useEffect, useRef, useState } from "react";
import {
  Settings,
  Search,
  Plus,
  Phone,
  Video,
  Mic,
  Send,
  Paperclip,
  Square,
  FileText,
  Download,
  ArrowLeft,
  Check,
  CheckCheck,
  MoreVertical,
  CornerUpLeft,
  Pencil,
  Trash2,
  Smile,
  X,
  Users,
  Forward,
} from "lucide-react";
import GlassCard from "./GlassCard";
import Avatar from "./Avatar";
import NewChatModal from "./NewChatModal";
import { api, API_URL } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

const GRADIENT = "linear-gradient(135deg, #2D7CFF, #6B4EFF)";
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface ChatSummary {
  id: string;
  name: string;
  type: string;
  preview: string;
  isLive: boolean;
  unreadCount: number;
  members: { id: string; displayName: string; avatarColor: string; avatarUrl?: string | null; status: string; lastSeenAt?: string | null }[];
}

interface ReplyPreview {
  id: string;
  type: string;
  content?: string | null;
  fileName?: string | null;
  deleted?: boolean;
  sender: { displayName: string };
}

interface ChatMessage {
  id: string;
  mine: boolean;
  type: string;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  createdAt: string;
  editedAt?: string | null;
  deleted?: boolean;
  status?: "sent" | "delivered" | "read";
  replyTo?: ReplyPreview | null;
  reactions?: { userId: string; emoji: string }[];
  sender: { id: string; displayName: string; avatarColor: string };
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatLastSeen(dateStr?: string | null) {
  if (!dateStr) return "не в сети";
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? `был(а) в сети в ${time}` : `был(а) в сети ${d.toLocaleDateString()} в ${time}`;
}

function replyPreviewText(r: ReplyPreview) {
  if (r.deleted) return "Сообщение удалено";
  if (r.type === "voice") return "🎤 Голосовое сообщение";
  if (r.type === "image") return "🖼️ Изображение";
  if (r.type === "file") return `📎 ${r.fileName || "Файл"}`;
  return r.content || "";
}

function groupReactions(reactions: { userId: string; emoji: string }[] | undefined, myId?: string) {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    entry.count += 1;
    if (r.userId === myId) entry.mine = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.values());
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function linkify(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="underline break-all"
        style={{ color: "#2EE6C5" }}
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
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
  const [presence, setPresence] = useState<Record<string, { status: string; lastSeenAt?: string | null }>>({});
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
    const onPresence = ({ userId, status, lastSeenAt }: { userId: string; status: string; lastSeenAt?: string }) => {
      setPresence((prev) => ({ ...prev, [userId]: { status, lastSeenAt } }));
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
    setReplyingTo(null);
    setEditingMessage(null);
    setOpenMenuId(null);
    api.getMessages(activeChat).then(({ messages }) => setMessages(messages));

    const socket = connectSocket();
    socket.emit("chat:join", activeChat);

    const onNewMessage = (msg: ChatMessage & { chatId: string }) => {
      if (msg.chatId !== activeChat) return;
      setMessages((prev) => [...prev, { ...msg, mine: msg.sender.id === user?.id }]);
    };
    const onMessagesRead = ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      if (chatId !== activeChat) return;
      setMessages((prev) => prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: "read" } : m)));
    };
    const onEdited = ({ chatId, id, content, editedAt }: { chatId: string; id: string; content: string; editedAt: string }) => {
      if (chatId !== activeChat) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content, editedAt } : m)));
    };
    const onDeleted = ({ chatId, id }: { chatId: string; id: string }) => {
      if (chatId !== activeChat) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, deleted: true, content: null, fileUrl: null } : m))
      );
    };
    const onReactions = ({ chatId, messageId, reactions }: { chatId: string; messageId: string; reactions: { userId: string; emoji: string }[] }) => {
      if (chatId !== activeChat) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };
    const onTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (chatId !== activeChat || userId === user?.id) return;
      setIsTyping(true);
      if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current);
      stopTypingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
    };
    socket.on("message:new", onNewMessage);
    socket.on("messages:read", onMessagesRead);
    socket.on("message:edited", onEdited);
    socket.on("message:deleted", onDeleted);
    socket.on("message:reactions", onReactions);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.emit("chat:leave", activeChat);
      socket.off("message:new", onNewMessage);
      socket.off("messages:read", onMessagesRead);
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
      socket.off("message:reactions", onReactions);
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

    if (editingMessage) {
      socket.emit("message:edit", { messageId: editingMessage.id, content: input });
      setEditingMessage(null);
      setInput("");
      return;
    }

    socket.emit("message:send", {
      chatId: activeChat,
      type: "text",
      content: input,
      replyToId: replyingTo?.id,
    });
    setInput("");
    setReplyingTo(null);
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
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
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
            replyToId: replyingTo?.id,
          });
          setReplyingTo(null);
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

  function startReply(m: ChatMessage) {
    setReplyingTo(m);
    setEditingMessage(null);
    setOpenMenuId(null);
  }

  function startEdit(m: ChatMessage) {
    setEditingMessage(m);
    setInput(m.content || "");
    setReplyingTo(null);
    setOpenMenuId(null);
  }

  function cancelComposerExtra() {
    setReplyingTo(null);
    setEditingMessage(null);
    setInput("");
  }

  function deleteMessage(messageId: string) {
    const socket = connectSocket();
    socket.emit("message:delete", { messageId });
    setOpenMenuId(null);
  }

  function toggleReaction(messageId: string, emoji: string) {
    const socket = connectSocket();
    socket.emit("reaction:toggle", { messageId, emoji });
    setOpenMenuId(null);
  }

  function jumpToMessage(messageId: string) {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background-color 0.3s";
      el.style.backgroundColor = "rgba(45,124,255,0.25)";
      setTimeout(() => {
        el.style.backgroundColor = "";
      }, 1200);
    }
    setSearchOpen(false);
    setSearchQuery("");
  }

  function startForward(m: ChatMessage) {
    setForwardingMessage(m);
    setOpenMenuId(null);
  }

  function forwardTo(targetChatId: string) {
    if (!forwardingMessage) return;
    const socket = connectSocket();
    socket.emit("message:send", {
      chatId: targetChatId,
      type: forwardingMessage.type,
      content: forwardingMessage.content,
      fileUrl: forwardingMessage.fileUrl,
      fileName: forwardingMessage.fileName,
      fileSize: forwardingMessage.fileSize,
      duration: forwardingMessage.duration,
    });
    setForwardingMessage(null);
  }

  const searchMatches = searchQuery.trim()
    ? messages.filter((m) => !m.deleted && m.type === "text" && m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const activeChatData = chats.find((c) => c.id === activeChat);
  const otherMember = activeChatData?.members.find((m) => m.id !== user?.id);
  const otherPresence = otherMember ? presence[otherMember.id] : undefined;
  const otherStatus = otherPresence?.status || otherMember?.status;
  const otherLastSeen = otherPresence?.lastSeenAt ?? otherMember?.lastSeenAt;

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
            const isOnline = other ? (presence[other.id]?.status || other.status) === "online" : false;
            return (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat.id);
                  setMobileChatOpen(true);
                  setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
                }}
                className="flex items-center gap-3 px-2 py-2.5 rounded-2xl transition-all text-left"
                style={{ background: activeChat === chat.id ? "rgba(45,124,255,0.12)" : "transparent" }}
              >
                <div className="relative shrink-0">
                  {chat.type === "group" ? (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ background: GRADIENT }}
                    >
                      <Users size={16} color="#fff" />
                    </div>
                  ) : (
                    <Avatar url={other?.avatarUrl} color={other?.avatarColor || chat.members[0]?.avatarColor} name={chat.name} size={44} />
                  )}
                  {chat.isLive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse" style={{ background: "#FF4D67", borderColor: "#0E1117" }} />
                  )}
                  {!chat.isLive && isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "#2EE6C5", borderColor: "#0E1117" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">{chat.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-[#8A93A6] truncate">{chat.preview}</span>
                    {chat.unreadCount > 0 && (
                      <span
                        className="text-[10px] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0 ml-1"
                        style={{ background: GRADIENT }}
                      >
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
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
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setMobileChatOpen(false)} className="sm:hidden mr-1">
                  <ArrowLeft size={18} color="#8A93A6" />
                </button>
                <div className="shrink-0">
                  {activeChatData?.type === "group" ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: GRADIENT }}>
                      <Users size={16} color="#fff" />
                    </div>
                  ) : (
                    <Avatar url={otherMember?.avatarUrl} color={otherMember?.avatarColor} name={activeChatData?.name || "?"} size={40} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">{activeChatData?.name}</div>
                  {activeChatData?.type === "group" ? (
                    <div className="text-xs text-[#8A93A6]">{activeChatData.members.length} участников</div>
                  ) : (
                    <div className="text-xs" style={{ color: isTyping || otherStatus === "online" ? "#2EE6C5" : "#66708A" }}>
                      {isTyping ? "печатает..." : otherStatus === "online" ? "в сети" : formatLastSeen(otherLastSeen)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: searchOpen ? GRADIENT : "rgba(255,255,255,0.06)" }}
                >
                  <Search size={15} color={searchOpen ? "#fff" : "#8A93A6"} />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Phone size={15} color="#8A93A6" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Video size={15} color="#8A93A6" />
                </button>
              </div>
            </div>

            {searchOpen && (
              <div className="px-6 py-3 border-b border-white/5">
                <GlassCard className="flex items-center gap-2 px-3 py-2 rounded-2xl mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Search size={14} color="#66708A" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по сообщениям..."
                    className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder-[#66708A]"
                  />
                </GlassCard>
                {searchQuery.trim() && (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {searchMatches.length === 0 && (
                      <div className="text-xs text-[#66708A] text-center py-2">Ничего не найдено</div>
                    )}
                    {searchMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => jumpToMessage(m.id)}
                        className="text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <span className="text-[#8A93A6]">{m.sender.displayName}: </span>
                        <span className="text-white">{m.content}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 px-6 py-5 flex flex-col gap-3 overflow-y-auto">
              {messages.map((m) => {
                const grouped = groupReactions(m.reactions, user?.id);
                return (
                  <div
                    key={m.id}
                    ref={(el) => (messageRefs.current[m.id] = el)}
                    className={`flex flex-col rounded-xl ${m.mine ? "items-end" : "items-start"}`}
                  >
                    <div className={`flex items-center gap-1 max-w-[70%] ${m.mine ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className="px-4 py-2.5 rounded-[20px] backdrop-blur-md"
                        style={
                          m.mine
                            ? { background: GRADIENT, color: "#fff", borderBottomRightRadius: 6 }
                            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", color: "#E4E7ED", borderBottomLeftRadius: 6 }
                        }
                      >
                        {m.deleted ? (
                          <span className="text-sm italic opacity-60">Сообщение удалено</span>
                        ) : (
                          <>
                            {m.replyTo && (
                              <div
                                className="mb-1.5 pl-2 border-l-2 text-xs opacity-80 truncate max-w-[220px]"
                                style={{ borderColor: m.mine ? "rgba(255,255,255,0.5)" : "#2EE6C5" }}
                              >
                                <div className="font-medium">{m.replyTo.sender.displayName}</div>
                                <div className="truncate opacity-80">{replyPreviewText(m.replyTo)}</div>
                              </div>
                            )}

                            {m.type === "image" && m.fileUrl && (
                              <img
                                src={`${API_URL}${m.fileUrl}`}
                                alt={m.fileName || "изображение"}
                                onClick={() => setLightboxUrl(`${API_URL}${m.fileUrl}`)}
                                className="rounded-2xl max-w-full max-h-64 mb-1 cursor-zoom-in"
                              />
                            )}
                            {m.type === "file" && m.fileUrl && (
                              <a href={`${API_URL}${m.fileUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1">
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
                            {m.type === "text" && <span className="text-sm whitespace-pre-wrap">{linkify(m.content || "")}</span>}
                          </>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1" style={{ opacity: 0.7 }}>
                          {m.editedAt && !m.deleted && <span className="text-[10px]">изменено</span>}
                          <span className="text-[10px]">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {m.mine && !m.deleted && (
                            <>
                              {m.status === "read" ? (
                                <CheckCheck size={13} color="#2EE6C5" />
                              ) : m.status === "delivered" ? (
                                <CheckCheck size={13} />
                              ) : (
                                <Check size={13} />
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {!m.deleted && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100"
                          >
                            <MoreVertical size={14} color="#8A93A6" />
                          </button>

                          {openMenuId === m.id && (
                            <div
                              className={`absolute z-20 top-7 ${m.mine ? "right-0" : "left-0"} w-44 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden`}
                              style={{ background: "rgba(20,24,34,0.98)" }}
                            >
                              <div className="flex items-center justify-around px-2 py-2 border-b border-white/5">
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} className="text-lg hover:scale-125 transition-transform">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => startReply(m)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E4E7ED] hover:bg-white/5">
                                <CornerUpLeft size={14} /> Ответить
                              </button>
                              <button onClick={() => startForward(m)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E4E7ED] hover:bg-white/5">
                                <Forward size={14} /> Переслать
                              </button>
                              {m.mine && m.type === "text" && (
                                <button onClick={() => startEdit(m)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E4E7ED] hover:bg-white/5">
                                  <Pencil size={14} /> Редактировать
                                </button>
                              )}
                              {m.mine && (
                                <button onClick={() => deleteMessage(m.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF4D67] hover:bg-white/5">
                                  <Trash2 size={14} /> Удалить
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {grouped.length > 0 && (
                      <div className={`flex gap-1 mt-1 ${m.mine ? "flex-row-reverse" : "flex-row"}`}>
                        {grouped.map((g) => (
                          <button
                            key={g.emoji}
                            onClick={() => toggleReaction(m.id, g.emoji)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: g.mine ? "rgba(45,124,255,0.25)" : "rgba(255,255,255,0.08)",
                              border: g.mine ? "1px solid #2D7CFF" : "1px solid transparent",
                            }}
                          >
                            <span>{g.emoji}</span>
                            <span className="text-[#B8C0D4]">{g.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4">
              {(replyingTo || editingMessage) && (
                <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="min-w-0">
                    <div className="text-xs font-medium" style={{ color: "#2EE6C5" }}>
                      {editingMessage ? "Редактирование" : `Ответ ${replyingTo?.sender.displayName}`}
                    </div>
                    <div className="text-xs text-[#8A93A6] truncate max-w-[280px]">
                      {editingMessage ? editingMessage.content : replyingTo && replyPreviewText(replyingTo as ReplyPreview)}
                    </div>
                  </div>
                  <button onClick={cancelComposerExtra} className="shrink-0 w-6 h-6 flex items-center justify-center">
                    <X size={14} color="#8A93A6" />
                  </button>
                </div>
              )}
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
                  <button onClick={handleSend} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: GRADIENT }}>
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

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.9)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X size={18} color="#fff" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {forwardingMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setForwardingMessage(null)}
        >
          <GlassCard className="w-full max-w-sm rounded-[24px] p-5" style={{ background: "#141a26" }} >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-base font-semibold">Переслать в...</h2>
                <button onClick={() => setForwardingMessage(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X size={14} color="#8A93A6" />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => forwardTo(chat.id)}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left hover:bg-white/5"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                      style={{ background: chat.type === "group" ? GRADIENT : chat.members[0]?.avatarColor || "#2D7CFF" }}
                    >
                      {chat.type === "group" ? <Users size={14} color="#fff" /> : chat.name[0]}
                    </div>
                    <span className="text-white text-sm font-medium truncate">{chat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}
