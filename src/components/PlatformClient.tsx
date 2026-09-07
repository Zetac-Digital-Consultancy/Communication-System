"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import AdminPanel from "@/components/AdminPanel";
import CalendarModal from "@/components/CalendarModal";
import type {
  AvailableUser,
  Contact,
  ConversationDetail,
  Notification,
} from "@/types";
import { de } from "@/lib/de";

const POLL_INTERVAL = 3000;

async function fetchData(url: string) {
  const response = await fetch(url).catch(() => new Response(null, { status: 503 }));
  if (response.status === 401) window.location.replace("/login");
  return response;
}

export default function PlatformClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fetchingConversations = useRef(new Set<string>());
  const chatSelection = useRef(0);
  const [currentUserName, setCurrentUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isKunde, setIsKunde] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  // null = closed; { userId: null } = own calendar (editable)
  const [calendarTarget, setCalendarTarget] = useState<{
    userId: string | null;
    userName: string | null;
  } | null>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetchData("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadNotificationCount(data.unreadCount);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    const res = await fetchData("/api/contacts");
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    const res = await fetchData("/api/users");
    if (res.ok) {
      const data = await res.json();
      setAvailableUsers(data.users);
    }
  }, []);

  const fetchConversation = useCallback(async (id: string) => {
    if (fetchingConversations.current.has(id)) return;
    fetchingConversations.current.add(id);
    try {
      const res = await fetchData(`/api/conversations/${id}`);
      if (activeIdRef.current !== id) return;
      if (res.ok) {
        const data = await res.json();
        if (activeIdRef.current !== id) return;
        setActiveConversation(data.conversation);
        setConversationError(null);
      } else if (res.status === 403 || res.status === 404) {
        const data = await res.json().catch(() => ({}));
        if (activeIdRef.current !== id) return;
        setConversationError(data.error || de.errors.generic);
        setActiveConversationId(null);
      } else {
        setConversationError("Verbindung unterbrochen. Ihr Entwurf bleibt erhalten. Erneuter Versuch folgt.");
      }
    } catch {
      if (activeIdRef.current === id) setConversationError("Verbindung unterbrochen. Ihr Entwurf bleibt erhalten. Erneuter Versuch folgt.");
    } finally {
      fetchingConversations.current.delete(id);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    const res = await fetchData("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setCurrentUserName(data.user.name);
      setIsAdmin(data.user.isAdmin === true);
      setIsKunde(data.user.userType === "KUNDE");
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
    let cancelled = false;
    let polling = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (cancelled || polling) return;
      polling = true;
      try {
        if (!document.hidden) {
          await Promise.allSettled([
            fetchNotifications(), fetchContacts(),
            ...(activeConversationId ? [fetchConversation(activeConversationId)] : []),
          ]);
        }
      } finally {
        polling = false;
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL);
      }
    }
    function onVisible() {
      if (!document.hidden) { clearTimeout(timer); void poll(); }
    }
    timer = setTimeout(poll, POLL_INTERVAL);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    activeConversationId,
    fetchNotifications,
    fetchContacts,
    fetchConversation,
  ]);

  async function openChatWithContact(contactUserId: string) {
    const selection = ++chatSelection.current;
    setActionError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactUserId }),
      });

      const data = await res.json().catch(() => ({}));
      if (selection !== chatSelection.current) return;
      if (!res.ok) throw new Error(data.error || de.errors.generic);
      if (activeIdRef.current !== data.conversation.id) setActiveConversation(null);
      setActiveConversationId(data.conversation.id);
      void fetchContacts();
    } catch (error) {
      if (selection === chatSelection.current) setActionError(error instanceof Error ? error.message : de.errors.generic);
    }
  }

  function handleSelectNotification(conversationId: string) {
    chatSelection.current++;
    setActionError(null);
    if (activeConversationId !== conversationId) setActiveConversation(null);
    setShowAdminPanel(false);
    setActiveConversationId(conversationId);
  }

  function handleSelectContact(contactUserId: string) {
    setShowAdminPanel(false);
    openChatWithContact(contactUserId);
  }

  function handleOpenAdminPanel() {
    chatSelection.current++;
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
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setActionError("Abmelden fehlgeschlagen. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.");
    }
  }

  async function handleSendMessage(
    content: string,
    type: "TEXT" | "IMAGE" | "VIDEO",
    fileUrl?: string,
    fileName?: string
  ) {
    if (!activeConversationId) throw new Error(de.errors.generic);

    const res = await fetch(`/api/conversations/${activeConversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type, fileUrl, fileName }),
    });

    if (res.ok) {
      const data = await res.json();
      setActiveConversation((prev) =>
        prev && prev.id === activeConversationId && !prev.messages.some((m) => m.id === data.message.id)
          ? { ...prev, messages: [...prev.messages, data.message] }
          : prev
      );
      fetchContacts();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || de.errors.generic);
    }
  }

  const showChatPane = showAdminPanel || activeConversationId !== null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {(actionError || conversationError) && <p role="alert" className="shrink-0 bg-red-50 text-red-700 px-4 py-2 text-sm">{actionError || conversationError}</p>}
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
        onOpenOwnCalendar={
          isKunde
            ? () => setCalendarTarget({ userId: null, userName: null })
            : undefined
        }
        hiddenOnMobile={showChatPane}
        isAdmin={isAdmin}
        showAdminPanel={showAdminPanel}
        onOpenAdminPanel={handleOpenAdminPanel}
      />
      {showAdminPanel && isAdmin ? (
        <AdminPanel
          onBack={() => setShowAdminPanel(false)}
          onOpenCalendar={(userId, userName) =>
            setCalendarTarget({ userId, userName })
          }
        />
      ) : (
        <ChatArea
          key={activeConversationId ?? "empty"}
          error={conversationError}
          conversation={activeConversation}
          loading={activeConversationId !== null && activeConversation === null}
          onSendMessage={handleSendMessage}
          onBack={() => setActiveConversationId(null)}
          onOpenCalendar={(userId, userName) =>
            setCalendarTarget({ userId, userName })
          }
        />
      )}
      {calendarTarget && (
        <CalendarModal
          userId={calendarTarget.userId}
          userName={calendarTarget.userName}
          onClose={() => setCalendarTarget(null)}
        />
      )}
      </div>
    </div>
  );
}
