"use client";
import { acceptBespoke } from "@/app/actions/bespoke-accept";
import { GuestFields } from "./GuestFields";
import { ScheduleFormNoQuestions } from "./ScheduleFormNoQuestions";

export function BespokeAcceptForm({ token, guest, postcode, house, street, city }: { token: string; guest: boolean; postcode: string; house: string; street: string; city: string }) {
  return (
    <ScheduleFormNoQuestions action={(f) => acceptBespoke(token, f)}>
      {guest && <GuestFields />}
      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-display text-lg font-semibold">Where is the car?</legend>
        <div><label className="label" htmlFor="b-pc">Postcode *</label><input id="b-pc" name="post_code" required defaultValue={postcode} className="input uppercase" /></div>
        <div><label className="label" htmlFor="b-city">City</label><input id="b-city" name="city" defaultValue={city} className="input" /></div>
        <div><label className="label" htmlFor="b-house">House no / house name *</label><input id="b-house" name="house_no" required defaultValue={house} className="input" /></div>
        <div><label className="label" htmlFor="b-street">Street address *</label><input id="b-street" name="street" required defaultValue={street} className="input" /></div>
      </fieldset>
    </ScheduleFormNoQuestions>
  );
}
