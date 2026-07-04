"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { de } from "@/lib/de";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types";

interface CalendarModalProps {
  // null = own calendar (editable); otherwise a contact's calendar (read-only)
  userId: string | null;
  userName: string | null;
  onClose: () => void;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarModal({
  userId,
  userName,
  onClose,
}: CalendarModalProps) {
  const isOwn = userId === null;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formDate, setFormDate] = useState(toDateInputValue(new Date()));
  const [formFrom, setFormFrom] = useState("09:00");
  const [formTo, setFormTo] = useState("17:00");
  const [formType, setFormType] = useState<"FREE" | "BUSY">("FREE");
  const [formNote, setFormNote] = useState("");

  const weekEnd = addDays(weekStart, 7);

  const fetchSlots = useCallback(async () => {
    const params = new URLSearchParams({
      from: weekStart.toISOString(),
      to: weekEnd.toISOString(),
    });
    if (userId) params.set("userId", userId);

    const res = await fetch(`/api/availability?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSlots(data.slots);
    }
    setLoading(false);
    // weekEnd is derived from weekStart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, weekStart]);

  useEffect(() => {
    setLoading(true);
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSave() {
    setFormError("");

    const start = new Date(`${formDate}T${formFrom}`);
    const end = new Date(`${formDate}T${formTo}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setFormError(de.calendar.invalidTime);
      return;
    }
    if (end <= start) {
      setFormError(de.calendar.endBeforeStart);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
          type: formType,
          note: formNote,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || de.calendar.saveError);
        return;
      }

      setShowForm(false);
      setFormNote("");
      await fetchSlots();
    } catch {
      setFormError(de.calendar.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slotId: string) {
    const res = await fetch(`/api/availability/${slotId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    }
  }

  function openFormForDay(date: Date) {
    setFormDate(toDateInputValue(date));
    setShowForm(true);
    setFormError("");
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const hasAnySlot = slots.length > 0;

  const weekLabel = `${weekStart.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  })} – ${addDays(weekStart, 6).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-40 flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-2xl shadow-xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900 truncate">
              {isOwn
                ? de.calendar.myCalendar
                : de.calendar.calendarOf(userName ?? "")}
            </h2>
            <p className="text-xs text-slate-500">{de.calendar.legendHint}</p>
          </div>
          <button
            onClick={onClose}
            title={de.calendar.close}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            title={de.calendar.prevWeek}
            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-slate-900 truncate">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 hover:bg-brand-50 rounded-md transition shrink-0"
            >
              {de.calendar.today}
            </button>
          </div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            title={de.calendar.nextWeek}
            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <>
              {!hasAnySlot && (
                <p className="text-sm text-slate-400 text-center pt-6 px-4">
                  {isOwn ? de.calendar.noSlots : de.calendar.noSlotsContact}
                </p>
              )}
              <ul className="divide-y divide-slate-100">
                {days.map((day) => {
                  const daySlots = slots.filter((s) =>
                    isSameDay(new Date(s.start), day)
                  );
                  if (daySlots.length === 0 && !isOwn) return null;

                  return (
                    <li key={day.toISOString()} className="px-4 sm:px-6 py-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isSameDay(day, today)
                              ? "text-brand-600"
                              : "text-slate-700"
                          )}
                        >
                          {day.toLocaleDateString("de-DE", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                          {isSameDay(day, today) && ` · ${de.calendar.today}`}
                        </span>
                        {isOwn && (
                          <button
                            onClick={() => openFormForDay(day)}
                            title={de.calendar.addSlot}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-slate-300">–</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {daySlots.map((slot) => (
                            <li
                              key={slot.id}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                slot.type === "FREE"
                                  ? "bg-green-50 text-green-800 border border-green-100"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  slot.type === "FREE"
                                    ? "bg-green-500"
                                    : "bg-slate-400"
                                )}
                              />
                              <span className="font-medium whitespace-nowrap">
                                {formatTime(slot.start)} – {formatTime(slot.end)}
                              </span>
                              <span className="text-xs opacity-80 whitespace-nowrap">
                                {slot.type === "FREE"
                                  ? de.calendar.free
                                  : de.calendar.busy}
                              </span>
                              {slot.note && (
                                <span className="text-xs opacity-70 truncate">
                                  {slot.note}
                                </span>
                              )}
                              {isOwn && (
                                <button
                                  onClick={() => handleDelete(slot.id)}
                                  title={de.calendar.delete}
                                  className="ml-auto p-1 opacity-50 hover:opacity-100 hover:text-red-600 transition shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {isOwn && (
          <footer className="border-t border-slate-200 p-4 sm:px-6 shrink-0">
            {showForm ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {de.calendar.date}
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {de.calendar.from}
                    </label>
                    <input
                      type="time"
                      value={formFrom}
                      onChange={(e) => setFormFrom(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {de.calendar.to}
                    </label>
                    <input
                      type="time"
                      value={formTo}
                      onChange={(e) => setFormTo(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {de.calendar.title}
                    </label>
                    <select
                      value={formType}
                      onChange={(e) =>
                        setFormType(e.target.value as "FREE" | "BUSY")
                      }
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="FREE">{de.calendar.free}</option>
                      <option value="BUSY">{de.calendar.busy}</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder={de.calendar.notePlaceholder}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {formError && (
                  <p className="text-xs text-red-600">{formError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
                  >
                    {saving ? de.calendar.saving : de.calendar.save}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-white border border-slate-200 text-slate-600 text-sm font-medium py-2 px-4 rounded-lg hover:bg-slate-50 transition"
                  >
                    {de.calendar.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setFormDate(toDateInputValue(new Date()));
                  setShowForm(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                {de.calendar.addSlot}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
