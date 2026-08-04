import { z } from "zod";

export { firstIssue } from "@/lib/validation/issue";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

const blankToNull = (value: string) => (value.length === 0 ? null : value);

const description = z.string().trim().max(2000).transform(blankToNull).nullable();
const category = z.string().trim().max(100).transform(blankToNull).nullable();

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value.length === 0 || /^https?:\/\//.test(value), "Image URL must be an http(s) URL")
  .transform(blankToNull)
  .nullable();

const productFields = {
  name: z.string().trim().min(2).max(200),
  description,
  category,
  imageUrl,
  priceCents: z.number().int().min(0).max(100_000_000),
  stockInt: z.number().int().min(0).max(1_000_000),
  status: z.enum(PRODUCT_STATUSES),
};

export const createProductSchema = z.object({
  ...productFields,
  description: description.optional().default(null),
  category: category.optional().default(null),
  imageUrl: imageUrl.optional().default(null),
  status: productFields.status.optional().default("draft"),
});

/**
 * Every field is optional, but at least one must be present, and absent keys
 * stay absent (no defaults) so a patch never clears untouched columns.
 */
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No fields to update");

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;

/** Maps validated input onto the `products` column names, skipping absent keys. */
export function toProductRow(input: UpdateProductInput) {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.category !== undefined) row.category = input.category;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  if (input.priceCents !== undefined) row.price_cents = input.priceCents;
  if (input.stockInt !== undefined) row.stock_int = input.stockInt;
  if (input.status !== undefined) row.status = input.status;

  return row;
}
