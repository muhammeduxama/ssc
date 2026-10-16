const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export { esc };

/** Content-ID of the inline logo attachment that sendMail adds to every email. */
export const LOGO_CID = "ssc-logo";

export const appUrl = (p = "") => `${(process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "")}${p}`;

/** The site's theme tokens (src/app/globals.css), inlined because email clients ignore stylesheets. */
const C = {
  page: "#f7f4f1",
  card: "#ffffff",
  line: "#ebe5df",
  ink: "#1f1a17",
  muted: "#5e554e",
  brand: "#b9532f",
  brandSoft: "#f9e9e1",
  accent: "#d97757",
  night: "#fbf6f2",
  nightLine: "#efe4dc",
  ok: "#1e7a45",
  okSoft: "#dff1e6",
  warn: "#8a5a07",
  warnSoft: "#fbeccf",
};
const SANS = "'IBM Plex Sans',Arial,Helvetica,sans-serif";
const DISPLAY = "'Space Grotesk','IBM Plex Sans',Arial,Helvetica,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";

const TONES = {
  info: [C.brandSoft, C.brand],
  ok: [C.okSoft, C.ok],
  warn: [C.warnSoft, C.warn],
} as const;

export type Block =
  | { p: string }
  | { h: string }
  | { button: { label: string; href: string } }
  | { rows: [string, string][]; title?: string; total?: [string, string] }
  | { list: string[]; title?: string }
  | { steps: string[]; title?: string }
  | { callout: string; title?: string; tone?: keyof typeof TONES }
  | { quote: string; from?: string }
  | { links: [string, string][] }
  | { note: string }
  | { html: string };

const label = (t?: string) => (t ? `<p style="margin:22px 0 8px;font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted}">${esc(t)}</p>` : "");
const para = (s: string, size = 15, color = C.ink) => `<p style="margin:0 0 14px;font-size:${size}px;line-height:${Math.round(size * 1.6)}px;color:${color}">${s}</p>`;

function block(b: Block): string {
  if ("p" in b) return para(esc(b.p));
  if ("h" in b) return `<h2 style="margin:26px 0 10px;font-family:${DISPLAY};font-size:18px;line-height:24px;font-weight:600;color:${C.ink}">${esc(b.h)}</h2>`;
  if ("note" in b) return para(esc(b.note), 12, C.muted);
  if ("html" in b) return b.html;
  if ("button" in b)
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:${C.brand};border-radius:10px"><a href="${esc(b.button.href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${esc(b.button.label)} &rarr;</a></td></tr></table>`;
  if ("list" in b)
    return `${label(b.title)}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px">${b.list
      .map((x) => `<tr><td valign="top" style="padding:9px 10px 0 0"><div style="width:6px;height:6px;border-radius:3px;background:${C.accent}"></div></td><td style="padding:2px 0;font-size:15px;line-height:24px;color:${C.ink}">${esc(x)}</td></tr>`)
      .join("")}</table>`;
  if ("steps" in b)
    return `${label(b.title)}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px">${b.steps
      .map((x, i) => `<tr><td valign="top" style="padding:2px 12px 10px 0"><div style="width:24px;height:24px;border-radius:12px;background:${C.brandSoft};color:${C.brand};font-family:${MONO};font-size:12px;line-height:24px;text-align:center;font-weight:600">${i + 1}</div></td><td style="padding:2px 0 10px;font-size:15px;line-height:24px;color:${C.ink}">${esc(x)}</td></tr>`)
      .join("")}</table>`;
  if ("callout" in b) {
    const [bg, fg] = TONES[b.tone ?? "info"];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:${bg};border-radius:10px;padding:14px 16px;font-size:14px;line-height:22px;color:${C.ink}">${b.title ? `<strong style="color:${fg}">${esc(b.title)}</strong><br>` : ""}${esc(b.callout)}</td></tr></table>`;
  }
  if ("quote" in b)
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="border-left:3px solid ${C.accent};background:${C.night};border-radius:0 10px 10px 0;padding:14px 16px;font-size:15px;line-height:24px;color:${C.ink};white-space:pre-line">${esc(b.quote)}${b.from ? `<br><span style="font-size:13px;color:${C.muted}">— ${esc(b.from)}</span>` : ""}</td></tr></table>`;
  if ("links" in b) return para(b.links.map(([t, href]) => `<a href="${esc(href)}" style="color:${C.brand};font-weight:600;text-decoration:none">${esc(t)}</a>`).join(`<span style="color:${C.line}">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`), 14);
  const rows = b.rows.filter(([, v]) => v);
  if (!rows.length && !b.total) return "";
  return `${label(b.title)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${C.line};border-radius:10px;border-collapse:separate;font-size:14px">${rows
    .map(([k, v], i) => `<tr><td style="padding:11px 14px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.muted};width:42%" valign="top">${esc(k)}</td><td style="padding:11px 14px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.ink};font-weight:600" valign="top">${esc(v)}</td></tr>`)
    .join("")}${
    b.total
      ? `<tr><td style="padding:13px 14px;${rows.length ? `border-top:1px solid ${C.line};` : ""}background:${C.night};border-radius:${rows.length ? "0 0 0 10px" : "10px 0 0 10px"};color:${C.ink};font-weight:600">${esc(b.total[0])}</td><td style="padding:13px 14px;${rows.length ? `border-top:1px solid ${C.line};` : ""}background:${C.night};border-radius:${rows.length ? "0 0 10px 0" : "0 10px 10px 0"};font-family:${DISPLAY};font-size:18px;color:${C.brand};font-weight:600">${esc(b.total[1])}</td></tr>`
      : ""
  }</table>`;
}

/**
 * Branded, inline-styled email in the site's theme (works in Gmail, Outlook and Apple Mail).
 * Text is escaped unless it is an {html} block.
 */
export function emailLayout(o: { title: string; eyebrow?: string; preview?: string; greeting?: string; blocks: Block[]; signoff?: string }) {
  const footerLinks: [string, string][] = [
    ["Help & FAQ", appUrl("/faq")],
    ["Contact us", appUrl("/contact-us")],
    ["Terms", appUrl("/legal_docs/customer-terms")],
    ["Privacy", appUrl("/legal_docs/privacy")],
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${C.page};font-family:${SANS};-webkit-font-smoothing:antialiased">
${o.preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preview)}${"&nbsp;&zwnj;".repeat(40)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="padding:0 4px 16px"><a href="${appUrl("/")}"><img src="cid:${LOGO_CID}" alt="Smart Servicing Centre" width="88" height="64" style="display:block;border:0;width:88px;height:64px"></a></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:4px;line-height:4px;font-size:0;background:${C.accent}">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 30px">
${o.eyebrow ? `<p style="margin:0 0 10px;font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.brand}">${esc(o.eyebrow)}</p>` : ""}
<h1 style="margin:0 0 20px;font-family:${DISPLAY};font-size:26px;line-height:32px;font-weight:600;letter-spacing:-.01em;color:${C.ink}">${esc(o.title)}</h1>
${o.greeting ? para(esc(o.greeting)) : ""}
${o.blocks.map(block).join("\n")}
<p style="margin:26px 0 0;font-size:15px;line-height:24px;color:${C.ink}">${esc(o.signoff ?? "Best wishes,")}<br><strong>The Smart Servicing Centre team</strong></p>
</td></tr></table></td></tr>
<tr><td style="padding:22px 8px 0;text-align:center;font-size:12px;line-height:20px;color:${C.muted}">
${footerLinks.map(([t, h]) => `<a href="${esc(h)}" style="color:${C.muted};text-decoration:underline">${t}</a>`).join("&nbsp;&nbsp;·&nbsp;&nbsp;")}<br>
Questions? Email <a href="mailto:info@smartservicingcentre.co.uk" style="color:${C.brand};text-decoration:none">info@smartservicingcentre.co.uk</a><br>
Smart Servicing Centre · 1-11 St Georges Road, Reading, Berkshire RG30 2RG
</td></tr>
</table></td></tr></table></body></html>`;
}
