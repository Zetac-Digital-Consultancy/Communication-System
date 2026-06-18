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
}

export interface ConversationDetail {
  id: string;
  otherUser: User;
  messages: Message[];
}
