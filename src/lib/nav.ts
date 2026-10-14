import type { Role } from "./session";

export const SIDEBAR_COOKIE = "ssc-sidebar";

export type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean; ready?: boolean; badge?: "unread" };
export type NavGroup = { group: string; icon?: string; items: NavItem[]; collapsible?: boolean };

const r = (slug: string, label: string, icon = "Circle", extra: Partial<NavItem> = {}): NavItem => ({ href: `/admin/r/${slug}`, label, icon, ready: true, ...extra });

export const STAFF_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", ready: true },
      { ready: true, href: "/admin/recents", label: "Recent activity", icon: "Activity" },
      { href: "/messages", label: "Messages", icon: "MessageSquare", ready: true, badge: "unread" },
    ],
  },
  {
    group: "Orders",
    collapsible: true,
    items: [
      { href: "/admin/orders/all", label: "All orders", icon: "ClipboardList", ready: true },
      { ready: true, href: "/admin/orders/new", label: "New orders", icon: "Circle" },
      { ready: true, href: "/admin/orders/today", label: "Today", icon: "Circle" },
      { ready: true, href: "/admin/orders/tomorrow", label: "Tomorrow", icon: "Circle" },
      { href: "/admin/orders/progress", label: "In progress", icon: "Circle" },
      { ready: true, href: "/admin/orders/accepted", label: "Accepted", icon: "Circle" },
      { ready: true, href: "/admin/orders/completed", label: "Completed", icon: "Circle" },
      { ready: true, href: "/admin/orders/rejected", label: "Rejected", icon: "Circle" },
      { ready: true, href: "/admin/orders/unverified", label: "Unverified", icon: "Circle" },
      { ready: true, href: "/admin/orders/inactive", label: "Inactive", icon: "Circle" },
      { ready: true, href: "/admin/reviews", label: "Order reviews", icon: "Star" },
    ],
  },
  {
    group: "Quotes",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/quotes/all", label: "All quotes", icon: "FileText" },
      { ready: true, href: "/admin/quotes/new", label: "New quotes", icon: "Circle" },
      { ready: true, href: "/admin/quotes/yesterday", label: "Yesterday", icon: "Circle" },
      { ready: true, href: "/admin/quotes/not-responded", label: "Not responded", icon: "Circle" },
      { ready: true, href: "/admin/quotes/closed", label: "Closed", icon: "Circle" },
      { ready: true, href: "/admin/quotes/estimates", label: "Sent estimates", icon: "Circle" },
    ],
  },
  {
    group: "Blogs",
    collapsible: true,
    items: [r("blogs", "Blog posts", "PenLine"), r("blog-categories", "Categories"), r("blog-subcategories", "Sub categories"), r("tags", "Tags"), r("blog-images", "Image library", "Image")],
  },
  {
    group: "Services",
    icon: "CarFront",
    collapsible: true,
    items: [
      r("main-categories", "Main categories", "Layers"),
      r("sub-categories", "Sub categories"),
      r("sub-sub-categories", "Sub sub categories"),
      r("services", "Services", "Wrench"),
      { ready: true, href: "/admin/services/import", label: "Import CSV", icon: "Upload" },
      r("service-pages", "Service pages", "FileText"),
      { ready: true, href: "/admin/prices/fixed", label: "Fixed prices", icon: "PoundSterling" },
      { ready: true, href: "/admin/prices/range", label: "Range prices", icon: "PoundSterling" },
    ],
  },
  {
    group: "Data management",
    icon: "Layers",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/sitemap", label: "Sitemap", icon: "Map" },
      { ready: true, href: "/admin/data/quote-prices", label: "Quote prices data", icon: "Circle" },
      { ready: true, href: "/admin/data/labour-requests", label: "Labour hour requests", icon: "Circle" },
      { ready: true, href: "/admin/data/part-requests", label: "Part price requests", icon: "Circle" },
      r("cars", "Car list", "CarFront"),
      { ready: true, href: "/admin/data/import", label: "Upload car CSV", icon: "Upload" },
      { ready: true, href: "/admin/data/model-requests", label: "Car requests", icon: "Circle" },
      r("makes", "Makes"),
      r("models", "Models"),
      r("fuels", "Fuels"),
      r("engines", "Engines"),
      r("years", "Years"),
    ],
  },
  {
    group: "Payments",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/payments/stripe", label: "Stripe management", icon: "CreditCard", adminOnly: true },
      { ready: true, href: "/admin/payments", label: "Payment details", icon: "Receipt" },
    ],
  },
  {
    group: "Mailbox",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/mail", label: "Sent", icon: "Mail" },
      { ready: true, href: "/admin/mail/compose", label: "Compose", icon: "Send" },
      { ready: true, href: "/admin/mail/join-network", label: "Join network invite", icon: "Circle" },
      r("email-templates", "Templates"),
      { ready: true, href: "/admin/mail/required-docs", label: "Required docs email", icon: "Circle" },
    ],
  },
  {
    group: "Mechanics",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/mechanics", label: "All mechanics", icon: "Wrench" },
      { ready: true, href: "/admin/mechanics?type=garage", label: "Garages", icon: "Circle" },
      { ready: true, href: "/admin/mechanics?type=mobile", label: "Mobile mechanics", icon: "Circle" },
      { ready: true, href: "/admin/mechanics?type=incomplete", label: "Incomplete profiles", icon: "Circle" },
      { ready: true, href: "/admin/mechanics/requests", label: "Garage requests", icon: "UserPlus", adminOnly: true },
      r("documents", "Required documents", "FileCheck", { adminOnly: true }),
    ],
  },
  {
    group: "Clients",
    collapsible: true,
    items: [
      { ready: true, href: "/admin/clients", label: "List clients", icon: "Users" },
      { ready: true, href: "/admin/clients/new", label: "Add client", icon: "UserPlus" },
    ],
  },
  {
    group: "Website",
    collapsible: true,
    items: [
      r("cities", "Cities", "Building2"),
      r("faqs", "FAQs", "HelpCircle"),
      r("about", "About page"),
      r("pages", "Legal pages"),
      r("contacts", "Contact messages", "Inbox"),
      { ready: true, href: "/admin/settings/labour", label: "Labour & pricing", icon: "Settings" },
      { ready: true, href: "/admin/settings/postcodes", label: "Postcodes", icon: "MapPin" },
    ],
  },
  { group: "Team", items: [r("workers", "Workers", "UserCog", { adminOnly: true })] },
];

export const MECHANIC_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", ready: true },
      { href: "/mechanic/requests", label: "Job requests", icon: "BellRing", ready: true },
      { href: "/mechanic/jobs", label: "Current jobs", icon: "ClipboardList", ready: true },
      { href: "/mechanic/jobs/previous", label: "Previous jobs", icon: "Receipt", ready: true },
      { href: "/mechanic/quote-requests", label: "Quote requests", icon: "FileText", ready: true },
      { href: "/mechanic/bespokes", label: "Bespoke quotes", icon: "FilePlus", ready: true },
      { href: "/messages", label: "Messages", icon: "MessageSquare", ready: true, badge: "unread" },
      { href: "/mechanic/payments", label: "Payments", icon: "PoundSterling", ready: true },
    ],
  },
  {
    group: "Profile",
    items: [
      { href: "/mechanic/profile", label: "My profile", icon: "UserRound", ready: true },
      { href: "/mechanic/documents", label: "Documents", icon: "FileCheck", ready: true },
      { href: "/mechanic/procedure", label: "Procedure", icon: "BookOpen", ready: true },
      { href: "/mechanic/agreement", label: "My agreement (PDF)", icon: "FileCheck", ready: true },
      { href: "/mechanic/password", label: "Change password", icon: "KeyRound", ready: true },
    ],
  },
];

export const CUSTOMER_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", ready: true },
      { href: "/portal/orders", label: "My bookings", icon: "ClipboardList", ready: true },
      { href: "/portal/quotes", label: "My quotes", icon: "FileText", ready: true },
      { href: "/portal/quotes/expired", label: "Expired & follow-on", icon: "Clock", ready: true },
      { href: "/messages", label: "Messages", icon: "MessageSquare", ready: true, badge: "unread" },
      { href: "/", label: "New booking", icon: "CalendarPlus", ready: true },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/portal/profile", label: "Edit profile", icon: "UserRound", ready: true },
      { href: "/portal/password", label: "Change password", icon: "KeyRound", ready: true },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  const groups = role === "mechanic" ? MECHANIC_NAV : role === "customer" ? CUSTOMER_NAV : STAFF_NAV;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.ready && (!i.adminOnly || role === "admin")) }))
    .filter((g) => g.items.length);
}
