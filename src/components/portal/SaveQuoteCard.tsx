"use client";
import { saveQuoteCard } from "@/app/actions/portal";
import { CardForm } from "@/components/booking/CardForm";

export function SaveQuoteCard({ orderId, requestId, publishableKey, clientSecret, name }: { orderId: number; requestId: number; publishableKey: string; clientSecret: string; name: string }) {
  return <CardForm publishableKey={publishableKey} clientSecret={clientSecret} name={name} onSaved={(id) => saveQuoteCard(orderId, requestId, id)} button="Book me in" />;
}
