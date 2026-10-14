/**
 * Turns the legal pages' pasted CMS HTML into a clean outline:
 *   "1) INFORMATION ABOUT US"   → numbered section heading  (<h2>1. Information about us</h2>)
 *   "a) Smart Servicing Centre…" → bullet                     (<ul class="legal-list"><li>…)
 *   "i) The fact that…" / "I)"   → sub-bullet                 (nested <ul class="legal-sublist">)
 * The markers were typed by hand in the old editor (often as bold text, sometimes several per
 * paragraph separated by <br>), so they are detected from the visible text and removed from the HTML.
 */

type Line = { kind: "heading"; num: string; html: string } | { kind: "subhead"; html: string } | { kind: "item"; level: 1 | 2; html: string } | { kind: "text"; html: string } | { kind: "block"; html: string };

const MARKER = /^\(?\s*(\d{1,2}|[a-z]{1,4}|[IVX]{1,5}|[A-Z])\s*(?:\)\.?|\.(?=\s|[A-Z]))\s*/;
const ROMAN = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i;
const ACRONYMS = new Set(["UK", "VAT", "GDPR", "EU", "ID", "SMS", "MOT", "SSC", "IP"]);

const visible = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&(?:amp|quot|apos|lt|gt|rsquo|lsquo|rdquo|ldquo|ndash|mdash|#\d+|#x[0-9a-f]+);/gi, "x");

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", pound: "£" };
/** Readable text of an HTML fragment (tags dropped, entities decoded). */
const decodeText = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? all),
    )
    .replace(/\u00a0/g, " ");
const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Remove the first `n` visible characters from `html`, keeping tags (entities count as one character). */
function dropChars(html: string, n: number) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      out += html.slice(i, end + 1);
      i = end + 1;
    } else if (n > 0) {
      if (html[i] === "&") {
        const end = html.indexOf(";", i);
        i = end > i && end - i < 12 ? end + 1 : i + 1;
      } else i++;
      n--;
    } else {
      out += html.slice(i);
      break;
    }
  }
  return out;
}

/** Empty inline wrappers left behind once the marker is removed (e.g. <strong></strong>). */
const tidy = (html: string) => {
  let h = html;
  for (let k = 0; k < 3; k++) h = h.replace(/<(strong|b|span|em|u)\b[^>]*>(?:\s|&nbsp;)*<\/\1>/gi, "");
  return h.replace(/^(?:\s|&nbsp;)+/i, "").replace(/(?:\s|&nbsp;|<br\s*\/?>)+$/i, "").trim();
};

const sentenceCase = (s: string) => {
  if (s !== s.toUpperCase()) return s;
  const words = s.toLowerCase().split(/(\s+)/);
  let first = true;
  return words
    .map((w) => {
      const bare = w.replace(/[^a-z]/gi, "").toUpperCase();
      if (ACRONYMS.has(bare)) return w.toUpperCase();
      if (first && /[a-z]/i.test(w)) {
        first = false;
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    })
    .join("");
};

/**
 * Lines without a marker: short ALL-CAPS lines ("ALTERATIONS", "PRIVACY NOTICE") and short lines that are
 * entirely bold ("Please Note:") are headings, however the old editor happened to format them.
 */
function headingOrText(raw: string): Line {
  const html = tidy(raw);
  const plain = decodeText(html).replace(/\s+/g, " ").trim();
  const letters = plain.replace(/[^A-Za-z]/g, "");
  const allCaps = letters.length >= 3 && letters === letters.toUpperCase();
  const allBold = /^(?:<(?:span|u|em)\b[^>]*>\s*)*<(strong|b)\b[^>]*>[\s\S]*<\/\1>(?:\s*<\/(?:span|u|em)>)*$/i.test(html) && !/<\/(?:strong|b)>[\s\S]*<(?:strong|b)\b/i.test(html);
  // A short standalone label ending in ":" ("Please Note:", "Questions about These Terms:") is a heading too.
  const label = /^[A-Z][^.;]{0,40}:$/.test(plain) && plain.split(" ").length <= 6;
  if (plain.length <= 90 && (allCaps || allBold || label) && !/[.;,]$/.test(plain)) return { kind: "subhead", html: escapeHtml(sentenceCase(plain.replace(/:$/, ""))) };
  return { kind: "text", html };
}

function classify(raw: string, prevLetter: string | null, prevLevel: number, nextMarker: string | null): Line | null {
  const text = visible(raw).trim();
  if (!text) return null;
  const m = text.match(MARKER);
  if (!m) return headingOrText(raw);
  const marker = m[1];
  const consumed = (visible(raw).match(/^\s*/)?.[0].length ?? 0) + m[0].length;
  const body = tidy(dropChars(raw, consumed));
  if (!body) return null;
  if (/^\d+$/.test(marker)) {
    const plain = decodeText(body).replace(/\s+/g, " ").trim();
    if (plain.length <= 160) return { kind: "heading", num: marker, html: escapeHtml(sentenceCase(plain.replace(/[.:]+$/, ""))) };
    return { kind: "text", html: `<strong>${marker}.</strong> ${body}` };
  }
  // Roman numerals (i, ii, iii / I, II…) are sub-points. The single letters i, v and x are ambiguous:
  // "i" right after "h" is the next letter unless "ii" follows; "v"/"x" are numerals only inside a numeral run.
  // (The source mixes cases: customer terms use "I) II)" for sub-points, mechanic terms use "I)" for the letter i.)
  const lower = marker.toLowerCase();
  let isRoman = false;
  if (ROMAN.test(marker)) {
    if (lower === "i") isRoman = prevLetter !== "h" || nextMarker?.toLowerCase() === "ii";
    else if (lower === "v" || lower === "x") isRoman = prevLevel === 2;
    else isRoman = true;
  }
  if (isRoman) return { kind: "item", level: 2, html: body };
  if (marker.length === 1) return { kind: "item", level: 1, html: body };
  return { kind: "text", html: tidy(raw) };
}

const VOID = new Set(["br", "img", "hr", "wbr", "input", "meta", "link", "source", "col", "area"]);

/**
 * Make an HTML fragment well-formed: drop closing tags with no opener, close anything left open.
 * Needed because splitting a paragraph at <br> can cut through <strong>/<span>; unbalanced tags in
 * dangerouslySetInnerHTML make the browser restructure the page (and break React hydration).
 */
export function balance(html: string) {
  const stack: string[] = [];
  const out = html.replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi, (tag, close: string, name: string, self: string) => {
    const n = name.toLowerCase();
    if (VOID.has(n) || self) return tag;
    if (!close) {
      stack.push(n);
      return tag;
    }
    const at = stack.lastIndexOf(n);
    if (at === -1) return "";
    const extra = stack.splice(at).slice(1).reverse();
    return extra.map((t) => `</${t}>`).join("") + tag;
  });
  return out + stack.reverse().map((t) => `</${t}>`).join("");
}

/** Split the document into lines: paragraphs/headings broken at <br>, lists kept whole. */
function lines(html: string): string[] {
  const out: string[] = [];
  const re = /<(p|h[1-6]|div)\b[^>]*>([\s\S]*?)<\/\1>|<(ul|ol|table)\b[^>]*>[\s\S]*?<\/\3>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[3]) {
      out.push(`\u0000${balance(m[0])}`);
      continue;
    }
    // Nested <div>s only wrap paragraphs: recurse into them.
    if (m[1].toLowerCase() === "div") {
      out.push(...lines(m[2]));
      continue;
    }
    for (const part of m[2].split(/<br\s*\/?>/i)) out.push(balance(part));
  }
  return out;
}

/**
 * List clean-up for the old editor's output:
 *  - a list whose only item holds another list (<ul><li><ul>…) shows an empty bullet → unwrap it;
 *  - a list that follows an item ending in ":" belongs under that item → nest it there;
 *  - drop empty items and trailing <br>/&nbsp; inside items.
 */
function tidyLists(html: string) {
  let h = html;
  for (let k = 0; k < 3; k++) h = h.replace(/<(ul|ol)\b[^>]*>\s*<li>\s*(<(ul|ol)\b[^>]*>[\s\S]*?<\/\3>)\s*<\/li>\s*<\/\1>/gi, "$2");
  h = h.replace(/(?:\s|&nbsp;|<br\s*\/?>|<span>(?:\s|&nbsp;)*<\/span>)+<\/li>/gi, "</li>");
  h = h.replace(/<li>(?:\s|&nbsp;)*<\/li>/gi, "");
  for (let k = 0; k < 3; k++)
    h = h.replace(/([^<>]*?):(?:\s|&nbsp;)*((?:<\/[a-z]+>)*)<\/li>\s*<\/(ul|ol)>\s*(<(ul|ol)\b[^>]*>[\s\S]*?<\/\5>)/gi, (_all, text, closers, outer, list) => `${text}:${closers}${list}</li></${outer}>`);
  return h;
}

export function formatLegal(html: string | null | undefined): string {
  const src = (html ?? "")
    .replace(/\s(?:style|class|align|width|height|dir|lang)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/<\/?font\b[^>]*>/gi, "")
    // Underlined body text reads as a link; links are underlined by the stylesheet anyway.
    .replace(/<\/?u\b[^>]*>/gi, "");
  const items: Line[] = [];
  let prevLetter: string | null = null;
  let prevLevel = 0;
  const all = lines(src);
  const markerOf = (raw: string) => (raw.startsWith("\u0000") ? null : (visible(raw).trim().match(MARKER)?.[1] ?? null));
  for (let k = 0; k < all.length; k++) {
    const raw = all[k];
    let nextMarker: string | null = null;
    for (let j = k + 1; j < all.length && nextMarker === null; j++) nextMarker = markerOf(all[j]);
    if (raw.startsWith("\u0000")) {
      items.push({ kind: "block", html: raw.slice(1) });
      continue;
    }
    const l = classify(raw, prevLetter, prevLevel, nextMarker);
    if (!l) continue;
    if (l.kind === "item") {
      prevLevel = l.level;
      if (l.level === 1) prevLetter = visible(raw).trim().match(/^\(?\s*([a-z])/i)?.[1].toLowerCase() ?? prevLetter;
    } else if (l.kind === "heading" || l.kind === "subhead") {
      prevLetter = null;
      prevLevel = 0;
    } else if (l.kind === "text") prevLevel = 0;
    items.push(l);
  }

  // Documents with numbered sections show unnumbered headings one level down.
  const numbered = items.some((it) => it.kind === "heading");

  // Build the outline. A list (or a "block" list) that follows an item nests inside it.
  let out = "";
  let open1 = false;
  let open2 = false;
  let li1 = false;
  const close2 = () => {
    if (open2) out += "</ul>";
    open2 = false;
  };
  const close1 = () => {
    close2();
    if (li1) out += "</li>";
    if (open1) out += "</ul>";
    open1 = li1 = false;
  };
  for (const it of items) {
    if (it.kind === "item" && it.level === 1) {
      close2();
      if (li1) out += "</li>";
      if (!open1) out += '<ul class="legal-list">';
      out += `<li>${it.html}`;
      open1 = li1 = true;
    } else if (it.kind === "item") {
      if (!open1) {
        out += '<ul class="legal-list">';
        open1 = true;
      }
      if (!li1) {
        out += "<li>";
        li1 = true;
      }
      if (!open2) out += '<ul class="legal-sublist">';
      out += `<li>${it.html}</li>`;
      open2 = true;
    } else if (it.kind === "block" && li1) {
      close2();
      out += it.html.replace(/^<(ul|ol)\b[^>]*>/i, (_t, tag) => `<${tag} class="legal-sublist">`);
    } else {
      close1();
      if (it.kind === "heading") out += `<h2>${it.num}. ${it.html}</h2>`;
      else if (it.kind === "subhead") out += numbered ? `<h3>${it.html}</h3>` : `<h2>${it.html}</h2>`;
      else if (it.kind === "block") out += it.html;
      else out += /^<(h\d|ul|ol|table)\b/i.test(it.html) ? it.html : `<p>${it.html}</p>`;
    }
  }
  close1();
  return tidyLists(balance(out));
}
