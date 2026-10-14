"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

export function SiteMobileNav({ links }: { links: [string, string][] }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.querySelector("button")?.focus(); } }}>
      <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls={menuId} className="btn btn-ghost !rounded-full !p-2">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <nav id={menuId} className="site-nav-menu" aria-label="Mobile">
          {[...links, ["/login", "Sign in"], ["/register", "Get started"], ["/contact-us", "Contact us"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 font-medium hover:bg-sunken">{label}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
