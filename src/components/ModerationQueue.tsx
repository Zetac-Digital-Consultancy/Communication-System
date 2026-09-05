"use client";
import { useEffect, useState } from "react";

type Report = { id: string; reason: string; reporter: { name: string }; reported: { name: string; email: string } };
export default function ModerationQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error();
      setReports((await res.json()).reports);
    } catch { setError("Meldungen konnten nicht geladen werden."); }
  }
  useEffect(() => { void refresh(); }, []);
  async function resolve(id: string) {
    try {
      const res = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error();
      await refresh();
    } catch { setError("Meldung konnte nicht abgeschlossen werden."); }
  }
  return <section className="p-4 border-b bg-white">
    <h2 className="font-semibold">Offene Meldungen ({reports.length})</h2>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {reports.map((report) => <article key={report.id} className="mt-3 p-3 rounded border text-sm">
      <p><strong>{report.reported.name}</strong> ({report.reported.email}) — gemeldet von {report.reporter.name}</p>
      <p className="whitespace-pre-wrap break-words my-2">{report.reason}</p>
      <p className="text-xs text-slate-500">Prüfen und gegebenenfalls das Konto unten deaktivieren.</p>
      <button onClick={() => resolve(report.id)} className="underline mt-2">Als geprüft abschließen</button>
    </article>)}
  </section>;
}
