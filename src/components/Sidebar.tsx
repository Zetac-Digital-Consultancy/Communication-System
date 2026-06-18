"use client";

import { useState } from "react";
import { MessageSquare, Bell, LogOut, UserPlus, Users } from "lucide-react";
import { de } from "@/lib/de";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { Contact, Notification, AvailableUser } from "@/types";

interface SidebarProps {
  notifications: Notification[];
  contacts: Contact[];
  unreadNotificationCount: number;
  activeConversationId: string | null;
  currentUserName: string;
  availableUsers: AvailableUser[];
  showAddContact: boolean;
  addingContact: boolean;
  addContactError: string;
  selectedUserId: string;
  onSelectContact: (contactUserId: string) => void;
  onSelectNotification: (conversationId: string) => void;
  onToggleAddContact: () => void;
  onSelectedUserChange: (userId: string) => void;
  onAddContact: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  notifications,
  contacts,
  unreadNotificationCount,
  activeConversationId,
  currentUserName,
  availableUsers,
  showAddContact,
  addingContact,
  addContactError,
  selectedUserId,
  onSelectContact,
  onSelectNotification,
  onToggleAddContact,
  onSelectedUserChange,
  onAddContact,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 text-sm truncate">
              {de.app.name}
            </h1>
            <p className="text-xs text-slate-500 truncate">{currentUserName}</p>
          </div>
          <button
            onClick={onLogout}
            title={de.sidebar.logout}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium bg-white text-slate-900 shadow-sm relative">
            <Bell className="w-4 h-4" />
            {de.sidebar.notifications}
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 px-4">
            {de.sidebar.noNotifications}
          </p>
        ) : (
          <ul>
            {notifications.map((notif) => (
              <li key={notif.id}>
                <button
                  onClick={() => onSelectNotification(notif.conversationId)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-50",
                    activeConversationId === notif.conversationId &&
                      "bg-brand-50 hover:bg-brand-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {getInitials(notif.senderName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-slate-900 truncate">
                        {notif.senderName}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatRelativeTime(new Date(notif.createdAt))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {notif.preview}
                      </p>
                      {notif.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                          {notif.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">
              {de.sidebar.contacts}
            </span>
          </div>
          <button
            onClick={onToggleAddContact}
            title={de.sidebar.addContact}
            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {showAddContact && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-medium text-slate-700 mb-2">
              {de.sidebar.addContactTitle}
            </p>
            {availableUsers.length === 0 ? (
              <p className="text-xs text-slate-400 mb-2">
                {de.contacts.noUsersAvailable}
              </p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => onSelectedUserChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent mb-2"
              >
                <option value="">{de.sidebar.selectContact}</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            )}
            {addContactError && (
              <p className="text-xs text-red-600 mb-2">{addContactError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onAddContact}
                disabled={!selectedUserId || addingContact}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-xs font-medium py-2 px-3 rounded-lg transition"
              >
                {addingContact ? de.sidebar.adding : de.sidebar.add}
              </button>
              <button
                onClick={onToggleAddContact}
                className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition"
              >
                {de.sidebar.cancel}
              </button>
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 px-4">
            {de.sidebar.noContacts}
          </p>
        ) : (
          <ul>
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  onClick={() => onSelectContact(contact.user.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-50",
                    activeConversationId === contact.conversationId &&
                      "bg-brand-50 hover:bg-brand-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {getInitials(contact.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-slate-900 truncate">
                        {contact.user.name}
                      </span>
                      {contact.lastMessage && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatRelativeTime(
                            new Date(contact.lastMessage.createdAt)
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {contact.lastMessage
                          ? `${contact.lastMessage.isOwn ? `${de.chat.you}: ` : ""}${contact.lastMessage.preview}`
                          : contact.user.email}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
