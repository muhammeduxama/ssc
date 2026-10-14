import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** Customer portal (User\Portal\PortalController) — customers only. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "customer") redirect("/dashboard");
  return children;
}
