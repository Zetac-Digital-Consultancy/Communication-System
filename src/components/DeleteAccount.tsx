"use client";
import { useState } from "react";

export default function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Konto endgültig löschen? Ihre Gespräche und Nachrichten werden auch für Ihre Gesprächspartner gelöscht. Dies kann nicht rückgängig gemacht werden.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Löschen fehlgeschlagen. Bitte melden Sie sich an.");
      window.location.replace("/login");
    } catch (error) { setError(error instanceof Error ? error.message : "Verbindung fehlgeschlagen."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 border-t pt-6"><h2 className="font-semibold">Konto löschen</h2>
    <p className="text-sm">Löscht Ihr Konto, Ihre Gespräche und zugehörige Nachrichten endgültig. Bitte melden Sie sich zuerst an.</p>
    <form onSubmit={remove} className="space-y-3">
      <label className="block">Aktuelles Passwort<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block border rounded p-2 mt-1 w-full" /></label>
      <button disabled={busy} className="rounded bg-red-700 text-white px-4 py-2 disabled:opacity-50">Konto endgültig löschen</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </form>
  </section>;
}
