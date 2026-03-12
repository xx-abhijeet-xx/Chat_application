"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn, formatDate, formatTime, initials, avatarGrad, formatSize } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { AuthUser, PublicUser, Conversation, FriendRequest, ChatMessage, MessageType, WSServerMsg } from "@/types";

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "md", status, onClick }: {
  user: { displayName?: string | null; username: string; avatarColor: string; avatarUrl?: string | null };
  size?: "xs" | "sm" | "md" | "lg";
  status?: "online" | "offline";
  onClick?: () => void;
}) {
  const sz = { xs: "w-6 h-6 text-[0.5rem]", sm: "w-8 h-8 text-[0.65rem]", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  const dot = { xs: "w-2 h-2", sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3.5 h-3.5" }[size];
  const name = user.displayName ?? user.username;
  return (
    <div className={cn("relative flex-shrink-0", onClick && "cursor-pointer")} onClick={onClick}>
      <div className={cn("rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br", sz, avatarGrad[user.avatarColor] ?? avatarGrad.purple)}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt={name} className="w-full h-full rounded-xl object-cover" /> : initials(name)}
      </div>
      {status && <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-bg-2", dot, status === "online" ? "bg-accent-green" : "bg-slate-600")} />}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, name, onClose }: { src: string; name?: string | null; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = name ?? "image";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={e => { e.stopPropagation(); handleDownload(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[0.75rem] font-medium transition-colors"
          >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <img src={src} alt={name ?? "image"}
        className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()} />
      {name && <div className="absolute bottom-4 text-slate-400 text-[0.75rem]">{name}</div>}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isOwn, showHeader }: { msg: ChatMessage; isOwn: boolean; showHeader: boolean }) {
  const name = msg.sender.displayName ?? msg.sender.username;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!msg.mediaUrl) return;
    const a = document.createElement("a");
    a.href = msg.mediaUrl;
    a.download = msg.mediaName ?? "file";
    a.click();
  };

  return (
    <>
      {lightboxOpen && msg.mediaUrl && (
        <Lightbox src={msg.mediaUrl} name={msg.mediaName} onClose={() => setLightboxOpen(false)} />
      )}
      <div className={cn("flex gap-3 px-1 animate-fade-up", isOwn && "flex-row-reverse")}>
        <div className="w-8 flex-shrink-0 flex items-start pt-0.5">
          {showHeader && <Avatar user={msg.sender} size="sm" />}
        </div>
        <div className={cn("flex flex-col gap-1 max-w-[68%]", isOwn && "items-end")}>
          {showHeader && (
            <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
              <span className="text-[0.8rem] font-semibold text-slate-200">{isOwn ? "You" : name}</span>
              <span className="text-[0.62rem] text-slate-500">{formatTime(msg.createdAt)}</span>
            </div>
          )}

          {/* TEXT */}
          {msg.messageType === "TEXT" && (
            <div className={cn("px-3.5 py-2 text-[0.83rem] leading-relaxed break-words rounded-xl border",
              showHeader ? (isOwn ? "rounded-tr-sm" : "rounded-tl-sm") : "",
              isOwn ? "bg-[rgba(99,179,255,0.1)] border-[rgba(99,179,255,0.2)] text-slate-100" : "bg-bg-3 border-white/5 text-slate-200"
            )}>{msg.content}</div>
          )}

          {/* IMAGE — click to open lightbox */}
          {msg.messageType === "IMAGE" && msg.mediaUrl && (
            <div className="group relative rounded-xl overflow-hidden border border-white/10 max-w-[260px] cursor-pointer"
              onClick={() => setLightboxOpen(true)}>
              <img src={msg.mediaUrl} alt={msg.mediaName ?? "image"} className="w-full object-cover hover:opacity-90 transition-opacity" />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center" onClick={handleDownload}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIDEO — inline player + download button */}
          {msg.messageType === "VIDEO" && msg.mediaUrl && (
            <div className="rounded-xl overflow-hidden border border-white/10 max-w-[300px]">
              <video src={msg.mediaUrl} controls className="w-full rounded-t-xl" />
              <div className={cn("flex items-center justify-between px-3 py-2 border-t border-white/5",
                isOwn ? "bg-[rgba(99,179,255,0.08)]" : "bg-bg-3")}>
                <span className="text-[0.7rem] text-slate-400 truncate max-w-[160px]">{msg.mediaName ?? "Video"}</span>
                <button onClick={handleDownload}
                  className="flex items-center gap-1 text-[0.65rem] text-accent-blue hover:text-blue-300 transition-colors flex-shrink-0 ml-2">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
              </div>
            </div>
          )}

          {/* AUDIO */}
          {msg.messageType === "AUDIO" && msg.mediaUrl && (
            <div className={cn("px-3 py-2 rounded-xl border flex flex-col gap-1.5", isOwn ? "bg-[rgba(99,179,255,0.1)] border-[rgba(99,179,255,0.2)]" : "bg-bg-3 border-white/5")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg className="text-accent-blue flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  <span className="text-[0.7rem] text-slate-400 truncate max-w-[140px]">{msg.mediaName ?? "Audio"}</span>
                </div>
                <button onClick={handleDownload} className="text-accent-blue hover:text-blue-300 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </div>
              <audio src={msg.mediaUrl} controls className="h-8 w-full" style={{ minWidth: 180 }} />
            </div>
          )}

          {/* FILE — download card */}
          {msg.messageType === "FILE" && (
            <div className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer",
              isOwn ? "bg-[rgba(99,179,255,0.1)] border-[rgba(99,179,255,0.2)] hover:bg-[rgba(99,179,255,0.18)]" : "bg-bg-3 border-white/5 hover:bg-bg-4")}
              onClick={handleDownload}>
              <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#63b3ff" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[0.78rem] text-slate-200 font-medium truncate">{msg.mediaName ?? "File"}</div>
                {msg.mediaSize && <div className="text-[0.63rem] text-slate-500">{formatSize(msg.mediaSize)}</div>}
              </div>
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
            </div>
          )}

          {!showHeader && <div className="text-[0.58rem] text-slate-600 px-1">{formatTime(msg.createdAt)}</div>}
        </div>
      </div>
    </>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 pl-12 py-1">
      <div className="flex gap-1 items-center">
        {[0,1,2].map(i => <span key={i} className="w-[5px] h-[5px] rounded-full bg-accent-blue opacity-50 animate-typing" style={{ animationDelay: `${i*0.2}s` }} />)}
      </div>
      <span className="text-[0.7rem] text-slate-500 italic">{name} is typing…</span>
    </div>
  );
}

// ── Profile Panel ─────────────────────────────────────────────────────────────
function ProfilePanel({ user, isOnline, onClose, token, currentUserId, onStartChat }: {
  user: PublicUser; isOnline: boolean; onClose: () => void;
  token: string; currentUserId: string;
  onStartChat: (convId: string) => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus]         = useState(user.friendStatus);
  const name = user.displayName ?? user.username;

  const sendRequest = async () => {
    setRequesting(true);
    try {
      const res  = await fetch("/api/friends/request", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ receiverId: user.id }) });
      const data = await res.json();
      if (data.success) setStatus("pending_sent");
    } finally { setRequesting(false); }
  };

  const startChat = async () => {
    const res  = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ friendId: user.id }) });
    const data = await res.json();
    if (data.success) onStartChat(data.data.conversationId);
  };

  return (
    <div className="w-[280px] flex-shrink-0 bg-bg-2 border-l border-white/5 flex flex-col overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-[0.75rem] font-semibold text-slate-400">Profile</span>
        <button onClick={onClose} className="w-6 h-6 rounded-lg bg-bg-4 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {/* Hero */}
      <div className="flex flex-col items-center px-5 pt-6 pb-5 border-b border-white/5" style={{ background: "linear-gradient(180deg, rgba(99,179,255,0.04) 0%, transparent 100%)" }}>
        <Avatar user={user} size="lg" status={isOnline ? "online" : "offline"} />
        <div className="mt-3 font-display font-bold text-[1rem] text-slate-100 text-center">{name}</div>
        <div className="text-[0.7rem] text-slate-500 mt-0.5">@{user.username}</div>
        {user.bio && <p className="text-[0.73rem] text-slate-400 text-center mt-2 leading-relaxed">{user.bio}</p>}
        <div className={cn("mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-medium border",
          isOnline ? "bg-accent-green/10 border-accent-green/20 text-accent-green" : "bg-slate-600/10 border-slate-600/20 text-slate-500")}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {isOnline ? "Active now" : "Offline"}
        </div>
        {/* Actions */}
        <div className="flex gap-2 mt-4 w-full">
          {status === "friends" && (
            <button onClick={startChat} className="flex-1 py-2 rounded-xl text-[0.75rem] font-semibold text-white bg-gradient-accent hover:opacity-90 transition-opacity">
              Message
            </button>
          )}
          {status === "none" && (
            <button onClick={sendRequest} disabled={requesting} className="flex-1 py-2 rounded-xl border border-accent-blue/30 text-accent-blue text-[0.75rem] font-medium hover:bg-accent-blue/10 transition-colors disabled:opacity-50">
              {requesting ? "Sending…" : "Add Friend"}
            </button>
          )}
          {status === "pending_sent" && (
            <div className="flex-1 py-2 rounded-xl border border-white/10 text-slate-500 text-[0.75rem] text-center">Request Sent</div>
          )}
          {status === "pending_received" && (
            <div className="flex-1 py-2 rounded-xl border border-accent-green/30 text-accent-green text-[0.75rem] text-center">Sent you a request</div>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {user.role && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg-3 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-bg-4 flex items-center justify-center text-sm flex-shrink-0">💼</div>
            <div><div className="text-[0.6rem] text-slate-600 font-mono mb-0.5">ROLE</div><div className="text-[0.78rem] text-slate-200">{user.role}</div></div>
          </div>
        )}
        {user.location && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg-3 border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-bg-4 flex items-center justify-center text-sm flex-shrink-0">📍</div>
            <div><div className="text-[0.6rem] text-slate-600 font-mono mb-0.5">LOCATION</div><div className="text-[0.78rem] text-slate-200">{user.location}</div></div>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg-3 border border-white/5">
          <div className="w-7 h-7 rounded-lg bg-bg-4 flex items-center justify-center text-sm flex-shrink-0">👤</div>
          <div><div className="text-[0.6rem] text-slate-600 font-mono mb-0.5">USERNAME</div><div className="text-[0.78rem] text-slate-200">@{user.username}</div></div>
        </div>
      </div>
    </div>
  );
}

// ── Sticker picker ────────────────────────────────────────────────────────────
const STICKERS = ["😀","😂","🥰","😎","🤩","😭","🥺","😤","🤔","👍","🔥","💯","❤️","🎉","✨","👀","🙌","💪","🫡","🤝"];

// ── Main Chat Page ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const { user: currentUser, token, ready, logout } = useAuth();

  // Conversations & friends
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [activeConvId,  setActiveConvId]      = useState<string | null>(null);
  const [friendRequests, setFriendRequests]   = useState<FriendRequest[]>([]);
  const [onlineUsers,    setOnlineUsers]      = useState<Set<string>>(new Set());

  // UI state
  const [search,       setSearch]       = useState("");
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [profileUser,  setProfileUser]  = useState<PublicUser | null>(null);
  const [tab,          setTab]          = useState<"chats" | "requests">("chats");
  const [typingUsers,  setTypingUsers]  = useState<Map<string, string>>(new Map());
  const [showStickers, setShowStickers] = useState(false);
  const [msgInput,     setMsgInput]     = useState("");
  const [sending,      setSending]      = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { messages, loading: msgsLoading, addMessage } = useMessages(activeConvId, token);

  // Redirect if not authed
  useEffect(() => { if (ready && !currentUser) router.push("/login"); }, [ready, currentUser, router]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    const res  = await fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setConversations(data.data);
  }, [token]);

  // Load friend requests
  const loadRequests = useCallback(async () => {
    if (!token) return;
    const res  = await fetch("/api/friends/request", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setFriendRequests(data.data);
  }, [token]);

  useEffect(() => {
    loadConversations();
    loadRequests();
    // Poll every 30s as fallback (WS handles real-time)
    const poll = setInterval(() => { loadConversations(); loadRequests(); }, 30_000);
    return () => clearInterval(poll);
  }, [loadConversations, loadRequests]);

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg: WSServerMsg) => {
    switch (msg.type) {
      case "connected":
        if (msg.onlineUsers) setOnlineUsers(new Set(msg.onlineUsers));
        break;
      case "new_message":
        // Only add if it's for the active conversation
        addMessage(msg.message);
        setConversations(p =>
          p.map(c => c.id === msg.message.conversationId
            ? { ...c, lastMessage: msg.message, updatedAt: new Date().toISOString(),
                unreadCount: c.id !== activeConvId ? c.unreadCount + 1 : c.unreadCount }
            : c
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        break;
      case "typing":
        if (msg.conversationId === activeConvId) {
          setTypingUsers(p => {
            const next = new Map(p);
            if (msg.isTyping) next.set(msg.userId, msg.username);
            else next.delete(msg.userId);
            return next;
          });
        }
        break;
      case "presence":
        setOnlineUsers(p => {
          const next = new Set(p);
          if (msg.status === "online") next.add(msg.userId);
          else next.delete(msg.userId);
          return next;
        });
        break;
      case "friend_request":
        setFriendRequests(p => [msg.request as any, ...p]);
        setTab("requests");
        break;
      case "message_read":
        // Could mark messages as read in UI
        break;
    }
  }, [activeConvId, addMessage]);

  const { status: wsStatus, send: wsSend } = useWebSocket(token, handleWsMessage);

  // Join conversation channel when switching chats
  useEffect(() => {
    if (wsStatus === "connected" && activeConvId) {
      wsSend({ type: "join_conversation", conversationId: activeConvId } as any);
    }
  }, [wsStatus, activeConvId, wsSend]);

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Search users
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
      } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, token]);

  // Handle friend request accept/reject
  const handleRequest = async (reqId: string, action: "accept" | "reject") => {
    await fetch(`/api/friends/${reqId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action }) });
    setFriendRequests(p => p.filter(r => r.id !== reqId));
    if (action === "accept") { loadConversations(); }
  };

  // Open DM with a friend
  const openDM = async (friendId: string) => {
    const res  = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ friendId }) });
    const data = await res.json();
    if (data.success) {
      setActiveConvId(data.data.conversationId);
      await loadConversations();
      setSearch("");
      setSearchResults([]);
      setProfileUser(null);
    }
  };

  // Send message
  const sendMessage = async (content: string, type: MessageType = "TEXT", mediaUrl?: string, mediaName?: string, mediaSize?: number) => {
    if (!activeConvId || !token || sending) return;
    setSending(true);
    try {
      // Use WebSocket for text messages (fast), HTTP for media (reliable for large files)
      if (type === "TEXT" && wsStatus === "connected" && !mediaUrl) {
        wsSend({ type: "send_message", conversationId: activeConvId, content, messageType: type });
        setSending(false);
        return;
      }
      // HTTP fallback for media or when WS is down
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: activeConvId, content: content || null, messageType: type, mediaUrl, mediaName, mediaSize }),
      });
      const data = await res.json();
      if (data.success) {
        addMessage(data.data);
        setConversations(p => p.map(c => c.id === activeConvId ? { ...c, lastMessage: data.data, updatedAt: new Date().toISOString() } : c).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      }
    } finally { setSending(false); }
  };

  const handleSend = async () => {
    const content = msgInput.trim();
    if (!content || sending) return;
    setMsgInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // File upload — base64 for demo (in production, use S3 presigned URL)
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: MessageType) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    setMediaUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        await sendMessage("", type, dataUrl, file.name, file.size);
        setMediaUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setMediaUploading(false); }
    e.target.value = "";
  };

  // Typing indicator with WS events
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMsgInput(e.target.value);
    const el = inputRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
    // Send typing_start
    if (activeConvId && wsStatus === "connected") {
      wsSend({ type: "typing_start", conversationId: activeConvId });
    }
    clearTimeout(typingTimerRef.current);
    // Send typing_stop after 2s of inactivity
    typingTimerRef.current = setTimeout(() => {
      if (activeConvId && wsStatus === "connected") {
        wsSend({ type: "typing_stop", conversationId: activeConvId });
      }
    }, 2000);
  };

  const activeConv   = conversations.find(c => c.id === activeConvId);
  const activeFriend = activeConv?.friend;
  const isTyping     = typingUsers.size > 0;
  const typingName   = Array.from(typingUsers.values()).join(", ");

  // Group messages by sender + day
  const grouped = messages.reduce<Array<{ type: "day"; label: string } | { type: "msg"; msg: ChatMessage; showHeader: boolean }>>((acc, msg, i) => {
    const prev    = messages[i-1];
    const day     = formatDate(msg.createdAt);
    const prevDay = prev ? formatDate(prev.createdAt) : null;
    if (day !== prevDay) acc.push({ type: "day", label: day });
    const showHeader = !prev || prev.senderId !== msg.senderId || day !== prevDay || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 300_000;
    acc.push({ type: "msg", msg, showHeader });
    return acc;
  }, []);

  if (!ready || !currentUser) return null;

  return (
    <div className="h-full flex overflow-hidden bg-bg">

      {/* ══ LEFT SIDEBAR ══ */}
      <div className="w-[300px] flex-shrink-0 bg-bg-2 border-r border-white/5 flex flex-col">
        {/* Logo + user */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-[1.1rem] text-gradient">NexChat</span>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", wsStatus === "connected" ? "bg-accent-green animate-pulse-dot" : "bg-slate-600")} title={wsStatus} />
            </div>
            <div className="flex items-center gap-1.5">
              {/* Notifications badge */}
              <button onClick={() => setTab("requests")} className={cn("relative w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                tab === "requests" ? "bg-accent-blue/20 text-accent-blue" : "text-slate-500 hover:bg-bg-4 hover:text-slate-300")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {friendRequests.length > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-accent-pink border-2 border-bg-2 text-[0.42rem] font-bold text-white flex items-center justify-center">{friendRequests.length}</span>}
              </button>
              <button onClick={logout} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>

          {/* Current user chip */}
          <button onClick={() => setProfileUser({ ...currentUser, friendStatus: "friends" })}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-bg-3 border border-white/5 hover:border-white/10 transition-colors">
            <Avatar user={currentUser} size="sm" status="online" />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[0.82rem] font-semibold text-slate-200 truncate">{currentUser.displayName ?? currentUser.username}</div>
              <div className="text-[0.65rem] text-accent-green">● Active</div>
            </div>
          </button>

          {/* Search */}
          <div className="mt-2.5 relative">
            <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-bg-3 border border-white/5 focus-within:border-accent-blue/30 transition-colors">
              <svg className="text-slate-600 flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username…"
                className="flex-1 bg-transparent text-[0.8rem] text-slate-300 placeholder:text-slate-600 outline-none" />
              {search && <button onClick={() => { setSearch(""); setSearchResults([]); }} className="text-slate-600 hover:text-slate-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>}
            </div>
            {/* Search results dropdown */}
            {(searchResults.length > 0 || searching) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-4 border border-white/10 rounded-xl overflow-hidden z-50 shadow-glass">
                {searching && <div className="px-3 py-2 text-[0.75rem] text-slate-500 text-center">Searching…</div>}
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => { setProfileUser(u); setSearch(""); setSearchResults([]); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-bg-4 transition-colors">
                    <Avatar user={u} size="sm" status={onlineUsers.has(u.id) ? "online" : "offline"} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[0.82rem] font-medium text-slate-200 truncate">{u.displayName ?? u.username}</div>
                      <div className="text-[0.68rem] text-slate-500">@{u.username}</div>
                    </div>
                    <span className={cn("text-[0.62rem] px-1.5 py-0.5 rounded-full border",
                      u.friendStatus === "friends" ? "text-accent-green border-accent-green/20" :
                      u.friendStatus === "pending_sent" ? "text-slate-500 border-slate-600/30" : "text-accent-blue border-accent-blue/20")}>
                      {u.friendStatus === "friends" ? "Friends" : u.friendStatus === "pending_sent" ? "Sent" : "Add"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab: Chats or Requests */}
        <div className="flex border-b border-white/5">
          {(["chats","requests"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2.5 text-[0.73rem] font-medium capitalize transition-colors relative",
                tab === t ? "text-accent-blue" : "text-slate-500 hover:text-slate-300")}>
              {t === "requests" ? `Requests${friendRequests.length ? ` (${friendRequests.length})` : ""}` : "Chats"}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-accent rounded-t-full" />}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === "chats" && (
            <>
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                  <div className="text-3xl">🔍</div>
                  <p className="text-[0.8rem] text-slate-500">Search for users above to start a conversation</p>
                </div>
              )}
              {conversations.map(conv => {
                const isActive  = conv.id === activeConvId;
                const isOnline  = onlineUsers.has(conv.friend.id);
                const lastMsg   = conv.lastMessage;
                const name      = conv.friend.displayName ?? conv.friend.username;
                return (
                  <button key={conv.id} onClick={() => { setActiveConvId(conv.id); setProfileUser(null); }}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors relative",
                      isActive && "bg-accent-blue/[0.06]")}>
                    {isActive && <span className="absolute left-0 top-[20%] bottom-[20%] w-0.5 rounded-r bg-gradient-accent" />}
                    <Avatar user={conv.friend} size="md" status={isOnline ? "online" : "offline"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[0.83rem] font-semibold text-slate-200 truncate">{name}</span>
                        {lastMsg && <span className="text-[0.62rem] text-slate-600 ml-1 flex-shrink-0">{formatTime(lastMsg.createdAt)}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[0.72rem] truncate", lastMsg ? "text-slate-500" : "text-slate-600")}>
                          {lastMsg ? (lastMsg.messageType === "TEXT" ? (lastMsg.content ?? "") : `📎 ${lastMsg.messageType.toLowerCase()}`) : "No messages yet"}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-1 flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-accent-blue text-white text-[0.52rem] font-bold flex items-center justify-center px-1">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
          {tab === "requests" && (
            <div className="p-3 space-y-2">
              {friendRequests.length === 0 && (
                <div className="text-center text-[0.78rem] text-slate-600 py-8">No pending requests</div>
              )}
              {friendRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-3 border border-white/5">
                  <Avatar user={req.sender} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-medium text-slate-200 truncate">{req.sender.displayName ?? req.sender.username}</div>
                    <div className="text-[0.68rem] text-slate-500">@{req.sender.username}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRequest(req.id, "accept")} className="px-2.5 py-1 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-[0.68rem] font-medium hover:bg-accent-green/20 transition-colors">Accept</button>
                    <button onClick={() => handleRequest(req.id, "reject")} className="px-2.5 py-1 rounded-lg bg-bg-4 border border-white/5 text-slate-500 text-[0.68rem] hover:text-slate-300 transition-colors">Ignore</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ MESSAGE PANEL ══ */}
      {activeConvId && activeFriend ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="h-[52px] flex-shrink-0 bg-bg-2 border-b border-white/5 flex items-center px-5 gap-3">
            <Avatar user={activeFriend} size="sm" status={onlineUsers.has(activeFriend.id) ? "online" : "offline"} />
            <div>
              <div className="text-[0.88rem] font-display font-bold text-slate-100">{activeFriend.displayName ?? activeFriend.username}</div>
              <div className={cn("text-[0.65rem]", onlineUsers.has(activeFriend.id) ? "text-accent-green" : "text-slate-500")}>
                {onlineUsers.has(activeFriend.id) ? "● Active now" : "○ Offline"}
              </div>
            </div>
            <div className="ml-auto">
              {/* Click avatar icon to open profile */}
              <button onClick={() => setProfileUser(profileUser ? null : { ...activeFriend, friendStatus: "friends" })}
                className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                  profileUser ? "bg-accent-blue/12 text-accent-blue border-accent-blue/25" : "bg-bg-3 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-0.5">
            {msgsLoading && <div className="text-center text-slate-600 text-[0.8rem] py-8">Loading messages…</div>}
            {!msgsLoading && messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
                <div className="text-4xl">👋</div>
                <div className="text-slate-400 text-[0.9rem] font-medium">Say hello to {activeFriend.displayName ?? activeFriend.username}!</div>
              </div>
            )}
            {grouped.map((item, i) =>
              item.type === "day" ? (
                <div key={i} className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[0.58rem] font-mono text-slate-600 uppercase tracking-widest">{item.label}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              ) : (
                <Bubble key={item.msg.id} msg={item.msg} isOwn={item.msg.senderId === currentUser.id} showHeader={item.showHeader} />
              )
            )}
            {isTyping && <TypingDots name={typingName} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-white/5 bg-bg-2">
            {/* Sticker picker */}
            {showStickers && (
              <div className="mb-2 p-3 rounded-xl bg-bg-3 border border-white/10 flex flex-wrap gap-2">
                {STICKERS.map(s => (
                  <button key={s} onClick={() => { sendMessage(s, "TEXT"); setShowStickers(false); }}
                    className="text-xl hover:scale-125 transition-transform">{s}</button>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-white/10 bg-bg-3 focus-within:border-accent-blue/30 transition-colors overflow-hidden">
              <div className="flex items-end gap-2 px-3 pt-2.5">
                <textarea ref={inputRef} value={msgInput} onChange={handleInputChange} onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeFriend.displayName ?? activeFriend.username}…`} rows={1}
                  className="flex-1 bg-transparent text-[0.85rem] text-slate-200 placeholder:text-slate-600 resize-none outline-none leading-relaxed min-h-[22px] max-h-[120px]" />
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
                <div className="flex gap-0.5">
                  {/* Emoji/Sticker */}
                  <button onClick={() => setShowStickers(p => !p)} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                    showStickers ? "text-accent-blue bg-accent-blue/10" : "text-slate-600 hover:text-slate-300 hover:bg-bg-4")}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </button>
                  {/* Image */}
                  <button onClick={() => { fileInputRef.current && (fileInputRef.current.accept = "image/*", fileInputRef.current.onchange = (e) => handleFile(e as any, "IMAGE"), fileInputRef.current.click()); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-bg-4 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </button>
                  {/* Video */}
                  <button onClick={() => { fileInputRef.current && (fileInputRef.current.accept = "video/*", fileInputRef.current.onchange = (e) => handleFile(e as any, "VIDEO"), fileInputRef.current.click()); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-bg-4 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </button>
                  {/* Audio */}
                  <button onClick={() => { fileInputRef.current && (fileInputRef.current.accept = "audio/*", fileInputRef.current.onchange = (e) => handleFile(e as any, "AUDIO"), fileInputRef.current.click()); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-bg-4 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </button>
                  {/* File */}
                  <button onClick={() => { fileInputRef.current && (fileInputRef.current.accept = "*/*", fileInputRef.current.onchange = (e) => handleFile(e as any, "FILE"), fileInputRef.current.click()); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-bg-4 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                </div>
                <button onClick={handleSend} disabled={!msgInput.trim() || sending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[0.78rem] font-semibold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#63b3ff,#a78bfa)" }}>
                  {mediaUploading ? "Uploading…" : sending ? "Sending…" : <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Send
                  </>}
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" />
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-bg">
          <div className="w-20 h-20 rounded-2xl bg-bg-3 border border-white/5 flex items-center justify-center text-4xl">💬</div>
          <div className="text-center">
            <div className="text-slate-300 text-[1rem] font-semibold mb-1">Your messages</div>
            <div className="text-slate-600 text-[0.8rem]">Search for a user to start chatting</div>
          </div>
        </div>
      )}

      {/* ══ RIGHT PROFILE PANEL — only when profileUser is set ══ */}
      {profileUser && (
        <ProfilePanel
          user={profileUser}
          isOnline={onlineUsers.has(profileUser.id)}
          onClose={() => setProfileUser(null)}
          token={token!}
          currentUserId={currentUser.id}
          onStartChat={(convId) => { setActiveConvId(convId); setProfileUser(null); loadConversations(); }}
        />
      )}
    </div>
  );
}
