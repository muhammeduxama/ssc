import "server-only";
import type { Car } from "@/lib/format";
import { loginLink } from "@/lib/login-links";
import { appUrl, emailLayout, type Block } from "./layout";

type Person = { fname: string; lname: string; email: string };
const full = (p: Person) => `${p.fname} ${p.lname}`.trim();
const hi = (name: string) => `Hi ${name.trim() || "there"},`;
const gbp = (n: number) => `£${n.toFixed(2)}`;
const vehicle = (c: Car) => [c.make, c.model, c.engine, c.fuel, c.year].filter(Boolean).join(" ");

const SUPPORT = "support@smartservicingcentre.co.uk";
const HOURS = "Our team is here Monday to Friday 08:30 to 18:00, and Saturday 09:00 to 17:00.";
const PRICE_NOTE =
  "The price covers the items listed in the service schedule. Any extra work the mechanic recommends during the service is quoted separately. Current offers and discounts are already applied. See our Terms & Conditions for details.";
const WHY_US = ["Booking online takes about two minutes.", "No trip to the garage: our mobile mechanics come to you.", "You see a fixed price before you book, so there are no surprises."];
const ratings = (r: { quality: number; punctuality: number; communication: number }): [string, string][] => [
  ["Quality", `${r.quality} / 5`],
  ["Punctuality", `${r.punctuality} / 5`],
  ["Communication", `${r.communication} / 5`],
];

/** Notifications\BookingCancelled (customer or mechanic). */
export const bookingCancelled = (to: Person, orderId: number | bigint, byCustomer = false) => ({
  to: to.email,
  subject: `Booking #${orderId} has been cancelled`,
  html: emailLayout({
    eyebrow: `Booking #${orderId}`,
    title: "This booking has been cancelled",
    preview: byCustomer ? "The customer has cancelled this booking." : `Booking #${orderId} is no longer going ahead.`,
    greeting: hi(full(to)),
    blocks: [
      { p: byCustomer ? `The customer has cancelled booking #${orderId}, so it's no longer in your schedule.` : `Booking #${orderId} has been cancelled and won't go ahead.` },
      { p: "If you think this is a mistake, just get in touch and we'll look into it." },
    ],
  }),
});

/** Mail\NoMechanicForOrderMail (markdown: ssc.admin.email.no_mechanic_for_order). */
export const noMechanicForOrder = (customer: Person) => ({
  to: customer.email,
  subject: "We couldn't find a mechanic for your booking",
  html: emailLayout({
    eyebrow: "Booking update",
    title: "Sorry, no mechanic was available",
    preview: "Your booking has been cancelled and you haven't been charged.",
    greeting: hi(full(customer)),
    blocks: [
      { p: "Thank you for booking with Smart Servicing Centre. We sent your job to every mechanic in your area, but unfortunately none of them were able to take it on this time. This can happen when parts are hard to get, diaries are full, or the job needs a closer look." },
      { callout: "We've cancelled the booking, and you have not been charged anything for it or for the cancellation.", title: "You haven't been charged", tone: "ok" },
      { p: "We're sorry we couldn't help on this occasion. You're welcome to book again or ask us for a quote at any time." },
      { button: { label: "Get a new quote", href: appUrl("/choose-category") } },
    ],
  }),
});

/** Mail\User\RequestToMechanic (view: user.email.send_qoute_request). */
export const requestToMechanic = (o: {
  mechanic: Person & { id: bigint };
  order: { id: number | bigint; token: string; price: number; order_for: string };
  car: Car;
  postcode: string;
  services: { name: string; parts: string[] }[];
  adminQuote?: string[] | null;
}) => ({
  to: o.mechanic.email,
  subject: `New job in ${o.postcode}: ${gbp(o.order.price)}`,
  html: emailLayout({
    eyebrow: `New job · ${o.postcode}`,
    title: "A new job is available near you",
    preview: `${gbp(o.order.price)} job in ${o.postcode}. Respond quickly to secure it.`,
    blocks: [
      { p: "A customer near you has asked for the work below. Open the request to see the full details and accept it." },
      { callout: "Jobs go to the first mechanic who accepts, so respond as soon as you can.", title: "Be quick", tone: "warn" },
      { button: { label: "View job request", href: loginLink(o.mechanic.id, `/go/request/${o.order.token}`) } },
      ...(o.order.order_for === "inspection and mot"
        ? ([
            { rows: [["Booking reference", `#${o.order.id}`]] as [string, string][] },
            ...(o.adminQuote?.length
              ? [{ list: o.adminQuote, title: "Services" }]
              : o.services.flatMap((s) => [{ list: [s.name], title: "Service" }, ...(s.parts.length ? [{ list: s.parts, title: "Parts included" }] : [])])),
            { rows: [], total: ["Job value", gbp(o.order.price)] as [string, string] },
            { note: PRICE_NOTE },
          ] as Block[])
        : []),
      {
        title: "Job details",
        rows: [
          ...(o.order.order_for === "repairs" ? ([["Work needed", o.services.map((s) => s.name).join(", ")]] as [string, string][]) : []),
          ["Registration", o.car.reg ?? ""],
          ["Postcode", o.postcode],
        ],
      },
      {
        title: "Vehicle",
        rows: [
          ["Make", o.car.make ?? ""],
          ["Model", o.car.model ?? ""],
          ["Year", String(o.car.year ?? "")],
          ["Engine", o.car.engine ?? ""],
          ["Fuel", o.car.fuel ?? ""],
        ],
      },
    ],
  }),
});

/** Notifications\MessageCenter. */
export const messageCenter = (to: { name: string; email: string }, orderId: number | bigint, from: string, link: string) => ({
  to: to.email,
  subject: `New message about booking #${orderId}`,
  html: emailLayout({
    eyebrow: `Resolution centre · Booking #${orderId}`,
    title: "You have a new message",
    preview: `${from} sent a message about booking #${orderId}.`,
    greeting: hi(to.name),
    blocks: [{ p: `${from} has added a message in the resolution centre about booking #${orderId}.` }, { button: { label: "Read the message", href: appUrl(link) } }],
  }),
});

type QuoteLine = { name: string; price: unknown; type: string };
const carLine = (raw: string | null) => {
  try {
    const c = JSON.parse(raw ?? "{}");
    return [c.make, c.model, c.engine, c.fuel, c.year].filter(Boolean).join(" ");
  } catch {
    return "";
  }
};
const quoteRows = (car: string, lines: QuoteLine[], deadlineDays: number) =>
  [
    ["Vehicle", car],
    ["Work", lines.filter((l) => l.type === "labour").map((l) => l.name).join(", ")],
    ["Parts included", lines.filter((l) => l.type === "part").map((l) => l.name).join(", ")],
    ["Quote valid until", new Date(Date.now() + deadlineDays * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
  ].filter(([, v]) => v) as [string, string][];

type QuoteOrder = { id: bigint; token: string; notes: string | null; car_data: string | null; users: Person & { id: bigint } };
type AdminQuote = { price: unknown; notes: string | null; adminquotedetails: QuoteLine[] };

/** Mail\Admin\QuoteJobMail (markdown: ssc.admin.email.send_quote). */
export const quoteReady = (o: QuoteOrder, q: AdminQuote) => {
  let make = "";
  try {
    const c = JSON.parse(o.car_data ?? "{}");
    make = `${c.make ?? ""} ${c.model ?? ""}`.trim();
  } catch {}
  const notes = (o.notes ?? "").trim();
  const job = notes.length <= 60 ? notes : "";
  return {
    to: o.users.email,
    subject: `Your quote is ready${make ? ` for your ${make}` : ""}`,
    html: emailLayout({
      eyebrow: "Your quote",
      title: "Your quote is ready",
      preview: `Your fixed price is ${gbp(Number(q.price ?? 0))}. Book in a couple of minutes.`,
      greeting: hi(full(o.users)),
      blocks: [
        { p: `Thanks for asking us for a quote${job ? ` for "${job}"` : ""}. We've put it together below. Book soon to get the earliest available mechanic.` },
        { rows: quoteRows(carLine(o.car_data), q.adminquotedetails, 7), title: "Quote details", total: ["Your price", gbp(Number(q.price ?? 0))] },
        { button: { label: "Book this service", href: loginLink(o.users.id, `/portal/quotes/${o.id}/book`) } },
        ...(q.notes ? ([{ h: "A note from our team" }, { quote: q.notes }] as Block[]) : []),
        { list: WHY_US, title: "Why book with us" },
        { html: `<p style="margin:14px 0 0;font-size:13px;line-height:20px;color:#5e554e">Don't need this any more? <a href="${appUrl("/user/portal/quotes")}" style="color:#b9532f">Close this quote</a>.</p>` },
      ],
    }),
  };
};

/** Mail\AdminQuoteReminder (markdown: admin.emails.quote_reminder). */
export const adminQuoteReminder = (o: QuoteOrder, q: AdminQuote) => ({
  to: o.users.email,
  subject: "Your quote is still waiting for you",
  html: emailLayout({
    eyebrow: "Friendly reminder",
    title: "Your quote is still waiting",
    preview: "Your quote expires soon. Book now to keep this price.",
    greeting: hi(full(o.users)),
    blocks: [
      { p: "Have you had a chance to look at your quote? We've put the details below so they're easy to find." },
      { callout: `This quote expires on ${new Date(Date.now() + 6 * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Book before then to keep this price.`, tone: "warn" },
      { rows: quoteRows(carLine(o.car_data), q.adminquotedetails, 6), title: "Quote details", total: ["Your price", gbp(Number(q.price ?? 0))] },
      { button: { label: "Book this service", href: loginLink(o.users.id, `/portal/quotes/${o.id}/book`) } },
      { list: WHY_US, title: "Why book with us" },
    ],
  }),
});

/** Mail\Mechanic\Quote\QuotationReceived (view: ssc.mechanic.mail.quotation_request). */
export const quotationRequest = (o: { token: string; notes: string | null; car_data: string | null; users: Person; postcode: string; services: string[] }, mechanic: Person & { id: bigint }) => {
  let c: Record<string, string> = {};
  try {
    c = JSON.parse(o.car_data ?? "{}");
  } catch {}
  return {
    to: mechanic.email,
    subject: `New quote request in ${o.postcode}`,
    html: emailLayout({
      eyebrow: `Quote request · ${o.postcode}`,
      title: "A customer wants a quote from you",
      preview: o.notes?.trim() || o.services.join(", "),
      blocks: [
        { p: "A customer near you has asked for a repair quote. Here's what they need:" },
        { quote: o.notes?.trim() ? o.notes : o.services.join(", ") },
        { callout: "Customers usually book the first good quote they get, so reply as soon as you can.", title: "Be quick", tone: "warn" },
        { button: { label: "Send your quote", href: loginLink(mechanic.id, `/go/request/${o.token}`) } },
        {
          title: "Request details",
          rows: [
            ["Service", o.services.join(", ")],
            ["Customer", full(o.users)],
            ["Postcode", o.postcode],
            ["Registration", c.reg ?? ""],
          ],
        },
        {
          title: "Vehicle",
          rows: [
            ["Make", c.make ?? ""],
            ["Model", c.model ?? ""],
            ["Fuel", c.fuel ?? ""],
            ["Engine", String(c.engine ?? "")],
            ["Year", String(c.year ?? "")],
          ],
        },
      ],
    }),
  };
};

/** Mail\CustomerQuoteChat (markdown: ssc.admin.email.quotechat). */
export const customerQuoteChat = (o: { id: bigint; users: Person & { id: bigint } }, message: string) => ({
  to: o.users.email,
  subject: `New message about your quote #${o.id}`,
  html: emailLayout({
    eyebrow: `Quote #${o.id}`,
    title: "You have a new message from our team",
    preview: message.slice(0, 120),
    greeting: hi(full(o.users)),
    blocks: [{ p: `Our team has sent you a message about quote #${o.id}:` }, { quote: message, from: "Smart Servicing Centre" }, { button: { label: "Reply", href: loginLink(o.users.id, `/portal/quotes/${o.id}/chat`) } }],
  }),
});

/** Mail\Mechanic\Mail\RequireDocMail (view: ssc.mechanic.mail.docs). */
export const requireDocs = (email: string, token: string) => ({
  to: email,
  subject: "One last step: upload your documents",
  html: emailLayout({
    eyebrow: "Welcome to the network",
    title: "You're nearly ready to start taking jobs",
    preview: "Upload three documents and we'll activate your account.",
    greeting: "Hi there,",
    blocks: [
      { p: "Thanks for joining Smart Servicing Centre. We're looking forward to working with you. Before we can send you jobs, we need a clear photo or scan of these documents:" },
      { steps: ["Motor trade insurance", "Public liability insurance (if you hold employers' liability, this is usually under subsection 7, 8 or 9)", "Your qualifications"] },
      { callout: "A photo taken on your phone is fine if you don't have a scanner.", title: "Tip" },
      { button: { label: "Upload your documents", href: appUrl(`/mechanic/${token}/docs`) } },
      { p: "We'll review them and let you know as soon as your account is active." },
    ],
  }),
});

/** Mail\GeneralEmail (view: ssc.admin.email.send.general) — the message is admin-authored HTML. */
export const generalEmail = (to: string, subject: string, messageHtml: string, files: { src: string }[]) => ({
  to,
  subject,
  html: emailLayout({
    title: subject,
    blocks: [
      { html: `<div style="font-size:15px;line-height:24px;color:#1f1a17">${messageHtml}</div>` },
      ...(files.length ? [{ links: files.map((f, i) => [`Attachment ${i + 1}`, appUrl(`/legacy/${f.src}`)] as [string, string]) }] : []),
    ],
  }),
});

/** Mail\Admin\JoinNetwork (view: ssc.admin.email.mechanic.join_network). */
export const joinNetwork = (to: string, subject: string) => ({
  to,
  subject,
  html: emailLayout({
    eyebrow: "For mechanics and garages",
    title: "More jobs, less admin. Join our network for free.",
    preview: "Flexible work, fast payments and a steady stream of local jobs.",
    greeting: "Hi there,",
    blocks: [
      { p: "Smart Servicing Centre connects drivers with trusted local garages and mobile mechanics. We receive over 20,000 customer enquiries every month, and we'd like to send some of them your way." },
      {
        title: "Why mechanics join us",
        list: [
          "Free to join, with no subscription fee.",
          "A steady stream of local jobs, and you choose which ones you take.",
          "Send quotes and estimates to customers from one app.",
          "Fast payment straight to your account through Stripe.",
          "Less paperwork, so you can spend more time on the tools.",
        ],
      },
      { button: { label: "Join the network", href: appUrl("/join-network") } },
      { h: "What our partners say" },
      { quote: "We've worked with Smart Servicing Centre for more than a year. The team is friendly and easy to work with, and it's been a great extra income for us.", from: "Stef Autos" },
      { quote: "I'd recommend Smart Servicing Centre to any mechanic who wants an easier way to find and manage new customers.", from: "Auto Solutions" },
    ],
  }),
});

/** Mail\ReviewForMechanic (markdown: ssc.mechanic.email.review_for_mechanic). */
export const reviewForMechanic = (m: { company: string; email: string }, r: { order_id: number; quality: number; punctuality: number; communication: number; review: string; token: string }) => ({
  to: m.email,
  subject: `You have a new review for booking #${r.order_id}`,
  html: emailLayout({
    eyebrow: `Booking #${r.order_id}`,
    title: "You've received a new review",
    preview: r.review.slice(0, 120),
    greeting: hi(m.company),
    blocks: [
      { p: `The customer from booking #${r.order_id} has left you a review.` },
      { rows: ratings(r), title: "Ratings" },
      { quote: r.review, from: "Your customer" },
      { p: "Replying to reviews shows future customers that you care. It only takes a minute." },
      { button: { label: "Reply to this review", href: appUrl(`/mechanic/respond/review/${r.token}`) } },
    ],
  }),
});

// ---------------------------------------------------------------- mechanic workflow

type Cust = { id: bigint; fname: string; lname: string; email: string };
type Mech = { id: bigint; fname: string; lname: string; email: string; company: string | null; phone: string };
const mName = (m: Mech) => m.company || `${m.fname} ${m.lname}`;
const payLink = (c: Cust, _mechanicId: number | bigint, orderId: number | bigint) => loginLink(c.id, `/get-payment-info/${orderId}`);

/** Mail\User\RequestAcceptedByMechanic (view: user.email.request_accepted). */
export const requestAccepted = (c: Cust, m: Mech & { id: bigint }, o: { id: bigint; paid: boolean }, slot: { date: string; time: string }) => ({
  to: c.email,
  subject: `Good news: ${mName(m)} has accepted your booking`,
  html: emailLayout({
    eyebrow: `Booking #${o.id}`,
    title: "Your booking is confirmed",
    preview: `${mName(m)} will arrive on ${slot.date}, between ${slot.time}.`,
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: `${mName(m)} has accepted your booking. You're in good hands: we check the qualifications, accreditations and work history of every garage and mobile mechanic in our network.` },
      { title: "Your appointment", rows: [["Mechanic", `${mName(m)} (${m.fname} ${m.lname})`], ["Date", slot.date], ["Arrival window", slot.time], ["Phone", m.phone]] },
      ...(o.paid
        ? []
        : ([
            { callout: "Please add your card details to confirm the booking. You won't be charged until the work is finished.", title: "One more step", tone: "warn" },
            { button: { label: "Add card details", href: payLink(c, m.id, o.id) } },
          ] as Block[])),
      { p: `Questions for your mechanic? Call ${mName(m)} on ${m.phone}. If you'd prefer a different garage or mechanic, let us know within one hour.` },
      { links: [["Terms & Conditions", appUrl("/legal_docs/terms")], ["Booking terms", appUrl("/legal_docs/booking")]] },
    ],
  }),
});

/** Notifications\Mechanic\Order\OrderAcceptedByYou (sent to the customer's name/email in Laravel). */
export const orderAcceptedByYou = (to: { name: string; email: string }, orderId: number | bigint, date: string, time: string) => ({
  to: to.email,
  subject: `Booking #${orderId} accepted`,
  html: emailLayout({
    eyebrow: `Booking #${orderId}`,
    title: "Booking accepted",
    preview: `Scheduled for ${date}, between ${time}.`,
    greeting: hi(to.name),
    blocks: [{ p: `Booking #${orderId} has been accepted successfully.` }, { rows: [["Date", date.replace(/\b\w/g, (x) => x.toUpperCase())], ["Time", time]], title: "Visit scheduled" }],
  }),
});

/** Mail\User\FinalizeOrder (view: user.email.finalize_order). */
export const finalizeOrder = (c: Cust, mechanicId: bigint, o: { id: bigint; price: number; items: { name: string; price: number }[] }) => ({
  to: c.email,
  subject: `Confirm booking #${o.id} with your card details`,
  html: emailLayout({
    eyebrow: `Booking #${o.id}`,
    title: "Confirm your booking",
    preview: "Add your card to confirm. You won't be charged until the work is done.",
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: `Please add your card details to confirm booking #${o.id}.` },
      { callout: "Your card details keep payment simple and secure. Your mechanic won't charge you a penny until the work is complete.", title: "Why we ask for your card now", tone: "ok" },
      { title: "Booking summary", rows: o.items.map((i) => [i.name, gbp(i.price)] as [string, string]), total: ["Total", gbp(o.price)] },
      { button: { label: "Add card details", href: payLink(c, mechanicId, o.id) } },
      { note: `Any questions? Email ${SUPPORT}. ${HOURS}` },
    ],
  }),
});

/** Notifications\Mechanic\OrderReminder (links to the job; Laravel linked the order id by mistake). */
export const orderReminder = (m: { name: string; email: string }, orderId: bigint, assignId: bigint) => ({
  to: m.email,
  subject: `Reminder: booking #${orderId} is tomorrow`,
  html: emailLayout({
    eyebrow: `Booking #${orderId}`,
    title: "You have a job tomorrow",
    preview: `A quick reminder about booking #${orderId}.`,
    greeting: hi(m.name),
    blocks: [
      { p: `Just a quick reminder that booking #${orderId} is scheduled for tomorrow.` },
      { p: "If you need to change the time, call the customer and then update the visit in your app." },
      { button: { label: "View the job", href: appUrl(`/mechanic/jobs/${assignId}`) } },
    ],
  }),
});

/** Notifications\User\CardDeclined (Laravel hard-coded £194.99; the real total is used). */
export const cardDeclined = (c: { name: string; email: string }, orderId: bigint, total: number, services: string) => ({
  to: c.email,
  subject: `Payment declined for booking #${orderId}`,
  html: emailLayout({
    eyebrow: `Booking #${orderId}`,
    title: "Your card payment was declined",
    preview: "Please update your payment details to keep your booking.",
    greeting: hi(c.name),
    blocks: [
      { callout: `We tried to charge your card for booking #${orderId}, but your bank declined the payment.`, title: "Payment declined", tone: "warn" },
      { p: "Please update or change your card so we can complete the payment." },
      { title: "Your booking", rows: [["Services", services]], total: ["Total", gbp(total)] },
      { button: { label: "Update card details", href: appUrl(`/get-payment-info/${orderId}`) } },
      { note: `Any questions? Email ${SUPPORT}. ${HOURS}` },
    ],
  }),
});

/** Mail\User\OrderCompleted (view: user.email.order_completed). */
export const orderCompleted = (c: Cust, m: Mech, o: { id: bigint; token: string; price: number; faults: boolean; car: string; labours: { name: string; price: number }[]; parts: { name: string; price: number }[] }) => ({
  to: c.email,
  subject: `Your booking with ${mName(m)} is complete`,
  html: emailLayout({
    eyebrow: `Booking #${o.id}`,
    title: "All done! Your car is sorted.",
    preview: `${mName(m)} has finished the work. ${gbp(o.price)} has been charged to your card.`,
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: `${mName(m)} has finished the work on your ${o.car || "car"}, and ${gbp(o.price)} has been charged to your card.` },
      ...(o.faults ? [{ callout: "Your mechanic noted some issues during the visit. Have a look at the inspection report for details.", title: "Inspection report", tone: "warn" } as Block, { links: [["View inspection report", appUrl(`/user/report/${o.token}/mechanic/${m.id}`)]] } as Block] : []),
      { title: "Labour", rows: o.labours.map((l) => [l.name, gbp(l.price)] as [string, string]) },
      { title: "Parts", rows: o.parts.map((p) => [p.name, gbp(p.price)] as [string, string]) },
      { rows: [["Vehicle", o.car]], total: ["Total paid", gbp(o.price)] },
      { h: "How did it go?" },
      { p: `Your review helps other drivers choose with confidence, and helps ${mName(m)} too.` },
      { button: { label: "Write a review", href: appUrl(`/user/review/${o.token}/mechanic/${m.id}`) } },
    ],
    signoff: "Thanks for choosing us,",
  }),
});

/** Mail\Mechanic\Quote\SendQuoteMail (view: ssc.mechanic.mail.send_quote) — follow-on quote. */
export const followOnQuote = (c: Cust & { street: string | null }, m: Mech, q: { id: bigint; price: number; labours: string[]; parts: string[] }, loc: string, car: Car) => ({
  to: c.email,
  subject: "Your mechanic has sent you a repair quote",
  html: emailLayout({
    eyebrow: "New repair quote",
    title: `${m.fname} ${m.lname} has sent you a quote`,
    preview: `A quote for ${gbp(q.price)} for your ${vehicle(car) || "car"}.`,
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: "Your mechanic has recommended some further work. Here's their quote:" },
      {
        title: "Quote details",
        rows: [["Vehicle", vehicle(car)], ["Registration", car.reg ?? ""], ["Location", `${loc}${c.street ? `, ${c.street}` : ""}`], ["Labour", q.labours.join(", ")], ["Parts", q.parts.join(", ")]],
        total: ["Total", gbp(q.price)],
      },
      { button: { label: "Book me in", href: loginLink(c.id, `/portal/follow-on/${q.id}`) } },
      { note: `Any questions? Email ${SUPPORT}.` },
    ],
  }),
});

/** Mail\User\Quote\NewQuotationReceived (view: ssc.mechanic.mail.response_quote). */
export const newQuotation = (c: Cust & { id: bigint }, m: Mech & { service_type: string | null }, o: { token: string; car: Car }, price: number, miles: number) => ({
  to: c.email,
  subject: `New quote from ${mName(m)}: ${gbp(price)}`,
  html: emailLayout({
    eyebrow: "New quote",
    title: `You have a new quote for your ${[o.car.make, o.car.model].filter(Boolean).join(" ") || "car"}`,
    preview: `${mName(m)} has quoted ${gbp(price)}.`,
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: "A mechanic has replied to your quote request." },
      { rows: [["Mechanic", mName(m)], ["Type", m.service_type === "Mobile Mechanic Service," ? "Mobile mechanic (comes to you)" : `Garage, ${miles} miles away`]], total: ["Price", gbp(price)] },
      { button: { label: "Book me in", href: loginLink(c.id, `/go/quote/${o.token}/mechanic/${m.id}`) } },
      { links: [["Ask the mechanic a question", appUrl(`/app/resolution/question/${m.id}/order/${o.token}/customer/${c.id}`)], ["See all my quotes", appUrl("/user/portal/quotes")]] },
    ],
  }),
});

/** Mail\ReviewResponse (markdown: ssc.mechanic.email.review_response). */
export const reviewResponse = (c: { lname: string; email: string }, company: string, r: { order_id: bigint; response: string; quality: number; punctuality: number; communication: number; review: string | null }) => ({
  to: c.email,
  subject: `${company} has replied to your review`,
  html: emailLayout({
    eyebrow: `Booking #${r.order_id}`,
    title: `${company} replied to your review`,
    preview: r.response.slice(0, 120),
    greeting: hi(c.lname),
    blocks: [
      { p: `${company} has replied to the review you left for booking #${r.order_id}.` },
      { quote: r.response, from: company },
      { h: "Your review" },
      { rows: ratings(r) },
      ...(r.review ? [{ quote: r.review, from: "You" } as Block] : []),
    ],
  }),
});

/** Notifications\User\Slots\ChooseSlotsMail */
export const chooseSlots = (c: { fname: string; lname: string; email: string }, orderId: bigint, orderToken: string, requestId: bigint) => ({
  to: c.email,
  subject: `New dates suggested for booking #${orderId}`,
  html: emailLayout({
    eyebrow: `Booking #${orderId}`,
    title: "Your mechanic has suggested new times",
    preview: "Pick the date and time that suits you best.",
    greeting: hi(`${c.fname} ${c.lname}`),
    blocks: [
      { p: `Your mechanic can't make the time you asked for on booking #${orderId}, so they've suggested some alternatives.` },
      { p: "Choose the date and time that works for you, and they'll schedule the visit." },
      { button: { label: "Choose a time", href: appUrl(`/choose/alternatives/${orderToken}/request/${requestId}`) } },
    ],
  }),
});

/** Mail\Bespoke\BespokeQuotaion (view: ssc.mechanic.bespoke.bespoke_email). */
export const bespokeEstimate = (to: { fname: string | null; lname: string | null; email: string }, m: Mech, b: { id: bigint; token: string; price: number; car: Car; labours: string[]; parts: string[] }) => ({
  to: to.email,
  subject: `${mName(m)} has sent you a repair estimate`,
  html: emailLayout({
    eyebrow: `Estimate #${b.id}`,
    title: "Your repair estimate is ready",
    preview: `${mName(m)} has estimated ${gbp(b.price)} for your ${vehicle(b.car) || "car"}.`,
    greeting: hi(`${to.fname ?? ""} ${to.lname ?? ""}`),
    blocks: [
      { p: `${mName(m)} (${m.fname} ${m.lname}) has sent you an estimate. Here's a summary. Open it to see everything and book.` },
      {
        title: "Estimate summary",
        rows: [
          ["Reference", `#${b.id}`],
          ["Mechanic", `${m.fname} ${m.lname}`],
          ["Vehicle", vehicle(b.car)],
          ["Registration", b.car.reg ?? ""],
          ["Labour", b.labours.join(", ")],
          ["Parts", b.parts.join(", ")],
        ],
        total: ["Total", gbp(b.price)],
      },
      { button: { label: "View and book", href: appUrl(`/user/portal/bespoke/${b.token}`) } },
    ],
  }),
});

// ---------------------------------------------------------------- customer booking flow

const ADMIN_INBOX = "info@smartservicingcentre.co.uk";

/** Notifications\Admin\NewOrderMailToAdmin — type "order" or "quote". */
export const newOrderToAdmin = (o: { type: "order" | "quote"; orderId: bigint; postcode: string; service: string; price?: number }) =>
  o.type === "order"
    ? {
        to: ADMIN_INBOX,
        subject: `New order in ${o.postcode}: ${gbp(o.price ?? 0)}`,
        html: emailLayout({
          eyebrow: `Order #${o.orderId}`,
          title: "A new order has come in",
          preview: `${o.service} in ${o.postcode}.`,
          blocks: [{ rows: [["Service", o.service], ["Postcode", o.postcode]], total: ["Order total", gbp(o.price ?? 0)] }, { button: { label: "Open the order", href: appUrl(`/admin/orders/view/${o.orderId}`) } }],
          signoff: "Thanks,",
        }),
      }
    : {
        to: ADMIN_INBOX,
        subject: `New quote request in ${o.postcode}`,
        html: emailLayout({
          eyebrow: `Quote #${o.orderId}`,
          title: "A new quote request has come in",
          preview: `${o.service} in ${o.postcode}.`,
          blocks: [{ rows: [["Service", o.service], ["Postcode", o.postcode]] }, { button: { label: "Open the quote", href: appUrl(`/admin/quotes/view/${o.orderId}`) } }],
          signoff: "Thanks,",
        }),
      };

/** Mail\User\NewOrderMail (view: user.email.new_order). */
export const newOrderCustomer = (c: Person, o: { id: bigint; price: number; car: Car; services: { name: string; parts: string[] }[]; slots: { date: string; time: string }[]; address: string }) => ({
  to: c.email,
  subject: `Thanks, we've got your booking (#${o.id})`,
  html: emailLayout({
    eyebrow: `Booking #${o.id}`,
    title: "Thanks, we've got your booking",
    preview: "We're finding the best mechanic for you now.",
    greeting: hi(full(c)),
    blocks: [
      { p: "Thank you for booking with Smart Servicing Centre. You've joined thousands of drivers who trust us to keep their cars on the road." },
      {
        title: "What happens next",
        steps: [
          "We find the best garage or mobile mechanic for you from our network.",
          "As soon as one accepts, we'll email you to confirm. This usually takes less than five hours.",
          "If you have a rarer car or live somewhere rural it can take a little longer. If anything comes up, our team will contact you.",
        ],
      },
      ...o.services.flatMap((s) => [{ list: [s.name], title: "Service" } as Block, ...(s.parts.length ? [{ list: s.parts, title: "Parts included" } as Block] : [])]),
      { rows: [["Booking reference", `#${o.id}`]], total: ["Total", gbp(o.price)] },
      {
        title: "Your vehicle",
        rows: [
          ["Registration", o.car.reg ?? ""],
          ["Make", o.car.make ?? ""],
          ["Model", o.car.model ?? ""],
          ["Fuel", o.car.fuel ?? ""],
          ["Engine", o.car.engine ?? ""],
          ["Year", String(o.car.year ?? "")],
        ],
      },
      { list: o.slots.map((s) => `${s.date}, ${s.time}`), title: "Your preferred times" },
      { rows: [["Address", o.address]], title: "Where" },
      { callout: "On the day, please leave your service book and locking wheel nut key (if you have one) on the passenger seat.", title: "Before your appointment" },
      { note: PRICE_NOTE },
      { note: "Under MOT rules introduced on 20 May 2018, if your vehicle has a defect classed as 'dangerous', we're not allowed to return it to you until the work to fix it is done." },
      { note: `Questions in the meantime? Email ${SUPPORT}.` },
    ],
  }),
});

/** Mail\order\Quotation\QuotationReceived (view: user.email.quotation_request). */
export const quotationReceived = (c: Person, o: { id: bigint; car: Car; services: string[] }) => ({
  to: c.email,
  subject: `We've received your quote request (#${o.id})`,
  html: emailLayout({
    eyebrow: `Quote request #${o.id}`,
    title: "Thanks, your quote request is in",
    preview: "Local mechanics will send you their quotes by email.",
    greeting: hi(full(c)),
    blocks: [
      { p: "Thanks for asking Smart Servicing Centre for a quote. You've joined thousands of drivers who trust us to keep their cars on the road." },
      {
        title: "What happens next",
        steps: [
          "We send your job to trusted mechanics near you, and they email you their quotes.",
          "Compare the quotes and book the one that suits you best.",
          "If you have a rarer car or live somewhere rural it can take a little longer. If anything comes up, our team will contact you.",
        ],
      },
      { title: "Your request", rows: [["Vehicle", vehicle(o.car)], ["Registration", o.car.reg ?? ""], ["Work needed", o.services.join(", ")]] },
      {
        title: "Our promise to you",
        list: [
          "Fair prices, always.",
          "Convenient: our mobile mechanics come to your home or workplace at no extra cost.",
          "Safe: all work is done by trusted mechanics, with a 12-month warranty on parts and labour.",
        ],
      },
      { h: "Good to know" },
      { p: "What's included? Every quote includes a 12-month warranty on parts and labour, plus VAT where it applies." },
      { p: "When do I pay? Only once the job is done. We ask for your card when you book to secure the slot, but nothing is taken until the work is complete." },
      { p: "Can I change my request? Yes, as many times as you like on our website." },
      { note: `Questions in the meantime? Email ${SUPPORT}.` },
    ],
  }),
});

/** Jobs\MessageCenterJob — the customer's message-centre form, copied to the SSC inbox. */
export const messageCentreToAdmin = (subject: string, message: string) => ({
  to: ADMIN_INBOX,
  subject,
  html: emailLayout({
    eyebrow: "Message centre",
    title: "A customer has sent a message",
    preview: message.slice(0, 120),
    blocks: [{ quote: message, from: "Customer" }, { button: { label: "Open orders", href: appUrl("/admin/orders/all") } }],
    signoff: "Thanks,",
  }),
});

/** Mail\User\AdminQuoteChat */
export const adminQuoteChat = (c: Person, orderId: bigint, message: string | null) => ({
  to: ADMIN_INBOX,
  subject: `New message from ${full(c)} about quote #${orderId}`,
  html: emailLayout({
    eyebrow: `Quote #${orderId}`,
    title: "A customer has replied",
    preview: message?.slice(0, 120) ?? `${full(c)} sent a message.`,
    blocks: [{ p: `${full(c)} has sent a message about quote #${orderId}.` }, ...(message ? [{ quote: message, from: full(c) } as Block] : []), { button: { label: "Open the quote", href: appUrl(`/admin/quotes/view/${orderId}`) } }],
    signoff: "Thanks,",
  }),
});

/** Mail\Mechanic\Quote\QuoteAcceptedMail / Bespoke\BespokeAcceptedMail / Follow_on_quote\follow_on_quote (to the mechanic). */
export const quoteAcceptedMechanic = (kind: "quote" | "estimate" | "follow-on", m: Person, a: { id: bigint; order_id: bigint }, services: string[]) => {
  const what = kind === "quote" ? "quote" : kind === "estimate" ? "estimate" : "follow-on quote";
  return {
    to: m.email,
    subject: `Congratulations, your ${what} #${a.order_id} has been accepted`,
    html: emailLayout({
      eyebrow: `Booking #${a.order_id}`,
      title: `Your ${what} has been accepted`,
      preview: "Set your arrival date and time in the app.",
      greeting: hi(full(m)),
      blocks: [
        { p: `Great news: the customer has accepted your ${what}${services.length ? ` for ${services.join(", ")}` : ""} and placed the order.` },
        { callout: "Open the booking in your app and set the date and time you'll arrive, so the customer knows when to expect you.", title: "Next step", tone: "ok" },
        { button: { label: "Set date and time", href: appUrl(`/mechanic/jobs/${a.id}`) } },
      ],
    }),
  };
};

/** Notifications\User\OrderScheduleOfMechanicMail (to the customer). */
export const waitingForMechanic = (c: Person, company: string | null, phone: string) => ({
  to: c.email,
  subject: "Your mechanic will confirm the visit time soon",
  html: emailLayout({
    eyebrow: "Booking update",
    title: "Waiting for your mechanic to confirm a time",
    preview: "We'll email you as soon as your mechanic schedules the visit.",
    greeting: hi(full(c)),
    blocks: [
      { p: `We've let ${company ?? "your mechanic"} know that you've accepted their quote. As soon as they set the visit time, we'll email you the confirmation and their expected arrival time.` },
      { p: `Questions, or need a different time? Call your mechanic directly on ${phone}.` },
    ],
  }),
});

/** Illuminate\Auth\Notifications\VerifyEmail */
export const verifyEmail = (to: string, url: string) => ({
  to,
  subject: "Please verify your email address",
  html: emailLayout({
    eyebrow: "Welcome",
    title: "Confirm your email address",
    preview: "One click and your account is ready to use.",
    greeting: "Hi there,",
    blocks: [
      { p: "Thanks for signing up to Smart Servicing Centre. Please confirm this is your email address so we can keep your account secure and send you booking updates." },
      { button: { label: "Verify my email", href: url } },
      { note: "This link expires in 60 minutes. If you didn't create an account, you can ignore this email." },
    ],
  }),
});

/** Illuminate\Auth\Notifications\ResetPassword */
export const resetPassword = (to: string, url: string) => ({
  to,
  subject: "Reset your password",
  html: emailLayout({
    eyebrow: "Account security",
    title: "Reset your password",
    preview: "Use this link to choose a new password. It expires in 60 minutes.",
    greeting: "Hi there,",
    blocks: [
      { p: "We received a request to reset the password for your account. Click the button below to choose a new one." },
      { button: { label: "Choose a new password", href: url } },
      { note: "This link expires in 60 minutes. If you didn't ask to reset your password, you can ignore this email and your password won't change." },
    ],
  }),
});

/** Notifications\AdminMechanicChatNotification — new message in the SSC ↔ mechanic support chat. */
export const adminMechanicChat = (to: { name: string; email: string }, from: string, orderId: number | bigint, orderToken: string) => {
  // Callers pass " from mechanic " style fragments.
  const who = from.trim().replace(/^from\s+/i, "");
  const sender = /^(mechanic|customer)$/i.test(who) ? `the ${who}` : who;
  return {
    to: to.email,
    subject: `New message${sender ? ` from ${sender}` : ""} about booking #${orderId}`,
    html: emailLayout({
      eyebrow: `Resolution centre · Booking #${orderId}`,
      title: "You have a new message",
      preview: `A new message about booking #${orderId}.`,
      greeting: hi(to.name),
      blocks: [{ p: `${sender ? `${sender[0].toUpperCase()}${sender.slice(1)} has` : "Someone has"} added a message in the resolution centre about booking #${orderId}.` }, { button: { label: "Read the message", href: appUrl(`/mechanic/ssc/chat/${orderToken}`) } }],
    }),
  };
};
