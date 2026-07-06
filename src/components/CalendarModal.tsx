"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  // null = own calendar (editable, Kunde only); otherwise a Kunde's calendar (read-only)
  userId: string | null;
  userName: string | null;
  onClose: () => void;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarModal({
  userId,
  userName,
  onClose,
}: CalendarModalProps) {
  const isOwn = userId === null;
  const today = new Date();
  const [monthStart, setMonthStart] = useState(() => startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFrom, setFormFrom] = useState("09:00");
  const [formTo, setFormTo] = useState("17:00");
  const [formType, setFormType] = useState<"FREE" | "BUSY">("FREE");
  const [formNote, setFormNote] = useState("");

  const fetchSlots = useCallback(async () => {
    const from = monthStart;
    const to = addMonths(monthStart, 1);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (userId) params.set("userId", userId);

    const res = await fetch(`/api/availability?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSlots(data.slots);
    }
    setLoading(false);
  }, [userId, monthStart]);

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

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const key = dayKey(new Date(slot.start));
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  // Leading blanks so the 1st lands on the correct weekday (Monday first)
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate();

  const monthDays = Array.from(
    { length: daysInMonth },
    (_, i) =>
      new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)
  );

  const selectedSlots = slotsByDay.get(dayKey(selectedDay)) ?? [];

  function selectMonth(offset: number) {
    const next = addMonths(monthStart, offset);
    setMonthStart(next);
    // Keep the selection inside the visible month
    setSelectedDay(
      isSameDay(next, startOfMonth(today))
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
        : next
    );
  }

  function goToday() {
    setMonthStart(startOfMonth(today));
    setSelectedDay(
      new Date(today.getFullYear(), today.getMonth(), today.getDate())
    );
  }

  async function handleSave() {
    setFormError("");

    const [fromH, fromM] = formFrom.split(":").map(Number);
    const [toH, toM] = formTo.split(":").map(Number);
    const start = new Date(selectedDay);
    start.setHours(fromH ?? 0, fromM ?? 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(toH ?? 0, toM ?? 0, 0, 0);

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

  const monthLabel = monthStart.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-40 flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-2xl shadow-xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[92vh] flex flex-col"
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

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-2">
            <button
              onClick={() => selectMonth(-1)}
              title={de.calendar.prevMonth}
              className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-900 capitalize truncate">
                {monthLabel}
              </span>
              <button
                onClick={goToday}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 hover:bg-brand-50 rounded-md transition shrink-0"
              >
                {de.calendar.today}
              </button>
            </div>
            <button
              onClick={() => selectMonth(1)}
              title={de.calendar.nextMonth}
              className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 pb-3">
            <div className="grid grid-cols-7 mb-1">
              {de.calendar.weekdaysShort.map((wd) => (
                <span
                  key={wd}
                  className="text-center text-xs font-medium text-slate-400 py-1"
                >
                  {wd}
                </span>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const daySlots = slotsByDay.get(dayKey(day)) ?? [];
                  const hasFree = daySlots.some((s) => s.type === "FREE");
                  const hasBusy = daySlots.some((s) => s.type === "BUSY");
                  const isSelected = isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={day.getDate()}
                      onClick={() => {
                        setSelectedDay(day);
                        setFormError("");
                      }}
                      className={cn(
                        "h-11 sm:h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-sm transition border",
                        isSelected
                          ? "bg-brand-600 text-white border-brand-600 font-semibold"
                          : isToday
                            ? "border-brand-300 text-brand-700 font-semibold hover:bg-brand-50"
                            : "border-transparent text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span className="leading-none">{day.getDate()}</span>
                      <span className="flex gap-0.5 h-1.5">
                        {hasFree && (
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-white" : "bg-green-500"
                            )}
                          />
                        )}
                        {hasBusy && (
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-white/60" : "bg-slate-400"
                            )}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-slate-900">
                {selectedDay.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {isSameDay(selectedDay, today) && ` · ${de.calendar.today}`}
              </span>
              {isOwn && !showForm && (
                <button
                  onClick={() => {
                    setShowForm(true);
                    setFormError("");
                  }}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-md transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {de.calendar.addSlot}
                </button>
              )}
            </div>

            {selectedSlots.length === 0 ? (
              <p className="text-xs text-slate-400 pb-1">
                {de.calendar.noSlotsDay}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {selectedSlots.map((slot) => (
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
                        slot.type === "FREE" ? "bg-green-500" : "bg-slate-400"
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
          </div>
        </div>

        {isOwn && showForm && (
          <footer className="border-t border-slate-200 p-4 sm:px-6 shrink-0">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
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
                <div>
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
              {formError && <p className="text-xs text-red-600">{formError}</p>}
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
          </footer>
        )}
      </div>
    </div>
  );
}
