"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteMails, sendGeneralMail, sendJoinNetwork } from "@/app/actions/admin-tools";
import { RichText } from "@/components/crud/RichText";
import { useAction } from "@/components/useAction";

export function ComposeForm({ initialHtml }: { initialHtml: string }) {
  const { pending, run } = useAction();
  const router = useRouter();
  const [all, setAll] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => sendGeneralMail(fd), { after: (r) => r.ok && router.push("/admin/mail") }); }} className="card space-y-4 p-6">
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="checked" value="1" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4" /> Send to all active mechanics</label>
      {!all && (
        <div>
          <label htmlFor="to" className="label">To</label>
          <input id="to" name="to" placeholder="email@example.com, another@example.com" className="input" />
          <p className="mt-1 text-xs text-muted">Separate several addresses with commas.</p>
        </div>
      )}
      <div><label htmlFor="subject" className="label">Subject</label><input id="subject" name="subject" className="input" /></div>
      <div><span className="label">Message</span><RichText name="message" defaultValue={initialHtml} /></div>
      <div>
        <label htmlFor="attach" className="label">Attachments</label>
        <input id="attach" type="file" name="attach" multiple className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand" />
      </div>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">{pending ? "Sending…" : "Send email"}</button></div>
    </form>
  );
}

export function SentList({ rows }: { rows: { id: number; subject: string; to: string; at: string | null; files: number }[] }) {
  const [sel, setSel] = useState<number[]>([]);
  const { pending, run } = useAction();
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.length === rows.length && rows.length > 0} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} className="h-4 w-4" /> Select all</label>
        <button disabled={pending || !sel.length} onClick={() => run(() => deleteMails(sel), { confirm: `Delete ${sel.length} email(s)?`, after: () => setSel([]) })} className="btn btn-secondary !px-2.5 !py-1 !text-xs !text-danger"><Trash2 size={14} /> Delete selected</button>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
            <input type="checkbox" aria-label={`Select ${r.subject}`} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} className="h-4 w-4" />
            <a href={`/admin/mail/${r.id}`} className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{r.subject || "(no subject)"}</div>
              <div className="truncate text-xs text-muted">To: {r.to}</div>
            </a>
            {r.files > 0 && <span className="pill border-line text-muted">{r.files} file{r.files > 1 ? "s" : ""}</span>}
            <span className="shrink-0 font-mono text-xs text-muted">{r.at ? new Date(r.at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JoinNetworkForm() {
  const { pending, run } = useAction();
  const [v, setV] = useState({ emails: "", subject: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => sendJoinNetwork(v.emails, v.subject), { after: (r) => r.ok && setV({ emails: "", subject: "" }) }); }} className="card max-w-2xl space-y-4 p-6">
      <div><label htmlFor="em" className="label">Emails</label><textarea id="em" rows={5} value={v.emails} onChange={(e) => setV({ ...v, emails: e.target.value })} placeholder="garage1@example.com, garage2@example.com" className="input" /></div>
      <div><label htmlFor="sj" className="label">Subject (optional)</label><input id="sj" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} placeholder="JOIN OUR NETWORK, BE PART OF UK's FAVOURITE GARAGE & MOBILE MECHANIC NETWORK" className="input" /></div>
      <p className="text-xs text-muted">Invites are sent one every 20 seconds in the background.</p>
      <div className="flex justify-end"><button disabled={pending} className="btn btn-primary">Send invites</button></div>
    </form>
  );
}
