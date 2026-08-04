import { z } from 'zod';

/** Accepts a single value or repeated query params (parsed as array by Express). */
const repeatedQueryParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return value;
  });

export const ListQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  next: z.string().optional(),
  sort: repeatedQueryParam,
  search: z.string().optional(),
  filter: repeatedQueryParam,
  fields: repeatedQueryParam,
  include: repeatedQueryParam,
});
