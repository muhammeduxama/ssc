"use client";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Code, Underline, Undo2 } from "lucide-react";
import { useRef, useState } from "react";

/** Lightweight HTML editor (replaces TinyMCE). Submits HTML via a hidden input. */
export function RichText({ name, defaultValue, invalid }: { name: string; defaultValue?: string | null; invalid?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue ?? "");
  const [source, setSource] = useState(false);

  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    setHtml(ref.current?.innerHTML ?? "");
  };
  const tools = [
    { i: Bold, t: "Bold", f: () => cmd("bold") },
    { i: Italic, t: "Italic", f: () => cmd("italic") },
    { i: Underline, t: "Underline", f: () => cmd("underline") },
    { i: Heading2, t: "Heading", f: () => cmd("formatBlock", "<h2>") },
    { i: List, t: "Bulleted list", f: () => cmd("insertUnorderedList") },
    { i: ListOrdered, t: "Numbered list", f: () => cmd("insertOrderedList") },
    {
      i: Link2,
      t: "Link",
      f: () => {
        const u = prompt("Link URL");
        if (u) cmd("createLink", u);
      },
    },
    { i: Undo2, t: "Clear formatting", f: () => cmd("removeFormat") },
  ];

  return (
    <div className={`overflow-hidden rounded-lg border bg-raised ${invalid ? "border-danger" : "border-line-strong"}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-sunken px-1.5 py-1">
        {!source &&
          tools.map((x) => (
            <button key={x.t} type="button" title={x.t} aria-label={x.t} onClick={x.f} className="rounded p-1.5 text-muted hover:bg-raised hover:text-ink">
              <x.i size={16} />
            </button>
          ))}
        <button
          type="button"
          onClick={() => {
            if (source && ref.current) ref.current.innerHTML = html;
            setSource(!source);
          }}
          className={`ml-auto flex items-center gap-1 rounded px-2 py-1 font-mono text-xs ${source ? "bg-brand text-on-brand" : "text-muted hover:bg-raised"}`}
        >
          <Code size={14} /> HTML
        </button>
      </div>
      {source ? (
        <textarea value={html} onChange={(e) => setHtml(e.target.value)} className="block min-h-64 w-full resize-y bg-raised p-3 font-mono text-xs text-ink focus:outline-none" />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
          dangerouslySetInnerHTML={{ __html: defaultValue ?? "" }}
          className="prose-content min-h-64 max-w-none p-4 text-sm focus:outline-none"
        />
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
