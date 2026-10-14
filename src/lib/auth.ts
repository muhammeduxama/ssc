import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Session } from "./session";

// Laravel stores bcrypt hashes with the $2y$ prefix; bcryptjs reads $2a$/$2b$.
const normalise = (hash: string) => hash.replace(/^\$2y\$/, "$2b$");

export async function authenticate(email: string, password: string): Promise<Session | null> {
  const e = email.trim().toLowerCase();

  const admin = await db.admins.findUnique({ where: { email: e } });
  if (admin && (await bcrypt.compare(password, normalise(admin.password)))) {
    return {
      kind: "admin",
      id: String(admin.id),
      role: admin.role === "editor" ? "editor" : "admin",
      name: admin.name,
      email: admin.email,
    };
  }

  const user = await db.users.findUnique({ where: { email: e } });
  if (user && user.status && (await bcrypt.compare(password, normalise(user.password)))) {
    return {
      kind: "user",
      id: String(user.id),
      role: Number(user.role_id) === 1 ? "mechanic" : "customer",
      name: `${user.fname} ${user.lname}`.trim(),
      email: user.email,
    };
  }
  return null;
}
