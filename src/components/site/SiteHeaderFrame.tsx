"use client";
import { useEffect, useState } from "react";

/** Floating glass pill at the top of the page that stretches into a full-width bar once the page scrolls. */
export function SiteHeaderFrame({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className="site-nav" data-scrolled={scrolled || undefined}>
      <div className="site-nav-bar">{children}</div>
    </header>
  );
}
