"use client";

import { useState, useRef } from "react";
import {
  Send,
  Image as ImageIcon,
  Video,
  Loader2,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";
import { de } from "@/lib/de";
import { getInitials } from "@/lib/utils";
import { MessageList } from "./MessageBubble";
import type { ConversationDetail } from "@/types";

interface ChatAreaProps {
  conversation: ConversationDetail | null;
  onSendMessage: (
    content: string,
    type: "TEXT" | "IMAGE" | "VIDEO",
    fileUrl?: string,
    fileName?: string
  ) => Promise<void>;
  onBack: () => void;
  onOpenCalendar: (userId: string, userName: string) => void;
}

export default function ChatArea({
  conversation,
  onSendMessage,
  onBack,
  onOpenCalendar,
}: ChatAreaProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!conversation) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {de.chat.selectConversation}
        </h2>
        <p className="text-sm text-slate-400 mt-2 text-center max-w-sm px-4">
          {de.chat.selectConversationHint}
        </p>
      </div>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(text.trim(), "TEXT");
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(file: File, type: "IMAGE" | "VIDEO") {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      alert(data.error || de.errors.uploadFailed);
      return;
    }

    const { fileUrl, fileName } = await uploadRes.json();
    await onSendMessage("", type, fileUrl, fileName);
  }

  async function handleFilesUpload(files: File[], type: "IMAGE" | "VIDEO") {
    setUploading(true);
    try {
      // Sequential upload keeps the order and lets the chat bundle them
      for (const file of files) {
        await handleFileUpload(file, type);
      }
    } catch {
      alert(de.errors.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleFilesUpload(files, "IMAGE");
    e.target.value = "";
  }

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFilesUpload([file], "VIDEO");
    e.target.value = "";
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
      <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
          {getInitials(conversation.otherUser.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900 truncate">
            {conversation.otherUser.name}
          </h2>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            {de.sidebar.online}
          </p>
        </div>
        <button
          onClick={() =>
            onOpenCalendar(conversation.otherUser.id, conversation.otherUser.name)
          }
          title={de.calendar.openCalendar}
          className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
      </header>

      <MessageList messages={conversation.messages} />

      <footer className="bg-white border-t border-slate-200 p-3 md:p-4 shrink-0">
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {de.chat.uploading}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleVideoSelect}
          />

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            title={de.chat.attachImage}
            className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading}
            title={de.chat.attachVideo}
            className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
          >
            <Video className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={de.chat.typeMessage}
              rows={1}
              className="w-full resize-none px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={!text.trim() || sending || uploading}
            className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
