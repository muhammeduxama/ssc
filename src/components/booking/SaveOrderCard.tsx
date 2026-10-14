"use client";
import { saveCard } from "@/app/actions/booking";
import { CardForm } from "./CardForm";

export function SaveOrderCard({ orderId, publishableKey, clientSecret, name }: { orderId: number; publishableKey: string; clientSecret: string; name: string }) {
  return <CardForm publishableKey={publishableKey} clientSecret={clientSecret} name={name} onSaved={(id) => saveCard(orderId, id)} button="Confirm booking" />;
}
