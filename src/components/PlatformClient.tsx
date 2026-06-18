"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import type { ConversationDetail, Notification } from "@/types";

const POLL_INTERVAL = 3000;

export default function PlatformClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadNotificationCount(data.unreadCount);
    }
  }, []);

  const fetchConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveConversation(data.conversation);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setCurrentUserName(data.user.name);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchNotifications();
  }, [fetchUser, fetchNotifications]);

  useEffect(() => {
    if (activeConversationId) {
      fetchConversation(activeConversationId);
    } else {
      setActiveConversation(null);
    }
  }, [activeConversationId, fetchConversation]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
      if (activeConversationId) {
        fetchConversation(activeConversationId);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeConversationId, fetchNotifications, fetchConversation]);

  function handleSelectNotification(conversationId: string) {
    setActiveConversationId(conversationId);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleSendMessage(
    content: string,
    type: "TEXT" | "IMAGE" | "VIDEO",
    fileUrl?: string,
    fileName?: string
  ) {
    if (!activeConversationId) return;

    const res = await fetch(`/api/conversations/${activeConversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type, fileUrl, fileName }),
    });

    if (res.ok) {
      const data = await res.json();
      setActiveConversation((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, data.message] }
          : prev
      );
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
        activeConversationId={activeConversationId}
        currentUserName={currentUserName}
        onSelectNotification={handleSelectNotification}
        onLogout={handleLogout}
      />
      <ChatArea
        conversation={activeConversation}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
