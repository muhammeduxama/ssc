import "server-only";
import { redirect } from "next/navigation";
import { getSession, isStaff, type Role, type Session } from "./session";

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles.length && !roles.includes(s.role)) redirect("/dashboard");
  return s;
}

export async function requireStaff(adminOnly = false): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isStaff(s) || (adminOnly && s.role !== "admin")) redirect("/dashboard");
  return s;
}
