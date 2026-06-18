"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import AdminPanel from "@/components/AdminPanel";
import type {
  AvailableUser,
  Contact,
  ConversationDetail,
  Notification,
} from "@/types";
import { de } from "@/lib/de";

const POLL_INTERVAL = 3000;

export default function PlatformClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadNotificationCount(data.unreadCount);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    const res = await fetch("/api/contacts");
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setAvailableUsers(data.users);
    }
  }, []);

  const fetchConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveConversation(data.conversation);
      fetchNotifications();
      fetchContacts();
    }
  }, [fetchNotifications, fetchContacts]);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setCurrentUserName(data.user.name);
      setIsAdmin(data.user.isAdmin === true);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchNotifications();
    fetchContacts();
    fetchAvailableUsers();
  }, [fetchUser, fetchNotifications, fetchContacts, fetchAvailableUsers]);

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
      fetchContacts();
      if (activeConversationId) {
        fetchConversation(activeConversationId);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [
    activeConversationId,
    fetchNotifications,
    fetchContacts,
    fetchConversation,
  ]);

  async function openChatWithContact(contactUserId: string) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactUserId }),
    });

    if (res.ok) {
      const data = await res.json();
      setActiveConversationId(data.conversation.id);
      fetchContacts();
    }
  }

  function handleSelectNotification(conversationId: string) {
    setShowAdminPanel(false);
    setActiveConversationId(conversationId);
  }

  function handleSelectContact(contactUserId: string) {
    setShowAdminPanel(false);
    openChatWithContact(contactUserId);
  }

  function handleOpenAdminPanel() {
    setShowAdminPanel(true);
    setActiveConversationId(null);
    setActiveConversation(null);
  }

  function handleToggleAddContact() {
    setShowAddContact((prev) => !prev);
    setAddContactError("");
    setSelectedUserId("");
    if (!showAddContact) {
      fetchAvailableUsers();
    }
  }

  async function handleAddContact() {
    if (!selectedUserId) return;

    setAddingContact(true);
    setAddContactError("");

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddContactError(data.error || de.contacts.addError);
        return;
      }

      setShowAddContact(false);
      setSelectedUserId("");
      await fetchContacts();
      await fetchAvailableUsers();
      await openChatWithContact(data.contact.user.id);
    } catch {
      setAddContactError(de.contacts.addError);
    } finally {
      setAddingContact(false);
    }
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
      fetchContacts();
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        notifications={notifications}
        contacts={contacts}
        unreadNotificationCount={unreadNotificationCount}
        activeConversationId={activeConversationId}
        currentUserName={currentUserName}
        availableUsers={availableUsers}
        showAddContact={showAddContact}
        addingContact={addingContact}
        addContactError={addContactError}
        selectedUserId={selectedUserId}
        onSelectContact={handleSelectContact}
        onSelectNotification={handleSelectNotification}
        onToggleAddContact={handleToggleAddContact}
        onSelectedUserChange={setSelectedUserId}
        onAddContact={handleAddContact}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        showAdminPanel={showAdminPanel}
        onOpenAdminPanel={handleOpenAdminPanel}
      />
      {showAdminPanel && isAdmin ? (
        <AdminPanel />
      ) : (
        <ChatArea
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
