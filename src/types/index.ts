export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Message {
  id: string;
  content: string | null;
  type: "TEXT" | "IMAGE" | "VIDEO";
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  senderId: string;
  senderName: string;
  isOwn: boolean;
}

export interface Notification {
  id: string;
  conversationId: string;
  senderName: string;
  preview: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  createdAt: string;
  unreadCount: number;
  contactUserId: string;
}

export interface Contact {
  id: string;
  user: User;
  conversationId: string | null;
  lastMessage: {
    preview: string;
    createdAt: string;
    isOwn: boolean;
  } | null;
  unreadCount: number;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

export interface ConversationDetail {
  id: string;
  otherUser: User;
  messages: Message[];
}
