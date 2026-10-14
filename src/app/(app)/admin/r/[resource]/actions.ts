"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteRecord, saveRecord } from "@/lib/crud/engine";
import { getResource } from "@/lib/crud/registry";
import { requireStaff } from "@/lib/guard";
import { createSession } from "@/lib/session";

export type FormState = { errors?: Record<string, string>; message?: string };

export async function saveAction(slug: string, id: string | null, back: string, _: FormState, form: FormData): Promise<FormState> {
  const r = getResource(slug);
  if (!r) return { message: "Unknown section." };
  const me = await requireStaff(r.adminOnly);
  let res;
  try {
    res = await saveRecord(r, form, id ?? undefined);
  } catch (e) {
    console.error(e);
    return { message: "Could not save. Check the values and try again." };
  }
  if (!res.ok) return { errors: res.errors, message: "Please fix the highlighted fields." };
  // Editing your own staff account (e.g. a new password) would otherwise sign you out.
  if (r.model === "admins" && me.kind === "admin" && String(res.id) === me.id) await createSession({ kind: me.kind, id: me.id, role: me.role, name: me.name, email: me.email });
  revalidatePath(`/admin/r/${slug}`);
  redirect(back || `/admin/r/${slug}`);
}

export async function deleteAction(slug: string, id: string, back: string) {
  const r = getResource(slug);
  if (!r || r.canDelete === false) return;
  await requireStaff(r.adminOnly);
  try {
    await deleteRecord(r, id);
  } catch (e) {
    console.error(e);
    redirect(`${back || `/admin/r/${slug}`}${(back || "").includes("?") ? "&" : "?"}error=in-use`);
  }
  revalidatePath(`/admin/r/${slug}`);
  redirect(back || `/admin/r/${slug}`);
}
