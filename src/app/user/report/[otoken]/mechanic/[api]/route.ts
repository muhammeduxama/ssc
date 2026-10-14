import { db } from "@/lib/db";
import { parseCar } from "@/lib/format";
import { go } from "@/lib/magic";
import { pdfDoc } from "@/lib/pdf/doc";
import { mechanicByRef } from "@/lib/magic";

/** HomeController@inspectionReport — diagnostic inspection report PDF (fualt_codes_mail view). */
export async function GET(req: Request, { params }: { params: Promise<{ otoken: string; api: string }> }) {
  const { otoken, api } = await params;
  const [order, mechanic] = await Promise.all([
    db.orders.findFirst({ where: { token: otoken }, include: { orderassigns: { take: 1, include: { assignfaults: { orderBy: { id: "asc" } }, users: true } } } }),
    mechanicByRef(api),
  ]);
  const a = order?.orderassigns[0];
  if (!order || !a || !mechanic || a.user_id !== mechanic.id) return go(req, "/");
  const car = parseCar(order.car_data);
  const pdf = await pdfDoc();
  pdf.small("Smart Servicing Centre · www.smartservicingcentre.co.uk · Email: support@smartservicingcentre.co.uk");
  pdf.title("Diagnostic Inspection Report");
  pdf.row("Car", [car.make, car.model, car.engine, car.fuel, car.year].filter(Boolean).join(" "));
  pdf.row("Registration no", car.reg ?? "");
  pdf.row("Mileage", Number(a.mileage) >= 1 ? `${Number(a.mileage)} mileage` : "");
  pdf.row("Mechanic", a.users.company || `${a.users.fname} ${a.users.lname}`);
  pdf.row("Report created", a.updated_at?.toLocaleDateString("en-GB") ?? "");
  pdf.rule();
  pdf.h(`About ${a.users.company ?? "your mechanic"}`);
  if (a.users.note) pdf.p(a.users.note);
  pdf.h("Disclaimer");
  pdf.p("Please note, this is a diagnostic inspection report only and represents your mechanic's fault-finding of the vehicle at the time of inspection.");
  pdf.rule();
  if (!a.assignfaults.length) pdf.p("No faults were recorded.");
  for (const f of a.assignfaults) {
    pdf.row("Fault description", f.description);
    pdf.row("Urgency", f.urgency.toUpperCase());
    pdf.row("Trouble code", (f.trouble_code ?? "").toUpperCase());
    pdf.row("Has it been fixed?", f.fixed ? "YES" : "NO");
    pdf.rule();
  }
  pdf.h("About Smart Servicing Centre");
  pdf.p("Smart Servicing Centre is a network of independent mobile mechanics and garages, who repair, service and inspect vehicles wherever needed, saving car owners time and money! Visit us at SMARTSERVICINGCENTRE.CO.UK");
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="inspection-report-${order.id}.pdf"` } });
}
