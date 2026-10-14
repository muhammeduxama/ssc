import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Html } from "./blocks";

/** Presentation cleanup for existing CMS HTML, not an HTML security sanitizer. */
export function prepareArticle(source: string | null | undefined) {
  let html = (source ?? "").replace(/\s(?:style|align|width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  html = html.replace(/<font\b[^>]*>/gi, "").replace(/<\/font>/gi, "");
  const textOf = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
  html = html.replace(/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi, (whole, _tag, text) => textOf(text) || /<(?:img|video|iframe|audio|picture)\b/i.test(text) ? whole : "");
  const contents: { id: string; title: string }[] = [];
  html = html.replace(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_whole, level, body) => {
    const id = `guide-section-${contents.length + 1}`;
    contents.push({ id, title: textOf(body) });
    return `<h${level === "3" ? "3" : "2"} id="${id}">${body}</h${level === "3" ? "3" : "2"}>`;
  });
  return { html, contents, minutes: Math.max(1, Math.ceil(textOf(html).split(/\s+/).length / 220)) };
}

export function ArticleGuide({ html, title, children }: { html: string | null | undefined; title: string; children?: React.ReactNode }) {
  const article = prepareArticle(html);
  return <section className="site-container py-12 sm:py-16">
    <div className="article-layout">
      <aside className="article-aside">
        <nav aria-label="Article contents" className="rounded-2xl border border-line bg-night p-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><BookOpen size={17} className="text-brand" />In this guide</div>
          <p className="mt-2 text-xs text-muted">{article.minutes} minute read</p>
          <ol className="mt-5 space-y-3">{article.contents.map((item) => <li key={item.id}><a className="block text-sm leading-6 text-muted hover:text-brand" href={`#${item.id}`}>{item.title}</a></li>)}</ol>
          {!article.contents.length && <p className="mt-4 text-sm text-muted">Your guide to {title.toLowerCase()}.</p>}
        </nav>
        <div className="mt-5 rounded-2xl bg-brand-soft p-6"><h3 className="font-display text-lg font-semibold">Ready for the next step?</h3><p className="mt-2 text-sm leading-6 text-muted">Get a quote matched to your car and location.</p><Link href="#quote" className="text-link mt-4">Find your service <ArrowRight size={16} /></Link></div>
      </aside>
      <div className="min-w-0"><article className="reading-article"><div className="mb-8 border-b border-line pb-5"><span className="eyebrow">The car care guide</span><p className="mt-2 text-sm text-muted">{title}</p></div><Html html={article.html} /></article>{children}</div>
    </div>
  </section>;
}
