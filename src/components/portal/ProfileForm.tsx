"use client";
import { updateProfile } from "@/app/actions/portal";
import { ActionForm } from "./ActionForm";

export function ProfileForm({ u }: { u: { fname: string; lname: string; phone: string; email: string } }) {
  return (
    <ActionForm action={updateProfile} submit="Update information" className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="p-first">First name *</label><input id="p-first" name="first_name" required defaultValue={u.fname} className="input" /></div>
      <div><label className="label" htmlFor="p-last">Last name *</label><input id="p-last" name="last_name" required defaultValue={u.lname} className="input" /></div>
      <div><label className="label" htmlFor="p-phone">Phone *</label><input id="p-phone" name="phone" required inputMode="numeric" defaultValue={u.phone} className="input" /></div>
      <div><label className="label" htmlFor="p-email">Email</label><input id="p-email" value={u.email} readOnly className="input opacity-70" /></div>
      <div className="sm:col-span-2" />
    </ActionForm>
  );
}
