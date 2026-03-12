export type AvatarColor = "blue" | "purple" | "pink" | "green" | "orange" | "teal";

export interface AuthUser {
  id:          string;
  username:    string;
  displayName: string | null;
  avatarColor: AvatarColor;
  avatarUrl:   string | null;
  bio:         string | null;
  role:        string | null;
  location:    string | null;
}

export interface PublicUser {
  id:          string;
  username:    string;
  displayName: string | null;
  avatarColor: AvatarColor;
  avatarUrl:   string | null;
  bio:         string | null;
  role:        string | null;
  location:    string | null;
  friendStatus: "none" | "pending_sent" | "pending_received" | "friends";
}

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "STICKER";

export interface ChatMessage {
  id:             string;
  conversationId: string;
  senderId:       string;
  content:        string | null;
  messageType:    MessageType;
  mediaUrl:       string | null;
  mediaName:      string | null;
  mediaSize:      number | null;
  isRead:         boolean;
  createdAt:      string;
  sender: {
    id:          string;
    username:    string;
    displayName: string | null;
    avatarColor: AvatarColor;
    avatarUrl:   string | null;
  };
}

export interface Conversation {
  id:        string;
  friend:    PublicUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt:  string;
}

export interface FriendRequest {
  id:        string;
  status:    "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  sender:    PublicUser;
  receiver:  PublicUser;
}

// WebSocket types
export type WSClientMsg =
  | { type: "send_message";  conversationId: string; content: string; messageType?: MessageType; mediaUrl?: string; mediaName?: string; mediaSize?: number }
  | { type: "typing_start";  conversationId: string }
  | { type: "typing_stop";   conversationId: string }
  | { type: "mark_read";     conversationId: string }
  | { type: "ping" };

export type WSServerMsg =
  | { type: "connected";     userId: string; onlineUsers: string[] }
  | { type: "new_message";   message: ChatMessage }
  | { type: "typing";        conversationId: string; userId: string; username: string; isTyping: boolean }
  | { type: "message_read";  conversationId: string; userId: string }
  | { type: "presence";      userId: string; status: "online" | "offline" }
  | { type: "friend_request"; request: FriendRequest }
  | { type: "friend_accepted"; friendship: { userId: string; username: string } }
  | { type: "pong" }
  | { type: "error";         message: string };

export interface ApiOk<T>  { success: true;  data: T }
export interface ApiErr    { success: false; error: string; details?: unknown }
export type ApiRes<T> = ApiOk<T> | ApiErr;

export interface JwtPayload { userId: string; username: string }
