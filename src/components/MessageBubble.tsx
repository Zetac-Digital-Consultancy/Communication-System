"use client";

import { useEffect, useRef } from "react";
import { de } from "@/lib/de";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOwn = message.isOwn;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          isOwn
            ? "bg-brand-600 text-white rounded-br-md"
            : "bg-white text-slate-900 border border-slate-100 rounded-bl-md"
        )}
      >
        {message.type === "TEXT" && message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {message.type === "IMAGE" && message.fileUrl && (
          <div className="space-y-2">
            <img
              src={message.fileUrl}
              alt={message.fileName || de.chat.image}
              className="max-w-full rounded-lg max-h-80 object-cover"
            />
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        )}

        {message.type === "VIDEO" && message.fileUrl && (
          <div className="space-y-2">
            <video
              src={message.fileUrl}
              controls
              className="max-w-full rounded-lg max-h-80"
            >
              Ihr Browser unterstützt keine Videowiedergabe.
            </video>
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        )}

        <p
          className={cn(
            "text-xs mt-1",
            isOwn ? "text-brand-200" : "text-slate-400"
          )}
        >
          {formatMessageTime(new Date(message.createdAt))}
        </p>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">{de.chat.noMessages}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
