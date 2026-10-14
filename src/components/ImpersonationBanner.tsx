import { stopImpersonating } from "@/app/actions/mechanic-profile";

export function ImpersonationBanner({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-accent px-4 py-2 text-sm font-medium text-on-accent">
      You are logged in as <b>{name}</b>.
      <form action={stopImpersonating}>
        <button className="rounded-md bg-night px-3 py-1 text-xs font-semibold text-night-ink hover:opacity-90">Return to admin</button>
      </form>
    </div>
  );
}
