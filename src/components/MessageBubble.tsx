"use client";

import { useEffect, useRef, useState } from "react";
import { de } from "@/lib/de";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import Lightbox, { type LightboxImage } from "./Lightbox";

// Consecutive images from the same sender within this window are bundled
const BUNDLE_WINDOW_MS = 3 * 60 * 1000;
const BUNDLE_PREVIEW_COUNT = 4;

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type OpenLightbox = (images: LightboxImage[], startIndex: number) => void;

interface MessageBubbleProps {
  message: Message;
  onOpenLightbox: OpenLightbox;
}

export default function MessageBubble({
  message,
  onOpenLightbox,
}: MessageBubbleProps) {
  const isOwn = message.isOwn;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
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
              onClick={() =>
                onOpenLightbox(
                  [{ url: message.fileUrl!, name: message.fileName }],
                  0
                )
              }
              className="max-w-full rounded-lg max-h-80 object-cover cursor-pointer"
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

interface ImageBundleBubbleProps {
  messages: Message[];
  onOpenLightbox: OpenLightbox;
}

function ImageBundleBubble({ messages, onOpenLightbox }: ImageBundleBubbleProps) {
  const isOwn = messages[0].isOwn;
  const images: LightboxImage[] = messages.map((m) => ({
    url: m.fileUrl!,
    name: m.fileName,
  }));
  const preview = messages.slice(0, BUNDLE_PREVIEW_COUNT);
  const hiddenCount = messages.length - BUNDLE_PREVIEW_COUNT;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] w-72 rounded-2xl p-1.5 shadow-sm",
          isOwn
            ? "bg-brand-600 rounded-br-md"
            : "bg-white border border-slate-100 rounded-bl-md"
        )}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {preview.map((m, i) => {
            const isLastPreview =
              i === BUNDLE_PREVIEW_COUNT - 1 && hiddenCount > 0;
            return (
              <button
                key={m.id}
                onClick={() => onOpenLightbox(images, i)}
                className="relative aspect-square rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <img
                  src={m.fileUrl!}
                  alt={m.fileName || de.chat.image}
                  className="w-full h-full object-cover"
                />
                {isLastPreview && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-semibold">
                    {de.gallery.morePhotos(hiddenCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p
          className={cn(
            "text-xs mt-1 px-1.5 pb-0.5",
            isOwn ? "text-brand-200" : "text-slate-400"
          )}
        >
          {formatMessageTime(new Date(messages[messages.length - 1].createdAt))}
        </p>
      </div>
    </div>
  );
}

type MessageGroup =
  | { kind: "single"; message: Message }
  | { kind: "images"; messages: Message[] };

function isBundleCandidate(message: Message): boolean {
  return message.type === "IMAGE" && !!message.fileUrl && !message.content;
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];

    if (isBundleCandidate(message) && last && last.kind === "images") {
      const prev = last.messages[last.messages.length - 1];
      const gap =
        new Date(message.createdAt).getTime() -
        new Date(prev.createdAt).getTime();
      if (prev.senderId === message.senderId && gap <= BUNDLE_WINDOW_MS) {
        last.messages.push(message);
        continue;
      }
    }

    if (isBundleCandidate(message)) {
      groups.push({ kind: "images", messages: [message] });
    } else {
      groups.push({ kind: "single", message });
    }
  }

  // Bundles of one image render as a normal message
  return groups.map((g) =>
    g.kind === "images" && g.messages.length === 1
      ? { kind: "single", message: g.messages[0] }
      : g
  );
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{
    images: LightboxImage[];
    startIndex: number;
  } | null>(null);

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

  const openLightbox: OpenLightbox = (images, startIndex) =>
    setLightbox({ images, startIndex });

  const groups = groupMessages(messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {groups.map((group) =>
        group.kind === "images" ? (
          <ImageBundleBubble
            key={group.messages[0].id}
            messages={group.messages}
            onOpenLightbox={openLightbox}
          />
        ) : (
          <MessageBubble
            key={group.message.id}
            message={group.message}
            onOpenLightbox={openLightbox}
          />
        )
      )}
      <div ref={bottomRef} />

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
