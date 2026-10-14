"use client";
import { XSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelOrder } from "@/app/(app)/admin/orders/actions";
import { useToast } from "@/components/Toast";

/** The Laravel "close status" button posts to /ssc/order/reject-order (customer gets the cancellation email). */
export function CloseQuoteButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Do you really want to close this quote?")) return;
        start(async () => {
          const r = await cancelOrder(id, "email");
          toast(r.ok ? "Quote closed successfully" : r.message, r.ok);
          router.refresh();
        });
      }}
      aria-label="Close quote"
      title="Close quote"
      className="rounded-md p-1.5 text-danger hover:bg-danger-soft"
    >
      <XSquare size={16} />
    </button>
  );
}
