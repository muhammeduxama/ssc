import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { SiteMobileNav } from "./SiteMobileNav";
import { Logo } from "@/components/Logo";
import { SiteHeaderFrame } from "./SiteHeaderFrame";

export async function SiteHeader() {
  const s = await getSession();
  const links: [string, string][] = [
    ["/service/all", "Our services"],
    ["/how_it_works", "How it works"],
    s ? ["/dashboard", "My account"] : ["/join-network", "Join network"],
    ["/blog", "Car care journal"],
  ];
  return (
    <SiteHeaderFrame>
      <div className="site-nav-inner">
        <Link href="/" className="flex items-center" aria-label="Smart Servicing Centre home">
          <Logo className="site-nav-logo" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex" aria-label="Main">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-3.5 py-2 text-muted transition hover:bg-brand-soft hover:text-brand">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {s ? (
            <Link href="/dashboard" className="btn btn-primary whitespace-nowrap !rounded-full !px-5 !py-2">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden !rounded-full !py-2 sm:inline-flex">Login</Link>
              <Link href="/register" className="btn btn-primary hidden whitespace-nowrap !rounded-full !px-5 !py-2 sm:inline-flex">Get started <ArrowUpRight size={16} /></Link>
            </>
          )}
          <SiteMobileNav links={links} />
        </div>
      </div>
    </SiteHeaderFrame>
  );
}
