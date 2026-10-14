"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/Toast";

type R = { ok: boolean; message: string };

/** Run a server action, toast its message, refresh the page on success. */
export function useAction() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<R>, opts?: { confirm?: string; after?: (r: R) => void }) => {
    if (opts?.confirm && !confirm(opts.confirm)) return;
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok);
      if (r.ok) router.refresh();
      opts?.after?.(r);
    });
  };
  return { pending, run };
}
