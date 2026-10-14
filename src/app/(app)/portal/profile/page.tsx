import type { Metadata } from "next";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { PageHeader } from "@/components/ui";
import { currentCustomer } from "@/lib/customer";

export const metadata: Metadata = { title: "My contact information" };

/** PortalController@editcustomer / @edit */
export default async function Profile() {
  const me = (await currentCustomer())!;
  return (
    <>
      <PageHeader eyebrow="Account" title="My contact information" />
      <div className="card max-w-2xl p-6"><ProfileForm u={{ fname: me.fname, lname: me.lname, phone: me.phone, email: me.email }} /></div>
    </>
  );
}
