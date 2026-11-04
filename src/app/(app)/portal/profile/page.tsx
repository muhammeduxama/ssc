import type { Metadata } from "next";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/customer";

export const metadata: Metadata = { title: "My contact information" };

/** PortalController@editcustomer / @edit */
export default async function Profile() {
  const me = await requireCustomer();
  return (
    <>
      <PageHeader eyebrow="Account" title="Contact information" description="Keep your details up to date so your mechanic can reach you." />
      <div className="card max-w-2xl p-6"><ProfileForm u={{ fname: me.fname, lname: me.lname, phone: me.phone, email: me.email }} /></div>
    </>
  );
}
