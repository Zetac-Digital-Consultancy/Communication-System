"use client";

import { MessageSquare, Bell, LogOut } from "lucide-react";
import { de } from "@/lib/de";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { Notification } from "@/types";

interface SidebarProps {
  notifications: Notification[];
  unreadNotificationCount: number;
  activeConversationId: string | null;
  currentUserName: string;
  onSelectNotification: (conversationId: string) => void;
  onLogout: () => void;
}

export default function Sidebar({
  notifications,
  unreadNotificationCount,
  activeConversationId,
  currentUserName,
  onSelectNotification,
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
          <p className="text-sm text-slate-400 text-center py-8 px-4">
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
      </div>
    </aside>
  );
}
