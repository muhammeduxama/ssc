import { WorkList } from "@/components/mechanic/WorkList";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { carTitle, parseCar } from "@/lib/format";
import { requireRole } from "@/lib/guard";

export const metadata = { title: "Bespoke quotes" };
export default async function Bespokes() {
  const s = await requireRole("mechanic");
  const rows = await db.bespokes.findMany({ where: { user_id: BigInt(s.id) }, orderBy: { id: "desc" }, include: { bespokeusers: { take: 1 } } });
  return <>
    <PageHeader eyebrow="Your customers" title="Bespoke quotes" description="Create a clear estimate for your own customer. They can review it and book online."><Link href="/mechanic/bespokes/new" className="btn btn-primary"><Plus size={16}/> New estimate</Link></PageHeader>
    <WorkList mode="estimates" empty="No estimates yet" items={rows.map(b => { const c = parseCar(b.car_data); const u = b.bespokeusers[0]; return {
      id: Number(b.id), orderId: Number(b.id), href: `/mechanic/bespokes/${b.id}`, car: carTitle(c), reg: c.reg ?? "",
      customer: u ? [u.fname, u.lname].filter(Boolean).join(" ") || u.email : "Customer details pending",
      work: b.service || "Bespoke repair estimate", location: b.postcode ?? "", amount: Number(b.price), amountLabel: "Estimate total", status: b.status, date: b.created_at?.toISOString() ?? null,
    }; })}/>
  </>;
}
