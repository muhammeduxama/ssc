import "server-only";
import type { Car } from "@/lib/format";
import { loginLink } from "@/lib/login-links";
import { appUrl, emailLayout } from "./layout";

type Person = { fname: string; lname: string; email: string };
const full = (p: Person) => `${p.fname} ${p.lname}`.trim();

/** Notifications\BookingCancelled (customer or mechanic). */
export const bookingCancelled = (to: Person, orderId: number | bigint, byCustomer = false) => ({
  to: to.email,
  subject: `Your booking #${orderId} has been cancelled`,
  html: emailLayout({
    greeting: `Hi ${full(to)}`,
    blocks: [{ p: byCustomer ? `Your booking ${orderId} has been cancelled by the customer` : `Your booking #${orderId} has been cancelled` }],
    signoff: "Regards,",
  }),
});

/** Mail\NoMechanicForOrderMail (markdown: ssc.admin.email.no_mechanic_for_order). */
export const noMechanicForOrder = (customer: Person) => ({
  to: customer.email,
  subject: "Unfortunately, no mechanic has accepted your booking",
  html: emailLayout({
    greeting: `Hi ${full(customer)}`,
    blocks: [
      { p: "Thank you for booking your car maintenance through our platform, we dispatched the job to all mechanics in your local area, but unfortunately, no one has accepted the booking. It could be due to several reasons, i.e. lockdown/pandemic, parts not available, or job is perhaps underquoted." },
      { p: "Regretfully I have to cancel this booking, and I can confirm that you have not been charged for this booking or cancellation." },
    ],
    signoff: "Thanks,",
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
  subject: `£${o.order.price.toFixed(2)}, A new job is available in ${o.postcode}`,
  html: emailLayout({
    blocks: [
      { p: 'You have a new booking request available. Please click on "View Booking Request" for more information.' },
      { note: "* NOTE: To increase your chances of securing the job, respond to the booking request soon as you can by clicking the below button." },
      { button: { label: "View Booking Request", href: loginLink(o.mechanic.id, `/go/request/${o.order.token}`) } },
      ...(o.order.order_for === "inspection and mot"
        ? [
            { rows: [["Booking reference", `#${o.order.id}`]] as [string, string][] },
            ...(o.adminQuote?.length
              ? [{ list: o.adminQuote, title: "Services" }]
              : o.services.flatMap((s) => [{ list: [s.name], title: "Service" }, ...(s.parts.length ? [{ list: s.parts, title: "Parts included" }] : [])])),
            { rows: [["Total cost", `£ ${o.order.price.toFixed(2)}`]] as [string, string][] },
            { note: "*Price of service, does not include potential advisory work recommended during service which will incur additional charges; see service schedule for items included. Discounts from current SMART Servicing Centre special offers, sales or promotions automatically applied to listed price. See Terms & Conditions for details." },
          ]
        : []),
      {
        title: "Requested details",
        rows: [
          ...(o.order.order_for === "repairs" ? ([["Service", o.services.map((s) => s.name).join(", ")]] as [string, string][]) : []),
          ["Registration number", o.car.reg ?? ""],
          ["Postal code", o.postcode],
        ],
      },
      {
        title: "Vehicle details",
        rows: [
          ["Vehicle make", o.car.make ?? ""],
          ["Vehicle model", o.car.model ?? ""],
          ["Vehicle year", String(o.car.year ?? "")],
          ["Vehicle engine", o.car.engine ?? ""],
          ["Vehicle fuel", o.car.fuel ?? ""],
        ],
      },
    ],
  }),
});

/** Notifications\MessageCenter. */
export const messageCenter = (to: { name: string; email: string }, orderId: number | bigint, from: string, link: string) => ({
  to: to.email,
  subject: `New message received for the resolution centre regarding booking #${orderId}`,
  html: emailLayout({
    greeting: `Hi ${to.name}!`,
    blocks: [
      { p: `A new message has been added by ${from} to the resolution centre regarding booking #${orderId}` },
      { button: { label: "View Message", href: appUrl(link) } },
      { p: "Thank you for using our application!" },
    ],
    signoff: "Regards,",
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
const quoteRows = (car: string, lines: QuoteLine[], deadlineDays: number, price: unknown) =>
  [
    ["Vehicle details", car],
    ["Service required", lines.filter((l) => l.type === "labour").map((l) => l.name).join(", ")],
    ["Included parts", lines.filter((l) => l.type === "part").map((l) => l.name).join(", ")],
    ["Quote deadline", new Date(Date.now() + deadlineDays * 864e5).toLocaleString("en-GB")],
    ["Your price", `£${Number(price ?? 0).toFixed(2)}`],
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
  return {
    to: o.users.email,
    subject: `Quote for your ${(o.notes ?? "").split(/\s+/).slice(0, 5).join(" ")} (${make})`,
    html: emailLayout({
      greeting: `Hi ${full(o.users)}, your quote is ready!`,
      blocks: [
        { p: "Thank you for requesting a quote from Smart Servicing Centre. You're only one step away from getting your car sorted! We finished building your quote and suggest you book soon to secure the soonest available mechanic." },
        { list: ["It only takes 2 minutes to book online.", "There's no need to go to the garage - our mechanics come to you.", "You get a fixed price before you book, so you know what you're going to pay."], title: "Remember" },
        { rows: quoteRows(carLine(o.car_data), q.adminquotedetails, 7, q.price), title: "The details of the booking are as follows" },
        { button: { label: "Book Service", href: loginLink(o.users.id, `/portal/quotes/${o.id}/book`) } },
        ...(q.notes ? [{ h: "Notes" }, { p: q.notes }] : []),
        { html: `<p style="font-size:15px">Should you wish to close your job, then please <a href="${appUrl("/user/portal/quotes")}">click here</a></p>` },
      ],
      signoff: "Thanks,",
    }),
  };
};

/** Mail\AdminQuoteReminder (markdown: admin.emails.quote_reminder). */
export const adminQuoteReminder = (o: QuoteOrder, q: AdminQuote) => ({
  to: o.users.email,
  subject: "Your quote is waiting",
  html: emailLayout({
    greeting: `Hi ${full(o.users)}, friendly quote reminder!`,
    blocks: [
      { p: "Have you gotten the chance to review your quote yet? We've listed all the details below for you! I'd love you to give Smart Servicing Centre a try." },
      { list: ["It only takes 2 minutes to book online.", "There's no need to go to the garage - our mechanics come to you.", "You get a fixed price before you book, so you know what you're going to pay."], title: "Reminder" },
      { p: `Don't forget: your quote will expire on ${new Date(Date.now() + 6 * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} if not accepted by then.` },
      { rows: quoteRows(carLine(o.car_data), q.adminquotedetails, 6, q.price), title: "The details of the booking are as follows" },
      { button: { label: "Book Service", href: loginLink(o.users.id, `/portal/quotes/${o.id}/book`) } },
    ],
    signoff: "Thanks,",
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
    subject: "Customer has requested a repair quote from you",
    html: emailLayout({
      blocks: [
        { p: `(REQUESTED QUOTE: ${o.notes?.trim() ? o.notes : o.services.join(", ")})` },
        { note: "* NOTE: To increase your chances of securing the job, respond to the requested quote soon as you can." },
        { button: { label: "Send Quote", href: loginLink(mechanic.id, `/go/request/${o.token}`) } },
        {
          title: "Requested quote & vehicle information",
          rows: [
            ["Service", o.services.join(", ")],
            ["Registration number", c.reg ?? ""],
            ["Name", full(o.users)],
            ["Postal code", o.postcode],
            ["Vehicle make", c.make ?? ""],
            ["Vehicle model", c.model ?? ""],
            ["Vehicle fuel", c.fuel ?? ""],
            ["Vehicle engine", String(c.engine ?? "")],
            ["Vehicle year", String(c.year ?? "")],
          ],
        },
        { note: "Smart Servicing Centre, 1-11 St Georges Road Reading Berkshire, RG30 2RG" },
      ],
    }),
  };
};

/** Mail\CustomerQuoteChat (markdown: ssc.admin.email.quotechat). */
export const customerQuoteChat = (o: { id: bigint; users: Person & { id: bigint } }, message: string) => ({
  to: o.users.email,
  subject: "you have recieved a new message",
  html: emailLayout({
    greeting: `Hi ${full(o.users)},`,
    blocks: [
      { p: `You have received a message from Smart Servicing Centre against your order NO ${o.id}` },
      { h: "Message" },
      { p: message },
      { button: { label: "Reply", href: loginLink(o.users.id, `/portal/quotes/${o.id}/chat`) } },
    ],
    signoff: "Thanks,",
  }),
});

/** Mail\Mechanic\Mail\RequireDocMail (view: ssc.mechanic.mail.docs; Laravel's default subject from the class name). */
export const requireDocs = (email: string, token: string) => ({
  to: email,
  subject: "Require Doc Mail",
  html: emailLayout({
    greeting: "Hello, Welcome to Smart Servicing Center!",
    blocks: [
      { p: "Thanks again for your interest to work with us and we are looking forward to working with you. You are nearly ready to accept work with Smart Servicing Centre! All we need now is a clear image of the following documents:" },
      { list: ["Motor trade insurance", "Public liability insurance (if you hold Employers Liability this usually is under subsection 7, 8, or 9)", "Qualifications"] },
      { note: "(You can take a picture on your mobile if you don’t have access to a scanner)" },
      { button: { label: "Add Require Documents", href: appUrl(`/mechanic/${token}/docs`) } },
    ],
  }),
});

/** Mail\GeneralEmail (view: ssc.admin.email.send.general) — the message is admin-authored HTML. */
export const generalEmail = (to: string, subject: string, messageHtml: string, files: { src: string }[]) => ({
  to,
  subject,
  html: emailLayout({
    blocks: [
      { h: subject },
      { html: `<div style="font-size:15px;line-height:24px;color:#1f1a17">${messageHtml}</div>` },
      ...(files.length ? [{ list: files.map((f) => appUrl(`/legacy/${f.src}`)), title: "Attachments" }] : []),
    ],
  }),
});

/** Mail\Admin\JoinNetwork (view: ssc.admin.email.mechanic.join_network). */
export const joinNetwork = (to: string, subject: string) => ({
  to,
  subject,
  html: emailLayout({
    greeting: "Flexible mechanic work at your fingertips, exclusive access to 1000's of jobs.",
    blocks: [
      { h: "HIGHER REVENUES, SMART WORK!" },
      { p: "Know the unknowns: Leverage the efficiency of your business with Smart Servicing Centre. Take control of your business, increase your productivity, and put your business in the best shape possible to face the future." },
      {
        title: "Join us as a mobile mechanic or garage",
        list: [
          "FREE to join - no subscription fee.",
          "Send estimates and quotes to customers.",
          "Fast payment into your account through stripe payment.",
          "Exclusive access to a continuous stream of work.",
          "Accept the jobs you want when you want.",
          "Organise the way your business operates.",
          "Reduce the inefficiencies and wastages.",
          "Put your full potential into your business.",
        ],
      },
      { p: "www.smartservicingcentre.co.uk is the leading marketplace for car servicing and repairs in the UK, with over 20,000 customer inquiries received each month." },
      { p: "The website is a one-stop-shop for customers to have access to all of the tremendous Local Garages and Mobile Mechanics in their area by receiving quotes, having access to garage reviews and contact details for an easy book in process." },
      { button: { label: "REGISTER NOW", href: appUrl("/join-network") } },
      { h: "What do our partners say?" },
      { p: "Stef Autos — “We have been working with the smart servicing centre for more than a year now, and the team is amicable and easy to work with. It has worked well for an additional income for us.”" },
      { p: "Auto Solutions — “I would recommend smart servicing centre to the mechanic who wants an easier way to find and manage new customers.”" },
    ],
  }),
});

/** Mail\ReviewForMechanic (markdown: ssc.mechanic.email.review_for_mechanic). */
export const reviewForMechanic = (m: { company: string; email: string }, r: { order_id: number; quality: number; punctuality: number; communication: number; review: string; token: string }) => ({
  to: m.email,
  subject: `The customer from booking #${r.order_id} has left you a new review.`,
  html: emailLayout({
    greeting: `Hi ${m.company},`,
    blocks: [
      { p: `The customer from booking #${r.order_id} has left you a new review.` },
      { title: "Ratings", rows: [["Quality", `${r.quality}/5`], ["Punctuality", `${r.punctuality}/5`], ["Communication", `${r.communication}/5`]] },
      { h: "Review content" },
      { p: r.review },
      { button: { label: "Respond to this review", href: appUrl(`/mechanic/respond/review/${r.token}`) } },
    ],
    signoff: "Thanks,",
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
  subject: `${mName(m)} has accepted your booking!`,
  html: emailLayout({
    greeting: `Hi ${c.fname} ${c.lname}`,
    blocks: [
      { p: `Your booking request has been accepted by ${mName(m)} (Mechanic Name : ${m.fname} ${m.lname}) for the ${slot.date}, arriving between ${slot.time}.` },
      { p: `You're in good hands with ${mName(m)}. We thoroughly check the qualifications, accreditations and work history of all garage / mobile mechanics in our network.` },
      ...(o.paid ? [] : [{ p: `Please confirm and finalise your order by providing your card details against order no #${o.id}.` }, { button: { label: "Authorize card payment", href: payLink(c, m.id, o.id) } }]),
      { p: `If you have any questions for ${mName(m)} you can contact them directly on ${m.phone}, or if you would like to book a different garage / mobile mechanic please let us know within 1 hour.` },
      { rows: [["Service date", `${slot.time} - ${slot.date}`]], title: "Mechanic time schedule" },
      { html: `<p style="font-size:13px;color:#5e554e"><a href="${appUrl("/legal_docs/terms")}">Terms &amp; Conditions</a> · <a href="${appUrl("/legal_docs/booking")}">Booking terms</a></p>` },
    ],
    signoff: "Thanks,",
  }),
});

/** Notifications\Mechanic\Order\OrderAcceptedByYou (sent to the customer's name/email in Laravel). */
export const orderAcceptedByYou = (to: { name: string; email: string }, orderId: number | bigint, date: string, time: string) => ({
  to: to.email,
  subject: "Order Accepted Successfully",
  html: emailLayout({ greeting: `Hi ${to.name}`, blocks: [{ p: `Booking # ${orderId} successfully accepted! You are scheduled to visit the customer on ${date.replace(/\b\w/g, (x) => x.toUpperCase())}, between ${time}.` }], signoff: "Regards," }),
});

/** Mail\User\FinalizeOrder (view: user.email.finalize_order). */
export const finalizeOrder = (c: Cust, mechanicId: bigint, o: { id: bigint; price: number; items: { name: string; price: number }[] }) => ({
  to: c.email,
  subject: "Finalize Order",
  html: emailLayout({
    greeting: `Hi ${c.fname} ${c.lname},`,
    blocks: [
      { p: `Please confirm and finalise your order by providing your card details against order no #${o.id}.` },
      { h: "Why provide your card details now?" },
      { p: "Providing your card details allows us to make payment seamless and secure. You won't be charged a penny by your mechanic until the work is complete." },
      { title: `Booking summary — £${o.price.toFixed(2)}`, rows: o.items.map((i) => [i.name, `£${i.price.toFixed(2)}`] as [string, string]) },
      { button: { label: "Authorize card payment", href: payLink(c, mechanicId, o.id) } },
      { note: "If you have any questions please contact us at support@smartservicingcentre.co.uk. Opening hours 08:30 - 18:00 Monday - Friday and 09:00 - 17:00 Saturday." },
    ],
  }),
});

/** Notifications\Mechanic\OrderReminder (links to the job; Laravel linked the order id by mistake). */
export const orderReminder = (m: { name: string; email: string }, orderId: bigint, assignId: bigint) => ({
  to: m.email,
  subject: "Reminder for tomorrow's order!",
  html: emailLayout({
    greeting: `Hi ${m.name}`,
    blocks: [
      { p: `Just a quick reminder! You have accepted booking #${orderId} scheduled for tomorrow. If you have any questions or you need to reschedule, don't hesitate to call your customer and reschedule the visit in your app.` },
      { button: { label: "View Booking", href: appUrl(`/mechanic/jobs/${assignId}`) } },
    ],
    signoff: "Regards,",
  }),
});

/** Notifications\User\CardDeclined (Laravel hard-coded £194.99; the real total is used). */
export const cardDeclined = (c: { name: string; email: string }, orderId: bigint, total: number, services: string) => ({
  to: c.email,
  subject: "Card Declined",
  html: emailLayout({
    greeting: `Hi, ${c.name}`,
    blocks: [
      { p: `We are unable to charge your card against order number ${orderId}. Your bank declined a payment.` },
      { p: `Total Order Amount £${total.toFixed(2)}` },
      { button: { label: "Authorise Card Payment", href: appUrl(`/get-payment-info/${orderId}`) } },
      { list: [services], title: "Your order summary" },
      { p: `Please update or change your payment method against order no ${orderId}.` },
      { note: "If you have any questions, please contact us at support@smartservicingcentre.co.uk. Opening hours 08:30 - 18:00 Monday - Friday and 09:00 - 17:00 Saturday." },
    ],
    signoff: "Regards,",
  }),
});

/** Mail\User\OrderCompleted (view: user.email.order_completed). */
export const orderCompleted = (c: Cust, m: Mech, o: { id: bigint; token: string; price: number; faults: boolean; car: string; labours: { name: string; price: number }[]; parts: { name: string; price: number }[] }) => ({
  to: c.email,
  subject: "Order Completed",
  html: emailLayout({
    greeting: `Hi ${c.fname} ${c.lname}`,
    blocks: [
      { p: `Congratulations your booking with ${mName(m)} is complete! ${mName(m)} has charged £${o.price.toFixed(2)} to your card.` },
      { button: { label: "Write A Review", href: appUrl(`/user/review/${o.token}/mechanic/${m.id}`) } },
      ...(o.faults ? [{ html: `<p><a href="${appUrl(`/user/report/${o.token}/mechanic/${m.id}`)}">View inspection report</a></p>` }] : []),
      { title: "Labour", rows: o.labours.map((l) => [l.name, `£${l.price.toFixed(2)}`] as [string, string]) },
      { title: "Parts included", rows: o.parts.map((p) => [p.name, `£${p.price.toFixed(2)}`] as [string, string]) },
      { rows: [["Total price", `£${o.price.toFixed(2)} — PAID`], ["Vehicle", o.car]] },
    ],
    signoff: "Thanks,",
  }),
});

/** Mail\Mechanic\Quote\SendQuoteMail (view: ssc.mechanic.mail.send_quote) — follow-on quote. */
export const followOnQuote = (c: Cust & { street: string | null }, m: Mech, q: { id: bigint; price: number; labours: string[]; parts: string[] }, loc: string, car: Car) => ({
  to: c.email,
  subject: "Your mechanic has sent a repair quote!",
  html: emailLayout({
    greeting: `Hi ${c.fname} ${c.lname}`,
    blocks: [
      { p: `You have received a quote from ${m.fname} ${m.lname}` },
      { title: "Quote details", rows: [["Location", `${loc}${c.street ? `, ${c.street}` : ""}`], ["Vehicle", [car.make, car.model, car.year, car.engine, car.fuel].filter(Boolean).join(" ")], ["Registration", car.reg ?? ""], ["Labour", q.labours.join(", ")], ["Parts", q.parts.join(", ")], ["Total price", `£${q.price.toFixed(2)}`]] },
      { button: { label: "Book Me In", href: loginLink(c.id, `/portal/follow-on/${q.id}`) } },
      { note: "Email: support@smartservicingcentre.co.uk" },
    ],
    signoff: "Thanks,",
  }),
});

/** Mail\User\Quote\NewQuotationReceived (view: ssc.mechanic.mail.response_quote). */
export const newQuotation = (c: Cust & { id: bigint }, m: Mech & { service_type: string | null }, o: { token: string; car: Car }, price: number, miles: number) => ({
  to: c.email,
  subject: `New quote from ${mName(m)} for your work`,
  html: emailLayout({
    greeting: `Hi ${c.fname} ${c.lname}`,
    blocks: [
      { p: `We have a new quote for your ${o.car.make ?? ""} ${o.car.model ?? ""}.` },
      { rows: [["Mechanic", `${mName(m)} (${m.service_type === "Mobile Mechanic Service," ? "Mobile mechanic" : `Garage, ${miles} miles away`})`], ["Price", `£${price.toFixed(2)}`]] },
      { button: { label: "Book Me In", href: loginLink(c.id, `/go/quote/${o.token}/mechanic/${m.id}`) } },
      { html: `<p style="font-size:14px"><a href="${appUrl(`/app/resolution/question/${m.id}/order/${o.token}/customer/${c.id}`)}">Ask the mechanic a question</a> · <a href="${appUrl("/user/portal/quotes")}">See all my quotes</a></p>` },
    ],
  }),
});

/** Mail\ReviewResponse (markdown: ssc.mechanic.email.review_response). */
export const reviewResponse = (c: { lname: string; email: string }, company: string, r: { order_id: bigint; response: string; quality: number; punctuality: number; communication: number; review: string | null }) => ({
  to: c.email,
  subject: `The ${company} has respond to your review`,
  html: emailLayout({
    greeting: `Hi ${c.lname},`,
    blocks: [
      { p: `The ${company} has respond to your review for your completed booking #${r.order_id}.` },
      { h: "Response" },
      { p: r.response },
      { title: "Your ratings", rows: [["Quality", `${r.quality}/5`], ["Punctuality", `${r.punctuality}/5`], ["Communication", `${r.communication}/5`]] },
      { h: "Review content" },
      { p: r.review ?? "" },
    ],
    signoff: "Thanks,",
  }),
});

/** Notifications\User\Slots\ChooseSlotsMail */
export const chooseSlots = (c: { fname: string; lname: string; email: string }, orderId: bigint, orderToken: string, requestId: bigint) => ({
  to: c.email,
  subject: `Date and time alternative(s) are received for booking #${orderId}`,
  html: emailLayout({
    greeting: `Dear Customer ${c.fname} ${c.lname}`,
    blocks: [
      { p: `Reference to booking number #${orderId} your mechanic has suggested alternatives date and time for the requested repairs for your vehicle.` },
      { p: "Please choose an alternative day and time that suits you so mechanic can schedule the visit." },
      { button: { label: "View Alternatives", href: appUrl(`/choose/alternatives/${orderToken}/request/${requestId}`) } },
    ],
    signoff: "Regards,",
  }),
});

/** Mail\Bespoke\BespokeQuotaion (view: ssc.mechanic.bespoke.bespoke_email). */
export const bespokeEstimate = (to: { fname: string | null; lname: string | null; email: string }, m: Mech, b: { id: bigint; token: string; price: number; car: Car; labours: string[]; parts: string[] }) => ({
  to: to.email,
  subject: `${mName(m)} has sent you a repair estimate`,
  html: emailLayout({
    greeting: `Hi ${to.fname ?? ""} ${to.lname ?? ""}`.trim(),
    blocks: [
      { p: `You have received a new quote #${b.id} from ${mName(m)} (mechanic name ${m.fname} ${m.lname}). You can view the complete quotation by simply clicking the link below.` },
      { button: { label: "Book Me In", href: appUrl(`/user/portal/bespoke/${b.token}`) } },
      {
        title: "Quotation summary",
        rows: [
          ["Quotation ref", `#${b.id}`],
          ["Mechanic", `${m.fname} ${m.lname}`],
          ["Vehicle", [b.car.make, b.car.model, b.car.engine, b.car.year, b.car.fuel].filter(Boolean).join(" ")],
          ["Registration", b.car.reg ?? ""],
          ...(b.labours.length ? ([["Labours", b.labours.join(", ")]] as [string, string][]) : []),
          ...(b.parts.length ? ([["Parts", b.parts.join(", ")]] as [string, string][]) : []),
          ["Total", `£${b.price.toFixed(2)}`],
        ],
      },
      { note: "Smart Servicing Centre, 1-11 St Georges Road Reading Berkshire, RG30 2RG" },
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
        subject: `New order is received in ${o.postcode}`,
        html: emailLayout({
          greeting: "Hello!",
          blocks: [
            { p: "The customer has placed an order for" },
            { p: o.service },
            { p: `New order has been recieved ${o.postcode}. The total price of order is £${(o.price ?? 0).toFixed(2)} You can check new order by clicking the below button` },
            { button: { label: "Check Order", href: appUrl(`/admin/orders/view/${o.orderId}`) } },
            { p: "Thank you for using our application!" },
          ],
          signoff: "Regards,",
        }),
      }
    : {
        to: ADMIN_INBOX,
        subject: `New quotation is received in ${o.postcode}`,
        html: emailLayout({
          greeting: "Hello!",
          blocks: [
            { p: `The customer has requested a quote for ${o.service}.` },
            { p: `New quotation has been recieved in ${o.postcode}. You can check new quotation by clicking the below button` },
            { button: { label: "Check Quotation", href: appUrl(`/admin/quotes/view/${o.orderId}`) } },
            { p: "Thank you for using our application!" },
          ],
          signoff: "Regards,",
        }),
      };

/** Mail\User\NewOrderMail (view: user.email.new_order). */
export const newOrderCustomer = (c: Person, o: { id: bigint; price: number; car: Car; services: { name: string; parts: string[] }[]; slots: { date: string; time: string }[]; address: string }) => ({
  to: c.email,
  subject: "Thanks, we got your order",
  html: emailLayout({
    greeting: `Hi ${full(c)},`,
    blocks: [
      { p: "Thank you for booking via Smart Servicing Centre! You've just joined thousands of happy customers who trust us to get their car worries sorted." },
      { h: "Here's what will happen next:" },
      {
        list: [
          "We're currently finding the best garage/mechanic for you from our network.",
          "Once we've matched your booking request with a trusted garage / mobile mechanic, you will receive an email confirmation. This typically takes less than 5 hours.",
          "It can take a bit longer to find a suitable garage / mobile mechanic if you have a rare car or if you live in rural area. If there are any issues our friendly customer service team will contact you.",
        ],
      },
      { p: "Please review your booking details below. If there's anything you'd like to discuss meanwhile, feel free to contact us on email at support@smartservicingcentre.co.uk" },
      { rows: [["Booking reference", `#${o.id}`]] },
      ...o.services.flatMap((s) => [{ list: [s.name], title: "Service" }, ...(s.parts.length ? [{ list: s.parts, title: "Parts included" }] : [])]),
      { rows: [["Total cost", `£ ${o.price.toFixed(2)}`]] },
      { note: "*Price of service, does not include potential advisory work recommended during service which will incur additional charges; see service schedule for items included. Discounts from current SMART Servicing Centre special offers, sales or promotions automatically applied to listed price. See Terms & Conditions for details." },
      {
        title: "Vehicle",
        rows: [
          ["Vehicle type", "CAR"],
          ["Registration number", o.car.reg ?? ""],
          ["Make", o.car.make ?? ""],
          ["Model", o.car.model ?? ""],
          ["Fuel", o.car.fuel ?? ""],
          ["Engine", o.car.engine ?? ""],
          ["Year", String(o.car.year ?? "")],
        ],
      },
      { list: o.slots.map((s) => `${s.time} - ${s.date}`), title: "Service date" },
      { rows: [["Address", o.address]] },
      { note: "*IMPORTANT! On the day of the service, please ensure your vehicle's service book and locking wheel nut key (if it has one) are left on the passenger seat prior to collection." },
      { note: "Please note: under new MOT test regulations - effective 20 May 2018 - should your vehicle have a defect classified as 'dangerous', legally we will not be able to return it to your delivery location until the required work is completed." },
    ],
    signoff: "Thanks, Smart Servicing Centre Team",
  }),
});

/** Mail\order\Quotation\QuotationReceived (view: user.email.quotation_request). */
export const quotationReceived = (c: Person, o: { id: bigint; car: Car; services: string[] }) => ({
  to: c.email,
  subject: `We have received your quote request${o.id}`,
  html: emailLayout({
    greeting: `Hi ${full(c)},`,
    blocks: [
      { p: "Thank you for requesting a quote from smart servicing centre! You've just joined thousands of happy customers who trust us to get their car worries sorted." },
      { h: "Here's what will happen next:" },
      {
        list: [
          "Your job has been offered to our network of service providers and their quotes will be emailed to you.",
          "Once you have received your quotes, simply choose the best quote for you.",
          "It can take a bit longer for a garage / mobile mechanic to send you quote if you have a rare car or if you live in rural area. If there are any issues our friendly customer service team will contact you.",
        ],
      },
      { p: "Please review your job details below. If there's anything you'd like to discuss meanwhile, feel free to contact us on support@smartservicingcentre.co.uk" },
      { title: "Vehicle detail", rows: [["Vehicle", [o.car.make, o.car.model, o.car.engine, o.car.year, o.car.fuel].filter(Boolean).join(" ")], ["Registration no", o.car.reg ?? ""]] },
      { list: o.services, title: "Services" },
      { h: "Our promise to you" },
      {
        list: [
          "Always fair pricing",
          "Super convenient - Our garages or mobile mechanics come to your house or workplace, FREE of charge.",
          "Safe - All work is conducted by trusted garages or mobile mechanics and all repairs and parts come with a FULL 12 month warranty.",
        ],
      },
      { h: "Frequently asked questions" },
      { p: "What's included in the quote? Service & repair quotes include a 12 month warranty on parts and labour. VAT is included where applicable." },
      { p: "When do I pay? You only pay after the job is done. When you book we ask for your card details to secure your booking however no money is taken until the work is complete." },
      { p: "Can I amend my quote? Yes, you can amend as many times as you like on our website." },
    ],
    signoff: "Thanks, Smart Servicing Centre Team",
  }),
});

/** Jobs\MessageCenterJob — the customer's message-centre form, copied to the SSC inbox. */
export const messageCentreToAdmin = (subject: string, message: string) => ({
  to: ADMIN_INBOX,
  subject,
  html: emailLayout({ greeting: "Hi SSC Administration!", blocks: [{ p: message }, { button: { label: "View Job", href: appUrl("/admin/orders/all") } }], signoff: "Regards," }),
});

/** Mail\User\AdminQuoteChat */
export const adminQuoteChat = (c: Person, orderId: bigint, message: string | null) => ({
  to: ADMIN_INBOX,
  subject: "you have recieved a new message",
  html: emailLayout({
    greeting: "Hi Smart Servicing Centre,",
    blocks: [{ p: `You have received a message from ${full(c)} against quote #${orderId}` }, ...(message ? [{ h: "Message" }, { p: message }] : []), { button: { label: "Open quote", href: appUrl(`/admin/quotes/view/${orderId}`) } }],
    signoff: "Thanks,",
  }),
});

/** Mail\Mechanic\Quote\QuoteAcceptedMail / Bespoke\BespokeAcceptedMail / Follow_on_quote\follow_on_quote (to the mechanic). */
export const quoteAcceptedMechanic = (kind: "quote" | "estimate" | "follow-on", m: Person, a: { id: bigint; order_id: bigint }, services: string[]) => ({
  to: m.email,
  subject: kind === "quote" ? "Congrats! Quote accepted & order placed by the customer" : kind === "estimate" ? "Estimate accepted & order placed by the customer" : "Follow on accepted & order placed by the customer",
  html: emailLayout({
    greeting: `Hi ${full(m)}`,
    blocks: [
      { p: `Congratulation. Your ${kind === "follow-on" ? "follow on quote" : "quote"} (#${a.order_id})${services.length ? ` for (${services.join(", ")})` : ""} has been accepted by the customer. Visit booking in your app and set the time and date of your arrival.` },
      { button: { label: "Set Time & Date", href: appUrl(`/mechanic/jobs/${a.id}`) } },
    ],
    signoff: "Best Wishes, Smart Servicing Centre Team",
  }),
});

/** Notifications\User\OrderScheduleOfMechanicMail (to the customer). */
export const waitingForMechanic = (c: Person, company: string | null, phone: string) => ({
  to: c.email,
  subject: "Waiting for a mechanic to confirm time & date of the visit.",
  html: emailLayout({
    greeting: `Hi ${full(c)}`,
    blocks: [
      { p: `${company ?? "Your mechanic"} has been alerted that you have accepted their quote. We'll send you a confirmation email and the details of your mechanic's expected arrival time once your mechanic schedules his visit timing.` },
      { p: `If you have any questions or need to reschedule, don't hesitate to call your mechanic directly on ${phone} and reschedule your appointment.` },
    ],
    signoff: "Regards,",
  }),
});

/** Illuminate\Auth\Notifications\VerifyEmail */
export const verifyEmail = (to: string, url: string) => ({
  to,
  subject: "Verify Email Address",
  html: emailLayout({
    greeting: "Hello!",
    blocks: [{ p: "Please click the button below to verify your email address." }, { button: { label: "Verify Email Address", href: url } }, { p: "If you did not create an account, no further action is required." }],
    signoff: "Regards, Smart Servicing Centre",
  }),
});

/** Illuminate\Auth\Notifications\ResetPassword */
export const resetPassword = (to: string, url: string) => ({
  to,
  subject: "Reset Password Notification",
  html: emailLayout({
    greeting: "Hello!",
    blocks: [
      { p: "You are receiving this email because we received a password reset request for your account." },
      { button: { label: "Reset Password", href: url } },
      { p: "This password reset link will expire in 60 minutes." },
      { p: "If you did not request a password reset, no further action is required." },
    ],
    signoff: "Regards, Smart Servicing Centre",
  }),
});

/** Notifications\AdminMechanicChatNotification — new message in the SSC ↔ mechanic support chat. */
export const adminMechanicChat = (to: { name: string; email: string }, from: string, orderId: number | bigint, orderToken: string) => ({
  to: to.email,
  subject: `A new message${from}has been added to resolution centre`,
  html: emailLayout({
    greeting: `Hi ${to.name}`,
    blocks: [
      { p: `A new message${from}has been added to the resolution centre regarding booking #${orderId}` },
      { button: { label: "View Message", href: appUrl(`/mechanic/ssc/chat/${orderToken}`) } },
      { p: "Thank you for using our application!" },
    ],
    signoff: "Regards,",
  }),
});
