"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { de } from "@/lib/de";

export interface LightboxImage {
  url: string;
  name: string | null;
}

interface LightboxProps {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export default function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only treat as swipe when clearly horizontal
    if (Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(dx);
    }
  }

  function handleTouchEnd() {
    if (dragOffset <= -SWIPE_THRESHOLD) goNext();
    if (dragOffset >= SWIPE_THRESHOLD) goPrev();
    setDragOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
    >
      <header className="flex items-center justify-between px-4 py-3 shrink-0 text-white/80">
        <span className="text-sm">
          {de.gallery.imageCounter(index + 1, images.length)}
        </span>
        <button
          onClick={onClose}
          title={de.gallery.close}
          className="p-2 hover:text-white hover:bg-white/10 rounded-lg transition"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0 px-2 pb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            title={de.gallery.previous}
            className="hidden sm:flex absolute left-4 z-10 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={current.url}
          alt={current.name || de.chat.image}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain select-none rounded-lg"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: dragOffset === 0 ? "transform 0.2s ease" : "none",
          }}
          draggable={false}
        />

        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            title={de.gallery.next}
            className="hidden sm:flex absolute right-4 z-10 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <footer className="flex items-center justify-center gap-1.5 pb-4 shrink-0">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              className={`w-2 h-2 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
