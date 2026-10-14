"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isFile, saveUpload, uploadProblem } from "@/lib/files";
import { MIN, allow } from "@/lib/rate-limit";

/** ProfileController@uploadDocs: upload by emailed token (no login needed). */
export async function uploadDocsByToken(token: string, form: FormData) {
  if (!(await allow(["docs-token", 10, 60 * MIN]))) redirect("/");
  const u = await db.users.findUnique({ where: { api_token: token } });
  if (!u) redirect("/");
  // Skip files we don't accept rather than failing the whole upload.
  const now = new Date();
  for (const [key, value] of form.entries()) {
    if (!/^\d+$/.test(key) || !isFile(value) || uploadProblem(value)) continue;
    const path = await saveUpload(value, "ssc/mechanic");
    await db.requiredocs.create({ data: { user_id: u.id, document_id: BigInt(key), document: path, status: "pending", created_at: now, updated_at: now } });
  }
  // ProfileController@docsStatus rotated the token so the emailed link can't be reused.
  await db.users.update({ where: { id: u.id }, data: { api_token: randomBytes(30).toString("hex"), updated_at: now } });
  redirect(`/mechanic/${token}/status`);
}
