"use client";
import { useState } from "react";

export default function SafetyActions({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(action: "block" | "report") {
    if (action === "block" && !confirm("Kontakt blockieren? Sie können einander danach keine Nachrichten senden.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, reason }) });
      if (!res.ok) throw new Error((await res.json()).error || "Anfrage fehlgeschlagen");
      if (action === "block") window.location.assign("/");
      else setStatus("Meldung gespeichert. Zetac IT Solutions wird sie prüfen. Bei dringenden Anliegen: info@zetac.de");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Verbindung fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  return <div className="relative">
    <button onClick={() => setOpen(!open)} className="text-xs underline p-2" aria-expanded={open}>Melden / Blockieren</button>
    {open && <div className="absolute right-0 top-full z-30 w-64 rounded-xl border bg-white shadow-lg p-4 space-y-3">
      <label className="block text-sm">Meldegrund<textarea maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded p-2 mt-1" /></label>
      <button disabled={busy || !reason.trim()} onClick={() => submit("report")} className="block text-sm underline disabled:opacity-50">Meldung senden</button>
      <button disabled={busy} onClick={() => submit("block")} className="block text-sm text-red-700 underline">Kontakt blockieren</button>
      <p role="status" className="text-xs">{status}</p>
    </div>}
  </div>;
}
