export function AuthCard({ eyebrow, title, intro, children, wide }: { eyebrow: string; title: string; intro?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className="mx-auto px-4 py-16 sm:px-6 sm:py-20" style={{ maxWidth: wide ? 800 : 540 }}>
      <div className="card !rounded-3xl p-7 shadow-card sm:p-10">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {intro && <div className="mt-3 text-sm leading-7 text-muted">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
