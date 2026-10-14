import { StripeForm } from "@/components/tools/SettingsForms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Stripe management" };

/** HomeController@stripeManagement (admin only). The secret key is never sent to the browser. */
export default async function StripePage() {
  await requireStaff(true);
  const s = await db.stripes.findFirst();
  return (
    <>
      <PageHeader eyebrow="Payments" title="Stripe management" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted">Keys used for customer card payments and mechanic payouts (Stripe Connect). {s?.publishable_key.startsWith("pk_test") && <b className="text-warn">These are test-mode keys.</b>}</p>
      <StripeForm s={{ publishable: s?.publishable_key ?? "", client: s?.client_id ?? "", secretSet: !!s?.secret_key, secretHint: s?.secret_key ? `${s.secret_key.slice(0, 8)}…${s.secret_key.slice(-4)}` : "" }} />
    </>
  );
}
