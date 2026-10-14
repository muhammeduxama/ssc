"use client";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Modal } from "@/components/mechanic/Modal";
import { useToast } from "@/components/Toast";

export function PasswordDialog({ onClose, save }: {
  onClose: () => void;
  save: (password: string, confirmation: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} busy={pending} title="Change password" description="Choose a strong password with at least 8 characters. Changing it signs this account out of other sessions.">
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const password = String(data.get("password"));
        const confirmation = String(data.get("confirmation"));
        if (password !== confirmation) { setError("The passwords don’t match. Please check and try again."); return; }
        setError("");
        start(async () => {
          try {
            const result = await save(password, confirmation);
            if (result.ok) { toast(result.message); onClose(); }
            else setError(result.message);
          } catch { setError("We couldn’t save the password. Please try again."); }
        });
      }}>
        <fieldset disabled={pending} className="space-y-5">
          <div>
            <label htmlFor={`${id}-password`} className="label">New password</label>
            <div className="relative">
              <input autoFocus id={`${id}-password`} name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required className="input !pr-14" />
              <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-sunken">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-confirmation`} className="label">Confirm new password</label>
            <input id={`${id}-confirmation`} name="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="input" />
          </div>
        </fieldset>
        {error && <p id={`${id}-error`} role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="form-dialog-actions">
          <button type="button" disabled={pending} onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button disabled={pending} className="btn btn-primary"><KeyRound size={16} />{pending ? "Saving…" : "Save password"}</button>
        </div>
      </form>
    </Modal>
  );
}
