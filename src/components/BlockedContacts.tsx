"use client";
import { useEffect, useState } from "react";

export default function BlockedContacts() {
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/safety").then(async (res) => { if (!res.ok) throw new Error(); setBlocks((await res.json()).blocks); })
      .catch(() => setError("Bitte anmelden, um blockierte Kontakte zu verwalten."));
  }, []);
  async function unblock(userId: string) {
    try {
      const res = await fetch("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "unblock" }) });
      if (!res.ok) throw new Error();
      setBlocks((prev) => prev.filter((b) => b.id !== userId));
    } catch { setError("Entsperren fehlgeschlagen."); }
  }
  return <section className="space-y-3"><h2 className="font-semibold">Blockierte Kontakte</h2>
    {error && <p role="alert">{error}</p>}
    {blocks.map((b) => <p key={b.id}>{b.name} <button className="underline ml-3" onClick={() => unblock(b.id)}>Entsperren</button></p>)}
    <p className="text-sm text-slate-500">Nach dem Entsperren können Sie den Kontakt erneut hinzufügen.</p>
  </section>;
}
