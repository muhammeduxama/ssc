"use client";
import { saveBespokeCard } from "@/app/actions/bespoke-accept";
import { CardForm } from "./CardForm";

export function SaveBespokeCard({ token, orderId, publishableKey, clientSecret, name }: { token: string; orderId: number; publishableKey: string; clientSecret: string; name: string }) {
  return <CardForm publishableKey={publishableKey} clientSecret={clientSecret} name={name} onSaved={(id) => saveBespokeCard(token, orderId, id)} button="Confirm booking" />;
}
