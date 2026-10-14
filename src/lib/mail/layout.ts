const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export { esc };

export const appUrl = (p = "") => `${(process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "")}${p}`;

type Block =
  | { p: string }
  | { h: string }
  | { button: { label: string; href: string } }
  | { rows: [string, string][] ; title?: string }
  | { list: string[]; title?: string }
  | { note: string }
  | { html: string };

/** Branded, inline-styled email (works in Gmail/Outlook). Text is escaped unless {html}. */
export function emailLayout(o: { greeting?: string; blocks: Block[]; signoff?: string }) {
  const body = o.blocks
    .map((b) => {
      if ("p" in b) return `<p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#1f1a17">${esc(b.p)}</p>`;
      if ("h" in b) return `<h2 style="margin:22px 0 10px;font-family:Arial,sans-serif;font-size:17px;color:#1f1a17">${esc(b.h)}</h2>`;
      if ("note" in b) return `<p style="margin:14px 0;font-size:12px;line-height:18px;color:#5e554e">${esc(b.note)}</p>`;
      if ("html" in b) return b.html;
      if ("button" in b)
        return `<p style="margin:22px 0"><a href="${esc(b.button.href)}" style="display:inline-block;background:#b9532f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;font-size:15px">${esc(b.button.label)}</a></p>`;
      if ("list" in b)
        return `${b.title ? `<p style="margin:16px 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#5e554e">${esc(b.title)}</p>` : ""}<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:24px;color:#1f1a17">${b.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      return `${b.title ? `<p style="margin:16px 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#5e554e">${esc(b.title)}</p>` : ""}<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px;font-size:14px">${b.rows
        .map(([k, v]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #ebe5df;color:#5e554e;width:40%">${esc(k)}</td><td style="padding:8px 10px;border-bottom:1px solid #ebe5df;color:#1f1a17;font-weight:bold">${esc(v)}</td></tr>`)
        .join("")}</table>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f7f4f1;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" style="background:#f7f4f1;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #ebe5df;border-radius:12px;overflow:hidden">
<tr><td style="background:#fbf6f2;padding:14px 28px;font-size:20px;font-weight:bold;color:#1f1a17"><img src="${appUrl("/brand/logo.png")}" alt="Smart Servicing Centre" width="110" height="80" style="display:block;border:0;height:80px;width:110px"></td></tr>
<tr><td style="height:2px;background:#d97757;line-height:2px;font-size:0" width="96">&nbsp;</td></tr>
<tr><td style="padding:28px">
${o.greeting ? `<h1 style="margin:0 0 16px;font-size:22px;color:#1f1a17">${esc(o.greeting)}</h1>` : ""}
${body}
<p style="margin:24px 0 0;font-size:15px;line-height:24px;color:#1f1a17">${esc(o.signoff ?? "Best wishes,")}<br>Smart Servicing Centre Team</p>
</td></tr>
<tr><td style="background:#f7f4f1;padding:14px 28px;font-size:12px;color:#5e554e">You are receiving this email because you have an account with Smart Servicing Centre.</td></tr>
</table></td></tr></table></body></html>`;
}
