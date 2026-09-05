import Link from "next/link";
import BlockedContacts from "@/components/BlockedContacts";
import DeleteAccount from "@/components/DeleteAccount";

export const dynamic = "force-dynamic";
export default function SupportPage() {
  const privacyURL = process.env.PRIVACY_POLICY_URL;
  return <main className="max-w-2xl mx-auto p-6 space-y-8 text-slate-900">
    <Link href="/" className="underline">Zurück zu Communication</Link>
    <h1 className="text-2xl font-bold">Hilfe & Datenschutz</h1>
    <section className="space-y-3"><h2 className="font-semibold">Zetac IT Solutions</h2>
      <p>Bei Fragen zum Zugang, zur Löschung Ihres Kontos oder zu unangemessenen Nachrichten kontaktieren Sie <a className="underline" href="mailto:info@zetac.de">info@zetac.de</a>.</p>
      <p>Belästigung, Drohungen sowie rechtswidrige Inhalte sind nicht gestattet. Sie können Kontakte direkt im Chat melden und blockieren.</p>
      {privacyURL && <a className="underline" href={privacyURL}>Datenschutzerklärung</a>}
    </section>
    <BlockedContacts />
    <DeleteAccount />
  </main>;
}
