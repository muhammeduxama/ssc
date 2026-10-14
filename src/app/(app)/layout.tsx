import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ResendVerification } from "@/components/site/AuthForms";
import { unreadCount } from "@/lib/chat";
import { db } from "@/lib/db";
import { SIDEBAR_COOKIE } from "@/lib/nav";
import { getSession, IMPERSONATOR_COOKIE, isStaff } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const unread = await unreadCount(s);
  const jar = await cookies();
  const impersonating = jar.has(IMPERSONATOR_COOKIE);
  const mini = jar.get(SIDEBAR_COOKIE)?.value === "mini";
  // Laravel's 'verified' middleware guarded the mechanic area (staff log-in-as skips it).
  const unverified = s.role === "mechanic" && !impersonating && !(await db.users.findUnique({ where: { id: BigInt(s.id) }, select: { email_verified_at: true } }))?.email_verified_at;
  const notifications = isStaff(s)
    ? (await db.notifications.findMany({ where: { seen: false, receiver: "admin" }, orderBy: { id: "desc" }, take: 30 })).map((n) => ({
        id: Number(n.id),
        title: n.title ?? "Notification",
        description: n.description ?? "",
        link: n.link ?? "",
        at: n.created_at?.toISOString() ?? null,
      }))
    : undefined;
  return (
    <>
    {impersonating && <ImpersonationBanner name={s.name} />}
    <AppShell user={{ name: s.name, email: s.email, role: s.role }} unread={unread} miniInitial={mini} notifications={notifications}>
      {unverified ? (
        <div className="card mx-auto mt-10 max-w-lg p-8">
          <span className="eyebrow">One more step</span>
          <h1 className="mt-3 font-display text-2xl font-semibold">Verify your email address</h1>
          <p className="mb-5 mt-2 text-sm text-muted">Before proceeding, please check your email ({s.email}) for a verification link. If you did not receive the email, we can send another.</p>
          <ResendVerification />
        </div>
      ) : (
        children
      )}
    </AppShell>
    </>
  );
}
