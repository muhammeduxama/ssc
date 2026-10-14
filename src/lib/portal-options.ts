/** Option lists for the customer portal forms (shared by client components and server actions). */
export const CLOSE_REASONS = [
  "I've already had the work done from elsewhere",
  "I was using the site for price comparison only",
  "I'm not happy with any of the quotes I received",
  "I've not received any/enough quotes",
  "I've decided to sell the car instead",
  "I didn't think the garages were close enough",
  "Other (Please give details below)",
];
export const CANCEL_REASONS = CLOSE_REASONS.slice(0, 6).concat("Other");
export const MESSAGE_OPTIONS: Record<number, string> = { 1: "I Want to Change my booking", 2: "I want to cancel this booking", 3: "Message my mechanic", 4: "My mechanic is late", 5: "Other" };
