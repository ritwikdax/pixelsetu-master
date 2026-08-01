import z from 'zod';

export const LotSchema = z
  .object({
    symbol: z.string(),
    buyPrice: z.coerce.number().nonnegative(),
    sellPrice: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().int().nonnegative(),
    broker: z
      .enum(['zerodha', 'upstox', 'groww'])
      .default('zerodha')
      .optional(),
  })
  .strict();

export type Lot = z.infer<typeof LotSchema>;
