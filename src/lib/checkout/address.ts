import { z } from "zod";

export const shippingAddressSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+][0-9\s-]{6,19}$/, "Enter a valid contact number"),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Postal code must be 4 digits"),
  notes: z.string().trim().max(500).optional().default(""),
});

export type ShippingAddress = z.output<typeof shippingAddressSchema>;

/** Single-line form persisted on the order; `place_order` stores it verbatim. */
export function formatShippingAddress(address: ShippingAddress) {
  return [
    address.recipient,
    address.phone,
    address.line1,
    address.line2,
    `${address.city}, ${address.province} ${address.postalCode}`,
    address.notes,
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
}
