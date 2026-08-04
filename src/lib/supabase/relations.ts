/**
 * PostgREST embeds a to-one relation as an object or, depending on the query
 * shape, a single-element array. Normalizes both into one optional record.
 */
export function relatedRecord<T>(relation: T | T[] | null | undefined): T | undefined {
  if (!relation) return undefined;
  return Array.isArray(relation) ? relation[0] : relation;
}
